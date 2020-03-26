import { observable, action, computed } from 'mobx';

export const PersistentPreferenceFields: Array<keyof View> = ['thumbnailSize', 'thumbnailShape'];

export type ViewMethod = 'list' | 'grid';
export type ViewThumbnailSize = 'small' | 'medium' | 'large';
export type ViewThumbnailShape = 'square' | 'letterbox';

class View {
  @observable method: ViewMethod = 'grid';
  @observable isSlideMode: boolean = false;
  /** Index of the first item in the viewport */
  @observable firstItem: number = 0;
  @observable thumbnailSize: ViewThumbnailSize = 'medium';
  @observable thumbnailShape: ViewThumbnailShape = 'square';

  @computed get isList(): boolean {
    return this.method === 'list';
  }

  @computed get isGrid(): boolean {
    return this.method === 'grid';
  }

  /////////////////// Persistent Preferences ///////////////////
  loadPreferences(prefs: any) {
    this.setMethod(prefs.method);
    this.setFirstItem(prefs.firstItem);
    this.setThumbnailSize(prefs.thumbnailSize);
  }

  savePreferences(prefs: any): string {
    for (const field of PersistentPreferenceFields) {
      prefs[field] = this[field];
    }
    return prefs;
  }

  /////////////////// UI Actions ///////////////////
  @action.bound setThumbnailSmall() {
    this.setThumbnailSize('small');
  }

  @action.bound setThumbnailMedium() {
    this.setThumbnailSize('medium');
  }

  @action.bound setThumbnailLarge() {
    this.setThumbnailSize('large');
  }

  @action.bound setThumbnailSquare() {
    this.setThumbnailShape('square');
  }

  @action.bound setThumbnailLetterbox() {
    this.setThumbnailShape('letterbox');
  }

  @action.bound setFirstItem(index: number = 0) {
    if (isFinite(index)) {
      this.firstItem = index;
    }
  }

  @action.bound setMethodList() {
    this.setMethod('list');
  }

  @action.bound setMethodGrid() {
    this.setMethod('grid');
  }

  @action.bound enableSlideMode() {
    this.isSlideMode = true;
  }

  @action.bound disableSlideMode() {
    this.isSlideMode = false;
  }

  @action.bound toggleSlideMode() {
    this.isSlideMode = !this.isSlideMode;
  }

  @action private setMethod(method: ViewMethod = 'grid') {
    this.method = method;
  }

  @action private setThumbnailSize(size: ViewThumbnailSize = 'medium') {
    this.thumbnailSize = size;
  }

  @action setThumbnailShape(shape: ViewThumbnailShape) {
    this.thumbnailShape = shape;
  }
}

export default View;
