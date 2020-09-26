import { IReactionDisposer, observable, reaction, computed, action } from 'mobx';
import TagStore from '../frontend/stores/TagStore';
import { generateId, ID, IResource, ISerializable } from './ID';

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
  store: TagStore;
  saveHandler: IReactionDisposer;
  autoSave = true;

  id: ID;
  dateAdded: Date = new Date();
  @observable name: string;
  @observable description: string = '';
  @observable color: string = '';
  readonly subTags = observable<ID>([]);
  // icon, (fileCount?)

  constructor(store: TagStore, name: string = '', id = generateId()) {
    this.store = store;
    this.id = id;
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
    return this.subTags
      .map((id) => this.store.get(id))
      .filter((c) => c !== undefined) as ClientTag[];
  }

  @action.bound rename(name: string): void {
    this.name = name;
  }

  @action.bound setColor(color: string): void {
    this.color = color;
  }

  @action.bound addTag(tag: ClientTag | ID): void {
    const id = tag instanceof ClientTag ? tag.id : tag;
    if (!this.subTags.includes(id)) {
      this.subTags.push(id);
    }
  }

  @action.bound insertSubTag(tag: ClientTag, at = 0): void {
    if (tag.parent === this && this.subTags.findIndex((t) => t === tag.id) < at) {
      at -= 1;
    }
    tag.parent.subTags.remove(tag.id);
    this.subTags.splice(at, 0, tag.id);
  }

  @action removeSubTag(tag: ID): void {
    this.subTags.remove(tag);
  }

  /**
   * Used for updating this Entity if changes are made to the backend outside of this session of the application.
   * @param backendTag The file received from the backend
   */
  @action.bound updateFromBackend(backendTag: ITag): ClientTag {
    // make sure our changes aren't sent back to the backend
    this.autoSave = false;

    this.id = backendTag.id;
    this.name = backendTag.name;
    this.description = backendTag.description;
    this.dateAdded = backendTag.dateAdded;
    this.color = backendTag.color;
    this.subTags.push(...backendTag.subTags);

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
    return [this.id, ...this.clientSubTags.flatMap((c) => c.getTagsRecursively())];
  }

  async delete(): Promise<void> {
    return this.store.removeTag(this);
  }

  dispose(): void {
    // clean up the observer
    this.saveHandler();
  }
}
