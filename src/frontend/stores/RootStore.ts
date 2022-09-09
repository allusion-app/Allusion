import { configure, runInAction } from 'mobx';

import { IDataStorage } from 'src/api/data-storage';

import FileStore from './FileStore';
import TagStore from './TagStore';
import UiStore from './UiStore';
import LocationStore from './LocationStore';
import ExifIO from 'common/ExifIO';
import ImageLoader from '../image/ImageLoader';

import { RendererMessenger } from 'src/ipc/renderer';
import SearchStore from './SearchStore';

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
  readonly searchStore: SearchStore;
  readonly exifTool: ExifIO;
  readonly imageLoader: ImageLoader;

  private constructor(private backend: IDataStorage) {
    this.tagStore = new TagStore(backend, this);
    this.fileStore = new FileStore(backend, this);
    this.locationStore = new LocationStore(backend, this);
    this.uiStore = new UiStore(this);
    this.searchStore = new SearchStore(backend, this);
    this.exifTool = new ExifIO(localStorage.getItem('hierarchical-separator') || undefined);
    this.imageLoader = new ImageLoader(this.exifTool);
  }

  static async main(backend: IDataStorage): Promise<RootStore> {
    const rootStore = new RootStore(backend);

    await Promise.all([
      // The location store must be initiated because the file entity contructor
      // uses the location reference to set values.
      rootStore.locationStore.init(),
      // The tag store needs to be awaited because file entites have references
      // to tag entities.
      rootStore.tagStore.init(),
      rootStore.exifTool.initialize(),
      rootStore.imageLoader.init(),
      rootStore.searchStore.init(),
    ]);

    // Restore preferences, which affects how the file store initializes
    // It depends on tag store being intialized for reconstructing search criteria
    rootStore.uiStore.recoverPersistentPreferences();
    rootStore.fileStore.recoverPersistentPreferences();
    const isSlideMode = runInAction(() => rootStore.uiStore.isSlideMode);

    const numCriterias = runInAction(() => rootStore.uiStore.searchCriteriaList.length);

    // There may already be a search already present, recovered from a previous session
    const fileStoreInit =
      numCriterias === 0
        ? rootStore.fileStore.fetchAllFiles
        : () => {
            // When searching by criteria, the file counts won't be set (only when fetching all files),
            // so fetch them manually
            rootStore.fileStore.refetchFileCounts().catch(console.error);
            return rootStore.fileStore.fetchFilesByQuery();
          };

    // Load the files already in the database so user instantly sees their images
    fileStoreInit().then(() => {
      rootStore.tagStore.initializeFileCounts(rootStore.fileStore.fileList);

      // If slide mode was recovered from previous session, it's disabled by setContentQuery :/
      // hacky workaround
      if (isSlideMode) {
        rootStore.uiStore.enableSlideMode();
      }
    });

    // Then, look for any new or removed images, and refetch if necessary
    rootStore.locationStore.watchLocations().then((foundNewFiles) => {
      if (foundNewFiles) {
        rootStore.fileStore.refetch();
      }
    });

    return rootStore;
  }

  static async preview(backend: IDataStorage): Promise<RootStore> {
    const rootStore = new RootStore(backend);

    await Promise.all([
      // The location store must be initiated because the file entity contructor
      // uses the location reference to set values.
      rootStore.locationStore.init(),
      // The tag store needs to be awaited because file entites have references
      // to tag entities.
      rootStore.tagStore.init(),
      rootStore.exifTool.initialize(),
      rootStore.imageLoader.init(),
    ]);

    // Restore preferences, which affects how the file store initializes
    // It depends on tag store being intialized for reconstructing search criteria
    rootStore.uiStore.recoverPersistentPreferences();
    rootStore.fileStore.recoverPersistentPreferences();

    // The preview window is opened while the locations are already watched. The
    // files are fetched based on the file selection.

    return rootStore;
  }

  async backupDatabaseToFile(path: string): Promise<void> {
    return this.backend.backupToFile(path);
  }

  async restoreDatabaseFromFile(path: string): Promise<void> {
    return this.backend.restoreFromFile(path);
  }

  async peekDatabaseFile(path: string): Promise<[numTags: number, numFiles: number]> {
    return this.backend.peekFile(path);
  }

  async clearDatabase(): Promise<void> {
    await this.backend.clear();
    RendererMessenger.clearDatabase();
    this.uiStore.clearPersistentPreferences();
    this.fileStore.clearPersistentPreferences();
  }
}

export default RootStore;
