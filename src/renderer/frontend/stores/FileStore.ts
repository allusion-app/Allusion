import { action, observable } from 'mobx';

import Backend from '../../backend/Backend';
import { IFile } from '../../entities/File';
import { ITag } from '../../entities/Tag';
import File from '../domain-objects/File';
import RootStore from "./RootStore";

class FileStore {
  backend: Backend;
  rootStore: RootStore;

  @observable fileList: File[] = [];

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
      this.fileList.push(new File(this).updateFromBackend(backendFile));
    } else {
      // Else, update the existing tag
      file.updateFromBackend(backendFile);
    }
  }

  @action
  addFile(filePath: string) {
    const file = new File(this, filePath);
    this.fileList.push(file);
    this.backend.createFile(file.id, file.path);
  }

  @action
  searchFiles(query: ITag | ITag[] | string) {
    // this.fileList = ...
  }
}

export default FileStore;
