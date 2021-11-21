/******************************************************************************
  Copyright (c) 2010 Ryan Juckett
  http://www.ryanjuckett.com/

  This software is provided 'as-is', without any express or implied
  warranty. In no event will the authors be held liable for any damages
  arising from the use of this software.

  Permission is granted to anyone to use this software for any purpose,
  including commercial applications, and to alter it and redistribute it
  freely, subject to the following restrictions:

  1. The origin of this software must not be misrepresented; you must not
     claim that you wrote the original software. If you use this software
     in a product, an acknowledgment in the product documentation would be
     appreciated but is not required.

  2. Altered source versions must be plainly marked as such, and must not be
     misrepresented as being the original software.

  3. This notice may not be removed or altered from any source
     distribution.
******************************************************************************/

//! https://www.ryanjuckett.com/rgb-color-space-conversion/

use exr::{math::Vec2, meta::attribute::Chromaticities};

pub const SRGB_CHROMATICITIES: Chromaticities = Chromaticities {
    red: Vec2(0.64, 0.33),
    green: Vec2(0.30, 0.60),
    blue: Vec2(0.15, 0.06),
    white: Vec2(0.3127, 0.3290), // D65
};

pub const SRGB_TO_XYZ: Matrix3 = Matrix3([
    [0.4123909, 0.35758442, 0.18048081],
    [0.21263906, 0.71516883, 0.07219232],
    [0.019330805, 0.11919476, 0.9505322],
]);

pub const XYZ_TO_SRGB: Matrix3 = Matrix3([
    [3.2409692, -1.5373828, -0.49861068],
    [-0.96924347, 1.8759671, 0.04155507],
    [0.05563009, -0.20397688, 1.0569714],
]);

pub type Vec3 = [f32; 3];

pub struct Matrix3([[f32; 3]; 3]);

impl Matrix3 {
    fn invert(&self) -> Matrix3 {
        let [[a, b, c], [d, e, f], [g, h, i]] = self.0;
        // calculate the minors for the first row
        let minor00 = e * i - f * h;
        let minor01 = f * g - d * i;
        let minor02 = d * h - e * g;

        // calculate the determinant
        let determinant = a * minor00 + b * minor01 + c * minor02;

        // check if the input is a singular matrix (non-invertable)
        // (note that the epsilon here was arbitrarily chosen)
        debug_assert!(!(determinant > -0.000001 && determinant < 0.000001));

        // the inverse of inMat is (1 / determinant) * adjoint(inMat)
        let inv_det = determinant.recip();
        Matrix3([
            [
                inv_det * minor00,
                inv_det * (c * h - b * i),
                inv_det * (b * f - c * e),
            ],
            [
                inv_det * minor01,
                inv_det * (a * i - c * g),
                inv_det * (c * d - a * f),
            ],
            [
                inv_det * minor02,
                inv_det * (b * g - a * h),
                inv_det * (a * e - b * d),
            ],
        ])
    }

    fn mul_vec(&self, in_vec: Vec3) -> Vec3 {
        self.0
            .map(|xyz| xyz[0].mul_add(in_vec[0], xyz[1].mul_add(in_vec[1], xyz[2] * in_vec[2])))
    }
}

