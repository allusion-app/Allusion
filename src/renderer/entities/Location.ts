import { IReactionDisposer, reaction, computed, observable, action, runInAction } from 'mobx';
import chokidar, { FSWatcher } from 'chokidar';
import fse from 'fs-extra';
import SysPath from 'path';

import { ID, IResource, ISerializable } from './ID';
import LocationStore from '../frontend/stores/LocationStore';
import { IMG_EXTENSIONS } from './File';
import { ClientTag } from './Tag';
import { RECURSIVE_DIR_WATCH_DEPTH } from '../../config';
import { AppToaster } from '../frontend/App';
import IconSet from 'components/Icons';

export const DEFAULT_LOCATION_ID: ID = 'default-location';

export interface ILocation extends IResource {
  id: ID;
  path: string;
  dateAdded: Date;
  tagsToAdd: ID[];
}

export interface IDirectoryTreeItem {
  name: string;
  fullPath: string;
  children: IDirectoryTreeItem[];
}

/**
 * Recursive function that returns the dir list for a given path
 */
async function getDirectoryTree(path: string): Promise<IDirectoryTreeItem[]> {
  try {
    let dirs: string[] = [];
    for (const file of await fse.readdir(path)) {
      const fullPath = SysPath.join(path, file);
      if ((await fse.stat(fullPath)).isDirectory()) {
        dirs = [...dirs, fullPath];
      }
    }
    return Promise.all(
      dirs.map(
        async (dir): Promise<IDirectoryTreeItem> => ({
          name: SysPath.basename(dir),
          fullPath: dir,
          children: await getDirectoryTree(dir),
        }),
      ),
    );
  } catch (e) {
    return [];
  }
}

export class ClientLocation implements ISerializable<ILocation> {
  saveHandler: IReactionDisposer;
  watcher?: FSWatcher;
  autoSave = true;
  // whether initialization has started or has been completed
  @observable isInitialized = false;
  // Whether the initial scan has been completed, and new/removed files are being watched
  isReady = false;
  // true when the path no longer exists (broken link)
  @observable isBroken = false;

  readonly tagsToAdd = observable<ID>([]);

  @computed get clientTagsToAdd(): ClientTag[] {
    return this.tagsToAdd
      .map((id) => this.store.rootStore.tagStore.get(id))
      .filter((t) => t !== undefined) as ClientTag[];
  }

  @computed get name(): string {
    return SysPath.basename(this.path);
  }

  constructor(
    public store: LocationStore,
    public id: ID,
    public path: string,
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
          this.store.backend.saveLocation(dir);
        }
      },
    );
    if (tagsToAdd) {
      this.addTags(tagsToAdd);
    }
  }

  @action.bound async init(): Promise<string[]> {
    this.isInitialized = true;
    const pathExists = await fse.pathExists(this.path);
    if (pathExists) {
      return this.watchDirectory(this.path);
    } else {
      runInAction(() => (this.isBroken = true));
      return [];
    }
  }

  serialize(): ILocation {
    return {
      id: this.id,
      path: this.path,
      dateAdded: this.dateAdded,
      tagsToAdd: this.tagsToAdd.toJS(),
    };
  }

  @action changePath(newPath: string): void {
    this.store.changeLocationPath(this, newPath);
  }

  @action unBreak(): void {
    this.isBroken = false;
  }

  @action.bound addTag(tag: ClientTag): void {
    this.tagsToAdd.push(tag.id);
  }

  @action.bound removeTag(tag: ClientTag): void {
    this.tagsToAdd.remove(tag.id);
  }

  @action.bound clearTags(): void {
    this.tagsToAdd.clear();
  }

  @action.bound private addTags(tags: ID[]) {
    this.tagsToAdd.push(...tags);
  }

  // async relocate(newPath: string) {
  // TODO: Check if all files can be found. If not, notify user, else, update all files in db from this location
  // locationFiles = ...
  // locationFiles.forEach((f) => f.path = )?

  // if we decide to store relative paths for files, no need to relocate individual files
  // }

  async checkIfBroken(): Promise<boolean> {
    if (this.isBroken) {
      return true;
    } else {
      const pathExists = await fse.pathExists(this.path);
      if (!pathExists) {
        this.isBroken = true;
        return true;
      }
    }
    return false;
  }

  private watchDirectory(inputPath: string): Promise<string[]> {
    // Watch for folder changes
    this.watcher = chokidar.watch(inputPath, {
      depth: RECURSIVE_DIR_WATCH_DEPTH,
      // Ignore dot files. Also dot folders?
      // Todo: Ignore everything but image files
      ignored: /(^|[\/\\])\../,
    });

    const watcher = this.watcher;

    // Make a list of all files in this directory, which will be returned when all subdirs have been traversed
    const initialFiles: string[] = [];

    // TODO: Maybe do this on a web worker? Could hang the app for large folders

    return new Promise<string[]>((resolve) => {
      watcher
        .on('add', async (path: string) => {
          if (IMG_EXTENSIONS.some((ext) => SysPath.extname(path).endsWith(ext))) {
            // Todo: ignore dot files/dirs?
            if (this.isReady) {
              console.log(`File ${path} has been added after initialization`);

              AppToaster.show(
                {
                  message: 'New images have been detected.',
                  intent: 'primary',
                  timeout: 0,
                  action: {
                    icon: IconSet.RELOAD,
                    onClick: this.store.rootStore.fileStore.refetch,
                  },
                },
                'refresh',
              );

              // Add to backend
              const fileToStore = await this.store.pathToIFile(
                path,
                this.id,
                this.tagsToAdd.toJS(),
              );
              this.store.backend.createFilesFromPath(path, [fileToStore]);
            } else {
              initialFiles.push(path);
            }
          }
        })
        .on('change', (path: string) => console.log(`File ${path} has been changed`))
        .on('unlink', (path: string) => {
          console.log(`Location "${SysPath.basename(this.path)}": File ${path} has been removed.`);
          const fileStore = this.store.rootStore.fileStore;
          const clientFile = fileStore.fileList.find((f) => f.absolutePath === path);
          if (clientFile) {
            fileStore.hideFile(clientFile);
          }
          this.store.rootStore.fileStore.removeFilesById;
        })
        .on('ready', () => {
          this.isReady = true;
          console.log(
            `Location "${SysPath.basename(this.path)}" ready. Detected files:`,
            initialFiles.length,
          );
          // Todo: Compare this in DB, add new files and mark missing files as missing
          resolve(initialFiles);
        });
    });
  }

  async getDirectoryTree(): Promise<IDirectoryTreeItem[]> {
    return getDirectoryTree(this.path);
  }

  async delete(): Promise<void> {
    this.store.removeDirectory(this);
  }

  dispose(): void {
    // clean up the observer
    this.saveHandler();
  }
}
