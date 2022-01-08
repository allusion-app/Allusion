import { action, makeObservable, observable, runInAction } from 'mobx';
import SysPath from 'path';
import Backend from 'src/backend/Backend';
import { OrderDirection } from 'src/backend/DBRepository';
import ExifIO from 'src/backend/ExifIO';
import { getMetaData, IFile, IMG_EXTENSIONS, IMG_EXTENSIONS_TYPE } from 'src/entities/File';
import { generateId, ID } from 'src/entities/ID';
import { ClientLocation, ClientSubLocation, ILocation } from 'src/entities/Location';
import { ClientStringSearchCriteria } from 'src/entities/SearchCriteria';
import { AppToaster } from 'src/frontend/components/Toaster';
import { RendererMessenger } from 'src/Messaging';
import { getThumbnailPath, promiseAllLimit } from '../utils';
import RootStore from './RootStore';
import fse from 'fs-extra';

const PREFERENCES_STORAGE_KEY = 'location-store-preferences';
type Preferences = { extensions: IMG_EXTENSIONS_TYPE[] };

/**
 * Compares metadata of two files to determine whether the files are (likely to be) identical
 * Note: note comparing size, since it can change, e.g. when writing tags to file metadata.
 *   Could still include it, but just to check whether it's in the same ballpark
 */
function areFilesIdenticalBesidesName(a: IFile, b: IFile): boolean {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.dateCreated.getTime() === b.dateCreated.getTime()
  );
}

class LocationStore {
  private readonly backend: Backend;
  private readonly rootStore: RootStore;

  readonly locationList = observable<ClientLocation>([]);

