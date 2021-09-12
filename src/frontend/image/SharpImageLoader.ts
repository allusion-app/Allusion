import sharp from 'sharp';
import { thumbnailMaxSize } from 'src/config';

class SharpImageLoader {
  constructor(private thumbnailSize: number) {}

  /** Returns a string that can be used as img src attribute */
  async loadAsBuffer(path: string) {
    // TODO: look into performance, maybe it's better to save to disk somewhere
    // Want to try this out first to avoid disk write and storage overhead
    const buffer = await sharp(path).webp().toBuffer();
    return 'data:image/webp;base64,' + buffer.toString('base64');
  }
  async generateThumbnail(inputPath: string, outputPath: string, aspectRatio: number) {
    return sharp(inputPath)
      .resize({
        ...(aspectRatio > 1 ? { width: thumbnailMaxSize } : { height: thumbnailMaxSize }),
        fit: 'contain',
      })
      .webp()
      .toFile(outputPath);
  }
}

export default SharpImageLoader;
