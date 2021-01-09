import { Remote, wrap } from 'comlink';
import { runInAction } from 'mobx';
import { ClientFile } from 'src/renderer/entities/File';
import MasonryWorker, { Mason, MasonryOpts } from './masonry.worker';

export class MasonryWorkerAdapter {
  worker?: Remote<Mason>;
  items?: Uint16Array;
  async initialize(numItems: number) {
    console.log('adapter initializing');

    if (!this.worker) {
      console.log('Loading worker')
      const WorkerFactory = wrap<{ new(): Mason }>(new MasonryWorker());
      this.worker = await new WorkerFactory();
      console.log('Loading wasm...');
      await this.worker.initializeWASM();
    }

    this.items = await this.worker.initializeLayout(numItems);

    console.log('adapter initialized!');
  }
  async compute(imgs: ClientFile[], containerWidth: number, opts: Partial<MasonryOpts>) {
    // console.log('compute', this.items, this.worker);
    // TODO: if compute was called while not initalized, do the computation after initialization
    if (!this.items || !this.worker) return;

    const { items } = this;
    // await new Promise<void>((resolve) =>
    runInAction(() => {
      for (let i = 0; i < imgs.length; i++) {
        items[i * 6] = imgs[i].width;
        items[i * 6 + 1] = imgs[i].height;
      }
      //   resolve();
    });
    // );

    console.log('compute v2', this.items);

    return this.worker.computeLayout(containerWidth, opts);
  }
  async recompute(containerWidth: number, opts: Partial<MasonryOpts>) {
    console.log('recompute');
    if (!this.items || !this.worker) return;
    return this.worker.computeLayout(containerWidth, opts);
  }
  getItemLayout(index: number) {
    if (!this.items) return {
      width: 0,
      height: 0,
      left: 0,
      top: 0,
    }
    return {
      width: this.items[index * 6 + 2],
      height: this.items[index * 6 + 3],
      left: this.items[index * 6 + 4],
      top: this.items[index * 6 + 5],
    };
  }
}
