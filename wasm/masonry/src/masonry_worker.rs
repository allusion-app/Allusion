use alloc::boxed::Box;
use alloc::format;
use alloc::string::String;

use crate::data::{Computation, MasonryConfig, MasonryType};
use crate::layout::{Layout, Transform};
use crate::sync::send_computation;
use crate::util::UnwrapOrAbort;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

#[wasm_bindgen]
pub struct MasonryWorker {
    layout: Layout,
    worker: web_sys::Worker,
    json_output: String,
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
        Ok(MasonryWorker {
            layout: Layout::new(
                num_items,
                MasonryConfig::DEFAULT.thumbnail_size,
                MasonryConfig::DEFAULT.padding,
            ),
            worker: create_web_worker(module_path, wasm_path)?,
            json_output: String::new(),
        })
    }

    /// Initializes the web worker, so it can handle future computations.
    ///
    /// # Safety
    ///
    /// Calling this function more than once on an instance will immediately panic. It is
    /// important to `await` the `Promise`, otherwise the first computation will be skipped.
    // This method is necessary because calling [`Sender.send()`] is actually faster than creating
    // the web worker and compiling the WebAssembly inside of it. We have to wait until the
    // WebAssembly module is compiled, so a `Receiver` instance can be created.
    pub fn init(&mut self) -> Result<js_sys::Promise, JsValue> {
        // [u32, WebAssembly.Memory]
        let initial_message = js_sys::Array::of1(&wasm_bindgen::memory());
        Ok(js_sys::Promise::new(
            &mut |resolve: js_sys::Function, _reject: js_sys::Function| {
                self.worker.set_onmessage(Some(
                    Closure::once_into_js(move |_event: web_sys::MessageEvent| {
                        let r = resolve.call0(&wasm_bindgen::JsValue::NULL);
                        debug_assert!(r.is_ok(), "calling resolve should never fail");
                    })
                    .unchecked_ref(),
                ));
                let r = self.worker.post_message(&initial_message);
                debug_assert!(r.is_ok(), "calling Worker.postMessage should never fail");
            },
        ))
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
        let computation = Box::into_raw(Box::new(Computation::new(
            width,
            MasonryConfig::new(kind, thumbnail_size, padding),
            &mut self.layout,
        )));
        js_sys::Promise::new(
            &mut |resolve: js_sys::Function, _reject: js_sys::Function| {
                self.worker.set_onmessage(Some(
                    Closure::once_into_js(move |event: web_sys::MessageEvent| {
                        let r = resolve.call1(&wasm_bindgen::JsValue::NULL, &event.data());
                        debug_assert!(r.is_ok(), "calling resolve should never fail");
                    })
                    .unchecked_ref(),
                ));
                send_computation(computation);
            },
        )
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
    /// If the index is greater than any number passed to [`MasonryWorker::resize()`], it will
    //// panic because of an out of bounds error.
    pub fn set_dimension(&mut self, index: usize, src_width: u16, src_height: u16) {
        self.layout.set_dimension(index, src_width, src_height)
    }

    /// Returns the transform of the item at the given index.
    ///
    /// The [`Transform`] object can be used to set the absolute position of an element.
    ///
    /// # Panics
    ///
    /// If the index is greater than any number passed to [`MasonryWorker::resize()`], it will
    //// panic because of an out of bounds error.
    pub fn get_transform(&mut self, index: usize) -> JsValue {
        let Transform {
            width,
            height,
            top,
            left,
        } = self.layout.get_transform(index);
        core::fmt::write(
            &mut self.json_output,
            format_args!(
                "{{\"width\":{},\"height\":{},\"top\":{},\"left\":{}}}",
                width, height, top, left
            ),
        )
        .unwrap_or_abort();
        // We could use serde but I do not think this added dependency is worth here.
        let json = js_sys::JSON::parse(&self.json_output).unwrap_or_abort();
        self.json_output.clear();
        json
    }
}

impl Drop for MasonryWorker {
    fn drop(&mut self) {
        self.worker.terminate();
    }
}

fn create_web_worker(module_path: &str, wasm_path: &str) -> Result<web_sys::Worker, JsValue> {
    let worker_script = format!(
        "import {{ default as init, compute }} from '{module_path}';\
        self.onmessage = async (event) => {{\
            await init('{wasm_path}', event.data[0]);\
            self.postMessage(null);\
            while (true) {{\
                self.postMessage(compute());\
            }}\
        }};",
        module_path = module_path,
        wasm_path = wasm_path
    );
    let blob = web_sys::Blob::new_with_blob_sequence_and_options(
        &js_sys::Array::of1(&JsValue::from_str(&worker_script)),
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
