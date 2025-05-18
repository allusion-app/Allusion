import { clamp } from 'common/core';
import fse from 'fs-extra';
import { thumbnailFormat } from 'common/config';

export interface Loader extends Decoder {
  init: () => Promise<void>;
}

export interface Decoder {
  decode: (buffer: Buffer) => Promise<ImageData>;
}

/** Returns a string that can be used as img src attribute */
export async function getBlob(decoder: Decoder, path: string): Promise<string> {
  const buf = await fse.readFile(path);
  const data = await decoder.decode(buf);
  const blob = await new Promise<Blob>((resolve, reject) =>
    dataToCanvas(data).toBlob(
      (blob) => (blob !== null ? resolve(blob) : reject()),
      'image/avif',
      1.0,
    ),
  );
  return URL.createObjectURL(blob);
}

const processingPaths = new Set<string>();
const MAX_CONCURRENT_PATHS = 4;
const RETRY_DELAY = 10000;
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function generateThumbnail(
  decoder: Decoder,
  inputPath: string,
  outputPath: string,
  thumbnailSize: number,
): Promise<void> {
  if (processingPaths.has(inputPath)) {
    console.debug(`Thumbnail generation already in progress for ${inputPath} Waiting ${RETRY_DELAY}ms`);
    return await delay(RETRY_DELAY);
  }
  if (processingPaths.size >= MAX_CONCURRENT_PATHS) {
    console.debug(`Max concurrent paths limit reached: ${processingPaths.size}/${MAX_CONCURRENT_PATHS}. Waiting ${RETRY_DELAY}ms`);
    return await delay(RETRY_DELAY);
  }

  console.debug(`Adding ${inputPath} to processingPaths. Current size: ${processingPaths.size + 1}`);
  processingPaths.add(inputPath);
  // TODO: merge this functionality with the thumbnail worker: it's basically duplicate code
  let buffer: Buffer | null = await fse.readFile(inputPath);
  let data: ImageData | null = await decoder.decode(buffer);
  let sampledCanvas: HTMLCanvasElement | null = getSampledCanvas(dataToCanvas(data), thumbnailSize);
  let quality: number | null = computeQuality(sampledCanvas, thumbnailSize);
  let blobBuffer: ArrayBuffer | null = await new Promise<ArrayBuffer>((resolve, reject) =>
    sampledCanvas?.toBlob(
      (blob) => (blob !== null ? resolve(blob.arrayBuffer()) : reject()),
      `image/${thumbnailFormat}`,
      quality, // Allows to further compress image
    ),
  );
  // clearing variables
  buffer.fill(0);
  buffer = null;
  data = null;
  quality = null;
  sampledCanvas.width = 0;
  sampledCanvas.height = 0;
  sampledCanvas = null;

  await fse.outputFile(outputPath, Buffer.from(blobBuffer));
  blobBuffer = null;
  console.debug(`Finished generating thumbnail for ${inputPath}, removing from processingPaths.`);
  processingPaths.delete(inputPath);
}

function dataToCanvas(data: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(data, 0, 0);
  return canvas;
}

function getSampledCanvas(canvas: HTMLCanvasElement, targetSize: number): HTMLCanvasElement {
  const [sx, sy, swidth, sheight] = getAreaOfInterest(canvas.width, canvas.height);
  const [scaledWidth, scaledHeight] = getScaledSize(swidth, sheight, targetSize);
  const sampledCanvas = document.createElement('canvas');
  sampledCanvas.width = scaledWidth;
  sampledCanvas.height = scaledHeight;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const sampledCtx = sampledCanvas.getContext('2d')!;
  sampledCtx.drawImage(canvas, sx, sy, swidth, sheight, 0, 0, scaledWidth, scaledHeight);
  return sampledCanvas;
}

/** Dynamically computes the compression quality for a thumbnail based on how much it is scaled compared to the maximum target size */
function computeQuality(canvas: HTMLCanvasElement, targetSize: number): number {
  const minSize = Math.min(canvas.width, canvas.height);
  // A low minimum size needs to correspond to a high quality, to retain details when it is displayed as cropped
  return clamp(1 - minSize / targetSize, 0.5, 0.9);
}

/** Scales the width and height to be the targetSize in the largest dimension, while retaining the aspect ratio */
function getScaledSize(
  width: number,
  height: number,
  targetSize: number,
): [width: number, height: number] {
  const widthScale = targetSize / width;
  const heightScale = targetSize / height;
  const scale = Math.min(widthScale, heightScale);
  return [Math.floor(width * scale), Math.floor(height * scale)];
}

/** Cut out rectangle in center if image has extreme aspect ratios. */
function getAreaOfInterest(
  width: number,
  height: number,
): [sx: number, sy: number, swidth: number, sheight: number] {
  const aspectRatio = width / height;
  let w = width;
  let h = height;

  if (aspectRatio > 3) {
    w = Math.floor(height * 3);
  } else if (aspectRatio < 1 / 3) {
    h = Math.floor(width * 3);
  }
  return [Math.floor((width - w) / 2), Math.floor((height - h) / 2), w, h];
}
