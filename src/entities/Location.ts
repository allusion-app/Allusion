import { Remote, wrap } from 'comlink';
import fse from 'fs-extra';
import { action, makeObservable, observable, runInAction } from 'mobx';
import SysPath from 'path';
import { AppToaster } from 'src/frontend/components/Toaster';
import LocationStore from 'src/frontend/stores/LocationStore';
import { FolderWatcherWorker } from 'src/frontend/workers/folderWatcher.worker';
import { ID, IResource, ISerializable } from './ID';

export interface ILocation extends IResource {
  id: ID;
  path: string;
  dateAdded: Date;
}

export interface IDirectoryTreeItem {
  name: string;
  fullPath: string;
  children: IDirectoryTreeItem[];
}

export class ClientLocation implements ISerializable<ILocation> {
  private store: LocationStore;

  private worker?: Remote<FolderWatcherWorker>;

  // Whether the initial scan has been completed, and new/removed files are being watched
  private isReady = false;
  // whether initialization has started or has been completed
  @observable isInitialized = false;
  // true when the path no longer exists (broken link)
  @observable isBroken = false;

  readonly id: ID;
  readonly path: string;
  readonly dateAdded: Date;

  constructor(store: LocationStore, id: ID, path: string, dateAdded: Date) {
    this.store = store;
    this.id = id;
    this.path = path;
    this.dateAdded = dateAdded;

    makeObservable(this);
  }

  get name(): string {
    return SysPath.basename(this.path);
  }

  @action async initWorker(): Promise<string[] | undefined> {
    this.isInitialized = true;
    // FIXME: awaiting fse.pathExists was broken for me in many consecutive reloads, always at 2/3 locations
    // The sync version works fine
    const pathExists = await fse.pathExists(this.path);
    runInAction(() => {
      this.isBroken = !pathExists;
    });
    if (pathExists) {
      return this._initWorker(this.path);
    } else {
      return undefined;
    }
  }

  async destroyWorker(): Promise<void> {
    if (this.worker !== undefined) {
      this.worker.cancel();
      await this.worker.close();
      this.worker.terminate();
      this.worker = undefined;
    }
  }

  serialize(): ILocation {
    return {
      id: this.id,
      path: this.path,
      dateAdded: this.dateAdded,
    };
  }

  private async _initWorker(directory: string): Promise<string[]> {
    console.debug('Loading folder watcher worker...', directory);
    const worker = new Worker(
      new URL('src/frontend/workers/folderWatcher.worker', import.meta.url),
    );
    worker.onmessage = ({ data: { type, value } }: { data: { type: string; value: string } }) => {
      if (type === 'add') {
        console.log(`File ${value} has been added after initialization`);
        this.store.addFile(value, this);
      } else if (type === 'remove') {
        console.log(`Location "${this.name}": File ${value} has been removed.`);
        this.store.hideFile(value);
      } else if (type === 'error') {
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
    return this.worker.watch(directory);
  }
}

/**
 * Recursive function that returns the dir list for a given path
 */
export async function getDirectoryTree(path: string): Promise<IDirectoryTreeItem[]> {
  try {
    let dirs: string[] = [];
    for (const file of await fse.readdir(path)) {
      const fullPath = SysPath.join(path, file);
      if ((await fse.stat(fullPath)).isDirectory()) {
        dirs = [...dirs, fullPath];
      }
    }
    return Promise.all(
      dirs.map(
        async (dir): Promise<IDirectoryTreeItem> => ({
          name: SysPath.basename(dir),
          fullPath: dir,
          children: await getDirectoryTree(dir),
        }),
      ),
    );
  } catch (e) {
    return [];
  }
}
