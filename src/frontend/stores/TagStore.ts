import { action, observable, computed, makeObservable, runInAction } from 'mobx';

import Backend from 'src/backend/Backend';

import { generateId, ID } from 'src/entities/ID';
import { ClientTag, ITag, ROOT_TAG_ID } from 'src/entities/Tag';
import { ClientTagSearchCriteria } from 'src/entities/SearchCriteria';

import RootStore from './RootStore';
import { ClientFile } from 'src/entities/File';

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
    if (!root) {
      throw new Error('Root tag not found. This should not happen!');
    }
    return root;
  }

  @computed get tagList(): readonly ClientTag[] {
    const tagList: ClientTag[] = [];
    const pushTags = (tags: ClientTag[]) => {
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
      if (index > -1 && index <= tag.subTags.length) {
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

  @action findByName(name: string): ClientTag | undefined {
    return this.tagList.find((t) => t.name === name);
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
    // not dealing with tags that have subtags
    if (tagToBeRemoved.subTags.length > 0) {
      throw new Error('Merging a tag with sub-tags is currently not supported.');
    }

    this.backend.mergeTags(tagToBeRemoved.id, tagToMergeWith.id).then(() => {
      this.remove(tagToBeRemoved);
      this.rootStore.fileStore.refetch();
    });
  }

  @action.bound refetchFiles() {
    this.rootStore.fileStore.refetch();
  }

  save(tag: ITag) {
    this.backend.saveTag(tag);
  }

  @action private createTagGraph(backendTags: ITag[]) {
    // Create tags
    for (const { id, name, dateAdded, color, isHidden } of backendTags) {
      // Create entity and set properties
      // We have to do this because JavaScript does not allow multiple constructor.
      const tag = new ClientTag(this, id, name, dateAdded, color, isHidden);
      // Add to index
      this.tagGraph.set(tag.id, tag);
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
    this.root.setParent(this.root);
  }

  @action private add(parent: ClientTag, tag: ClientTag) {
    this.tagGraph.set(tag.id, tag);
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
      }
    });
  }

  @action private remove(tag: ClientTag) {
    // Remove tag id reference from other observable objects
    this.rootStore.uiStore.deselectTag(tag);
    tag.parent.subTags.remove(tag);
  }
}

export default TagStore;
