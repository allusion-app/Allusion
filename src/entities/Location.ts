import { Remote, wrap } from 'comlink';
import fse from 'fs-extra';
import { action, IObservableArray, makeObservable, observable, runInAction } from 'mobx';
import SysPath from 'path';
import { retainArray } from 'common/core';
import { AppToaster } from 'src/frontend/components/Toaster';
import LocationStore, { FileStats } from 'src/frontend/stores/LocationStore';
import { FolderWatcherWorker } from 'src/frontend/workers/folderWatcher.worker';
import { RendererMessenger } from 'src/Messaging';
import { IMG_EXTENSIONS_TYPE } from 'src/api/FileDTO';
import { ID } from 'src/api/ID';
import { ISubLocation, ILocation } from 'src/api/LocationDTO';

/** Sorts alphanumerically, "natural" sort */
const sort = (a: ISubLocation, b: ISubLocation) =>
  a.name.localeCompare(b.name, undefined, { numeric: true });

export class ClientSubLocation implements ISubLocation {
  @observable
  name: string;
  @observable
  isExcluded: boolean;
  readonly subLocations: IObservableArray<ClientSubLocation>;

  constructor(
    public location: ClientLocation,
    public path: string,
    name: string,
    excluded: boolean,
    subLocations: ISubLocation[],
  ) {
    this.name = name;
    this.isExcluded = excluded;
    this.subLocations = observable(
      subLocations
        .sort(sort)
        .map(
          (subLoc) =>
            new ClientSubLocation(
              this.location,
              SysPath.join(path, subLoc.name),
              subLoc.name,
              subLoc.isExcluded,
              subLoc.subLocations,
            ),
        ),
    );

    makeObservable(this);
  }

  @action.bound
  toggleExcluded = (): void => {
    this.isExcluded = !this.isExcluded;
    this.location.updateSublocationExclusion(this);
  };

  @action.bound
  serialize(): ISubLocation {
    return {
      name: this.name.toString(),
      isExcluded: Boolean(this.isExcluded),
      subLocations: this.subLocations.map((subLoc) => subLoc.serialize()),
    };
  }
}

export class ClientLocation {
  private store: LocationStore;

  worker?: Remote<FolderWatcherWorker>;

  // Whether the initial scan has been completed, and new/removed files are being watched
  private isReady = false;
  // whether initialization has started or has been completed
  @observable isInitialized = false;
  // whether sub-locations are being refreshed
  @observable isRefreshing = false;
  // true when the path no longer exists (broken link)
  @observable isBroken = false;

  index: number;

  /** The file extensions for the files to be watched */
  extensions: IMG_EXTENSIONS_TYPE[];

  readonly subLocations: IObservableArray<ClientSubLocation>;
  /** A cached list of all sublocations that are excluded (isExcluded === true) */
  protected readonly excludedPaths: ClientSubLocation[] = [];

  readonly id: ID;
  readonly path: string;
  readonly dateAdded: Date;

  constructor(
    store: LocationStore,
    id: ID,
    path: string,
    dateAdded: Date,
    subLocations: ISubLocation[],
    extensions: IMG_EXTENSIONS_TYPE[],
    index: number,
  ) {
    this.store = store;
    this.id = id;
    this.path = path;
    this.dateAdded = dateAdded;
    this.extensions = extensions;
    this.index = index;

    this.subLocations = observable(
      subLocations
        .sort(sort)
        .map(
          (subLoc) =>
            new ClientSubLocation(
              this,
              SysPath.join(this.path, subLoc.name),
              subLoc.name,
              subLoc.isExcluded,
              subLoc.subLocations,
            ),
        ),
    );

    makeObservable(this);
  }

  get name(): string {
    return SysPath.basename(this.path);
  }

  @action async init(): Promise<FileStats[] | undefined> {
    await this.refreshSublocations();
    runInAction(() => {
      this.isInitialized = true;
      function* getExcludedSubLocsRecursively(
        subLocations: ClientSubLocation[],
      ): Generator<ClientSubLocation> {
        for (const s of subLocations) {
          if (s.isExcluded) {
            yield s;
          } else {
            yield* getExcludedSubLocsRecursively(s.subLocations);
          }
        }
      }
      this.excludedPaths.splice(0, this.excludedPaths.length);
      this.excludedPaths.push(...getExcludedSubLocsRecursively(this.subLocations));
    });

    if (await fse.pathExists(this.path)) {
      this.setBroken(false);
      return this.watch(this.path);
    } else {
      this.setBroken(true);
      return undefined;
    }
  }

  @action setBroken(state: boolean): void {
    this.isBroken = state;
  }

  async delete(): Promise<void> {
    this.worker?.cancel();
    await this.drop();
    return this.store.delete(this);
  }

