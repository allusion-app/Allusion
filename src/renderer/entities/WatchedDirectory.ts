import { ID, IIdentifiable, ISerializable } from './ID';
import { IReactionDisposer, reaction } from 'mobx';
import WatchedDirectoryStore from '../frontend/stores/WatchedDirectoryStore';
import chokidar, { FSWatcher } from 'chokidar';
import { RECURSIVE_DIR_WATCH_DEPTH } from '../../config';

export interface IWatchedDirectory extends IIdentifiable {
  id: ID;
  path: string;
  recursive: boolean;
  dateAdded: Date;
  tagToAdd?: ID;
}

export class DbWatchedDirectory implements IWatchedDirectory {
  constructor(
    public id: ID,
    public path: string,
    public recursive: boolean,
    public dateAdded: Date,
    public tagToAdd?: ID,
  ) { }
}

export class ClientWatchedDirectory implements IWatchedDirectory, ISerializable<DbWatchedDirectory> {
  saveHandler: IReactionDisposer;
  watcher?: FSWatcher;
  autoSave = true;
  // Whether the initial scan has been completed
  isReady = false;

  constructor(
    public store: WatchedDirectoryStore,
    public id: ID,
    public path: string,
    public recursive: boolean,
    public dateAdded: Date,
    public tagToAdd?: ID,
  ) {
    // observe all changes to observable fields
    this.saveHandler = reaction(
      // We need to explicitly define which values this reaction should react to
      () => this.serialize(),
      // Then update the entity in the database
      (dir) => {
        if (this.autoSave) {
          this.store.backend.saveWatchedDirectory(dir);
        }
      },
    );
  }

  async init() {
    return this.watchDirectory(this.path, this.recursive);
  }

  serialize(): IWatchedDirectory {
    return {
      id: this.id,
      path: this.path,
      recursive: this.recursive,
      dateAdded: this.dateAdded,
      tagToAdd: this.tagToAdd,
    };
  }

  private watchDirectory(inputPath: string, recursive: boolean): Promise<string[]> {
    // Watch for folder changes
    this.watcher = chokidar.watch(
      inputPath,
      {
        depth: recursive ? RECURSIVE_DIR_WATCH_DEPTH : undefined,
        // Ignore dot files. Also dot folders?
        // Todo: Ignore everything but image files
        ignored: /(^|[\/\\])\../,
      },
    );

    const watcher = this.watcher;

    const initialFiles: string[] = [];

    return new Promise<string[]>((resolve) => {
      watcher
        .on('add', (path: string) => {
          if (this.isReady) {
            console.log(`File ${path} has been added after initialization`);
            // Todo: Add to backend
          } else {
            initialFiles.push(path);
          }
        })
        .on('change', (path: string) => console.log(`File ${path} has been changed`))
        .on('unlink', (path: string) => console.log(`File ${path} has been removed`))
        .on('ready', () => {
          this.isReady = true;
          console.log('Ready: init files', initialFiles);
          // Todo: Compare this in DB, add new files and mark missing files as missing
          resolve(initialFiles);
        });
    });
  }
}
