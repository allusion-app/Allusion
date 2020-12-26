import { expose } from 'comlink';

import * as Masonry from 'wasm/masonry/pkg/masonry';
import { memory } from 'wasm/masonry/pkg/masonry_bg.wasm';

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

export class Mason {
  async computeLayout(imgs: ImageInput[], containerWidth: number) {
    console.log(Masonry, typeof Masonry.Layout.new);
    const layout = Masonry.Layout.new(imgs.length, 300);
    const itemsPtr = layout.items();
    const items = new Uint16Array(memory.buffer, itemsPtr, imgs.length * 6); // 6 uint16s per item
    for (let i = 0; i < imgs.length; i++) {
      // First two fields are source width and height, see Transform struct in lib.rs
      items.set([imgs[i].width, imgs[i].height], i * 6);
    }

    const containerHeight = layout.compute(containerWidth, 4);

    return {
      containerHeight,
      getTransform: (index: number): ITransform => ({
        width: items[index * 6 + 2],
        height: items[index * 6 + 3],
        top: items[index * 6 + 4],
        left: items[index * 6 + 5],
      }),
    };
  }
}

// https://lorefnon.tech/2019/03/24/using-comlink-with-typescript-and-worker-loader/
expose(Mason, self);

export default null as any;
