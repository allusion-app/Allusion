use alloc::boxed::Box;
use core::sync::atomic::{AtomicI32, AtomicU32, Ordering};

use wasm_bindgen::prelude::*;

use crate::data::{Computation, MasonryType};

static LOCK: AtomicI32 = AtomicI32::new(0);
static INPUT: AtomicU32 = AtomicU32::new(0); // computation: *mut Computation
static OUTPUT: AtomicU32 = AtomicU32::new(0); // container_height: u32

const LOCKED: i32 = 0;
const UNLOCKED: i32 = 1;

/// Function to be called in the web worker thread to compute the new layout.
///
/// # Safety
///
/// Do not import this function as it is already imported into the web worker thread (see
/// `create_web_worker`).
#[wasm_bindgen]
pub fn compute() {
    atomic_wait32(&LOCK, LOCKED, -1);
    let computation_ptr = INPUT.load(Ordering::Acquire);
    let container_height = execute(computation_ptr);
    OUTPUT.store(container_height, Ordering::Release);
    LOCK.store(LOCKED, Ordering::Release);
}

/// Wakes up the web worker thread and "sends" data to receiver.
// I keep writing "send" because we're not sending anything but rather communicate with shared
// memory. As soon as the memory at index 0 becomes 1 the web worker thread will stop waiting
// (see [`create_web_worker`]);
pub fn send_computation(computation: *mut Computation) {
    INPUT.store(computation as u32, Ordering::Release);
    LOCK.store(UNLOCKED, Ordering::Release);
    atomic_notify(&LOCK, 1);
}

pub fn read_result() -> JsValue {
    JsValue::from(OUTPUT.load(Ordering::Acquire))
}

fn execute(computation_ptr: u32) -> u32 {
    let (width, config, layout) = {
        // SAFETY: The send [`Computation`] is send from the main thread that created that this web
        // worker. On creation the same memory was used.
        let computation = unsafe { Box::from_raw(computation_ptr as *mut Computation) };
        // SAFETY: Never use core::ptr::read. The returned value will be an owned value, which means
        // its destructor will be run at the end of the function. This will lead to a double free.
        // Instead we only get a mutable reference and have to depend on the user to `await` every
        // `Promise` returned from `MasonryWorker::compute`.
        let layout = unsafe { computation.layout_ptr.as_mut() };
        match layout {
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
