import { configure } from 'mobx';

import Backend from 'src/backend/Backend';

import FileStore from './FileStore';
import TagStore from './TagStore';
import UiStore from './UiStore';
import LocationStore from './LocationStore';

import { RendererMessenger } from 'src/Messaging';

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
  readonly clearDatabase: () => Promise<void>;

  constructor(private backend: Backend) {
    this.tagStore = new TagStore(backend, this);
    this.fileStore = new FileStore(backend, this);
    this.locationStore = new LocationStore(backend, this);
    this.uiStore = new UiStore(this);

    // SAFETY: The backend instance has the same lifetime as the RootStore.
    this.clearDatabase = async () => {
      await backend.clearDatabase();
      RendererMessenger.clearDatabase();
    };
  }

  async init(isPreviewWindow: boolean) {
    // The location store must be initiated because the file entity contructor
    // uses the location reference to set values.
    await this.locationStore.init();
    // The tag store needs to be awaited because file entites have references
    // to tag entities.
    await this.tagStore.init();

    // The preview window is opened while the locations are already watched. The
    // files are fetched based on the file selection.
    if (!isPreviewWindow) {
      // Load the files already in the database so user instantly sees their images
      this.fileStore
        .fetchAllFiles()
        .then(() => this.tagStore.initializeFileCounts(this.fileStore.fileList));
      // Then, look for any new or removed images, and refetch if necessary
      this.locationStore.watchLocations().then((foundNewFiles) => {
        if (foundNewFiles) this.fileStore.refetch();
      });
    }

    // Upon loading data, initialize UI state.
    this.uiStore.init();
  }

  async backupDatabaseToFile(path: string) {
    return this.backend.backupDatabaseToFile(path);
  }

  async restoreDatabaseFromFile(path: string) {
    return this.backend.restoreDatabaseFromFile(path);
  }

  async peekDatabaseFile(path: string) {
    return this.backend.peekDatabaseFile(path);
  }
}

export default RootStore;
