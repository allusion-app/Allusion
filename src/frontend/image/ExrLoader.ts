import { default as init, InitOutput, decode } from 'wasm/decode-exr/pkg/decode_exr';
import ExrWASM from 'wasm/decode-exr/pkg/decode_exr_bg.wasm';
import fse from 'fs-extra';
import { computeQuality, dataToCanvas, getSampledCanvas } from './util';
import { thumbnailFormat } from 'src/config';

class ExrLoader {
  private WASM: InitOutput | undefined = undefined;

  constructor() {
    init(ExrWASM).then((loader) => {
      console.debug('Init exr WASM...');
      this.WASM = loader;
    });
  }

  async getBlob(path: string): Promise<string> {
    if (!this.WASM) {
      throw new Error('Uninitiated WebAssembly module!');
    }
    const buffer = await fse.readFile(path);
    const data = decode(buffer);
    const blob = await new Promise((resolve, reject) =>
      dataToCanvas(data).toBlob(
        (blob) => (blob !== null ? resolve(blob) : reject()),
        'image/avif',
        1.0,
      ),
    );
    return URL.createObjectURL(blob);
  }

  async generateThumbnail(
    inputPath: string,
    outputPath: string,
    thumbnailSize: number,
  ): Promise<void> {
    if (!this.WASM) {
      throw new Error('Uninitiated WebAssembly module!');
    }
    const buffer = await fse.readFile(inputPath);
    const data = decode(buffer);
    const sampledCanvas = getSampledCanvas(dataToCanvas(data), thumbnailSize);
    const quality = computeQuality(sampledCanvas, thumbnailSize);
    const blobBuffer = await new Promise<ArrayBuffer>((resolve, reject) =>
      sampledCanvas.toBlob(
        (blob) => (blob !== null ? resolve(blob.arrayBuffer()) : reject()),
        `image/${thumbnailFormat}`,
        quality, // Allows to further compress image
      ),
    );
    return fse.writeFile(outputPath, Buffer.from(blobBuffer));
  }
}

export default ExrLoader;
