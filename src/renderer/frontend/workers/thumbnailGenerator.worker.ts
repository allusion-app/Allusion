import fse from 'fs-extra';
import { getThumbnailPath } from '../utils';

// The worker context
const ctx: Worker = self as any;

// Respond to message from parent thread
ctx.addEventListener('message', async (event) => {
  const { filePath, thumbnailDirectory, thumbnailType, fileId } = event.data;
  try {
    const thumbnailPath = await generateAndStoreThumbnail(filePath, thumbnailDirectory, thumbnailType);
    ctx.postMessage({ fileId, thumbnailPath: thumbnailPath || filePath });
  } catch (err) {
    throw { fileId, error: err };
  }
});

// Todo: Should be set in message
const maxSize = 700;

const generateThumbnailData = async (filePath: string, thumbnailType: string): Promise<ArrayBuffer | null> => {
  const response = await fetch(filePath);
  const inputBlob = await response.blob();
  const img = await createImageBitmap(inputBlob);

  // If the image is smaller than `maxSize`, don't create a thumbnail
  if (img.width < maxSize && img.height < maxSize) {
    return null;
  }

  // Scale the image so that either width or height becomes `maxSize`
  let width = img.width;
  let height = img.height;
  if (img.width >= img.height) {
    width = maxSize;
    height = (maxSize * img.height) / img.width;
  } else {
    height = maxSize;
    width = (maxSize * img.width) / img.height;
  }

  const canvas = new OffscreenCanvas(width, height);

  const ctx2D = canvas.getContext('2d');
  if (!ctx2D) {
    console.warn('No canvas context 2D (should never happen)');
    return null;
  }

  // Todo: Take into account rotation

  // const x = width / 2;
  // const y = height / 2;

  // ctx2D.translate(x, y);
  // ctx2D.rotate(angleInRadians);
  // ctx2D.fillStyle = bgColor;
  // ctx2D.fillRect(-width / 2, -height / 2, width, height);
  // ctx2D.drawImage(img, -width / 2, -height / 2, width, height);
  // ctx2D.rotate(-angleInRadians);
  // ctx2D.translate(-x, -y);

  ctx2D.drawImage(img, 0, 0, width, height);

  const thumbBlob = await canvas.convertToBlob({ type: `image/${thumbnailType}`, quality: 0.75 });
  const reader = new FileReaderSync();
  const buffer = reader.readAsArrayBuffer(thumbBlob);
  return buffer;
};

const generateAndStoreThumbnail = async (filePath: string, thumbnailDirectory: string, thumbnailType: string) => {
  const thumbnailData = await generateThumbnailData(filePath, thumbnailType);
  if (thumbnailData) {
    const thumbnailFilePath = getThumbnailPath(filePath, thumbnailDirectory, thumbnailType);

    await fse.outputFile(thumbnailFilePath, Buffer.from(thumbnailData));

    return thumbnailFilePath;
  }
  return '';
};

// Make the file importable
// https://stackoverflow.com/questions/50210416/webpack-worker-loader-fails-to-compile-typescript-worker
export default null as any;
