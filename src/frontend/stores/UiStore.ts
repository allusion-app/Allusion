import { action, computed, makeObservable, observable } from 'mobx';
import { FileOrder } from 'src/backend/DBRepository';
import { IFile } from 'src/entities/File';
import { ClientBaseCriteria, ClientTagSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientTag } from 'src/entities/Tag';
import { AppToaster } from '../components/Toaster';
import {
  IHotkeyMap,
  Preferences,
  Theme,
  ThumbnailShape,
  ThumbnailSize,
  ViewMethod,
} from './Preferences';
import RootStore from './RootStore';

export type FileSearchCriteria = ClientBaseCriteria<IFile>;
const enum Content {
  All,
  Missing,
  Untagged,
  Query,
}

/**
 * From: https://mobx.js.org/best/store.html
 * Things you will typically find in UI stores:
 * - Session information
 * - Information about how far your application has loaded
 * - Information that will not be stored in the backend
 * - Information that affects the UI globally:
 *  - Window dimensions
 *  - Accessibility information
 *  - Current language
 *  - Currently active theme
 * - User interface state as soon as it affects multiple, further unrelated components:
 *  - Current selection
 *  - Visibility of toolbars, etc.
 *  - State of a wizard
 *  - State of a global overlay
 */

class UiStore {
  private readonly rootStore: RootStore;
  readonly preferences: Preferences;

  @observable isInitialized = false;

  // UI
  @observable isSettingsOpen: boolean = false;
  @observable isHelpCenterOpen: boolean = false;
  @observable isAboutOpen: boolean = false;
  @observable isAdvancedSearchOpen: boolean = false;
  @observable searchMatchAny = false;
  @observable isSlideMode: boolean = false;
  /** Index of the first item in the viewport. Also acts as the current item shown in slide mode */
  // TODO: Might be better to store the ID to the file. I believe we were storing the index for performance, but we have instant conversion between index/ID now
  @observable firstItem: number = 0;

  @observable isToolbarTagPopoverOpen: boolean = false;
  @observable isToolbarFileRemoverOpen: boolean = false;

  readonly searchCriteriaList = observable<FileSearchCriteria>([]);

  /** The origin of the current files that are shown */
  @observable private content: Content = Content.All;

  constructor(rootStore: RootStore, preferences: Preferences) {
    this.preferences = preferences;
    this.rootStore = rootStore;
    makeObservable(this);
  }

  @action.bound init() {
    this.isInitialized = true;
  }

  /////////////////// UI Actions ///////////////////
  @computed get isList(): boolean {
    return this.preferences.viewMethod === ViewMethod.List;
  }

  @computed get isGrid(): boolean {
    return this.preferences.viewMethod === ViewMethod.Grid;
  }

  @computed get isMasonryVertical(): boolean {
    return this.preferences.viewMethod === ViewMethod.MasonryVertical;
  }

  @computed get isMasonryHorizontal(): boolean {
    return this.preferences.viewMethod === ViewMethod.MasonryHorizontal;
  }

  @action.bound setThumbnailSmall() {
    this.preferences.thumbnailSize = ThumbnailSize.Small;
  }

  @action.bound setThumbnailMedium() {
    this.preferences.thumbnailSize = ThumbnailSize.Medium;
  }

  @action.bound setThumbnailLarge() {
    this.preferences.thumbnailSize = ThumbnailSize.Large;
  }

  @action.bound setThumbnailSquare() {
    this.preferences.thumbnailShape = ThumbnailShape.Square;
  }

  @action.bound setThumbnailLetterbox() {
    this.preferences.thumbnailShape = ThumbnailShape.Letterbox;
  }

  @action.bound setFirstItem(index: number = 0) {
    if (isFinite(index)) {
      this.firstItem = index;
    }
  }

  @action.bound setMethodList() {
    this.preferences.viewMethod = ViewMethod.List;
  }

  @action.bound setMethodGrid() {
    this.preferences.viewMethod = ViewMethod.Grid;
  }

  @action.bound setMethodMasonryVertical() {
    this.preferences.viewMethod = ViewMethod.MasonryVertical;
  }

