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

  get importDirectory() {
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

    const locations = dirs.map(
      (dir) => new ClientLocation(this, dir.id, dir.path, dir.dateAdded, dir.tagsToAdd),
    );

    runInAction(() => {
      this.locationList.clear();
      this.locationList.push(...locations);
    });

    console.log('initializing with ', locations);

    // E.g. in preview window, it's not needed to watch the locations
    if (!autoLoad) return;

    const progressToastKey = 'progress';
    let foundNewFiles = false;

    // TODO: Do this in a web worker, not in the renderer thread!
    // For every location, find its files, and update update the database accordingly
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];

      AppToaster.show({
        // icon: '',
        intent: 'none',
        message: `Looking for new images... [${i + 1} / ${locations.length}]`,
        timeout: 0,
      }, progressToastKey);

      // Find all files in this location
      const filePaths = await loc.init();

      if (loc.isBroken) {
        AppToaster.show({
          intent: 'warning',
          message: `Cannot find Location "${loc.name}"`,
          action: {
            text: 'Recover',
            onClick: () => alert('TODO: Open location recovery dialog'),
          }
        });
        continue;
      }

      // Get files in database for this location
      // TODO: Could be optimized, at startup we already fetch all files - but might not in the future
      const dbFiles = await this.findLocationFiles(loc.id);

      // Find all files that have been created (those on disk but not in DB)
      // TODO: Can be optimized: Sort dbFiles, so the includes check can be a binary search
      const createdPaths = filePaths.filter(path => !dbFiles.find(dbFile => dbFile.path === path));
      const createdFiles = await Promise.all(
        createdPaths.map((path) => this.pathToIFile(path, loc.id, loc.tagsToAdd.toJS())));

      // Find all files that have been removed (those in DB but not on disk)
      const missingFiles = dbFiles.filter(file => !filePaths.includes(file.path));

      // Find matches between removed and created images (different name/path but same characteristics)
      // TODO: Should we also do cross-location matching?
      const matches = missingFiles.map(
        mf => createdFiles.find(
          cf => (
            mf.width === cf.width &&
            mf.height === cf.height &&
            mf.size === cf.size
      )));

      const foundMatches = matches.filter(m => m !== undefined);
      if (foundMatches.length > 0) {
        console.log(`DEBUG: Found ${foundMatches.length} renamed/moved files in location ${loc.name}. These are detected as new files, but will instead replace their original entry in the DB of Allusion`);
        // These files have been renamed -> update backend file to retain tags
        // TODO: remove thumbnail as well (clean-up needed, since the path changed)
        await Promise.all(matches.map((match, missingFilesIndex) => !match ? undefined :
          this.backend.saveFile({
            ...missingFiles[missingFilesIndex],
            path: match.path,
          }),
        ));
      }

      // For createdFiles without a match, insert them in the DB as new files
      const newFiles = createdFiles.filter(cf => !matches.includes(cf));
      await this.backend.createFilesFromPath(loc.path, newFiles);

      // For dbFiles without a match, mark them as missing (decided not to permanently delete them)
      const deletedFiles = matches.map((match, i) => !match ? missingFiles[i] : undefined);
      if (deletedFiles.length > 0) {
        console.log(`DEBUG: Found ${deletedFiles.length} removed files in location ${loc.name}. This will be shown as 'broken' images and will have to be removed manually in the Recovery panel`);
        // They'll be marked as broken after being fetched. The user will have to manually remove them then, no need to update with isBroken
        // await Promise.all(deletedFiles.map(f => this.backend.saveFile({ ...f, isBroken: true });
      }

      // TODO: Also update files that have changed, e.g. when overwriting a file (with same filename)
      // Look at modified date? Or file size? For these ones, update metadata (resolution, size) and recreate thumbnail
      foundNewFiles = foundNewFiles || newFiles.length > 0;
    }

    if (foundNewFiles) {
      AppToaster.show({
        message: 'New images detected!',
        intent: 'success',
        action: {
          text: 'Refresh',
          onClick: this.rootStore.fileStore.refetch,
        }
      }, progressToastKey);
    } else {
      AppToaster.dismiss(progressToastKey);
    }
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
  @action.bound async initializeLocation(loc: ClientLocation) {
    const toastKey = `initialize-${loc.id}`;

    AppToaster.show({ message: 'Finding all images...', timeout: 0 }, toastKey);
    const filePaths = await loc.init();

    AppToaster.show({ message: 'Gathering image metadata...', timeout: 0 }, toastKey);
    const files = await Promise.all(
        filePaths.map(path => this.pathToIFile(path, loc.id, loc.tagsToAdd.toJS())));

    AppToaster.show({ message: 'Updating database...', timeout: 0 }, toastKey);
    await this.backend.createFilesFromPath(loc.path, files);

    AppToaster.show({
      message: `Location "${loc.name}" is ready!`,
      intent: 'success',
      timeout: 0,
      action: {
        text: 'Refresh',
        onClick: this.rootStore.fileStore.refetch,
      }
    }, toastKey);
  }

  @action.bound async removeDirectory(id: ID) {
    const watchedDir = this.locationList.find((dir) => dir.id === id);
    if (!watchedDir) {
      console.log('Cannot remove watched directory: ID not found', id);
      return;
    }

    const filesToRemove = await this.findLocationFiles(id)
    await this.rootStore.fileStore.removeFilesById(filesToRemove.map((f) => f.id));

    // Remove location locally
    runInAction(() => this.locationList.remove(watchedDir));

    // Remove location from DB through backend
    await this.backend.removeLocation(watchedDir);
  }

  @action.bound private addLocation(location: ClientLocation) {
    this.locationList.push(location);
  }

  /**
   * Fetches the files belonging to this location
   */
  protected async findLocationFiles(locationId: ID) {
    const crit = new ClientStringSearchCriteria('locationId', locationId, 'equals').serialize();
    return this.backend.searchFiles(crit, 'id', 'ASC');
  }
}

export default LocationStore;
