use std::cell::RefCell;
use std::sync::Arc;

use crate::layout::{Layout, Transform};

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

type MessageEventHandler = Closure<dyn FnMut(web_sys::MessageEvent)>;

#[wasm_bindgen]
pub struct MasonryWorker {
    layout: Layout,
    worker: Arc<web_sys::Worker>,
    message_handler: Arc<RefCell<Option<MessageEventHandler>>>,
    notification: Notification,
    json_output: String,
}

struct Notification(js_sys::Int32Array);

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum MasonryType {
    Vertical,
    Horizontal,
    Grid,
}

struct MasonryConfig {
    kind: MasonryType,
    thumbnail_size: u16,
    padding: u16,
}

const MASONRY_CONFIG_DEFAULT: MasonryConfig = MasonryConfig {
    kind: MasonryType::Grid,
    thumbnail_size: 300,
    padding: 8,
};

struct Computation {
    width: u16,
    config: MasonryConfig,
    layout_ptr: *mut Layout,
}

#[wasm_bindgen]
impl MasonryWorker {
    #[wasm_bindgen(constructor)]
    /// Creates a new web worker from the path to `masonry.js` and `masonry_bg.wasm`.
    pub fn new(
        num_items: usize,
        module_path: &str,
        wasm_path: &str,
    ) -> Result<MasonryWorker, JsValue> {
        let manager = MasonryWorker {
            layout: Layout::new(
                num_items,
                MASONRY_CONFIG_DEFAULT.thumbnail_size,
                MASONRY_CONFIG_DEFAULT.padding,
            ),
            worker: Arc::new(create_web_worker(module_path, wasm_path)?),
            message_handler: Arc::new(RefCell::new(None)),
            notification: Notification::new(),
            json_output: String::new(),
        };

        // [Int32Array, WebAssembly.Memory]
        let initial_message = js_sys::Array::new();
        initial_message.push(manager.notification.as_ref());
        initial_message.push(&wasm_bindgen::memory());

        manager.worker.post_message(&initial_message)?;
        Ok(manager)
    }

    /// Computes the transforms of all items and returns the height of the container.
    ///
    /// # Safety
    ///
    /// The returned `Promise` must be `await`ed. Calls to any other method of [`MasonryWorker`]
    /// while the `Promise` is still pending can lead to undefined behaviour. As long as the value
    /// is `await`ed you can enjoy lock free concurrency.
    pub fn compute(
        &mut self,
        width: u16,
        kind: MasonryType,
        thumbnail_size: u16,
        padding: u16,
    ) -> js_sys::Promise {
        self.notification.set_data(Computation {
            width,
            config: MasonryConfig {
                kind,
                thumbnail_size,
                padding,
            },
            layout_ptr: &mut self.layout,
        });

        let worker = Arc::clone(&self.worker);
        let message_handler = Arc::clone(&self.message_handler);

        // We capture the resolve and reject functions from `Promise` constructor in our message
        // handler. When our event handler is invoked the control is resumed again.
        let mut callback = |resolve: js_sys::Function, reject: js_sys::Function| {
            let message_handler_clone = Arc::clone(&self.message_handler);
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

                    // SAFETY: I cannot think of a good reason why this should panic. If the `Promise`
                    // is not `await`ed and this method is called again, the closure would be dropped
                    // regardless which means this will never be called.
                    //
                    // On returning the result we want to free the memory of this Rust closure.
                    message_handler_clone.borrow_mut().take();
                },
            )));
            worker.set_onmessage(
                message_handler
                    .borrow()
                    .as_ref()
                    .map(|cb| cb.as_ref().unchecked_ref()),
            );
        };

        self.notification.send();
        js_sys::Promise::new(&mut callback)
    }

    /// Set the number of items that need to be computed.
    ///
    /// Memory is never deallocated which means that even if the new len is smaller than the current
    /// item count, it will not free the memory of previous items. This is done to avoid allocating
    /// a lot. Allocations can be vary in performance depending on the provided allocator. This
    /// makes no efforts and uses the standard library allocator.
    pub fn resize(&mut self, new_len: usize) {
        self.layout.resize(new_len)
    }

    /// Set the dimension of one item at the given index.
    ///
    /// You have to set the dimensions of the items if you want to compute a vertical or horizontal
    /// masonry layout. For grid layout this is not necessary.
    ///
    /// # Panics
    ///
    /// If the index is greater than number passed to [`MasonryWorker::resize()`], it will panic
    /// because of an out of bounds error.
    pub fn set_dimension(&mut self, index: usize, src_width: f32, src_height: f32) {
        self.layout.set_dimension(index, src_width, src_height)
    }

    /// Returns the transform of the item at the given index.
    ///
    /// The [`Transform`] object can be used to set the absolute position of an element.
    ///
    /// # Panics
    ///
    /// If the index is greater than number passed to [`MasonryWorker::resize()`], it will panic
    /// because of an out of bounds error.
    pub fn get_transform(&mut self, index: usize) -> Result<JsValue, JsValue> {
        let Transform {
            width,
            height,
            top,
            left,
        } = self.layout.get_transform(index);
        std::fmt::write(
            &mut self.json_output,
            format_args!(
                "{{\"width\":{},\"height\":{},\"top\":{},\"left\":{}}}",
                width, height, top, left
            ),
        )
        .map_err(|err| JsValue::from_str(&err.to_string()))?;
        // We could use serde but I do not think this added dependency is worth here.
        let json = js_sys::JSON::parse(&self.json_output)?;
        self.json_output.clear();
        Ok(json)
    }
}

