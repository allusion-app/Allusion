import chokidar, { FSWatcher } from 'chokidar';
import { expose } from 'comlink';
import SysPath from 'path';
import { RECURSIVE_DIR_WATCH_DEPTH } from 'src/config';
import { IMG_EXTENSIONS } from 'src/entities/File';

const ctx: Worker = self as any;

export class FolderWatcherWorker {
  private watcher?: FSWatcher;
  // Whether the initial scan has been completed, and new/removed files are being watched
  private isReady = false;
  private isCancelled = false;

  cancel() {
    this.isCancelled = true;
  }

  async close() {
    this.watcher?.close();
  }

  /** Returns all supported image files in the given directly, and callbacks for new or removed files */
  async watch(directory: string) {
    this.isCancelled = false;
    // Only watch for images files, something like /^.*\.(?!jpg$|png$)[^.]+$/i -> https://regexr.com/5pvbu
    const imageExtensionIgnorePattern = new RegExp(
      `^.*\\.(?!${IMG_EXTENSIONS.join('$|')}$)[^.]+$`,
      'i',
    );

    // Watch for changes
    this.watcher = chokidar.watch(directory, {
      // cwd: directory,
      disableGlobbing: true, // needed in order to support folders with brackets, quotes, etc.
      depth: RECURSIVE_DIR_WATCH_DEPTH,
      ignored: [
        // Ignore dot files. Also dot folders?
        /(^|[\/\\])\../,
        // And non-image files
        imageExtensionIgnorePattern,
      ],
    });

    const watcher = this.watcher;

    // Make a list of all files in this directory, which will be returned when all subdirs have been traversed
    const initialFiles: string[] = [];

    return new Promise<string[]>((resolve) => {
      watcher
        .on('add', async (path: string) => {
          if (this.isCancelled) {
            console.log('Cancelling file watching');
            await watcher.close();
            this.isCancelled = false;
          }
          if (IMG_EXTENSIONS.some((ext) => SysPath.extname(path).toLowerCase().endsWith(ext))) {
            if (this.isReady) {
              ctx.postMessage({ type: 'add', value: path });
            } else {
              initialFiles.push(path);
            }
          }
        })
        // .on('change', (path: string) => console.debug(`File ${path} has been changed`))
        .on('unlink', (path: string) => ctx.postMessage({ type: 'remove', value: path }))
        .on('ready', () => {
          this.isReady = true;
          resolve(initialFiles);
        })
        .on('error', (error) => ctx.postMessage({ type: 'error', value: error }));
    });
  }
}

// https://lorefnon.tech/2019/03/24/using-comlink-with-typescript-and-worker-loader/
expose(FolderWatcherWorker, self);

export default null as any;
