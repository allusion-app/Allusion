import { default as init, run } from './index.js';
self.onmessage = async (event) => {
  await init(event.data);
  run();
};
