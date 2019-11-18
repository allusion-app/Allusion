import { ID, IIdentifiable, ISerializable } from './ID';
import { IReactionDisposer, reaction, computed, observable, action } from 'mobx';
import WatchedDirectoryStore from '../frontend/stores/WatchedDirectoryStore';
import chokidar, { FSWatcher } from 'chokidar';
import { RECURSIVE_DIR_WATCH_DEPTH } from '../../config';
import { AppToaster } from '../frontend/App';
import { IMG_EXTENSIONS } from './File';
import { ClientTag } from './Tag';

export interface IWatchedDirectory extends IIdentifiable {
  id: ID;
  path: string;
  recursive: boolean;
  dateAdded: Date;
  tagsToAdd: ID[];
  folderTag?: ID; // todo: needs to be recursive... tree of tags? Or just match by name?
}

export class DbWatchedDirectory implements IWatchedDirectory {
  constructor(
    public id: ID,
    public path: string,
    public recursive: boolean,
    public dateAdded: Date,
    public tagsToAdd: ID[],
    folderTag?: ID,
  ) { }
}

export class ClientWatchedDirectory implements IWatchedDirectory, ISerializable<DbWatchedDirectory> {
  saveHandler: IReactionDisposer;
  watcher?: FSWatcher;
  autoSave = true;
  // Whether the initial scan has been completed
  isReady = false;

  readonly tagsToAdd = observable<ID>([]);

  @computed get clientTagsToAdd() {
    return this.tagsToAdd
      .map((id) => this.store.rootStore.tagStore.get(id))
      .filter((t) => t !== undefined) as ClientTag[];
  }

  constructor(
    public store: WatchedDirectoryStore,
    public id: ID,
    public path: string,
    public recursive: boolean,
    public dateAdded: Date,
    tagsToAdd?: ID[],
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
    if (tagsToAdd) {
      this.tagsToAdd.push(...tagsToAdd)
    }
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
      tagsToAdd: this.tagsToAdd,
    };
  }

  @action.bound addTag(tag: ClientTag) { this.tagsToAdd.push(tag.id); }
  @action.bound removeTag(tag: ClientTag) { this.tagsToAdd.remove(tag.id); }

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
        .on('add', async (path: string) => {
          if (IMG_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext))) {
            if (this.isReady) {
              console.log(`File ${path} has been added after initialization`);

              AppToaster.show({
                message: 'New images have been detected.',
                intent: 'primary',
                action: {
                  text: 'Refresh',
                  icon: 'refresh',
                  onClick: this.store.rootStore.uiStore.refetch,
                },
              }, 'refresh');

              // Add to backend
              this.store.backend.createFilesFromPath(path, [await this.store.pathToIFile(path)]);
            } else {
              initialFiles.push(path);
            }
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
