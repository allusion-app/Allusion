import { action, IObservableArray, observable, runInAction } from 'mobx';
import Backend from '../../backend/Backend';
import {
  ClientTagCollection,
  ITagCollection,
  ROOT_TAG_COLLECTION_ID,
} from '../../entities/TagCollection';
import RootStore from './RootStore';
import { ID } from '../../entities/ID';
import { ClientTag } from '../../entities/Tag';
import { ClientCollectionSearchCriteria } from 'src/renderer/entities/SearchCriteria';

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
    const col = new ClientTagCollection(this, name);
    this.tagCollectionList.push(col);
    await this.backend.createTagCollection(col.serialize());
    parent?.addCollection(col.id);
    return col;
  }

  /** Removes tag collection and all its descendant */
  @action.bound async removeTagCollection(col: ClientTagCollection) {
    // Remove descendants of this tag collection to prevent parent missing waring
    await Promise.all(col.clientSubCollections.map(this.removeTagCollection));
    await Promise.all(col.clientTags.map((tag) => tag.delete()));

    // Removes collection from frontend and backend
    const id = await this.delete(col);
    runInAction(() => this.tagCollectionList.forEach((c) => c.subCollections.remove(id)));
  }

  /** Find and remove missing tags from files */
  @action.bound clean() {
    // Todo: Clean-up methods for all stores
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

  isSearched(collectionId: ID): boolean {
    return this.rootStore.uiStore.searchCriteriaList.some(
      (c) => c instanceof ClientCollectionSearchCriteria && c.collectionId === collectionId,
    );
  }

  save(collection: ITagCollection) {
    this.backend.saveTagCollection(collection);
  }

  /**
   * Removes collection from frontend and backend
   */
  @action private async delete(col: ClientTagCollection): Promise<ID> {
    const id = col.id;
    col.dispose();
    await this.backend.removeTagCollection(col);
    runInAction(() => this.tagCollectionList.remove(col));
    return id;
  }

  @action private async loadTagCollections() {
    try {
      const fetchedTagCollections = await this.backend.fetchTagCollections();
      fetchedTagCollections.forEach((tagCol) => this.updateFromBackend(tagCol));
    } catch (err) {
      console.error('Could not load tag collections', err);
    }
  }

  @action private updateFromBackend(backendTagCol: ITagCollection) {
    const tagCol = this.get(backendTagCol.id);
    // In case a tag collection was added to the server from another client or session
    if (!tagCol) {
      this.tagCollectionList.push(new ClientTagCollection(this).updateFromBackend(backendTagCol));
    } else {
      // Else, update the existing tag collection
      tagCol.updateFromBackend(backendTagCol);
    }
  }
}

export default TagCollectionStore;
