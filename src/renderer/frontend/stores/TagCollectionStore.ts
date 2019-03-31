import { action, IObservableArray, observable } from 'mobx';
import Backend from '../../backend/Backend';
import { ClientTagCollection, ITagCollection } from '../../entities/TagCollection';
import RootStore from './RootStore';

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
    const tagCol = this.tagCollectionList.find((t) => backendTagCol.id === t.id);
    // In case a tag collection was added to the server from another client or session
    if (!tagCol) {
      this.tagCollectionList.push(new ClientTagCollection(this).updateFromBackend(backendTagCol));
    } else {
      // Else, update the existing tag collection
      tagCol.updateFromBackend(backendTagCol);
    }
  }

  @action
  addTagCollection(name: string, parent?: ClientTagCollection) {
    const newCol = new ClientTagCollection(this, name);
    this.tagCollectionList.push(newCol);
    this.backend.createTagCollection(newCol.id, newCol.name, newCol.description)
      .then((col) => parent && parent.subCollections.push(col.id));
    return newCol;
  }

  @action
  removeTagCollection(tagCol: ClientTagCollection) {
    // Remove collection from state
    this.tagCollectionList.splice(this.tagCollectionList.indexOf(tagCol), 1);

    // Remove collection from other collections (where it is a subcollection)
    this.tagCollectionList.forEach((col) => col.subCollections.remove(tagCol.id));

    // Remove sub-collections of this collection from state
    tagCol.clientSubCollections.forEach((subCol) => this.removeTagCollection(subCol));

    // Remove tags in this collection
    tagCol.clientTags.forEach((tag) => this.rootStore.tagStore.removeTag(tag));

    // Remove collection from DB
    tagCol.dispose();
    this.backend.removeTagCollection(tagCol);
  }
}

export default TagCollectionStore;
