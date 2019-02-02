
import { action, observable } from 'mobx';
import Backend from '../../backend/Backend';
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

  @action
  searchFiles(query: ITag | ITag[] | string) {
    // this.fileList = ...
  }
}

export default FileStore;
