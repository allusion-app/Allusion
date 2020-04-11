import { action, observable, computed, runInAction } from 'mobx';

import Backend from '../../backend/Backend';
import RootStore from './RootStore';
import { ID, generateId } from '../../entities/ID';
import { ClientLocation, ILocation, DEFAULT_LOCATION_ID } from '../../entities/Location';
import { IFile, ClientFile } from '../../entities/File';
import { RendererMessenger } from '../../../Messaging';
import { IStringSearchCriteria } from '../../entities/SearchCriteria';

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
      console.error('Default location not properly set-up. This should not happen!');
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

  @action.bound async changeDefaultLocation(dir: string) {
    const loc = this.getDefaultLocation();
    loc.path = dir;
    // Todo: The path isn't observable, so the old path will still appear in the UI
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
  async addDirectory(
    dirInput: Omit<ILocation, 'id' | 'dateAdded'>,
    id = generateId(),
    dateAdded = new Date(),
    initialize?: false,
  ) {
    const dirData: ILocation = { ...dirInput, id, dateAdded };
    const clientDir = new ClientLocation(
      this,
      id,
      dirData.path,
      dirData.dateAdded,
      dirData.tagsToAdd,
    );
    this.locationList.push(clientDir);
    // The function caller is responsible for handling errors.
    await this.backend.createLocation(dirData);

    if (initialize) {
      this.initializeLocation(clientDir);
    }

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

    // Remove files in backend and filestore
    const crit: IStringSearchCriteria<IFile> = {
      key: 'locationId',
      value: id,
      operator: 'equals',
      valueType: 'string',
    };
    const filesToRemove = await this.backend.searchFiles(crit, 'id', 'ASC');
    await this.rootStore.fileStore.removeFilesById(filesToRemove.map((f) => f.id));

    // Remove location locally
    runInAction(() => this.locationList.remove(watchedDir));

    // Remove location from DB through backend
    await this.backend.removeLocation(watchedDir);
  }
}

export default LocationStore;
