# Masonry Layout

## Caveats

This only works with Chrome 80+ because we use modules in our web worker. It is possible not using modules which can be implemented if requested and be added as build flag. Be aware that this will significantly bloat the WebAssembly file.

## Building

The default export `wasm-pack build` command doesn't play nicely with electron/webpack,
after some experimenting: `wasm-pack build --target web` does work!

I added a `build:wasm` script to `package.json` that you can run to compile the Rust code to WASM.
It will also copy it to the build folder, so you can just reload the window afterwards!
Add `--release` for a production build!

TLDR:

> `yarn build:wasm`

## Threading Model

The Rust standard library or any programming language standard library does not provide threads in the classical sense for WebAssembly and many lower level building blocks are still missing or unstable. Therefore, we will have to work around web workers which are very primitive but now that SharedArrayBuffer is stable (again), we can do many things much simpler.

We use the great `com-link` library to make working with web workers a breath. Getting and setting data from a web worker is asynchronously but this can be slow because messaging is done via serailizing and deserialing objects. Overall, there is much more communication between threads required which adds overhead. The added latency is not a good fit since we want to have smooth scrolling.
To work around this, we send pointers to the data to create typed arrays from the WebAssembly memory. This fixes the issue of having to wait for accessing data in constant time. Yet, it is actually very fragile and cumbersome. First of all, any heap allocation could invalidate the pointers, so we need to allocate one gigantic `Vec`. Second of all, we need to read the values from typed arrays which limits the used structures on the Rust side and in JavaScript this is really not fun.

However, with `SharedArrayBuffer`s being stable (again), we can use all kinds of (unstable) features. No extra copying, data access in constant time and as a cherry on top we will use `Promise`s like in `com-link` to send and receive data from our web worker. The next section will be an overview how things work under the hood.

### Messaging by Sharing Memory

On the main thread we initialize the WebAssembly module using the `init` function in `./pkg/masonry.js`. Afterwards, we can call anything from the module. At first we need to create an instance of `MasonryWorker`.

The `MasonryWorker` constructor takes in as parameter the URL to the web worker script and creates the web worker inside it. There we make our first `Worker.postMessage` call to send the WebAssembly memory which will be then used in the `Worker.onmessage` callback to create the WebAssembly module. However, we have now one big problem if we just post another message. The WebAssembly cannot be stored inside your script (for some bizarre reason it just doesn't work in Chrome) and by the time the second message comes, you will have no access to the memory anymore unless you send it on every message. This is not great since we need to execute our WebAssembly functions in the message callback.

A similar problem happens when you use MPSC or channels in general. If you just create a thread and send the a port to it, only one message will be received. Why? Because the port has processed the message and is not waiting (blocking the thread) anymore. To fix this you need to block again and this is usually done by using an infinite loop to keep blocking.

In our case we have no fancy channels but we have shared memory and `Atomics`! In our `MasonryWorker` we have an `Int32Array` that is backed by a `SharedArrayBuffer`. This is send to the web worker with the WebAssembly memory on creation. We use `Atomics.wait` to block in the web worker thread and use `Atomics.notify` to wake up the web worker to process our tasks. In total, only one make one `Worker.postMessage` call which means the WebAssembly will be kept alive. Under the hood this happens or this is how it would look if it was implemented in JavaScript.

```js
// main.js
import { init } from './masonry.js';

async function main() {
    const WASM = const await init();
    const message = new Int32Array(new SharedArrayBuffer(4));
    const worker = new Worker('./worker.js');
    worker.postMessage([message, WASM.memory]);

    // ...other code
    Atomics.store(message, 0, 1);
    Atomics.notify(message, 0, 1); // Our web worker that waits on index 0 will be notified!
}

main();

// worker.js
import { init } from './masonry.js'; // only possible when using a bundler like Webpack or Chrome 80+...

self.onmessage = async (event) => {
    await init('./masonry.js', event.data[1]);
    const message = event.data[0];

    while (true) {
        Atomics.wait(message, 0, 0); // The next line won't be executed until message[0] is not equal 0.
        // ...execute WebAssembly function
        Atomics.store(message, 0, 0); // When the loop restarts the thread will block again.
    }
};
```

### Lock Free Data Read and Write

Right now the above code does not really do anything. We want to send our work to the web worker too but we only have a typed array. This limits the number of types we can send to 1 and using `Worker.postMessage` is a not an option as outlined above. We can however, use the magic of pointers!

Since the used WebAssembly memory in both threads is the same, pointers to data on the Rust side will be the same even in the web worker. Dereferencing pointers is entirely unsafe though because the send pointers must be valid and must be created on the Rust side. However, this will only break apart if you mess around with the worker script.

Furthermore, reading and writing must not happen at the same time because this can lead to undefined behaviour. For this, we will create a `Promise` that will only resolve once the web worker returns the result. Unless the `Promise` is not awaited, write and reads should be safe. The actual code of `MasonryWorker::compute` and `execute` can be found in `./src/masonry_worker.rs`.
