#![deny(clippy::pedantic)]
#![no_std]
#![feature(stdsimd)]
extern crate alloc;
extern crate core;

mod layout;
mod masonry_worker;
mod sync;
mod util;
