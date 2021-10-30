import { default as init, compute } from './masonry.js';
self.onmessage = async (event) => {
    await init(new URL('./masonry_bg.wasm', import.meta.url), event.data[0]);
    while (true) {
        self.postMessage(compute());
    }
};