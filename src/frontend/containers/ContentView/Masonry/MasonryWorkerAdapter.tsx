import { runInAction } from 'mobx';
import { ClientFile } from 'src/entities/File';
// Force Webpack to include worker and WASM file in the build folder!
import { default as init, MasonryWorker, MasonryType } from 'wasm/masonry/pkg/masonry';
import './masonry.worker.ts';
import 'wasm/masonry/pkg/masonry_bg.wasm';

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

    if (!this.worker || !this.isInitialized) {
      this.free();
      console.debug('initializing WASM...');
      await init('./wasm/masonry/pkg/masonry_bg.wasm');

      console.debug('create masonry worker');
      this.worker = new MasonryWorker(numItems, './masonry.worker.js');
    }

    this.prevNumImgs = numItems;
    this.isInitialized = true;
  }

  async compute(
    imgs: ClientFile[],
    numImgs: number,
    containerWidth: number,
    opts: Partial<MasonryOptions>,
  ): Promise<number> {
    if (!this.worker) {
      return Promise.reject();
    }

    if (this.prevNumImgs !== numImgs) {
      this.worker.resize(numImgs);
    }

    this.prevNumImgs = numImgs;
    runInAction(() => {
      for (let i = 0; i < imgs.length; i++) {
        // Images that can't load are given resolution of 1, so they have a square aspect ratio
        this.worker!.set_dimension(i, imgs[i].width || 1, imgs[i].height || 1);
      }
    });

    return this.worker.compute(
      containerWidth,
      opts.type || defaultOpts.type,
      opts.thumbSize || defaultOpts.thumbSize,
      opts.padding || defaultOpts.padding,
    );
  }

  async recompute(containerWidth: number, opts: Partial<MasonryOptions>): Promise<number> {
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
    return this.worker?.free();
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
