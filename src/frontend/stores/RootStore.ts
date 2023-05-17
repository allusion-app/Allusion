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

// This will throw exceptions whenever we try to modify the state directly without an action
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
  readonly getWindowTitle: () => string;

  private constructor(
    private backend: IDataStorage,
    formatWindowTitle: (FileStore: FileStore, uiStore: UiStore) => string,
  ) {
    this.tagStore = new TagStore(backend, this);
    this.fileStore = new FileStore(backend, this);
    this.locationStore = new LocationStore(backend, this);
    this.uiStore = new UiStore(this);
    this.searchStore = new SearchStore(backend, this);
    this.exifTool = new ExifIO(localStorage.getItem('hierarchical-separator') || undefined);
    this.imageLoader = new ImageLoader(this.exifTool);
    this.getWindowTitle = () => formatWindowTitle(this.fileStore, this.uiStore);
  }

  static async main(backend: IDataStorage): Promise<RootStore> {
    const rootStore = new RootStore(backend, (fileStore, uiStore) => {
      if (uiStore.isSlideMode && fileStore.fileList.length > 0) {
        const activeFile = fileStore.fileList[uiStore.firstItem];
        return `${activeFile.filename}.${activeFile.extension} - Allusion`;
      } else {
        return 'Allusion';
      }
    });

    const [fetchedLocations, fetchedTags, fetchedSearches] = await Promise.all([
      // The location store must be initiated because the file entity constructor
      // uses the location reference to set values.
      backend.fetchLocations(),
      // The tag store needs to be awaited because file entities have references
      // to tag entities.
      backend.fetchTags(),
      backend.fetchSearches(),
      rootStore.exifTool.initialize(),
      rootStore.imageLoader.init(),
    ]);

    rootStore.locationStore.init(fetchedLocations);
    rootStore.tagStore.init(fetchedTags);
    rootStore.searchStore.init(fetchedSearches);

    // Restore preferences, which affects how the file store initializes
    // It depends on tag store being initialized for reconstructing search criteria
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
    const rootStore = new RootStore(backend, (fileStore, uiStore) => {
      const PREVIEW_WINDOW_BASENAME = 'Allusion Quick View';
      const index = uiStore.firstItem;
      if (index >= 0 && index < fileStore.fileList.length) {
        const file = fileStore.fileList[index];
        return `${file.absolutePath} • ${PREVIEW_WINDOW_BASENAME}`;
      } else {
        return PREVIEW_WINDOW_BASENAME;
      }
    });

    const [fetchedLocations, fetchedTags] = await Promise.all([
      // The location store must be initiated because the file entity constructor
      // uses the location reference to set values.
      backend.fetchLocations(),
      // The tag store needs to be awaited because file entities have references
      // to tag entities.
      backend.fetchTags(),
      rootStore.imageLoader.init(),
      // Not: not initializing exiftool.
      // Might be needed for extracting thumbnails in preview mode, but can't be closed reliably,
      // causing exiftool to keep running after quitting
    ]);

    rootStore.locationStore.init(fetchedLocations);
    rootStore.tagStore.init(fetchedTags);

    // Restore preferences, which affects how the file store initializes
    // It depends on tag store being initialized for reconstructing search criteria
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

  async close(): Promise<void> {
    // TODO: should be able to be done more reliably by running exiftool as a child process
    return this.exifTool.close();
  }
}

export default RootStore;
