import { IReactionDisposer, observable, reaction, computed, action } from 'mobx';
import Path from 'path';
import fse from 'fs-extra';

import { promisify } from 'util';
import ImageSize from 'image-size';
const sizeOf = promisify(ImageSize.imageSize);

import FileStore from '../frontend/stores/FileStore';
import { ID, IResource, ISerializable } from './ID';
import { ClientTag } from './Tag';
import { ISizeCalculationResult } from 'image-size/dist/types/interface';

export const IMG_EXTENSIONS = ['gif', 'png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp'] as const;
export type IMG_EXTENSIONS_TYPE = typeof IMG_EXTENSIONS[number];

/** Retrieved file meta data information */
interface IMetaData {
  name: string; // Duplicate data; also in path. Used for DB queries
  extension: string; // in lowercase, without the dot
  size: number;
  width: number;
  height: number;
}

/** Should be called when after constructing a file before sending it to the backend. */
export async function getMetaData(path: string): Promise<IMetaData> {
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
    name: Path.basename(path),
    extension: Path.extname(path).slice(1).toLowerCase(),
    size: stats.size,
    width: (dimensions && dimensions.width) || 0,
    height: (dimensions && dimensions.height) || 0,
  };
}

/* A File as it is represented in the Database */
export interface IFile extends IMetaData, IResource {
  locationId: ID;
  // Relative path from location
  relativePath: string;
  absolutePath: string;
  tags: ID[];
  dateAdded: Date;
  dateModified: Date;
}

/**
 * A File as it is stored in the Client.
 * It is stored in a MobX store, which can observe changed made to it and subsequently
 * update the entity in the backend.
 */
export class ClientFile implements ISerializable<IFile> {
  private store: FileStore;
  private saveHandler: IReactionDisposer;
  private autoSave = true;

  readonly id: ID;
  readonly locationId: ID;
  readonly relativePath: string;
  readonly absolutePath: string;
  readonly tags = observable<ID>([]);
  readonly size: number;
  readonly width: number;
  readonly height: number;
  readonly dateAdded: Date;
  readonly dateModified: Date;
  readonly name: string;
  readonly extension: string;
  readonly filename: string;

  @observable thumbnailPath: string = '';

  // Is undefined until existence check has been completed
  @observable isBroken?: boolean;

  constructor(store: FileStore, fileProps: IFile) {
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

    const location = store.getLocation(this.locationId);
    this.absolutePath = Path.join(location.path, this.relativePath);

    const base = Path.basename(this.relativePath);
    this.filename = base.substr(0, base.lastIndexOf('.'));

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

  /** Get actual tag objects based on the IDs retrieved from the backend */
  @computed get clientTags(): ClientTag[] {
    return this.tags
      .map((id) => this.store.getTag(id))
      .filter((t) => t !== undefined) as ClientTag[];
  }

  @action.bound setThumbnailPath(thumbnailPath: string): void {
    this.thumbnailPath = thumbnailPath;
  }

  @action.bound addTag(tag: ID): void {
    if (this.tags.length === 0) {
      this.store.decrementNumUntaggedFiles();
    }

    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  @action.bound removeTag(tag: ID): void {
    if (this.tags.includes(tag)) {
      if (this.tags.length === 1) {
        this.store.incrementNumUntaggedFiles();
      }

      this.tags.remove(tag);
    }
  }

  @action.bound removeAllTags(): void {
    if (this.tags.length !== 0) {
      this.store.incrementNumUntaggedFiles();
    }
    this.tags.clear();
  }

  @action.bound setBroken(state: boolean): void {
    this.isBroken = state;
    this.autoSave = !this.isBroken;
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

  dispose(): void {
    // clean up the observer
    this.saveHandler();
  }
}
