import { action, IObservableArray, observable, computed } from 'mobx';
import { deepObserve } from 'mobx-utils';

import Backend from '../../backend/Backend';
import RootStore from './RootStore';
import { ID, generateId } from '../../entities/ID';
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
  @observable position: IVector2; // = { x: 0, y: 0 };
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

  serialize(): ISceneElement {
    return {
      imageId: this.imageId,
      position: this.position,
      scale: this.scale,
    }
  }
}

interface IScene {
  id: ID;
  name: string;
  createdDate: Date;
  modifiedDate: Date;
  elements: ISceneElement[];
}

interface IHistoryItem {
  path: string;
  value: any;
}

const MAX_UNDO_STEPS = 50;

export class ClientScene implements IScene {
  store: CanvasStore;
  
  readonly id: ID;
  @observable name: string;
  @observable createdDate: Date;
  @observable modifiedDate: Date;
  @observable
  elements: IObservableArray<ClientSceneElement> = observable<ClientSceneElement>([]);

  undoStack: IHistoryItem[] = [];
  redoStack: IHistoryItem[] = [];
  isUndoing = false;

  @computed get isSelected() {
    return this.store.selectedId === this.id;
  }

  constructor(
    store: CanvasStore,
    id: ID = generateId(),
    name: string,
    createdDate: Date,
    modifiedDate: Date,
    elements?: ClientSceneElement[],
  ) {
    this.id = id;
    this.store = store;
    this.name = name;
    this.createdDate = createdDate;
    this.modifiedDate = modifiedDate;

    if (elements) {
      // const files = elements.map(({ imageId }) => this.store.)
      this.elements.push(
        ...elements.map(({ imageId, position, scale }) => new ClientSceneElement(this.store, imageId, position, scale, this.store.getFile(imageId)!)));
    }

    this.elements.observe(() => store.persist());

    const disposer = deepObserve(this, (change, path, root) => {
      if (this.isUndoing) return;
      console.log(change, path, root);

      // switch (change.type) {
      //   case 'add':
      // }
      if (change.type === 'update' && 'name' in change) {
        
        this.undoStack.push({
          path: path + '/' + change.name,
          value: change.oldValue,
        });
        if (this.undoStack.length >= MAX_UNDO_STEPS) {
          this.undoStack.shift();
        }
        if (this.redoStack.length > 0) {
          this.redoStack.splice(0);
        }
      }
    });

    console.log(disposer);

    window.addEventListener('keydown', (e) => {
      if (this.isSelected && e.ctrlKey) {
        if (e.key === 'z') {
          this.undo();
        } else if (e.key === 'y') {
          this.redo();
        }
      }
    });
  }

  @action.bound performChange(change: IHistoryItem) {
    this.isUndoing = true;
    const path = change.path.split('/');
    console.log(path);
    let obj: any = this;
    for (let i = 0; i < path.length - 1; i++) {
      obj = obj[path[i]];
    }
    obj[path[path.length - 1]] = change.value;
    this.isUndoing = false;
  }

  @action.bound undo() {
    if (this.undoStack.length > 0) {
      const change = this.undoStack.pop()!;
      this.performChange(change);
      this.redoStack.push(change);

      console.log(this.undoStack, this.redoStack);
    }
  }

  @action.bound redo() {
    if (this.redoStack.length > 0) {
      const change = this.redoStack.pop()!;
      console.log('redo', change);
      this.performChange(change);
      this.undoStack.push(change);
    }
  }

  @action.bound async addElements(files: ClientFile[]) {
    this.elements.push(
      ...files
        .filter((file) => !this.elements.some((elem) => elem.imageId === file.id)) // no duplicates
        .map((file) => new ClientSceneElement(this.store, file.id, { x: 0, y: 0 }, 1, file)
    ));
  }
  
  @action.bound removeElement(el: ClientSceneElement) {
    this.elements.remove(el);
  }

  serialize(): IScene {
    return {
      id: this.id,
      name: this.name,
      createdDate: this.createdDate,
      modifiedDate: this.modifiedDate,
      elements: this.elements.map((e) => e.serialize())
    };
  }
}

/**
 * Based on https://mobx.js.org/best/store.html
 */
class CanvasStore {
  scenes: IObservableArray<ClientScene> = observable<ClientScene>([]);
  // elements: IObservableArray<ClientSceneElement> = observable<ClientSceneElement>([]);

  @observable selectedId: ID = '';

  @computed get selectedScene() {
    return this.scenes.find((scene) => scene.id === this.selectedId)!;
  }

  private backend: Backend;
  private rootStore: RootStore;

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
    
    this.scenes.observe(() => this.persist());
  }

  @action.bound async init() {
    // Todo: Fetch SceneElements from backend instead of localstorage
    const storedScenesStr = window.localStorage.getItem('canvas');

    if (storedScenesStr) {
      const storedScenes: IScene[] = JSON.parse(storedScenesStr);
      this.scenes.push(
        ...storedScenes.map(
          ({ id, name, createdDate, modifiedDate, elements }) => new ClientScene(this, id, name, createdDate, modifiedDate, elements.map((
            ({ imageId, position, scale }) => new ClientSceneElement(this, imageId, position, scale, this.rootStore.fileStore.get(imageId) as ClientFile))))));        
    }

    if (this.scenes.length === 0) {
      this.addScene();
    }

    this.selectedId = this.scenes[0].id;
  }

  @action.bound selectScene(scene: ClientScene) {
    this.selectedId = scene.id;
  }

  @action.bound addScene(name: string = 'New scene') {
    this.scenes.push(new ClientScene(this, undefined, name, new Date(), new Date()));
  }

  @action.bound removeScene(scene: ClientScene) {
    if (this.scenes.length === 1) {
      return;
    }
    this.scenes.remove(scene);

    if (this.selectedId === scene.id) {
      this.selectedId = this.scenes[0].id;
    }

    console.log(this.scenes, this.scenes[0].serialize());
  }

  /** Find and remove missing tags from files */
  @action.bound clean() {
    // Todo: Clean-up methods for all stores
    this.backend.getNumUntaggedFiles();
  }

  @action.bound persist() {
    window.localStorage.setItem(
      'canvas',
      JSON.stringify(this.scenes.map((scene) => scene.serialize()))
    );
  }

  getFile(id: ID) {
    return this.rootStore.fileStore.fileList.find((f) => f.id === id);
  }

}

export default CanvasStore;


