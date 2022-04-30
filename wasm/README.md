# Webassembly Development

Webassembly is used where JavaScript tends to fall short - **constant** performance. Emphasis is on constant. Modern JavaScript engines are incredible given the extreme dynamism of the language. However, for long running or extreme CPU intensive tasks, the pressure on the garbage collector will decrease performance over time. It is possible to write performance oriented code but it is rather cumbersome and byte level control that is needed for space saving techniques are thrown off by implicit number casts.

That is also why Rust is the choice for our Webassembly modules. It is very easy to create Webassembly modules and re-use code from other Rust libraries but most of all it offers great performance while looking like high level code.

## Getting Started

Developing and building Webassembly modules assumes a functioning Rust toolchain is installed as well the existence of `cargo` and `rustup`. The [installation guide](https://www.rust-lang.org/tools/install) on the website shows all the necessary steps to get up and running.

## wasm-build

The Rust Webassembly ecosystem is in a weird state, so development is not as fast as it could be. This tool aims to allow more exotic use cases and automate packaging the build artifacts, which `wasm-pack` cannot accomadate for.

### Usage

The easiest way to build a Webassembly module is to use the `wasm-build` yarn script. This script builds and runs the the `wasm-build` CLI tool. It is not very flexible since a lot of things are hard coded. However, you can just change the code as long as you can write Rust or just bug me (@hummingly).

The following assumes you are in the top level directory of Allusion and not in the wasm folder. For examples check out the build scripts in the `package.json` file.

```
yarn wasm-build CRATE_NAME [PACKAGE_NAME] [-- RUSTC_FLAGS]
```

- CRATE_NAME: The name of the crate or to be more exact the name of the folder where the crate is in the `wasm` directory.
- PACKAGE_NAME: (Optional) The name of the output directory in the `wasm/packages` directory. If it is omitted it will use the CRATE_NAME argument.
- RUSTC_FLAGS: (Optional) Compile flags passed directly to rustc. This is only useful for more complicated build setups.

The build artifacts are saved in the `wasm/packages` directory. For now they need to be comitted too.

### Caveats

#### Feature detection

Webassembly does not support detecting at runtime if SIMD instructions are supported. This means different versions of a Webassembly module with and without a feature must be compiled and then features must be detected in application code. We only got so far only one person where SIMD is not running, so this should be rarely the case.

#### Updating wasm-bindgen

If you want to update wasm-bindgen, you have to do that for all crates and update the version constant in `wasm-build`. Yes, the cargo manifest could be read to check for the version. No, I do not feel bothered enough to automate that.

#### Updating wasm-opt

Right now the executable binaries are committed manually. Just copy the `wasm-opt` binary from the [binaryen releases page](https://github.com/WebAssembly/binaryen/releases) for each platform if you want to update. It could be done automatically but this will happen maybe once in a while.