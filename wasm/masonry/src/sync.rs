use alloc::boxed::Box;
use alloc::rc::Rc;
use core::sync::atomic::{AtomicPtr, AtomicU32, Ordering};

use wasm_bindgen::prelude::*;

pub struct Sender {
    has_changed: Rc<AtomicPtr<i32>>,
    data_ptr: Rc<AtomicU32>,
}

#[wasm_bindgen]
pub struct Receiver {
    has_changed: Rc<AtomicPtr<i32>>,
    data_ptr: Rc<AtomicU32>,
}

pub fn channel() -> (Sender, Receiver) {
    let receiver = Receiver {
        has_changed: Rc::new(AtomicPtr::new(Box::into_raw(Box::new(0)))),
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
        unsafe {
            let has_changed = self.has_changed.load(Ordering::Acquire);
            core::arch::wasm32::memory_atomic_wait32(has_changed, 0, -1);
            *has_changed = 0;
        }
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
        unsafe {
            let has_changed = self.has_changed.load(Ordering::Acquire);
            *has_changed = 1;
            core::arch::wasm32::memory_atomic_notify(has_changed, 1);
        }
    }
}
