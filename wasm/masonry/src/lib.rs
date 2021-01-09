// Loosely based on https://rustwasm.github.io/book/game-of-life/implementing.html

// Main idea of this package:
// - Take in a list of image dimensions, and a base thumbnail size (e.g. S, M, L)
// - Output a list of image positions, laid out in a masonry format

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("Hello, {}!", name));
}

// TODO: Could also use the google photos layout: Rows of masonry layouts, each with a header (e.g. the date)
#[wasm_bindgen]
#[derive(Clone)]
pub struct Transform {
    src_width: u16,
    src_height: u16,
    width: u16,
    height: u16,
    left: u16,
    top: u16,
}

#[wasm_bindgen]
pub struct Layout {
    items: Vec<Transform>,
    thumbnail_size: u32,
    padding: u32,
}

// For images with extreme aspect ratios (very narrow or wide), crop them a little
// so that they are at most X times as wide/long as they are long/wide
// Returns a correct height value of the image
fn aspect_ratio_correction(w: f32, h: f32) -> f32 {
    let max_aspect_ratio = 3.; // X times as wide as narrow or vice versa

    let aspect_ratio = w as f32 / h;
    if aspect_ratio > max_aspect_ratio {
        return max_aspect_ratio * h;
    } else if aspect_ratio < 1. / max_aspect_ratio {
        return max_aspect_ratio * w as f32;
    }
    return h;
}

/// Public methods, exported to JavaScript.
#[wasm_bindgen]
impl Layout {
    pub fn new(length: usize, thumbnail_size: u32, padding: u32) -> Layout {
        Layout {
            items: vec![
                Transform {
                    src_width: 0,
                    src_height: 0,
                    width: 0,
                    height: 0,
                    left: 0,
                    top: 0,
                };
                length
            ],
            thumbnail_size,
            padding,
        }
    }

    // Returns pointer to the item list
    pub fn items(&self) -> *const Transform {
        self.items.as_ptr()
    }

    pub fn set_item_input(&mut self, index: usize, width: u16, height: u16) {
        self.items[index].src_width = width;
        self.items[index].src_height = height;
    }

    pub fn set_thumbnail_size(&mut self, thumbnail_size: u32) {
        self.thumbnail_size = thumbnail_size;
    }

    pub fn set_padding(&mut self, padding: u32) {
        self.padding = padding;
    }

    pub fn compute_horizontal(&mut self, container_width: u32) -> i32 {
        // Main idea: Keep looping over images until containerWidth is reached, then:
        // - Either adjust row height or add/remove item to make it fit full-width, whatever is the closest
        // (I think this is how google photos does it)
        // Could also have an approximated version for very large lists, and just properly compute for what in and close to the viewport
        // TODO: Look up proper masonry algorithm, e.g. https://euler.stephan-brumme.com/215/

        let base_row_height = self.thumbnail_size as u16;

        let mut top_offset = 0;
        let mut cur_row_width = 0;
        let mut first_row_item_index = 0;

        for i in 0..self.items.len() {
            let item = &mut self.items[i];
            // Correct aspect ratio for very wide/narrow images
            let corr_height =
                aspect_ratio_correction(item.src_width as f32, item.src_height as f32);
            let rel_width = (base_row_height as f32 / corr_height as f32) * item.src_width as f32;
            item.width = rel_width as u16;
            item.top = top_offset as u16;
            item.height = base_row_height;

            item.left = cur_row_width as u16;
            // Check if adding this image to the row would exceed the container width
            let new_row_width = cur_row_width + rel_width as u32 + self.padding;

            if new_row_width > container_width {
                // If it exceeds it, position all current items in the row accordingly and start a new row for this item
                // Position all items in this row properly after the row is filled, needs to expand a little

                // Now that the size of this row is definitive: Set the actual size of all row items
                let correction_factor = container_width as f32 / new_row_width as f32;

                item.left = (item.left as f32 * correction_factor) as u16;
                item.width = (item.width as f32 * correction_factor) as u16;
                item.height = (item.height as f32 * correction_factor) as u16;

                for j in first_row_item_index..i {
                    let prev_item = &mut self.items[j];
                    prev_item.left = (prev_item.left as f32 * correction_factor) as u16;
                    prev_item.width = (prev_item.width as f32 * correction_factor) as u16;
                    prev_item.height = (prev_item.height as f32 * correction_factor) as u16;
                }

                // Start a new row
                cur_row_width = 0;
                first_row_item_index = i + 1;
                top_offset += self.padding + (base_row_height as f32 * correction_factor) as u32;
            } else {
                // Otherwise, just add its width to the current row width and continue on!
                cur_row_width = new_row_width;
            }
        }
        // Return the height of the container: If a new row was just started, no need to add last item's height; already done in the loop
        if cur_row_width != 0 {
            let last_item = self.items.last();
            return match last_item {
                Some(item) => top_offset as i32 + item.height as i32,
                None => top_offset as i32,
            };
        }
        top_offset as i32
    }

    pub fn compute_vertical(&mut self, container_width: u32) -> i32 {
        // Main idea: Initialize with N columns of identical widths
        // loop over images, put them in the column that has the least height filled

        let n_columns = (container_width as f32 / self.thumbnail_size as f32) as i32;
        if n_columns == 0 {
            return 0;
        }

        let col_width = (0.5 + (container_width as f32 / n_columns as f32)) as u16;

        let mut col_heights: Vec<i32> = vec![0; n_columns as usize];

        for item in self.items.iter_mut() {
            let h = aspect_ratio_correction(item.src_width as f32, item.src_height as f32);

            item.width = col_width - self.padding as u16;
            item.height = ((item.width as f32 / item.src_width as f32) * h as f32 + 0.5) as u16;

            let shortest_col_index = match index_of_min(&col_heights) {
                Some(index) => index,
                None => 0,
            };

            item.top = col_heights[shortest_col_index] as u16;
            item.left = (shortest_col_index as u16 * col_width) as u16;

            col_heights[shortest_col_index] += item.height as i32 + self.padding as i32;
        }

        // Return height of longest column
        match col_heights.iter().max() {
            Some(max) => *max,
            None => 0,
        }
    }

    // TODO: Could create our own Grid version as well: get rid of react-window
    // pub fn compute_grid(&mut self, container_width: u32, padding: u16) -> i32 {

    // }
}

// returns index of max value of the vector
fn index_of_max(values: &[i32]) -> Option<usize> {
    values
        .iter()
        .enumerate()
        .max_by_key(|(_idx, &val)| val)
        .map(|(idx, _val)| idx)
}

// returns index of min value of the vector
fn index_of_min(values: &[i32]) -> Option<usize> {
    values
        .iter()
        .enumerate()
        .min_by_key(|(_idx, &val)| val)
        .map(|(idx, _val)| idx)
}
