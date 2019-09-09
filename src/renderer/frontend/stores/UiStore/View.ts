import { PREFERENCES_STORAGE_KEY, ViewMethod } from '.';
import { observable, action, computed } from 'mobx';
import { IFile } from '../../../entities/File';

const PersistentPreferenceFields: Array<keyof View> = [
  'method',
  'content',
  'firstItem',
  'orderBy',
  'fileOrder',
  'thumbnailSize',
];

class View {
  @observable method: ViewMethod = 'grid';
  /** Index of the first item in the viewport */
  @observable firstItem: number = 0;
  /** The origin of the current files that are shown */
  @observable content: 'query' | 'all' | 'untagged' = 'all';
  @observable thumbnailSize: 'small' | 'medium' | 'large' = 'medium';

  @observable orderBy: keyof IFile = 'dateAdded';
  @observable fileOrder = true;

  constructor() {}

  /////////////////// UI Actions ///////////////////
  @action.bound smallThumbnail() {
    this.thumbnailSize = 'small';
  }

  @action.bound mediumThumbnail() {
    this.thumbnailSize = 'medium';
  }

  @action.bound largeThumbnail() {
    this.thumbnailSize = 'large';
  }

  @action.bound orderFilesBy(prop: keyof IFile) {
    this.orderBy = prop;
  }

  @action.bound toggleFileOrder() {
    this.fileOrder = !this.fileOrder;
  }

  @action.bound setFirstItem(index: number) {
    if (isFinite(index)) {
      this.firstItem = index;
    }
  }

  @action.bound queryContent() {
    this.content = 'query';
  }

  @action.bound allContent() {
    this.content = 'all';
  }

  @action.bound untaggedContent() {
    this.content = 'untagged';
  }

  @action.bound list() {
    this.method = 'list';
  }

  @action.bound grid() {
    this.method = 'grid';
  }

  @action.bound masonry() {
    this.method = 'masonry';
  }

  @action.bound slide() {
    this.method = 'slide';
  }

  @computed get isList(): boolean {
    return this.method === 'list';
  }

  @computed get isGrid(): boolean {
    return this.method === 'grid';
  }

  @computed get isMasonry(): boolean {
    return this.method === 'masonry';
  }

  @computed get isSlide(): boolean {
    return this.method === 'slide';
  }

  /////////////////// Persistent Preferences ///////////////////
  recoverPersistentPreferences() {
    const prefsString = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (prefsString) {
      try {
        const prefs = JSON.parse(prefsString);
        // @ts-ignore
        Object.keys(prefs).forEach((key) => (this[key] = prefs[key]));
      } catch (e) {
        console.log('Cannot parse persistent preferences', e);
      }
    }
  }

  storePersistentPreferences() {
    const prefs: any = {};
    for (const field of PersistentPreferenceFields) {
      prefs[field] = this[field];
    }
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  }
}

export default View;
