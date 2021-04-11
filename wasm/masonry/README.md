# Masonry Layout

TLDR:

> `yarn build:wasm`

## Caveats

This only works with Chrome 80+ because we use modules in our web worker. It is possible with `importScript` which can be implemented if requested and added as build flag. Be aware that this will significantly bloat the WebAssembly file.

## Building

The default export `wasm-pack build` command doesn't play nicely with electron/webpack,
after some experimenting: `wasm-pack build --target web` does work!

I added a `build:wasm` script to `package.json` that you can run to compile the Rust code to WASM. The `.cargo/config.toml` and `rust-toolchain` file will be picked up by cargo and download the appropriate toolchain and re-compile the standard library to enable all features needed to use shared memory.

## Threading Model

The Rust standard library or any programming language standard library does not provide threads in the classical sense for WebAssembly and many lower level building blocks are still missing or unstable. Therefore, we will have to work around web workers which are very primitive but now that SharedArrayBuffer is stable (again), it has become easier.

We use the great `com-link` library to make working with web workers less of a headache. Getting and setting data from a web worker is asynchronously but this can be slow because messaging is done with serializing and deserialing objects. Overall, there is much more overhead from the added communication between threads. The added latency becomes problematic because scrolling, resizing and adding or reming images from a masonry layout should be a smooth experience.

To work around this, we send pointers to create typed arrays from the WebAssembly memory. This fixes the issue of having to wait for accessing data in constant time. Yet, it is actually very fragile and cumbersome. First of all, any heap allocation could invalidate the pointers, so we need to allocate one gigantic `Vec`. Second of all, we need to read the values from typed arrays which limits the used structures on the Rust side and in JavaScript this is really not fun.

However, with `SharedArrayBuffer`s being stable (again), we can use all kinds of (unstable) features. No extra copying, data access in constant time and as a cherry on top we will use `Promise`s like in `com-link` to send and receive data from our web worker. The next section will be an overview how things work under the hood.

### Messaging by Sharing Memory

On the main thread we initialize the WebAssembly module using the `init` function in `./pkg/masonry.js`. Afterwards, we create an instance of `MasonryWorker`.

The `MasonryWorker` constructor takes in as parameters the URLs to the `masonry.js` file and `masonry_bg.wasm` file. Those are needed to create a web worker inline using a `Blob` object (see `create_web_worker` in `src/masonry_worker` as reference).
There we make our first `Worker.postMessage` call to send the WebAssembly memory which will be then used in the `Worker.onmessage` callback to create the WebAssembly module.

However, we have now one big problem. If we just post another message, the WebAssembly cannot be stored inside the web worker script (for some bizarre reason it just doesn't work in Chrome) and by the time the second message comes, you will have no access to the memory anymore unless you send it on every message. This is not great since we want to execute our WebAssembly function in the message callback and compiling WebAssembly would take extra time.

A similar problem happens when you use MPSC or channels in general. If you just create a thread and send the a port to it, only one message will be received. Why? Because the port has processed the message and is not waiting (blocking the thread) anymore. To fix this you need to block again and this is usually done by using an infinite loop.

In our case we have no fancy channels but we have shared memory and `Atomics`! In our `MasonryWorker` we have a `Notification` struct wrapped around an `Int32Array` that is backed by a `SharedArrayBuffer`. This is send to the web worker with the WebAssembly memory on creation. We use `Atomics.wait` to block in the web worker thread and use `Atomics.notify` to wake up the web worker to process our tasks. In total, only one `Worker.postMessage` call is invoked which means the WebAssembly module will be kept alive. This is how it would look if it was implemented in JavaScript.

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

Right now the above code does not really do anything. We want to send our work to the web worker too but we only have a typed array. This limits the number of types we can send to basically 1 and using `Worker.postMessage` is not an option as outlined above. We can however, use the magic of pointers!

Since the used WebAssembly memory in both threads is the same, pointers to data on the Rust side will be the same even in the web worker. Dereferencing pointers is then mostly safe.

Furthermore, reading and writing must not happen at the same time because this can lead to undefined behaviour. For this, we will create a `Promise` that will only resolve once the web worker returns the result. Unless the `Promise` is not awaited, write and reads should be safe. The actual code of `MasonryWorker::compute` and `execute` can be found in `./src/masonry_worker.rs`. For this to work we capture the callback functions in the `Promise` constructor in a Rust closure and store the value. We must store the closure until it is called, otherwise it would be dropped immediately which means the `Promise` will never resolve.

```rs
let mut callback = |resolve: js_sys::Function, reject: js_sys::Function| {
    let message_handler_clone = Arc::clone(&self.message_handler);
    // On executing this closure resolve or reject the value. This make the program continue again.
    // In other words when `await`ing the `Promise` is finished.
    *message_handler.borrow_mut() = Some(Closure::wrap(Box::new(
        move |event: web_sys::MessageEvent| {
            let r = {
                // `execute` returns an `Option<u32>` which is mapped in JavaScript as `number | undefined`.
                let value = event.data();
                if value.is_undefined() {
                    reject.call0(&wasm_bindgen::JsValue::NULL)
                } else {
                    resolve.call1(&wasm_bindgen::JsValue::NULL, &value)
                }
            };
            debug_assert!(r.is_ok(), "calling resolve or reject should never fail");

            // On returning the result we want to free the memory of this Rust closure.
            message_handler_clone.borrow_mut().take();
        },
    )));

    // Set the callback
    worker.set_onmessage(
        message_handler
            .borrow()
            .as_ref()
            .map(|cb| cb.as_ref().unchecked_ref()),
    );
};
```

#### Rust Digression: Closures

Closures in Rust are a little bit special because they are syntactic sugar for structs. In the example, the Rust closures will compile down to structs that look roughly like this. Note that implementing the `Fn` traits manually does not work on stable and this is probably not the correct syntax anyway.

```rs
struct __OuterClousure_some_hash<'a> {
    worker: &'a Arc<web_sys::Worker>,
    message_handler: &'a Arc<RefCell<Option<MessageEventHandler>>>,
}

impl<'a> Fn<(js_sys::Function, js_sys::Function)> for __OuterClousure_some_hash<'a> {
    fn call(&self, resolve: js_sys::Function, reject: js_sys::Function) {
        let message_handler_clone = Arc::clone(&self.message_handler);

        // Contains owned values due to the `move` key word.
        struct __InnerClousure_some_hash {
            resolve: js_sys::Function,
            reject: js_sys::Function,
            message_handler_clone: Arc<RefCell<Option<MessageEventHandler>>>,
        }

        impl<'a> Fn<web_sys::MessageEvent> for __InnerClousure_some_hash {
            fn call(&self, event: web_sys::MessageEvent) {
                let r = {
                    let value = event.data();
                    if value.is_undefined() {
                        self.reject.call0(&wasm_bindgen::JsValue::NULL)
                    } else {
                        self.resolve.call1(&wasm_bindgen::JsValue::NULL, &value)
                    }
                };
                debug_assert!(r.is_ok(), "calling resolve or reject should never fail");

                // On returning the result we want to free the memory of this Rust closure.
                self.message_handler_clone.borrow_mut().take();
            }
        }

        *self.message_handler.borrow_mut() = Some(Closure::wrap(Box::new(__InnerClousure_some_hash {
            resolve,
            reject,
            message_handler_clone
        })));

        // Set the callback
        self.worker.set_onmessage(
            self.message_handler
                .borrow()
                .as_ref()
                .map(|cb| cb.as_ref().unchecked_ref()),
        );
    }
}
```
