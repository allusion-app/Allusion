import fse from 'fs-extra';
import ImageSize from 'image-size';
import { ISizeCalculationResult } from 'image-size/dist/types/interface';
import {
  action,
  IReactionDisposer,
  makeObservable,
  observable,
  ObservableSet,
  reaction,
} from 'mobx';
import Path from 'path';
import FileStore from 'src/frontend/stores/FileStore';
import { promisify } from 'util';
import { ID, IResource, ISerializable } from './ID';
import { ClientTag } from './Tag';

const sizeOf = promisify(ImageSize);

export const IMG_EXTENSIONS = ['gif', 'png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff', 'bmp'] as const;
export type IMG_EXTENSIONS_TYPE = typeof IMG_EXTENSIONS[number];

/** Retrieved file meta data information */
interface IMetaData {
  name: string; // Duplicate data; also in path. Used for DB queries
  extension: string; // in lowercase, without the dot
  size: number;
  width: number;
  height: number;
  /** Date when this file was created (from the OS, not related to Allusion) */
  dateCreated: Date;
}

/* A File as it is represented in the Database */
export interface IFile extends IMetaData, IResource {
  locationId: ID;
  // Relative path from location
  relativePath: string;
  absolutePath: string;
  tags: ID[];
  /** When the file was imported into Allusion */
  dateAdded: Date;
  /** When the file was modified in Allusion, not related to OS modified date */
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
  readonly tags: ObservableSet<Readonly<ClientTag>>;
  readonly size: number;
  readonly width: number;
  readonly height: number;
  readonly dateAdded: Date;
  readonly dateModified: Date;
  readonly dateCreated: Date;
  readonly name: string;
  readonly extension: string;
  /** Same as "name", but without extension */
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
    this.dateCreated = fileProps.dateCreated;
    this.name = fileProps.name;
    this.extension = fileProps.extension;

    const location = store.getLocation(this.locationId);
    this.absolutePath = Path.join(location.path, this.relativePath);

    const base = Path.basename(this.relativePath);
    this.filename = base.substr(0, base.lastIndexOf('.'));

    this.tags = observable(this.store.getTags(fileProps.tags));

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

    makeObservable(this);
  }

  @action.bound setThumbnailPath(thumbnailPath: string): void {
    this.thumbnailPath = thumbnailPath;
  }

  @action.bound addTag(tag: Readonly<ClientTag>): void {
    if (!this.tags.has(tag) && this.tags.size === 0) {
      this.store.decrementNumUntaggedFiles();
    }
    this.tags.add(tag);
  }

  @action.bound removeTag(tag: Readonly<ClientTag>): void {
    if (this.tags.delete(tag) && this.tags.size === 0) {
      this.store.incrementNumUntaggedFiles();
    }
  }

  @action.bound clearTags(): void {
    if (this.tags.size > 0) {
      this.store.incrementNumUntaggedFiles();
      this.tags.clear();
    }
  }

  @action.bound setBroken(state: boolean): void {
    this.isBroken = state;
    this.autoSave = !state;
  }

  @action.bound updateTagsFromBackend(tags: ClientTag[]): void {
    this.autoSave = false; // doesn't seem to help..
    this.tags.replace(tags);
    this.autoSave = true;
  }

  serialize(): IFile {
    return {
      id: this.id,
      locationId: this.locationId,
      relativePath: this.relativePath,
      absolutePath: this.absolutePath,
      tags: Array.from(this.tags, (t) => t.id), // removes observable properties from observable array
      size: this.size,
      width: this.width,
      height: this.height,
      dateAdded: this.dateAdded,
      dateModified: this.dateModified,
      dateCreated: this.dateCreated,
      name: this.name,
      extension: this.extension,
    };
  }

  dispose(): void {
    // clean up the observer
    this.saveHandler();
  }
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
    dateCreated: stats.birthtime,
  };
}
