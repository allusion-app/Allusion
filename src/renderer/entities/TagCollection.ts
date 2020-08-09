import { IReactionDisposer, observable, reaction, computed, action } from 'mobx';
import { generateId, ID, IResource, ISerializable } from './ID';
import { ClientTag } from './Tag';
import TagCollectionStore from '../frontend/stores/TagCollectionStore';

export const ROOT_TAG_COLLECTION_ID = 'hierarchy';

/* A Tag Collection as it is represented in the Database */
export interface ITagCollection extends IResource {
  id: ID;
  name: string;
  description: string;
  dateAdded: Date;
  subCollections: ID[];
  tags: ID[];
  color: string;
}

/**
 * A Tag collection as it is stored in the Client.
 */
export class ClientTagCollection implements ISerializable<ITagCollection> {
  store: TagCollectionStore;
  saveHandler: IReactionDisposer;
  autoSave = true;

  id: ID;
  dateAdded: Date = new Date();
  @observable name: string;
  @observable description: string = '';
  readonly subCollections = observable<ID>([]);
  readonly tags = observable<ID>([]);

  @observable color: string = '';

  constructor(store: TagCollectionStore, name: string = '', id = generateId()) {
    this.store = store;
    this.id = id;
    this.name = name;

    // observe all changes to observable fields
    this.saveHandler = reaction(
      // We need to explicitly define which values this reaction should react to
      () => this.serialize(),
      // Then update the entity in the database
      (tagCol) => {
        if (this.autoSave) {
          this.store.save(tagCol);
        }
      },
    );
  }

  @computed get viewColor(): string {
    if (this.id === ROOT_TAG_COLLECTION_ID) {
      return '';
    }
    return this.color === 'inherit' ? this.parent.viewColor : this.color;
  }

  /** Get actual tag objects based on the IDs retrieved from the backend */
  @computed get parent(): ClientTagCollection {
    const parent = this.store.tagCollectionList.find((col) => col.subCollections.includes(this.id));
    if (!parent) {
      console.warn('Collection does not have a parent', this);
    }
    return parent || this.store.getRootCollection();
  }

  /** Get actual tag collection objects based on the IDs retrieved from the backend */
  @computed get clientSubCollections(): ClientTagCollection[] {
    return this.subCollections
      .map((id) => this.store.get(id))
      .filter((c) => c !== undefined) as ClientTagCollection[];
  }

  /** Get actual tag objects based on the IDs retrieved from the backend */
  @computed get clientTags(): ClientTag[] {
    return this.tags
      .map((id) => this.store.getTag(id))
      .filter((t) => t !== undefined) as ClientTag[];
  }

  /**
   * Returns whether this collection has any content.
   *
   * A collection is empty if it has no tags and all its descendants also do
   * not have tags.
   */
  @computed get hasContent(): boolean {
    return this.tags.length > 0 || this.clientSubCollections.some((subCol) => subCol.hasContent);
  }

  @computed get isSelected(): boolean {
    // If this collection is empty, act like it's selected when its parent is selected
    if (this.id !== ROOT_TAG_COLLECTION_ID && !this.hasContent) {
      return this.parent.isSelected;
    }
    // Else check through children recursively
    // Todo: Not sure how costly this is. Seems fine.
    const nonEmptySubCollections = this.clientSubCollections.filter((subCol) => subCol.hasContent);
    return (
      (this.tags.length > 0 || nonEmptySubCollections.length > 0) &&
      !this.tags.some((tag) => !this.store.isTagSelected(tag)) &&
      !nonEmptySubCollections.some((col) => !col.isSelected)
    );
  }

  @computed get isSearched(): boolean {
    return this.store.isSearched(this.id);
  }

  @action.bound addTag(tag: ClientTag | ID): void {
    const id = tag instanceof ClientTag ? tag.id : tag;
    if (!this.tags.includes(id)) {
      this.tags.push(id);
    }
  }

  @action.bound addCollection(collection: ID): void {
    this.subCollections.push(collection);
  }

  @action.bound rename(name: string): void {
    this.name = name;
  }

  @action setColor(color: string): void {
    this.color = color;
  }

  @action removeTag(tag: ID): void {
    this.tags.remove(tag);
  }

  @action.bound insertCollection(col: ClientTagCollection, at = 0): void {
    if (col.parent === this && this.subCollections.findIndex((c) => c === col.id) < at) {
      at -= 1;
    }
    col.parent.subCollections.remove(col.id);
    this.subCollections.splice(at, 0, col.id);
  }

  @action.bound insertTag(tag: ClientTag, at = 0): void {
    if (tag.parent === this && this.tags.findIndex((t) => t === tag.id) < at) {
      at -= 1;
    }
    tag.parent.tags.remove(tag.id);
    this.tags.splice(at, 0, tag.id);
  }

  /**
   * Used for updating this Entity if changes are made to the backend outside of this session of the application.
   * @param backendTagCollection The file received from the backend
   */
  @action.bound updateFromBackend(backendTagCollection: ITagCollection): ClientTagCollection {
    // make sure our changes aren't sent back to the backend
    this.autoSave = false;

    this.id = backendTagCollection.id;
    this.name = backendTagCollection.name;
    this.description = backendTagCollection.description;
    this.dateAdded = backendTagCollection.dateAdded;
    this.subCollections.push(...backendTagCollection.subCollections);
    this.tags.push(...backendTagCollection.tags);
    this.color = backendTagCollection.color;

    this.autoSave = true;

    return this;
  }

  serialize(): ITagCollection {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      dateAdded: this.dateAdded,
      subCollections: this.subCollections.toJS(),
      tags: this.tags.toJS(),
      color: this.color,
    };
  }

  getTagsRecursively(): ID[] {
    return [...this.tags, ...this.clientSubCollections.flatMap((c) => c.getTagsRecursively())];
  }

  async delete(): Promise<void> {
    this.store.removeTagCollection(this);
  }

  /**
   * Recursively checks all subcollections whether it contains a specified collection
   */
  containsSubCollection(queryCol: ID): boolean {
    return (
      this.subCollections.some((subCol) => subCol.includes(queryCol)) ||
      this.clientSubCollections.some((subCol) => subCol.containsSubCollection(queryCol))
    );
  }

  /**
   * Recursively checks all subcollections whether it contains a specified collection
   */
  containsTag(queryTag: ID): boolean {
    return (
      this.tags.includes(queryTag) ||
      this.clientSubCollections.some((subCol) => subCol.containsTag(queryTag))
    );
  }

  dispose(): void {
    // clean up the observer
    this.saveHandler();
  }
}
