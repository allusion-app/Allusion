import { clamp } from 'common/core';
import fse from 'fs-extra';
import { thumbnailFormat } from 'common/config';

export interface Loader extends Decoder {
  init: () => Promise<void>;
}

export interface Decoder {
  decode: (buffer: Buffer) => ImageData;
}

/** Returns a string that can be used as img src attribute */
export async function getBlob(decoder: Decoder, path: string): Promise<string> {
  const buf = await fse.readFile(path);
  const data = decoder.decode(buf);
  const blob = await new Promise<Blob>((resolve, reject) =>
    dataToCanvas(data).toBlob(
      (blob) => (blob !== null ? resolve(blob) : reject()),
      'image/avif',
      1.0,
    ),
  );
  return URL.createObjectURL(blob);
}

export async function generateThumbnail(
  decoder: Decoder,
  inputPath: string,
  outputPath: string,
  thumbnailSize: number,
): Promise<void> {
  const buffer = await fse.readFile(inputPath);
  const data = decoder.decode(buffer);
  const sampledCanvas = getSampledCanvas(dataToCanvas(data), thumbnailSize);
  const quality = computeQuality(sampledCanvas, thumbnailSize);
  const blobBuffer = await new Promise<ArrayBuffer>((resolve, reject) =>
    sampledCanvas.toBlob(
      (blob) => (blob !== null ? resolve(blob.arrayBuffer()) : reject()),
      `image/${thumbnailFormat}`,
      quality, // Allows to further compress image
    ),
  );
  return fse.writeFile(outputPath, Buffer.from(blobBuffer));
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

function computeQuality(canvas: HTMLCanvasElement, targetSize: number): number {
  const maxSize = Math.max(canvas.width, canvas.height);
  return clamp(targetSize / maxSize, 0.5, 1.0);
}

function getScaledSize(
  width: number,
  height: number,
  targetSize: number,
): [width: number, height: number] {
  const widthScale = targetSize / width;
  const heightScale = targetSize / height;
  const scale = Math.max(widthScale, heightScale);
  return [Math.floor(width * scale), Math.floor(height * scale)];
}

// Cut out rectangle in center if image has extreme aspect ratios.
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
