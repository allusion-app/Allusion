import UTIF from 'utif';
import fse from 'fs-extra';
import { thumbnailFormat } from 'src/config';
import { computeQuality, dataToCanvas, getSampledCanvas } from './util';

/** Tags that exist in every tiff file. */
const enum BaselineTag {
  Width = 't256',
  Height = 't257',
  BitsPerSample = 't258',
}

class TifLoader {
  /** Returns a string that can be used as img src attribute */
  async getBlob(path: string): Promise<string> {
    const buf = await fse.readFile(path);
    const data = imageFromBuffer(buf);
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
    const buffer = await fse.readFile(inputPath);
    const data = imageFromBuffer(buffer);
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

export default TifLoader;

/**
 * Based on: https://github.com/photopea/UTIF.js/blob/master/UTIF.js#L1119
 * @param buffer Image buffer (e.g. from fse.readFile)
 */
function imageFromBuffer(buffer: ArrayBuffer): ImageData {
  const ifds = UTIF.decode(buffer);
  const vsns = ifds[0].subIFD ? ifds.concat(ifds[0].subIFD as any) : ifds;

  let page = vsns[0];
  let maxArea = 0;
  for (const img of vsns) {
    if ((img[BaselineTag.BitsPerSample] as number[]).length < 3) {
      continue;
    }
    // Actually the width and height is a an array with one element but pointer magic returns the
    // correct value anyways.
    const area = (img[BaselineTag.Width] as number) * (img[BaselineTag.Height] as number);

    // Find the highest resolution entry
    if (area > maxArea) {
      maxArea = area;
      page = img;
    }
  }

  (UTIF.decodeImage as any)(buffer, page);
  const rgba = UTIF.toRGBA8(page);
  const { width, height } = page;
  return new ImageData(new Uint8ClampedArray(rgba.buffer), width, height);
}
