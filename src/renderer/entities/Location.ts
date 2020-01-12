import { IReactionDisposer, reaction, computed, observable, action } from 'mobx';
import chokidar, { FSWatcher } from 'chokidar';
import fse from 'fs-extra';

import { ID, IIdentifiable, ISerializable } from './ID';
import LocationStore from '../frontend/stores/LocationStore';
import { IMG_EXTENSIONS } from './File';
import { ClientTag } from './Tag';
import { RECURSIVE_DIR_WATCH_DEPTH } from '../../config';
import { AppToaster } from '../frontend/App';

export const DEFAULT_LOCATION_ID: ID = 'default-location';

export interface ILocation extends IIdentifiable {
  id: ID;
  path: string;
  dateAdded: Date;
  tagsToAdd: ID[];
}

export class DbLocation implements ILocation {
  constructor(
    public id: ID,
    public path: string,
    public dateAdded: Date,
    public tagsToAdd: ID[],
  ) { }
}

export class ClientLocation implements ILocation, ISerializable<DbLocation> {
  saveHandler: IReactionDisposer;
  watcher?: FSWatcher;
  autoSave = true;
  // Whether the initial scan has been completed
  isReady = false;
  // true when the path no longer exists (broken link)
  isBroken = false;

  readonly tagsToAdd = observable<ID>([]);

  @computed get clientTagsToAdd() {
    return this.tagsToAdd
      .map((id) => this.store.rootStore.tagStore.get(id))
      .filter((t) => t !== undefined) as ClientTag[];
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

  @action.bound async init() {
    const pathExists = await fse.pathExists(this.path);
    if (pathExists) {
      return this.watchDirectory(this.path);
    } else {
      this.isBroken = true;
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

  @action.bound addTag(tag: ClientTag) { this.tagsToAdd.push(tag.id); }
  @action.bound removeTag(tag: ClientTag) { this.tagsToAdd.remove(tag.id); }

  @action.bound private addTags(tags: ID[]) { this.tagsToAdd.push(...tags); }

  // async relocate(newPath: string) {
    // TODO: Check if all files can be found. If not, notify user, else, update all files in db from this location
    // locationFiles = ...
    // locationFiles.forEach((f) => f.path = )?

    // if we decide to store relative paths for files, no need to relocate individual files
  // }

  async checkIfBroken() {
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
    this.watcher = chokidar.watch(
      inputPath,
      {
        depth: RECURSIVE_DIR_WATCH_DEPTH,
        // Ignore dot files. Also dot folders?
        // Todo: Ignore everything but image files
        ignored: /(^|[\/\\])\../,
      },
    );

    const watcher = this.watcher;

    // Make a list of all files in this directory, which will be returned when all subdirs have been traversed
    const initialFiles: string[] = [];

    // TODO: Maybe do this on a web worker? Could hang the app for large folders

    return new Promise<string[]>((resolve) => {
      watcher
        .on('add', async (path: string) => {
          if (IMG_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext))) {
            // Todo: ignore dot files/dirs?
            if (this.isReady) {
              console.log(`File ${path} has been added after initialization`);

              AppToaster.show({
                message: 'New images have been detected.',
                intent: 'primary',
                timeout: 0,
                action: {
                  text: 'Refresh',
                  icon: 'refresh',
                  onClick: this.store.rootStore.uiStore.refetch,
                },
              }, 'refresh');

              // Add to backend
              const fileToStore = await this.store.pathToIFile(path, this.id, this.tagsToAdd);
              this.store.backend.createFilesFromPath(path, [fileToStore]);
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
