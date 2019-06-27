import { action, IObservableArray, observable } from 'mobx';
import Backend from '../../backend/Backend';
import { ClientTag, ITag } from '../../entities/Tag';
import RootStore from './RootStore';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class TagStore {
  backend: Backend;
  rootStore: RootStore;

  tagList: IObservableArray<ClientTag> = observable<ClientTag>([]);

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
  }

  init() {
    this.loadTags();
  }

  loadTags() {
    this.backend
      .fetchTags()
      .then((fetchedTags) => {
        fetchedTags.forEach((tag) => this.updateFromBackend(tag));
      })
      .catch((err) => console.log('Could not load tags', err));
  }

  updateFromBackend(backendTag: ITag) {
    const tag = this.tagList.find((t) => backendTag.id === t.id);
    // In case a tag was added to the server from another client or session
    if (!tag) {
      this.tagList.push(new ClientTag(this).updateFromBackend(backendTag));
    } else {
      // Else, update the existing tag
      tag.updateFromBackend(backendTag);
    }
  }

  @action
  async addTag(tagName: string) {
    const tag = new ClientTag(this, tagName);
    this.tagList.push(tag);
    await this.backend.createTag(tag.id, tag.name, tag.description);
    return tag;
  }

  @action
  async removeTag(tag: ClientTag) {
    tag.dispose();

    // Remove tag from state
    this.tagList.splice(this.tagList.indexOf(tag), 1);

    // Remove tag from selection
    this.rootStore.uiStore.tagSelection.remove(tag.id);

    // Remove tag from files
    this.rootStore.fileStore.fileList
      .filter((f) => f.tags.includes(tag.id))
      .forEach((f) => f.removeTag(tag.id));

    // Remove tag from collections
    this.rootStore.tagCollectionStore.tagCollectionList.forEach((col) =>
      col.removeTag(tag.id),
    );

    // Remove tag from DB
    await this.backend.removeTag(tag);
  }
}

export default TagStore;
