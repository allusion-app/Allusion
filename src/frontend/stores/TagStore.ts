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

  @computed get root(): Readonly<ClientTag> {
    return this._tagList[0];
  }

  @computed get tagList(): readonly Readonly<ClientTag>[] {
    const tagTree: Readonly<ClientTag>[] = [];
    const pushTags = (tags: Readonly<ClientTag>[]) => {
      for (const t of tags) {
        tagTree.push(t);
        pushTags(t.subTags);
      }
    };
    pushTags(this.root.subTags);
    return tagTree;
  }

  @computed get count(): number {
    return this.tagList.length;
  }

  @computed get isEmpty(): boolean {
    return this.count === 0;
  }

  @action get(tag: ID): ClientTag | undefined {
    return this.index.get(tag);
  }

  @action getParent(tag: Readonly<ClientTag>): Readonly<ClientTag> {
    return this.get(tag.parent) ?? this.root;
  }

  /** Returns the tags up the hierarchy from this tag, excluding the root tag */
  @action getTreePath(tag: Readonly<ClientTag>): Readonly<ClientTag>[] {
    if (tag.id === ROOT_TAG_ID) {
      return [];
    }
    const treePath: Readonly<ClientTag>[] = [tag];
    let node = this.getParent(tag);
    while (node.id !== ROOT_TAG_ID) {
      treePath.unshift(node);
      node = this.getParent(node);
    }
    return treePath;
  }

  @action async create(parent: Readonly<ClientTag>, tagName: string): Promise<ClientTag> {
    const tag = new ClientTag(this, generateId(), tagName, new Date());
    await this.backend.createTag(tag.serialize());
    this.add(parent, tag);
    return tag;
  }

  @action async delete(tags: ClientTag[]) {
    await this.backend.removeTags(tags.map((t) => t.id));
    for (const tag of tags) {
      tag.dispose();
      await this.deleteSubTags(tag);
      this.remove(tag);
    }
  }

  @action merge(tagToBeRemoved: ClientTag, tagToMergeWith: Readonly<ClientTag>) {
    if (tagToBeRemoved.subTags.length > 0) return; // not dealing with tags that have subtags
    this.backend.mergeTags(tagToBeRemoved.id, tagToMergeWith.id).then(() => {
      this.remove(tagToBeRemoved);
      this.rootStore.fileStore.refetch();
    });
  }

  save(tag: ITag) {
    this.backend.saveTag(tag);
  }

  @action insert(parent: Readonly<ClientTag>, tag: ClientTag, at: number): void {
    if (parent === tag || tag.id === ROOT_TAG_ID) {
      return;
    }
    const tagParent = this.getParent(tag);
    // Move to different pos in same parent: Reorder tag.subTags and return
    if (parent === tagParent) {
      if (at > -1 && at <= parent.subTags.length) {
        // If moving below current position, take into account removing self affecting the index
        const newIndex = parent.subTags.indexOf(tag) < at ? at - 1 : at;
        parent.subTags.remove(tag);
        parent.subTags.splice(newIndex, 0, tag);
      }
      return;
    }
    // Abort if subTag is an ancestor node of target tag.
    let node = this.getParent(parent);
    while (node.id !== ROOT_TAG_ID) {
      if (node === tag) {
        return;
      }
      node = this.getParent(node);
    }
    // Insert subTag into tag
    tagParent.subTags.remove(tag);
    if (at > -1 && at < parent.subTags.length) {
      parent.subTags.splice(at, 0, tag);
    } else {
      parent.subTags.push(tag);
    }
    tag.setParent(parent);
  }

  @action setPosition(child: ClientTag, position: number) {
    this.insert(this.getParent(child), child, position);
  }

  /**
   * Returns true if tag is an ancestor of descendant.
   * @param tag possible ancestor node of descendant
   */
  @action isAncestor(descendant: Readonly<ClientTag>, tag: Readonly<ClientTag>): boolean {
    if (descendant === tag) {
      return false;
    }
    let node = this.getParent(descendant);
    while (node.id !== ROOT_TAG_ID) {
      if (node === tag) {
        return true;
      }
      node = this.getParent(node);
    }
    return false;
  }

  @action findByName(name: string): Readonly<ClientTag> | undefined {
    return this._tagList.find((t) => t.name === name);
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

  @action private add(parent: Readonly<ClientTag>, tag: ClientTag) {
    this._tagList.push(tag);
    this.index.set(tag.id, tag);
    tag.setParent(parent);
    parent.subTags.push(tag);
  }

  // The difference between this method and delete is that no computation
  // power is wasted on removing the tag id from the parent subTags list.
  @action private async deleteSubTags(tag: Readonly<ClientTag>) {
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
        this._tagList.remove(subTag as ClientTag);
      }
    });
  }

  @action private remove(tag: ClientTag) {
    // Remove tag id reference from other observable objects
    this.rootStore.uiStore.deselectTag(tag);
    this.getParent(tag).subTags.remove(tag);
    this.index.delete(tag.id);
    this._tagList.remove(tag);
  }
}

export default TagStore;
