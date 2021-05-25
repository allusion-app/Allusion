import { configure, runInAction } from 'mobx';

import Backend from 'src/backend/Backend';

import FileStore from './FileStore';
import TagStore from './TagStore';
import UiStore from './UiStore';
import LocationStore, { PROGRESS_KEY } from './LocationStore';

import { RendererMessenger } from 'src/Messaging';
import ExifIO from 'src/backend/ExifIO';
import { AppToaster } from '../components/Toaster';
import { Preferences } from './Preferences';

// This will throw exceptions whenver we try to modify the state directly without an action
// Actions will batch state modifications -> better for performance
// https://mobx.js.org/refguide/action.html
configure({ observableRequiresReaction: true, reactionRequiresObservable: true });

/**
 * From: https://mobx.js.org/best/store.html
 * An often asked question is how to combine multiple stores without using singletons.
 * How will they know about each other?
 * An effective pattern is to create a RootStore that instantiates all stores,
 * and share references. The advantage of this pattern is:
 * 1. Simple to set up.
 * 2. Supports strong typing well.
 * 3. Makes complex unit tests easy as you just have to instantiate a root store.
 */
class RootStore {
  readonly tagStore: TagStore;
  readonly fileStore: FileStore;
  readonly locationStore: LocationStore;
  readonly uiStore: UiStore;
  readonly exifTool = new ExifIO();

  constructor(private backend: Backend, preferences: Preferences) {
    this.uiStore = new UiStore(this, preferences);
    this.tagStore = new TagStore(backend);
    this.locationStore = new LocationStore(backend, this);
    this.fileStore = new FileStore(backend, this);
  }

  async initView(): Promise<void> {
    await this.tagStore.init();
    await this.locationStore.init();
  }

  async fetchFiles() {
    const preferences = this.uiStore.preferences;
    const { orderBy, fileOrder } = runInAction(() => ({
      orderBy: preferences.orderBy,
      fileOrder: preferences.fileOrder,
    }));
    // Load the files already in the database so user instantly sees their images
    await this.fileStore.fetchAllFiles(orderBy, fileOrder);
    // Upon loading data, initialize UI state.
    this.uiStore.init();

    const handleProgress = (message: string, key: string) => {
      AppToaster.show({ message, timeout: 0 }, key);
    };

    let retryToastKey = '';
    const handleTimeout = (locationId: string): number => {
      const toastKey = `retry-init-${locationId}`;
      const timer = window.setTimeout(() => {
        AppToaster.show(
          {
            message: 'This appears to be taking longer than usual.',
            timeout: 0,
            clickAction: {
              onClick: RendererMessenger.reload,
              label: 'Retry?',
            },
          },
          toastKey,
        );
      }, 10000);
      AppToaster.dismiss(retryToastKey);
      retryToastKey = toastKey;
      return timer;
    };

    // Then, look for any new or removed images, and refetch if necessary
    const foundNewFiles = await this.locationStore.watchLocations(handleProgress, handleTimeout);
    if (foundNewFiles) {
      AppToaster.show({ message: 'New images detected.', timeout: 5000 }, PROGRESS_KEY);
      return this.fileStore.fetchAllFiles(orderBy, fileOrder);
    } else {
      AppToaster.dismiss(PROGRESS_KEY);
    }
  }

  async backupDatabaseToFile(path: string): Promise<void> {
    return this.backend.backupDatabaseToFile(path);
  }

  async restoreDatabaseFromFile(path: string): Promise<void> {
    return this.backend.restoreDatabaseFromFile(path);
  }

  async peekDatabaseFile(
    path: string,
  ): Promise<{
    numTags: number;
    numFiles: number;
  }> {
    return this.backend.peekDatabaseFile(path);
  }

  async clearDatabase(): Promise<void> {
    await this.backend.clearDatabase();
    RendererMessenger.clearDatabase();
  }
}

export default RootStore;
