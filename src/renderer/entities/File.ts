import { IReactionDisposer, observable, reaction, computed, action } from 'mobx';
import Path from 'path';
import fse from 'fs-extra';
import systemPath from 'path';

import { promisify } from 'util';
import ImageSize from 'image-size';
const sizeOf = promisify(ImageSize.imageSize);

import FileStore from '../frontend/stores/FileStore';
import { ID, IResource, ISerializable } from './ID';
import { ClientTag } from './Tag';
import { ClientLocation } from './Location';
import { ISizeCalculationResult } from 'image-size/dist/types/interface';

export const IMG_EXTENSIONS = ['gif', 'png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp'] as const;
export type IMG_EXTENSIONS_TYPE = typeof IMG_EXTENSIONS[number];

/* A File as it is represented in the Database */
export interface IFile extends IResource {
  id: ID;
  locationId: ID;
  // Relative path from location
  relativePath: string;
  absolutePath: string;
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

/**
 * A File as it is stored in the Client.
 * It is stored in a MobX store, which can observe changed made to it and subsequently
 * update the entity in the backend.
 */
export class ClientFile implements ISerializable<IFile> {
  /** Should be called when after constructing a file before sending it to the backend. */
  static async getMetaData(path: string) {
    const stats = await fse.stat(path);
    let dimensions: ISizeCalculationResult | undefined;
    try {
      dimensions = await sizeOf(path);
    } catch (e) {
      if (!dimensions) {
        console.error('Could not find dimensions for ', path);
      }
      // TODO: Remove image? Probably unsupported file type
    }

    return {
      name: systemPath.basename(path),
      extension: systemPath.extname(path).slice(1).toLowerCase(),
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
  readonly relativePath: string;
  readonly absolutePath: string
  readonly tags = observable<ID>([]);
  readonly size: number;
  readonly width: number;
  readonly height: number;
  readonly dateAdded: Date;
  readonly dateModified: Date;
  readonly name: string;
  readonly extension: string;

  readonly location: ClientLocation;

  @observable thumbnailPath: string = '';

  @observable isBroken: boolean;

  constructor(store: FileStore, fileProps: IFile, isBroken: boolean = false) {
    this.store = store;

    this.id = fileProps.id;
    this.locationId = fileProps.locationId;
    this.relativePath = fileProps.relativePath;
    this.size = fileProps.size;
    this.width = fileProps.width;
    this.height = fileProps.height;
    this.dateAdded = fileProps.dateAdded;
    this.dateModified = fileProps.dateModified;
    this.name = fileProps.name;
    this.extension = fileProps.extension;
    this.isBroken = isBroken;

    this.location = store.getFileLocation(this);
    this.absolutePath = systemPath.join(this.location.path, this.relativePath);

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
    const base = Path.basename(this.relativePath);
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
      relativePath: this.relativePath,
      absolutePath: this.absolutePath,
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
