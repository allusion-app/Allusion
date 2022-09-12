import { action, computed, configure, flow, makeObservable, observable } from 'mobx';

import { IDataStorage } from 'src/api/data-storage';

import FileStore from './FileStore';
import TagStore from './TagStore';
import UiStore from './UiStore';
import LocationStore from './LocationStore';
import ExifIO from 'common/ExifIO';
import ImageLoader from '../image/ImageLoader';
import { RendererMessenger } from 'src/ipc/renderer';
import SearchStore from './SearchStore';
import { ClientTagSearchCriteria } from 'src/entities/SearchCriteria';
import { ConditionDTO } from 'src/api/data-storage-search';
import { FileDTO } from 'src/api/file';

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
  readonly getWindowTitle: () => string;

  /** An observable value to force a re-fetch. */
  @observable fetchToken = false;

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

    makeObservable(this);
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

    await Promise.all([
      // The location store must be initiated because the file entity contructor
      // uses the location reference to set values.
      rootStore.locationStore.init(),
      // The tag store needs to be awaited because file entites have references
      // to tag entities.
      rootStore.tagStore.init(),
      rootStore.fileStore.refetchFileCounts(),
      rootStore.exifTool.initialize(),
      rootStore.imageLoader.init(),
      rootStore.searchStore.init(),
    ]);

    // Restore preferences, which affects how the file store initializes
    // It depends on tag store being intialized for reconstructing search criteria
    rootStore.uiStore.recoverPersistentPreferences();
    rootStore.fileStore.recoverPersistentPreferences();

    // There may already be a search already present, recovered from a previous session
    // Load the files already in the database so user instantly sees their images
    flow(function* () {
      if (rootStore.uiStore.searchCriteriaList.length === 0) {
        yield* rootStore.fileStore.fetchAllFiles();
      } else {
        yield* rootStore.fileStore.fetchFilesByQuery(
          rootStore.uiStore.searchCriteriaList.map((criteria) =>
            criteria.toCondition(rootStore),
          ) as [ConditionDTO<FileDTO>, ...ConditionDTO<FileDTO>[]],
          rootStore.uiStore.searchMatchAny,
        );
      }
      rootStore.tagStore.initializeFileCounts(rootStore.fileStore.fileList);
    })();

    // Then, look for any new or removed images, and refetch if necessary
    rootStore.locationStore.watchLocations().then((foundNewFiles) => {
      if (foundNewFiles) {
        rootStore.refetch();
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

  @computed
  get showsAllContent() {
    return this.uiStore.searchCriteriaList.length === 0 && !this.uiStore.showsMissingContent;
  }

  @computed
  get showsUntaggedContent(): boolean {
    if (this.uiStore.searchCriteriaList.length !== 1) {
      return false;
    }

    const criteria = this.uiStore.searchCriteriaList[0];
    return (
      criteria instanceof ClientTagSearchCriteria &&
      criteria.key === 'tags' &&
      criteria.operator.startsWith('contains') &&
      criteria.value === undefined
    );
  }

  @computed
  get showsQueryContent(): boolean {
    return this.uiStore.searchCriteriaList.length > 0 && !this.showsUntaggedContent;
  }

  get showsMissingContent(): boolean {
    return this.uiStore.showsMissingContent;
  }

  /**
   * Triggers a re-fetch.
   *
   * Only use it when files were only updated in the backend or when is faster to just re-run the last query.
   */
  @action refetch(): void {
    this.fetchToken = !this.fetchToken;
  }

  @action.bound showAllFiles(): void {
    this.uiStore.showsMissingContent = false;
    this.uiStore.clearSearchCriteriaList();
  }

  @action.bound showUntaggedFiles(): void {
    this.uiStore.showsMissingContent = false;
    const criteria = new ClientTagSearchCriteria('tags');
    this.uiStore.replaceSearchCriteria(criteria);
  }

  @action.bound showMissingFiles(): void {
    this.uiStore.showsMissingContent = true;
    this.uiStore.clearSearchCriteriaList();
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
