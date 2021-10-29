// Main idea of this package:
// - Take in a list of image dimensions, and a base thumbnail size (e.g. S, M, L)
// - Output a list of image positions, laid out in a masonry format
// TODO: Could also use the google photos layout: Groups of masonry layouts, each with a header (e.g. the date)
use crate::util::UnwrapOrAbort;
use alloc::{vec, vec::Vec};

use self::wide::U32x4;

pub struct Layout {
    num_items: usize,
    transforms: Vec<Transform>,
    aspect_ratios: Vec<AspectRatio>,
    thumbnail_size: u16,
    padding: u16,
}

#[repr(C)]
#[derive(Clone, Default)]
pub struct Transform {
    pub width: u32,
    pub height: u32,
    pub top: u32,
    pub left: u32,
}

#[derive(Clone, Copy, Default)]
struct AspectRatio {
    width: u8,
    height: u8,
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

    pub fn get_transform(&self, index: usize) -> *const Transform {
        &self.transforms[index]
    }

    pub fn set_dimension(&mut self, index: usize, src_width: u16, src_height: u16) {
        self.aspect_ratios[index].set(src_width, src_height);
    }

    pub fn set_thumbnail_size(&mut self, thumbnail_size: u16) {
        // The reason for this limitation is the way how the thumbnail size is calculated for the
        // vertical and horizontal masonry layout.
        const MAX_THUMBNAIL_SIZE: u16 = u16::MAX / 100;
        self.thumbnail_size = thumbnail_size.min(MAX_THUMBNAIL_SIZE);
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

        let mut top_offset = 0;
        let mut cur_row_width = 0;
        let mut first_row_item_index = 0;

        for i in 0..self.num_items {
            // Correct aspect ratio for very wide/narrow images
            let width = self.aspect_ratios[i].correct_width(thumbnail_size);

            let transform = &mut self.transforms[i];
            transform.height = thumbnail_size;
            transform.width = width;
            transform.top = top_offset;
            transform.left = cur_row_width;

            let new_row_width = cur_row_width + width + padding;

            // Check if adding this image to the row would exceed the container width
            if new_row_width > container_width {
                // If it exceeds it, scale all current items in the row accordingly and start a new row.
                let corrected_height = (thumbnail_size * container_width).div_int(new_row_width);
                for prev_item in self
                    .transforms
                    .get_mut(first_row_item_index..=i)
                    .unwrap_or_abort()
                {
                    prev_item.height = corrected_height;
                    prev_item.scale(container_width, new_row_width);
                }

                // Start a new row
                cur_row_width = 0;
                first_row_item_index = i + 1;
                top_offset += corrected_height + padding;
            } else {
                // Otherwise, just add its width to the current row width and continue on!
                cur_row_width = new_row_width;
            }
        }
        // Return the height of the container: If a new row was just started, no need to add last item's height; already done in the loop
        if cur_row_width == 0 {
            top_offset
        } else {
            top_offset + thumbnail_size + padding
        }
    }

    // Main idea: Initialize with N columns of identical widths
    // loop over images, put them in the column that has the least height filled
    pub fn compute_vertical(&mut self, container_width: u16) -> u32 {
        if self.is_empty() || self.thumbnail_size == 0 {
            return 0;
        }

        use vertical_masonry::ColumnHeights;

        let (column_width, mut columns) = {
            let container_width = container_width.max(self.thumbnail_size);
            let n_columns = container_width.div_int(self.thumbnail_size);
            let column_width = u32::from(container_width.div_int(n_columns));
            (column_width, ColumnHeights::new(usize::from(n_columns)))
        };
        let padding = u32::from(self.padding);
        let item_width = column_width - padding;

        for (transform, aspect_ratio) in self
            .transforms
            .iter_mut()
            .zip(self.aspect_ratios.iter())
            .take(self.num_items)
        {
            let height = aspect_ratio.correct_height(item_width);
            let (top, shortest_column_index) = columns.min_column();
            let left = shortest_column_index * column_width;

            // Only safe if the passed index is a valid column index.
            unsafe {
                columns.set_min_column(shortest_column_index, top + height + padding);
            }

            transform.width = item_width;
            transform.height = height;
            transform.top = top;
            transform.left = left;
        }
        columns.max_height()
    }

