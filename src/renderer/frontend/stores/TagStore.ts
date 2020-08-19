import { action, IObservableArray, observable, runInAction } from 'mobx';
import Backend from '../../backend/Backend';
import { ClientTag, ITag } from '../../entities/Tag';
import RootStore from './RootStore';
import { ID } from '../../entities/ID';
import { ClientTagCollection } from '../../entities/TagCollection';
import { ClientIDSearchCriteria } from 'src/renderer/entities/SearchCriteria';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class TagStore {
  tagList: IObservableArray<ClientTag> = observable<ClientTag>([]);

  private backend: Backend;
  private rootStore: RootStore;

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
  }

  @action.bound init() {
    this.loadTags();
  }

  get(tag: ID): ClientTag | undefined {
    return this.tagList.find((t) => t.id === tag);
  }

  getParent(child: ID): ClientTagCollection {
    const parent = this.rootStore.tagCollectionStore.tagCollectionList.find((col) =>
      col.tags.includes(child),
    );
    if (!parent) {
      console.warn('Tag does not have a parent', this);
    }
    return parent || this.rootStore.tagCollectionStore.getRootCollection();
  }

  isSelected(tag: ID): boolean {
    return this.rootStore.uiStore.tagSelection.has(tag);
  }

  isSearched(tag: ID): boolean {
    return this.rootStore.uiStore.searchCriteriaList.some(
      (c) => c instanceof ClientIDSearchCriteria && c.value.includes(tag),
    );
  }

  save(tag: ITag) {
    this.backend.saveTag(tag);
  }

  @action.bound async addTag(tagName: string) {
    const tag = new ClientTag(this, tagName);
    this.tagList.push(tag);
    await this.backend.createTag(tag.serialize());
    return tag;
  }

  @action.bound async removeTag(tag: ClientTag) {
    // Mark tag object for garbage collection
    const id = await this.delete(tag);

    // Remove tag id reference from other observable objects
    this.rootStore.uiStore.deselectTag(id);
    this.rootStore.fileStore.fileList.forEach((f) => f.removeTag(id));
    this.rootStore.tagCollectionStore.tagCollectionList.forEach((col) => col.removeTag(id));
  }

  /**
   * Removes tag from frontend and backend
   */
  @action private async delete(tag: ClientTag): Promise<ID> {
    const id = tag.id;
    tag.dispose();
    await this.backend.removeTag(tag);
    runInAction(() => this.tagList.remove(tag));
    return id;
  }

  @action private loadTags() {
    this.backend
      .fetchTags()
      .then((fetchedTags) => {
        fetchedTags.forEach((tag) => this.updateFromBackend(tag));
      })
      .catch((err) => console.log('Could not load tags', err));
  }

  @action private updateFromBackend(backendTag: ITag) {
    const tag = this.get(backendTag.id);
    // In case a tag was added to the server from another client or session
    if (!tag) {
      this.tagList.push(new ClientTag(this).updateFromBackend(backendTag));
    } else {
      // Else, update the existing tag
      tag.updateFromBackend(backendTag);
    }
  }
}

export default TagStore;
