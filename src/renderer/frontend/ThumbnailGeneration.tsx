import { useContext, useEffect } from 'react';
import fse from 'fs-extra';
import path from 'path';

import ThumbnailWorker from './workers/thumbnailGenerator.worker';
import StoreContext from './contexts/StoreContext';
import { ID } from '../entities/ID';
import { ClientFile } from '../entities/File';
import { thumbnailType } from '../../config';

interface IThumbnailMessage {
  filePath: string;
  fileId: ID;
  thumbnailDirectory: string;
  thumbnailType: string;
}

interface IThumbnailMessageResponse {
  fileId: ID;
  thumbnailPath: string;
}

// TODO: Look into NativeImage operators: https://www.electronjs.org/docs/api/native-image#imageresizeoptions

// Todo: look into having multiple workers
// Messages are put on a queue, so only 1 thumbnail is generated at a time.
// Multiple workers could improve performance,
// e.g. an image can be resized while the previous one is still being written to disk
const thumbnailWorker = new ThumbnailWorker({ type: 'module' });

// Generates thumbnail if not yet exists. Will set file.thumbnailPath when it exists.
export async function ensureThumbnail(file: ClientFile, thumbnailDir: string) {
  const thumbnailPath = file.thumbnailPath.split('?v=1')[0]; // remove ?v=1 that might have been added by the useWorkerListener down below
  const thumbnailExists = await fse.pathExists(thumbnailPath);
  if (!thumbnailExists) {
    const msg: IThumbnailMessage = {
      filePath: file.absolutePath,
      thumbnailDirectory: thumbnailDir,
      thumbnailType,
      fileId: file.id,
    };
    thumbnailWorker.postMessage(msg);
  }
  return thumbnailExists;
}

// Listens and processes events from the Workers. Should only be used once in the entire app
export const useWorkerListener = () => {
  const { fileStore } = useContext(StoreContext);

  useEffect(() => {
    thumbnailWorker.onmessage = (e: { data: IThumbnailMessageResponse }) => {
      const { fileId, thumbnailPath } = e.data;
      const clientFile = fileStore.get(fileId);
      if (clientFile) {
        // update the thumbnail path so that the image will reload, as it did not exist before
        clientFile.setThumbnailPath(`${thumbnailPath}?v=1`);
      }
    };

    thumbnailWorker.onerror = (err: { fileId: ID; error: Error }) => {
      console.log('Could not generate thumbnail', err);
      const { fileId } = err;
      const clientFile = fileStore.get(fileId);
      if (clientFile) {
        // Load normal image as fallback, with v=1 to indicate it has changed
        clientFile.setThumbnailPath(`${clientFile.absolutePath}?v=1`);
      }
    };
    return () => thumbnailWorker.terminate();
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
