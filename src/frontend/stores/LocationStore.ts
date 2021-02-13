import { action, observable, runInAction, makeObservable } from 'mobx';
import SysPath from 'path';
import React from 'react';

import Backend from 'src/backend/Backend';
import { FileOrder } from 'src/backend/DBRepository';
import { ID, generateId } from 'src/entities/ID';
import { IFile, getMetaData } from 'src/entities/File';
import { ClientLocation } from 'src/entities/Location';
import { ClientStringSearchCriteria } from 'src/entities/SearchCriteria';
import RootStore from './RootStore';
import { promiseAllLimit } from '../utils';
import { AppToaster } from 'src/frontend/components/Toaster';

class LocationStore {
  private readonly backend: Backend;
  private readonly rootStore: RootStore;

  readonly locationList = observable<ClientLocation>([]);

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    makeObservable(this);
  }

  @action async init() {
    // Get dirs from backend
    const dirs = await this.backend.fetchLocations('dateAdded', FileOrder.Asc);
    const locations = dirs.map((dir) => new ClientLocation(this, dir.id, dir.path, dir.dateAdded));
    runInAction(() => this.locationList.replace(locations));
  }

  // E.g. in preview window, it's not needed to watch the locations
  @action async watchLocations() {
    const progressToastKey = 'progress';
    let foundNewFiles = false;
    const len = this.locationList.length;
    const getLocation = action((index: number) => this.locationList[index]);

    // TODO: Do this in a web worker, not in the renderer thread!
    // For every location, find its files, and update the database accordingly.
    for (let i = 0; i < len; i++) {
      const location = getLocation(i);

      AppToaster.show(
        {
          message: `Looking for new images... [${i + 1} / ${len}]`,
          timeout: 0,
        },
        progressToastKey,
      );

      // TODO: Add a maximum timeout for init: sometimes it's hanging for me. Could also be some of the following steps though
      const filePaths = await location.init();

      if (filePaths === undefined) {
        AppToaster.show(
          {
            message: `Cannot find Location "${location.name}"`,
            timeout: 0,
          },
          `missing-loc-${location.id}`,
        ); // a key such that the toast can be dismissed automatically on recovery
        return;
      }

      // Get files in database for this location
      // TODO: Could be optimized, at startup we already fetch all files - but might not in the future
      const dbFiles = await this.findLocationFiles(location.id);

      // Find all files that have been created (those on disk but not in DB)
      // TODO: Can be optimized: Sort dbFiles, so the includes check can be a binary search
      const createdPaths = filePaths.filter(
        (path) => !dbFiles.find((dbFile) => dbFile.absolutePath === path),
      );
      const createdFiles = await Promise.all(
        createdPaths.map((path) => pathToIFile(path, location)),
      );

      // Find all files that have been removed (those in DB but not on disk)
      const missingFiles = dbFiles.filter((file) => !filePaths.includes(file.absolutePath));

      // Find matches between removed and created images (different name/path but same characteristics)
      // TODO: Should we also do cross-location matching?
      const matches = missingFiles.map((mf) =>
        createdFiles.find(
          (cf) => mf.width === cf.width && mf.height === cf.height && mf.size === cf.size,
        ),
      );

      console.debug('missing', missingFiles, 'created', createdFiles, 'matches', matches);

      // Update renamed files in backend
      const foundMatches = matches.filter((m) => m !== undefined) as IFile[];
      if (foundMatches.length > 0) {
        console.debug(
          `Found ${foundMatches.length} renamed/moved files in location ${location.name}. These are detected as new files, but will instead replace their original entry in the DB of Allusion`,
          foundMatches,
        );
        // TODO: remove thumbnail as well (clean-up needed, since the path changed)
        const files: IFile[] = [];
        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          if (match !== undefined) {
            files.push({
              ...missingFiles[i],
              absolutePath: match.absolutePath,
              relativePath: match.relativePath,
            });
          }
        }
        await this.backend.saveFiles(files);
      }

      // For createdFiles without a match, insert them in the DB as new files
      const newFiles = createdFiles.filter((cf) => !foundMatches.includes(cf));
      await this.backend.createFilesFromPath(location.path, newFiles);

      // TODO: Also update files that have changed, e.g. when overwriting a file (with same filename)
      // Look at modified date? Or file size? For these ones, update metadata (resolution, size) and recreate thumbnail
      foundNewFiles = foundNewFiles || newFiles.length > 0;
    }

    if (foundNewFiles) {
      AppToaster.show({ message: 'New images detected.', timeout: 5000 }, progressToastKey);
    } else {
      AppToaster.dismiss(progressToastKey);
    }
    return foundNewFiles;
  }

  @action get(locationId: ID): ClientLocation | undefined {
    return this.locationList.find((loc) => loc.id === locationId);
  }

  @action async changeLocationPath(location: ClientLocation, newPath: string): Promise<void> {
    const index = this.locationList.findIndex((l) => l.id === location.id);
    if (index === -1) {
      throw new Error(`The location ${location.name} has already been removed.`);
    }
    // First, update the absolute path of all files from this location
    const locFiles = await this.findLocationFiles(location.id);
    const files: IFile[] = locFiles.map((f) => ({
      ...f,
      absolutePath: SysPath.join(newPath, f.relativePath),
    }));
    await this.backend.saveFiles(files);

    const newLocation = new ClientLocation(this, location.id, newPath, location.dateAdded);
    this.set(index, newLocation);
    await this.initLocation(newLocation);
    await this.backend.saveLocation(newLocation.serialize());
    // Refetch files in case some were from this location and could not be found before
    this.rootStore.fileStore.refetch();

    // Dismiss the 'Cannot find location' toast if it is still open
    AppToaster.dismiss(`missing-loc-${newLocation.id}`);
  }

  @action exists(predicate: (location: ClientLocation) => boolean): boolean {
    return this.locationList.some(predicate);
  }

  @action.bound async create(path: string): Promise<ClientLocation> {
    const location = new ClientLocation(this, generateId(), path, new Date());
    await this.backend.createLocation(location.serialize());
    runInAction(() => this.locationList.push(location));
    return location;
  }

  /** Imports all files from a location into the FileStore */
  @action.bound async initLocation(location: ClientLocation) {
    const toastKey = `initialize-${location.id}`;

    const isCancelled = false;
    // const handleCancelled = () => {
    //   console.debug('clicked cancel');
    //   isCancelled = true;
    //   this.delete(location);
    // };

    AppToaster.show(
      {
        message: 'Finding all images...',
        timeout: 0,
      },
      toastKey,
    );

    const filePaths = await location.init(() => isCancelled);

    if (isCancelled || filePaths === undefined) {
      return;
    }

    const showProgressToaster = (progress: number) =>
      !isCancelled &&
      AppToaster.show(
        {
          // message: 'Gathering image metadata...',
          message: `Loading ${Math.trunc(progress * 100)}%...`,
          timeout: 0,
        },
        toastKey,
      );

    showProgressToaster(0);

    // Load file meta info, with only N jobs in parallel and a progress + cancel callback
    // TODO: Should make N configurable, or determine based on the system/disk performance
    const N = 50;
    const files = await promiseAllLimit(
      filePaths.map((path) => () => pathToIFile(path, location)),
      N,
      showProgressToaster,
      () => isCancelled,
    );

    AppToaster.show({ message: 'Updating database...', timeout: 0 }, toastKey);
    await this.backend.createFilesFromPath(location.path, files);

    AppToaster.show({ message: `Location "${location.name}" is ready!`, timeout: 5000 }, toastKey);
    this.rootStore.fileStore.refetch();
  }

  @action.bound async delete(location: ClientLocation) {
    // Remove location from DB through backend
    await this.backend.removeLocation(location.id);
    runInAction(() => {
      // Remove deleted files from selection
      for (const file of this.rootStore.uiStore.fileSelection) {
        if (file.locationId === location.id) {
          this.rootStore.uiStore.deselectFile(file);
        }
      }
      // Remove location locally
      this.locationList.remove(location);

      // TODO: Update untagged image counter
    });
    this.rootStore.fileStore.refetch();
  }

  @action async addFile(path: string, location: ClientLocation) {
    const file = await pathToIFile(path, location);
    await this.backend.createFilesFromPath(path, [file]);

    AppToaster.show({ message: 'New images have been detected.', timeout: 5000 });
    this.rootStore.fileStore.refetch();
  }

  @action hideFile(path: string) {
    const fileStore = this.rootStore.fileStore;
    const clientFile = fileStore.fileList.find((f) => f.absolutePath === path);
    if (clientFile !== undefined) {
      fileStore.hideFile(clientFile);
      fileStore.refetch();
    }

    AppToaster.show(
      {
        message: 'Some images have gone missing!',
        timeout: 0,
      },
      'missing',
    );
  }

  /**
   * Fetches the files belonging to a location
   */
  @action async findLocationFiles(locationId: ID): Promise<IFile[]> {
    const crit = new ClientStringSearchCriteria('locationId', locationId, 'equals').serialize();
    return this.backend.searchFiles(crit, 'id', FileOrder.Asc);
  }

  @action private set(index: number, location: ClientLocation) {
    this.locationList[index] = location;
  }
}

async function pathToIFile(path: string, loc: ClientLocation): Promise<IFile> {
  return {
    absolutePath: path,
    relativePath: path.replace(loc.path, ''),
    id: generateId(),
    locationId: loc.id,
    tags: [],
    dateAdded: new Date(),
    dateModified: new Date(),
    ...(await getMetaData(path)),
  };
}

export default LocationStore;
