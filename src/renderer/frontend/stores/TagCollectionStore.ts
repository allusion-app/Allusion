import { action, IObservableArray, observable } from 'mobx';
import Backend from '../../backend/Backend';
import {
  ClientTagCollection,
  ITagCollection,
  ROOT_TAG_COLLECTION_ID,
} from '../../entities/TagCollection';
import RootStore from './RootStore';
import { ID } from '../../entities/ID';
import { ClientTag } from '../../entities/Tag';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class TagCollectionStore {
  tagCollectionList: IObservableArray<ClientTagCollection> = observable<ClientTagCollection>([]);

  private backend: Backend;
  private rootStore: RootStore;

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
  }

  @action.bound async init() {
    return this.loadTagCollections();
  }

  @action.bound async addTagCollection(name: string, parent?: ClientTagCollection) {
    const newCol = new ClientTagCollection(this, name);
    this.tagCollectionList.push(newCol);
    await this.backend.createTagCollection(newCol.id, newCol.name, newCol.description);
    if (parent) {
      parent.addCollection(newCol.id);
    }
    return newCol;
  }

  @action.bound async removeTagCollection(tagCol: ClientTagCollection) {
    // Remove save handler
    tagCol.dispose();

    // Remove collection from state
    this.tagCollectionList.remove(tagCol);

    // Remove collection from other collections (where it is a subcollection)
    this.tagCollectionList.forEach((col) => col.subCollections.remove(tagCol.id));

    // Remove sub-collections of this collection from state
    await Promise.all(
      tagCol.clientSubCollections.map((subCol) => this.removeTagCollection(subCol)),
    );

    // Remove tags in this collection
    await Promise.all(tagCol.clientTags.map((tag) => tag.delete()));

    // Remove collection from DB
    await this.backend.removeTagCollection(tagCol);
  }

  /** Find and remove missing tags from files */
  @action.bound clean() {
    // Todo: Clean-up methods for all stores
  }

  @action.bound private async loadTagCollections() {
    try {
      const fetchedTagCollections = await this.backend.fetchTagCollections();
      fetchedTagCollections.forEach((tagCol) => this.updateFromBackend(tagCol));
    } catch (err) {
      console.error('Could not load tag collections', err);
    }
  }

  @action.bound private updateFromBackend(backendTagCol: ITagCollection) {
    const tagCol = this.get(backendTagCol.id);
    // In case a tag collection was added to the server from another client or session
    if (!tagCol) {
      this.tagCollectionList.push(new ClientTagCollection(this).updateFromBackend(backendTagCol));
    } else {
      // Else, update the existing tag collection
      tagCol.updateFromBackend(backendTagCol);
    }
  }

  get(collection: ID): ClientTagCollection | undefined {
    return this.tagCollectionList.find((col) => col.id === collection);
  }

  getRootCollection() {
    const root = this.get(ROOT_TAG_COLLECTION_ID);
    if (!root) {
      throw new Error('Root collection not found. This should not happen!');
    }
    return root;
  }

  getTag(tag: ID): ClientTag | undefined {
    return this.rootStore.tagStore.get(tag);
  }

  isTagSelected(tag: ID): boolean {
    return this.rootStore.tagStore.isSelected(tag);
  }

  save(collection: ITagCollection) {
    this.backend.saveTagCollection(collection);
  }
}

export default TagCollectionStore;
