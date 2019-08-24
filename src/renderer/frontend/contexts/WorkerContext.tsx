import React from 'react';
import ThumbnailWorker from '../workers/thumbnailGenerator.worker';

export interface IThumbnailMessage {
  filePath: string;
  thumbnailDirectory: string;
  thumbnailType: string;
}

interface IWorkerContext {
  thumbnailWorker: Worker;
}

// Todo: look into having multiple workers
const WorkerContext = React.createContext<IWorkerContext>({
  thumbnailWorker: new ThumbnailWorker( { type: 'module' }),
});

export default WorkerContext;