fn calc_color_space_conversion_rgb_to_xyz(
    Chromaticities {
        red,
        green,
        blue,
        white,
    }: Chromaticities,
) -> Matrix3 {
    // generate xyz chromaticity coordinates (x + y + z = 1) from xy coordinates
    let rz = 1.0 - (red.x() + red.y());
    let gz = 1.0 - (green.x() + green.y());
    let bz = 1.0 - (blue.x() + blue.y());

    // Convert white xyz coordinate to XYZ coordinate by letting that the white
    // point have and XYZ relative luminance of 1.0. Relative luminance is the Y
    // component of and XYZ color.
    //   XYZ = xyz * (Y / y)
    let w = {
        let wz = 1.0 - (white.x() + white.y());
        [white.x() / white.y(), white.y() / white.y(), wz / white.y()]
    };

    // Solve for the transformation matrix 'M' from RGB to XYZ
    // * We know that the columns of M are equal to the unknown XYZ values of r, g and b.
    // * We know that the XYZ values of r, g and b are each a scaled version of the known
    //   corresponding xyz chromaticity values.
    // * We know the XYZ value of white based on its xyz value and the assigned relative
    //   luminance of 1.0.
    // * We know the RGB value of white is (1,1,1).
    //
    //   white_XYZ = M * white_RGB
    //
    //       [r.x g.x b.x]
    //   N = [r.y g.y b.y]
    //       [r.z g.z b.z]
    //
    //       [sR 0  0 ]
    //   S = [0  sG 0 ]
    //       [0  0  sB]
    //
    //   M = N * S
    //   white_XYZ = N * S * white_RGB
    //   N^-1 * white_XYZ = S * white_RGB = (sR,sG,sB)
    //
    // We now have an equation for the components of the scale matrix 'S' and
    // can compute 'M' from 'N' and 'S'

    let mut matrix = Matrix3([
        [red.x(), green.x(), blue.x()],
        [red.y(), green.y(), blue.y()],
        [rz, gz, bz],
    ]);
    let scale = matrix.invert().mul_vec(w);
    for xyz in matrix.0.iter_mut() {
        xyz[0] *= scale[0];
        xyz[1] *= scale[1];
        xyz[2] *= scale[2];
    }
    matrix
}

/// Convert a linear sRGB color to an sRGB color.
fn gamma_compress_s_rgb(mut color: Vec3) -> Vec3 {
    // Convert a linear sRGB color channel to a sRGB color channel.
    for c in color.iter_mut() {
        let linear = *c;
        *c = if linear <= 0.0031308 {
            12.92 * linear
        } else {
            1.055 * linear.powf(2.4f32.recip()) - 0.055
        };
    }
    color
}

pub struct ColorMapper {
    color_to_xyz: Matrix3,
    xyz_to_color: Matrix3,
}

impl ColorMapper {
    pub fn new(chromaticities: Chromaticities) -> ColorMapper {
        ColorMapper {
            color_to_xyz: if chromaticities == SRGB_CHROMATICITIES {
                SRGB_TO_XYZ
            } else {
                calc_color_space_conversion_rgb_to_xyz(chromaticities)
            },
            xyz_to_color: XYZ_TO_SRGB,
        }
    }

    /// Maps linear RGB to SRGB and applies SRGB gamma correction.
    pub fn map_gamut(&self, (red, green, blue): (f32, f32, f32)) -> Vec3 {
        // The passed color must be non-linear because the exr format does not assume a viewing
        // condition which requires applying a transfer function.
        let linear_rgb = [red, green, blue];
        let xyz = self.color_to_xyz.mul_vec(linear_rgb);

        // Very few browsers actually support color spaces other than SRGB. In the future a
        // transfer function must be passed to use the display color space.
        let linear_rgb = self.xyz_to_color.mul_vec(xyz);
        gamma_compress_s_rgb(linear_rgb)
    }

    /// Compress any possible f32 into the range of [0,1] and then convert it to an unsigned byte.
    pub fn map_tone(linear: f32) -> u8 {
        // Gamma correction is already applied in ColorMapper::map_gamut.
        (linear * 255.0) as u8
    }
}

#[cfg(test)]
mod test {
    use super::{
        calc_color_space_conversion_rgb_to_xyz, SRGB_CHROMATICITIES, SRGB_TO_XYZ, XYZ_TO_SRGB,
    };

    #[test]
    fn correct_matrix() {
        let m = calc_color_space_conversion_rgb_to_xyz(SRGB_CHROMATICITIES);
        assert_eq!(m.0, SRGB_TO_XYZ.0);
        let im = m.invert();
        assert_eq!(im.0, XYZ_TO_SRGB.0);
    }
}
