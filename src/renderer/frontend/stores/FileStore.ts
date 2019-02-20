import { action, observable } from 'mobx';

import fs from 'fs-extra';
import Backend from '../../backend/Backend';
import { ClientFile, IFile } from '../../entities/File';
import { ITag } from '../../entities/Tag';
import RootStore from './RootStore';
import { ID } from '../../entities/ID';

class FileStore {
  backend: Backend;
  rootStore: RootStore;

  readonly fileList = observable<ClientFile>([]);

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
  }

  init() {
    this.loadFiles();
  }

  loadFiles() {
    this.backend
      .fetchFiles()
      .then((fetchedFiles) => {
        fetchedFiles.forEach((file) => this.checkFiles(file));
      })
      .catch((err) => console.log('Could not load files', err));
  }

  // Removes files with invalid file path.
  // In the future the user should have the option to input the new path if the file was only moved or renamed.
  checkFiles(backendFile: IFile) {
    fs.access(backendFile.path, fs.constants.F_OK, (err) => {
      if (err) {
        console.log(`${backendFile.path} 'does not exist'`);
        this.backend.removeFile(backendFile);
      } else {
        this.updateFromBackend(backendFile);
      }
    });
  }

  updateFromBackend(backendFile: IFile) {
    const file = this.fileList.find((f) => backendFile.id === f.id);
    // In case a file was added to the server from another client or session
    if (!file) {
      this.fileList.push(new ClientFile(this).updateFromBackend(backendFile));
    } else {
      // Else, update the existing file
      file.updateFromBackend(backendFile);
    }
  }

  @action
  addFile(filePath: string) {
    const file = new ClientFile(this, filePath);
    this.backend
      .createFile(file.id, file.path)
      .then(() => this.fileList.push(file))
      .catch((err) => console.error('Could not add file:', err));
  }

  @action
  async removeFilesById(ids: ID[]) {
    return Promise.all(
      ids.map(async (id) => {
        const file = this.fileList.find((f) => f.id === id);
        if (file) {
          await this.removeFile(file);
        } else {
          console.log('Could not find file to remove', file);
        }
      }),
    );
  }

  removeFile(file: ClientFile): Promise<void> {
    this.fileList.splice(this.fileList.indexOf(file), 1);
    file.dispose();
    return this.backend.removeFile(file);
  }

  @action
  searchFiles(query: ITag | ITag[] | string) {
    // this.fileList = ...
  }
}

export default FileStore;
