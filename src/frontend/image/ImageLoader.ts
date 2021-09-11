import fse from 'fs-extra';
import { action, runInAction } from 'mobx';
import ExifIO from 'src/backend/ExifIO';
import { thumbnailMaxSize } from 'src/config';
import { ClientFile, IMG_EXTENSIONS_TYPE } from 'src/entities/File';
import SharpImageLoader from './SharpImageLoader';
import { generateThumbnailUsingWorker } from './ThumbnailGeneration';

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
  exr: 'sharp',
  psd: 'extractEmbeddedThumbnailOnly',
  kra: 'extractEmbeddedThumbnailOnly',
};

class ImageLoader {
  sharpImageLoader: SharpImageLoader;
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
    // remove ?v=1 that might have been added after the thumbnail was generated earlier
    const thumbnailPath = file.thumbnailPath.split('?v=1')[0];
    const thumbnailExists = await fse.pathExists(thumbnailPath);
    if (thumbnailExists) return false;

    // Update the thumbnail path to re-render the image where ever it is used in React
    const updateThumbnailPath = () =>
      runInAction(() => (file.thumbnailPath = `${thumbnailPath}?v=1`));

    const handlerType = FormatHandlers[file.extension];
    switch (handlerType) {
      case 'web':
        generateThumbnailUsingWorker(file, thumbnailPath);
      // Thumbnail path is updated when the worker finishes (useWorkerListener)
      case 'sharp':
        console.log('generating thumbnail through sharp...', file.absolutePath);
        await this.sharpImageLoader.generateThumbnail(file.absolutePath, thumbnailPath);
        updateThumbnailPath();
        console.log('generated thumbnail through sharp!', file.absolutePath);
      case 'extractEmbeddedThumbnailOnly':
        const success = await this.exifIO.extractThumbnail(file.absolutePath, thumbnailPath);
        if (!success) {
          // There might not be an embedded thumbnail
          return false;
        } else {
          updateThumbnailPath();
        }
      default:
        console.warn('Unsupported extension', file.absolutePath, file.extension);
        return false;
    }
  }

  async getImageSrc(file: ClientFile) {
    const handlerType = FormatHandlers[file.extension];
    switch (handlerType) {
      case 'web':
        return file.absolutePath;
      case 'sharp':
        return this.sharpImageLoader.loadAsBuffer(file.absolutePath);
      case 'extractEmbeddedThumbnailOnly':
        return null;
      default:
        console.warn('Unsupported extension', file.absolutePath, file.extension);
        return null;
    }
  }
}

export default ImageLoader;
