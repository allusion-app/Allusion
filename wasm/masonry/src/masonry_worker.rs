use crate::data::{Computation, MasonryConfig, MasonryType};
use crate::layout::{Layout, Transform};
use crate::sync::{read_output, send_computation};

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct MasonryWorker {
    layout: Layout,
}

#[wasm_bindgen]
impl MasonryWorker {
    #[wasm_bindgen(constructor)]
    /// Creates a new web worker from the path to `masonry.js` and `masonry_bg.wasm`.
    pub fn new(num_items: usize) -> MasonryWorker {
        MasonryWorker {
            layout: Layout::new(
                num_items,
                MasonryConfig::DEFAULT.thumbnail_size,
                MasonryConfig::DEFAULT.padding,
            ),
        }
    }

    /// Computes the transforms of all items.
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
        send_computation(Computation::new(
            width,
            MasonryConfig::new(kind, thumbnail_size, padding),
            &mut self.layout,
        ))
    }

    /// Returns height of the container from the most recent computation.
    pub fn get_height(&self) -> u32 {
        read_output()
    }

    /// Set the number of items that need to be computed.
    ///
    /// Memory is never deallocated which means that even if the new len is smaller than the current
    /// item count, it will not free the memory of previous items. This is done to avoid allocating
    /// a lot. Allocations can be vary in performance depending on the provided allocator. This
    /// makes no efforts and uses the standard library allocator.
    pub fn resize(&mut self, new_len: usize) {
        self.layout.resize(new_len);
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
        self.layout.set_dimension(index, src_width, src_height);
    }

    /// Returns a pointer to the transform of the item at the given index.
    ///
    /// The [`Transform`] object can be used to set the absolute position of an element.
    ///
    /// # Panics
    ///
    /// If the index is greater than any number passed to [`MasonryWorker::resize()`], it will
    //// panic because of an out of bounds error.
    pub fn get_transform(&self, index: usize) -> *const Transform {
        self.layout.get_transform(index)
    }
}
