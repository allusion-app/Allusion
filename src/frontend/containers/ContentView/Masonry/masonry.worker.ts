import { expose, transfer } from 'comlink';

import { default as init, InitOutput, Layout } from 'wasm/masonry/pkg/masonry';

// Force Webpack to include wasm file in the build folder, so we can load it using `init` later
import 'wasm/masonry/pkg/masonry_bg.wasm';

const MAX_ITEMS = 40000; // Reserving 200.000 uints by default (see lib.rs), each image items takes up 5 uin16s, so max items = 200.000 / 5 = 40.000

// interface ImageInput {
//   width: number;
//   height: number;

//   // TODO: Could add the sorted value in here, so we could add headers just like GPhotos
//   // also for file size, e.g. dividers at 1 MB, 2 MB
//   date?: Date;
// }

export interface ITransform {
  width: number;
  height: number;
  top: number;
  left: number;
}

export interface ILayout {
  containerHeight: number;
  items: Uint16Array;
  topOffsets: Uint32Array;
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

export class MasonryWorker {
  WASM?: InitOutput;
  layout?: Layout;
  items?: Uint16Array;
  topOffsets?: Uint32Array;

  /** Initializes WASM Returns the memory */
  async initializeWASM() {
    // From: https://github.com/anderejd/electron-wasm-rust-example/blob/master/main_module.js
    this.WASM = await init('./wasm/masonry/pkg/masonry_bg.wasm');
  }

  /** Should be called whenever the input is changed.
   * Be sure to free the memory when you're done with it!
   * @returns A Uin16Buffer where the image input dimensions can be defined as [src_width, src_height, -, -, -, -]
   */
  initializeLayout(numItems: number): [Uint16Array, Uint32Array] {
    if (!this.WASM) throw new Error('WASM not initialized!');
    let itemsPtr = 0;
    let topOffsetsPtr = 0;
    if (!this.layout) {
      this.layout = Layout.new(numItems, defaultOpts.thumbSize, defaultOpts.padding);
      itemsPtr = this.layout.items();
      topOffsetsPtr = this.layout.top_offsets();

      this.items = new Uint16Array(this.WASM.memory.buffer, itemsPtr, MAX_ITEMS); // 5 uint16s per item
      this.topOffsets = new Uint32Array(this.WASM.memory.buffer, topOffsetsPtr, MAX_ITEMS); // 1 uint32 for top offset
    } else {
      this.layout.resize(numItems);
    }

    // console.log({ itemsPtr, items: this.items, byteLength: this.items.byteLength, buff: this.items.buffer, });

    // We can pass the layout back to the main thread without copying, using Transferable objects
    // https://stackoverflow.com/questions/20042948/sending-multiple-array-buffers-to-a-javascript-web-worker
    // Also possible with Comlink, with the transfer function: https://github.com/GoogleChromeLabs/comlink#comlinktransfervalue-transferables-and-comlinkproxyvalue
    return transfer([this.items, this.topOffsets], [this.WASM.memory.buffer]);
  }

  resize(numItems: number) {
    if (numItems > MAX_ITEMS) {
      console.error(
        `Maximum amount of items exceeded (${
          numItems > MAX_ITEMS
        }). Never considered we'd get to this point...`,
      );
      this.layout?.resize(MAX_ITEMS);
    } else {
      this.layout?.resize(numItems);
    }
  }

  free() {
    this.layout?.free();
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
expose(MasonryWorker, self);

export default null as any;
