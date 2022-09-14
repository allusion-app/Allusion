// Force Webpack to include worker and WASM file in the build folder!
import { default as init, MasonryWorker, MasonryType, InitOutput } from 'wasm/packages/masonry';
import { ITransform, Layouter } from './layout-helpers';

export const MASONRY_PADDING = 8;

export class MasonryWorkerAdapter implements Layouter {
  private worker?: MasonryWorker;
  private memory?: WebAssembly.Memory;

  private imageCount: number = 0;

  get isInitialized(): boolean {
    return this.memory !== undefined && this.worker !== undefined;
  }

  *initialize(imageCount: number): Generator<unknown, void, any> {
    if (this.isInitialized) {
      return;
    }

    console.debug('initializing masonry worker...');
    const wasm: InitOutput = yield init();

    const worker = new Worker(new URL('wasm/packages/masonry/worker.js', import.meta.url), {
      type: 'module',
    });
    worker.postMessage(wasm.memory);
    this.memory = wasm.memory;
    this.worker = new MasonryWorker(imageCount);
    this.imageCount = imageCount;
  }

  *compute(
    containerWidth: number,
    type: MasonryType,
    size: number,
  ): Generator<unknown, number, any> {
    if (this.worker === undefined) {
      throw new Error('Worker is uninitialized.');
    }

    yield this.worker.compute(containerWidth, type, size, MASONRY_PADDING);

    return this.worker.get_height();
  }

  updateContent(images: readonly { width: number; height: number }[]): void {
    const worker = this.worker;
    if (worker === undefined) {
      throw new Error('Worker is uninitialized.');
    }

    const imageCount = images.length;

    if (this.imageCount !== imageCount) {
      worker.resize(imageCount);
    }

    this.imageCount = imageCount;
    for (let i = 0; i < imageCount; i++) {
      worker.set_dimension(i, images[i].width, images[i].height);
    }
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
