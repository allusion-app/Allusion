// Main idea of this package:
// - Take in a list of image dimensions, and a base thumbnail size (e.g. S, M, L)
// - Output a list of image positions, laid out in a masonry format
// TODO: Could also use the google photos layout: Groups of masonry layouts, each with a header (e.g. the date)
use crate::util::UnwrapOrAbort;
use alloc::{vec, vec::Vec};

use crate::packed::{F32x4, U32x4};

pub struct Layout {
    num_items: usize,
    transforms: Vec<Transform>,
    aspect_ratios: Vec<AspectRatio>,
    thumbnail_size: u16,
    padding: u16,
}

#[repr(transparent)]
#[derive(Clone, Default)]
pub struct Transform(U32x4);

#[derive(Clone, Default)]
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

    pub fn get_transform(&self, index: usize) -> Option<&Transform> {
        self.transforms.get(index)
    }

    pub fn set_dimension(&mut self, index: usize, src_width: u16, src_height: u16) {
        if let Some(aspect_ratio) = self.aspect_ratios.get_mut(index) {
            aspect_ratio.set(src_width, src_height);
        }
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
            self.transforms.resize_with(new_len, Default::default);
            self.aspect_ratios.resize_with(new_len, Default::default);
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

        let container_width = container_width.max(self.thumbnail_size);
        let height = u32::from(self.thumbnail_size);
        let max_width = u32::from(container_width);
        let container_width = f32::from(container_width);
        let padding = u32::from(self.padding);

        let mut top = 0;
        let mut row_width = 0;
        let mut start = 0;

        for end in 0..self.num_items {
            // Correct aspect ratio for very wide/narrow images
            let width = self.aspect_ratios[end].correct_width(height);

            self.transforms[end].0 = U32x4::new(width, height, top, row_width);

            row_width += width + padding;

            // Check if adding this image to the row would exceed the container width
            if row_width > max_width {
                // If it exceeds it, scale all current items in the row accordingly and start a new row.
                // width | height | top | left
                let factor = container_width / f32::from(row_width as u16);
                let factor = F32x4::from(factor).set::<2>(1.0); // Do not scale top
                for transform in self.transforms.get_mut(start..=end).unwrap_or_abort() {
                    transform.0 = U32x4::from(F32x4::from(transform.0) * factor);
                }

                // Start a new row
                row_width = 0;
                start = end + 1;
                top += self.transforms[end].0.get::<1>() + padding;
            }
        }
        // Return the height of the container: If a new row was just started, no need to add last item's height; already done in the loop
        if row_width == 0 {
            top
        } else {
            top + height + padding
        }
    }

    // Main idea: Initialize with N columns of identical widths
    // loop over images, put them in the column that has the least height filled
    pub fn compute_vertical(&mut self, container_width: u16) -> u32 {
        use vertical_masonry::ColumnHeights;

        if self.is_empty() || self.thumbnail_size == 0 {
            return 0;
        }

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

            // SAFETY: ColumnHeights::min_column returns a valid column index.
            unsafe {
                columns.set_min_column(shortest_column_index, top + height + padding);
            }

            transform.0 = U32x4::new(item_width, height, top, left);
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

        let rows = self
            .transforms
            .get_mut(..self.num_items)
            .unwrap_or_abort()
            .chunks_mut(n_columns);

        // width | height | top | left
        let mut item_transform = U32x4::new(item_size, item_size, 0, 0);
        let increment_top = U32x4::new(0, 0, row_height, 0);
        let increment_left = U32x4::new(0, 0, 0, row_height);
        for row in rows {
            for transform in row.iter_mut() {
                transform.0 = item_transform;
                item_transform += increment_left;
            }
            item_transform += increment_top;
            item_transform = item_transform.set::<3>(0); // Reset left offset
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
    use core::ptr;

    use crate::util::UnwrapOrAbort;

    use crate::packed::U32x4;

    type Mask = U32x4;

    pub struct ColumnHeights {
        heights: Box<[U32x4]>,
        padding_mask: Mask,
    }

    impl ColumnHeights {
        pub fn new(columns: usize) -> Self {
            // If the number of columns cannot be divided by 4, it is padded with u32::MAX.
            // This way it won't effect the search in Self::min_index().
            let rest = columns % 4;
            let (len, padding_mask) = if rest == 0 {
                (columns / 4, U32x4::ZERO)
            } else {
                (
                    (columns / 4) + 1,
                    U32x4::from(rest as u32).less_than(U32x4::new(1, 2, 3, 4)),
                )
            };
            Self {
                heights: {
                    let mut heights = vec![U32x4::ZERO; len].into_boxed_slice();
                    *heights.last_mut().unwrap_or_abort() = padding_mask;
                    heights
                },
                padding_mask,
            }
        }

        /// Returns the shortest column as (value, index) pair.
        pub fn min_column(&self) -> (u32, u32) {
            let (&first, heights) = self.heights.split_first().unwrap_or_abort();

            let mut indices = U32x4::new(0, 1, 2, 3);
            let increment = U32x4::from(4);

            let mut min_values = first;
            let mut min_indices = U32x4::new(0, 1, 2, 3);

            for values in heights {
                indices += increment;

                // compare
                let less: Mask = values.less_than(min_values);

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

        /// # Safety
        ///
        /// The index must smaller than the total number of columns, otherwise this will result in undefined behaviour.
        pub unsafe fn set_min_column(&mut self, index: u32, value: u32) {
            // SAFETY: This only works because the layout of a U32x4 is [u32; 4].
            // If the index is out of bounds, chaos will fall upon us but this should
            // never happen because the passed index is the shortest column index.
            let height_ptr = self
                .heights
                .as_mut_ptr()
                .cast::<u32>()
                .offset(index as isize);
            ptr::write(height_ptr, value);
        }

        pub fn max_height(mut self) -> u32 {
            // Set padding columns to 0 or Self::max_height() will always return u32::MAX (see Self::new()).
            {
                let last = self.heights.last_mut().unwrap_or_abort();
                *last = U32x4::ZERO.blend(*last, self.padding_mask);
            }

            let (&first, heights) = self.heights.split_first().unwrap_or_abort();

            heights
                .iter()
                .fold(first, |max, &x| max.max(x))
                .to_array()
                .into_iter()
                .max()
                .unwrap_or_abort()
        }
    }
}
