use core::{
    arch::wasm32::*,
    ops::{Add, AddAssign, Mul, MulAssign},
};

use crate::util::UnwrapOrAbort;

#[repr(transparent)]
#[derive(Clone, Copy)]
pub struct U32x4(v128);

#[repr(transparent)]
#[derive(Clone, Copy)]
pub struct F32x4(v128);

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

impl Default for U32x4 {
    fn default() -> Self {
        U32x4::from(0)
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

impl From<[u32; 4]> for U32x4 {
    fn from(value: [u32; 4]) -> Self {
        unsafe { U32x4(v128_load(value.as_ptr() as _)) }
    }
}

impl From<U32x4> for [u32; 4] {
    fn from(value: U32x4) -> Self {
        unsafe { *(&value as *const _ as *const _) }
    }
}

impl From<&mut U32x4> for &mut [u32; 4] {
    fn from(value: &mut U32x4) -> Self {
        unsafe { &mut *(value as *mut _ as *mut _) }
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

impl F32x4 {
    pub fn set<const N: usize>(&mut self, value: f32) {
        self.0 = f32x4_replace_lane::<N>(self.0, value);
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

impl MulAssign for F32x4 {
    fn mul_assign(&mut self, rhs: Self) {
        self.0 = (*self * rhs).0;
    }
}
