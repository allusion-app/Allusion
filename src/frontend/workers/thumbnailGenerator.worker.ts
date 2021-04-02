import fse from 'fs-extra';

import { getThumbnailPath, needsThumbnail } from '../utils';
import { thumbnailType, thumbnailMaxSize } from 'src/config';
import { IThumbnailMessage } from '../ThumbnailGeneration';

const generateThumbnailData = async (filePath: string): Promise<ArrayBuffer | null> => {
  const inputBuffer = await fse.readFile(filePath);
  const inputBlob = new Blob([inputBuffer]);
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
  const thumbnailFilePath = getThumbnailPath(filePath, thumbnailDirectory);

  // Could already exist: maybe generated in another worker, when use scrolls up/down repeatedly
  // but this doesn't help if we want to deliberately overwrite the thumbnail, but we don't have that currently
  if (await fse.pathExists(thumbnailFilePath)) {
    return thumbnailFilePath;
  }

  const thumbnailData = await generateThumbnailData(filePath);
  if (thumbnailData) {
    await fse.outputFile(thumbnailFilePath, Buffer.from(thumbnailData));
    return thumbnailFilePath;
  }
  return '';
};

// The worker context
const ctx: Worker = self as any;

// Set up a queue of thumbnails that need to be processed
// Without a queue, I've had to restart my computer since everything froze
// (not 100% sure whether that was the cause)
// TODO: Max queue length, so that when the user scrolls a lot, the most recent images will show up earlier?
// (-> discard old requests)
const queue: IThumbnailMessage[] = [];
const MAX_PARALLEL_THUMBNAILS = 4; // Related to amount of workers. Currently 4 workers with 4 thumbs in parallel = 16 thumbs parallel total
let curParallelThumbnails = 0;

async function processMessage(data: IThumbnailMessage) {
  const { filePath, thumbnailDirectory, fileId } = data;
  try {
    // console.log('Processing thumbnail message', { data, curParallelThumbnails, queue });
    if (curParallelThumbnails < MAX_PARALLEL_THUMBNAILS) {
      curParallelThumbnails++;
      const thumbnailPath = await generateAndStoreThumbnail(filePath, thumbnailDirectory);
      ctx.postMessage({ fileId, thumbnailPath: thumbnailPath || filePath });
      curParallelThumbnails--;
    } else {
      queue.push(data);
    }
  } catch (err) {
    curParallelThumbnails--;
    console.error('Could not generate image thumbnail', data.filePath, err);
    // If an error occurs, just load the real file
    ctx.postMessage({ fileId, thumbnailPath: filePath });
  }
  if (curParallelThumbnails < MAX_PARALLEL_THUMBNAILS && queue.length > 0) {
    processMessage(queue.shift()!); // "pop" from the queue. First elements are at the start, so shift em
  }
}

// Respond to message from parent thread
ctx.addEventListener('message', async (event) => {
  await processMessage(event.data);
});

// Make the file importable
// https://stackoverflow.com/questions/50210416/webpack-worker-loader-fails-to-compile-typescript-worker
export default null as any;
