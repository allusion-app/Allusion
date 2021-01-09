import { expose, transfer } from 'comlink';

import {
  default as init,
  InitOutput,
  Layout,
} from 'wasm/masonry/pkg/masonry';

// Force Webpack to include wasm file in the build folder, so we can load it using `init` later
import 'wasm/masonry/pkg/masonry_bg.wasm';

interface ImageInput {
  width: number;
  height: number;

  // TODO: Could add the sorted value in here, so we could add headers just like GPhotos
  // also for file size, e.g. dividers at 1 MB, 2 MB
  date?: Date;
}

export interface ITransform {
  width: number;
  height: number;
  top: number;
  left: number;
}

export interface ILayout {
  containerHeight: number;
  items: Uint16Array;
}

type MasonryType = 'vertical' | 'horizontal';

export interface MasonryOpts {
  type: MasonryType;
  thumbSize: number;
  padding: number;
}

const defaultOpts: MasonryOpts = {
  type: 'vertical',
  thumbSize: 300,
  padding: 8,
};

export class Mason {
  WASM!: InitOutput;
  layout?: Layout;
  items?: Uint16Array;

  /** Initializes WASM Returns the memory */
  async initializeWASM() {
    // From: https://github.com/anderejd/electron-wasm-rust-example/blob/master/main_module.js
    this.WASM = await init('./wasm/masonry/pkg/masonry_bg.wasm');
  }

  /** Should be called whenever the input is changed.
   * @returns A Uin16Buffer where the image input dimensions can be defined as [src_width, src_height, -, -, -, -]
   */
  initializeLayout(numItems: number): Uint16Array {
    // TODO: does this work? Seems to do the job, no memory errors anymore, could maybe be more efficient
    // E.g., no need to free() when the amount of images decreases
    if (this.layout) this.layout.free();

    // Initialize empty memory so we can put input directly into the buffer in the main thread, without allocating new memory
    const layout = Layout.new(numItems, defaultOpts.thumbSize, defaultOpts.padding);
    const itemsPtr = layout.items();
    const items = new Uint16Array(this.WASM.memory.buffer, itemsPtr, numItems * 6); // 6 uint16s per item

    this.layout = layout;
    this.items = items;

    // We can pass the layout back to the main thread without copying, using Transferable objects
    // https://stackoverflow.com/questions/20042948/sending-multiple-array-buffers-to-a-javascript-web-worker
    // Also possible with Comlink, with the transfer function: https://github.com/GoogleChromeLabs/comlink#comlinktransfervalue-transferables-and-comlinkproxyvalue
    return transfer(items, [items.buffer]);
  }

  /**
   * Computes a layout
   * @param containerWidth The current width of the container of the items
   * @param thumbSize The base thumbnail size to display the items as, is used as a rough guideline.
   * @returns The new height of the container, needed to contain all items.
   * The actual position and size of the items can be read from the `items` array, returned from `initializeLayout`.
   * - width: items[index * 6 + 2],
   * - height: items[index * 6 + 3],
   * - left: items[index * 6 + 4],
   * - top: items[index * 6 + 5],
   */
  computeLayout(containerWidth: number, opts: Partial<MasonryOpts>): undefined | number {
    if (!this.layout) return;
    const { layout } = this;
    layout.set_thumbnail_size(opts.thumbSize || defaultOpts.thumbSize);
    layout.set_padding(opts.padding || defaultOpts.padding);

    const type = opts.type || defaultOpts.type;
    if (type === 'vertical') {
      return layout.compute_vertical(containerWidth);
    } else if (type === 'horizontal') {
      return layout.compute_horizontal(containerWidth);
    }
  }
}

// https://lorefnon.tech/2019/03/24/using-comlink-with-typescript-and-worker-loader/
expose(Mason, self);

export default null as any;
