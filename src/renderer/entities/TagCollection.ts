import { IReactionDisposer, observable, reaction, computed, action } from 'mobx';
import { generateId, ID, IIdentifiable, ISerializable } from './ID';
import { ClientTag, ITag } from './Tag';
import TagCollectionStore from '../frontend/stores/TagCollectionStore';

export const ROOT_TAG_COLLECTION_ID = 'hierarchy';

/* Generic properties of a Tag Collection in our application */
export interface ITagCollection extends IIdentifiable {
  id: ID;
  name: string;
  description: string;
  dateAdded: Date;
  subCollections: ID[];
  tags: ID[];
}

/* A Tag Collection as it is represented in the Database */
export class DbTagCollection implements ITagCollection {
  public id: ID;
  public name: string;
  public description: string;
  public dateAdded: Date;
  public subCollections: ID[];
  public tags: ID[];

  constructor(id: ID, name: string, description?: string) {
    this.id = id;
    this.name = name;
    this.description = description || '';
    this.dateAdded = new Date();
    this.subCollections = [];
    this.tags = [];
  }
}

/**
 * A Tag collection as it is stored in the Client.
 */
export class ClientTagCollection implements ITagCollection, ISerializable<DbTagCollection> {
  store: TagCollectionStore;
  saveHandler: IReactionDisposer;
  autoSave = true;

  id: ID;
  dateAdded: Date;
  @observable name: string;
  @observable description: string;
  readonly subCollections = observable<ID>([]);
  readonly tags = observable<ID>([]);

  constructor(store: TagCollectionStore, name?: string, id = generateId()) {
    this.store = store;
    this.id = id;
    this.name = name || '';
    this.description = '';
    this.dateAdded = new Date();

    // observe all changes to observable fields
    this.saveHandler = reaction(
      // We need to explicitly define which values this reaction should react to
      () => this.serialize(),
      // Then update the entity in the database
      (tagCol) => {
        if (this.autoSave) {
          this.store.backend.saveTagCollection(tagCol);
        }
      },
    );
  }

  serialize(): ITagCollection {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      dateAdded: this.dateAdded,
      subCollections: this.subCollections.toJS(),
      tags: this.tags.toJS(),
    };
  }

  /** Get actual tag collection objects based on the IDs retrieved from the backend */
  @computed get clientSubCollections(): ClientTagCollection[] {
    return this.subCollections.map(
      (id) => this.store.rootStore.tagCollectionStore.tagCollectionList.find(
        (t) => t.id === id)) as ClientTagCollection[];
  }

  /** Get actual tag objects based on the IDs retrieved from the backend */
  @computed get clientTags(): ClientTag[] {
    return this.tags.map((id) => this.store.rootStore.tagStore.tagList.find((t) => t.id === id)) as ClientTag[];
  }

  @computed get isSelected(): boolean {
    // Todo: Not sure how costly this is. Seems fine.
    const uiStore = this.store.rootStore.uiStore;
    return (this.tags.length > 0 || this.subCollections.length > 0)
      && !this.tags.some((tag) => !uiStore.tagSelection.includes(tag))
      && !this.clientSubCollections.some((col) => !col.isSelected);
  }

  @action addTag(tag: ClientTag | ID) {
    const id = (tag instanceof ClientTag) ? tag.id : tag;
    if (!this.tags.includes(id)) {
      this.tags.push(id);
    }
  }

  @action removeTag(tag: ClientTag | ID) {
    this.tags.remove((tag instanceof ClientTag) ? tag.id : tag);
  }

  delete() {
    this.store.backend.removeTagCollection(this);
    this.store.removeTagCollection(this);
  }

  /**
   * Recursively checks all subcollections whether it contains a specified collection
   */
  containsSubCollection(queryCol: ITagCollection): boolean {
    return this.subCollections.some((subCol) => subCol.includes(queryCol.id))
      || this.clientSubCollections.some((subCol) => subCol.containsSubCollection(queryCol));
  }
  /**
   * Recursively checks all subcollections whether it contains a specified collection
   */
  containsTag(queryTag: ITag): boolean {
    return this.tags.includes(queryTag.id)
      || this.clientSubCollections.some((subCol) => subCol.containsTag(queryTag));
  }

  /**
   * Used for updating this Entity if changes are made to the backend outside of this session of the application.
   * @param backendTagCollection The file received from the backend
   */
  updateFromBackend(backendTagCollection: ITagCollection): ClientTagCollection {
    // make sure our changes aren't sent back to the backend
    this.autoSave = false;

    this.id = backendTagCollection.id;
    this.name = backendTagCollection.name;
    this.description = backendTagCollection.description;
    this.dateAdded = backendTagCollection.dateAdded;
    this.subCollections.push(...backendTagCollection.subCollections);
    this.tags.push(...backendTagCollection.tags);

    this.autoSave = true;

    return this;
  }

  dispose() {
    // clean up the observer
    this.saveHandler();
  }
}
