
import { action, observable } from 'mobx';
import Backend from '../../backend/Backend';
import { IFile } from '../../entities/File';
import { ITag } from '../../entities/Tag';
import RootStore from "./RootStore";

class FileStore {
  backend: Backend;
  rootStore: RootStore;

  @observable fileList: IFile[] = [];

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
  }

  @action
  searchFiles(query: ITag | ITag[] | string) {
    // this.fileList = ...
  }
}

export default FileStore;
