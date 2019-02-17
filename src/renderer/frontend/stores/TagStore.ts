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
    this.backend.fetchTags().then((fetchedTags) => {
      fetchedTags.forEach((tag) => this.updateFromBackend(tag));
    });
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
  addTag(tagName: string) {
    const tag = new ClientTag(this, tagName);
    this.tagList.push(tag);
    this.backend.createTag(tag.id, tag.name, tag.description);
  }

  @action
  removeTag(tag: ClientTag) {
    // Remove tag from state
    this.tagList.splice(this.tagList.indexOf(tag), 1);

    // Remove tag from files
    this.rootStore.fileStore.fileList
      .filter((f) => f.tags.includes(tag.id))
      .forEach((f) => f.removeTag(tag.id));

    // Remove tag from DB
    tag.dispose();
    this.backend.removeTag(tag);
  }
}

export default TagStore;
