mod wide;
mod vec;

#[cfg(target_feature = "simd128")]
pub use wide::*;
#[cfg(not(target_feature = "simd128"))]
pub use vec::*;