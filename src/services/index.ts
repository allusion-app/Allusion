import { retainArray } from 'common/core';
import SysPath from 'path';
import { IDataStorage } from 'src/api/data-storage';
import { IMG_EXTENSIONS_TYPE } from 'src/api/file';
import { ID } from 'src/api/id';
import { ClientLocation } from 'src/entities/Location';

export const enum StartupBehaviourFlag {
  None = 0,
  Watch = 1,
  Index = 2,
  Scan = StartupBehaviourFlag.Watch | StartupBehaviourFlag.Index,
}

export interface IService {
  spawn: () => Promise<void>;
  terminate: () => Promise<void>;
}

export interface ILocationIndexService extends IService {
  index: (locationID: ID, directoryTree: DirectoryTreeDTO, filter: FileFilter) => Promise<void>;
  cancel: (locationID: ID) => Promise<void>;
}

export interface ILocationWatchService extends IService {
  watch: (
    locationID: ID,
    filter: FileFilter,
    handleChange: (change: any) => void,
    getIndex?: (locationID: ID, directoryTree: DirectoryTreeDTO) => void,
  ) => Promise<void>;
  setWatchFilter: (locationID: ID, filter: Partial<FileFilter>) => Promise<void>;
  unwatch: (locationID: ID) => Promise<void>;
}

export type FileFilter = {
  includedExtensions: IMG_EXTENSIONS_TYPE[];
  excludedDirectories: string[];
};

export type DirectoryTreeDTO = {
  stats: FileStats;
  children: DirectoryTreeDTO[];
};

export type FileStats = {
  path: string;
  modifiedAt: Date;
  createdAt: Date;
  size: number;
};

export class LocationService {
  backend: IDataStorage;
  watchService: ILocationWatchService;
  indexService: ILocationIndexService;

  locationList: ClientLocation[] = [];

  constructor(
    backend: IDataStorage,
    watchService: ILocationWatchService,
    indexService: ILocationIndexService,
  ) {
    this.backend = backend;
    this.watchService = watchService;
    this.indexService = indexService;
  }

  isValidLocationPath(path: string): boolean {
    const containsLocation = this.locationList.some((location) => location.path === path);

    if (containsLocation) {
      return false;
    }

    const addSeparator = (path: string) => (path.endsWith(SysPath.sep) ? path : path + SysPath.sep);

    const isParentDirectory = this.locationList.some((location) =>
      path.includes(addSeparator(location.path)),
    );

    if (isParentDirectory) {
      return false;
    }

    const pathWithSeparator = addSeparator(path);
    const isChildDirectory = this.locationList.some((location) =>
      location.path.includes(pathWithSeparator),
    );

    if (isChildDirectory) {
      return false;
    }

    return true;
  }

  async initLocations() {
    const locations = this.locationList.slice();
    retainArray(locations, (location) => location.flags !== StartupBehaviourFlag.None);
    locations.sort((a, b) => a.flags - b.flags);

    throw new Error('');
  }

  async createLocation() {
    // Create location instance

    // Index files

    // Setup event listener

    // If watched location, send to watch service

    throw new Error('');
  }

  async deleteLocation(locationID: ID) {
    const index = this.locationList.findIndex((location) => location.id === locationID);

    if (index === -1) {
      return;
    }

    this.locationList.splice(index, 1);

    await Promise.all([
      this.backend.removeLocation(locationID),
      this.indexService.cancel(locationID),
      this.watchService.unwatch(locationID),
    ]);
  }
}
