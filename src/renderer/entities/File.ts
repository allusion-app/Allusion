import {
  IReactionDisposer,
  observable,
  reaction,
  computed,
  toJS,
  action,
} from 'mobx';
import Path from 'path';
import fse from 'fs-extra';
import systemPath from 'path';

import FileStore from '../frontend/stores/FileStore';
import { ID, IIdentifiable, ISerializable } from './ID';
import { ClientTag } from './Tag';

/* Generic properties of a File in our application (usually an image) */
export interface IFile extends IIdentifiable {
  id: ID;
  path: string;
  tags: ID[];
  dateAdded: Date;
  size: number;

  // Duplicate data; also in path. Used for DB queries
  name: string;
  extension: string; // in lowercase, without the dot
}

/* A File as it is represented in the Database */
export class DbFile implements IFile {
  public id: ID;
  public path: string;
  public tags: ID[];
  public dateAdded: Date;
  public size: number;

  public name: string;
  public extension: string;

  constructor({ id, path, tags, dateAdded, size, name, extension }: IFile) {
    this.id = id;
    this.path = path;
    this.tags = tags;
    this.dateAdded = dateAdded;
    this.size = size;
    this.name = name;
    this.extension = extension;
  }
}

/**
 * A File as it is stored in the Client.
 * It is stored in a MobX store, which can observe changed made to it and subsequently
 * update the entity in the backend.
 */
export class ClientFile implements IFile, ISerializable<DbFile> {

  /** Should be called when after constructing a file before sending it to the backend. */
  static async getMetaData(path: string) {
    const stats = await fse.stat(path);
    return {
      name: systemPath.basename(path),
      extension: systemPath.extname(path).toLowerCase(),
      size: stats.size,
    };
  }

  store: FileStore;
  saveHandler: IReactionDisposer;
  autoSave = true;

  readonly id: ID;
  readonly dateAdded: Date;
  readonly path: string;
  readonly tags = observable<ID>([]);
  readonly size: number;
  readonly name: string;
  readonly extension: string;

  hasThumbnail: boolean;

  constructor(store: FileStore, fileProps: IFile) {
    this.store = store;

    this.id = fileProps.id;
    this.path = fileProps.path;
    this.dateAdded = fileProps.dateAdded;
    this.size = fileProps.size;
    this.name = fileProps.name;
    this.extension = fileProps.extension;
    this.hasThumbnail = false;

    this.tags.push(...fileProps.tags);

    // observe all changes to observable fields
    this.saveHandler = reaction(
      // We need to explicitly define which values this reaction should react to
      () => this.serialize(),
      // Then update the entity in the database
      (file) => {
        if (this.autoSave) {
          // Remove reactive properties, since observable props are not accepted in the backend
          const jsFile = toJS<IFile>(file);
          this.store.backend.saveFile(jsFile);
        }
      },
    );
  }

  serialize(): IFile {
    return {
      id: this.id,
      path: this.path,
      tags: this.tags.toJS(), // removes observable properties from observable array
      dateAdded: this.dateAdded,
      size: this.size,
      name: this.name,
      extension: this.extension,
    };
  }

  @computed get filename(): string {
    const base = Path.basename(this.path);
    return base.substr(0, base.lastIndexOf('.'));
  }

  /** Get actual tag objects based on the IDs retrieved from the backend */
  @computed get clientTags(): ClientTag[] {
    return this.tags.map((id) => this.store.rootStore.tagStore.getTag(id)) as ClientTag[];
  }

  @action.bound addTag(tag: ID) {
    if (this.tags.length === 0) {
      this.store.decrementNumUntaggedFiles();
    }

    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }
  @action.bound removeTag(tag: ID) {
    if (this.tags.includes(tag)) {
      if (this.tags.length === 1) {
        this.store.incrementNumUntaggedFiles();
      }

      this.tags.remove(tag);
    }
  }
  @action.bound removeAllTags() {
    if (this.tags.length !== 0) {
      this.store.incrementNumUntaggedFiles();
    }
    this.tags.clear();
  }

  dispose() {
    // clean up the observer
    this.saveHandler();
  }
}
