# Building

The default export `wasm-pack build` command doesn't play nicely with electron,
the `wasm-pack build --target web` maybe does?

The WASM-pack webpack plugin doesn't seem to re-load the file in the build directory, need to copy it manually for now after every re-compile:
`cp .\pkg\masonry_bg.wasm ..\..\build\wasm\masonry\pkg\masonry_bg.wasm`
