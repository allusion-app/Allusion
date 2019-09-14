import { action, observable } from 'mobx';

import Backend from '../../backend/Backend';
import RootStore from './RootStore';
import { ID, generateId } from '../../entities/ID';
import { ClientWatchedDirectory, IWatchedDirectory } from '../../entities/WatchedDirectory';
import { IFile, ClientFile } from '../../entities/File';

class WatchedDirectoryStore {
  backend: Backend;
  rootStore: RootStore;

  readonly directoryList = observable<ClientWatchedDirectory>([]);

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
  }

  async init(autoScan: boolean) {
    // Get dirs from backend
    const dirs = await this.backend.getWatchedDirectories('dateAdded', true);

    const clientDirs = dirs.map((dir) =>
      new ClientWatchedDirectory(this, dir.id, dir.path, dir.recursive, dir.dateAdded, dir.tagToAdd));

    const initialPathLists = await Promise.all(clientDirs.map((clientDir) => clientDir.init()));

    const initialFileLists = await Promise.all(
      initialPathLists.map(async (paths, i): Promise<IFile[]> => {
        const dir = clientDirs[i];
        const tagsToAdd = dir.tagToAdd ? [dir.tagToAdd] : [];
        return Promise.all(
          paths.map(async (path): Promise<IFile> => ({
            path,
            id: generateId(),
            tags: tagsToAdd,
            dateAdded: new Date(),
            ...await ClientFile.getMetaData(path),
          }),
        ));
      }),
    );

    await Promise.all(
      initialFileLists.map(
        (initFiles, i) => this.backend.createFilesFromPath(clientDirs[i].path, initFiles)));
  }

  @action
  async addDirectory(dirInput: Omit<IWatchedDirectory, 'id' | 'dateAdded'>, id = generateId(), dateAdded = new Date()) {
    const dirData: IWatchedDirectory = { ...dirInput, id, dateAdded };
    const clientDir = new ClientWatchedDirectory(
      this, id, dirData.path, dirData.recursive, dirData.dateAdded, dirData.tagToAdd);
    // The function caller is responsible for handling errors.
    await this.backend.createWatchedDirectory(dirData);
    this.directoryList.push(clientDir);
    return clientDir;
  }

  @action
  async removeDirectory(id: ID) {
    const watchedDir = this.directoryList.find((dir) => dir.id === id);
    if (!watchedDir) {
      console.log('Cannot remove watched directory: ID not found', id);
      return;
    }

    // Todo: Remove files in backend and filestore
    // Search in backend for files that start with watchedDir.path
    // const filesToRemove = ...

    // Remove entity from DB through backend
    await this.backend.removeWatchedDirectory(watchedDir);
  }
}

export default WatchedDirectoryStore;
