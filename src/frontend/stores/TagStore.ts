import { action, observable, computed, makeObservable } from 'mobx';

import Backend from 'src/backend/Backend';

import { generateId, ID } from 'src/entities/ID';
import { ClientTag, ITag, ROOT_TAG_ID } from 'src/entities/Tag';
import { ClientTagSearchCriteria } from 'src/entities/SearchCriteria';

import RootStore from './RootStore';
import { ClientFile } from 'src/entities/File';
import { Sequence } from 'common/sequence';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class TagStore {
  private readonly backend: Backend;
  private readonly rootStore: RootStore;

  /** A lookup map to speedup finding entities */
  private readonly tagGraph = observable(new Map<ID, ClientTag>());

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
    if (root === undefined) {
      throw new Error('Root tag not found. This should not happen!');
    }
    return root;
  }

  @computed get tagList(): readonly ClientTag[] {
    return Sequence.from(this.root.subTags)
      .flatMap((tag) => tag.subTreeList())
      .collect();
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
    const tag = new ClientTag(this, id, tagName, new Date(), '', false);
    this.tagGraph.set(tag.id, tag);
    tag.setParent(parent);
    parent.subTags.push(tag);
    await this.backend.createTag(tag.serialize());
    return tag;
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
    for (const t of tag.subTreeList()) {
      t.dispose();
      tagGraph.delete(t.id);
      uiStore.deselectTag(t);
      ids.push(t.id);
    }
    tag.parent.subTags.remove(tag);
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
      for (const t of tag.subTreeList()) {
        t.dispose();
        tagGraph.delete(t.id);
        uiStore.deselectTag(t);
        ids.push(t.id);
      }
      tag.parent.subTags.remove(tag);
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

  save(tag: ITag) {
    this.backend.saveTag(tag);
  }

  @action private createTagGraph(backendTags: ITag[]) {
    // Create tags
    Sequence.from(backendTags)
      .map((t) => new ClientTag(this, t.id, t.name, t.dateAdded, t.color, t.isHidden))
      .forEach((t) => this.tagGraph.set(t.id, t));

    // Set parent and add sub tags
    for (const { id, subTags } of backendTags) {
      for (const subTag of Sequence.from(subTags).filterMap((id) => this.get(id))) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const tag = this.tagGraph.get(id)!;
        subTag.setParent(tag);
        tag.subTags.push(subTag);
      }
    }
    this.root.setParent(this.root);
  }
}

export default TagStore;
