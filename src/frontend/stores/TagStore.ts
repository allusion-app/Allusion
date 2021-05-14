import { action, observable, computed, makeObservable, runInAction } from 'mobx';

import Backend from 'src/backend/Backend';

import { generateId, ID } from 'src/entities/ID';
import { ClientTag, ITag, ROOT_TAG_ID } from 'src/entities/Tag';

import RootStore from './RootStore';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class TagStore {
  private readonly backend: Backend;
  private readonly rootStore: RootStore;

  private readonly _tagList = observable<ClientTag>([]);

  /** A lookup map to speedup finding entities */
  private readonly index = observable(new Map<ID, ClientTag>());

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    makeObservable(this);
  }

  async init(): Promise<void> {
    try {
      const fetchedTags = await this.backend.fetchTags();
      this.createTagGraph(fetchedTags);
    } catch (err) {
      console.log('Could not load tags', err);
    }
  }

  @computed get root(): ClientTag {
    return this._tagList[0];
  }

  @computed get tagList(): Readonly<ClientTag[]> {
    return this._tagList.slice(1);
  }

  @computed get len(): number {
    return this.tagList.length;
  }

  @computed get isEmpty(): boolean {
    return this.len === 0;
  }

  @action get(tag: ID): ClientTag | undefined {
    return this.index.get(tag);
  }

  @action.bound async create(parent: ClientTag, tagName: string): Promise<ClientTag> {
    const tag = new ClientTag(this, generateId(), tagName, new Date());
    await this.backend.createTag(tag.serialize());
    this.add(parent, tag);
    return tag;
  }

  @action.bound async delete(tag: ClientTag) {
    tag.dispose();
    await this.backend.removeTag(tag.id);
    await this.deleteSubTags(tag);
    this.remove(tag);
    this.rootStore.fileStore.refetch();
  }

  @action.bound async deleteTags(tags: ClientTag[]) {
    await this.backend.removeTags(tags.map((t) => t.id));
    for (const tag of tags) {
      tag.dispose();
      await this.deleteSubTags(tag);
      this.remove(tag);
    }
    this.rootStore.fileStore.refetch();
  }

  @action.bound merge(tagToBeRemoved: ClientTag, tagToMergeWith: ClientTag) {
    if (tagToBeRemoved.subTags.length > 0) return; // not dealing with tags that have subtags
    this.backend.mergeTags(tagToBeRemoved.id, tagToMergeWith.id).then(() => {
      this.remove(tagToBeRemoved);
      this.rootStore.fileStore.refetch();
    });
  }

  save(tag: ITag) {
    this.backend.saveTag(tag);
  }

  @action findByName(name: string): ClientTag | undefined {
    return this.tagList.find((t) => t.name === name);
  }

  @action findFlatTagListIndex(target: ClientTag): number | undefined {
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

  @action private createTagGraph(backendTags: ITag[]) {
    // Create tags
    for (const { id, name, dateAdded, color } of backendTags) {
      // Create entity and set properties
      // We have to do this because JavaScript does not allow multiple constructor.
      const tag = new ClientTag(this, id, name, dateAdded, color);
      // Add to index
      this._tagList.push(tag);
      this.index.set(tag.id, tag);
    }

    // Set parent and add sub tags
    for (let i = 0; i < backendTags.length; i++) {
      const tag = this._tagList[i];
      for (const id of backendTags[i].subTags) {
        const subTag = this.get(id);
        if (subTag !== undefined) {
          subTag.setParent(tag);
          tag.subTags.push(subTag);
        }
      }
    }
    const rootIndex = this._tagList.findIndex((t) => t.id === ROOT_TAG_ID);
    if (rootIndex < 0) {
      throw new Error('Root tag not found. This should not happen!');
    }
    const root = this._tagList[rootIndex];
    root.setParent(root);
    if (rootIndex !== 0) {
      [this._tagList[0], this._tagList[rootIndex]] = [this._tagList[rootIndex], this._tagList[0]];
    }
  }

  @action private add(parent: ClientTag, tag: ClientTag) {
    this._tagList.push(tag);
    this.index.set(tag.id, tag);
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
        this.index.delete(subTag.id);
        this._tagList.remove(subTag);
      }
    });
  }

  @action private remove(tag: ClientTag) {
    // Remove tag id reference from other observable objects
    this.rootStore.uiStore.deselectTag(tag);
    tag.parent.subTags.remove(tag);
    this.index.delete(tag.id);
    this._tagList.remove(tag);
  }
}

export default TagStore;
