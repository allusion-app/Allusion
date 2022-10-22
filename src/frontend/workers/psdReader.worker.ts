// Based on https://github.com/Agamnentzar/ag-psd#reading-2

import { initializeCanvas, byteArrayToBase64, readPsd } from 'ag-psd';

import { expose } from 'comlink';

export class PsdReaderWorker {
  constructor() {
    initializeCanvas(this.createCanvas, this.createCanvasFromData);
  }

  private createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = new OffscreenCanvas(width, height);
    canvas.width = width;
    canvas.height = height;
    return canvas as unknown as HTMLCanvasElement;
  }

  private createCanvasFromData(data: Uint8Array): HTMLCanvasElement {
    const image = new Image();
    image.src = 'data:image/jpeg;base64,' + byteArrayToBase64(data);
    const canvas = new OffscreenCanvas(image.width, image.height);
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx2D = canvas.getContext('2d');
    if (!ctx2D) {
      throw new Error('Context2D not available!');
    }
    ctx2D.drawImage(image, 0, 0);
    return canvas as unknown as HTMLCanvasElement;
  }

  async readImage(data: Buffer) {
    // TODO: Could also read files here if passing in the path: const data = await fse.readFile(absolutePath);

    // skipping thumbnail and layer images here so we don't have to clear and convert them all
    // before posting data back
    // TODO: look into using the skipThumbnail: false option for faster thumbnail extraction
    const psd = readPsd(data, {
      skipLayerImageData: true,
      skipThumbnail: true,
      useImageData: true,
    });

    // imageData is available through the useImageData flag
    // TODO: compare performance to the normal canvas approach
    const imageData = psd.imageData!;

    return { psd: psd, image: imageData };
  }
}

// https://lorefnon.tech/2019/03/24/using-comlink-with-typescript-and-worker-loader/
expose(PsdReaderWorker, self);
