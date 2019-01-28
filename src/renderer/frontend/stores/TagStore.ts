
import { action, observable } from 'mobx';
import Backend from '../../backend/Backend';
import { ITag } from '../../entities/Tag';
import Tag from '../domain-objects/Tag';
import RootStore from './RootStore';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class TagStore {
  rootStore: RootStore;

  @observable tagList: Tag[] = [];
  backend: Backend;

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
  }

  init() {
    this.loadTags();
  }

  loadTags() {
    this.backend.fetchTags()
      .then((fetchedTags) => {
        fetchedTags.forEach((tag) => this.updateFromBackend(tag));
      });
  }

  updateFromBackend(backendTag: ITag) {
    const tag = this.tagList.find((t) => backendTag.id === t.id);
    // In case a tag was added to the server from another client or session
    if (!tag) {
      this.tagList.push(new Tag(this).updateFromBackend(backendTag));
    } else { // Else, update the existing tag
      tag.updateFromBackend(backendTag);
    }
  }

  @action
  addTag(tagName: string) {
    const tag = new Tag(this, tagName);
    this.tagList.push(tag);
    this.backend.createTag(tag.id, tag.name, tag.description);
  }

  @action
  removeTag(tag: Tag) {
    this.tagList.splice(this.tagList.indexOf(tag), 1);
    tag.dispose();
    this.backend.removeTag(tag.toBackendTag());
  }
}

export default TagStore;
