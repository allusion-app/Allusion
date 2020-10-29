import { action, computed, observable, runInAction, makeObservable } from 'mobx';
import SysPath from 'path';
import React from 'react';

import Backend from '../../backend/Backend';
import RootStore from './RootStore';
import { ID, generateId } from '../../entities/ID';
import { ClientLocation, DEFAULT_LOCATION_ID, ILocation } from '../../entities/Location';
import { IFile, getMetaData } from '../../entities/File';
import { RendererMessenger } from '../../../Messaging';
import { ClientStringSearchCriteria } from '../../entities/SearchCriteria';
import { AppToaster } from '../App';
import { promiseAllLimit } from '../utils';
import { IconSet } from 'components/Icons';
import { FileOrder } from 'src/renderer/backend/DBRepository';

class LocationStore {
  private readonly backend: Backend;
  private readonly rootStore: RootStore;

  readonly locationList = observable<ClientLocation>([]);

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    makeObservable(this);
  }

  @action async init(autoLoad: boolean) {
    // Get dirs from backend
    const dirs = await this.backend.fetchLocations('dateAdded', FileOrder.ASC);
    runInAction(() =>
      this.locationList.replace(
        dirs.map((dir) => new ClientLocation(this, dir.id, dir.path, dir.dateAdded)),
      ),
    );

    // E.g. in preview window, it's not needed to watch the locations
    if (!autoLoad) {
      return;
    }

    const progressToastKey = 'progress';
    let foundNewFiles = false;

    // TODO: Do this in a web worker, not in the renderer thread!
    runInAction(() => {
      // For every location, find its files, and update the database accordingly.
      for (let i = 0; i < this.locationList.length; i++) {
        const location = this.locationList[i];

        AppToaster.show(
          {
            // icon: '',
            intent: 'none',
            message: `Looking for new images... [${i + 1} / ${this.locationList.length}]`,
            timeout: 0,
          },
          progressToastKey,
        );

        // TODO: Also update files that have changed, e.g. when overwriting a file (with same filename)
        // Look at modified date? Or file size? For these ones, update metadata (resolution, size) and recreate thumbnail
        this.loadLocation(location).then((hasFiles) => {
          if (hasFiles !== undefined) {
            foundNewFiles = foundNewFiles || hasFiles;
          }
        });
      }
    });

    if (foundNewFiles) {
      AppToaster.show({ message: 'New images detected.', intent: 'primary' }, progressToastKey);
      this.rootStore.fileStore.refetch();
    } else {
      AppToaster.dismiss(progressToastKey);
    }
  }

  @computed get importDirectory() {
    const location = this.get(DEFAULT_LOCATION_ID);
    if (!location) {
      console.warn('Default location not properly set-up. This should not happen!');
      return '';
    }
    return location.path;
  }

  @computed get defaultLocation(): ClientLocation {
    const defaultLocation = this.get(DEFAULT_LOCATION_ID);
    if (!defaultLocation) {
      throw new Error('Default location not found. This should not happen!');
    }
    return defaultLocation;
  }

  @action.bound get(locationId: ID): ClientLocation | undefined {
    return this.locationList.find((loc) => loc.id === locationId);
  }

  @action.bound async setDefaultLocation(dir: string): Promise<void> {
    const loc = this.get(DEFAULT_LOCATION_ID);
    if (loc === undefined) {
      console.warn('Default location not found. This should only happen on first launch!');
      const location = new ClientLocation(this, DEFAULT_LOCATION_ID, dir);
      await this.backend.createLocation(location.serialize());
      runInAction(() => this.locationList.push(location));
      return;
    }
    loc.setPath(dir);
    await this.backend.saveLocation(loc.serialize());
    // Todo: What about the files inside that loc? Keep them in DB? Move them over?
    RendererMessenger.setDownloadPath({ dir });
  }

  @action.bound async changeLocationPath(location: ClientLocation, newPath: string) {
    // First, update the absolute path of all files from this location
    const locFiles = await this.findLocationFiles(location.id);
    await Promise.all(
      locFiles.map((f) =>
        this.backend.saveFile({
          ...f,
          absolutePath: SysPath.join(newPath, f.relativePath),
        }),
      ),
    );
    location.setPath(newPath);
    location.setBroken(false);
    // Refetch files in case some were from this location and could not be found before
    this.rootStore.fileStore.refetch();

    // Dismiss the 'Cannot find location' toast if it is still open
    AppToaster.dismiss(`missing-loc-${location.id}`);
  }

  @action exists(predicate: (location: ClientLocation) => boolean): boolean {
    return this.locationList.some(predicate);
  }

  @action.bound async create(path: string): Promise<ClientLocation> {
    const location = new ClientLocation(this, generateId(), path);
    await this.backend.createLocation(location.serialize());
    runInAction(() => this.locationList.push(location));
    return location;
  }

  /** Imports all files from a location into the FileStore */
  @action.bound async initializeLocation(location: ClientLocation) {
    const toastKey = `initialize-${location.id}`;

    let isCancelled = false;
    const handleCancelled = () => {
      console.debug('clicked cancel');
      isCancelled = true;
      this.delete(location);
    };

    AppToaster.show(
      {
        message: 'Finding all images...',
        timeout: 0,
        className: 'toast-without-dismiss',
        action: {
          text: 'Cancel',
          onClick: handleCancelled,
        },
      },
      toastKey,
    );

    const { name, path } = location;
    const filePaths = await location.init(() => isCancelled);

    if (isCancelled || filePaths === undefined) {
      return;
    }

    const showProgressToaster = (progress: number) =>
      !isCancelled &&
      AppToaster.show(
        {
          // message: 'Gathering image metadata...',
          message: <progress value={progress} />,
          timeout: 0,
          className: 'toast-without-dismiss',
          action: {
            text: 'Cancel',
            onClick: handleCancelled,
          },
        },
        toastKey,
      );

    showProgressToaster(0);

    // Load file meta info, with only N jobs in parallel and a progress + cancel callback
    // TODO: Should make N configurable, or determine based on the system/disk performance
    const N = 50;
    const files = await promiseAllLimit(
      filePaths.map((path) => async () => {
        const f = await pathToIFile(path, location);
        // await timeout(1000); // artificial timeout to see the progress bar a little longer
        return f;
      }),
      N,
      showProgressToaster,
      () => isCancelled,
    );

    AppToaster.show({ message: 'Updating database...', timeout: 0 }, toastKey);
    await this.backend.createFilesFromPath(path, files);

    AppToaster.show({ message: `Location "${name}" is ready!`, intent: 'success' }, toastKey);
    this.rootStore.fileStore.refetch();
  }

  @action.bound async delete(location: ClientLocation) {
    const filesToRemove = await this.findLocationFiles(location.id);
    await this.rootStore.fileStore.deleteFiles(filesToRemove.map((f) => f.id));

    // Remove location from DB through backend
    await this.backend.removeLocation(location.id);

    // Remove location locally
    runInAction(() => this.locationList.remove(location));
  }

  @action.bound async addFile(path: string, location: ClientLocation) {
    const file = await pathToIFile(path, location);
    await this.backend.createFilesFromPath(path, [file]);

    AppToaster.show({ message: 'New images have been detected.', intent: 'primary' });
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
        intent: 'warning',
        timeout: 0,
        action: {
          icon: IconSet.WARNING_BROKEN_LINK,
          onClick: fileStore.fetchMissingFiles,
        },
      },
      'missing',
    );
  }

  save(location: ILocation) {
    this.backend.saveLocation(location);
  }

  /**
   * Fetches the files belonging to a location
   */
  @action async findLocationFiles(locationId: ID): Promise<IFile[]> {
    const crit = new ClientStringSearchCriteria('locationId', locationId, 'equals').serialize();
    return this.backend.searchFiles(crit, 'id', FileOrder.ASC);
  }

  @action private async loadLocation(location: ClientLocation): Promise<boolean | undefined> {
    const { name, path } = location;
    // Find all files in this location
    const filePaths = await location.init();

    if (filePaths === undefined) {
      AppToaster.show(
        {
          intent: 'warning',
          message: `Cannot find Location "${name}"`,
          action: {
            text: 'Recover',
            onClick: () => this.rootStore.uiStore.openLocationRecovery(location.id),
          },
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
    const createdFiles = await Promise.all(createdPaths.map((path) => pathToIFile(path, location)));

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

    const foundMatches = matches.filter((m) => m !== undefined);
    if (foundMatches.length > 0) {
      console.debug(
        `Found ${foundMatches.length} renamed/moved files in location ${name}. These are detected as new files, but will instead replace their original entry in the DB of Allusion`,
        foundMatches,
      );
      // These files have been renamed -> update backend file to retain tags
      // TODO: remove thumbnail as well (clean-up needed, since the path changed)
      await Promise.all(
        matches.map((match, missingFilesIndex) =>
          !match
            ? undefined
            : this.backend.saveFile({
                ...missingFiles[missingFilesIndex],
                absolutePath: match.absolutePath,
                relativePath: match.relativePath,
              }),
        ),
      );
    }

    // For createdFiles without a match, insert them in the DB as new files
    const newFiles = createdFiles.filter((cf) => !matches.includes(cf));
    await this.backend.createFilesFromPath(path, newFiles);

    // For dbFiles without a match, mark them as missing (decided not to permanently delete them)
    const deletedFiles = matches.map((match, i) => (!match ? missingFiles[i] : undefined));
    if (deletedFiles.length > 0) {
      console.debug(
        `Found ${deletedFiles.length} removed files in location ${name}. This will be shown as 'broken' images and will have to be removed manually in the Recovery panel`,
        deletedFiles,
      );
      // They'll be marked as broken after being fetched. The user will have to manually remove them then, no need to update with isBroken
      // await Promise.all(deletedFiles.map(f => this.backend.saveFile({ ...f, isBroken: true });
    }
    return newFiles.length > 0;
  }
}

const pathToIFile = action(
  async (path: string, loc: ClientLocation): Promise<IFile> => {
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
  },
);

export default LocationStore;
