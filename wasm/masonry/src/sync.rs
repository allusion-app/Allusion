//! Thread synchronization
//!
//! This whole module is akin to a channel (e.g. [`std::sync::mpsc::channel()`]). However, it uses
//! statics to avoid sending a receiver to the web worker. As it stands now, there is no nice
//! [`std::thread::spawn()`] abstraction and it probably won't be added any time.
//! ```
use core::{
    cell::Cell,
    sync::atomic::{AtomicI32, Ordering},
};

use wasm_bindgen::{prelude::*, JsCast};

use crate::data::{Computation, MasonryType};

static MAIN_THREAD: AtomicI32 = AtomicI32::new(UNLOCKED);
static WORKER_THREAD: AtomicI32 = AtomicI32::new(LOCKED);
static INPUT: Data<Option<Computation>> = Data::new(None);
static OUTPUT: Data<u32> = Data::new(0);

const LOCKED: i32 = 0;
const UNLOCKED: i32 = 1;

/// Function to be called in the web worker thread to compute the new layout.
///
/// # Safety
///
/// Do not import this function as it is already imported into the web worker thread (see
/// `worker.js`).
#[wasm_bindgen]
pub fn run() {
    loop {
        atomic_wait32(&WORKER_THREAD, LOCKED, -1);
        if let Some(computation) = INPUT.replace(None) {
            OUTPUT.set(execute(computation));
        }
        // Put the worker thread back to sleep and notify the main thread that work is finished.
        WORKER_THREAD.store(LOCKED, Ordering::SeqCst);
        MAIN_THREAD.store(UNLOCKED, Ordering::SeqCst);
        atomic_notify(&MAIN_THREAD, 1);
    }
}

/// Wakes up the web worker thread and "sends" data to receiver.
pub fn send_computation(computation: Computation) -> js_sys::Promise {
    INPUT.set(Some(computation));
    // Wake up the worker thread and make the main thread wait for the worker thread.
    MAIN_THREAD.store(LOCKED, Ordering::SeqCst);
    WORKER_THREAD.store(UNLOCKED, Ordering::SeqCst);
    atomic_notify(&WORKER_THREAD, 1);
    atomic_wait32_async(&MAIN_THREAD, LOCKED)
}

pub fn receive_output() -> u32 {
    OUTPUT.get()
}

fn execute(computation: Computation) -> u32 {
    let (width, config, layout) = {
        // SAFETY: Never use core::ptr::read. The returned value will be an owned value, which means
        // its destructor will be run at the end of the function. This will lead to a double free.
        // Instead we only get a mutable reference and have to depend on the user to `await` every
        // `Promise` returned from `MasonryWorker::compute`.
        match unsafe { computation.layout_ptr.as_mut() } {
            Some(layout) => (computation.width, computation.config, layout),
            None => return 0,
        }
    };
    layout.set_thumbnail_size(config.thumbnail_size);
    layout.set_padding(config.padding);

    match config.kind {
        MasonryType::Vertical => layout.compute_vertical(width),
        MasonryType::Horizontal => layout.compute_horizontal(width),
        MasonryType::Grid => layout.compute_grid(width),
    }
}

fn atomic_wait32(atomic: &AtomicI32, expression: i32, timeout_ns: i64) -> i32 {
    unsafe { core::arch::wasm32::memory_atomic_wait32(atomic.as_mut_ptr(), expression, timeout_ns) }
}

fn atomic_notify(atomic: &AtomicI32, waiters: u32) -> u32 {
    unsafe { core::arch::wasm32::memory_atomic_notify(atomic.as_mut_ptr(), waiters) }
}

fn atomic_wait32_async(atomic: &AtomicI32, expression: i32) -> js_sys::Promise {
    #[wasm_bindgen]
    extern "C" {
        type Atomics;
        type WaitAsyncResult;

        #[wasm_bindgen(static_method_of = Atomics, js_name = waitAsync)]
        fn wait_async(buf: &js_sys::Int32Array, index: i32, value: i32) -> WaitAsyncResult;

        #[wasm_bindgen(method, getter, structural, js_name = async)]
        fn async_(this: &WaitAsyncResult) -> bool;

        #[wasm_bindgen(method, getter, structural)]
        fn value(this: &WaitAsyncResult) -> js_sys::Promise;
    }

    let memory = wasm_bindgen::memory().unchecked_into::<js_sys::WebAssembly::Memory>();
    let array =
        js_sys::Int32Array::new_with_byte_offset(&memory.buffer(), atomic.as_mut_ptr() as u32);
    let result = Atomics::wait_async(&array, 0, expression);
    if result.async_() {
        result.value()
    } else {
        js_sys::Promise::resolve(&result.value())
    }
}

/// Wrapper around `Cell` to make it possible to use in statics.
struct Data<T>(Cell<T>);

impl<T> Data<T> {
    const fn new(value: T) -> Data<T> {
        Data(Cell::new(value))
    }

    fn set(&self, value: T) {
        self.0.set(value);
    }

    fn replace(&self, value: T) -> T {
        self.0.replace(value)
    }
}

impl<T: Copy> Data<T> {
    fn get(&self) -> T {
        self.0.get()
    }
}

/// Static values need to be sync.
unsafe impl<T> Sync for Data<T> {}
