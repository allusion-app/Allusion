import { action, observable } from 'mobx';
import Backend from '../../backend/Backend';
import { ClientTag, ITag } from '../../entities/Tag';
import RootStore from './RootStore';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class TagStore {
  backend: Backend;
  rootStore: RootStore;

  @observable tagList: ClientTag[] = [];

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
    this.tagList.splice(this.tagList.indexOf(tag), 1);
    tag.dispose();
    this.backend.removeTag(tag);
  }

  // @action
  // editTag(tag: Tag, name: string) {
  //   const index = this.tagList.indexOf(tag);
  //   tag.name = name;
  //   this.tagList[index] = tag;
  //   // Is this necessary or can I remove this line?

  // The advantage of domain objects is that you can modify the object,
  // and the observable fields are updated automatically in the backend.
  // So we only need actions for adding/deleting them

  //   this.backend.saveTag(tag.toBackendTag());
  // }
}

export default TagStore;
