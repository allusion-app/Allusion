use alloc::boxed::Box;
use alloc::rc::Rc;
use core::sync::atomic::{AtomicI32, AtomicU32, Ordering};

use wasm_bindgen::prelude::*;

pub struct Sender {
    has_changed: Rc<AtomicI32>,
    data_ptr: Rc<AtomicU32>,
}

#[wasm_bindgen]
pub struct Receiver {
    has_changed: Rc<AtomicI32>,
    data_ptr: Rc<AtomicU32>,
}

pub fn channel() -> (Sender, Receiver) {
    let receiver = Receiver {
        has_changed: Rc::new(AtomicI32::new(0)),
        data_ptr: Rc::new(AtomicU32::new(0)),
    };
    let sender = Sender {
        has_changed: Rc::clone(&receiver.has_changed),
        data_ptr: Rc::clone(&receiver.data_ptr),
    };
    (sender, receiver)
}

impl Receiver {
    pub(crate) fn into_ptr(self) -> *mut Receiver {
        Box::into_raw(Box::new(self))
    }
}

#[wasm_bindgen]
impl Receiver {
    pub fn from_ptr(ptr: *mut Receiver) -> Receiver {
        unsafe { *Box::from_raw(ptr) }
    }

    pub fn receive(&self) -> u32 {
        atomic_wait32(self.has_changed.as_mut_ptr(), 0, -1);
        self.has_changed.store(0, Ordering::Release);
        self.data_ptr.load(Ordering::Acquire)
    }
}

impl Sender {
    /// Wakes up the web worker thread and "sends" data to receiver.
    // I keep writing "send" because we're not sending anything but rather communicate with shared
    // memory. As soon as the memory at index 0 becomes 1 the web worker thread will stop waiting
    // (see [`create_web_worker`]);
    pub fn send(&self, ptr: u32) {
        self.data_ptr.store(ptr, Ordering::Release);
        self.has_changed.store(1, Ordering::Release);
        atomic_notify(self.has_changed.as_mut_ptr(), 1);
    }

    pub fn clone(other: &Self) -> Self {
        Sender {
            has_changed: Rc::clone(&other.has_changed),
            data_ptr: Rc::clone(&other.data_ptr),
        }
    }
}

fn atomic_wait32(ptr: *mut i32, expression: i32, timeout_ns: i64) -> i32 {
    unsafe {
        core::arch::wasm32::memory_atomic_wait32(
            (ptr as i32 / 4) as *mut i32,
            expression,
            timeout_ns,
        )
    }
}

fn atomic_notify(ptr: *mut i32, waiters: u32) -> u32 {
    unsafe { core::arch::wasm32::memory_atomic_notify((ptr as i32 / 4) as *mut i32, waiters) }
}
