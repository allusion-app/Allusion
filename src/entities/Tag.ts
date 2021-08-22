import { IReactionDisposer, observable, reaction, computed, action, makeObservable } from 'mobx';

import TagStore from 'src/frontend/stores/TagStore';

import { ID, IResource, ISerializable } from './ID';

export const ROOT_TAG_ID = 'root';

/* A Tag as it is represented in the Database */
export interface ITag extends IResource {
  id: ID;
  name: string;
  dateAdded: Date;
  color: string;
  subTags: ID[];
  /** Whether any files with this tag should be hidden */
  isHidden: boolean;
}

/**
 * A Tag as it is stored in the Client.
 * It is stored in a MobX store, which can observe changed made to it and subsequently
 * update the entity in the backend.
 */
export class ClientTag implements ISerializable<ITag> {
  private store: TagStore;
  private saveHandler: IReactionDisposer;

  readonly id: ID;
  readonly dateAdded: Date;
  @observable name: string;
  @observable color: string;
  @observable isHidden: boolean;
  @observable private _parent: ClientTag | undefined;
  readonly subTags = observable<ClientTag>([]);
  // icon, (fileCount?)

  /** The amount of files that has this tag assigned to it
   * TODO: would be nice to have the amount of files assigned to any of this tag's subtags too,
   * but we can't simply sum them, since there might be duplicates.
   * We'd need a Set of file-ids on every tag, and maintain them when a tag's parent changes.
   */
  @observable fileCount: number;

  constructor(
    store: TagStore,
    id: ID,
    name: string,
    dateAdded: Date,
    color: string = '',
    isHidden?: boolean,
  ) {
    this.store = store;
    this.id = id;
    this.dateAdded = dateAdded;
    this.name = name;
    this.color = color;
    this.fileCount = 0;
    this.isHidden = isHidden || false;

    // observe all changes to observable fields
    this.saveHandler = reaction(
      // We need to explicitly define which values this reaction should react to
      () => this.serialize(),
      // Then update the entity in the database
      (tag) => {
        this.store.save(tag);
      },
      { delay: 500 },
    );

    makeObservable(this);
  }

  /** Get actual tag objects based on the IDs retrieved from the backend */
  @computed get parent(): ClientTag {
    if (this._parent === undefined) {
      console.warn('Tag does not have a parent', this);
      return this.store.root;
    }
    return this._parent;
  }

  /** Returns this tag and all of its sub-tags ordered depth-first */
  @action getSubTreeList(): readonly ClientTag[] {
    const subTree: ClientTag[] = [this];
    const pushTags = (tags: ClientTag[]) => {
      for (const t of tags) {
        subTree.push(t);
        pushTags(t.subTags);
      }
    };
    pushTags(this.subTags);
    return subTree;
  }

  /** Returns the tags up the hierarchy from this tag, excluding the root tag */
  @computed get treePath(): ClientTag[] {
    if (this.id === ROOT_TAG_ID) {
      return [];
    }
    const treePath: ClientTag[] = [this];
    let node = this.parent;
    while (node.id !== ROOT_TAG_ID) {
      treePath.unshift(node);
      node = node.parent;
    }
    return treePath;
  }

  get isSelected(): boolean {
    return this.store.isSelected(this);
  }

  @computed get viewColor(): string {
    return this.color === 'inherit' ? this.parent.viewColor : this.color;
  }

  get isSearched(): boolean {
    return this.store.isSearched(this.id);
  }

  /**
   * Returns true if tag is an ancestor of this tag.
   * @param tag possible ancestor node
   */
  @action isAncestor(tag: ClientTag): boolean {
    if (this === tag) {
      return false;
    }
    let node = this.parent;
    while (node.id !== ROOT_TAG_ID) {
      if (node === tag) {
        return true;
      }
      node = node.parent;
    }
    return false;
  }

  @action setParent(parent: ClientTag): void {
    this._parent = parent;
  }

  @action.bound rename(name: string): void {
    this.name = name;
  }

  @action.bound setColor(color: string): void {
    this.color = color;
  }

  @action.bound insertSubTag(tag: ClientTag, at: number): void {
    this.store.insert(this, tag, at);
  }

  @action.bound incrementFileCount(amount = 1): void {
    this.fileCount += amount;
  }

  @action.bound decrementFileCount(amount = 1): void {
    this.fileCount -= amount;
  }

  @action.bound toggleHidden(): void {
    this.isHidden = !this.isHidden;
    this.store.refetchFiles();
  }

  serialize(): ITag {
    return {
      id: this.id,
      name: this.name,
      dateAdded: this.dateAdded,
      color: this.color,
      subTags: this.subTags.map((subTag) => subTag.id),
      isHidden: this.isHidden,
    };
  }

  async delete(): Promise<void> {
    return this.store.delete(this);
  }

  dispose(): void {
    // clean up the observer
    this.saveHandler();
  }
}
