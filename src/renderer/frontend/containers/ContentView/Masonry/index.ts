import { wrap } from 'comlink';
import MasonryWorker, { Mason } from './masonry.worker';

import * as WASM from 'wasm/masonry/pkg/masonry_bg.wasm';
import { default as WASM2 } from 'wasm/masonry/pkg/masonry_bg.wasm';

import * as Masonry from 'wasm/masonry/pkg';


export async function computeMasonryLayout(imgs: { width: number, height: number }[], containerWidth: number) {

  console.log(WASM, (WASM as any).default, WASM.layout_new, typeof WASM, WASM.memory, Object.keys(WASM), (WASM as any).default);
  console.log(WASM2, WASM2.layout_new, typeof WASM2, WASM2.memory)

  const fetchRes = await fetch('wasm/masonry/pkg/masonry_bg.wasm');
  console.log(fetchRes);

  const x = await import('wasm/masonry/pkg/masonry.js');
  console.log(x, x.default, x.Layout.new(imgs.length, 300))

  import(/*webpackIgnore: true*/ 'wasm/masonry/pkg/masonry').then((module) => {

    console.log('HELLO WORLD', module.Layout)
    const layout2 = Masonry.Layout.new(imgs.length, 300);
    const itemsPtr = layout2.items();
    console.log(itemsPtr);
  });

  const layout = Masonry.Layout.new(imgs.length, 300);
  const itemsPtr = layout.items();
  const items = new Uint16Array(WASM.memory.buffer, itemsPtr, imgs.length * 6); // 6 uint16s per item
  for (let i = 0; i < imgs.length; i++) {
    // First two fields are source width and height, see Transform struct in lib.rs
    items.set([imgs[i].width, imgs[i].height], i * 6);
  }

  const containerHeight = layout.compute(containerWidth, 4);
  console.log(containerHeight);

  console.time('Loading worker')
  const WorkerFactory = wrap<{ new(): Mason }>(new MasonryWorker());
  const worker = await new WorkerFactory();
  console.timeLog('Loading worker');
  console.log(Masonry, worker, WASM);

  console.time('Computing layout');
  const res = await worker.computeLayout(imgs, containerWidth);
  console.timeLog('Computing layout');
  console.log(res.containerHeight, res.getTransform(0), res.getTransform(imgs.length - 1));

  return res;
}
