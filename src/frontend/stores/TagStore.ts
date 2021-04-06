import { action, observable, computed, makeObservable, runInAction } from 'mobx';

import Backend from 'src/backend/Backend';

import { generateId, ID } from 'src/entities/ID';
import { ClientTag, ITag, ROOT_TAG_ID } from 'src/entities/Tag';
import { ClientTagSearchCriteria } from 'src/entities/SearchCriteria';

import RootStore from './RootStore';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class TagStore {
  private readonly backend: Backend;
  private readonly rootStore: RootStore;

  readonly tagList = observable(new Array<ClientTag>());
  /** A lookup map to speedup finding entities */
  private readonly index = observable(new Map<ID, number>());

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    makeObservable(this);
  }

  async init() {
    try {
      const fetchedTags = await this.backend.fetchTags();
      this.createTagGraph(fetchedTags);
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

  @computed get tagListWithoutRoot() {
    return this.tagList.filter((t) => t.id !== ROOT_TAG_ID);
  }

  @action findFlatTagListIndex(target: ClientTag) {
    // Iterative DFS algorithm
    const stack: ClientTag[] = [];
    let tag: ClientTag | undefined = this.root;
    let index = -1;
    do {
      if (tag === target) {
        break;
      }
      for (let i = tag.subTags.length - 1; i >= 0; i--) {
        const subTag = tag.subTags[i];
        stack.push(subTag);
      }
      tag = stack.pop();
      index += 1;
    } while (tag !== undefined);
    return index > -1 ? index : undefined;
  }

  @action isSelected(tag: ClientTag): boolean {
    return this.rootStore.uiStore.tagSelection.has(tag);
  }

  @action isSearched(tag: ID): boolean {
    return this.rootStore.uiStore.searchCriteriaList.some(
      (c) => c instanceof ClientTagSearchCriteria && c.value.includes(tag),
    );
  }

  @action.bound async create(parent: ClientTag, tagName: string) {
    let id = generateId();
    // It is very unlikely to create two identical ids but that is better
    // than throwing an error.
    if (this.exists(id)) {
      id = generateId();
    }
    const tag = new ClientTag(this, id, tagName, new Date());
    await this.backend.createTag(tag.serialize());
    this.add(parent, tag);
    return tag;
  }

  @action.bound insert(tag: ClientTag, subTag: ClientTag, index: number) {
    if (tag === subTag || subTag.id === ROOT_TAG_ID) {
      return;
    }
    // Move to different pos in same parent: Reorder tag.subTags and return
    if (tag === subTag.parent) {
      if (index > -1 && index < tag.subTags.length) {
        // If moving below current position, take into account removing self affecting the index
        const newIndex = tag.subTags.indexOf(subTag) < index ? index - 1 : index;
        tag.subTags.remove(subTag);
        tag.subTags.splice(newIndex, 0, subTag);
      }
      return;
    }
    // Abort if subTag is an ancestor node of target tag.
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
    await this.backend.removeTag(tag.id);
    await this.deleteSubTags(tag);
    this.remove(tag);
    this.rebuildIndex();
    this.rootStore.fileStore.refetch();
  }

  @action.bound async deleteTags(tags: ClientTag[]) {
    await this.backend.removeTags(tags.map((t) => t.id));
    for (const tag of tags) {
      tag.dispose();
      await this.deleteSubTags(tag);
      this.remove(tag);
    }
    this.rebuildIndex();
    this.rootStore.fileStore.refetch();
  }

  @action.bound merge(tagToBeRemoved: ClientTag, tagToMergeWith: ClientTag) {
    if (tagToBeRemoved.subTags.length > 0) return; // not dealing with tags that have subtags
    this.backend.mergeTags(tagToBeRemoved.id, tagToMergeWith.id).then(() => {
      this.remove(tagToBeRemoved);
      this.rebuildIndex();
      this.rootStore.fileStore.refetch();
    });
  }

  save(tag: ITag) {
    this.backend.saveTag(tag);
  }

  @action private createTagGraph(backendTags: ITag[]) {
    // Create tags
    for (const { id, name, dateAdded, color } of backendTags) {
      // Create entity and set properties
      // We have to do this because JavaScript does not allow multiple constructor.
      const tag = new ClientTag(this, id, name, dateAdded, color);
      // Add to index
      this.index.set(tag.id, this.tagList.length);
      this.tagList.push(tag);
    }

    // Set parent and add sub tags
    for (let i = 0; i < backendTags.length; i++) {
      const { subTags } = backendTags[i];
      const tag = this.tagList[i];

      tag.update((tag) => {
        for (const id of subTags) {
          const subTag = this.get(id);
          if (subTag !== undefined) {
            subTag.setParent(tag);
            tag.subTags.push(subTag);
          }
        }
      });
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
    runInAction(() => {
      for (const subTag of tag.subTags) {
        subTag.dispose();
        this.deleteSubTags(subTag);
        this.rootStore.uiStore.deselectTag(subTag);
        this.tagList.remove(subTag);
      }
    });
  }

  @action private remove(tag: ClientTag) {
    // Remove tag id reference from other observable objects
    this.rootStore.uiStore.deselectTag(tag);
    tag.parent.subTags.remove(tag);
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
