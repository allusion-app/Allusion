import { thumbnailFormat } from 'common/config';
import fse from 'fs-extra';
import { action } from 'mobx';
import path from 'path';
import { useEffect } from 'react';
import { ClientFile } from 'src/entities/File';
import { ID } from 'src/api/ID';

export interface IThumbnailMessage {
  filePath: string;
  fileId: ID;
  thumbnailFilePath: string;
  thumbnailFormat: string;
}

export interface IThumbnailMessageResponse {
  fileId: ID;
  thumbnailPath: string;
}

// TODO: Look into NativeImage operators: https://www.electronjs.org/docs/api/native-image#imageresizeoptions

// Set up multiple workers for max performance
const NUM_THUMBNAIL_WORKERS = 4;
const workers: Worker[] = [];
for (let i = 0; i < NUM_THUMBNAIL_WORKERS; i++) {
  workers[i] = new Worker(
    new URL('src/frontend/workers/thumbnailGenerator.worker', import.meta.url),
  );
}

let lastSubmittedWorker = 0;

type Callback = (success: boolean) => void;
/** A map of File ID and a callback function for when thumbnail generation is finished or has failed */
const listeners = new Map<ID, Callback[]>();

/**
 * Generates a thumbnail in a Worker: {@link ../workers/thumbnailGenerator.worker}
 * When the worker is finished, the file.thumbnailPath will be updated with ?v=1,
 * causing the image to update in the view where ever it is used
 **/
export const generateThumbnailUsingWorker = action(
  async (file: ClientFile, thumbnailFilePath: string, timeout = 10000) => {
    const msg: IThumbnailMessage = {
      filePath: file.absolutePath,
      thumbnailFilePath,
      thumbnailFormat,
      fileId: file.id,
    };

    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (listeners.has(msg.fileId)) {
          reject();
          listeners.delete(msg.fileId);
        }
      }, timeout);

      // Might already be in progress if called earlier
      const existingListeners = listeners.get(file.id);
      if (existingListeners) {
        existingListeners.push((success) => (success ? resolve() : reject()));
        return;
      }

      // Otherwise, create a new listener and submit to a worker
      listeners.set(msg.fileId, [(success) => (success ? resolve() : reject())]);
      workers[lastSubmittedWorker].postMessage(msg);
      lastSubmittedWorker = (lastSubmittedWorker + 1) % workers.length;
    });
  },
);

/**
 * Listens and processes events from the Workers. Should only be used once in the entire app
 * TODO: no need for this to be a hook anymore, should just make a class out of it
 */
export const useWorkerListener = () => {
  useEffect(() => {
    for (let i = 0; i < workers.length; i++) {
      workers[i].onmessage = (e: { data: IThumbnailMessageResponse }) => {
        const { fileId } = e.data;

        const callbacks = listeners.get(fileId);
        if (callbacks) {
          callbacks.forEach((cb) => cb(true));
          listeners.delete(fileId);
        } else {
          console.debug(
            'No callbacks found for fileId after successful thumbnail creation:',
            fileId,
            'Might have timed out',
          );
        }
      };

      workers[i].onerror = (err) => {
        console.error('Could not generate thumbnail', `worker ${i}`, err);
        const fileId = err.message;

        const callbacks = listeners.get(fileId);
        if (callbacks) {
          callbacks.forEach((cb) => cb(false));
          listeners.delete(fileId);
        } else {
          console.debug(
            'No callbacks found for fileId after unsuccessful thumbnail creation:',
            fileId,
            'Might have timed out',
          );
        }
      };
    }
    return () => workers.forEach((worker) => worker.terminate());
  }, []);
};

// Moves all thumbnail files from one directory to another
export const moveThumbnailDir = async (sourceDir: string, targetDir: string) => {
  if (!(await fse.pathExists(sourceDir)) || !(await fse.pathExists(targetDir))) {
    console.log('Source or target directory does not exist for moving thumbnails');
    return;
  }

  console.log('Moving thumbnails from ', sourceDir, ' to ', targetDir);

  const files = await fse.readdir(sourceDir);
  for (const file of files) {
    if (file.endsWith(thumbnailFormat)) {
      const oldPath = path.join(sourceDir, file);
      const newPath = path.join(targetDir, file);
      await fse.move(oldPath, newPath);
    }
  }
};
