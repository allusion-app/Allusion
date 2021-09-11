import sharp from 'sharp';

class SharpImageLoader {
  constructor(private thumbnailSize: number) {}
  /** Returns a string that can be used as img src attribute */
  async loadAsBuffer(path: string) {
    // TODO: look into performance, maybe it's better to save to disk somewhere
    // Want to try this out first to avoid disk write and storage overhead
    const buffer = await sharp(path).webp().toBuffer();
    return buffer.toString('base64');
  }
  async generateThumbnail(inputPath: string, outputPath: string) {
    return sharp(inputPath)
      .resize({
        width: this.thumbnailSize,
        height: this.thumbnailSize, // todo: desired: max dimension becaomes thumbnailSize, other one respectively smaller
        withoutEnlargement: true,
      })
      .webp()
      .toFile(outputPath);
  }
}

export default SharpImageLoader;
