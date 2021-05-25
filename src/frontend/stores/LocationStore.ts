import { action, flow, makeObservable, observable } from 'mobx';
import { CancellablePromise } from 'mobx/dist/internal';
import SysPath from 'path';
import Backend from 'src/backend/Backend';
import { FileOrder } from 'src/backend/DBRepository';
import { getMetaData, IFile } from 'src/entities/File';
import { generateId, ID } from 'src/entities/ID';
import { ClientLocation, ILocation } from 'src/entities/Location';
import { ClientStringSearchCriteria } from 'src/entities/SearchCriteria';
import { AppToaster } from 'src/frontend/components/Toaster';
import { promiseAllLimit } from '../utils';
import RootStore from './RootStore';

export const PROGRESS_KEY = 'progress';

function areFilesIdenticalBesidesName(a: IFile, b: IFile): boolean {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.size === b.size &&
    a.dateCreated.getTime() === b.dateCreated.getTime()
  );
}

class LocationStore {
  private readonly backend: Backend;
  private readonly rootStore: RootStore;

  readonly locationList = observable<ClientLocation>([]);

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    makeObservable(this);
  }

  init: () => CancellablePromise<void> = flow(function* (this: LocationStore) {
    // Get dirs from backend
    const dirs: ILocation[] = yield this.backend.fetchLocations('dateAdded', FileOrder.Asc);
    const locations = dirs.map((dir) => new ClientLocation(this, dir.id, dir.path, dir.dateAdded));
    this.locationList.replace(locations);
  });

  // E.g. in preview window, it's not needed to watch the locations
  // Returns whether files have been added, changed or removed
  watchLocations: (
    progressHook: (message: string, key: string) => void,
    startTimer: (id: string) => number,
  ) => CancellablePromise<boolean> = flow(function* (
    this: LocationStore,
    progressHook: (message: string, key: string) => void,
    startTimer: (id: string) => number,
  ) {
    let foundNewFiles = false;
    const len = this.locationList.length;

    // TODO: Do this in a web worker, not in the renderer thread!
    // For every location, find its files, and update the database accordingly.
    for (let i = 0; i < len; i++) {
      const location = this.locationList[i];
      // TODO: Pass to hook some kind of Result type.
      progressHook(`Looking for new images... [${i + 1} / ${len}]`, PROGRESS_KEY);

      // TODO: Add a maximum timeout for init: sometimes it's hanging for me. Could also be some of the following steps though
      // added a retry toast for now, can't figure out the cause, and it's hard to reproduce
      const readyTimeout = startTimer(location.id);

      console.debug('Location init...');
      const filePaths: string[] | undefined = yield location.initWorker();
      const filePathsSet = new Set(filePaths);

      clearTimeout(readyTimeout);

      // FIXME: Toasts should not be abused for error handling. Create some error messaging mechanism.
      if (filePaths === undefined) {
        // a key such that the toast can be dismissed automatically on recovery
        progressHook(`Cannot find Location "${location.name}"`, `missing-loc-${location.id}`);
        continue;
      }

      // Get files in database for this location
      // TODO: Could be optimized, at startup we already fetch all files - but might not in the future
      console.debug('Find location files...');
      const dbFiles: IFile[] = yield this.findLocationFiles(location.id);
      const dbFilesPathSet = new Set(dbFiles.map((f) => f.absolutePath));

      console.log('Finding created files...');
      // Find all files that have been created (those on disk but not in DB)
      const createdPaths = filePaths.filter((path) => !dbFilesPathSet.has(path));
      const createdFiles: IFile[] = yield Promise.all(
        createdPaths.map((path) => pathToIFile(path, location)),
      );

      // Find all files that have been removed (those in DB but not on disk anymore)
      const missingFiles = dbFiles.filter((file) => !filePathsSet.has(file.absolutePath));

      // Find matches between removed and created images (different name/path but same characteristics)
      // TODO: Should we also do cross-location matching?
      const createdMatches = missingFiles.map((mf) =>
        createdFiles.find((cf) => areFilesIdenticalBesidesName(cf, mf)),
      );
      // Also look for duplicate files: when a files is renamed/moved it will become a new entry
      const dbMatches = missingFiles.map(
        (missingDbFile, i) =>
          !createdMatches[i] &&
          dbFiles.find(
            (otherDbFile) =>
              missingDbFile !== otherDbFile &&
              areFilesIdenticalBesidesName(missingDbFile, otherDbFile),
          ),
      );

      console.debug({ missingFiles, createdFiles, createdMatches, dbMatches });

      // Update renamed files in backend
      const foundCreatedMatches = createdMatches.filter((m) => m !== undefined) as IFile[];
      if (foundCreatedMatches.length > 0) {
        // TODO: remove thumbnail as well (clean-up needed, since the path changed)
        const files: IFile[] = [];
        for (let i = 0; i < createdMatches.length; i++) {
          const match = createdMatches[i];
          if (match) {
            files.push({
              ...missingFiles[i],
              absolutePath: match.absolutePath,
              relativePath: match.relativePath,
            });
          }
        }
        // There might be duplicates, so convert to set
        yield this.backend.saveFiles(Array.from(new Set(files)));
      }

      const numDbMatches = dbMatches.filter((f) => Boolean(f));
      if (numDbMatches.length > 0) {
        // If you have allusion open and rename/move files, they are automatically created as new files while the old one sticks around
        // In here we transfer the tag data over from the old entry to the new one, and delete the old entry
        const files: IFile[] = [];
        for (let i = 0; i < dbMatches.length; i++) {
          const match = dbMatches[i];
          if (match) {
            files.push({
              ...match,
              tags: Array.from(new Set([...missingFiles[i].tags, ...match.tags])),
            });
          }
        }
        // Transfer over tag data on the matched files
        yield this.backend.saveFiles(Array.from(new Set(files)));
        // Remove missing files that have a match in the database
        yield this.backend.removeFiles(
          missingFiles.filter((_, i) => Boolean(dbMatches[i])).map((f) => f.id),
        );
        foundNewFiles = true; // Trigger a refetch
      }

      // For createdFiles without a match, insert them in the DB as new files
      const newFiles = createdFiles.filter((cf) => !foundCreatedMatches.includes(cf));
      if (newFiles.length) {
        yield this.backend.createFilesFromPath(location.path, newFiles);
      }

      // TODO: Also update files that have changed, e.g. when overwriting a file (with same filename)
      // Look at modified date? Or file size? For these ones, update metadata (resolution, size) and recreate thumbnail
      foundNewFiles = foundNewFiles || newFiles.length > 0;
    }
    return foundNewFiles;
  });

  @action get(locationId: ID): ClientLocation | undefined {
    return this.locationList.find((loc) => loc.id === locationId);
  }

  changeLocationPath = flow(function* (
    this: LocationStore,
    location: ClientLocation,
    newPath: string,
  ) {
    const index = this.locationList.findIndex((l) => l.id === location.id);
    if (index === -1) {
      throw new Error(`The location ${location.name} has already been removed.`);
    }
    console.log('changing location path', location, newPath);
    // First, update the absolute path of all files from this location
    const locFiles: IFile[] = yield this.findLocationFiles(location.id);
    const files: IFile[] = locFiles.map((f) => ({
      ...f,
      absolutePath: SysPath.join(newPath, f.relativePath),
    }));
    yield this.backend.saveFiles(files);

    const newLocation = new ClientLocation(this, location.id, newPath, location.dateAdded);
    this.locationList[index] = newLocation;
    yield this.initLocation(newLocation);
    yield this.backend.saveLocation(newLocation.serialize());
  });

  @action exists(predicate: (location: ClientLocation) => boolean): boolean {
    return this.locationList.some(predicate);
  }

  create: (path: string) => CancellablePromise<ClientLocation> = flow(function* (
    this: LocationStore,
    path: string,
  ) {
    const location = new ClientLocation(this, generateId(), path, new Date());
    yield this.backend.createLocation(location.serialize());
    this.locationList.push(location);
    return location;
  });

  /** Imports all files from a location into the FileStore */
  @action async initLocation(location: ClientLocation) {
    const toastKey = `initialize-${location.id}`;

    let isCancelled = false;
    const handleCancelled = async () => {
      console.debug('Aborting location initialization', location.name);
      isCancelled = true;
      await location.destroyWorker();
    };

    AppToaster.show(
      {
        message: 'Finding all images...',
        timeout: 0,
        clickAction: {
          label: 'Cancel',
          onClick: handleCancelled,
        },
      },
      toastKey,
    );

    const filePaths = await location.initWorker();

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
    this.rootStore.uiStore.refetch();
    this.rootStore.fileStore.refetchFileCounts();
  }

  delete: (location: ClientLocation) => CancellablePromise<void> = flow(function* (
    this: LocationStore,
    location: ClientLocation,
  ) {
    // Remove location from DB through backend
    yield this.backend.removeLocation(location.id);

    const { fileStore } = this.rootStore;

    // Remove deleted files from selection
    for (const file of fileStore.selection) {
      if (file.locationId === location.id) {
        fileStore.deselect(file);
      }
    }
    // Destroy worker
    yield location.destroyWorker();
    // Remove location locally
    this.locationList.remove(location);
  });

  @action async addFile(path: string, location: ClientLocation) {
    const file = await pathToIFile(path, location);
    await this.backend.createFilesFromPath(path, [file]);

    AppToaster.show(
      {
        message: 'New images have been detected.',
        timeout: 0,
        clickAction: { label: 'Refetch', onClick: this.rootStore.uiStore.refetch },
      },
      'new-images',
    );
  }

  @action hideFile(path: string) {
    // This is called when an image is removed from the filesystem.
    // Could also mean that a file was renamed or moved, in which case another file should have been added already
    const { fileStore, uiStore } = this.rootStore;
    const clientFile = fileStore.fileList.find((f) => f.absolutePath === path);
    if (clientFile !== undefined) {
      fileStore.hideFile(clientFile);
      uiStore.refetch();
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
