import { IReactionDisposer, observable, reaction } from "mobx";
import { generateId, ID } from "../../entities/ID";
import { ITag } from "../../entities/Tag";
import TagStore from "../stores/TagStore";

export default class Tag {
  store: TagStore;
  saveHandler: IReactionDisposer;
  autoSave = true;

  id: ID;
  added: Date;
  @observable name: string;
  @observable description: string;
  // icon, color, (fileCount?)

  constructor(store: TagStore, name?: string, id = generateId()) {
    this.store = store;

    this.name = name;
    this.id = id;

    this.saveHandler = reaction(
      // observe all changes to observable fields
      () => this.toBackendTag(),
      (tag) => {
        if (this.autoSave) {
          this.store.backend.saveTag(tag);
        }
      },
    );
  }

  delete() {
    this.store.backend.removeTag(this.toBackendTag());
    this.store.removeTag(this);
  }

  toBackendTag(): ITag {
    return { id: this.id, name: this.name, description: this.description, dateAdded: this.added };
  }

  updateFromBackend(backendTag: ITag): Tag {
    // make sure our changes aren't sent back to the backend
    this.autoSave = false;

    this.id = backendTag.id;
    this.name = backendTag.name;
    this.description = backendTag.description;
    this.added = backendTag.dateAdded;

    this.autoSave = true;

    return this;
  }

  dispose() {
    // clean up the observer
    this.saveHandler();
  }
}
