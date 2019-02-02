import { action, observable } from 'mobx';

import Backend from '../../backend/Backend';
import { ClientFile, IFile } from '../../entities/File';
import { ClientTag, ITag } from '../../entities/Tag';
import RootStore from "./RootStore";

class FileStore {
  backend: Backend;
  rootStore: RootStore;

  @observable fileList: ClientFile[] = [];

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
  }

  init() {
    this.loadFiles();
  }

  loadFiles() {
    this.backend.fetchFiles().then((fetchedFiles) => {
      fetchedFiles.forEach((file) => this.updateFromBackend(file));
    });
  }

  updateFromBackend(backendFile: IFile) {
    const file = this.fileList.find((f) => backendFile.id === f.id);
    // In case a file was added to the server from another client or session
    if (!file) {
      this.fileList.push(new ClientFile(this).updateFromBackend(backendFile));
    } else {
      // Else, update the existing tag
      file.updateFromBackend(backendFile);
    }
  }

  @action
  addFile(filePath: string) {
    const file = new ClientFile(this, filePath);
    this.backend.createFile(file.id, file.path)
      .then(() => this.fileList.push(file))
      .catch((err) => console.error('Could not add file:', err));
  }

  @action
  searchFiles(query: ITag | ITag[] | string) {
    // this.fileList = ...
  }
}

export default FileStore;
