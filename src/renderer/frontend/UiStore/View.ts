import { ViewMethod } from '.';
import { observable, action, computed } from 'mobx';
import { IFile } from '../../entities/File';

const PersistentPreferenceFields: Array<keyof View> = [
  'method',
  'content',
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

  /////////////////// UI Actions ///////////////////
  @action.bound setThumbnailSmall() {
    this.thumbnailSize = 'small';
  }

  @action.bound setThumbnailMedium() {
    this.thumbnailSize = 'medium';
  }

  @action.bound setThumbnailLarge() {
    this.thumbnailSize = 'large';
  }

  @action.bound orderFilesBy(prop: keyof IFile) {
    this.orderBy = prop;
  }

  @action.bound switchFileOrder() {
    // Todo: it is a bit confusing that this same function exists in the main UiStore,
    // but with different behavior.
    // I'd move those functions to here and pass a reference to the UiStore in the constructur of View
    this.fileOrder = !this.fileOrder;
  }

  @action.bound setFirstItem(index: number) {
    if (isFinite(index)) {
      this.firstItem = index;
    }
  }

  @action.bound setContentQuery() {
    this.content = 'query';
  }

  @action.bound setContentAll() {
    this.content = 'all';
  }

  @action.bound setContentUntagged() {
    this.content = 'untagged';
  }

  @action.bound setMethodList() {
    this.method = 'list';
  }

  @action.bound setMethodGrid() {
    this.method = 'grid';
  }

  @action.bound setMethodMasonry() {
    this.method = 'masonry';
  }

  @action.bound setMethodSlide() {
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
  getPreferences(prefs: any) {
    for (const field of PersistentPreferenceFields) {
      // @ts-ignore
      this[field] = prefs[field];
    }
  }

  setPreferences(prefs: any): string {
    for (const field of PersistentPreferenceFields) {
      prefs[field] = this[field];
    }
    return prefs;
  }
}

export default View;
