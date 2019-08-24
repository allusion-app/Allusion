import { action, IObservableArray, observable } from 'mobx';
import Backend from '../../backend/Backend';
import {
  ClientTagCollection,
  ITagCollection,
  ROOT_TAG_COLLECTION_ID,
} from '../../entities/TagCollection';
import RootStore from './RootStore';
import { ID } from '../../entities/ID';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class TagCollectionStore {
  backend: Backend;
  rootStore: RootStore;

  tagCollectionList: IObservableArray<ClientTagCollection> = observable<ClientTagCollection>([]);

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
  }

  getRootCollection() {
    const root = this.getTagCollection(ROOT_TAG_COLLECTION_ID);
    if (!root) {
      throw new Error('Root collection not found. This should not happen!');
    }
    return root;
  }

  async init() {
    return this.loadTagCollections();
  }

  async loadTagCollections() {
    try {
      const fetchedTagCollections = await this.backend.fetchTagCollections();
      fetchedTagCollections.forEach((tagCol) => this.updateFromBackend(tagCol));
    } catch (err) {
      console.error('Could not load tag collections', err);
    }
  }

  updateFromBackend(backendTagCol: ITagCollection) {
    const tagCol = this.getTagCollection(backendTagCol.id);
    // In case a tag collection was added to the server from another client or session
    if (!tagCol) {
      this.tagCollectionList.push(new ClientTagCollection(this).updateFromBackend(backendTagCol));
    } else {
      // Else, update the existing tag collection
      tagCol.updateFromBackend(backendTagCol);
    }
  }

  getTagCollection(collection: ID): ClientTagCollection | undefined {
    return this.tagCollectionList.find((col) => col.id === collection);
  }

  @action
  async addTagCollection(name: string, parent?: ClientTagCollection) {
    const newCol = new ClientTagCollection(this, name);
    this.tagCollectionList.push(newCol);
    await this.backend.createTagCollection(newCol.id, newCol.name, newCol.description);
    if (parent) {
      parent.subCollections.push(newCol.id);
    }
    return newCol;
  }

  @action
  async removeTagCollection(tagCol: ClientTagCollection) {
    // Remove save handler
    tagCol.dispose();

    // Remove collection from state
    this.tagCollectionList.remove(tagCol);

    // Remove collection from other collections (where it is a subcollection)
    this.tagCollectionList.forEach((col) => col.subCollections.remove(tagCol.id));

    // Remove sub-collections of this collection from state
    await Promise.all(
      tagCol.clientSubCollections.map((subCol) => this.removeTagCollection(subCol))
    );

    // Remove tags in this collection
    await Promise.all(tagCol.clientTags.map((tag) => this.rootStore.tagStore.removeTag(tag)));

    // Remove collection from DB
    await this.backend.removeTagCollection(tagCol);
  }

  /** Find and remove missing tags from files */
  @action clean() {
    // Todo: Clean-up methods for all stores
  }
}

export default TagCollectionStore;
