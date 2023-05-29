import { action, computed, makeObservable, observable } from 'mobx';
import { PositionSource } from 'position-strings';

import { DataStorage } from '../../api/data-storage';
import { ID, generateId } from '../../api/id';
import { ROOT_TAG_ID, TagDTO } from '../../api/tag';
import { ClientFile } from '../entities/File';
import { ClientTagSearchCriteria } from '../entities/SearchCriteria';
import { ClientTag } from '../entities/Tag';
import RootStore from './RootStore';
import { move } from './move';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class TagStore {
  private readonly backend: DataStorage;
  private readonly rootStore: RootStore;

  // Right now the id is only set for better debugging. It should be `t${actorId}` if collaborative editing is ever
  // implemented where actorId is a unique id between collaborators (which includes multiple devices of one user).
  readonly #positions = new PositionSource({ ID: 't' });
  private readonly tagGraph = observable(new Map<ID, ClientTag>());

  constructor(backend: DataStorage, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    makeObservable(this);
  }

  @action init(fetchedTags: TagDTO[]): void {
    // Sort tags beforehand, so when sub tags are inserted, they do not need to be sorted again.
    fetchedTags.sort((a, b) => (a.position < b.position ? -1 : Number(a.position > b.position)));

    // Create tags
    for (const { id, name, dateAdded, color, isHidden, position } of fetchedTags) {
      // Create entity and set properties
      // We have to do this because JavaScript does not allow multiple constructor.
      const tag = new ClientTag(this, id, name, dateAdded, color, isHidden, position);
      // Add to index
      this.tagGraph.set(tag.id, tag);
    }

    // Set parent and add sub tags
    for (const { id, parent } of fetchedTags) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tag = this.tagGraph.get(id)!;
      const parentTag = this.tagGraph.get(parent);

      if (parentTag !== undefined) {
        tag.setParent(parentTag);
        // Sub tags were already sorted by position at the beginning.
        parentTag.subTags.push(tag);
      }
    }
  }

  @action.bound initializeFileCounts(files: ClientFile[]): void {
    for (const file of files) {
      for (const fileTag of file.tags) {
        fileTag.incrementFileCount();
      }
    }
  }

  @action get(tag: ID): ClientTag | undefined {
    return this.tagGraph.get(tag);
  }

  @computed get root(): ClientTag {
    const root = this.tagGraph.get(ROOT_TAG_ID);
    if (!root) {
      throw new Error('Root tag not found. This should not happen!');
    }
    return root;
  }

  @computed get tagList(): readonly ClientTag[] {
    function* list(tags: ClientTag[]): Generator<ClientTag> {
      for (const tag of tags) {
        yield* tag.getSubTree();
      }
    }
    return Array.from(list(this.root.subTags));
  }

  @computed get count(): number {
    return this.tagList.length;
  }

  @computed get isEmpty(): boolean {
    return this.count === 0;
  }

  @action findFlatTagListIndex(target: ClientTag): number | undefined {
    const index = this.tagList.indexOf(target);
    return index > -1 ? index : undefined;
  }

  @action isSelected(tag: ClientTag): boolean {
    return this.rootStore.uiStore.tagSelection.has(tag);
  }

  isSearched(tag: ClientTag): boolean {
    return this.rootStore.uiStore.searchCriteriaList.some(
      (c) => c instanceof ClientTagSearchCriteria && c.value === tag.id,
    );
  }

  @action.bound async create(parent: ClientTag, tagName: string): Promise<ClientTag> {
    const id = generateId();
    const tag = new ClientTag(
      this,
      id,
      tagName,
      new Date(),
      '',
      false,
      this.#positions.createBetween(parent.subTags.at(-1)?.position),
    );
    this.tagGraph.set(tag.id, tag);
    tag.setParent(parent);
    parent.subTags.push(tag);
    await this.backend.createTag(tag.serialize());
    return tag;
  }

  @action move(parent: ClientTag, child: ClientTag, at: number): boolean {
    if (parent === child || parent.isAncestor(child) || child.id === ROOT_TAG_ID) {
      return false;
    }

    const isChild = child.parent === parent;
    let currentIndex = 0;

    if (isChild) {
      currentIndex = parent.subTags.indexOf(child);
    } else {
      child.parent.subTags.remove(child);
      child.setParent(parent);
      // FIXME: Sub tags are ordered by position. A binary search could be better.
      const index = parent.subTags.findIndex((subTag) => subTag.position > child.position);
      currentIndex = index === -1 ? parent.subTags.length : index;
      parent.subTags.splice(currentIndex, 0, child);
    }

    return move(parent.subTags, this.#positions, currentIndex, at) || !isChild;
  }

  @action findByName(name: string): ClientTag | undefined {
    return this.tagList.find((t) => t.name === name);
  }

  @action.bound async delete(tag: ClientTag): Promise<void> {
    const {
      rootStore: { uiStore, fileStore },
      tagGraph,
    } = this;
    const ids: ID[] = [];
    tag.parent.subTags.remove(tag);
    for (const t of tag.getSubTree()) {
      t.dispose();
      tagGraph.delete(t.id);
      uiStore.deselectTag(t);
      ids.push(t.id);
    }
    await this.backend.removeTags(ids);
    fileStore.refetch();
  }

  @action.bound async deleteTags(tags: ClientTag[]): Promise<void> {
    const {
      rootStore: { uiStore, fileStore },
      tagGraph,
    } = this;
    const ids: ID[] = [];
    const remove = action((tag: ClientTag): ID[] => {
      tag.parent.subTags.remove(tag);
      for (const t of tag.getSubTree()) {
        t.dispose();
        tagGraph.delete(t.id);
        uiStore.deselectTag(t);
        ids.push(t.id);
      }
      return ids.splice(0, ids.length);
    });
    for (const tag of tags) {
      await this.backend.removeTags(remove(tag));
    }
    fileStore.refetch();
  }

  @action.bound async merge(tagToBeRemoved: ClientTag, tagToMergeWith: ClientTag): Promise<void> {
    // not dealing with tags that have subtags
    if (tagToBeRemoved.subTags.length > 0) {
      throw new Error('Merging a tag with sub-tags is currently not supported.');
    }
    this.rootStore.uiStore.deselectTag(tagToBeRemoved);
    this.tagGraph.delete(tagToBeRemoved.id);
    tagToBeRemoved.parent.subTags.remove(tagToBeRemoved);
    await this.backend.mergeTags(tagToBeRemoved.id, tagToMergeWith.id);
    this.rootStore.fileStore.refetch();
  }

  @action.bound refetchFiles(): void {
    this.rootStore.fileStore.refetch();
  }

  save(tag: TagDTO): void {
    this.backend.saveTag(tag);
  }
}

export default TagStore;
