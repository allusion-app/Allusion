import { IReactionDisposer, observable, reaction, computed, action, makeObservable } from 'mobx';

import TagStore from 'src/frontend/stores/TagStore';

import { ID, IResource, ISerializable } from './ID';
import { Sequence } from '../../common/sequence';

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
  private _parent: ClientTag | undefined;
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
    color: string,
    isHidden: boolean,
  ) {
    this.store = store;
    this.id = id;
    this.dateAdded = dateAdded;
    this.name = name;
    this.color = color;
    this.fileCount = 0;
    this.isHidden = isHidden;

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
  get parent(): ClientTag {
    if (this._parent === undefined) {
      console.warn('Tag does not have a parent', this);
      this._parent = this.store.root;
    }
    return this._parent;
  }

  /** Returns this tag and all of its sub-tags ordered depth-first */
  @action subTreeList(): Sequence<ClientTag> {
    const tree = (t: ClientTag): Sequence<ClientTag> =>
      Sequence.once(t).chain(Sequence.from(t.subTags).flatMap(tree));
    return tree(this);
  }

  /** Returns the tree path as an array of the tag's names starting from the root ancestor
   * (excluding root tag) to this tag. */
  @action path(): readonly string[] {
    return traverseAncestry(this)
      .map((tag) => tag.name)
      .collect()
      .reverse();
  }

  get isSelected(): boolean {
    return this.store.isSelected(this);
  }

  @computed get viewColor(): string {
    return this.color === 'inherit' ? this.parent.viewColor : this.color;
  }

  @computed get isSearched(): boolean {
    return this.store.isSearched(this);
  }

  /**
   * Returns true if tag is an ancestor of this tag.
   * @param tag possible ancestor node
   */
  @action isAncestor(tag: ClientTag): boolean {
    return this !== tag && traverseAncestry(this.parent).some((t) => t === tag);
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

  @action.bound insertSubTag(subTag: ClientTag, at: number): void {
    if (this === subTag || this.isAncestor(subTag) || subTag.id === ROOT_TAG_ID) {
      return;
    }
    // Move to different pos in same parent: Reorder tag.subTags and return
    if (this === subTag.parent) {
      if (at > -1 && at <= this.subTags.length) {
        // If moving below current position, take into account removing self affecting the index
        const newIndex = this.subTags.indexOf(subTag) < at ? at - 1 : at;
        this.subTags.remove(subTag);
        this.subTags.splice(newIndex, 0, subTag);
      }
    } else {
      // Insert subTag into tag
      subTag.parent.subTags.remove(subTag);
      if (at > -1 && at < this.subTags.length) {
        this.subTags.splice(at, 0, subTag);
      } else {
        this.subTags.push(subTag);
      }
      subTag.setParent(this);
    }
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

  dispose(): void {
    // clean up the observer
    this.saveHandler();
  }
}

/**
 * Traverse the path from this tag to its root ancestor (excluding root tag).
 */
export const traverseAncestry = action(
  (t: ClientTag): Sequence<ClientTag> =>
    Sequence.once(t)
      .chain(Sequence.once(t.parent).flatMap(traverseAncestry))
      .takeWhile((tag) => tag.id !== ROOT_TAG_ID),
);
