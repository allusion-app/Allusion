import { runInAction } from 'mobx';
import { ClientFile } from 'src/entities/File';
// Force Webpack to include worker and WASM file in the build folder!
import { default as init, MasonryWorker, MasonryType } from 'wasm/masonry/pkg/masonry';
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
    if (this.memory !== undefined && this.worker !== undefined) {
      return;
    }

    console.debug('initializing masonry worker...');
    const wasm = await init(new URL('wasm/masonry/pkg/masonry_bg.wasm', import.meta.url));
    this.memory = wasm.memory;

    // Webpack doesn't like folder paths for URL
    const worker = new Worker(new URL('wasm/masonry/pkg/worker.js', import.meta.url), {
      type: 'module',
    });
    worker.postMessage(this.memory);
    this.worker = new MasonryWorker(numItems);

    this.prevNumImgs = numItems;
  }

  async compute(
    imgs: ClientFile[],
    numImgs: number,
    containerWidth: number,
    opts: Partial<MasonryOptions>,
  ): Promise<number | undefined> {
    const worker = this.worker;
    if (worker === undefined) {
      return Promise.reject();
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
      return Promise.reject();
    }
    await this.worker.compute(
      containerWidth,
      opts.type || defaultOpts.type,
      opts.thumbSize || defaultOpts.thumbSize,
      opts.padding || defaultOpts.padding,
    );
    return this.worker.get_height();
  }

  free() {
    this.worker?.free();
    this.worker = undefined;
    this.memory = undefined;
  }

  // This method will be available in the custom VirtualizedRenderer component as layout.getItemLayout
  getTransform(index: number): ITransform {
    if (this.worker === undefined || this.memory === undefined) {
      return [0, 0, 0, 0];
    }
    const ptr = this.worker.get_transform(index);
    return (new Uint32Array(this.memory.buffer, ptr, 4) as unknown) as ITransform;
  }
}
