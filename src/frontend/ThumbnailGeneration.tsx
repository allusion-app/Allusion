import { useContext, useEffect } from 'react';
import fse from 'fs-extra';
import path from 'path';
import { action } from 'mobx';

import { thumbnailType } from 'src/config';

import { ID } from 'src/entities/ID';
import { ClientFile } from 'src/entities/File';

import StoreContext from './contexts/StoreContext';

export interface IThumbnailMessage {
  filePath: string;
  fileId: ID;
  thumbnailDirectory: string;
  thumbnailType: string;
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
  workers[i] = new Worker(new URL('./workers/thumbnailGenerator.worker', import.meta.url), {
    type: 'module',
  });
}

let lastSubmittedWorker = 0;

// Generates thumbnail if not yet exists. Will set file.thumbnailPath when it exists.
export const ensureThumbnail = action(async (file: ClientFile, thumbnailDir: string) => {
  const thumbnailPath = file.thumbnailPath.split('?v=1')[0]; // remove ?v=1 that might have been added by the useWorkerListener down below
  const thumbnailExists = await fse.pathExists(thumbnailPath);
  if (!thumbnailExists) {
    const msg: IThumbnailMessage = {
      filePath: file.absolutePath,
      thumbnailDirectory: thumbnailDir,
      thumbnailType,
      fileId: file.id,
    };
    workers[lastSubmittedWorker].postMessage(msg);
    lastSubmittedWorker = (lastSubmittedWorker + 1) % workers.length;
  }
  return thumbnailExists;
});

// Listens and processes events from the Workers. Should only be used once in the entire app
export const useWorkerListener = () => {
  const { fileStore } = useContext(StoreContext);

  useEffect(() => {
    for (let i = 0; i < workers.length; i++) {
      workers[i].onmessage = (e: { data: IThumbnailMessageResponse }) => {
        const { fileId, thumbnailPath } = e.data;
        const clientFile = fileStore.get(fileId);
        if (clientFile) {
          // update the thumbnail path so that the image will reload, as it did not exist before
          clientFile.setThumbnailPath(`${thumbnailPath}?v=1`);
        }
      };

      workers[i].onerror = (err) => {
        console.error('Could not generate thumbnail', `worker ${i}`, err);
        const fileId = err.message;
        const clientFile = fileStore.get(fileId);
        if (clientFile) {
          // Load normal image as fallback, with v=1 to indicate it has changed
          clientFile.setThumbnailPath(`${clientFile.absolutePath}?v=1`);
        }
      };
    }
    return () => workers.forEach((worker) => worker.terminate());
  }, [fileStore]);
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
    if (file.endsWith(thumbnailType)) {
      const oldPath = path.join(sourceDir, file);
      const newPath = path.join(targetDir, file);
      await fse.move(oldPath, newPath);
    }
  }
};
