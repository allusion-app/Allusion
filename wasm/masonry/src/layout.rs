// Main idea of this package:
// - Take in a list of image dimensions, and a base thumbnail size (e.g. S, M, L)
// - Output a list of image positions, laid out in a masonry format
// TODO: Could also use the google photos layout: Groups of masonry layouts, each with a header (e.g. the date)
use crate::util::UnwrapOrAbort;
use alloc::{vec, vec::Vec};

pub struct Layout {
    num_items: usize,
    transforms: Vec<Transform>,
    dimensions: Vec<Dimension>,
    thumbnail_size: u16,
    padding: u16,
}

#[derive(Clone, Default)]
pub struct Transform {
    pub width: f32,
    pub height: f32,
    pub left: f32,
    pub top: f32,
}

#[derive(Clone, Default)]
struct Dimension {
    src_width: f32,
    src_height: f32,
    corrected_aspect_ratio: f32,
}

const MIN_ITEMS_CAPACITY: usize = 10_000;

impl Layout {
    pub fn new(length: usize, thumbnail_size: u16, padding: u16) -> Layout {
        let capacity = length.max(MIN_ITEMS_CAPACITY);
        Layout {
            num_items: length,
            transforms: vec![Transform::default(); capacity],
            dimensions: vec![Dimension::default(); capacity],
            thumbnail_size,
            padding,
        }
    }

    pub fn get_transform(&self, index: usize) -> &Transform {
        &self.transforms[index]
    }

    pub fn set_dimension(&mut self, index: usize, src_width: f32, src_height: f32) {
        self.dimensions[index].set(src_width, src_height);
    }

    pub fn set_thumbnail_size(&mut self, thumbnail_size: u16) {
        self.thumbnail_size = thumbnail_size;
    }

    pub fn set_padding(&mut self, padding: u16) {
        self.padding = padding;
    }

    pub fn resize(&mut self, new_len: usize) {
        self.num_items = new_len;
        let len = self.transforms.len();
        if new_len > len {
            let additional_capacity = new_len.saturating_sub(self.transforms.capacity());
            self.transforms.reserve(additional_capacity);
            self.dimensions.reserve(additional_capacity);
            for _ in len..self.transforms.capacity() {
                self.transforms.push(Transform::default());
                self.dimensions.push(Dimension::default());
            }
        }
    }

    // Main idea: Keep looping over images until containerWidth is reached, then:
    // - Either adjust row height or add/remove item to make it fit full-width, whatever is the closest
    // (I think this is how google photos does it)
    // Could also have an approximated version for very large lists, and just properly compute for what in and close to the viewport
    // TODO: Look up proper masonry algorithm, e.g. https://euler.stephan-brumme.com/215/
    // TODO: Alternatively, could layout based on aspect ratio blogpost https://medium.com/@danrschlosser/building-the-image-grid-from-google-photos-6a09e193c74a
    pub fn compute_horizontal(&mut self, container_width: u16) -> f32 {
        let container_width = f32::from(container_width);
        let transform_height = f32::from(self.thumbnail_size);
        let padding = f32::from(self.padding);

        let mut top_offset = 0.0;
        let mut cur_row_width = 0.0;
        let mut first_row_item_index: usize = 0;

        let num_items = self.num_items;
        assert!(self.transforms.len() >= num_items && self.dimensions.len() >= num_items);
        for i in 0..num_items {
            let transform = self.transforms.get_mut(i).unwrap_or_abort();
            // Correct aspect ratio for very wide/narrow images
            transform.height = transform_height;
            transform.correct_width(self.dimensions.get(i).unwrap_or_abort());
            transform.top = top_offset;
            transform.left = cur_row_width;

            // Check if adding this image to the row would exceed the container width
            let new_row_width = cur_row_width + transform.width;

            if new_row_width > container_width {
                // If it exceeds it, position all current items in the row accordingly and start a new row for this item
                // Position all items in this row properly after the row is filled, needs to expand a little

                // Now that the size of this row is definitive: Set the actual size of all row items
                // The horizontal padding should not be scaled: Should be an absolute value
                let num_items_in_row = (i - first_row_item_index + 1) as f32;
                let total_horizontal_padding = (num_items_in_row + 1.0) * padding;
                let correction_factor =
                    (container_width - total_horizontal_padding) / new_row_width;

                transform.scale(correction_factor);
                transform.left += (num_items_in_row - 1.0) * padding;

                let mut left = 0.0;
                for prev_item in self
                    .transforms
                    .get_mut(first_row_item_index..i)
                    .unwrap_or_abort()
                {
                    prev_item.scale(correction_factor);
                    prev_item.left += left;
                    left += padding;
                }

                // Start a new row
                cur_row_width = 0.0;
                first_row_item_index = i + 1;
                top_offset += padding + (transform_height * correction_factor).round();
            } else {
                // Otherwise, just add its width to the current row width and continue on!
                cur_row_width = new_row_width;
            }
        }
        // Return the height of the container: If a new row was just started, no need to add last item's height; already done in the loop
        if cur_row_width.trunc() == 0.0 {
            top_offset
        } else {
            match self.transforms.get(self.num_items - 1) {
                Some(last_item) => (top_offset + last_item.height),
                None => 0.0,
            }
        }
    }

