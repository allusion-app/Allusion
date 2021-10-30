use alloc::boxed::Box;
use core::sync::atomic::{AtomicI32, AtomicPtr, AtomicU32, Ordering};

use wasm_bindgen::{prelude::*, JsCast};

use crate::data::{Computation, MasonryType};

static MAIN_THREAD: AtomicI32 = AtomicI32::new(UNLOCKED);
static WORKER_THREAD: AtomicI32 = AtomicI32::new(LOCKED);
static INPUT: AtomicPtr<Computation> = AtomicPtr::new(core::ptr::null_mut());
static OUTPUT: AtomicU32 = AtomicU32::new(0);

const LOCKED: i32 = 0;
const UNLOCKED: i32 = 1;

/// Function to be called in the web worker thread to compute the new layout.
///
/// # Safety
///
/// Do not import this function as it is already imported into the web worker thread (see
/// `worker.js`).
#[wasm_bindgen]
pub fn compute() {
    loop {
        atomic_wait32(&WORKER_THREAD, LOCKED, -1);
        let computation_ptr = INPUT.load(Ordering::SeqCst);
        let container_height = {
            if computation_ptr.is_null() {
                0
            } else {
                // SAFETY: The send [`Computation`] is send from the main thread that created that this web
                // worker. On creation the same memory was used.
                let computation = unsafe { Box::from_raw(computation_ptr as *mut Computation) };
                execute(*computation)
            }
        };
        OUTPUT.store(container_height, Ordering::SeqCst);
        INPUT.store(core::ptr::null_mut(), Ordering::SeqCst);
        WORKER_THREAD.store(LOCKED, Ordering::SeqCst);
        MAIN_THREAD.store(UNLOCKED, Ordering::SeqCst);
        atomic_notify(&MAIN_THREAD, 1);
    }
}

/// Wakes up the web worker thread and "sends" data to receiver.
// I keep writing "send" because we're not sending anything but rather communicate with shared
// memory. As soon as the memory at index 0 becomes 1 the web worker thread will stop waiting
// (see [`create_web_worker`]);
pub fn send_computation(computation: Computation) -> js_sys::Promise {
    let computation = Box::into_raw(Box::new(computation));
    INPUT.store(computation, Ordering::SeqCst);
    MAIN_THREAD.store(LOCKED, Ordering::SeqCst);
    WORKER_THREAD.store(UNLOCKED, Ordering::SeqCst);
    atomic_notify(&WORKER_THREAD, 1);
    atomic_wait32_async(&MAIN_THREAD, LOCKED)
}

pub fn read_output() -> u32 {
    OUTPUT.load(Ordering::SeqCst)
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
