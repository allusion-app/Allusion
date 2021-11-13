import { default as init, run } from './masonry.js';
self.onmessage = async (event) => {
    await init(new URL('./masonry_bg.wasm', import.meta.url), event.data);
    run();
};