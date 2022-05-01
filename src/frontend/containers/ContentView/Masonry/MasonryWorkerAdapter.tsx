import { runInAction } from 'mobx';
import { ClientFile } from 'src/entities/File';
// Force Webpack to include worker and WASM file in the build folder!
import { default as init, MasonryWorker, MasonryType } from 'wasm/packages/masonry';
import { ITransform, Layouter } from './layout-helpers';

export interface MasonryOptions {
  type: MasonryType;
  thumbSize: number;
  padding: number;
}

const defaultOpts: MasonryOptions = {
  type: MasonryType.Vertical,
  thumbSize: 300,
  padding: 8,
};

export class MasonryWorkerAdapter implements Layouter {
  private worker?: MasonryWorker;
  private memory?: WebAssembly.Memory;

  private prevNumImgs: number = 0;

  async initialize(numItems: number) {
    this.prevNumImgs = numItems;

    if (this.memory !== undefined && this.worker !== undefined) {
      return;
    }

    console.debug('initializing masonry worker...');
    const wasm = await init();
    this.memory = wasm.memory;

    const worker = new Worker(new URL('wasm/packages/masonry/worker.js', import.meta.url), {
      type: 'module',
    });
    worker.postMessage(this.memory);
    this.worker = new MasonryWorker(numItems);
  }

  async compute(
    imgs: ClientFile[],
    numImgs: number,
    containerWidth: number,
    opts: Partial<MasonryOptions>,
  ): Promise<number | undefined> {
    const worker = this.worker;
    if (worker === undefined) {
      return Promise.reject('Worker is uninitialized.');
    }

    if (this.prevNumImgs !== numImgs) {
      worker.resize(numImgs);
    }

    this.prevNumImgs = numImgs;
    runInAction(() => {
      for (let i = 0; i < imgs.length; i++) {
        worker.set_dimension(i, imgs[i].width, imgs[i].height);
      }
    });

    await worker.compute(
      containerWidth,
      opts.type || defaultOpts.type,
      opts.thumbSize || defaultOpts.thumbSize,
      opts.padding || defaultOpts.padding,
    );
    return worker.get_height();
  }

  async recompute(
    containerWidth: number,
    opts: Partial<MasonryOptions>,
  ): Promise<number | undefined> {
    if (this.worker === undefined) {
      return Promise.reject('Worker is uninitialized.');
    }
    await this.worker.compute(
      containerWidth,
      opts.type || defaultOpts.type,
      opts.thumbSize || defaultOpts.thumbSize,
      opts.padding || defaultOpts.padding,
    );
    return this.worker.get_height();
  }

  // This method will be available in the custom VirtualizedRenderer component as layout.getItemLayout
  getTransform(index: number): ITransform {
    if (this.worker === undefined || this.memory === undefined) {
      throw new Error('Worker is uninitialized.');
    }
    const ptr = this.worker.get_transform(index);
    return new Uint32Array(this.memory.buffer, ptr, 4) as unknown as ITransform;
  }
}
