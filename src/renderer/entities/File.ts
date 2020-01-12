import { IReactionDisposer, observable, reaction, computed, action } from 'mobx';
import Path from 'path';
import fse from 'fs-extra';
import systemPath from 'path';

import { promisify } from 'util';
import ImageSize from 'image-size';
const sizeOf = promisify(ImageSize.imageSize);

import FileStore from '../frontend/stores/FileStore';
import { ID, IIdentifiable, ISerializable } from './ID';
import { ClientTag } from './Tag';

export const IMG_EXTENSIONS = ['gif', 'png', 'jpg', 'jpeg'];
export type IMG_EXTENSIONS_TYPE = 'gif' | 'png' | 'jpg' | 'jpg';

/* Generic properties of a File in our application (usually an image) */
export interface IFile extends IIdentifiable {
  id: ID;
  locationId: ID;
  path: string; // todo: could store relativePath, and convert to a absPath in clientFile (easier for import/export/sync in future)
  tags: ID[];
  size: number;
  width: number;
  height: number;
  dateAdded: Date;
  dateModified: Date;

  // Duplicate data; also in path. Used for DB queries
  name: string;
  extension: string; // in lowercase, without the dot
}

/* A File as it is represented in the Database */
export class DbFile implements IFile {
  public id: ID;
  public locationId: ID;
  public path: string;
  public tags: ID[];
  public size: number;
  public width: number;
  public height: number;
  public dateAdded: Date;
  public dateModified: Date;

  public name: string;
  public extension: string;

  constructor({ id, locationId, path, tags, size, width, height, dateAdded, dateModified, name, extension }: IFile) {
    this.id = id;
    this.locationId = locationId;
    this.path = path;
    this.tags = tags;
    this.size = size;
    this.width = width;
    this.height = height;
    this.dateAdded = dateAdded;
    this.dateModified = dateModified;
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
    const dimensions = await sizeOf(path);
    if (!dimensions) {
      console.error('Could not find dimensions for ', path);
    }

    return {
      name: systemPath.basename(path),
      extension: systemPath.extname(path).toLowerCase(),
      size: stats.size,
      width: (dimensions && dimensions.width) || 0,
      height: (dimensions && dimensions.height) || 0,
    };
  }

  store: FileStore;
  saveHandler: IReactionDisposer;
  autoSave = true;

  readonly id: ID;
  readonly locationId: ID;
  readonly path: string;
  readonly tags = observable<ID>([]);
  readonly size: number;
  readonly width: number;
  readonly height: number;
  readonly dateAdded: Date;
  readonly dateModified: Date;
  readonly name: string;
  readonly extension: string;

  @observable
  thumbnailPath: string;

  constructor(store: FileStore, fileProps: IFile) {
    this.store = store;

    this.id = fileProps.id;
    this.locationId = fileProps.locationId;
    this.path = fileProps.path;
    this.size = fileProps.size;
    this.width = fileProps.width;
    this.height = fileProps.height;
    this.dateAdded = new Date(fileProps.dateAdded);
    this.dateModified = new Date(fileProps.dateModified);
    this.name = fileProps.name;
    this.extension = fileProps.extension;
    this.thumbnailPath = '';

    this.tags.push(...fileProps.tags);

    // observe all changes to observable fields
    this.saveHandler = reaction(
      // We need to explicitly define which values this reaction should react to
      () => this.serialize(),
      // Then update the entity in the database
      (file) => {
        if (this.autoSave) {
          // Remove reactive properties, since observable props are not accepted in the backend
          this.store.save(file);
        }
      },
    );
  }

  @computed get filename(): string {
    const base = Path.basename(this.path);
    return base.substr(0, base.lastIndexOf('.'));
  }

  /** Get actual tag objects based on the IDs retrieved from the backend */
  @computed get clientTags(): ClientTag[] {
    return this.tags
      .map((id) => this.store.getTag(id))
      .filter((t) => t !== undefined) as ClientTag[];
  }

  @action.bound setThumbnailPath(thumbnailPath: string) {
    this.thumbnailPath = thumbnailPath;
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

  serialize(): IFile {
    return {
      id: this.id,
      locationId: this.locationId,
      path: this.path,
      tags: this.tags.toJS(), // removes observable properties from observable array
      size: this.size,
      width: this.width,
      height: this.height,
      dateAdded: this.dateAdded,
      dateModified: this.dateModified,
      name: this.name,
      extension: this.extension,
    };
  }

  dispose() {
    // clean up the observer
    this.saveHandler();
  }
}
