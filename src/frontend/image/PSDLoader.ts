import { Remote, wrap } from 'comlink';
import { PsdReaderWorker } from '../workers/psdReader.worker';
import { Loader } from './util';

/**
 * Uses the ag-psd dependency to create bitmap images of PSD files.
 * Uses a worker to offload process intensive work off the main thread
 * Based on https://github.com/Agamnentzar/ag-psd#reading-2
 */
class PsdLoader implements Loader {
  worker?: Remote<PsdReaderWorker>;

  async init(): Promise<void> {
    const worker = new Worker(new URL('src/frontend/workers/psdReader.worker', import.meta.url));

    const WorkerFactory = wrap<typeof PsdReaderWorker>(worker);
    this.worker = await new WorkerFactory();
  }

  async decode(buffer: Buffer): Promise<ImageData> {
    const { image } = await this.worker!.readImage(buffer);
    return image;
  }
}

export default PsdLoader;