  // Allow users to disable certain file types. Global option for now, needs restart
  // TODO: Maybe per location/sub-location?
  enabledFileExtensions = observable(new Set<IMG_EXTENSIONS_TYPE>());

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    makeObservable(this);
  }

  @action async init() {
    // Restore preferences
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || '') as Preferences;
      (prefs.extensions || IMG_EXTENSIONS).forEach((ext) => this.enabledFileExtensions.add(ext));
    } catch (e) {
      // If no preferences found, use defaults
      IMG_EXTENSIONS.forEach((ext) => this.enabledFileExtensions.add(ext));
      // By default, disable EXR for now (experimental)
      this.enabledFileExtensions.delete('exr');
    }

    // Get dirs from backend
    const dirs = await this.backend.fetchLocations('dateAdded', OrderDirection.Asc);
    const locations = dirs.map(
      (dir) =>
        new ClientLocation(
          this,
          dir.id,
          dir.path,
          dir.dateAdded,
          dir.subLocations,
          runInAction(() => this.enabledFileExtensions.toJSON()),
        ),
    );
    runInAction(() => this.locationList.replace(locations));
  }

  save(loc: ILocation) {
    this.backend.saveLocation(loc);
  }

  // E.g. in preview window, it's not needed to watch the locations
  // Returns whether files have been added, changed or removed
  @action async watchLocations() {
    const progressToastKey = 'progress';
    let foundNewFiles = false;
    const len = this.locationList.length;
    const getLocation = action((index: number) => this.locationList[index]);

    // Get all files in the DB, set up data structures for quick lookups
    // Doing it for all locations, so files moved to another Location on disk, it's properly re-assigned in Allusion too
    // TODO: Could be optimized, at startup we already fetch all files, don't need to fetch them again here
    const dbFiles: IFile[] = await this.backend.fetchFiles('id', OrderDirection.Asc);
    const dbFilesPathSet = new Set(dbFiles.map((f) => f.absolutePath));
    const dbFilesByCreatedDate = new Map<number, IFile[]>();
    for (const file of dbFiles) {
      const time = file.dateCreated.getTime();
      const entry = dbFilesByCreatedDate.get(time);
      if (entry) {
        entry.push(file);
      } else {
        dbFilesByCreatedDate.set(time, [file]);
      }
    }

    // For every location, find created/moved/deleted files, and update the database accordingly.
    // TODO: Do this in a web worker, not in the renderer thread!
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
      // added a retry toast for now, can't figure out the cause, and it's hard to reproduce
      // FIXME: Toasts should not be abused for error handling. Create some error messaging mechanism.
      const readyTimeout = setTimeout(() => {
        AppToaster.show(
          {
            message: 'This appears to be taking longer than usual.',
            timeout: 0,
            clickAction: {
              onClick: RendererMessenger.reload,
              label: 'Retry?',
            },
          },
          'retry-init',
        );
      }, 10000);

      // TODO: get stats from chokidar too: no need to fse.stat(). Then check whether file has been modified and needs a new thumbnail
      console.debug('Location init...');
      const diskFiles = await location.init();
      const diskFileMap = new Map<string, FileStats>(
        diskFiles?.map((f) => [f.absolutePath, f]) ?? [],
      );

      clearTimeout(readyTimeout);
      AppToaster.dismiss('retry-init');

      if (diskFiles === undefined) {
        AppToaster.show(
          {
            message: `Cannot find Location "${location.name}"`,
            timeout: 0,
          },
          `missing-loc-${location.id}`,
        ); // a key such that the toast can be dismissed automatically on recovery
        continue;
      }

      console.log('Finding created files...');
      // Find all files that have been created (those on disk but not in DB)
      const createdPaths = diskFiles.filter((f) => !dbFilesPathSet.has(f.absolutePath));
      const createdFiles = await Promise.all(
        createdPaths.map((path) => pathToIFile(path, location, this.rootStore.exifTool)),
      );

      // Find all files of this location that have been removed (those in DB but not on disk anymore)
      const missingFiles = dbFiles.filter(
        (file) => file.locationId === location.id && !diskFileMap.has(file.absolutePath),
      );

      // Find matches between removed and created images (different name/path but same characteristics)
      const createdMatches = missingFiles.map((mf) =>
        createdFiles.find((cf) => areFilesIdenticalBesidesName(cf, mf)),
      );
      // Also look for duplicate files: when a files is renamed/moved it will become a new entry, should be de-duplicated
      const dbMatches = missingFiles.map((missingDbFile, i) => {
        if (createdMatches[i]) return false; // skip missing files that match with a newly created file
        // Quick lookup for files with same created date,
        const candidates = dbFilesByCreatedDate.get(missingDbFile.dateCreated.getTime()) || [];

        // then first look for a file with the same name + resolution (for when file is moved to different path)
        const matchWithName = candidates.find(
          (otherDbFile) =>
            missingDbFile !== otherDbFile &&
            missingDbFile.name === otherDbFile.name &&
            areFilesIdenticalBesidesName(missingDbFile, otherDbFile),
        );

        // If no match, try looking without filename in case the file was renamed (prone to errors, but better than nothing)
        return (
          matchWithName ||
          candidates.find(
            (otherDbFile) =>
              missingDbFile !== otherDbFile &&
              areFilesIdenticalBesidesName(missingDbFile, otherDbFile),
          )
        );
      });

      console.debug({ missingFiles, createdFiles, createdMatches, dbMatches });

      // Update renamed files in backend
      const foundCreatedMatches = createdMatches.filter((m) => m !== undefined) as IFile[];
      if (foundCreatedMatches.length > 0) {
        console.debug(
          `Found ${foundCreatedMatches.length} renamed/moved files in location ${location.name}. These are detected as new files, but will instead replace their original entry in the DB of Allusion`,
          foundCreatedMatches,
        );
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
        await this.backend.saveFiles(Array.from(new Set(files)));
      }

      const numDbMatches = dbMatches.filter((f) => Boolean(f));
      if (numDbMatches.length > 0) {
        // If you have allusion open and rename/move files, they are automatically created as new files while the old one sticks around
        // In here we transfer the tag data over from the old entry to the new one, and delete the old entry
        console.debug(
          `Found ${numDbMatches.length} renamed/moved files in location ${location.name} that were already present in the database. Removing duplicates`,
          numDbMatches,
        );
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
        await this.backend.saveFiles(Array.from(new Set(files)));
        // Remove missing files that have a match in the database
        await this.backend.removeFiles(
          missingFiles.filter((_, i) => Boolean(dbMatches[i])).map((f) => f.id),
        );
        foundNewFiles = true; // Trigger a refetch
      }

      // For createdFiles without a match, insert them in the DB as new files
      const newFiles = createdFiles.filter((cf) => !foundCreatedMatches.includes(cf));
      if (newFiles.length) {
        await this.backend.createFilesFromPath(location.path, newFiles);
      }

      // Also update files that have changed, e.g. when overwriting a file (with same filename)
      // --> update metadata (resolution, size) and recreate thumbnail
      // This can be accomplished by comparing the dateLastIndexed of the file in DB to dateModified of the file on disk
      const updatedFiles: IFile[] = [];
      const thumbnailDirectory = runInAction(() => this.rootStore.uiStore.thumbnailDirectory);
      for (const dbFile of dbFiles) {
        const diskFile = diskFileMap.get(dbFile.absolutePath);
        if (
          diskFile &&
          dbFile.dateLastIndexed.getTime() < diskFile.dateModified.getTime() &&
          diskFile.size !== dbFile.size
        ) {
          const newFile: IFile = {
            ...dbFile,
            // Recreate metadata which checks the resolution of the image
            ...(await getMetaData(diskFile, this.rootStore.exifTool)),
            dateLastIndexed: new Date(),
          };

          // Delete thumbnail if size has changed, will be re-created automatically when needed
          const thumbPath = getThumbnailPath(dbFile.absolutePath, thumbnailDirectory);
          fse.remove(thumbPath).catch(console.error);

          updatedFiles.push(newFile);
        }
      }
      if (updatedFiles.length > 0) {
        console.debug('Re-indexed files changed on disk', updatedFiles);
        await this.backend.saveFiles(updatedFiles);
      }

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
    console.log('changing location path', location, newPath);
    // First, update the absolute path of all files from this location
    const locFiles = await this.findLocationFiles(location.id);
    const files: IFile[] = locFiles.map((f) => ({
      ...f,
      absolutePath: SysPath.join(newPath, f.relativePath),
    }));
    await this.backend.saveFiles(files);

    const newLocation = new ClientLocation(
      this,
      location.id,
      newPath,
      location.dateAdded,
      location.subLocations,
      runInAction(() => this.enabledFileExtensions.toJSON()),
    );
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
    const location = new ClientLocation(
      this,
      generateId(),
      path,
      new Date(),
      [],
      runInAction(() => this.enabledFileExtensions.toJSON()),
    );
    await this.backend.createLocation(location.serialize());
    runInAction(() => this.locationList.push(location));
    return location;
  }

  /** Imports all files from a location into the FileStore */
  @action.bound async initLocation(location: ClientLocation) {
    const toastKey = `initialize-${location.id}`;

    let isCancelled = false;
    const handleCancelled = () => {
      console.debug('Aborting location initialization', location.name);
      isCancelled = true;
      location.delete();
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

    const filePaths = await location.init();

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
      filePaths.map((path) => () => pathToIFile(path, location, this.rootStore.exifTool)),
      N,
      showProgressToaster,
      () => isCancelled,
    );

    AppToaster.show({ message: 'Updating database...', timeout: 0 }, toastKey);
    await this.backend.createFilesFromPath(location.path, files);

    AppToaster.show({ message: `Location "${location.name}" is ready!`, timeout: 5000 }, toastKey);
    this.rootStore.fileStore.refetch();
    this.rootStore.fileStore.refetchFileCounts();
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
    });
    this.rootStore.fileStore.refetch();
    this.rootStore.fileStore.refetchFileCounts();
  }

  @action.bound setSupportedImageExtensions(extensions: Set<IMG_EXTENSIONS_TYPE>) {
    this.enabledFileExtensions.replace(extensions);
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ extensions: this.enabledFileExtensions.toJSON() } as Preferences, null, 2),
    );
  }

  @action async addFile(fileStats: FileStats, location: ClientLocation) {
    const file = await pathToIFile(fileStats, location, this.rootStore.exifTool);
    await this.backend.createFilesFromPath(fileStats.absolutePath, [file]);

    AppToaster.show({ message: 'New images have been detected.', timeout: 5000 }, 'new-images');
    // might be called a lot when moving many images into a folder, so debounce it
    this.rootStore.fileStore.debouncedRefetch();
  }

  @action hideFile(path: string) {
    // This is called when an image is removed from the filesystem.
    // Could also mean that a file was renamed or moved, in which case another file should have been added already
    const fileStore = this.rootStore.fileStore;
    const clientFile = fileStore.fileList.find((f) => f.absolutePath === path);
    if (clientFile !== undefined) {
      fileStore.hideFile(clientFile);
      fileStore.refetch();
    }

    AppToaster.show(
      {
        message: 'Some images have gone missing! Restart Allusion to detect moved/renamed files',
        timeout: 8000,
      },
      'missing',
    );
  }

  /**
   * Fetches the files belonging to a location
   */
  @action async findLocationFiles(locationId: ID): Promise<IFile[]> {
    const crit = new ClientStringSearchCriteria('locationId', locationId, 'equals').serialize();
    return this.backend.searchFiles(crit, 'id', OrderDirection.Asc);
  }

  @action async removeSublocationFiles(subLoc: ClientSubLocation): Promise<void> {
    const crit = new ClientStringSearchCriteria(
      'absolutePath',
      subLoc.path,
      'startsWith',
    ).serialize();
    const files = await this.backend.searchFiles(crit, 'id', OrderDirection.Asc);
    await this.backend.removeFiles(files.map((f) => f.id));
    this.rootStore.fileStore.refetch();
  }

  @action private set(index: number, location: ClientLocation) {
    this.locationList[index] = location;
  }
}

export type FileStats = {
  absolutePath: string;
  /** When file was last modified on disk */
  dateModified: Date;
  /** When file was created on disk */
  dateCreated: Date;
  /** Current size of the file in bytes */
  size: number;
};

async function pathToIFile(stats: FileStats, loc: ClientLocation, exifIO: ExifIO): Promise<IFile> {
  const now = new Date();
  return {
    absolutePath: stats.absolutePath,
    relativePath: stats.absolutePath.replace(loc.path, ''),
    id: generateId(),
    locationId: loc.id,
    tags: [],
    dateAdded: now,
    dateModified: now,
    dateLastIndexed: now,
    ...(await getMetaData(stats, exifIO)),
  };
}

export default LocationStore;
