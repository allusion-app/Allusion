import { action, observable, computed, makeObservable, flow } from 'mobx';
import { CancellablePromise } from 'mobx/dist/internal';

import Backend from 'src/backend/Backend';
import { IFile } from 'src/entities/File';

import { generateId, ID } from 'src/entities/ID';
import { ClientTagSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientTag, ITag, ROOT_TAG_ID } from 'src/entities/Tag';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class TagStore {
  private readonly backend: Backend;

  private readonly tagGraph = observable(new Map<ID, ClientTag>());
  readonly selection = observable(new Set<Readonly<ClientTag>>());

  constructor(backend: Backend) {
    this.backend = backend;
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.tagGraph.get(ROOT_TAG_ID)!;
  }

  @computed get tagList(): readonly Readonly<ClientTag>[] {
    const tagList: Readonly<ClientTag>[] = [];
    const pushTags = (tags: Readonly<ClientTag>[]) => {
      for (const t of tags) {
        tagList.push(t);
        pushTags(t.subTags);
      }
    };
    if (this.tagGraph.size > 0) {
      pushTags(this.root.subTags);
    }
    return tagList;
  }

  @computed get count(): number {
    return this.tagList.length;
  }

  @computed get isEmpty(): boolean {
    return this.count === 0;
  }

  @action get(tag: ID): ClientTag | undefined {
    return this.tagGraph.get(tag);
  }

  @action getParent(tag: Readonly<ClientTag>): Readonly<ClientTag> {
    return this.get(tag.parent) ?? this.root;
  }

  create = flow(function* (this: TagStore, tagName: string, parent?: Readonly<ClientTag>) {
    const tag = new ClientTag(this, generateId(), tagName, new Date());
    yield this.backend.createTag(tag.serialize());
    this.tagGraph.set(tag.id, tag);
    const p = parent ?? this.root;
    tag.setParent(p);
    p.subTags.push(tag);
    return tag;
  });

  @action async delete(tags: readonly Readonly<ClientTag>[]) {
    await this.backend.removeTags(tags.map((t) => t.id));
    for (const tag of tags) {
      tag.dispose();
      await this.deleteSubTags(tag);
      this.remove(tag);
    }
  }

  @action async merge(tagToBeRemoved: ClientTag, tagToMergeWith: Readonly<ClientTag>) {
    if (tagToBeRemoved.subTags.length > 0) return; // not dealing with tags that have subtags
    await this.backend.mergeTags(tagToBeRemoved.id, tagToMergeWith.id);
    this.remove(tagToBeRemoved);
  }

  save(tag: ITag) {
    this.backend.saveTag(tag);
  }

  @action insert(parent: Readonly<ClientTag>, tag: Readonly<ClientTag>, at: number): void {
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

  @action append(tag: ClientTag) {
    this.insert(this.root, tag, this.count);
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
    return this.tagList.find((t) => t.name === name);
  }

  @action selectionToCriterias(): ClientTagSearchCriteria<IFile>[] {
    const criterias = Array.from(
      this.selection,
      (tag) => new ClientTagSearchCriteria(this, 'tags', tag.id),
    );
    this.deselectAll();
    return criterias;
  }

  @action.bound isSelected(tag: Readonly<ClientTag>): boolean {
    return this.selection.has(tag);
  }

  @action select(tag: Readonly<ClientTag>) {
    this.deselectAll();
    this.selection.add(tag);
  }

  @action deselect(tag: Readonly<ClientTag>) {
    this.selection.delete(tag);
  }

  @action toggleSelection(tag: Readonly<ClientTag>) {
    if (!this.selection.delete(tag)) {
      this.selection.add(tag);
    }
  }

  /**Selects a range (end inclusive) of tags, where indices correspond to the flattened tag tree. */
  @action selectRange(start: number, end: number, additive?: boolean) {
    const tagTreeList = this.tagList;
    if (!additive) {
      this.selection.replace(tagTreeList.slice(start, end + 1));
      return;
    }
    for (let i = start; i <= end; i++) {
      this.selection.add(tagTreeList[i]);
    }
  }

  @action.bound selectAll() {
    this.selection.replace(this.tagList);
  }

  @action.bound deselectAll() {
    this.selection.clear();
  }

  @action colorSelection(activeElementId: ID, color: string) {
    const ctx = this.getActiveTags(activeElementId);
    for (const tag of ctx) {
      tag.setColor(color);
      tag.subTags.forEach((tag) => tag.setColor(color));
    }
  }

  /**
   * Returns the tags and tag collections that are in the context of an action,
   * e.g. all selected items when choosing to delete an item that is selected,
   * or only a single item when moving a single tag that is not selected.
   * @returns The collections and tags in the context. Tags belonging to collections in the context are not included,
   * but can be easily found by getting the tags from each collection.
   */
  @action getActiveTags(activeItemId: ID) {
    // If no id was given, the context is the tag selection. Else, it might be a single tag/collection
    let isContextTheSelection = false;

    const contextTags: ClientTag[] = [];

    const selectedTag = this.get(activeItemId);
    if (selectedTag) {
      if (this.isSelected(selectedTag)) {
        isContextTheSelection = true;
      } else {
        contextTags.push(selectedTag);
      }
    }

    // If no id is given or when the selected tag or collection is selected, the context is the whole selection
    if (isContextTheSelection) {
      contextTags.push(...(Array.from(this.selection) as ClientTag[]));
    }

    return contextTags;
  }

  @action moveSelection(id: ID, pos = 0) {
    const target = this.get(id);
    if (target === undefined) {
      throw new Error('Invalid target to move to');
    }

    // Move tags and collections
    for (const tag of this.selection) {
      this.insert(target, tag, pos);
    }
  }

  @action private createTagGraph(backendTags: ITag[]) {
    // Create tags
    for (const { id, name, dateAdded, color } of backendTags) {
      this.tagGraph.set(id, new ClientTag(this, id, name, dateAdded, color));
    }

    // Set parent and add sub tags
    for (const { id, subTags } of backendTags) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tag = this.tagGraph.get(id)!;
      for (const id of subTags) {
        const subTag = this.get(id);
        if (subTag !== undefined) {
          subTag.setParent(tag);
          tag.subTags.push(subTag);
        }
      }
    }

    if (this.tagGraph.get(ROOT_TAG_ID) === undefined) {
      throw new Error('Root tag not found. This should not happen!');
    }
  }

  // The difference between this method and delete is that no computation
  // power is wasted on removing the tag id from the parent subTags list.
  private deleteSubTags: (tag: Readonly<ClientTag>) => CancellablePromise<void> = flow(function* (
    this: TagStore,
    tag: Readonly<ClientTag>,
  ) {
    if (tag.subTags.length > 0) {
      const ids = tag.subTags.map((subTag) => subTag.id);
      yield this.backend.removeTags(ids);
    }
    for (const subTag of tag.subTags) {
      subTag.dispose();
      this.deleteSubTags(subTag);
      this.deselect(subTag);
      this.tagGraph.delete(subTag.id);
    }
  });

  @action private remove(tag: Readonly<ClientTag>) {
    // Remove tag id reference from other observable objects
    this.deselect(tag);
    this.getParent(tag).subTags.remove(tag);
    this.tagGraph.delete(tag.id);
  }
}

export default TagStore;
