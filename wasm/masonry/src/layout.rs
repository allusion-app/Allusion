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
    aspect_ratios: Vec<AspectRatio>,
    thumbnail_size: u16,
    padding: u16,
}

#[derive(Clone, Default)]
pub struct Transform {
    pub width: u32,
    pub height: u32,
    pub left: u32,
    pub top: u32,
}

#[derive(Clone, Default)]
struct AspectRatio {
    width: u32,
    height: u32,
}

const MIN_ITEMS_CAPACITY: usize = 1_000;

impl Layout {
    pub fn new(num_items: usize, thumbnail_size: u16, padding: u16) -> Layout {
        let capacity = num_items.max(MIN_ITEMS_CAPACITY);
        Layout {
            num_items,
            transforms: vec![Transform::default(); capacity],
            aspect_ratios: vec![AspectRatio::default(); capacity],
            thumbnail_size,
            padding,
        }
    }

    pub fn get_transform(&self, index: usize) -> &Transform {
        &self.transforms[index]
    }

    pub fn set_dimension(&mut self, index: usize, src_width: u16, src_height: u16) {
        self.aspect_ratios[index].set(src_width, src_height);
    }

    pub fn set_thumbnail_size(&mut self, thumbnail_size: u16) {
        self.thumbnail_size = thumbnail_size;
    }

    pub fn set_padding(&mut self, padding: u16) {
        self.padding = padding;
    }

    pub fn resize(&mut self, new_len: usize) {
        self.num_items = new_len;
        let len = self.transforms.len().min(self.aspect_ratios.len());
        if new_len > len {
            self.transforms
                .reserve(new_len.saturating_sub(self.transforms.capacity()));
            self.aspect_ratios
                .reserve(new_len.saturating_sub(self.aspect_ratios.capacity()));
            for _ in len..new_len {
                self.transforms.push(Transform::default());
                self.aspect_ratios.push(AspectRatio::default());
            }
        }
    }

    // Main idea: Keep looping over images until containerWidth is reached, then:
    // - Either adjust row height or add/remove item to make it fit full-width, whatever is the closest
    // (I think this is how google photos does it)
    // Could also have an approximated version for very large lists, and just properly compute for what in and close to the viewport
    // TODO: Look up proper masonry algorithm, e.g. https://euler.stephan-brumme.com/215/
    // TODO: Alternatively, could layout based on aspect ratio blogpost https://medium.com/@danrschlosser/building-the-image-grid-from-google-photos-6a09e193c74a
    pub fn compute_horizontal(&mut self, container_width: u16) -> u32 {
        if self.is_empty() || self.thumbnail_size == 0 {
            return 0;
        }

        let thumbnail_size = u32::from(self.thumbnail_size);
        let container_width = u32::from(container_width).max(thumbnail_size);
        let padding = u32::from(self.padding);

        let mut top_offset: u32 = 0;
        let mut cur_row_width = 0;
        let mut first_row_item_index: usize = 0;

        for i in 0..self.len() {
            let transform = &mut self.transforms[i];
            // Correct aspect ratio for very wide/narrow images
            transform.height = thumbnail_size;
            transform.correct_width(thumbnail_size, &self.aspect_ratios[i]);
            transform.top = top_offset;
            transform.left = cur_row_width;

            // Check if adding this image to the row would exceed the container width
            let new_row_width = cur_row_width + transform.width;

            if new_row_width > container_width {
                // If it exceeds it, position all current items in the row accordingly and start a new row for this item
                // Position all items in this row properly after the row is filled, needs to expand a little

                // Now that the size of this row is definitive: Set the actual size of all row items
                // The horizontal padding should not be scaled: Should be an absolute value
                let num_items_in_row = (i - first_row_item_index + 1) as u32;
                let total_horizontal_padding = num_items_in_row * padding;
                let total_width = container_width - total_horizontal_padding;

                let corrected_height = (thumbnail_size * total_width).div_int(new_row_width);
                let mut left = 0;
                for prev_item in self
                    .transforms
                    .get_mut(first_row_item_index..=i)
                    .unwrap_or_abort()
                {
                    prev_item.height = corrected_height;
                    prev_item.scale(total_width, new_row_width);
                    prev_item.left += left;
                    left += padding;
                }

                // Start a new row
                cur_row_width = 0;
                first_row_item_index = i + 1;
                top_offset += padding + corrected_height;
            } else {
                // Otherwise, just add its width to the current row width and continue on!
                cur_row_width = new_row_width;
            }
        }
        // Return the height of the container: If a new row was just started, no need to add last item's height; already done in the loop
        if cur_row_width == 0 {
            top_offset
        } else {
            // Add horizontal padding to the remaining items
            let len = self.len();
            let mut left = 0;
            for prev_item in self
                .transforms
                .get_mut(first_row_item_index..len)
                .unwrap_or_abort()
            {
                prev_item.left += left;
                left += padding;
            }
            let last_item_height = self.transforms[len - 1].height;
            top_offset + last_item_height + padding
        }
    }

