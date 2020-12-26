// Loosely based on https://rustwasm.github.io/book/game-of-life/implementing.html

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
pub struct Transform {
    srcWidth: u16,
    srcHeight: u16,
    width: u16,
    height: u16,
    left: u16,
    top: u16,
}

#[wasm_bindgen]
pub struct Layout {
    items: Vec<Transform>,
}

/// Public methods, exported to JavaScript.
#[wasm_bindgen]
impl Layout {
    // ...

    pub fn new(length: u32, thumbnailSize: u32) -> Layout {
        let items = (0..length)
            .map(|i| Transform {
                srcWidth: 0,
                srcHeight: 0,
                width: 0,
                height: 0,
                top: 0,
                left: 0,
            })
            .collect();

        Layout { items }
    }

    // TODO: resize/re-init func

    pub fn items(&self) -> *const Transform {
        self.items.as_ptr()
    }

    // TODO: ???
    // pub fn get(&self, index: usize) -> Option<&'static Transform> {
    //     self.items.get(index)
    // }

    // fn get_index(&self, index: usize) -> Transform {
    //     return self.items[index]
    // }

    pub fn compute(&mut self, containerWidth: u32, padding: u32) -> i32 {
        // TODO: Loop over images until containerWidth is reached:
        // Either adjust row height or add/remove item to make it fit full-width, whatever is the closest
        // Could also have an approximated version for very large lists, and just properly compute for what in and close to the viewport

        let baseRowHeight = 220;

        let mut topOffset = 0;
        let mut curRowWidth = 0;
        let mut firstRowItemIndex = 0;

        for i in 0..self.items.len() {
            let item = &mut self.items[i];
            let mut relWidth =
                ((baseRowHeight as f32 / item.srcWidth as f32) * item.srcHeight as f32);
            item.width = relWidth as u16;
            item.top = topOffset as u16;
            item.height = baseRowHeight;

            item.left = curRowWidth as u16;
            // Check if adding this image to the row would exceed the container width
            let newRowWidth = curRowWidth + relWidth as u32 + padding;

            // TODO: Edge case for last row: not always full width
            if newRowWidth > containerWidth {
                // If it exceeds it, position all current items in the row accordingly and start a new row for this item
                // Position all items in this row properly after the row is filled, needs to expand a little

                // Now that the size of this row is definitive: Set the size of all row items
                let correctionFactor = containerWidth as f32 / newRowWidth as f32;
                for j in firstRowItemIndex..i {
                    let prevItem = &mut self.items[j];
                    prevItem.left = (correctionFactor * prevItem.left as f32) as u16;
                    prevItem.width = (prevItem.width as f32 * correctionFactor) as u16;
                    prevItem.height = (prevItem.height as f32 * correctionFactor) as u16;
                }

                // Start a new row
                curRowWidth = 0;
                firstRowItemIndex = i + i;
                topOffset += padding as u32 + (baseRowHeight as f32 * correctionFactor) as u32;
            }
        }
        // Return the height of the container: If a new row was just started, no need to add last item's height
        if curRowWidth != 0 {
            let lastItem = self.items.last();
            return match lastItem {
                Some(item) => topOffset as i32 + item.height as i32,
                None => topOffset as i32,
            };
        }
        topOffset as i32
    }
}

// Main idea:
// - Take in a list of image dimensions, and a base thumbnail size (e.g. S, M, L)
// - Output a list of image positions, laid out in a masonry format