impl Drop for MasonryWorker {
    fn drop(&mut self) {
        self.worker.terminate();
    }
}

impl Notification {
    fn new() -> Notification {
        /*
        Notification {
            has_changed: bool, // -> shared_memory[0]
            computation_ptr: *mut Computation // -> shared_memory[1]
        }
        */
        let shared_memory = js_sys::SharedArrayBuffer::new(2 * 4 as u32);
        Notification(js_sys::Int32Array::new(&shared_memory))
    }

    fn as_ref(&self) -> &JsValue {
        &self.0
    }

    /// Set up the computation task that will be "send" to the web worker thread.
    // We actually only "send" the pointer to the web worker. Since we share the memory, a pointer
    // in the web worker thread is the same as on the main thread. This is why [`execute`] is not
    // as unsafe as it looks at first.
    fn set_data(&self, computation: Computation) {
        let ptr = Box::into_raw(Box::new(computation));
        let r = js_sys::Atomics::store(&self.0, 1, ptr as i32);
        debug_assert!(
            r.is_ok(),
            "setting index 1 on typed array should never fail"
        );
    }

    /// Wakes up the web worker thread and "sends" a notification.
    // I keep writing "send" because we're not sending anything but rather communicate with shared
    // memory. As soon as the memory at index 0 becomes 1 the web worker thread will stop waiting
    // (see [`create_web_worker`]);
    fn send(&self) {
        let r = js_sys::Atomics::store(&self.0, 0, 1);
        debug_assert!(
            r.is_ok(),
            "setting index 0 on typed array should never fail"
        );
        let r = js_sys::Atomics::notify_with_count(&self.0, 0, 1);
        debug_assert!(r.is_ok(), "notifying agents on index 0 should never fail");
    }
}

/// Function to be called in the web worker thread to compute the new layout.
#[wasm_bindgen]
pub fn execute(computation_ptr: u32) -> Option<u32> {
    let (width, config, layout) = {
        // SAFETY: The send [`Computation`] is send from the main thread that created that this web
        // worker. On creation the same memory was used.
        let computation = unsafe { Box::from_raw(computation_ptr as *mut Computation) };
        // SAFETY: Never use std::ptr::read. The returned value will be an owned value, which means
        // its destructor will be run at the end of the function. This will lead to a double free.
        // Instead we only get a mutable reference and have to depend on the user to `await` every
        // `Promise` returned from `MasonryWorker::compute`.
        let layout = unsafe { computation.layout_ptr.as_mut()? };
        (computation.width, computation.config, layout)
    };
    layout.set_thumbnail_size(config.thumbnail_size);
    layout.set_padding(config.padding);

    Some(match config.kind {
        MasonryType::Vertical => layout.compute_vertical(width),
        MasonryType::Horizontal => layout.compute_horizontal(width),
        MasonryType::Grid => layout.compute_grid(width),
    })
}

fn create_web_worker(module_path: &str, wasm_path: &str) -> Result<web_sys::Worker, JsValue> {
    let worker_script = format!(
        "import {{ default as init, execute }} from '{module_path}';

        self.onmessage = async (event) => {{
            await init('{wasm_path}', event.data[1]);
            const message = event.data[0];
        
            while (true) {{
                Atomics.wait(message, 0, 0);
                self.postMessage(execute(Atomics.load(message, 1)));
                Atomics.store(message, 0, 0);
            }}
        }};",
        module_path = module_path,
        wasm_path = wasm_path
    );
    let sequence = js_sys::Array::new();
    sequence.push(&JsValue::from_str(&worker_script));
    let blob = web_sys::Blob::new_with_blob_sequence_and_options(
        &sequence,
        web_sys::BlobPropertyBag::new().type_("text/javascript"),
    )?;
    let url = web_sys::Url::create_object_url_with_blob(&blob)?;
    web_sys::Worker::new_with_options(&url, web_sys::WorkerOptions::new().type_("module"))
}

// Add missing implementation of type property.
trait WorkerOptionsExt {
    fn type_(&mut self, val: &str) -> &mut Self;
}

impl WorkerOptionsExt for web_sys::WorkerOptions {
    fn type_(&mut self, val: &str) -> &mut Self {
        let r = js_sys::Reflect::set(self.as_ref(), &JsValue::from("type"), &JsValue::from(val));
        debug_assert!(
            r.is_ok(),
            "setting properties should never fail on our dictionary objects"
        );
        self
    }
}
