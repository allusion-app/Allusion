import { IReactionDisposer, observable, reaction, computed, action, makeObservable } from 'mobx';
import TagStore from '../frontend/stores/TagStore';
import { ID, IResource, ISerializable } from './ID';

export const ROOT_TAG_ID = 'root';

/* A Tag as it is represented in the Database */
export interface ITag extends IResource {
  id: ID;
  name: string;
  dateAdded: Date;
  color: string;
  subTags: ID[];
}

/**
 * A Tag as it is stored in the Client.
 * It is stored in a MobX store, which can observe changed made to it and subsequently
 * update the entity in the backend.
 */
export class ClientTag implements ISerializable<ITag> {
  private store: TagStore;
  private saveHandler: IReactionDisposer;
  private autoSave = true;

  readonly id: ID;
  readonly dateAdded: Date;
  @observable name: string;
  @observable color: string;
  @observable private _parent: ClientTag | undefined;
  readonly subTags = observable<ClientTag>([]);
  // icon, (fileCount?)

  constructor(store: TagStore, id: ID, name: string, dateAdded: Date, color: string = '') {
    this.store = store;
    this.id = id;
    this.dateAdded = dateAdded;
    this.name = name;
    this.color = color;

    // observe all changes to observable fields
    this.saveHandler = reaction(
      // We need to explicitly define which values this reaction should react to
      () => this.serialize(),
      // Then update the entity in the database
      (tag) => {
        if (this.autoSave) {
          this.store.save(tag);
        }
      },
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

  serialize(): ITag {
    return {
      id: this.id,
      name: this.name,
      dateAdded: this.dateAdded,
      color: this.color,
      subTags: this.subTags.map((subTag) => subTag.id),
    };
  }

  toList(): ClientTag[] {
    const ids: ClientTag[] = [this];
    const pushIds = (tags: ClientTag[]) => {
      for (const t of tags) {
        ids.push(t);
        pushIds(t.subTags);
      }
    };
    pushIds(this.subTags);
    return ids;
  }

  async delete(): Promise<void> {
    return this.store.delete(this);
  }

  /** Update observable properties without updating the database */
  @action update(update: (tag: ClientTag) => void): void {
    this.autoSave = false;
    update(this);
    this.autoSave = true;
  }

  dispose(): void {
    this.autoSave = false;
    // clean up the observer
    this.saveHandler();
  }
}
