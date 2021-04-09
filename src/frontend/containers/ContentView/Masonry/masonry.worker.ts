import { default as init, execute } from 'wasm/masonry/pkg/masonry';

self.onmessage = async (event: MessageEvent<[Int32Array, WebAssembly.Memory]>) => {
  await init('./wasm/masonry/pkg/masonry_bg.wasm', event.data[1]);
  const message = event.data[0];

  while (true) {
    // Waiton notification from main thread (wasm/masonry/src/masonry_layout -> MasonryWorker::compute)
    Atomics.wait(message, 0, 0);

    // Send pointer to work load back to WASM
    self.postMessage(execute(message[1]));

    // Put thread back to sleep (block)
    message[0] = 0;
  }
};
