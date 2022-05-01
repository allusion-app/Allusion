import { simd } from 'wasm-feature-detect';
import {
  default as simdInit,
  run as simdRun,
  MasonryWorker as SimdMasonryWorker,
} from './masonry-simd/masonry';
import {
  default as scalarInit,
  run as scalarRun,
  MasonryWorker as ScalarMasonryWorker,
} from './masonry-scalar/masonry';

let IS_SIMD_SUPPORTED = false;

export function run() {
  if (IS_SIMD_SUPPORTED) {
    simdRun();
  } else {
    scalarRun();
  }
}

export const MasonryType = Object.freeze({
  Vertical: 0,
  0: 'Vertical',
  Horizontal: 1,
  1: 'Horizontal',
  Grid: 2,
  2: 'Grid',
});

export class MasonryWorker {
  worker;

  constructor(num_items) {
    if (IS_SIMD_SUPPORTED) {
      this.worker = new SimdMasonryWorker(num_items);
    } else {
      this.worker = new ScalarMasonryWorker(num_items);
    }
  }

  compute(width, kind, thumbnail_size, padding) {
    return this.worker.compute(width, kind, thumbnail_size, padding);
  }

  get_height() {
    return this.worker.get_height();
  }

  resize(new_len) {
    return this.worker.resize(new_len);
  }

  set_dimension(index, src_width, src_height) {
    return this.worker.set_dimension(index, src_width, src_height);
  }

  get_transform(index) {
    return this.worker.get_transform(index);
  }
}

async function init(maybe_memory) {
  IS_SIMD_SUPPORTED = await simd();
  if (IS_SIMD_SUPPORTED) {
    return simdInit(new URL('./masonry-simd/masonry_bg.wasm', import.meta.url), maybe_memory);
  } else {
    console.warn('SIMD instructions are not supported. Falling back to scalar code.');
    return scalarInit(new URL('./masonry-scalar/masonry_bg.wasm', import.meta.url), maybe_memory);
  }
}

export default init;
