import { IReactionDisposer, observable, reaction, computed, action } from 'mobx';
import TagStore from '../frontend/stores/TagStore';
import { generateId, ID, IResource, ISerializable } from './ID';
import { ClientTagCollection } from './TagCollection';

/* Generic properties of a Tag in our application */
export interface ITag extends IResource {
  id: ID;
  name: string;
  description: string;
  dateAdded: Date;
  color: string;
}

/* A Tag as it is represented in the Database */
export class DbTag implements ITag {
  public id: ID;
  public name: string;
  public description: string;
  public dateAdded: Date;
  public color: string;

  constructor(id: ID, name: string, color?: string, description?: string) {
    this.id = id;
    this.name = name;
    this.description = description || '';
    this.dateAdded = new Date();
    this.color = color || '';
  }
}

/**
 * A Tag as it is stored in the Client.
 * It is stored in a MobX store, which can observe changed made to it and subsequently
 * update the entity in the backend.
 */
export class ClientTag implements ITag, ISerializable<DbTag> {
  store: TagStore;
  saveHandler: IReactionDisposer;
  autoSave = true;

  id: ID;
  dateAdded: Date;
  @observable name: string;
  @observable description: string;
  @observable color: string;
  // icon, color, (fileCount?)

  constructor(store: TagStore, name?: string, id = generateId()) {
    this.store = store;
    this.id = id;
    this.name = name || '';
    this.description = '';
    this.dateAdded = new Date();
    this.color = '';

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
  @computed get parent(): ClientTagCollection {
    return this.store.getParent(this.id);
  }

  @computed get isSelected(): boolean {
    return this.store.isSelected(this.id);
  }

  @computed get viewColor() {
    return this.color || this.parent.viewColor;
  }

  @action.bound rename(name: string) {
    this.name = name;
  }

  @action.bound setColor(color: string) {
    this.color = color;
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
    };
  }

  async delete() {
    return this.store.removeTag(this);
  }

  dispose() {
    // clean up the observer
    this.saveHandler();
  }
}
