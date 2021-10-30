import { default as init, compute } from './masonry.js';
self.onmessage = async (event) => {
    await init(new URL('./masonry_bg.wasm', import.meta.url), event.data);
    compute();
};