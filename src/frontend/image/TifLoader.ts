import UTIF from 'utif';
import fse from 'fs-extra';

class TifLoader {
  constructor(private thumbnailSize: number) {}

  /** Returns a string that can be used as img src attribute */
  async loadAsBuffer(path: string) {
    const buf = await fse.readFile(path);
    return this.srcFromBuffer(buf);
  }
  async generateThumbnail(inputPath: string, outputPath: string) {
    const buf = await fse.readFile(inputPath);
    const base64Data = this.srcFromBuffer(buf, {
      width: this.thumbnailSize,
      height: this.thumbnailSize,
    });
    const strippedBase64Data = base64Data.slice('data:image/png;base64,'.length); // TODO: change this when using webp
    await fse.writeFile(outputPath, Buffer.from(strippedBase64Data, 'base64'));
  }

  /**
   * Based on: https://github.com/photopea/UTIF.js/blob/master/UTIF.js#L1119
   * @param buff Image buffer (e.g. from fse.readFile)
   * @returns A base64 string that can be used as Image src attribute
   */
  private srcFromBuffer(
    buff: Buffer,
    targetResolution: 'source' | { width: number; height: number } = 'source',
  ): string {
    const ifds = UTIF.decode(buff); //console.log(ifds);
    let vsns = ifds;
    let ma = 0;
    let page = vsns[0];

    if (ifds[0].subIFD) {
      vsns = vsns.concat(ifds[0].subIFD as any);
    }

    for (let i = 0; i < vsns.length; i++) {
      const img = vsns[i] as any;
      if (img['t258'] == null || img['t258'].length < 3) continue;
      const ar = img['t256'] * img['t257']; // width * height

      if (targetResolution === 'source') {
        // Find the highest resolution entry
        if (ar > ma) {
          ma = ar;
          page = img;
        }
      } else {
        // Otherwise one that comes closest to the target
        const targetSize = targetResolution.width * targetResolution.width;
        const prevDiff = Math.abs(ma - targetSize);
        const curDiff = Math.abs(ar - targetSize);
        if (curDiff < prevDiff) {
          ma = ar;
          page = img;
        }
      }
    }
    (UTIF.decodeImage as any)(buff, page, ifds);
    const rgba = UTIF.toRGBA8(page),
      w = page.width,
      h = page.height;

    const cnv = document.createElement('canvas');
    cnv.width = w;
    cnv.height = h;
    const ctx = cnv.getContext('2d')!;
    const imgd = new ImageData(new Uint8ClampedArray(rgba.buffer), w, h);
    ctx.putImageData(imgd, 0, 0);
    return cnv.toDataURL(); // TODO: same as thumbnailGeneratorWorker: webp @ 0.75 quality
  }
}

export default TifLoader;
