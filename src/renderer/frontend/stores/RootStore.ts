import Backend from '../../backend/Backend';
import FileStore from './FileStore';
import TagStore from './TagStore';
import UiStore from './UiStore';
import TagCollectionStore from './TagCollectionStore';

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
  backend: Backend;

  public tagStore: TagStore;
  public tagCollectionStore: TagCollectionStore;
  public fileStore: FileStore;
  public uiStore: UiStore;

  constructor(backend: Backend) {
    this.backend = backend;
    this.tagStore = new TagStore(backend, this);
    this.tagCollectionStore = new TagCollectionStore(backend, this);
    this.fileStore = new FileStore(backend, this);
    this.uiStore = new UiStore(this);
  }

  async init() {
    await Promise.all([
      this.tagStore.init(),
      this.tagCollectionStore.init(),
      this.fileStore.init(),
    ]);

    this.uiStore.isInitialized = true;
  }
}

export default RootStore;
