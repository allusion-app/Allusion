import { action, observable, computed, makeObservable } from 'mobx';

import { IDataStorage } from 'src/api/data-storage';

import { generateId, ID } from 'src/api/id';
import { ClientTag } from 'src/entities/Tag';
import { TagDTO, ROOT_TAG_ID } from 'src/api/tag';
import { ClientTagSearchCriteria } from 'src/entities/SearchCriteria';

import RootStore from './RootStore';
import { ClientFile } from 'src/entities/File';
import { PositionSource } from 'position-strings';
import { move } from './move';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class TagStore {
  private readonly backend: IDataStorage;
  private readonly rootStore: RootStore;

  readonly #positions = new PositionSource({ ID: 't' });
  private readonly tagGraph = observable(new Map<ID, ClientTag>());

  constructor(backend: IDataStorage, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    makeObservable(this);
  }

  @action init(backendTags: TagDTO[]): void {
    // Create tags
    for (const { id, name, dateAdded, color, isHidden, position } of backendTags) {
      // Create entity and set properties
      // We have to do this because JavaScript does not allow multiple constructor.
      const tag = new ClientTag(this, id, name, dateAdded, color, isHidden, position);
      // Add to index
      this.tagGraph.set(tag.id, tag);
    }

    // Set parent and add sub tags
    for (const { id, parent } of backendTags) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tag = this.tagGraph.get(id)!;
      const parentTag = this.tagGraph.get(parent);

      if (parentTag !== undefined) {
        tag.setParent(parentTag);
        // FIXME: Sub tags are ordered by position. A branchless binary search would probably be better.
        const index = parentTag.subTags.findIndex((subTag) => subTag.position > tag.position);
        parentTag.subTags.splice(index === -1 ? parentTag.subTags.length : index, 0, tag);
      }
    }

    this.root.setParent(this.root);
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

  @computed get root() {
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

  @action.bound async create(parent: ClientTag, tagName: string) {
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
      // FIXME: Sub tags are ordered by position. A branchless binary search would probably be better.
      const index = parent.subTags.findIndex((subTag) => subTag.position > child.position);
      currentIndex = index === -1 ? parent.subTags.length : index;
      parent.subTags.splice(currentIndex, 0, child);
    }

    return move(parent.subTags, this.#positions, currentIndex, at) || !isChild;
  }

  @action findByName(name: string): ClientTag | undefined {
    return this.tagList.find((t) => t.name === name);
  }

  @action.bound async delete(tag: ClientTag) {
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

  @action.bound async deleteTags(tags: ClientTag[]) {
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

  @action.bound async merge(tagToBeRemoved: ClientTag, tagToMergeWith: ClientTag) {
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

  @action.bound refetchFiles() {
    this.rootStore.fileStore.refetch();
  }

  save(tag: TagDTO) {
    this.backend.saveTag(tag);
  }
}

export default TagStore;
