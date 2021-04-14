// Main idea of this package:
// - Take in a list of image dimensions, and a base thumbnail size (e.g. S, M, L)
// - Output a list of image positions, laid out in a masonry format
// TODO: Could also use the google photos layout: Groups of masonry layouts, each with a header (e.g. the date)
use crate::util::UnwrapOrAbort;
use alloc::collections::BinaryHeap;
use alloc::{vec, vec::Vec};
use core::cmp::Ordering;

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
    corrected_aspect_ratio: f32,
}

const MIN_ITEMS_CAPACITY: usize = 1_000;

impl Layout {
    pub fn new(num_items: usize, thumbnail_size: u16, padding: u16) -> Layout {
        let capacity = num_items.max(MIN_ITEMS_CAPACITY);
        Layout {
            num_items,
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
            self.transforms
                .reserve(new_len.saturating_sub(self.transforms.capacity()));
            self.dimensions
                .reserve(new_len.saturating_sub(self.dimensions.capacity()));
            for _ in len..new_len {
                self.transforms.push(Transform::default());
                self.dimensions.push(Dimension::default());
            }
        }
        assert!(self.transforms.len() >= self.num_items && self.dimensions.len() >= self.num_items);
    }

    // Main idea: Keep looping over images until containerWidth is reached, then:
    // - Either adjust row height or add/remove item to make it fit full-width, whatever is the closest
    // (I think this is how google photos does it)
    // Could also have an approximated version for very large lists, and just properly compute for what in and close to the viewport
    // TODO: Look up proper masonry algorithm, e.g. https://euler.stephan-brumme.com/215/
    // TODO: Alternatively, could layout based on aspect ratio blogpost https://medium.com/@danrschlosser/building-the-image-grid-from-google-photos-6a09e193c74a
    pub fn compute_horizontal(&mut self, container_width: u16) -> f32 {
        if self.is_empty() || self.thumbnail_size == 0 {
            return 0.0;
        }

        let container_width = f32::from(container_width);
        let transform_height = f32::from(self.thumbnail_size);
        let padding = f32::from(self.padding);

        let mut top_offset = 0.0;
        let mut cur_row_width = 0.0;
        let mut first_row_item_index: usize = 0;

        for i in 0..self.len() {
            let transform = &mut self.transforms[i];
            // Correct aspect ratio for very wide/narrow images
            transform.height = transform_height;
            transform.correct_width(&self.dimensions[i]);
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
            match self.transforms.get(self.len() - 1) {
                Some(last_item) => (top_offset + last_item.height),
                None => 0.0,
            }
        }
    }

    // Main idea: Initialize with N columns of identical widths
    // loop over images, put them in the column that has the least height filled
    pub fn compute_vertical(&mut self, container_width: u16) -> f32 {
        #[derive(PartialEq)]
        struct Column {
            index: u16,
            height: f32,
        }

        impl Eq for Column {
            fn assert_receiver_is_total_eq(&self) {}
        }

        impl PartialOrd for Column {
            fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
                Some(self.cmp(other))
            }
        }

        // The priority queue depends on `Ord`.
        // Explicitly implement the trait so the queue becomes a min-heap instead of a max-heap.
        impl Ord for Column {
            fn cmp(&self, other: &Self) -> Ordering {
                match other.height.partial_cmp(&self.height) {
                    Some(Ordering::Equal) | None => other.index.cmp(&self.index),
                    Some(ordering) => ordering,
                }
            }
        }

        if self.is_empty() || self.thumbnail_size == 0 {
            return 0.0;
        }

        let (col_width, mut columns) = {
            let container_width = container_width.max(self.thumbnail_size);
            let n_columns = round_div(container_width, self.thumbnail_size);
            let col_width = round_div(container_width, n_columns);
            let mut columns = Vec::with_capacity(usize::from(n_columns));
            for index in 0..n_columns {
                columns.push(Column { index, height: 0.0 });
            }
            (f32::from(col_width), BinaryHeap::from(columns))
        };
        let padding = f32::from(self.padding);
        let item_width = col_width - padding;

        for i in 0..self.len() {
            let transform = &mut self.transforms[i];
            transform.width = item_width;
            transform.correct_height(&self.dimensions[i]);

            let mut column = columns.peek_mut().unwrap_or_abort();
            transform.left = f32::from(column.index) * col_width;
            transform.top = column.height;
            column.height += transform.height + padding;
        }

        let binary_heap = columns.into_vec();
        let (_, leaf_nodes) = binary_heap.split_at(binary_heap.len() / 2);
        let mut longest_column_height = 0.0;
        for &Column { height, .. } in leaf_nodes {
            if height > longest_column_height {
                longest_column_height = height;
            }
        }
        longest_column_height
    }

    // Simple Grid layout, replacement for the react-window dependency
    pub fn compute_grid(&mut self, container_width: u16) -> f32 {
        if self.is_empty() || self.thumbnail_size == 0 {
            return 0.0;
        }

        // Main idea: Put items in a grid.
        let (n_columns, column_width) = {
            let container_width = container_width.max(self.thumbnail_size);
            let n_columns = round_div(container_width, self.thumbnail_size);
            let column_width = round_div(container_width, n_columns);
            (usize::from(n_columns), column_width)
        };
        let item_size = f32::from(column_width - self.padding);
        let column_width = f32::from(column_width);
        let row_height = column_width;

        let (n_rows, rem, rows, rest) = {
            let len = self.len();
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

impl Layout {
    fn is_empty(&self) -> bool {
        self.num_items == 0
    }

    fn len(&self) -> usize {
        self.num_items
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

fn round_div(numerator: u16, denominator: u16) -> u16 {
    assert!(denominator > 0);
    (numerator + (denominator / 2)) / denominator
}
