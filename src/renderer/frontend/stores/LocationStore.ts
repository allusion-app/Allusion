import { action, observable, computed, runInAction } from 'mobx';

import Backend from '../../backend/Backend';
import RootStore from './RootStore';
import { ID, generateId } from '../../entities/ID';
import { ClientLocation, DEFAULT_LOCATION_ID } from '../../entities/Location';
import { IFile, ClientFile } from '../../entities/File';
import { RendererMessenger } from '../../../Messaging';
import { ClientStringSearchCriteria } from '../../entities/SearchCriteria';
import { AppToaster } from '../App';

class LocationStore {
  backend: Backend;
  rootStore: RootStore;

  readonly locationList = observable<ClientLocation>([]);

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
  }

  @computed get importDirectory() {
    const location = this.get(DEFAULT_LOCATION_ID);
    if (!location) {
      console.warn('Default location not properly set-up. This should not happen!');
      return '';
    }
    return location.path;
  }

  @action.bound
  async init(autoLoad: boolean) {
    // Get dirs from backend
    const dirs = await this.backend.getWatchedDirectories('dateAdded', 'ASC');

    const clientDirs = dirs.map(
      (dir) => new ClientLocation(this, dir.id, dir.path, dir.dateAdded, dir.tagsToAdd),
    );

    this.locationList.push(...clientDirs);

    // E.g. in preview window, it's not needed to watch the locations
    if (!autoLoad) return;

    const initialPathLists = await Promise.all(clientDirs.map((clientDir) => clientDir.init()));

    // TODO: Initialize in batches
    // TODO: Should try catch finally
    // Should show a progress-toast indicator
    const progressToastKey = 'progress';
    AppToaster.show({
      // icon: '',
      intent: 'none',
      message: 'Loading files... [X]%',
      timeout: 0,
    }, progressToastKey);

    const initialFileLists = await Promise.all(
      initialPathLists.map(
        async (paths, i): Promise<IFile[]> => {
          const dir = clientDirs[i];
          return Promise.all(
            paths.map(async (path) => this.pathToIFile(path, dir.id, dir.tagsToAdd.toJS())),
          );
        },
      ),
    );

    // Sync file changes with DB
    await Promise.all(
      initialFileLists.map((initFiles, i) =>
        this.backend.createFilesFromPath(clientDirs[i].path, initFiles),
      ),
    );

    AppToaster.show({
      message: 'Files loaded!',
      intent: 'success',
      timeout: 2500,
    }, progressToastKey);
  }

  @action.bound get(locationId: ID): ClientLocation | undefined {
    return this.locationList.find((loc) => loc.id === locationId);
  }

  @action.bound getDefaultLocation() {
    const defaultLocation = this.get(DEFAULT_LOCATION_ID);
    if (!defaultLocation) {
      throw new Error('Default location not found. This should not happen!');
    }
    return defaultLocation;
  }

  @action.bound async setDefaultLocation(dir: string) {
    const loc = this.get(DEFAULT_LOCATION_ID);
    if (!loc) {
      console.warn('Default location not found. This should only happen on first launch!');
      const l = new ClientLocation(this, DEFAULT_LOCATION_ID, dir, new Date());
      await this.backend.createLocation(l.serialize());
      this.addLocation(l);
      return;
    }
    loc.path = dir;
    await this.backend.saveLocation(loc.serialize());
    // Todo: What about the files inside that loc? Keep them in DB? Move them over?
    RendererMessenger.setDownloadPath({ dir });
  }

  async pathToIFile(path: string, locationId: ID, tagsToAdd?: ID[]): Promise<IFile> {
    return {
      path,
      id: generateId(),
      locationId,
      tags: tagsToAdd || [],
      dateAdded: new Date(),
      dateModified: new Date(),
      ...(await ClientFile.getMetaData(path)),
    };
  }

  @action.bound
  async addDirectory(path: string, tags: string[] = [], dateAdded = new Date()) {
    const clientDir = new ClientLocation(this, generateId(), path, dateAdded, tags);
    this.addLocation(clientDir);
    // The function caller is responsible for handling errors.
    await this.backend.createLocation(clientDir.serialize());
    return clientDir;
  }

  /** Imports all files from a location into the FileStore */
  @action.bound initializeLocation(clientDir: ClientLocation) {
    // Import files of dir
    clientDir.init().then((filePaths) => {
      for (const path of filePaths) {
        this.rootStore.fileStore.addFile(path, clientDir.id);
      }
      this.rootStore.fileStore.refetch();
    });
  }

  @action.bound async removeDirectory(id: ID) {
    const watchedDir = this.locationList.find((dir) => dir.id === id);
    if (!watchedDir) {
      console.log('Cannot remove watched directory: ID not found', id);
      return;
    }

    const crit = new ClientStringSearchCriteria('locationId', id, 'equals').serialize();
    const filesToRemove = await this.backend.searchFiles(crit, 'id', 'ASC');
    await this.rootStore.fileStore.removeFilesById(filesToRemove.map((f) => f.id));

    // Remove location locally
    runInAction(() => this.locationList.remove(watchedDir));

    // Remove location from DB through backend
    await this.backend.removeLocation(watchedDir);
  }

  @action.bound private addLocation(location: ClientLocation) {
    this.locationList.push(location);
  }
}

export default LocationStore;
