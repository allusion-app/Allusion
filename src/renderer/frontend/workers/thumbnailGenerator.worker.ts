import fse from 'fs-extra';
import { getThumbnailPath, needsThumbnail } from '../utils';
import { thumbnailType, thumbnailMaxSize } from '../../../config';

const generateThumbnailData = async (filePath: string): Promise<ArrayBuffer | null> => {
  const response = await fetch(filePath);
  const inputBlob = await response.blob();
  const img = await createImageBitmap(inputBlob);

  // If the image is smaller than `thumbnailMaxSize`, don't create a thumbnail
  if (!needsThumbnail(img.width, img.height)) {
    return null;
  }

  // Scale the image so that either width or height becomes `thumbnailMaxSize`
  let width = img.width;
  let height = img.height;
  if (img.width >= img.height) {
    width = thumbnailMaxSize;
    height = (thumbnailMaxSize * img.height) / img.width;
  } else {
    height = thumbnailMaxSize;
    width = (thumbnailMaxSize * img.width) / img.height;
  }

  const canvas = new OffscreenCanvas(width, height);

  const ctx2D = canvas.getContext('2d');
  if (!ctx2D) {
    console.warn('No canvas context 2D (should never happen)');
    return null;
  }

  // Todo: Take into account rotation. Can be found with https://www.npmjs.com/package/node-exiftool

  // TODO: Could maybe use https://www.electronjs.org/docs/api/native-image#imageresizeoptions

  ctx2D.drawImage(img, 0, 0, width, height);

  const thumbBlob = await canvas.convertToBlob({ type: `image/${thumbnailType}`, quality: 0.75 });
  const reader = new FileReaderSync();
  const buffer = reader.readAsArrayBuffer(thumbBlob);
  return buffer;
};

const generateAndStoreThumbnail = async (filePath: string, thumbnailDirectory: string) => {
  const thumbnailData = await generateThumbnailData(filePath);
  if (thumbnailData) {
    const thumbnailFilePath = getThumbnailPath(filePath, thumbnailDirectory);

    await fse.outputFile(thumbnailFilePath, Buffer.from(thumbnailData));

    return thumbnailFilePath;
  }
  return '';
};

// The worker context
const ctx: Worker = self as any;

// Respond to message from parent thread
ctx.addEventListener('message', async (event) => {
  const { filePath, thumbnailDirectory, fileId } = event.data;
  try {
    const thumbnailPath = await generateAndStoreThumbnail(filePath, thumbnailDirectory);
    ctx.postMessage({ fileId, thumbnailPath: thumbnailPath || filePath });
  } catch (err) {
    throw { fileId, error: err };
  }
});

// Make the file importable
// https://stackoverflow.com/questions/50210416/webpack-worker-loader-fails-to-compile-typescript-worker
export default null as any;
