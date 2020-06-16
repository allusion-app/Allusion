import Backend from '../../backend/Backend';
import FileStore from './FileStore';
import TagStore from './TagStore';
import UiStore from './UiStore';
import TagCollectionStore from './TagCollectionStore';
import LocationStore from './LocationStore';

import { configure } from 'mobx';

// This will throw exceptions whenver we try to modify the state directly without an action
// Actions will batch state modifications -> better for performance
// https://mobx.js.org/refguide/action.html
configure({ enforceActions: 'observed' });

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
  public tagStore: TagStore;
  public tagCollectionStore: TagCollectionStore;
  public fileStore: FileStore;
  public locationStore: LocationStore;
  public uiStore: UiStore;

  private backend: Backend;

  constructor(backend: Backend) {
    this.backend = backend;
    this.tagStore = new TagStore(backend, this);
    this.tagCollectionStore = new TagCollectionStore(backend, this);
    this.fileStore = new FileStore(backend, this);
    this.locationStore = new LocationStore(backend, this);
    this.uiStore = new UiStore(this);

    this.clearDatabase = this.clearDatabase.bind(this);
  }

  async init(autoLoadFiles: boolean) {
    // The location store is not required to be finished with loading before showing the rest
    // So it does not need to be awaited
    this.locationStore.init(autoLoadFiles);
    await Promise.all([
      this.tagStore.init(),
      this.tagCollectionStore.init(),
      this.fileStore.init(autoLoadFiles),
    ]);
    // Upon loading data, initialize UI state.
    this.uiStore.init();
  }

  async clearDatabase() {
    await this.backend.clearDatabase();
    this.uiStore.reload();
  }
}

export default RootStore;
