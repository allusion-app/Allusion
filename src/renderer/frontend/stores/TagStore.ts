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
  /** A lookup map to speedup finding entities */
  private readonly index: ObservableMap<ID, number> = observable(new Map());

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
    const index = this.index.get(tag);
    return index !== undefined ? this.tagList[index] : undefined;
  }

  @computed get root() {
    const root = this.tagList.find((t) => t.id === ROOT_TAG_ID);
    if (!root) {
      throw new Error('Root tag not found. This should not happen!');
    }
    return root;
  }

  @action isSelected(tag: ID): boolean {
    return this.rootStore.uiStore.tagSelection.has(tag);
  }

  @action isSearched(tag: ID): boolean {
    return this.rootStore.uiStore.searchCriteriaList.some(
      (c) => c instanceof ClientIDSearchCriteria && c.value.includes(tag),
    );
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
        const newIndex = tag.subTags.indexOf(subTag) < index ? index - 1 : index;
        tag.subTags.remove(subTag);
        tag.subTags.splice(newIndex, 0, subTag);
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
    subTag.parent.subTags.remove(subTag);
    if (index > -1 && index < tag.subTags.length) {
      tag.subTags.splice(index, 0, subTag);
    } else {
      tag.subTags.push(subTag);
    }
    subTag.setParent(tag);
  }

  @action.bound async delete(tag: ClientTag) {
    tag.dispose();
    await this.deleteSubTags(tag);
    await this.backend.removeTag(tag.id);
    runInAction(() => tag.parent.subTags.remove(tag));
    this.remove(tag);
    this.rebuildIndex();
  }

  save(tag: ITag) {
    this.backend.saveTag(tag);
  }

  @action private initTagList(backendTags: ITag[]) {
    // Create tags
    for (const backendTag of backendTags) {
      // Create entity and set properties
      // We have to do this because JavaScript does not allow multiple constructor.
      const tag = new ClientTag(this, backendTag.id, backendTag.name, backendTag.dateAdded);
      tag.freeze();
      tag.description = backendTag.description;
      tag.color = backendTag.color;
      // Add to index
      this.index.set(tag.id, this.tagList.length);
      this.tagList.push(tag);
    }

    // Set parent and add sub tags
    for (let i = 0; i < backendTags.length; i++) {
      const backendTag = backendTags[i];
      const tag = this.tagList[i];

      for (const id of backendTag.subTags) {
        const subTag = this.get(id);
        if (subTag !== undefined) {
          subTag.setParent(tag);
          tag.subTags.push(subTag);
        }
      }
      tag.unFreeze();
    }
    this.root.setParent(this.root);
  }

  @action private add(parent: ClientTag, tag: ClientTag) {
    this.index.set(tag.id, this.tagList.length);
    this.tagList.push(tag);
    tag.setParent(parent);
    parent.subTags.push(tag);
  }

  // The difference between this method and delete is that no computation
  // power is wasted on removing the tag id from the parent subTags list.
  @action private async deleteSubTags(tag: ClientTag) {
    if (tag.subTags.length > 0) {
      const ids = tag.subTags.map((subTag) => subTag.id);
      await this.backend.removeTags(ids);
    }
    runInAction(async () => {
      for (const subTag of tag.subTags) {
        subTag.dispose();
        this.deleteSubTags(subTag);
        this.remove(subTag);
      }
    });
  }

  @action private remove(tag: ClientTag) {
    // Remove tag id reference from other observable objects types
    this.rootStore.uiStore.deselectTag(tag);
    for (const file of this.rootStore.fileStore.fileList) {
      file.removeTag(tag);
    }
    this.tagList.remove(tag);
  }

  @action private rebuildIndex(): void {
    this.index.clear();
    for (let i = 0; i < this.tagList.length; i++) {
      const tag = this.tagList[i];
      this.index.set(tag.id, i);
    }
  }

  /** Checks whether a tag exists with this id. */
  private exists(id: ID): boolean {
    return this.index.has(id);
  }
}

export default TagStore;
