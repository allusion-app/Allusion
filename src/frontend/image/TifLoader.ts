import UTIF from 'utif';
import { Loader } from './util';

/** Tags that exist in every tiff file. */
const enum BaselineTag {
  Width = 't256',
  Height = 't257',
  BitsPerSample = 't258',
}

class TifLoader implements Loader {
  init(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Based on: https://github.com/photopea/UTIF.js/blob/master/UTIF.js#L1119
   * @param buffer Image buffer (e.g. from fse.readFile)
   */
  decode(buffer: ArrayBuffer): Promise<ImageData> {
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
    return Promise.resolve(new ImageData(new Uint8ClampedArray(rgba.buffer), width, height));
  }
}

export default TifLoader;
