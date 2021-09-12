import fse from 'fs-extra';
import { action, runInAction } from 'mobx';
import ExifIO from 'src/backend/ExifIO';
import { thumbnailMaxSize } from 'src/config';
import { ClientFile, IMG_EXTENSIONS_TYPE } from 'src/entities/File';
import SharpImageLoader from './SharpImageLoader';
import { generateThumbnailUsingWorker } from './ThumbnailGeneration';
import StreamZip from 'node-stream-zip';

type FormatHandlerType = 'web' | 'sharp' | 'extractEmbeddedThumbnailOnly';

const FormatHandlers: Record<IMG_EXTENSIONS_TYPE, FormatHandlerType> = {
  gif: 'web',
  png: 'web',
  apng: 'web',
  jpg: 'web',
  jpeg: 'web',
  jfif: 'sharp',
  webp: 'web',
  tif: 'sharp',
  tiff: 'sharp',
  bmp: 'web',
  svg: 'web',
  avif: 'sharp',
  exr: 'sharp',
  psd: 'extractEmbeddedThumbnailOnly',
  kra: 'extractEmbeddedThumbnailOnly',
  // xcf: 'extractEmbeddedThumbnailOnly',
};

class ImageLoader {
  sharpImageLoader: SharpImageLoader;

  srcBufferCache: WeakMap<ClientFile, string> = new WeakMap();

  constructor(private exifIO: ExifIO) {
    this.sharpImageLoader = new SharpImageLoader(thumbnailMaxSize);
  }

  /**
   * Ensures a thumbnail exists, will return instantly if already exists.
   * @param file The file to generate a thumbnail for
   * @returns Whether a thumbnail had to be generated
   * @throws When a thumbnail does not exist and cannot be generated
   */
  @action async ensureThumbnail(file: ClientFile): Promise<boolean> {
    const { extension, absolutePath, thumbnailPath, width, height } = runInAction(() => ({
      extension: file.extension,
      absolutePath: file.absolutePath,
      width: file.width,
      height: file.height,
      // remove ?v=1 that might have been added after the thumbnail was generated earlier
      thumbnailPath: file.thumbnailPath.split('?v=1')[0],
    }));
    const thumbnailExists = await fse.pathExists(thumbnailPath);
    if (thumbnailExists) return false;

    // Update the thumbnail path to re-render the image where ever it is used in React
    const updateThumbnailPath = () =>
      runInAction(() => (file.thumbnailPath = `${thumbnailPath}?v=1`));

    const handlerType = FormatHandlers[extension];
    switch (handlerType) {
      case 'web':
        generateThumbnailUsingWorker(file, thumbnailPath);
        // Thumbnail path is updated when the worker finishes (useWorkerListener)
        break;
      case 'sharp':
        console.debug('generating thumbnail through sharp...', absolutePath);
        await this.sharpImageLoader.generateThumbnail(absolutePath, thumbnailPath, width / height);
        updateThumbnailPath();
        console.debug('generated thumbnail through sharp!', absolutePath);
        break;
      case 'extractEmbeddedThumbnailOnly':
        let success = false;
        // Custom logic for specific file formats
        if (extension === 'kra') {
          success = await this.extractKritaThumbnail(absolutePath, thumbnailPath);
        } else {
          // Fallback to extracting thumbnail using exiftool (works for PSD and some other formats)
          await this.exifIO.initialize();
          success = await this.exifIO.extractThumbnail(absolutePath, thumbnailPath);
        }
        if (!success) {
          // There might not be an embedded thumbnail
          return false;
        } else {
          updateThumbnailPath();
        }
        break;
      default:
        console.warn('Unsupported extension', file.absolutePath, file.extension);
    }
    return false;
  }

  async getImageSrc(file: ClientFile) {
    const handlerType = FormatHandlers[file.extension];
    switch (handlerType) {
      case 'web':
        return file.absolutePath;
      case 'sharp':
        if (this.srcBufferCache.has(file)) {
          return this.srcBufferCache.get(file);
        }
        const src = await this.sharpImageLoader.loadAsBuffer(file.absolutePath);
        // Store in cache for a while, so it loads quicker when going back and forth
        this.srcBufferCache.set(file, src);
        setTimeout(() => this.srcBufferCache.delete(file), 60_000);
        return src;
      case 'extractEmbeddedThumbnailOnly':
        // TODO: krita has full image also embedded (mergedimage.png)
        return null;
      default:
        console.warn('Unsupported extension', file.absolutePath, file.extension);
        return null;
    }
  }

  private async extractKritaThumbnail(absolutePath: string, outputPath: string) {
    const zip = new StreamZip.async({ file: absolutePath });
    let success = false;
    console.debug('Extracting thumbnail from', absolutePath);
    try {
      const count = await zip.extract('preview.png', outputPath);
      success = count === 1;
    } catch (e) {
      console.error('Could not extract thumbnail from .kra file', absolutePath, e);
    } finally {
      zip.close().catch(console.warn);
    }
    return success;
  }
}

export default ImageLoader;
