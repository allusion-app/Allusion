import { default as init, decode } from 'wasm/exr-decoder/pkg/exr_decoder';
import ExrWASM from 'wasm/exr-decoder/pkg/exr_decoder_bg.wasm';
import { Loader } from './util';

class ExrLoader implements Loader {
  async init(): Promise<void> {
    await init(ExrWASM);
  }

  decode(buffer: Buffer): ImageData {
    return decode(buffer);
  }
}

export default ExrLoader;
