import fse from 'fs-extra';

import { thumbnailFormat, thumbnailMaxSize } from 'common/config';
import { IThumbnailMessage, IThumbnailMessageResponse } from '../image/ThumbnailGeneration';

// TODO: Merge this with the generateThumbnail func from frontend/image/utils.ts, it's duplicate code
const generateThumbnailData = async (filePath: string): Promise<ArrayBuffer | null> => {
  let inputBuffer = null;
  let inputBlob = null;
  let img = null;
  let canvas = null;
  let ctx2D = null;
  let thumbBlob = null;
  let buffer = null;

  try {
    inputBuffer = await fse.readFile(filePath);
    inputBlob = new Blob([inputBuffer]);
    img = await createImageBitmap(inputBlob);

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

    canvas = new OffscreenCanvas(width, height);

    ctx2D = canvas.getContext('2d');
    if (!ctx2D) {
      console.warn('No canvas context 2D (should never happen)');
      return null;
    }

    // Todo: Take into account rotation. Can be found with https://www.npmjs.com/package/node-exiftool

    // TODO: Could maybe use https://www.electronjs.org/docs/api/native-image#imageresizeoptions

    ctx2D.drawImage(img, 0, 0, width, height);

    thumbBlob = await canvas.convertToBlob({ type: `image/${thumbnailFormat}`, quality: 0.75 });
    // TODO: is canvas.toDataURL faster?
    const reader = new FileReaderSync();
    buffer = reader.readAsArrayBuffer(thumbBlob);
    return buffer;
  } catch (error) {
    console.error('Error generating thumbnail data:', error);
    return null;
  } finally {
    // Explicit Memory Deallocation
    if (img) {
      try {
        img.close();
      } catch (e) {
        console.warn('Failed to close ImageBitmap:', e);
      }
    }

    inputBuffer = null;
    inputBlob = null;
    canvas = null;
    ctx2D = null;
    thumbBlob = null;
  }
};

const generateAndStoreThumbnail = async (filePath: string, thumbnailFilePath: string) => {
  // Could already exist: maybe generated in another worker, when use scrolls up/down repeatedly
  // but this doesn't help if we want to deliberately overwrite the thumbnail, but we don't have that currently
  if (await fse.pathExists(thumbnailFilePath)) {
    return thumbnailFilePath;
  }

  let thumbnailData = await generateThumbnailData(filePath);
  if (thumbnailData) {
    await fse.outputFile(thumbnailFilePath, Buffer.from(thumbnailData));
    return thumbnailFilePath;
  }
  thumbnailData = null;
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
const MAX_QUEUE_LENGTH = 8;
let curParallelThumbnails = 0;

const addToQueue = (data: IThumbnailMessage) => {
  if (queue.length >= MAX_QUEUE_LENGTH) {
    queue.shift();
    console.log(`Queue full (${MAX_QUEUE_LENGTH}). Removed oldest request.`);
  }

  addToQueue(data);
};

async function processMessage(data: IThumbnailMessage) {
  const { filePath, thumbnailFilePath, fileId } = data;
  try {
    // console.log('Processing thumbnail message', { data, curParallelThumbnails, queue });
    if (curParallelThumbnails < MAX_PARALLEL_THUMBNAILS) {
      curParallelThumbnails++;
      const thumbnailPath = await generateAndStoreThumbnail(filePath, thumbnailFilePath);
      const response: IThumbnailMessageResponse = {
        fileId,
        thumbnailPath: thumbnailPath || filePath,
      };
      ctx.postMessage(response);
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
  // Remove the image from the queue when timeout occurs
  if (event.data.type === 'cancel') {
    const index = queue.findIndex((item) => item.fileId === event.data.fileId);
    if (index !== -1) {
      queue.splice(index, 1);
      console.log(`Cancelled request for fileId: ${event.data.fileId}`);
    }
    return;
  }
  await processMessage(event.data);
});
