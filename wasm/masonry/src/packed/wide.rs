use core::{
    arch::wasm32::{
        f32x4_convert_u32x4, f32x4_mul, f32x4_replace_lane, f32x4_splat, u32x4, u32x4_add,
        u32x4_extract_lane, u32x4_lt, u32x4_max, u32x4_min, u32x4_replace_lane, u32x4_splat,
        u32x4_trunc_sat_f32x4, v128, v128_bitselect,
    },
    ops::{AddAssign, Mul},
};

#[repr(transparent)]
#[derive(Clone, Copy)]
pub struct U32x4(v128);

#[repr(transparent)]
#[derive(Clone, Copy)]
pub struct F32x4(v128);

impl U32x4 {
    pub const ZERO: U32x4 = U32x4::new(0, 0, 0, 0);

    pub const fn new(a: u32, b: u32, c: u32, d: u32) -> U32x4 {
        U32x4(u32x4(a, b, c, d))
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

    #[must_use]
    pub fn set<const N: usize>(self, value: u32) -> U32x4 {
        U32x4(u32x4_replace_lane::<N>(self.0, value))
    }

    /// Compares lanes with < operator.
    pub fn less_than(self, other: U32x4) -> U32x4 {
        U32x4(u32x4_lt(self.0, other.0))
    }

    pub fn to_array(self) -> [u32; 4] {
        self.into()
    }
}

impl Default for U32x4 {
    fn default() -> Self {
        U32x4::ZERO
    }
}

impl From<u32> for U32x4 {
    fn from(value: u32) -> Self {
        U32x4(u32x4_splat(value))
    }
}

impl From<F32x4> for U32x4 {
    fn from(value: F32x4) -> Self {
        U32x4(u32x4_trunc_sat_f32x4(value.0))
    }
}

impl From<U32x4> for [u32; 4] {
    fn from(value: U32x4) -> Self {
        unsafe { *(&value as *const U32x4 as *const [u32; 4]) }
    }
}

impl AddAssign for U32x4 {
    fn add_assign(&mut self, rhs: Self) {
        self.0 = u32x4_add(self.0, rhs.0);
    }
}

impl F32x4 {
    #[must_use]
    pub fn set<const N: usize>(&mut self, value: f32) -> F32x4 {
        F32x4(f32x4_replace_lane::<N>(self.0, value))
    }
}

impl From<f32> for F32x4 {
    fn from(value: f32) -> Self {
        F32x4(f32x4_splat(value))
    }
}

impl From<U32x4> for F32x4 {
    fn from(value: U32x4) -> Self {
        F32x4(f32x4_convert_u32x4(value.0))
    }
}

impl Mul for F32x4 {
    type Output = F32x4;

    fn mul(self, rhs: Self) -> Self::Output {
        F32x4(f32x4_mul(self.0, rhs.0))
    }
}
