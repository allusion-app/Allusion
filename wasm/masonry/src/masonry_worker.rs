use std::cell::RefCell;
use std::sync::Arc;

use crate::layout::Layout;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

#[wasm_bindgen]
pub struct MasonryWorker {
    layout: Layout,
    worker: Arc<web_sys::Worker>,
    message_handler: Arc<RefCell<Option<Closure<dyn FnMut(web_sys::MessageEvent)>>>>,
    message_data: MessageData,
}

struct MessageData(js_sys::Int32Array);

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
    pub fn new(num_items: usize, worker_url: &str) -> MasonryWorker {
        let manager = MasonryWorker {
            layout: Layout::new(
                num_items,
                MASONRY_CONFIG_DEFAULT.thumbnail_size,
                MASONRY_CONFIG_DEFAULT.padding,
            ),
            worker: Arc::new(web_sys::Worker::new(worker_url).unwrap()),
            message_handler: Arc::new(RefCell::new(None)),
            message_data: MessageData::new(),
        };
        let initial_message = js_sys::Array::new();
        initial_message.push(manager.message_data.as_ref());
        initial_message.push(&wasm_bindgen::memory());
        manager.worker.post_message(&initial_message).unwrap();
        manager
    }

    pub fn compute(
        &mut self,
        width: u16,
        kind: MasonryType,
        thumbnail_size: u16,
        padding: u16,
    ) -> js_sys::Promise {
        let message = Box::new(Computation {
            width,
            config: MasonryConfig {
                kind,
                thumbnail_size,
                padding,
            },
            layout_ptr: &mut self.layout,
        });
        let message_ptr = Box::into_raw(message);
        self.message_data.set_data(message_ptr);
        let worker = Arc::clone(&self.worker);
        let message_handler = Arc::clone(&self.message_handler);
        let mut callback = |resolve: js_sys::Function, _reject: js_sys::Function| {
            let message_handler_clone = Arc::clone(&self.message_handler);
            *message_handler.borrow_mut() = Some(Closure::wrap(Box::new(
                move |event: web_sys::MessageEvent| {
                    // Return result from web worker
                    resolve
                        .call1(&wasm_bindgen::JsValue::NULL, &event.data())
                        .unwrap();

                    // SAFETY: This will only ever panic if the returned Promise is not awaited and
                    // this method is called while the web worker is returning the data.
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
        self.message_data.notify_change();
        js_sys::Promise::new(&mut callback)
    }

    pub fn resize(&mut self, new_len: usize) {
        self.layout.resize(new_len)
    }

    pub fn set_dimension(&mut self, index: usize, src_width: u16, src_height: u16) {
        self.layout.set_dimension(index, src_width, src_height)
    }

    pub fn get_transform(&self, index: usize) -> JsValue {
        JsValue::from_serde(&self.layout.get_transform(index)).unwrap()
    }
}

impl Drop for MasonryWorker {
    fn drop(&mut self) {
        self.worker.terminate();
    }
}

impl MessageData {
    fn new() -> MessageData {
        let shared_memory = js_sys::SharedArrayBuffer::new(2 * std::mem::size_of::<i32>() as u32);
        MessageData(js_sys::Int32Array::new(&shared_memory))
    }

    fn as_ref(&self) -> &JsValue {
        &self.0
    }

    fn set_data(&self, computation_ptr: *const Computation) {
        self.0.set_index(1, computation_ptr as i32);
    }

    fn notify_change(&self) {
        self.0.set_index(0, 1);
        js_sys::Atomics::notify(&self.0, 0).unwrap();
    }
}

#[wasm_bindgen]
pub fn execute(message_ptr: u32) -> u32 {
    let (width, config, layout) = {
        // SAFETY: Messages are only created inside Rust memory and the pointer is created in
        // Rust memory too.
        let message = unsafe { Box::from_raw(message_ptr as *mut Computation) };
        let layout = unsafe { message.layout_ptr.as_mut().unwrap() };
        (message.width, message.config, layout)
    };
    layout.set_thumbnail_size(config.thumbnail_size);
    layout.set_padding(config.padding);

    match config.kind {
        MasonryType::Vertical => layout.compute_vertical(width),
        MasonryType::Horizontal => layout.compute_horizontal(width),
        MasonryType::Grid => layout.compute_grid(width),
    }
}