    // Main idea: Initialize with N columns of identical widths
    // loop over images, put them in the column that has the least height filled
    pub fn compute_vertical(&mut self, container_width: u16) -> u32 {
        #[derive(PartialEq, Eq)]
        struct Column {
            index: u32,
            height: u32,
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
                other
                    .height
                    .cmp(&self.height)
                    .then_with(|| other.index.cmp(&self.index))
            }
        }

        if self.is_empty() || self.thumbnail_size == 0 {
            return 0;
        }

        let (column_width, mut columns) = {
            let container_width = container_width.max(self.thumbnail_size);
            let n_columns = container_width.div_int(self.thumbnail_size);
            let column_width = container_width.div_int(n_columns);
            let mut columns = Vec::with_capacity(usize::from(n_columns));
            for index in 0..u32::from(n_columns) {
                columns.push(Column { index, height: 0 });
            }
            (u32::from(column_width), BinaryHeap::from(columns))
        };
        let padding = u32::from(self.padding);
        let item_width = column_width - padding;

        for i in 0..self.len() {
            let transform = &mut self.transforms[i];
            transform.width = item_width;
            transform.correct_height(item_width, &self.aspect_ratios[i]);

            let mut column = columns.peek_mut().unwrap_or_abort();
            transform.left = column.index * column_width;
            transform.top = column.height;
            column.height += transform.height + padding;
        }

        let binary_heap = columns.into_vec();
        let (_, leaf_nodes) = binary_heap.split_at(binary_heap.len() / 2);
        let mut longest_column_height = 0;
        for &Column { height, .. } in leaf_nodes {
            if height > longest_column_height {
                longest_column_height = height;
            }
        }
        longest_column_height
    }

    // Simple Grid layout, replacement for the react-window dependency
    pub fn compute_grid(&mut self, container_width: u16) -> u32 {
        if self.is_empty() || self.thumbnail_size == 0 {
            return 0;
        }

        // Main idea: Put items in a grid.
        let (n_columns, column_width) = {
            let container_width = container_width.max(self.thumbnail_size);
            let n_columns = container_width.div_int(self.thumbnail_size);
            let column_width = u32::from(container_width.div_int(n_columns));
            (usize::from(n_columns), column_width)
        };
        let item_size = column_width - u32::from(self.padding);
        let row_height = column_width;

        let rows = {
            let len = self.len();
            self.transforms
                .get_mut(..len)
                .unwrap_or_abort()
                .chunks_mut(n_columns)
        };
        let mut top_offset = 0;
        for row in rows {
            let mut left = 0;
            for transform in row.iter_mut() {
                transform.width = item_size;
                transform.height = item_size;
                transform.left = left;
                transform.top = top_offset;
                left += column_width;
            }
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
    fn scale(&mut self, total_width: u32, current_width: u32) {
        self.left = (self.left * total_width).div_int(current_width);
        self.width = (self.width * total_width).div_int(current_width);
    }

    fn correct_height(&mut self, width: u32, aspect_ratio: &AspectRatio) {
        self.height = (width * aspect_ratio.height).div_int(aspect_ratio.width);
    }

    fn correct_width(&mut self, height: u32, aspect_ratio: &AspectRatio) {
        self.width = (height * aspect_ratio.width).div_int(aspect_ratio.height);
    }
}

impl AspectRatio {
    fn set(&mut self, src_width: u16, src_height: u16) {
        let (width, height) = correct_aspect_ratio(src_width, src_height);
        self.width = width;
        self.height = height;
    }
}

// For images with extreme aspect ratios (very narrow or wide), crop them a little
// so that they are at most X times as wide/long as they are long/wide
// Returns a correct height value of the image
fn correct_aspect_ratio(w: u16, h: u16) -> (u32, u32) {
    const MIN_ASPECT_RATIO: u32 = 100 / 3; // X times as wide as narrow or vice versa

    let width = u32::from(w.max(1));
    let height = u32::from(h.max(1));

    if width > height {
        (100, (100 * height).div_int(width).max(MIN_ASPECT_RATIO))
    } else if height > width {
        ((100 * width).div_int(height).max(MIN_ASPECT_RATIO), 100)
    } else {
        (1, 1)
    }
}

trait DivInt<Rhs = Self> {
    type Output;

    fn div_int(self, rhs: Rhs) -> Self::Output;
}

impl DivInt for u16 {
    type Output = Self;

    #[inline]
    fn div_int(self, rhs: Self) -> Self::Output {
        (self.saturating_add(rhs >> 1)) / rhs
    }
}

impl DivInt for u32 {
    type Output = Self;

    #[inline]
    fn div_int(self, rhs: Self) -> Self::Output {
        (self.saturating_add(rhs >> 1)) / rhs
    }
}
