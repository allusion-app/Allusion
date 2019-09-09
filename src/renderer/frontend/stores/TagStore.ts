import { action, IObservableArray, observable } from 'mobx';
import Backend from '../../backend/Backend';
import { ClientTag, ITag } from '../../entities/Tag';
import RootStore from './RootStore';
import { ID } from '../../entities/ID';

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

  @action.bound loadTags() {
    this.backend
      .fetchTags()
      .then((fetchedTags) => {
        fetchedTags.forEach((tag) => this.updateFromBackend(tag));
      })
      .catch((err) => console.log('Could not load tags', err));
  }

  @action.bound updateFromBackend(backendTag: ITag) {
    const tag = this.getTag(backendTag.id);
    // In case a tag was added to the server from another client or session
    if (!tag) {
      this.tagList.push(new ClientTag(this).updateFromBackend(backendTag));
    } else {
      // Else, update the existing tag
      tag.updateFromBackend(backendTag);
    }
  }

  getTag(tag: ID): ClientTag | undefined {
    return this.tagList.find((t) => t.id === tag);
  }

  @action.bound async addTag(tagName: string) {
    const tag = new ClientTag(this, tagName);
    this.tagList.push(tag);
    await this.backend.createTag(tag.id, tag.name, tag.description);
    return tag;
  }

  @action.bound async removeTag(tag: ClientTag) {
    tag.dispose();

    // Remove tag from state
    this.tagList.splice(this.tagList.indexOf(tag), 1);

    // Remove tag from selection
    this.rootStore.uiStore.deselectTag(tag.id);

    // Remove tag from files
    this.rootStore.fileStore.fileList
      .filter((f) => f.tags.includes(tag.id))
      .forEach((f) => f.removeTag(tag.id));

    // Remove tag from collections
    this.rootStore.tagCollectionStore.tagCollectionList.forEach((col) => col.removeTag(tag.id));

    // Remove tag from DB
    await this.backend.removeTag(tag);
  }
}

export default TagStore;
