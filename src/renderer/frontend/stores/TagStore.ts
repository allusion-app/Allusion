import {
  action,
  IObservableArray,
  ObservableMap,
  observable,
  runInAction,
  computed,
  makeObservable,
} from 'mobx';
import Backend from '../../backend/Backend';
import { ClientTag, ITag, ROOT_TAG_ID } from '../../entities/Tag';
import RootStore from './RootStore';
import { generateId, ID } from '../../entities/ID';
import { ClientIDSearchCriteria } from 'src/renderer/entities/SearchCriteria';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class TagStore {
  private readonly backend: Backend;
  private readonly rootStore: RootStore;

  readonly tagList: IObservableArray<ClientTag> = observable([]);
  /** Maps child ID to parent ClientTag reference. */
  private readonly parentLookup: ObservableMap<ID, ClientTag> = observable(new Map());

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    makeObservable(this);
  }

  async init() {
    try {
      const fetchedTags = await this.backend.fetchTags();
      this.initTagList(fetchedTags);
    } catch (err) {
      console.log('Could not load tags', err);
    }
  }

  @action get(tag: ID): ClientTag | undefined {
    return this.tagList.find((t) => t.id === tag);
  }

  @computed get root() {
    const root = this.tagList.find((t) => t.id === ROOT_TAG_ID);
    if (!root) {
      throw new Error('Root tag not found. This should not happen!');
    }
    return root;
  }

  @action getParent(child: ID): ClientTag {
    const parent = this.parentLookup.get(child);
    if (parent === undefined) {
      console.warn('Tag does not have a parent', this);
      return this.root;
    }
    return parent;
  }

  @action isSelected(tag: ID): boolean {
    return this.rootStore.uiStore.tagSelection.has(tag);
  }

  @action isSearched(tag: ID): boolean {
    return this.rootStore.uiStore.searchCriteriaList.some(
      (c) => c instanceof ClientIDSearchCriteria && c.value.includes(tag),
    );
  }

  /** Checks whether a tag exists with this id. */
  exists(id: ID): boolean {
    // Each tag has a parent which is why it is faster to lookup the parent
    // instead of searching the whole list every time.
    return this.parentLookup.has(id);
  }

  *getIterFrom(ids: Iterable<ID>): Generator<ClientTag> {
    for (const id of ids) {
      if (this.exists(id)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        yield this.get(id)!;
      }
    }
  }

  @action.bound async create(parent: ClientTag, tagName: string) {
    let id = generateId();
    // It is very unlikely to create two identical ids but that is better
    // than throwing an error.
    if (this.exists(id)) {
      id = generateId();
    }
    const tag = new ClientTag(this, id, tagName);
    await this.backend.createTag(tag.serialize());
    this.add(parent, tag);
    return tag;
  }

  @action.bound insert(tag: ClientTag, subTag: ClientTag, index: number) {
    if (tag === subTag || subTag.id === ROOT_TAG_ID) {
      return;
    }
    // Reorder tag.subTags and return
    if (tag === subTag.parent) {
      if (index > -1 && index < tag.subTags.length) {
        const newIndex = tag.subTags.indexOf(subTag.id) < index ? index - 1 : index;
        tag.subTags.remove(subTag.id);
        tag.subTags.splice(newIndex, 0, subTag.id);
      }
      return;
    }
    // Check whether subTag is not an ancestor node of tag.
    let node = tag.parent;
    while (node.id !== ROOT_TAG_ID) {
      if (node === subTag) {
        return;
      }
      node = node.parent;
    }
    // Insert subTag into tag
    subTag.parent.subTags.remove(subTag.id);
    if (index > -1 && index < tag.subTags.length) {
      tag.subTags.splice(index, 0, subTag.id);
    } else {
      tag.subTags.push(subTag.id);
    }
    this.parentLookup.set(subTag.id, tag);
  }

  @action.bound async delete(tag: ClientTag) {
    tag.dispose();
    await this.backend.removeTag(tag.id);
    await this.deleteSubTags(tag);
    runInAction(() => tag.parent.subTags.remove(tag.id));
    this.remove(tag);
  }

  save(tag: ITag) {
    this.backend.saveTag(tag);
  }

  @action private add(parent: ClientTag, tag: ClientTag) {
    this.parentLookup.set(tag.id, parent);
    this.tagList.push(tag);
    parent.subTags.push(tag.id);
  }

  // The difference between this method and delete is that no computation
  // power is wasted on removing the tag id from the parent subTags list.
  @action private async deleteSubTags(tag: ClientTag) {
    for (const subTag of tag.clientSubTags) {
      subTag.dispose();
      await this.backend.removeTag(subTag.id);
      await this.deleteSubTags(subTag);
      this.remove(subTag);
    }
  }

  @action private remove(tag: ClientTag) {
    // Remove tag id reference from other observable objects types
    this.rootStore.uiStore.deselectTag(tag);
    for (const file of this.rootStore.fileStore.fileList) {
      file.removeTag(tag.id);
    }
    this.parentLookup.delete(tag.id);
    this.tagList.remove(tag);
  }

  @action private initTagList(backendTags: ITag[]) {
    // Create tag objects
    for (const backendTag of backendTags) {
      const tag = new ClientTag(
        this,
        backendTag.id,
        backendTag.name,
        backendTag.dateAdded,
      ).updateFromBackend(backendTag);
      this.tagList.push(tag);
      for (const subTag of tag.subTags) {
        this.parentLookup.set(subTag, tag);
      }
    }
    // Set missing parents with root
    const root = this.root;
    for (const tag of this.tagList) {
      if (!this.exists(tag.id)) {
        this.parentLookup.set(tag.id, root);
      }
    }
  }
}

export default TagStore;
