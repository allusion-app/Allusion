import { expose } from 'comlink';

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
  items: ITransform[];
}

export class Mason {
  WASM!: InitOutput;
  layout?: Layout;
  imgs?: ImageInput[];

  async initialize() {
    console.log('ATTEMPT #GAZILLION');
    // From: https://github.com/anderejd/electron-wasm-rust-example/blob/master/main_module.js
    this.WASM = await init('./wasm/masonry/pkg/masonry_bg.wasm');
    console.log('DID IT WORK? IT DOES!!!', this.WASM);
  }
  async computeLayout(imgs: ImageInput[], containerWidth: number, thumbSize: number): Promise<ILayout> {
    const layout = Layout.new(imgs.length, thumbSize);
    if (this.layout) this.layout.free(); // TODO: does this work?
    this.layout = layout;
    this.imgs = imgs;

    const itemsPtr = layout.items();
    console.log(imgs, containerWidth);
    const items = new Uint16Array(this.WASM.memory.buffer, itemsPtr, imgs.length * 6); // 6 uint16s per item
    console.log('Empty', items);
    for (let i = 0; i < imgs.length; i++) {
      layout.set_item_input(i, imgs[i].width, imgs[i].height);
      items[i * 6 + 1] = imgs[i].height;
    }
    console.log('Input', items);

    // TODO: Creating a copy in JS for all items is not necessary, just doing this for ease of use
    // If there are thousands of images, we only need access to the ones in view
    // Can we share the layout with the main thread? SharedArrayBuffer?
    // "You can pass buffers to/from a web worker without performing a copy using Transferable objects:"
    // Bingo
    // https://stackoverflow.com/questions/20042948/sending-multiple-array-buffers-to-a-javascript-web-worker
    const containerHeight = layout.compute(containerWidth, 4);
    const itemObjs = imgs.map((_, index) => ({
      width: items[index * 6 + 2],
      height: items[index * 6 + 3],
      left: items[index * 6 + 4],
      top: items[index * 6 + 5],
    }));

    console.log('Done', items, itemObjs);

    // TODO: Clean up memory some time. Does this work? Can we delay it until after returning? (e.g. setTimeout)
    // layout.free();
    // or even better, reuse memory
    // if previous_image_count === current_image_count: don't alloc new memory. If only containerWidth changes, no need to even reset the input

    return {
      containerHeight,
      items: itemObjs,
      // getTransform: (index: number): ITransform => ({
      //   width: items[index * 6 + 2],
      //   height: items[index * 6 + 3],
      //   top: items[index * 6 + 4],
      //   left: items[index * 6 + 5],
      // }),
    };
  }
  /** Use this if only the container dimensions change (not the content) */
  recomputeLayout(containerWidth: number, thumbSize: number) {
    if (!this.layout || !this.imgs) return;
    const { layout, imgs } = this;
    layout.set_thumbnail_size(thumbSize);
    const itemsPtr = layout.items();
    const items = new Uint16Array(this.WASM.memory.buffer, itemsPtr, imgs.length * 6);
    const containerHeight = layout.compute(containerWidth, 4);
    const itemObjs = imgs.map((_, index) => ({
      width: items[index * 6 + 2],
      height: items[index * 6 + 3],
      top: items[index * 6 + 4],
      left: items[index * 6 + 5],
    }));
    return {
      containerHeight,
      items: itemObjs,
    };
  }
}

// https://lorefnon.tech/2019/03/24/using-comlink-with-typescript-and-worker-loader/
expose(Mason, self);

export default null as any;