    // Simple Grid layout, replacement for the react-window dependency
    pub fn compute_grid(&mut self, container_width: u16) -> u32 {
        if self.is_empty() || self.thumbnail_size == 0 {
            return 0;
        }

        // Main idea: Put items in a grid.
        let (n_columns, row_height) = {
            let container_width = container_width.max(self.thumbnail_size);
            let n_columns = container_width.div_int(self.thumbnail_size);
            let column_width = u32::from(container_width.div_int(n_columns));
            (usize::from(n_columns), column_width)
        };
        let item_size = row_height - u32::from(self.padding);

        let rows = {
            let len = self.num_items;
            self.transforms
                .get_mut(..len)
                .unwrap_or_abort()
                .chunks_mut(n_columns)
        };

        // width | height | top | left
        let mut item_transform = U32x4::new(item_size, item_size, 0, 0);
        let increment_top = U32x4::new(0, 0, row_height, 0);
        let increment_left = U32x4::new(0, 0, 0, row_height);
        for row in rows {
            for transform in row.iter_mut() {
                let transform = unsafe { &mut *(transform as *mut _ as *mut _) };
                *transform = item_transform;
                item_transform += increment_left;
            }
            item_transform += increment_top;
            item_transform.set::<3>(0); // Reset left offset
        }
        // Return total height of the grid
        item_transform.get::<2>()
    }
}

impl Layout {
    fn is_empty(&self) -> bool {
        self.num_items == 0
    }
}

impl Transform {
    fn scale(&mut self, total_width: u32, current_width: u32) {
        self.left = (self.left * total_width).div_int(current_width);
        self.width = (self.width * total_width).div_int(current_width);
    }
}

impl AspectRatio {
    fn set(&mut self, src_width: u16, src_height: u16) {
        let (width, height) = correct_aspect_ratio(src_width, src_height);
        self.width = width;
        self.height = height;
    }

    fn width(&self) -> u32 {
        u32::from(self.width)
    }

    fn height(&self) -> u32 {
        u32::from(self.height)
    }

    fn correct_width(&self, height: u32) -> u32 {
        (height * self.width()).div_int(self.height())
    }

    fn correct_height(&self, width: u32) -> u32 {
        (width * self.height()).div_int(self.width())
    }
}

