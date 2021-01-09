# Building

The default export `wasm-pack build` command doesn't play nicely with electron/webpack,
after some experimenting: `wasm-pack build --target web` does work!

I added a `build:wasm` script to `package.json` that you can run to compile the Rust code to WASM.
It will also copy it to the build folder, so you can just reload the window afterwards!
Add `--release` for a production build!

TLDR:

> `yarn build:wasm`
