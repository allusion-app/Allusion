import { IReactionDisposer, observable, reaction } from "mobx";
import TagStore from "../frontend/stores/TagStore";
import { generateId, ID, IIdentifiable, ISerializable } from "./ID";

/* Generic properties of a Tag in our application */
export interface ITag extends IIdentifiable {
  id: ID;
  name: string;
  description?: string;
  dateAdded: Date;
}

/* A Tag as it is represented in the Database */
export class DbTag implements ITag {
  public id: ID;
  public name: string;
  public description?: string;
  public dateAdded: Date;

  constructor(id: ID, name: string, description?: string) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.dateAdded = new Date();
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
  // icon, color, (fileCount?)

  constructor(store: TagStore, name?: string, id = generateId()) {
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
          this.store.backend.saveTag(tag);
        }
      },
    );
  }

  serialize(): ITag {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      dateAdded: this.dateAdded,
    };
  }

  delete() {
    this.store.backend.removeTag(this);
    this.store.removeTag(this);
  }

  /**
   * Used for updating this Entity if changes are made to the backend outside of this session of the application.
   * @param backendTag The file received from the backend
   */
  updateFromBackend(backendTag: ITag): ClientTag {
    // make sure our changes aren't sent back to the backend
    this.autoSave = false;

    this.id = backendTag.id;
    this.name = backendTag.name;
    this.description = backendTag.description;
    this.dateAdded = backendTag.dateAdded;

    this.autoSave = true;

    return this;
  }

  dispose() {
    // clean up the observer
    this.saveHandler();
  }
}
