import { Remote, wrap } from 'comlink';
import MasonryWorker, { Mason } from './masonry.worker';

export class MasonryWorkerAdapter {
  worker?: Remote<Mason>;
  async initialize() {
    console.time('Loading worker')
    const WorkerFactory = wrap<{ new(): Mason }>(new MasonryWorker());
    this.worker = await new WorkerFactory();

    console.time('Loading wasm...');
    await this.worker.initialize();
  }
  async compute(imgs: { width: number, height: number }[], containerWidth: number, thumbSize: number) {
    // console.timeLog('Computing layout');
    return this.worker?.computeLayout(imgs, containerWidth, thumbSize);
  }
  async recompute(containerWidth: number, thumbSize: number) {
    return this.worker?.recomputeLayout(containerWidth, thumbSize);
  }
}
