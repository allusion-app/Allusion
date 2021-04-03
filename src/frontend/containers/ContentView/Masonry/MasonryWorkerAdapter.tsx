import { Remote, wrap } from 'comlink';
import { runInAction } from 'mobx';
import { ClientFile } from 'src/entities/File';
import MasonryWorkerClass, { MasonryWorker, MasonryOpts } from './masonry.worker';

export class MasonryWorkerAdapter {
  worker?: Remote<MasonryWorker>;
  items?: Uint16Array;
  topOffsets?: Uint32Array;
  isInitialized = false;

  private prevNumImgs: number = 0;

  async initialize(numItems: number) {
    console.debug('adapter initializing');

    if (!this.worker) {
      console.debug('Loading worker');
      const WorkerFactory = wrap<{ new (): MasonryWorker }>(new MasonryWorkerClass());
      this.worker = await new WorkerFactory();
      console.debug('Loading wasm...');
      await this.worker.initializeWASM();
    }

    [this.items, this.topOffsets] = await this.worker.initializeLayout(numItems);
    this.prevNumImgs = numItems;

    (window as any).layout = this.getItemLayout.bind(this);
    this.isInitialized = true;
  }
  async compute(
    imgs: ClientFile[],
    numImgs: number,
    containerWidth: number,
    opts: Partial<MasonryOpts>,
  ) {
    if (!this.items || !this.worker) return;

    if (this.prevNumImgs !== numImgs) {
      await this.worker.resize(numImgs);
    }

    this.prevNumImgs = numImgs;
    runInAction(() => {
      for (let i = 0; i < imgs.length; i++) {
        // Images that can't load are given resolution of 1, so they have a square aspect ratio
        this.items![i * 5 + 0] = imgs[i].width || 1;
        this.items![i * 5 + 1] = imgs[i].height || 1;
      }
    });

    return this.worker.computeLayout(containerWidth, opts);
  }
  async recompute(containerWidth: number, opts: Partial<MasonryOpts>) {
    if (!this.items || !this.worker) return;
    return this.worker.computeLayout(containerWidth, opts);
  }
  free() {
    return this.worker?.free();
  }
  // This method will be available in the custom VirtualizedRenderer component as layout.getItemLayout
  getItemLayout(index: number) {
    if (!this.items || !this.topOffsets)
      return {
        width: 0,
        height: 0,
        left: 0,
        top: 0,
      };
    return {
      width: this.items[index * 5 + 2],
      height: this.items[index * 5 + 3],
      left: this.items[index * 5 + 4],
      top: this.topOffsets[index],
    };
  }
}
