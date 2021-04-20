# Masonry Layout

TLDR:

> `yarn build:wasm`

## Caveats

This only works with Chrome 80+ because we use modules in our web worker. It is possible with `importScript` which can be implemented if requested and added as build flag. Be aware that this will significantly bloat the WebAssembly file.

## Building

The default export `wasm-pack build` command doesn't play nicely with electron/webpack,
after some experimenting: `wasm-pack build --target web` does work!

I added a `build:wasm` script to `package.json` that you can run to compile the Rust code to WASM. The `.cargo/config.toml` and `rust-toolchain` file will be picked up by cargo and download the appropriate toolchain and re-compile the standard library to enable all features needed to use shared memory.
