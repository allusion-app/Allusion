import { IReactionDisposer, observable, reaction, computed, action } from 'mobx';
import TagStore from '../frontend/stores/TagStore';
import { ID, IResource, ISerializable } from './ID';

export const ROOT_TAG_ID = 'root';

/* A Tag as it is represented in the Database */
export interface ITag extends IResource {
  id: ID;
  name: string;
  description: string;
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
  @observable description: string = '';
  @observable color: string = '';
  readonly subTags = observable<ID>([]);
  // icon, (fileCount?)

  constructor(store: TagStore, id: ID, name: string, dateAdded: Date = new Date()) {
    this.store = store;
    this.id = id;
    this.dateAdded = dateAdded;
    this.name = name;

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
  }

  /** Get actual tag objects based on the IDs retrieved from the backend */
  @computed get parent(): ClientTag {
    return this.store.getParent(this.id);
  }

  @computed get isSelected(): boolean {
    return this.store.isSelected(this.id);
  }

  @computed get viewColor(): string {
    return this.color === 'inherit' ? this.parent.viewColor : this.color;
  }

  @computed get isSearched(): boolean {
    return this.store.isSearched(this.id);
  }

  /** Get actual tag collection objects based on the IDs retrieved from the backend */
  @computed get clientSubTags(): ClientTag[] {
    return Array.from(this.store.getIterFrom(this.subTags));
  }

  /**
   * Returns true if tag is an ancestor of this tag.
   * @param tag possible ancestor node
   */
  isAncestor(tag: ClientTag): boolean {
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

  @action.bound rename(name: string): void {
    this.name = name;
  }

  @action.bound setColor(color: string): void {
    this.color = color;
  }

  @action.bound insertSubTag(tag: ClientTag, at: number): void {
    this.store.insert(this, tag, at);
  }

  /**
   * Used for updating this Entity if changes are made to the backend outside of this session of the application.
   * @param backendTag The file received from the backend
   */
  @action.bound updateFromBackend(backendTag: ITag): ClientTag {
    // make sure our changes aren't sent back to the backend
    this.autoSave = false;

    this.name = backendTag.name;
    this.description = backendTag.description;
    this.color = backendTag.color;
    this.subTags.replace(backendTag.subTags);

    this.autoSave = true;

    return this;
  }

  serialize(): ITag {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      dateAdded: this.dateAdded,
      color: this.color,
      subTags: this.subTags.toJS(),
    };
  }

  getTagsRecursively(): ID[] {
    const ids = [this.id];
    const pushIds = (tags: ClientTag[]) => {
      for (const t of tags) {
        ids.push(t.id);
        pushIds(t.clientSubTags);
      }
    };
    pushIds(this.clientSubTags);
    return ids;
  }

  async delete(): Promise<void> {
    return this.store.delete(this);
  }

  dispose(): void {
    // clean up the observer
    this.saveHandler();
  }
}
