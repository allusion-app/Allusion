// Loosely based on https://rustwasm.github.io/book/game-of-life/implementing.html

// Main idea of this package:
// - Take in a list of image dimensions, and a base thumbnail size (e.g. S, M, L)
// - Output a list of image positions, laid out in a masonry format

pub struct Layout {
    num_items: usize,
    transforms: Vec<Transform>,
    dimensions: Vec<Dimension>,
    thumbnail_size: u16,
    padding: u16,
}

// TODO: Could also use the google photos layout: Groups of masonry layouts, each with a header (e.g. the date)
#[derive(Clone, Default)]
pub struct Transform {
    pub width: u16,
    pub height: u16,
    pub left: u16,
    pub top: u32,
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
        let capacity = self.transforms.capacity();
        if new_len > capacity {
            let additional_capacity = new_len - capacity;
            self.transforms.reserve(additional_capacity);
            self.dimensions.reserve(additional_capacity);
            for _ in capacity..new_len {
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
    pub fn compute_horizontal(&mut self, container_width: u16) -> u32 {
        let transform_height = self.thumbnail_size;

        let mut top_offset: u32 = 0;
        let mut cur_row_width: u16 = 0;
        let mut first_row_item_index: usize = 0;

        for i in 0..self.num_items {
            let transform = &mut self.transforms[i];
            transform.height = transform_height;
            transform.top = top_offset;
            transform.left = cur_row_width;
            // Correct aspect ratio for very wide/narrow images
            transform.correct_width(&self.dimensions[i]);

            // Check if adding this image to the row would exceed the container width
            let new_row_width = cur_row_width + transform.width + self.padding;

            if new_row_width > container_width {
                // If it exceeds it, position all current items in the row accordingly and start a new row for this item
                // Position all items in this row properly after the row is filled, needs to expand a little

                // Now that the size of this row is definitive: Set the actual size of all row items
                let correction_factor = f32::from(container_width) / f32::from(new_row_width);

                transform.scale(correction_factor);

                for prev_item in self.transforms[first_row_item_index..i].iter_mut() {
                    prev_item.scale(correction_factor)
                }

                // Start a new row
                cur_row_width = 0;
                first_row_item_index = i + 1;
                top_offset += u32::from(self.padding)
                    + (f32::from(transform_height) * correction_factor).round() as u32;
            } else {
                // Otherwise, just add its width to the current row width and continue on!
                cur_row_width = new_row_width;
            }
        }
        // Return the height of the container: If a new row was just started, no need to add last item's height; already done in the loop
        if cur_row_width == 0 {
            top_offset
        } else {
            match self.transforms.get(self.num_items - 1) {
                Some(last_item) => top_offset + u32::from(last_item.height),
                None => 0,
            }
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

        for i in 0..self.num_items {
            let transform = &mut self.transforms[i];
            transform.width = item_width;
            transform.correct_height(&self.dimensions[i]);

            let shortest_col_index = col_heights
                .iter()
                .enumerate()
                .min_by_key(|(_idx, &val)| val)
                .map_or(0, |(idx, _val)| idx);

            transform.left = shortest_col_index as u16 * col_width;
            transform.top = col_heights[shortest_col_index];

            col_heights[shortest_col_index] +=
                u32::from(transform.height) + u32::from(self.padding);
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

        let mut index = 0;
        let mut top_offset = 0;
        let mut left;
        for _ in 0..n_rows {
            left = 0;
            for _ in 0..n_columns {
                let transform = &mut self.transforms[index];
                transform.width = item_size;
                transform.height = item_size;
                transform.left = left;
                transform.top = top_offset;

                index += 1;
                left += column_width;
            }
            top_offset += row_height;
        }

        left = 0;
        for _ in 0..rest {
            let tranform = &mut self.transforms[index];
            tranform.width = item_size;
            tranform.height = item_size;
            tranform.left = left;
            tranform.top = top_offset;

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

impl Transform {
    fn scale(&mut self, factor: f32) {
        self.left = (f32::from(self.left) * factor).round() as u16;
        self.width = (f32::from(self.width) * factor).round() as u16;
        self.height = (f32::from(self.height) * factor).round() as u16;
    }

    fn correct_height(&mut self, dimension: &Dimension) {
        let ratio = f32::from(self.width) / dimension.src_width;
        self.height = (ratio * dimension.corrected_aspect_ratio).round() as u16;
    }

    fn correct_width(&mut self, dimension: &Dimension) {
        let ratio = f32::from(self.height) / dimension.corrected_aspect_ratio;
        self.width = (ratio * dimension.src_height).round() as u16;
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