// For images with extreme aspect ratios (very narrow or wide), crop them a little
// so that they are at most X times as wide/long as they are long/wide
// Returns a correct height value of the image
fn correct_aspect_ratio(w: u16, h: u16) -> (u8, u8) {
    const MIN_ASPECT_RATIO: u32 = 100 / 3; // X times as wide as narrow or vice versa

    if w > h {
        let height = (100 * u32::from(h))
            .div_int(u32::from(w))
            .max(MIN_ASPECT_RATIO) as u8;
        (100, height)
    } else if h > w {
        let width = (100 * u32::from(w))
            .div_int(u32::from(h))
            .max(MIN_ASPECT_RATIO) as u8;
        (width, 100)
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

/// http://0x80.pl/notesen/2018-10-03-simd-index-of-min.html
mod vertical_masonry {
    use alloc::{boxed::Box, vec};

    use crate::util::UnwrapOrAbort;

    use super::wide::U32x4;

    type Mask = U32x4;

    pub struct ColumnHeights {
        heights: Box<[U32x4]>,
        padded_offset: usize,
    }

    impl ColumnHeights {
        pub fn new(columns: usize) -> Self {
            // If the number of columns cannot be divided by 4, it is padded with u32::MAX.
            // This way it won't effect the search in Self::min_index().
            let rest = columns % 4;
            let (len, padded_offset) = if rest == 0 {
                (columns / 4, 4)
            } else {
                ((columns / 4) + 1, rest)
            };
            Self {
                heights: {
                    let mut heights = vec![U32x4::from(0); len].into_boxed_slice();
                    let last = &mut heights[len - 1];
                    let last: &mut [u32; 4] = unsafe { &mut *(last as *mut _ as *mut _) };
                    last[padded_offset..].fill(u32::MAX);
                    heights
                },
                padded_offset,
            }
        }

        // (min_value, min_index)
        pub fn min_column(&self) -> (u32, u32) {
            let (&first, heights) = self.heights.split_first().unwrap_or_abort();

            let mut indices = U32x4::new(0, 1, 2, 3);
            let increment = U32x4::from(4);

            let mut min_values = first;
            let mut min_indices = U32x4::new(0, 1, 2, 3);

            for values in heights {
                indices += increment;

                // compare
                let less: Mask = values.lt(min_values);

                // update
                min_values = values.min(min_values);
                min_indices = indices.blend(min_indices, less);
            }

            min_values
                .to_array()
                .into_iter()
                .zip(min_indices.to_array())
                .min_by(|a, b| a.0.cmp(&b.0).then_with(|| a.1.cmp(&b.1)))
                .unwrap_or_abort()
        }

        pub unsafe fn set_min_column(&mut self, index: u32, value: u32) {
            // SAFETY: This only works because the layout of a U32x4 is [u32; 4].
            // If the index is out of bounds, chaos will fall upon us but this should
            // never happen because the passed index is the shortest column index.
            let slice = core::slice::from_raw_parts_mut(
                self.heights.as_mut_ptr() as *mut u32,
                self.heights.len() * 4,
            );
            *slice.get_unchecked_mut(index as usize) = value;
        }

        pub fn max_height(mut self) -> u32 {
            // Re-interpret last U32x4 as array of u32 and set padding columns to 0.
            // Otherwise, Self::max_height() will always return u32::MAX (see Self::new()).
            {
                let last = self.heights.last_mut().unwrap_or_abort();
                let last: &mut [u32; 4] = unsafe { &mut *(last as *mut _ as *mut _) };
                last[self.padded_offset..].fill(0);
            }

            let (&first, heights) = self.heights.split_first().unwrap_or_abort();

            heights
                .into_iter()
                .fold(first, |max, &x| max.max(x))
                .to_array()
                .into_iter()
                .max()
                .unwrap_or_abort()
        }
    }
}

mod wide {
    use core::{
        arch::wasm32::{
            u32x4, u32x4_add, u32x4_extract_lane, u32x4_lt, u32x4_max, u32x4_min,
            u32x4_replace_lane, u32x4_splat, v128, v128_bitselect, v128_load, v128_store,
        },
        ops::{Add, AddAssign},
    };

    use crate::util::UnwrapOrAbort;

    #[repr(transparent)]
    #[derive(Clone, Copy)]
    pub struct U32x4(v128);

    impl U32x4 {
        pub const fn new(a: u32, b: u32, c: u32, d: u32) -> U32x4 {
            U32x4(u32x4(a, b, c, d))
        }

        pub fn from_array(array: [u32; 4]) -> U32x4 {
            U32x4::from(array)
        }

        pub fn from_slice(array: &[u32]) -> U32x4 {
            U32x4::from_array(array.try_into().unwrap_or_abort())
        }

        pub fn min(self, other: U32x4) -> U32x4 {
            U32x4(u32x4_min(self.0, other.0))
        }

        pub fn max(self, other: U32x4) -> U32x4 {
            U32x4(u32x4_max(self.0, other.0))
        }

        pub fn blend(self, other: U32x4, mask: U32x4) -> U32x4 {
            U32x4(v128_bitselect(self.0, other.0, mask.0))
        }

        pub fn get<const N: usize>(&self) -> u32 {
            u32x4_extract_lane::<N>(self.0)
        }

        pub fn set<const N: usize>(&mut self, value: u32) {
            self.0 = u32x4_replace_lane::<N>(self.0, value);
        }

        /// Compares lanes with < operator.
        pub fn lt(self, other: U32x4) -> U32x4 {
            U32x4(u32x4_lt(self.0, other.0))
        }

        pub fn to_array(self) -> [u32; 4] {
            self.into()
        }
    }

    impl From<u32> for U32x4 {
        fn from(value: u32) -> Self {
            U32x4(u32x4_splat(value))
        }
    }

    impl From<[u32; 4]> for U32x4 {
        fn from(value: [u32; 4]) -> Self {
            unsafe { U32x4(v128_load(value.as_ptr() as *const _)) }
        }
    }

    impl From<U32x4> for [u32; 4] {
        fn from(value: U32x4) -> Self {
            let mut output = [0; 4];
            unsafe { v128_store(output.as_mut_ptr() as *mut _, value.0) }
            output
        }
    }

    impl Add for U32x4 {
        type Output = U32x4;

        fn add(self, rhs: Self) -> Self::Output {
            U32x4(u32x4_add(self.0, rhs.0))
        }
    }

    impl AddAssign for U32x4 {
        fn add_assign(&mut self, rhs: Self) {
            self.0 = (*self + rhs).0;
        }
    }
}
