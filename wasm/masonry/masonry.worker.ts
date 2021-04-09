import { default as init, execute } from './pkg/masonry.js';

const ctx = self;
ctx.onmessage = async (event: MessageEvent<[Int32Array, WebAssembly.Memory]>) => {
    await init('./masonry_bg.wasm', event.data[1]);
    const message = event.data[0];

    while (true) {
        Atomics.wait(message, 0, 0);
        ctx.postMessage(execute(message[1]));
        message[0] = 0;
    }
};