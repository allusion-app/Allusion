import { useContext, useEffect } from 'react';
import fse from 'fs-extra';

import ThumbnailWorker from './workers/thumbnailGenerator.worker';
import StoreContext from './contexts/StoreContext';
import { ID } from '../entities/ID';
import { ClientFile } from '../entities/File';
import { getThumbnailPath } from './utils';

interface IThumbnailMessage {
  filePath: string;
  fileId: ID;
  thumbnailDirectory: string;
  thumbnailType: string;
}

interface IThumbnailMessageResponse {
  fileId: ID;
}

// Todo: look into having multiple workers
// Messages are put on a queue, so only 1 thumbnail is generated at a time.
// Multiple workers could improve performance,
// e.g. an image can be resized while the previous one is still being written to disk
const thumbnailWorker = new ThumbnailWorker({ type: 'module' });

// Generates thumbnail if not yet exists. Will set file.hasThumbnail to true when it exists.
export async function ensureThumbnail(file: ClientFile, thumbnailDir: string, thumbnailType: string) {
  if (!file.hasThumbnail) {
    const thumbnailPath = getThumbnailPath(file.path, thumbnailDir, thumbnailType);
    const thumbnailExists = await fse.pathExists(thumbnailPath);
    if (!thumbnailExists) {
      const msg: IThumbnailMessage = {
        filePath: file.path,
        thumbnailDirectory: thumbnailDir,
        thumbnailType,
        fileId: file.id,
      };
      thumbnailWorker.postMessage(msg);
    } else {
      file.hasThumbnail = true;
    }
  }
}

// Listens and processes events from the Workers. Should only be used once in the entire app
export const useWorkerListener = () => {
  const { fileStore } = useContext(StoreContext);

  useEffect(() => {
    thumbnailWorker.onmessage = (e: { data: IThumbnailMessageResponse }) => {
      const { fileId } = e.data;
      const clientFile = fileStore.fileList.find((f) => f.id === fileId);
      if (clientFile) {
        clientFile.hasThumbnail = true;
      }
    };

    thumbnailWorker.onerror = (err: any) => {
      console.log('Could not generate thumbnail', err);
      // Todo: Load normal image as fallback?
    };
  }, []);
};
