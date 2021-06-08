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
  @observable private _parent: string = ROOT_TAG_ID;
  readonly subTags = observable<Readonly<ClientTag>>([]);
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
        this.store.save(tag);
      },
    );

    makeObservable(this);
  }

  @computed get parent(): string {
    return this._parent;
  }

  @computed get viewColor(): string {
    if (this.color === 'inherit') {
      const parent = this.store.get(this.parent);
      return parent !== undefined ? parent.viewColor : '';
    }
    return this.color;
  }

  /** Returns this tag and all of its sub-tags ordered depth-first */
  @action getSubTreeList(): readonly Readonly<ClientTag>[] {
    const subTree: Readonly<ClientTag>[] = [this];
    const pushTags = (tags: Readonly<ClientTag>[]) => {
      for (const t of tags) {
        subTree.push(t);
        pushTags(t.subTags);
      }
    };
    pushTags(this.subTags);
    return subTree;
  }

  /** Returns the tags up the hierarchy from this tag, excluding the root tag */
  @computed get treePath(): readonly Readonly<ClientTag>[] {
    if (this.id === ROOT_TAG_ID) {
      return [];
    }
    const treePath: Readonly<ClientTag>[] = [this];
    let node = this.store.get(this.parent);
    while (node !== undefined && node.id !== ROOT_TAG_ID) {
      treePath.unshift(node);
      node = this.store.get(node.parent);
    }
    return treePath;
  }

  @action setParent(tag: Readonly<ClientTag>): void {
    this._parent = tag.id;
  }

  @action.bound rename(name: string): void {
    this.name = name;
  }

  @action.bound setColor(color: string): void {
    this.color = color;
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

  dispose(): void {
    // clean up the observer
    this.saveHandler();
  }
}
