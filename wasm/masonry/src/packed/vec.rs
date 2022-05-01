use core::ops::{AddAssign, Mul};

#[repr(transparent)]
#[derive(Clone, Copy)]
pub struct U32x4([u32; 4]);

#[repr(transparent)]
#[derive(Clone, Copy)]
pub struct F32x4([f32; 4]);

impl U32x4 {
    pub const ZERO: U32x4 = U32x4::new(0, 0, 0, 0);

    pub const fn new(a: u32, b: u32, c: u32, d: u32) -> U32x4 {
        U32x4([a, b, c, d])
    }

    pub fn min(self, other: U32x4) -> U32x4 {
        let [a0, a1, a2, a3] = self.0;
        let [b0, b1, b2, b3] = other.0;
        U32x4([a0.min(b0), a1.min(b1), a2.min(b2), a3.min(b3)])
    }

    pub fn max(self, other: U32x4) -> U32x4 {
        let [a0, a1, a2, a3] = self.0;
        let [b0, b1, b2, b3] = other.0;
        U32x4([a0.max(b0), a1.max(b1), a2.max(b2), a3.max(b3)])
    }

    pub fn blend(self, other: U32x4, mask: U32x4) -> U32x4 {
        let [a0, a1, a2, a3] = self.0;
        let [b0, b1, b2, b3] = other.0;
        let [m0, m1, m2, m3] = mask.0;
        U32x4([
            b0 ^ ((b0 ^ a0) & m0),
            b1 ^ ((b1 ^ a1) & m1),
            b2 ^ ((b2 ^ a2) & m2),
            b3 ^ ((b3 ^ a3) & m3),
        ])
    }

    pub fn get<const N: usize>(&self) -> u32 {
        self.0[N]
    }

    #[must_use]
    pub fn set<const N: usize>(mut self, value: u32) -> U32x4 {
        self.0[N] = value;
        self
    }

    /// Compares lanes with < operator.
    pub fn less_than(self, other: U32x4) -> U32x4 {
        let [a0, a1, a2, a3] = self.0;
        let [b0, b1, b2, b3] = other.0;
        U32x4([
            if a0 < b0 { u32::MAX } else { 0 },
            if a1 < b1 { u32::MAX } else { 0 },
            if a2 < b2 { u32::MAX } else { 0 },
            if a3 < b3 { u32::MAX } else { 0 },
        ])
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
        U32x4([value; 4])
    }
}

impl From<F32x4> for U32x4 {
    fn from(value: F32x4) -> Self {
        let [v0, v1, v2, v3] = value.0;
        U32x4([
            v0 as u32,
            v1 as u32,
            v2 as u32,
            v3 as u32,
        ])
    }
}

impl From<U32x4> for [u32; 4] {
    fn from(value: U32x4) -> Self {
        value.0
    }
}

impl AddAssign for U32x4 {
    fn add_assign(&mut self, rhs: Self) {
        let [a0, a1, a2, a3] = self.0;
        let [b0, b1, b2, b3] = rhs.0;
        self.0 = [
            a0.wrapping_add(b0),
            a1.wrapping_add(b1),
            a2.wrapping_add(b2),
            a3.wrapping_add(b3),
        ];
    }
}

impl F32x4 {
    #[must_use]
    pub fn set<const N: usize>(mut self, value: f32) -> F32x4 {
        self.0[N] = value;
        self
    }
}

impl From<f32> for F32x4 {
    fn from(value: f32) -> Self {
        F32x4([value; 4])
    }
}

impl From<U32x4> for F32x4 {
    fn from(value: U32x4) -> Self {
        let [v0, v1, v2, v3] = value.0;
        F32x4([
            v0 as f32,
            v1 as f32,
            v2 as f32,
            v3 as f32,
        ])
    }
}

impl Mul for F32x4 {
    type Output = F32x4;

    fn mul(self, rhs: Self) -> Self::Output {
        let [a0, a1, a2, a3] = self.0;
        let [b0, b1, b2, b3] = rhs.0;
        F32x4([
            a0 * b0,
            a1 * b1,
            a2 * b2,
            a3 * b3,
        ])
    }
}
