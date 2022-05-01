#[cfg(target_feature = "simd128")]
mod wide;
#[cfg(not(target_feature = "simd128"))]
mod vec;

#[cfg(target_feature = "simd128")]
pub use wide::*;
#[cfg(not(target_feature = "simd128"))]
pub use vec::*;