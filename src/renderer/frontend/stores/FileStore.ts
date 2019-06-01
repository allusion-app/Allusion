import { action, observable } from 'mobx';
import fs from 'fs-extra';

import Backend from '../../backend/Backend';
import { ClientFile, IFile } from '../../entities/File';
import RootStore from './RootStore';
import { ID, generateId } from '../../entities/ID';

class FileStore {
  backend: Backend;
  rootStore: RootStore;

  readonly fileList = observable<ClientFile>([]);

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
  }

  async init(autoLoadFiles: boolean) {
    if (autoLoadFiles) {
      await this.loadFiles();
    }
  }

  @action
  async addFile(filePath: string) {
    const fileData: IFile = {
      id: generateId(),
      path: filePath,
      dateAdded: new Date(),
      tags: [],
      ...await ClientFile.getMetaData(filePath),
    };
    const file = new ClientFile(this, fileData);
    // The function caller is responsible for handling errors.
    await this.backend.createFile(fileData);
    this.fileList.push(file);
    return file;
  }

  @action
  async removeFilesById(ids: ID[]) {
    const filesToRemove = ids
      .map((id) => this.fileList.find((f) => f.id === id))
      .filter((f) => f !== undefined) as ClientFile[];

    try {
      filesToRemove.forEach((file) => {
        file.dispose();
        this.rootStore.uiStore.deselectFile(file);
        this.fileList.remove(file);
      });
      await this.backend.removeFiles(filesToRemove);
    } catch (err) {
      console.error('Could not remove files', err);
    }
  }

  @action
  async fetchAllFiles() {
    try {
      const { fileOrder, fileOrderDescending } = this.rootStore.uiStore;
      const fetchedFiles = await this.backend.fetchFiles(fileOrder, fileOrderDescending);
      this.updateFromBackend(fetchedFiles);
    } catch (err) {
      console.error('Could not load all files', err);
    }
  }

  @action
  async fetchFilesByTagIDs(tags: ID[]) {
    // Query the backend to send back only files with these tags
    if (tags.length === 0) {
      await this.fetchAllFiles();
    } else {
      try {
        const { fileOrder, fileOrderDescending } = this.rootStore.uiStore;
        const fetchedFiles = await this.backend.searchFiles(tags, fileOrder, fileOrderDescending);
        this.updateFromBackend(fetchedFiles);
      } catch (e) {
        console.log('Could not find files based on tag search', e);
      }
    }
  }

  @action
  async fetchFilesByIDs(files: ID[]) {
    try {
      const fetchedFiles = await this.backend.fetchFilesByID(files);
      this.updateFromBackend(fetchedFiles);
    } catch (e) {
      console.log('Could not find files based on IDs', e);
    }
  }

  private async loadFiles() {
    const { fileOrder, fileOrderDescending } = this.rootStore.uiStore;
    const fetchedFiles = await this.backend.fetchFiles(fileOrder, fileOrderDescending);

    // Removes files with invalid file path. Otherwise adds files to fileList.
    // In the future the user should have the option to input the new path if the file was only moved or renamed.
    await Promise.all(
      fetchedFiles.map(async (backendFile: IFile) => {
        try {
          await fs.access(backendFile.path, fs.constants.F_OK);
          this.fileList.push(new ClientFile(this, backendFile));
        } catch (e) {
          console.log(`${backendFile.path} 'does not exist'`);
          this.backend.removeFile(backendFile);
        }
      }),
    );
  }

  private async removeFile(file: ClientFile): Promise<void> {
    // Deselect in case it was selected
    this.rootStore.uiStore.deselectFile(file);
    file.dispose();
    this.fileList.remove(file);
    return this.backend.removeFile(file);
  }

  private async updateFromBackend(backendFiles: IFile[]) {
    // removing manually invalid files
    // watching files would be better to remove invalid files
    // files could also have moved, removing them may be undesired then

    // Todo: instead of removing invalid files, add them to an MissingFiles list and prompt to the user?
    // (maybe fetch all files, not only the ones passed given as arguments here)

    const existenceChecker = await Promise.all(
      backendFiles.map(async (backendFile) => {
        try {
          await fs.access(backendFile.path, fs.constants.F_OK);
          return true;
        } catch (err) {
          this.backend.removeFile(backendFile);
          const clientFile = this.fileList.find((f) => backendFile.id === f.id);
          if (clientFile) {
            await this.removeFile(clientFile);
          }
          return false;
        }
      }),
    );

    const existingBackendFiles = backendFiles.filter(
      (_, i) => existenceChecker[i],
    );

    if (this.fileList.length === 0) {
      this.fileList.push(...this.filesFromBackend(existingBackendFiles));
      return;
    }

    if (existingBackendFiles.length === 0) {
      return this.clearFileList();
    }

    return this.replaceFileList(this.filesFromBackend(existingBackendFiles));
  }

  private filesFromBackend(backendFiles: IFile[]): ClientFile[] {
    return backendFiles.map((file) => new ClientFile(this, file));
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
}

export default FileStore;
