use wasm_bindgen::prelude::*;

use crate::layout::Layout;

pub struct Computation {
    pub width: u16,
    pub config: MasonryConfig,
    pub layout_ptr: *mut Layout,
}

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum MasonryType {
    Vertical,
    Horizontal,
    Grid,
}

pub struct MasonryConfig {
    pub kind: MasonryType,
    pub thumbnail_size: u16,
    pub padding: u16,
}

impl MasonryConfig {
    pub const DEFAULT_THUMBNAIL_SIZE: u16 = 300;
    pub const DEFAULT_PADDING: u16 = 8;

    pub fn new(kind: MasonryType, thumbnail_size: u16, padding: u16) -> MasonryConfig {
        MasonryConfig {
            kind,
            thumbnail_size,
            padding,
        }
    }
}

impl Computation {
    pub fn new(width: u16, config: MasonryConfig, layout: &mut Layout) -> Computation {
        Computation {
            width,
            config,
            layout_ptr: layout as _,
        }
    }
}
