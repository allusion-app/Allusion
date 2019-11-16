import { action, IObservableArray, observable } from 'mobx';
import Backend from '../../backend/Backend';
import RootStore from './RootStore';
import { ID } from '../../entities/ID';
import { ClientFile } from '../../entities/File';


interface IVector2 {
  x: number;
  y: number;
}

export interface ISceneElement {
  imageId: ID;
  position: IVector2;
  scale: number;
  // anchor?
  // cropStart: IVector2;
  // cropEnd: IVector2;
  // cropped: boolean;
}

export class ClientSceneElement implements ISceneElement {
  store: CanvasStore;
  
  @observable imageId: ID;
  @observable position: IVector2;// = { x: 0, y: 0 };
  @observable scale: number;
  clientFile: ClientFile;

  constructor(
    store: CanvasStore,
    imageId: ID,
    position: IVector2,
    scale: number,
    clientFile: ClientFile,
  ) {
    this.store = store;
    this.imageId = imageId;
    this.position = position;
    this.scale = scale;
    this.clientFile = clientFile;
  }

  @action.bound setPosition(x: number, y: number) {
    this.position.x = x;
    this.position.y = y;
    this.store.persist();
  }
  
  @action.bound setScale(scale: number) {
    this.scale = scale;
    this.store.persist();
  }
}

interface IScene {
  name: string;
  createdDate: Date;
  modifiedDate: Date;
  elements: ISceneElement[];
}


export class ClientScene implements IScene {
  store: CanvasStore;
  
  @observable name: string;
  @observable createdDate: Date;
  @observable modifiedDate: Date;
  elements: IObservableArray<ClientSceneElement> = observable<ClientSceneElement>([]);

  constructor(
    store: CanvasStore,
    name: string,
    createdDate: Date,
    modifiedDate: Date,
    elements?: ClientSceneElement[],
  ) {
    this.store = store;
    this.name = name;
    this.createdDate = createdDate;
    this.modifiedDate = modifiedDate;
    // this.elements.push = elements;
  }

  // TODO: Create Scene from tag (collection), using all images tagged within there (or from a search result)
}

/**
 * Based on https://mobx.js.org/best/store.html
 */
class CanvasStore {
  scenes: IObservableArray<IScene> = observable<ClientScene>([]);
  elements: IObservableArray<ClientSceneElement> = observable<ClientSceneElement>([]);

  private backend: Backend;
  private rootStore: RootStore;

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    this.elements.observe((data) => console.log('changed', data));
  }

  @action.bound async init() {
    // Todo: Fetch SceneElements from backend
    const prevElementsStr = window.localStorage.getItem('canvas');
    if (!prevElementsStr) return;
    const prevElements: ISceneElement[] = JSON.parse(prevElementsStr);
    this.elements.push(
      ...prevElements.map(
        ({ imageId, position, scale }) => new ClientSceneElement(this, imageId, position, scale, this.rootStore.fileStore.get(imageId) as ClientFile)));
  }

  @action.bound async addElements(files: ClientFile[]) {
    this.elements.push(
      ...files
        .filter((file) => !this.elements.some((elem) => elem.imageId === file.id)) // no duplicates
        .map((file) => new ClientSceneElement(this, file.id, { x: 0, y: 0 }, 1, file)
    ));
  }

  @action.bound removeElement(el: ClientSceneElement) {
    this.elements.remove(el);
  }

  /** Find and remove missing tags from files */
  @action.bound clean() {
    // Todo: Clean-up methods for all stores
    this.backend.getNumUntaggedFiles();
  }

  @action.bound persist() {
    window.localStorage.setItem(
      'canvas',
      JSON.stringify(
        this.elements.map(
          ({ imageId, position, scale }) => ({ imageId, position, scale })
    )));
  }

}

export default CanvasStore;
