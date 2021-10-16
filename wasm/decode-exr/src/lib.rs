mod color;

use std::io::Cursor;

use wasm_bindgen::{prelude::*, Clamped};
use web_sys::ImageData;

use crate::color::{ColorMapper, SRGB};

type ImageBuffer = (Vec<u8>, usize, usize);

#[wasm_bindgen]
pub fn decode(bytes: &[u8]) -> Result<ImageData, JsValue> {
    use exr::error::Error;

    match decode_exr(bytes) {
        Ok((buffer, width, height)) => {
            ImageData::new_with_u8_clamped_array_and_sh(Clamped(&buffer), width as _, height as _)
        }
        Err(Error::Aborted | Error::Io(_)) => unreachable!(),
        _ => Err(JsValue::UNDEFINED),
    }
}

fn decode_exr(bytes: &[u8]) -> Result<ImageBuffer, exr::error::Error> {
    use exr::prelude::*;

    struct Buffer {
        buffer: Vec<u8>,
        width: usize,
        height: usize,
        color_mapper: ColorMapper,
    }

    impl Buffer {
        fn put_pixel(&mut self, x: usize, y: usize, (r, g, b, a): (f32, f32, f32, f32)) {
            let offset = (self.width * y + x) * 4;
            let [r, g, b] = self.color_mapper.map_gamut((r, g, b)).into_array();
            self.buffer[offset + 3] = ColorMapper::map_tone(a);
            self.buffer[offset] = ColorMapper::map_tone(r);
            self.buffer[offset + 1] = ColorMapper::map_tone(g);
            self.buffer[offset + 2] = ColorMapper::map_tone(b);
        }
    }

    let chromaticities = MetaData::read_from_buffered(bytes, false)?.headers[0]
        .shared_attributes
        .chromaticities
        .unwrap_or(SRGB);

    let create_image = |resolution: Vec2<usize>, _channels: &RgbaChannels| -> Buffer {
        Buffer {
            buffer: vec![0; resolution.width() * resolution.height() * 4],
            width: resolution.width(),
            height: resolution.height(),
            color_mapper: ColorMapper::new(chromaticities),
        }
    };

    fn set_image(image: &mut Buffer, position: Vec2<usize>, rgba: (f32, f32, f32, f32)) {
        image.put_pixel(position.x(), position.y(), rgba)
    }

    // read from the exr file directly into a new `png::RgbaImage` image without intermediate buffers
    let reader = read()
        .no_deep_data()
        .largest_resolution_level()
        .rgba_channels(create_image, set_image)
        .first_valid_layer()
        .all_attributes()
        // do not use multi-thread in WASM module
        .non_parallel();

    // an image that contains a single layer containing an png rgba buffer
    let image = reader.from_buffered(Cursor::new(bytes))?;
    let buffer = image.layer_data.channel_data.pixels;
    Ok((buffer.buffer, buffer.width, buffer.height))
}
