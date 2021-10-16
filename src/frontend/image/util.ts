import { clamp } from '../utils';

export function dataToCanvas(data: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(data, 0, 0);
  return canvas;
}

export function getSampledCanvas(canvas: HTMLCanvasElement, targetSize: number): HTMLCanvasElement {
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

export function computeQuality(canvas: HTMLCanvasElement, targetSize: number): number {
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