  async updateSublocationExclusion(subLocation: ClientSubLocation): Promise<void> {
    if (subLocation.isExcluded) {
      // If excluded:
      // - first update the cache, so new added images won't be detected
      if (!this.excludedPaths.includes(subLocation)) {
        this.excludedPaths.push(subLocation);
      }

      // What to do with current files?
      // Just hide them, in case it's included again?
      // Maybe move to separate collection? that won't work cleanly after tag removal
      // Looking at it realistically, this will be used for directories that contain animation frames, junk, timelapses, etc.
      // in which case it should be fine to just get rid of it all
      if (this.isInitialized) {
        await this.store.removeSublocationFiles(subLocation);
      }
    } else {
      // If included, re-scan for files in that path
      // - first, update cache
      const index = this.excludedPaths.findIndex((l) => l === subLocation);
      if (index !== -1) {
        this.excludedPaths.splice(index, 1);
      }

      // - not trivial to do a re-scan. Could also just re-start, won't be used that often anyways I think
      if (this.isInitialized) {
        AppToaster.show({
          message: 'Restart Allusion to re-detect any images',
          timeout: 8000,
          clickAction: {
            onClick: RendererMessenger.reload,
            label: 'Restart',
          },
        });
      }
    }

    // Save location to DB
    // Exclusion status is the only thing that can change for locations, so no need for saving through observing
    this.store.save(this.serialize());
  }

  @action.bound
  serialize(): ILocation {
    return {
      id: this.id,
      path: this.path,
      dateAdded: this.dateAdded,
      subLocations: this.subLocations.map((sl) => sl.serialize()),
      index: this.index,
    };
  }

  @action.bound setIndex(index: number): void {
    this.index = index;
  }

  /** Cleanup resources */
  async drop(): Promise<void> {
    return this.worker?.close();
  }

  async refreshSublocations(): Promise<void> {
    // Trigger loading icon
    this.isRefreshing = true;

    // TODO: Can also get this from watching
    const directoryTree = await getDirectoryTree(this.path);

    // Replaces the subLocations on every subLocation recursively
    // Doesn't deal specifically with renamed directories, only added/deleted ones
    const updateSubLocations = action(
      (loc: ClientLocation | ClientSubLocation, dir: IDirectoryTreeItem) => {
        const newSublocations: ClientSubLocation[] = [];
        for (const item of dir.children) {
          const subLoc =
            loc.subLocations.find((subLoc) => subLoc.name === item.name) ??
            new ClientSubLocation(this, item.fullPath, item.name, item.name.startsWith('.'), []);
          newSublocations.push(subLoc);
          if (item.children.length > 0) {
            updateSubLocations(subLoc, item);
          } else {
            subLoc.subLocations.clear();
          }
        }
        loc.subLocations.replace(newSublocations.sort(sort));

        this.isRefreshing = false;
      },
    );

    const rootItem: IDirectoryTreeItem = {
      name: 'root',
      fullPath: this.path,
      children: directoryTree,
    };
    updateSubLocations(this, rootItem);
    // TODO: optimization: only update if sublocations changed
    this.store.save(this.serialize());
  }

  private async watch(directory: string): Promise<FileStats[]> {
    console.debug('Loading folder watcher worker...', directory);
    const worker = new Worker(
      new URL('src/frontend/workers/folderWatcher.worker', import.meta.url),
    );
    worker.onmessage = ({
      data,
    }: {
      data: { type: 'remove' | 'error'; value: string } | { type: 'add'; value: FileStats };
    }) => {
      if (data.type === 'add') {
        const { absolutePath } = data.value;
        // Filter out files located in any excluded subLocations
        if (this.excludedPaths.some((subLoc) => data.value.absolutePath.startsWith(subLoc.path))) {
          console.debug('File added to excluded sublocation', absolutePath);
        } else {
          console.log(`File ${absolutePath} has been added after initialization`);
          this.store.addFile(data.value, this);
        }
      } else if (data.type === 'remove') {
        const { value } = data;
        console.log(`Location "${this.name}": File ${value} has been removed.`);
        this.store.hideFile(value);
      } else if (data.type === 'error') {
        const { value } = data;
        console.error('Location watch error:', value);
        AppToaster.show(
          {
            message: `An error has occured while ${
              this.isReady ? 'watching' : 'initializing'
            } location "${this.name}".`,
            timeout: 0,
          },
          'location-error',
        );
      }
    };

    const WorkerFactory = wrap<typeof FolderWatcherWorker>(worker);
    this.worker = await new WorkerFactory();
    // Make a list of all files in this directory, which will be returned when all subdirs have been traversed
    const initialFiles = await this.worker.watch(directory, this.extensions);

    // Filter out images from excluded sub-locations
    // TODO: Could also put them in the chokidar ignore property
    return initialFiles.filter(
      ({ absolutePath }) =>
        !this.excludedPaths.some((subLoc) => absolutePath.startsWith(subLoc.path)),
    );
  }
}
interface IDirectoryTreeItem {
  name: string;
  fullPath: string;
  children: IDirectoryTreeItem[];
}

/**
 * Recursive function that returns the dir list for a given path
 */
async function getDirectoryTree(path: string): Promise<IDirectoryTreeItem[]> {
  try {
    const NULL = { name: '', fullPath: '', children: [] };
    const dirs = await Promise.all(
      Array.from(await fse.readdir(path), async (file) => {
        const fullPath = SysPath.join(path, file);
        if ((await fse.stat(fullPath)).isDirectory()) {
          return {
            name: SysPath.basename(fullPath),
            fullPath,
            children: await getDirectoryTree(fullPath),
          };
        } else {
          return NULL;
        }
      }),
    );
    retainArray(dirs, (dir) => dir !== NULL);
    return dirs;
  } catch (e) {
    return [];
  }
}
