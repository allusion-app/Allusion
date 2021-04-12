import { runInAction } from 'mobx';
import { ClientFile } from 'src/entities/File';
// Force Webpack to include worker and WASM file in the build folder!
import { default as init, MasonryWorker, MasonryType } from 'wasm/masonry/pkg/masonry';
import MasonryWASM from 'wasm/masonry/pkg/masonry_bg.wasm';
import MasonryModule from 'wasm/masonry/pkg/masonry.js?file';

export interface ITransform {
  width: number;
  height: number;
  top: number;
  left: number;
}

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

export class MasonryWorkerAdapter {
  private worker?: MasonryWorker;
  isInitialized = false;

  private prevNumImgs: number = 0;

  async initialize(numItems: number) {
    console.debug('adapter initializing');

    if (!this.worker) {
      this.free();
      console.debug('initializing WASM...');
      await init(MasonryWASM);

      // Webpack doesn't like folder paths for URL
      this.worker = new MasonryWorker(numItems, MasonryModule, (MasonryWASM as unknown) as string);
    }

    this.prevNumImgs = numItems;
    this.isInitialized = true;
  }

  async compute(
    imgs: ClientFile[],
    numImgs: number,
    containerWidth: number,
    opts: Partial<MasonryOptions>,
  ): Promise<number | undefined> {
    const worker = this.worker;
    if (!worker) {
      return Promise.reject();
    }

    if (this.prevNumImgs !== numImgs) {
      worker.resize(numImgs);
    }

    this.prevNumImgs = numImgs;
    runInAction(() => {
      for (let i = 0; i < imgs.length; i++) {
        // Images that can't load are given resolution of 1, so they have a square aspect ratio
        worker.set_dimension(i, imgs[i].width || 1, imgs[i].height || 1);
      }
    });

    return worker.compute(
      containerWidth,
      opts.type || defaultOpts.type,
      opts.thumbSize || defaultOpts.thumbSize,
      opts.padding || defaultOpts.padding,
    );
  }

  async recompute(
    containerWidth: number,
    opts: Partial<MasonryOptions>,
  ): Promise<number | undefined> {
    if (!this.worker) {
      return Promise.reject();
    }
    return this.worker.compute(
      containerWidth,
      opts.type || defaultOpts.type,
      opts.thumbSize || defaultOpts.thumbSize,
      opts.padding || defaultOpts.padding,
    );
  }

  free() {
    this.worker?.free();
    this.worker = undefined;
    this.isInitialized = false;
  }

  // This method will be available in the custom VirtualizedRenderer component as layout.getItemLayout
  getTransform(index: number): ITransform {
    if (!this.worker) {
      return {
        width: 0,
        height: 0,
        left: 0,
        top: 0,
      };
    }
    return this.worker.get_transform(index);
  }
}
