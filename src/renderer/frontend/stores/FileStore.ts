import { action, observable } from 'mobx';

import fs from 'fs-extra';
import Backend from '../../backend/Backend';
import { ClientFile, IFile } from '../../entities/File';
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

  @action
  addFile(filePath: string) {
    const file = new ClientFile(this, filePath);
    this.backend
      .createFile(file.id, file.path)
      .then(() => this.fileList.push(file))
      .catch((err) => console.error('Could not add file', err));
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

  @action
  fetchAllFiles() {
    this.backend
      .fetchFiles()
      .then((fetchedFiles) => {
        this.updateFromBackend(fetchedFiles);
      })
      .catch((err) => console.log('Could not load all files', err));
  }

  @action
  async fetchFilesByTagIDs(tags: ID[]) {
    // Query the backend to send back only files with these tags
    if (tags.length === 0) {
      this.fetchAllFiles();
    } else {
      this.backend
        .searchFiles(tags)
        .then((fetchedFiles) => {
          this.updateFromBackend(fetchedFiles);
        })
        .catch((err) =>
          console.log('Could not find files based on tag search', err),
        );
    }
  }

  private loadFiles() {
    this.backend
      .fetchFiles()
      .then((fetchedFiles) => {
        checkFiles(fetchedFiles);
      })
      .catch((err) => console.log('Could not load files', err));

    // Removes files with invalid file path. Otherwise adds files to fileList.
    // In the future the user should have the option to input the new path if the file was only moved or renamed.
    const checkFiles = (fetchedFiles: IFile[]) => {
      for (const backendFile of fetchedFiles) {
        fs.access(backendFile.path, fs.constants.F_OK, (err) => {
          if (err) {
            console.log(`${backendFile.path} 'does not exist'`);
            this.backend.removeFile(backendFile);
          } else {
            this.fileList.push(
              new ClientFile(this).updateFromBackend(backendFile),
            );
          }
        });
      }
    };
  }

  private removeFile(file: ClientFile): Promise<void> {
    file.dispose();
    this.fileList.remove(file);
    return this.backend.removeFile(file);
  }

  private updateFromBackend(backendFiles: IFile[]): void {
    // removing manually invalid files
    // watching files would be better to remove invalid files
    for (let index = 0; index < backendFiles.length; index++) {
      const backend = backendFiles[index];
      fs.access(backend.path, fs.constants.F_OK, (err) => {
        if (err) {
          this.backend.removeFile(backend);
          backendFiles.splice(index, 1);
          const file = this.fileList.find((f) => backend.id === f.id);
          if (file) {
            this.removeFile(file);
          }
        }
      });
    }

    if (this.fileList.length === 0) {
      this.fileList.push(...this.filesFromBackend(backendFiles));
      return;
    }

    if (backendFiles.length === 0) {
      return this.clearFileList();
    }

    // for small queries it is faster to clear the whole fileList and add all files
    if (backendFiles.length <= 10) {
      return this.replaceFileList(this.filesFromBackend(backendFiles));
    }

    this.updateDifference(backendFiles);
  }

  private filesFromBackend(backendFiles: IFile[]): ClientFile[] {
    return backendFiles.map((file) =>
      new ClientFile(this).updateFromBackend(file),
    );
  }

  // Removes all items from fileList
  private clearFileList() {
    // Clean up observers of ClientFiles before removing them
    this.fileList.forEach((f) => f.dispose());
    this.fileList.clear();
  }

  private replaceFileList(backendFiles: ClientFile[]) {
    this.fileList.forEach((f) => f.dispose());
    this.fileList.replace(backendFiles);
  }

  private updateDifference(backendFiles: IFile[]) {
    // remove duplicates before merging fileList with backendFiles
    for (const client of this.fileList) {
      const file = backendFiles.findIndex((f) => f.id === client.id);
      if (file > -1) {
        backendFiles.splice(file, 1);
        continue;
      }
      client.dispose();
      this.fileList.remove(client);
    }

    if (backendFiles.length > 0) {
      this.fileList.push(...this.filesFromBackend(backendFiles));
    }
  }
}

export default FileStore;
