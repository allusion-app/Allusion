// Loosely based on https://rustwasm.github.io/book/game-of-life/implementing.html

// Main idea of this package:
// - Take in a list of image dimensions, and a base thumbnail size (e.g. S, M, L)
// - Output a list of image positions, laid out in a masonry format

use wasm_bindgen::prelude::*;

// TODO: Could also use the google photos layout: Groups of masonry layouts, each with a header (e.g. the date)
#[wasm_bindgen]
#[derive(Clone)]
pub struct Transform {
    src_width: u16,
    src_height: u16,
    width: u16,
    height: u16,
    left: u16,
}

impl Transform {
    fn scale(&mut self, factor: f32) {
        self.left = (f32::from(self.left) * factor).round() as u16;
        self.width = (f32::from(self.width) * factor).round() as u16;
        self.height = (f32::from(self.height) * factor).round() as u16;
    }

    fn correct_height(&mut self) {
        let src_width = f32::from(self.src_width);
        let src_height = f32::from(self.src_height);

        let aspect_ratio = aspect_ratio_correction(src_width, src_height);
        let ratio = f32::from(self.width) / src_width;

        self.height = (ratio * aspect_ratio).round() as u16;
    }

    fn correct_width(&mut self) {
        let src_width = f32::from(self.src_width);
        let src_height = f32::from(self.src_height);

        let aspect_ratio = aspect_ratio_correction(src_width, src_height);
        let ratio = f32::from(self.height) / aspect_ratio;

        self.width = (ratio * src_width).round() as u16;
    }
}

#[wasm_bindgen]
pub struct Layout {
    num_items: usize,
    items: Vec<Transform>,
    // TODO: Could maybe interwine u32 top offset in other u16 attributes for avoiding cache misses but this is already too much micro optimization
    top_offsets: Vec<u32>,
    thumbnail_size: u16,
    padding: u16,
}

// For images with extreme aspect ratios (very narrow or wide), crop them a little
// so that they are at most X times as wide/long as they are long/wide
// Returns a correct height value of the image
fn aspect_ratio_correction(w: f32, h: f32) -> f32 {
    let aspect_ratio = w / h;
    if aspect_ratio > MAX_ASPECT_RATIO {
        MAX_ASPECT_RATIO * h
    } else if aspect_ratio < 1. / MAX_ASPECT_RATIO {
        MAX_ASPECT_RATIO * w
    } else {
        h
    }
}

const MAX_ITEMS: usize = 200000; // Reserving 200.000 uint16s of memory for the image layouts,
                                 // so we don't have to re-allocate memory when images are removed/added.
                                 // each image items takes up 5 uin16s, so max items = 200.000 / 5 = 40.000
                                 // That was my initial approach, but re-transferring the WASM memory from the
                                 // web-worker to the main thread after freeing the memory caused issues:
                                 // "ArrayBuffer at index 0 is already detached"

const MAX_ASPECT_RATIO: f32 = 3.0; // X times as wide as narrow or vice versa

/// Public methods, exported to JavaScript.
#[wasm_bindgen]
impl Layout {
    pub fn new(length: usize, thumbnail_size: u16, padding: u16) -> Layout {
        Layout {
            num_items: length,
            items: vec![
                Transform {
                    src_width: 0,
                    src_height: 0,
                    width: 0,
                    height: 0,
                    left: 0,
                };
                MAX_ITEMS
            ],
            top_offsets: vec![0; MAX_ITEMS],
            thumbnail_size,
            padding,
        }
    }

    pub fn resize(&mut self, new_len: usize) {
        self.num_items = new_len;
    }

    // Returns pointer to the item list
    pub fn items(&self) -> *const Transform {
        self.items.as_ptr()
    }

    // Returns pointer to the item list
    pub fn top_offsets(&self) -> *const u32 {
        self.top_offsets.as_ptr()
    }

    pub fn set_thumbnail_size(&mut self, thumbnail_size: u16) {
        self.thumbnail_size = thumbnail_size;
    }

    pub fn set_padding(&mut self, padding: u16) {
        self.padding = padding;
    }

