import { observable } from "mobx";
import { ID } from "../../entities/ID";
import FileStore from "../stores/FileStore";

export default class File {
  store: FileStore;

  id: ID = null;
  added: Date = null;

  @observable path = '';
}
