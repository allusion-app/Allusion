use std::env;
use std::fs;
use std::io;
use std::process::Command;

const WASM_BINDGEN_VERSION: &str = "0.2.80";
const OUTPUT_DIR: &str = "packages";

fn main() {
    // Install wasm-bindgen-cli
    execute_command(
        "Install wasm-bindgen-cli",
        Command::new("cargo")
            .args(["install", "wasm-bindgen-cli"])
            .args(["--version", WASM_BINDGEN_VERSION]),
    );

    // Parse command line arguments
    let args = env::args().skip(1).collect::<Vec<String>>();
    // Pattern matching does not work on a String but on a &str.
    // The ease of subslice pattern matching is the extra allocation worth it.
    let args = args.iter().map(|arg| arg.as_str()).collect::<Vec<&str>>();
    let (crate_name, package_name, rustc_flags) = match args.as_slice() {
        [crate_name] => (crate_name, crate_name, [].as_slice()),
        [crate_name, "--", rustc_flags @ ..] => (crate_name, crate_name, rustc_flags),
        [crate_name, package_name] => (crate_name, package_name, [].as_slice()),
        [crate_name, package_name, "--", rustc_flags @ ..] => {
            (crate_name, package_name, rustc_flags)
        }
        _ => {
            println!("Invalid arguments were passed. Valid arguments are:");
            println!("INPUT_CRATE_NAME [OUTPUT_PACKAGE_NAME] [-- RUSTC_FLAGS]");
            return;
        }
    };

    // Compile package
    let crate_path = ["..", &crate_name, ""].join("/");
    let mut cargo = Command::new("cargo");
    cargo.current_dir(&crate_path);

    if let Some(toolchain) = setup_toolchain(&crate_path) {
        cargo.arg(format!("+{}", toolchain));
    }

    cargo
        .arg("rustc")
        .args(["--target", "wasm32-unknown-unknown"])
        // .arg("--verbose")
        .arg("--release");

    if !rustc_flags.is_empty() {
        cargo.arg("--").args(rustc_flags);
    }

    execute_command("Building Webassembly module", &mut cargo);

    // Generate wasm-bindgen glue code for host environment
    let wasm_name = crate_name.replace("-", "_");
    let target_path = format!(
        "{}/target/wasm32-unknown-unknown/release/{}.wasm",
        crate_name, wasm_name
    );
    let package_path = [OUTPUT_DIR, &package_name].join("/");

    execute_command(
        "Generate bindings for host environment",
        Command::new("wasm-bindgen")
            .current_dir("..")
            .args(["--out-dir", &package_path])
            .args(["--target", "web"])
            .args([
                "--omit-default-module-path",
                "--remove-name-section",
                "--remove-producers-section",
            ])
            .arg(target_path),
    );

    // Optimize generated Webassembly module
    let output_path = format!("{}/{}_bg.wasm", package_path, wasm_name);
    #[cfg(target_os = "windows")]
    let os = "windows";
    #[cfg(target_os = "macos")]
    let os = "macos";
    #[cfg(target_os = "linux")]
    let os = "linux";

    execute_command(
        "Optimizing Webassembly module",
        Command::new(format!("./wasm-opt/{}/wasm-opt", os))
            .current_dir("..")
            .arg(&output_path)
            .arg("-O")
            .args(["--output", &output_path]),
    )
}

/// Setups the toolchain based on the rust-toolchain.toml file if it exists and returns the toolchain if set.
///
/// The rust-toolchain.toml file is ignored because cargo is invoked in the wasm-build directory and not in the
/// directory where the file is stored. Therefore, parsing and setting up the toolchain has to be done manually if a
/// rust-toolchain.toml exists.
fn setup_toolchain(crate_path: &str) -> Option<String> {
    use std::io::BufRead;

    let file = match fs::File::open([crate_path, "rust-toolchain.toml"].join("/")) {
        Ok(file) => file,
        Err(error) => {
            if error.kind() != io::ErrorKind::NotFound {
                panic!(
                    "Reading the project toolchain file (rust-toolchain.toml) failed with:\n{}",
                    error
                );
            }
            // Ensure the wasm32-unknown-unknown target is installed
            execute_command(
                "Adding wasm32-unknown-unknown target",
                Command::new("rustup").args(["target", "add", "wasm32-unknown-unknown"]),
            );
            return None;
        }
    };

    let lines = io::BufReader::new(file).lines();
    let mut channel = String::new();
    let mut components = Vec::new();
    let mut profile = String::new();

    fn trim_value(value: &str) -> &str {
        let is_delimiter = |c: char| c.is_whitespace() || c == '\"';
        value
            .trim_start_matches(is_delimiter)
            .trim_end_matches(is_delimiter)
    }

    for line in lines {
        if let Ok(line) = line {
            if let Some((key, value)) = line.split_once("=") {
                let (key, value) = (key.trim(), value.trim());
                match key {
                    "channel" => {
                        let value = trim_value(value);
                        channel = value.to_string();
                    }
                    "components" => match value.as_bytes() {
                        [b'[', .., b']'] => {
                            let list = value[1..value.len() - 2].split(",");
                            for value in list.map(trim_value) {
                                components.push(value.to_string());
                            }
                        }
                        _ => {}
                    },
                    "profile" => match value {
                        "minimal" | "default" | "complete" => {
                            profile = trim_value(value).to_string()
                        }
                        _ => {}
                    },
                    _ => {}
                }
            }
        }
    }

    if !channel.is_empty() {
        let mut command = Command::new("rustup");
        command.args(["toolchain", "install", &channel]);
        execute_command(
            "Installing toolchain",
            if !profile.is_empty() {
                command.args(["--profile", &profile])
            } else {
                &mut command
            },
        );
    } else {
        if !components.is_empty() {
            execute_command(
                "Adding components",
                Command::new("rustup")
                    .args(["component", "add"])
                    .args(&components),
            )
        };
    }
    execute_command(
        "Adding wasm32-unknown-unknown target",
        Command::new("rustup").args(["target", "add", "wasm32-unknown-unknown"]),
    );

    (!channel.is_empty()).then(|| channel)
}

fn execute_command(process_step: &str, command: &mut Command) {
    println!("{}...", process_step);
    match command.output() {
        Ok(output) => {
            if !output.stderr.is_empty() {
                println!("{}", String::from_utf8_lossy(&output.stderr));
            }
        }
        Err(error) => {
            panic!("{} failed with:\n{}", process_step, error);
        }
    }
}
