import { observable, action, computed } from 'mobx';
import { IFile } from '../../entities/File';
import { FileOrder } from '../../backend/DBRepository';

const PersistentPreferenceFields: Array<keyof View> = [
  'method',
  'orderBy',
  'fileOrder',
  'thumbnailSize',
  'thumbnailShape'
];

export type ViewMethod = 'list' | 'grid';
export type ViewContent = 'query' | 'all' | 'untagged';
export type ViewThumbnailSize = 'small' | 'medium' | 'large';
export type ViewThumbnailShape = 'square' | 'letterbox';

class View {
  @observable method: ViewMethod = 'grid';
  @observable isSlideMode: boolean = false;
  /** Index of the first item in the viewport */
  @observable firstItem: number = 0;
  /** The origin of the current files that are shown */
  @observable content: ViewContent = 'all';
  @observable thumbnailSize: ViewThumbnailSize = 'medium';
  @observable thumbnailShape: ViewThumbnailShape = 'square';

  @observable orderBy: keyof IFile = 'dateAdded';
  @observable fileOrder: FileOrder = 'DESC';

  @computed get isList(): boolean {
    return this.method === 'list';
  }

  @computed get isGrid(): boolean {
    return this.method === 'grid';
  }

  @computed get showsAllContent() {
    return this.content === 'all';
  }

  @computed get showsUntaggedContent() {
    return this.content === 'untagged';
  }

  @computed get showsQueryContent() {
    return this.content === 'query';
  }

  /////////////////// Persistent Preferences ///////////////////
  loadPreferences(prefs: any) {
    this.setMethod(prefs.method);
    this.setFirstItem(prefs.firstItem);
    this.setContent(prefs.content);
    this.setThumbnailSize(prefs.thumbnailSize);
    this.orderFilesBy(prefs.orderBy);
    this.setFileOrder(prefs.fileOrder);
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

  @action.bound orderFilesBy(prop: keyof IFile = 'dateAdded') {
    this.orderBy = prop;
  }

  @action.bound switchFileOrder() {
    // Todo: it is a bit confusing that this same function exists in the main UiStore,
    // but with different behavior.
    // I'd move those functions to here and pass a reference to the UiStore in the constructur of View
    this.setFileOrder(this.fileOrder === 'DESC' ? 'ASC' : 'DESC');
  }

  @action.bound setFirstItem(index: number = 0) {
    if (isFinite(index)) {
      this.firstItem = index;
    }
  }

  @action.bound setContentQuery() {
    this.setContent('query');
  }

  @action.bound setContentAll() {
    this.setContent('all');
  }

  @action.bound setContentUntagged() {
    this.setContent('untagged');
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

  @action private setContent(content: ViewContent = 'all') {
    this.content = content;
  }

  @action private setThumbnailSize(size: ViewThumbnailSize = 'medium') {
    this.thumbnailSize = size;
  }

  @action private setThumbnailShape(shape: ViewThumbnailShape) {
    this.thumbnailShape = shape;
  }

  @action private setFileOrder(order: FileOrder = 'DESC') {
    this.fileOrder = order;
  }
}

export default View;