    // Main idea: Keep looping over images until containerWidth is reached, then:
    // - Either adjust row height or add/remove item to make it fit full-width, whatever is the closest
    // (I think this is how google photos does it)
    // Could also have an approximated version for very large lists, and just properly compute for what in and close to the viewport
    // TODO: Look up proper masonry algorithm, e.g. https://euler.stephan-brumme.com/215/
    // TODO: Alternatively, could layout based on aspect ratio blogpost https://medium.com/@danrschlosser/building-the-image-grid-from-google-photos-6a09e193c74a
    pub fn compute_horizontal(&mut self, container_width: u16) -> u32 {
        let item_height = self.thumbnail_size;

        let mut top_offset: u32 = 0;
        let mut cur_row_width: u16 = 0;
        let mut first_row_item_index: usize = 0;

        for i in 0..self.num_items {
            let item = &mut self.items[i];
            // Correct aspect ratio for very wide/narrow images
            item.height = item_height;
            item.correct_width();
            self.top_offsets[i] = top_offset;

            item.left = cur_row_width;
            // Check if adding this image to the row would exceed the container width
            let new_row_width = cur_row_width + item.width + self.padding;

            if new_row_width > container_width {
                // If it exceeds it, position all current items in the row accordingly and start a new row for this item
                // Position all items in this row properly after the row is filled, needs to expand a little

                // Now that the size of this row is definitive: Set the actual size of all row items
                let correction_factor = f32::from(container_width) / f32::from(new_row_width);

                item.scale(correction_factor);

                for prev_item in self.items[first_row_item_index..i].iter_mut() {
                    prev_item.scale(correction_factor)
                }

                // Start a new row
                cur_row_width = 0;
                first_row_item_index = i + 1;
                top_offset += u32::from(self.padding)
                    + (f32::from(item_height) * correction_factor).round() as u32;
            } else {
                // Otherwise, just add its width to the current row width and continue on!
                cur_row_width = new_row_width;
            }
        }
        // Return the height of the container: If a new row was just started, no need to add last item's height; already done in the loop
        if cur_row_width != 0 {
            match self.items.get(self.num_items - 1) {
                Some(last_item) => top_offset + last_item.height as u32,
                None => 0,
            }
        } else {
            top_offset
        }
    }

    // Main idea: Initialize with N columns of identical widths
    // loop over images, put them in the column that has the least height filled
    pub fn compute_vertical(&mut self, container_width: u16) -> u32 {
        let (col_width, mut col_heights) = {
            let container_width = f32::from(container_width);
            let n_columns = (container_width / f32::from(self.thumbnail_size)).round();
            if n_columns == 0.0 {
                return 0;
            }

            let col_width = (container_width / n_columns).round() as u16;
            let col_heights: Vec<u32> = vec![0; n_columns as usize];
            (col_width, col_heights)
        };
        let item_width = col_width - self.padding;

        let (current_items, _) = self.items.split_at_mut(self.num_items);
        for (item, top_offset) in current_items.iter_mut().zip(self.top_offsets.iter_mut()) {
            item.width = item_width;
            item.correct_height();

            let shortest_col_index = col_heights
                .iter()
                .enumerate()
                .min_by_key(|(_idx, &val)| val)
                .map_or(0, |(idx, _val)| idx);

            item.left = shortest_col_index as u16 * col_width;
            *top_offset = col_heights[shortest_col_index];

            col_heights[shortest_col_index] += u32::from(item.height) + u32::from(self.padding);
        }

        // Return height of longest column
        col_heights.iter().max().map_or(0, |max| *max)
    }

    // Simple Grid layout, replacement for the react-window dependency
    pub fn compute_grid(&mut self, container_width: u16) -> u32 {
        // Main idea: Put items in a grid.
        let (n_columns, column_width) = {
            let container_width = f32::from(container_width);
            let n_columns = (container_width / f32::from(self.thumbnail_size)).round();
            if n_columns == 0.0 {
                return 0;
            }
            let column_width = (container_width / n_columns).round();
            (n_columns as u16, column_width as u16)
        };
        let n_rows = self.num_items / usize::from(n_columns);
        let rest = self.num_items % usize::from(n_columns);
        let item_size = column_width - self.padding;
        let row_height = u32::from(column_width);

        let (current_items, _) = self.items.split_at_mut(self.num_items);

        let mut index = 0;
        let mut top_offset = 0;
        let mut left;
        for _ in 0..n_rows {
            left = 0;
            for _ in 0..n_columns {
                let item = &mut current_items[index];
                item.width = item_size;
                item.height = item_size;
                item.left = left;
                self.top_offsets[index] = top_offset;

                index += 1;
                left += column_width;
            }
            top_offset += row_height;
        }

        left = 0;
        for _ in 0..rest {
            let item = &mut current_items[index];
            item.width = item_size;
            item.height = item_size;
            item.left = left;
            self.top_offsets[index] = top_offset;

            index += 1;
            left += column_width;
        }

        // If there are items in the last extra row, the height increases by one row
        if rest > 0 {
            top_offset += row_height;
        }

        // Return total height of the grid
        top_offset
    }
}