  @action.bound setMethodMasonryHorizontal() {
    this.preferences.viewMethod = ViewMethod.MasonryHorizontal;
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

  @action.bound setFullScreen(val: boolean) {
    this.preferences.isFullScreen = val;
  }

  @action.bound toggleFullScreen() {
    this.preferences.isFullScreen = !this.preferences.isFullScreen;
  }

  @action.bound toggleThumbnailTagOverlay() {
    this.preferences.showThumbnailTags = !this.preferences.showThumbnailTags;
  }

  @action.bound toggleThumbnailFilenameOverlay() {
    this.preferences.showThumbnailFilename = !this.preferences.showThumbnailFilename;
  }

  @action.bound openOutliner() {
    this.preferences.isOutlinerOpen = true;
  }

  @action.bound toggleOutliner() {
    this.preferences.isOutlinerOpen = !this.preferences.isOutlinerOpen;
  }

  @action.bound toggleInspector() {
    this.preferences.isInspectorOpen = !this.preferences.isInspectorOpen;
  }

  @action.bound closeInspector() {
    this.preferences.isInspectorOpen = false;
  }

  @action.bound toggleSettings() {
    this.isSettingsOpen = !this.isSettingsOpen;
  }

  @action.bound closeSettings() {
    this.isSettingsOpen = false;
  }

  @action.bound toggleHelpCenter() {
    this.isHelpCenterOpen = !this.isHelpCenterOpen;
  }

  @action.bound closeHelpCenter() {
    this.isHelpCenterOpen = false;
  }

  @action.bound openAbout() {
    this.isAboutOpen = true;
  }

  @action.bound closeAbout() {
    this.isAboutOpen = false;
  }

  @action.bound openToolbarFileRemover() {
    if (!this.showsMissingContent) {
      this.viewMissingContent();
    }
    this.isToolbarFileRemoverOpen = true;
  }

  @action.bound closeToolbarFileRemover() {
    this.isToolbarFileRemoverOpen = false;
  }

  @action.bound toggleToolbarTagPopover() {
    this.isToolbarTagPopoverOpen = !this.isToolbarTagPopoverOpen;
  }

  @action.bound openToolbarTagPopover() {
    this.isToolbarTagPopoverOpen = true;
  }

  @action.bound closeToolbarTagPopover() {
    this.isToolbarTagPopoverOpen = false;
  }

  @action.bound setThumbnailDirectory(dir: string = '') {
    this.preferences.thumbnailDirectory = dir;
  }

  @action.bound setImportDirectory(dir: string) {
    this.preferences.importDirectory = dir;
  }

  @action.bound toggleTheme() {
    this.preferences.theme = this.preferences.theme === Theme.Dark ? Theme.Light : Theme.Dark;
  }

  @action.bound toggleAdvancedSearch() {
    this.isAdvancedSearchOpen = !this.isAdvancedSearchOpen;
  }

  @action.bound closeAdvancedSearch() {
    this.isAdvancedSearchOpen = false;
  }

  @action.bound toggleSearchMatchAny() {
    this.searchMatchAny = !this.searchMatchAny;
  }

  /////////////////// Search Actions ///////////////////
  @action.bound clearSearchCriteriaList() {
    this.searchCriteriaList.clear();
    return this.viewAllContent();
  }

  @action.bound addSearchCriteria(query: Exclude<FileSearchCriteria, 'key'>) {
    this.searchCriteriaList.push(query);
    this.viewQueryContent();
  }

  @action.bound addSearchCriterias(queries: Exclude<FileSearchCriteria[], 'key'>) {
    this.searchCriteriaList.push(...queries);
    this.viewQueryContent();
  }

  @action.bound removeSearchCriteria(query: FileSearchCriteria) {
    this.searchCriteriaList.remove(query);
    if (this.searchCriteriaList.length > 0) {
      this.viewQueryContent();
    } else {
      this.viewAllContent();
    }
  }

  @action.bound replaceSearchCriteria(query: Exclude<FileSearchCriteria, 'key'>) {
    this.replaceSearchCriterias([query]);
  }

  @action.bound replaceSearchCriterias(queries: Exclude<FileSearchCriteria[], 'key'>) {
    this.searchCriteriaList.replace(queries);
    if (this.searchCriteriaList.length > 0) {
      this.viewQueryContent();
    } else {
      this.viewAllContent();
    }
  }

  @action.bound removeSearchCriteriaByIndex(i: number) {
    this.searchCriteriaList.splice(i, 1);
    if (this.searchCriteriaList.length > 0) {
      this.viewQueryContent();
    } else {
      this.viewAllContent();
    }
  }

  @action.bound isTagSearched(tag: Readonly<ClientTag>) {
    return this.searchCriteriaList.some(
      (c) => c instanceof ClientTagSearchCriteria && c.value.includes(tag.id),
    );
  }

  @action.bound replaceCriteriaItem(oldCrit: FileSearchCriteria, crit: FileSearchCriteria) {
    const index = this.searchCriteriaList.indexOf(oldCrit);
    if (index !== -1) {
      this.searchCriteriaList[index] = crit;
      this.viewQueryContent();
    }
  }

  @action.bound filterCriterias(predicate: (criteria: FileSearchCriteria) => boolean) {
    this.searchCriteriaList.replace(this.searchCriteriaList.filter(predicate));
  }

  /////////////////// View Actions ///////////////////
  @computed get showsAllContent() {
    return this.content === Content.All;
  }

  @computed get showsUntaggedContent() {
    return this.content === Content.Untagged;
  }

  @computed get showsMissingContent() {
    return this.content === Content.Missing;
  }

  @computed get showsQueryContent() {
    return this.content === Content.Query;
  }

  @action orderFilesBy(prop: keyof IFile = 'dateAdded'): Promise<void> {
    this.preferences.orderBy = prop;
    return this.refetch();
  }

  @action switchFileOrder(): Promise<void> {
    this.preferences.fileOrder =
      this.preferences.fileOrder === FileOrder.Desc ? FileOrder.Asc : FileOrder.Desc;
    return this.refetch();
  }

  @action.bound viewAllContent(): Promise<void> {
    this.searchCriteriaList.clear();
    this.setContentAll();
    const { orderBy, fileOrder } = this.preferences;
    return this.rootStore.fileStore.fetchAllFiles(orderBy, fileOrder);
  }

  @action.bound viewQueryContent(): Promise<void> {
    if (this.searchCriteriaList.length === 0) {
      return this.viewAllContent();
    }
    const criteria = this.searchCriteriaList.map((c) => c.serialize());
    this.setContentQuery();
    const { orderBy, fileOrder } = this.preferences;
    return this.rootStore.fileStore.fetchFilesByQuery(
      criteria,
      this.searchMatchAny,
      orderBy,
      fileOrder,
    );
  }

  @action.bound viewUntaggedContent(): Promise<void> {
    const { fileStore, tagStore } = this.rootStore;
    this.searchCriteriaList.clear();
    const criteria = new ClientTagSearchCriteria(tagStore, 'tags');
    this.searchCriteriaList.push(criteria);
    this.setContentUntagged();
    const { orderBy, fileOrder } = this.preferences;
    return fileStore.fetchFilesByQuery(
      criteria.serialize(),
      this.searchMatchAny,
      orderBy,
      fileOrder,
    );
  }

  @action.bound async viewMissingContent(): Promise<void> {
    this.searchCriteriaList.clear();
    this.setContentMissing();
    const { orderBy, fileOrder } = this.preferences;
    const message = await this.rootStore.fileStore.fetchMissingFiles(orderBy, fileOrder);
    AppToaster.show({ message, timeout: 12000 }, 'recovery-view');
  }

  @action.bound async refetch(): Promise<void> {
    if (this.showsAllContent) {
      return this.viewAllContent();
    } else if (this.showsUntaggedContent) {
      return this.viewUntaggedContent();
    } else if (this.showsQueryContent) {
      return this.viewQueryContent();
    } else if (this.showsMissingContent) {
      return this.viewMissingContent();
    }
  }

  @action private setContentQuery() {
    this.content = Content.Query;
    if (this.isSlideMode) {
      this.disableSlideMode();
    }
  }

  @action private setContentAll() {
    this.content = Content.All;
    if (this.isSlideMode) {
      this.disableSlideMode();
    }
  }

  @action private setContentUntagged() {
    this.content = Content.Untagged;
    if (this.isSlideMode) {
      this.disableSlideMode();
    }
  }

  @action private setContentMissing() {
    this.content = Content.Missing;
  }

  @action.bound remapHotkey(action: keyof IHotkeyMap, combo: string) {
    this.preferences.hotkeyMap[action] = combo;
  }
}

export default UiStore;
