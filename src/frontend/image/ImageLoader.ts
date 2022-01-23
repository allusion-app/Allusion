import fse from 'fs-extra';
import { action } from 'mobx';
import ExifIO from 'src/backend/ExifIO';
import { thumbnailMaxSize } from 'src/config';
import { ClientFile, IFile, IMG_EXTENSIONS_TYPE } from 'src/entities/File';
import TifLoader from './TifLoader';
import { generateThumbnailUsingWorker } from './ThumbnailGeneration';
import StreamZip from 'node-stream-zip';
import ExrLoader from './ExrLoader';
import { generateThumbnail, getBlob } from './util';

type FormatHandlerType = 'web' | 'tifLoader' | 'exrLoader' | 'extractEmbeddedThumbnailOnly';

const FormatHandlers: Record<IMG_EXTENSIONS_TYPE, FormatHandlerType> = {
  gif: 'web',
  png: 'web',
  apng: 'web',
  jpg: 'web',
  jpeg: 'web',
  jfif: 'web',
  webp: 'web',
  bmp: 'web',
  svg: 'web',
  tif: 'tifLoader',
  tiff: 'tifLoader',
  psd: 'extractEmbeddedThumbnailOnly',
  kra: 'extractEmbeddedThumbnailOnly',
  // xcf: 'extractEmbeddedThumbnailOnly',
  exr: 'exrLoader',
  // avif: 'sharp',
};

type ObjectURL = string;

class ImageLoader {
  private tifLoader: TifLoader;
  private exrLoader: ExrLoader;

  private srcBufferCache: WeakMap<ClientFile, ObjectURL> = new WeakMap();
  private bufferCacheTimer: WeakMap<ClientFile, number> = new WeakMap();

  constructor(private exifIO: ExifIO) {
    this.tifLoader = new TifLoader();
    this.exrLoader = new ExrLoader();
    this.ensureThumbnail = action(this.ensureThumbnail.bind(this));
  }

  async init(): Promise<void> {
    await Promise.all([this.tifLoader.init(), this.exrLoader.init()]);
  }

  needsThumbnail(file: IFile) {
    // Not using thumbnails for gifs, since they're mostly used for animations, which doesn't get preserved in thumbnails
    if (file.extension === 'gif') {
      return false;
    }

    return (
      FormatHandlers[file.extension] !== 'web' ||
      file.width > thumbnailMaxSize ||
      file.height > thumbnailMaxSize
    );
  }

  /**
   * Ensures a thumbnail exists, will return instantly if already exists.
   * @param file The file to generate a thumbnail for
   * @returns Whether a thumbnail had to be generated
   * @throws When a thumbnail does not exist and cannot be generated
   */
  async ensureThumbnail(file: ClientFile): Promise<boolean> {
    const { extension, absolutePath, thumbnailPath } = {
      extension: file.extension,
      absolutePath: file.absolutePath,
      // remove ?v=1 that might have been added after the thumbnail was generated earlier
      thumbnailPath: file.thumbnailPath.split('?v=1')[0],
    };

    if (await fse.pathExists(thumbnailPath)) {
      return false;
    }

    const handlerType = FormatHandlers[extension];
    switch (handlerType) {
      case 'web':
        generateThumbnailUsingWorker(file, thumbnailPath);
        // Thumbnail path is updated when the worker finishes (useWorkerListener)
        break;
      case 'tifLoader':
        await generateThumbnail(this.tifLoader, absolutePath, thumbnailPath, thumbnailMaxSize);
        updateThumbnailPath(file, thumbnailPath);
        break;
      case 'exrLoader':
        await generateThumbnail(this.exrLoader, absolutePath, thumbnailPath, thumbnailMaxSize);
        updateThumbnailPath(file, thumbnailPath);
        break;
      case 'extractEmbeddedThumbnailOnly':
        let success = false;
        // Custom logic for specific file formats
        if (extension === 'kra') {
          success = await this.extractKritaThumbnail(absolutePath, thumbnailPath);
        } else {
          // Fallback to extracting thumbnail using exiftool (works for PSD and some other formats)
          success = await this.exifIO.extractThumbnail(absolutePath, thumbnailPath);
        }
        if (!success) {
          // There might not be an embedded thumbnail
          throw new Error('Could not generate or extract thumbnail');
        } else {
          updateThumbnailPath(file, thumbnailPath);
        }
        break;
      default:
        console.warn('Unsupported extension', file.absolutePath, file.extension);
        throw new Error('Unsupported extension ' + file.absolutePath);
    }
    return true;
  }

  async getImageSrc(file: ClientFile): Promise<string | undefined> {
    const handlerType = FormatHandlers[file.extension];
    switch (handlerType) {
      case 'web':
        return file.absolutePath;
      case 'tifLoader': {
        const src =
          this.srcBufferCache.get(file) ?? (await getBlob(this.tifLoader, file.absolutePath));
        // Store in cache for a while, so it loads quicker when going back and forth
        this.updateCache(file, src);
        return src;
      }
      case 'exrLoader': {
        const src =
          this.srcBufferCache.get(file) ?? (await getBlob(this.exrLoader, file.absolutePath));
        // Store in cache for a while, so it loads quicker when going back and forth
        this.updateCache(file, src);
        return src;
      }
      // TODO: krita has full image also embedded (mergedimage.png)
      case 'extractEmbeddedThumbnailOnly':
        return undefined;
      default:
        console.warn('Unsupported extension', file.absolutePath, file.extension);
        return undefined;
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

  private updateCache(file: ClientFile, src: ObjectURL) {
    this.srcBufferCache.set(file, src);
    const timer = this.bufferCacheTimer.get(file);
    clearTimeout(timer);
    this.bufferCacheTimer.set(
      file,
      window.setTimeout(() => {
        URL.revokeObjectURL(src);
        this.srcBufferCache.delete(file);
      }, 60_000),
    );
  }
}

export default ImageLoader;

// Update the thumbnail path to re-render the image where ever it is used in React
const updateThumbnailPath = action((file: ClientFile, thumbnailPath: string) => {
  file.thumbnailPath = `${thumbnailPath}?v=1`;
});
