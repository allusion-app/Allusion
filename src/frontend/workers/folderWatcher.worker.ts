import chokidar, { FSWatcher } from 'chokidar';
import { expose } from 'comlink';
import { Stats } from 'fs';
import { BigIntStats } from 'original-fs';
import SysPath from 'path';
import { RECURSIVE_DIR_WATCH_DEPTH } from 'common/config';
import { IMG_EXTENSIONS_TYPE } from 'src/entities/File';
import { FileStats } from '../stores/LocationStore';

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
  async watch(directory: string, extensions: IMG_EXTENSIONS_TYPE[]) {
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
        // We used to set `ignored` with regex patterns, but ran into problem with directories that
        // contain dots in their file name.
        // We ignore everything except image files but chokidar also matches entire directories. If
        // those contain a dot, they will be ignored since they don't end with an image extension.
        // So now we have to use a callback function that also provides `stats` through which we can
        // use to detect whether the path is a file or a directory.

        const basename = SysPath.basename(path);

        // Ignore .dot files and folders.
        if (basename.startsWith('.')) {
          return true;
        }
        // If the path doesn't have an extension (likely a directory), don't ignore it.
        // In the unlikely situation it is a file, we'll filter it out later in the .on('add', ...)
        const ext = SysPath.extname(path).toLowerCase().split('.')[1];
        if (!ext) {
          return false;
        }
        // If the path (file or directory) ends with an image extension, don't ignore it.
        if (extensions.includes(ext as IMG_EXTENSIONS_TYPE)) {
          return false;
        }
        // Otherwise, we need to know whether it is a file or a directory before making a decision.
        // If we don't return anything, this callback will be called a second time, with the stats
        // variable as second argument
        if (stats) {
          // Ignore if
          // * dot directory like `/home/.hidden-directory/` but not `/home/directory.with.dots/` and
          // * not a directory, and not an image file either.
          return !stats.isDirectory() || SysPath.basename(path).startsWith('.');
        }
      },
    });

    const watcher = this.watcher;

    // Make a list of all files in this directory, which will be returned when all subdirs have been traversed
    const initialFiles: FileStats[] = [];

    return new Promise<FileStats[]>((resolve) => {
      watcher
        // we can assume stats exist since we passed alwaysStat: true to chokidar
        .on('add', async (path, stats: Stats | BigIntStats) => {
          if (this.isCancelled) {
            console.log('Cancelling file watching');
            await watcher.close();
            this.isCancelled = false;
          }

          const ext = SysPath.extname(path).toLowerCase().split('.')[1];
          if (extensions.includes(ext as IMG_EXTENSIONS_TYPE)) {
            /**
             * Chokidar doesn't detect renames as a unique event, it detects a "remove" and "add" event.
             * We use the "ino" field of file stats to detect whether a new file is a previously detected file that was moved/renamed
             * Relevant issue https://github.com/paulmillr/chokidar/issues/303#issuecomment-127039892
             * Inspiration for using "ino" from https://github.com/chrismaltby/gb-studio/pull/576
             * The stats given by chokidar is supposedly BigIntStats for Windows (since the ino is a 64 bit integer),
             * https://github.com/paulmillr/chokidar/issues/844
             * But my tests don't confirm this: console.log('ino', stats.ino, typeof stats.ino); -> type is number
             */

            const fileStats: FileStats = {
              absolutePath: path,
              dateCreated: stats.birthtime,
              dateModified: stats.mtime,
              size: Number(stats.size),
              ino: stats.ino.toString(),
            };

            if (this.isReady) {
              ctx.postMessage({ type: 'add', value: fileStats });
            } else {
              initialFiles.push(fileStats);
            }
          }
        })
        // .on('change', (path: string) => console.debug(`File ${path} has been changed`))
        // TODO: on directory change: update location hierarchy list
        .on('unlink', (path: string) => ctx.postMessage({ type: 'remove', value: path }))
        .on('ready', () => {
          this.isReady = true;
          resolve(initialFiles);

          // Clear memory: initialFiles no longer needed
          // Doing this immediately after resolving will resolve with an empty list for some reason
          // So, do it with a timeout. Would be nicer to do it after an acknowledgement from the main thread
          setTimeout(() => initialFiles.splice(0, initialFiles.length), 5000);
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
