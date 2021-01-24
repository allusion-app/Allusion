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
fn aspect_ratio_correction(w: u16, h: u16) -> f32 {
    let max_aspect_ratio = 3.; // X times as wide as narrow or vice versa
    let w = f32::from(w);
    let h = f32::from(h);

    let aspect_ratio = w / h;
    if aspect_ratio > max_aspect_ratio {
        max_aspect_ratio * h
    } else if aspect_ratio < 1. / max_aspect_ratio {
        max_aspect_ratio * w
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

    pub fn compute_horizontal(&mut self, container_width: u16) -> u32 {
        // Main idea: Keep looping over images until containerWidth is reached, then:
        // - Either adjust row height or add/remove item to make it fit full-width, whatever is the closest
        // (I think this is how google photos does it)
        // Could also have an approximated version for very large lists, and just properly compute for what in and close to the viewport
        // TODO: Look up proper masonry algorithm, e.g. https://euler.stephan-brumme.com/215/
        // TODO: Alternatively, could layout based on aspect ratio blogpost https://medium.com/@danrschlosser/building-the-image-grid-from-google-photos-6a09e193c74a

        let base_row_height = self.thumbnail_size;

        let mut top_offset: u32 = 0;
        let mut cur_row_width: u16 = 0;
        let mut first_row_item_index: usize = 0;

        for i in 0..self.num_items {
            let item = &mut self.items[i];
            // Correct aspect ratio for very wide/narrow images
            let corr_height =
                aspect_ratio_correction(item.src_width, item.src_height);
            let rel_width = ((f32::from(base_row_height) / f32::from(corr_height)) * f32::from(item.src_width)).round() as u16;
            item.width = rel_width;
            item.height = base_row_height;
            self.top_offsets[i] = top_offset;

            item.left = cur_row_width;
            // Check if adding this image to the row would exceed the container width
            let new_row_width = cur_row_width + rel_width + self.padding;

            if new_row_width > container_width {
                // If it exceeds it, position all current items in the row accordingly and start a new row for this item
                // Position all items in this row properly after the row is filled, needs to expand a little

                // Now that the size of this row is definitive: Set the actual size of all row items
                let correction_factor = f32::from(container_width) / f32::from(new_row_width);

                item.left = (f32::from(item.left) * correction_factor).round() as u16;
                item.width = (f32::from(item.width) * correction_factor).round() as u16;
                item.height = (f32::from(item.height) * correction_factor).round() as u16;

                for j in first_row_item_index..i {
                    let prev_item = &mut self.items[j];
                    prev_item.left = (f32::from(prev_item.left) * correction_factor).round() as u16;
                    prev_item.width = (f32::from(prev_item.width) * correction_factor).round() as u16;
                    prev_item.height = (f32::from(prev_item.height) * correction_factor).round() as u16;
                }

                // Start a new row
                cur_row_width = 0;
                first_row_item_index = i + 1;
                top_offset += self.padding as u32 + (f32::from(base_row_height) * correction_factor).round() as u32;
            } else {
                // Otherwise, just add its width to the current row width and continue on!
                cur_row_width = new_row_width;
            }
        }
        // Return the height of the container: If a new row was just started, no need to add last item's height; already done in the loop
        if cur_row_width != 0 {
            if self.num_items == 0 {
                0
            } else {
                let last_item = &self.items[self.num_items - 1];
                top_offset + last_item.height as u32
            }
        } else {
            top_offset
        }
    }

    pub fn compute_vertical(&mut self, container_width: u16) -> u32 {
        // Main idea: Initialize with N columns of identical widths
        // loop over images, put them in the column that has the least height filled

        let n_columns = (f32::from(container_width) / f32::from(self.thumbnail_size)).round();
        if n_columns == 0.0 {
            return 0;
        }

        let col_width = (f32::from(container_width) / n_columns).round() as u16;

        let mut col_heights: Vec<u32> = vec![0; n_columns as usize];

        let (current_items, _) = &mut self.items.split_at_mut(self.num_items);
        for (i, item) in current_items.iter_mut().enumerate() {
            let h = aspect_ratio_correction(item.src_width, item.src_height);

            item.width = col_width - self.padding;
            item.height = ((f32::from(item.width) / f32::from(item.src_width)) * h).round() as u16;

            let shortest_col_index = col_heights
                .iter()
                .enumerate()
                .min_by_key(|(_idx, &val)| val)
                .map_or(0, |(idx, _val)| idx);

            item.left = (shortest_col_index as u16 * col_width) as u16;
            self.top_offsets[i] = col_heights[shortest_col_index] as u32;

            col_heights[shortest_col_index] += item.height as u32 + self.padding as u32;
        }

        // Return height of longest column
        col_heights
            .iter()
            .max()
            .map_or(0, |max| *max)
    }

    // TODO: Could create our own Grid version as well: get rid of react-window
    pub fn compute_grid(&mut self, container_width: u16) -> u32 {
        // Main idea: Put items in a grid.

        let n_columns = (f32::from(container_width) / f32::from(self.thumbnail_size)).round() as u16;
        if n_columns == 0 {
            return 0;
        }

        let cell_size = (f32::from(container_width) /f32::from(n_columns)).round() as u16;

        // The column where the current item should be inserted
        let mut cur_col = 0;
        let mut cur_row = 0;

        let (current_items, _) = &mut self.items.split_at_mut(self.num_items);
        for (i, item) in current_items.iter_mut().enumerate() {

            item.width = cell_size - self.padding;
            item.height = item.width;

            item.left = cur_col * cell_size;
            self.top_offsets[i] = cur_row * (cell_size + self.padding) as u32;

            if cur_col == n_columns - 1 {
                cur_col = 0;
                cur_row += 1;
            } else {
                cur_col += 1;
            }
        }

        // Return height of longest column
        cur_row * (cell_size + self.padding) as u32
    }
}