    // Main idea: Initialize with N columns of identical widths
    // loop over images, put them in the column that has the least height filled
    pub fn compute_vertical(&mut self, container_width: u16) -> f32 {
        let (col_width, mut col_heights) = {
            let container_width = f32::from(container_width);
            let n_columns = (container_width / f32::from(self.thumbnail_size)).round();
            if n_columns == 0.0 {
                return 0.0;
            }
            let col_width = (container_width / n_columns).round();
            let col_heights: Vec<f32> = vec![0.0; n_columns as usize];
            (col_width, col_heights)
        };
        let padding = f32::from(self.padding);
        let item_width = col_width - padding;

        let num_items = self.num_items;
        assert!(self.transforms.len() >= num_items && self.dimensions.len() >= num_items);
        for i in 0..num_items {
            let transform = self.transforms.get_mut(i).unwrap_or_abort();
            transform.width = item_width;
            transform.correct_height(self.dimensions.get(i).unwrap_or_abort());

            let shortest_col_index = {
                let mut min_index = 0;
                let mut min_value = col_heights[0];
                for j in 1..col_heights.len() {
                    let val = col_heights[j];
                    if min_value > val {
                        min_value = val;
                        min_index = j;
                    }
                }
                min_index
            };

            transform.left = shortest_col_index as f32 * col_width;
            transform.top = col_heights[shortest_col_index];

            col_heights[shortest_col_index] += transform.height + padding;
        }

        // Return height of longest column
        let (mut max_height, col_heights) = col_heights.split_first_mut().unwrap_or_abort();
        for val in col_heights {
            if val > max_height {
                max_height = val;
            }
        }
        *max_height
    }

    // Simple Grid layout, replacement for the react-window dependency
    pub fn compute_grid(&mut self, container_width: u16) -> f32 {
        // Main idea: Put items in a grid.
        let (n_columns, column_width) = {
            let container_width = f32::from(container_width);
            let n_columns = (container_width / f32::from(self.thumbnail_size)).round();
            if n_columns == 0.0 {
                return 0.0;
            }
            let column_width = (container_width / n_columns).round();
            (n_columns as usize, column_width)
        };
        let item_size = column_width - f32::from(self.padding);
        let row_height = column_width;

        let (n_rows, rem, rows, rest) = {
            let len = self.transforms.len();
            let n_rows = len / n_columns;
            let rem = len % n_columns;
            let (rows, rest) = self.transforms.split_at_mut(len - rem);
            (n_rows, rem, rows, rest)
        };

        let mut top_offset = 0.0;
        let mut start = 0;
        let mut end = n_columns;
        let mut left;
        for _ in 0..n_rows {
            left = 0.0;
            for transform in rows.get_mut(start..end).unwrap_or_abort() {
                transform.width = item_size;
                transform.height = item_size;
                transform.left = left;
                transform.top = top_offset;
                left += column_width;
            }
            top_offset += row_height;
            start = end;
            end += n_columns;
        }

        left = 0.0;
        for transform in rest.iter_mut() {
            transform.width = item_size;
            transform.height = item_size;
            transform.left = left;
            transform.top = top_offset;
            left += column_width;
        }

        // If there are items in the last extra row, the height increases by one row
        if rem > 0 {
            top_offset += row_height;
        }

        // Return total height of the grid
        top_offset
    }
}

impl Transform {
    fn scale(&mut self, factor: f32) {
        self.left = (self.left * factor).round();
        self.width = (self.width * factor).round();
        self.height = (self.height * factor).round();
    }

    fn correct_height(&mut self, dimension: &Dimension) {
        let ratio = self.width / dimension.src_width;
        self.height = (ratio * dimension.corrected_aspect_ratio).round();
    }

    fn correct_width(&mut self, dimension: &Dimension) {
        let ratio = self.height / dimension.corrected_aspect_ratio;
        self.width = (ratio * dimension.src_width).round();
    }
}

impl Dimension {
    fn set(&mut self, src_width: f32, src_height: f32) {
        self.src_width = src_width;
        self.src_height = src_height;
        self.corrected_aspect_ratio = aspect_ratio_correction(src_width, src_height);
    }
}

// For images with extreme aspect ratios (very narrow or wide), crop them a little
// so that they are at most X times as wide/long as they are long/wide
// Returns a correct height value of the image
fn aspect_ratio_correction(w: f32, h: f32) -> f32 {
    const MAX_ASPECT_RATIO: f32 = 3.0; // X times as wide as narrow or vice versa

    let aspect_ratio = w / h;
    if aspect_ratio > MAX_ASPECT_RATIO {
        MAX_ASPECT_RATIO * h
    } else if aspect_ratio < 1. / MAX_ASPECT_RATIO {
        MAX_ASPECT_RATIO * w
    } else {
        h
    }
}
