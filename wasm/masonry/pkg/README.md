# Masonry Layout

TLDR:

> `yarn build:masonry`

## Caveats

This WebAssembly module works only with Chrome 91+ because it uses modules in the web worker, shared memory and SIMD for the layout computation.

## Building

It seems like the current version of wasm-opt shipped with wasm-pack does not handle SIMD. Therefore, the wasm-bindgen CLI is directly invoked.

A `build:masonry` script was added to `package.json`, so you can compile the Rust code to WASM. The `.cargo/config.toml` and `rust-toolchain` file will be picked up by cargo and download the appropriate toolchain and re-compile the standard library to enable all features needed to use atomics.
