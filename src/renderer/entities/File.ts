import { IReactionDisposer, observable, reaction } from 'mobx';
import FileStore from '../frontend/stores/FileStore';
import { generateId, ID, IIdentifiable, ISerializable } from './ID';

/* Generic properties of a File in our application (usually an image) */
export interface IFile extends IIdentifiable {
  id: ID;
  path: string;
  tags: ID[];
  dateAdded: Date;
}

/* A File as it is represented in the Database */
export class DbFile implements IFile {
  public id: ID;
  public path: string;
  public tags: ID[];
  public dateAdded: Date;

  constructor(id: ID, path: string, tags?: ID[]) {
    this.id = id;
    this.path = path;
    this.tags = tags;
    this.dateAdded = new Date();
  }
}

/**
 * A File as it is stored in the Client.
 * It is stored in a MobX store, which can observe changed made to it and subsequently
 * update the entity in the backend.
 */
export class ClientFile implements IFile, ISerializable<DbFile> {
  store: FileStore;
  saveHandler: IReactionDisposer;
  autoSave = true;

  id: ID;
  dateAdded: Date;
  @observable path: string;
  @observable tags: ID[];

  constructor(store: FileStore, path?: string, id = generateId()) {
    this.store = store;
    this.id = id;
    this.path = path;

    // observe all changes to observable fields
    this.saveHandler = reaction(
      // We need to explicitly define which values this reaction should react to
      () => this.serialize(),
      // Then update the entity in the database
      (file) => {
        if (this.autoSave) {
          this.store.backend.saveFile(file);
        }
      },
    );
  }

  serialize(): IFile {
    return {
      id: this.id,
      path: this.path,
      tags: this.tags,
      dateAdded: this.dateAdded,
    };
  }

  /**
   * Used for updating this Entity if changes are made to the backend outside of this session of the application.
   * @param backendFile The file received from the backend
   */
  updateFromBackend(backendFile: IFile): ClientFile {
    // make sure our changes aren't sent back to the backend
    this.autoSave = false;

    this.id = backendFile.id;
    this.path = backendFile.path;
    this.tags = backendFile.tags;
    this.dateAdded = backendFile.dateAdded;

    this.autoSave = true;

    return this;
  }

  dispose() {
    // clean up the observer
    this.saveHandler();
  }
}
