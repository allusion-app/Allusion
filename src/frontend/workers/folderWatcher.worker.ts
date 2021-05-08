import chokidar, { FSWatcher } from 'chokidar';
import { expose } from 'comlink';
import { Stats } from 'fs';
import SysPath from 'path';
import { RECURSIVE_DIR_WATCH_DEPTH } from 'src/config';
import { IMG_EXTENSIONS, IMG_EXTENSIONS_TYPE } from 'src/entities/File';

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

    // Replace backslash with forward slash, recommendeded by chokidar
    // See docs for the .watch method: https://github.com/paulmillr/chokidar#api
    directory = directory.replace(/\\/g, '/');

    // Watch for files being added/changed/removed:
    // Usually you'd include a glob in the watch argument, e.g. `directory/**/.{jpg|png|...}`, but we cannot use globs unfortunately (see disableGlobbing)
    // Instead, we ignore everything but image files in the `ignored` option
    this.watcher = chokidar.watch(directory, {
      disableGlobbing: true, // needed in order to support directories with brackets, quotes, asterisks, etc.
      alwaysStat: true, // we need stats anyways during importing
      depth: RECURSIVE_DIR_WATCH_DEPTH, // not really needed: added as a safety measure for infinite recursion between symbolic links
      ignored: (path: string, stats?: Stats) => {
        // We used to set `ignored` with regex patterns, but ran into problem with directories that include dots:
        // - we ignore everything but image files, but:
        // - chokidar also matches entire directories: if those contain a dot, it will be ignored too, since they don't end with an image extension
        // So now we use a callback function that also provides `stats` through which we can detect whether the path is a file or a directory

        const ext = SysPath.extname(path).toLowerCase();
        // If the path doesn't have an extension: it's likely a directory: don't ignore
        // In the unlikely situation it's a file, we'll filter it out later in the .on('add', ...)
        if (!ext) return false;
        // If the path (file or directory) ends with an image extension: don't ignore it
        if (IMG_EXTENSIONS.includes(ext as IMG_EXTENSIONS_TYPE)) return false;

        // Otherwise, we need to know whether it is a file or a directory before making a decision
        // If we don't return anything, this callback will be called a second time, with the stats variable as second argument
        if (stats) {
          if (stats.isDirectory()) {
            // Ignore dot directories like `/home/.hidden-directory/` but not `/home/directory.with.dots/`
            if (SysPath.basename(path).startsWith('.')) return true;
          } else {
            // Not a directory, and not an image file either. Ignore!
            return true;
          }
        }
      },
    });

    const watcher = this.watcher;

    // Make a list of all files in this directory, which will be returned when all subdirs have been traversed
    const initialFiles: string[] = [];

    return new Promise<string[]>((resolve) => {
      watcher
        .on('add', async (path) => {
          // TODO: We already get file stats here as second arg, no need to get those later for importing in DB
          if (this.isCancelled) {
            console.log('Cancelling file watching');
            await watcher.close();
            this.isCancelled = false;
          }
          const ext = SysPath.extname(path).toLowerCase() as IMG_EXTENSIONS_TYPE;
          if (IMG_EXTENSIONS.includes(ext)) {
            if (this.isReady) {
              ctx.postMessage({ type: 'add', value: path });
            } else {
              initialFiles.push(path);
            }
          }
        })
        // .on('change', (path: string) => console.debug(`File ${path} has been changed`))
        // TODO: on directory change: update location hierarchy list
        .on('unlink', (path: string) => ctx.postMessage({ type: 'remove', value: path }))
        .on('ready', () => {
          this.isReady = true;
          resolve(initialFiles);

          // TODO: Clear memory: initialFiles no longer needed
          // Update: tried it, didn't work as expected: list was emptied before sent back to main thread
          // maybe send a message from main thread after initialization is finished instead?
          // initialFiles.splice(0, initialFiles.length);
        })
        .on('error', (error) => {
          console.error('Error fired in watcher', directory, error);
          ctx.postMessage({ type: 'error', value: error });
        });
    });
  }
}

// https://lorefnon.tech/2019/03/24/using-comlink-with-typescript-and-worker-loader/
expose(FolderWatcherWorker, self);
