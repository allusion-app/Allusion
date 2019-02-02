import { IReactionDisposer, observable, reaction } from 'mobx';
import { IFile } from '../../entities/File';
import { generateId, ID } from '../../entities/ID';
import FileStore from '../stores/FileStore';
import Tag from './Tag';

export default class File {
  store: FileStore;
  saveHandler: IReactionDisposer;
  autoSave = true;

  id: ID;
  added: Date;
  @observable path: string;
  @observable tags: ID[];

  constructor(store: FileStore, path?: string, id = generateId()) {
    this.store = store;
    this.id = id;
    this.path = path;

    this.saveHandler = reaction(
      // observe all changes to observable fields
      () => this.toBackendFile(),
      (file) => {
        if (this.autoSave) {
          this.store.backend.saveFile(file);
        }
      },
    );
  }

  toBackendFile(): IFile {
    return {
      id: this.id,
      path: this.path,
      tags: this.tags,
      dateAdded: this.added,
    };
  }

  updateFromBackend(backendFile: IFile): File {
    // make sure our changes aren't sent back to the backend
    this.autoSave = false;

    this.id = backendFile.id;
    this.path = backendFile.path;
    this.tags = backendFile.tags;
    this.added = backendFile.dateAdded;

    this.autoSave = true;

    return this;
  }

  dispose() {
    // clean up the observer
    this.saveHandler();
  }
}
