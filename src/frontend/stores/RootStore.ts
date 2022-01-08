import { configure } from 'mobx';

import Backend from 'src/backend/Backend';

import FileStore from './FileStore';
import TagStore from './TagStore';
import UiStore from './UiStore';
import LocationStore from './LocationStore';
import ExifIO from 'src/backend/ExifIO';
import ImageLoader from '../image/ImageLoader';

import { RendererMessenger } from 'src/Messaging';
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
  readonly clearDatabase: () => Promise<void>;

  constructor(private backend: Backend) {
    this.tagStore = new TagStore(backend, this);
    this.fileStore = new FileStore(backend, this);
    this.locationStore = new LocationStore(backend, this);
    this.uiStore = new UiStore(this);
    this.searchStore = new SearchStore(backend, this);
    this.exifTool = new ExifIO();
    this.imageLoader = new ImageLoader(this.exifTool);

    // SAFETY: The backend instance has the same lifetime as the RootStore.
    this.clearDatabase = async () => {
      await backend.clearDatabase();
      RendererMessenger.clearDatabase();
      this.uiStore.clearPersistentPreferences();
      this.fileStore.clearPersistentPreferences();
    };
  }

  async init(isPreviewWindow: boolean) {
    // The location store must be initiated because the file entity contructor
    // uses the location reference to set values.
    await this.locationStore.init();
    // The tag store needs to be awaited because file entites have references
    // to tag entities.
    await this.tagStore.init();

    await Promise.all([
      this.exifTool.initialize(),
      this.imageLoader.init(),
      this.searchStore.init(),
    ]);

    // The preview window is opened while the locations are already watched. The
    // files are fetched based on the file selection.
    if (!isPreviewWindow) {
      // Then, restore preferences, which affects how the file store initializes
      // It depends on tag store being intialized for reconstructing search criteria
      this.uiStore.recoverPersistentPreferences();
      this.fileStore.recoverPersistentPreferences();
      const isSlideMode = this.uiStore.isSlideMode;

      // There may already be a search already present, recovered from a previous session
      const fileStoreInit =
        this.uiStore.searchCriteriaList.length === 0
          ? this.fileStore.fetchAllFiles
          : () => {
              // When searching by criteria, the file counts won't be set (only when fetching all files),
              // so fetch them manually
              this.fileStore.refetchFileCounts().catch(console.error);
              return this.fileStore.fetchFilesByQuery();
            };

      // Load the files already in the database so user instantly sees their images
      fileStoreInit().then(() => {
        this.tagStore.initializeFileCounts(this.fileStore.fileList);

        // If slide mode was recovered from previous session, it's disabled by setContentQuery :/
        // hacky workaround
        if (isSlideMode) {
          this.uiStore.enableSlideMode();
        }
      });

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
