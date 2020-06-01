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
      return this.color;
    }
    return this.color || this.parent.viewColor;
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

  @computed get isEmpty(): boolean {
    return this.tags.length === 0 && this.clientSubCollections.every((subCol) => !subCol.isEmpty);
  }

  @computed get isSelected(): boolean {
    // If this collection is empty, act like it's selected when its parent is selected
    if (this.id !== ROOT_TAG_COLLECTION_ID && this.isEmpty) {
      return this.parent.isSelected;
    }
    // Else check through children recursively
    // Todo: Not sure how costly this is. Seems fine.
    const nonEmptySubCollections = this.clientSubCollections.filter((subCol) => !subCol.isEmpty);
    return (
      (this.tags.length > 0 || nonEmptySubCollections.length > 0) &&
      !this.tags.some((tag) => !this.store.isTagSelected(tag)) &&
      !nonEmptySubCollections.some((col) => !col.isSelected)
    );
  }

  @action.bound addTag(tag: ClientTag | ID) {
    const id = tag instanceof ClientTag ? tag.id : tag;
    if (!this.tags.includes(id)) {
      this.tags.push(id);
    }
  }

  @action.bound addCollection(collection: ID) {
    this.subCollections.push(collection);
  }

  @action.bound rename(name: string) {
    this.name = name;
  }

  @action setColor(color: string) {
    this.color = color;
  }

  @action removeTag(tag: ClientTag | ID) {
    this.tags.remove(tag instanceof ClientTag ? tag.id : tag);
  }

  @action.bound insertCollection(collection: ClientTagCollection, at = 0) {
    collection.parent.subCollections.remove(collection.id);
    this.subCollections.splice(at, 0, collection.id);
  }

  @action.bound insertTag(tag: ClientTag, at = 0) {
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

  async delete() {
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

  dispose() {
    // clean up the observer
    this.saveHandler();
  }
}
