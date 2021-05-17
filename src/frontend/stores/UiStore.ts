import fse from 'fs-extra';
import { action, computed, makeObservable, observable, observe } from 'mobx';
import { getDefaultThumbnailDirectory } from 'src/config';
import { IFile } from 'src/entities/File';
import { ID } from 'src/entities/ID';
import { ClientBaseCriteria, ClientTagSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientTag } from 'src/entities/Tag';
import { RendererMessenger } from 'src/Messaging';
import { AppToaster } from '../components/Toaster';
import { comboMatches, getKeyCombo, parseKeyCombo } from '../hotkeyParser';
import { clamp, debounce } from '../utils';
import FileStore from './FileStore';
import RootStore from './RootStore';

export type FileSearchCriteria = ClientBaseCriteria<IFile>;
export const enum ViewMethod {
  List,
  Grid,
  MasonryVertical,
  MasonryHorizontal,
}
type ThumbnailSize = 'small' | 'medium' | 'large';
type ThumbnailShape = 'square' | 'letterbox';
const PREFERENCES_STORAGE_KEY = 'preferences';
const enum Content {
  All,
  Missing,
  Untagged,
  Query,
}

export interface IHotkeyMap {
  // Outerliner actions
  toggleOutliner: string;
  replaceQuery: string;

  // Inspector actions
  toggleInspector: string;
  toggleSettings: string;
  toggleHelpCenter: string;

  // Toolbar actions (these should only be active when the content area is focused)
  deleteSelection: string;
  openTagEditor: string;
  selectAll: string;
  deselectAll: string;
  viewList: string;
  viewGrid: string;
  viewMasonryVertical: string;
  viewMasonryHorizontal: string;
  viewSlide: string;
  search: string;
  advancedSearch: string;

  // Other
  openPreviewWindow: string;
}

// https://blueprintjs.com/docs/#core/components/hotkeys.dialog
export const defaultHotkeyMap: IHotkeyMap = {
  toggleOutliner: '1',
  toggleInspector: '2',
  replaceQuery: 'r',
  toggleSettings: 's',
  toggleHelpCenter: 'h',
  deleteSelection: 'del',
  openTagEditor: 't',
  selectAll: 'mod + a',
  deselectAll: 'mod + d',
  viewSlide: 'alt + 0',
  viewList: 'alt + 1',
  viewGrid: 'alt + 2',
  viewMasonryVertical: 'alt + 3',
  viewMasonryHorizontal: 'alt + 4',
  search: 'mod + f',
  advancedSearch: 'mod + shift + f',
  openPreviewWindow: 'space',
};

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

/** These fields are stored and recovered when the application opens up */
const PersistentPreferenceFields: Array<keyof UiStore> = [
  'theme',
  'isOutlinerOpen',
  'isInspectorOpen',
  'thumbnailDirectory',
  'importDirectory',
  'method',
  'thumbnailSize',
  'thumbnailShape',
  'hotkeyMap',
  'isThumbnailTagOverlayEnabled',
  'outlinerWidth',
  'inspectorWidth',
];

class UiStore {
  static MIN_OUTLINER_WIDTH = 192; // default of 12 rem
  static MIN_INSPECTOR_WIDTH = 288; // default of 18 rem

  private readonly rootStore: RootStore;

  @observable isInitialized = false;

  // Theme
  @observable theme: 'light' | 'dark' = 'dark';

  // UI
  @observable isOutlinerOpen: boolean = true;
  @observable isInspectorOpen: boolean = true;
  @observable isSettingsOpen: boolean = false;
  @observable isHelpCenterOpen: boolean = false;
  @observable isAboutOpen: boolean = false;
  @observable isLocationRecoveryOpen: ID | null = null;
  @observable isAdvancedSearchOpen: boolean = false;
  @observable searchMatchAny = false;
  @observable method: ViewMethod = ViewMethod.Grid;
  @observable isSlideMode: boolean = false;
  @observable isFullScreen: boolean = false;
  @observable outlinerWidth: number = UiStore.MIN_OUTLINER_WIDTH;
  @observable inspectorWidth: number = UiStore.MIN_INSPECTOR_WIDTH;
  /** Whether to show the tags on images in the content view */
  @observable isThumbnailTagOverlayEnabled: boolean = true;
  /** Index of the first item in the viewport. Also acts as the current item shown in slide mode */
  // TODO: Might be better to store the ID to the file. I believe we were storing the index for performance, but we have instant conversion between index/ID now
  @observable firstItem: number = 0;
  @observable thumbnailSize: ThumbnailSize = 'medium';
  @observable thumbnailShape: ThumbnailShape = 'square';

  @observable isToolbarTagPopoverOpen: boolean = false;
  @observable isToolbarFileRemoverOpen: boolean = false;

  readonly searchCriteriaList = observable<FileSearchCriteria>([]);

  @observable thumbnailDirectory: string = '';
  @observable importDirectory: string = ''; // for browser extension. Must be a (sub-folder of a) Location

  @observable readonly hotkeyMap: IHotkeyMap = observable(defaultHotkeyMap);

  /** The origin of the current files that are shown */
  @observable private content: Content = Content.All;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    makeObservable(this);

    // Store preferences immediately when anything is changed
    const debouncedPersist = debounce(this.storePersistentPreferences, 200).bind(this);
    PersistentPreferenceFields.forEach((f) => observe(this, f, debouncedPersist));
  }

  @action.bound init() {
    this.isInitialized = true;
  }

  /////////////////// UI Actions ///////////////////
  @computed get isList(): boolean {
    return this.method === ViewMethod.List;
  }

  @computed get isGrid(): boolean {
    return this.method === ViewMethod.Grid;
  }

  @computed get isMasonryVertical(): boolean {
    return this.method === ViewMethod.MasonryVertical;
  }

  @computed get isMasonryHorizontal(): boolean {
    return this.method === ViewMethod.MasonryHorizontal;
  }

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
    this.method = ViewMethod.List;
  }

  @action.bound setMethodGrid() {
    this.method = ViewMethod.Grid;
  }

  @action.bound setMethodMasonryVertical() {
    this.method = ViewMethod.MasonryVertical;
  }

  @action.bound setMethodMasonryHorizontal() {
    this.method = ViewMethod.MasonryHorizontal;
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

  /** This does not actually set the window to full-screen, just for bookkeeping! Use RendererMessenger instead */
  @action.bound setFullScreen(val: boolean) {
    this.isFullScreen = val;
  }

  @action.bound enableThumbnailTagOverlay() {
    this.isThumbnailTagOverlayEnabled = true;
  }

  @action.bound disableThumbnailTagOverlay() {
    this.isThumbnailTagOverlayEnabled = false;
  }

  @action.bound toggleThumbnailTagOverlay() {
    this.isThumbnailTagOverlayEnabled = !this.isThumbnailTagOverlayEnabled;
  }

  @action.bound openOutliner() {
    this.setIsOutlinerOpen(true);
  }

  @action.bound toggleOutliner() {
    this.setIsOutlinerOpen(!this.isOutlinerOpen);
  }

  @action.bound toggleInspector() {
    this.isInspectorOpen = !this.isInspectorOpen;
  }

  @action.bound openInspector() {
    this.isInspectorOpen = true;
  }

  @action.bound closeInspector() {
    this.isInspectorOpen = false;
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

  @action.bound openLocationRecovery(locationId: ID) {
    this.isLocationRecoveryOpen = locationId;
  }

  @action.bound closeLocationRecovery() {
    this.isLocationRecoveryOpen = null;
  }

  @action.bound setThumbnailDirectory(dir: string = '') {
    this.thumbnailDirectory = dir;
  }

  @action.bound setImportDirectory(dir: string) {
    this.importDirectory = dir;
  }

  @action.bound toggleTheme() {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
    RendererMessenger.setTheme({ theme: this.theme === 'dark' ? 'dark' : 'light' });
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
    if (this.searchCriteriaList.length > 0) {
      this.searchCriteriaList.clear();
      this.viewAllContent();
    }
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

  @action.bound viewAllContent(): Promise<void> {
    this.clearSearchCriteriaList();
    this.setContentAll();
    return this.rootStore.fileStore.fetchAllFiles();
  }

  @action.bound viewQueryContent(): Promise<void> {
    const criteria = this.searchCriteriaList.map((c) => c.serialize());
    this.setContentQuery();
    return this.rootStore.fileStore.fetchFilesByQuery(criteria, this.searchMatchAny);
  }

  @action.bound viewUntaggedContent(): Promise<void> {
    const { fileStore, tagStore } = this.rootStore;
    this.clearSearchCriteriaList();
    const criteria = new ClientTagSearchCriteria(tagStore, 'tags');
    this.searchCriteriaList.push(criteria);
    this.setContentUntagged();
    return fileStore.fetchFilesByQuery(criteria.serialize(), this.searchMatchAny);
  }

  @action.bound async viewMissingContent(): Promise<void> {
    this.clearSearchCriteriaList();
    this.setContentMissing();
    const message = await this.rootStore.fileStore.fetchMissingFiles();
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
    this.hotkeyMap[action] = combo;
    // can't rely on the observer PersistentPreferenceFields, since it's an object
    // Would be neater with a deepObserve, but this works as well:
    this.storePersistentPreferences();
  }

  @action.bound processGlobalShortCuts(e: KeyboardEvent, fileStore: FileStore) {
    if ((e.target as HTMLElement).matches?.('input')) {
      return;
    }
    const combo = getKeyCombo(e);
    const matches = (c: string): boolean => {
      return comboMatches(combo, parseKeyCombo(c));
    };
    const { hotkeyMap } = this;
    let isMatch = true;
    // UI
    if (matches(hotkeyMap.toggleOutliner)) {
      this.toggleOutliner();
    } else if (matches(hotkeyMap.toggleInspector)) {
      this.toggleInspector();
    } else if (matches(hotkeyMap.openTagEditor)) {
      // Windows
    } else if (matches(hotkeyMap.toggleSettings)) {
      this.toggleSettings();
    } else if (matches(hotkeyMap.toggleHelpCenter)) {
      this.toggleHelpCenter();
    } else if (matches(hotkeyMap.openPreviewWindow)) {
      RendererMessenger.openPreviewWindow(
        Array.from(fileStore.selection, (f) => f.id),
        this.thumbnailDirectory,
      );
      e.preventDefault(); // prevent scrolling with space when opening the preview window
      // Search
    } else if (matches(hotkeyMap.search)) {
      (document.querySelector('.searchbar input') as HTMLElement)?.focus();
    } else if (matches(hotkeyMap.advancedSearch)) {
      this.toggleAdvancedSearch();
      // View
    } else if (matches(hotkeyMap.viewList)) {
      this.setMethodList();
    } else if (matches(hotkeyMap.viewGrid)) {
      this.setMethodGrid();
    } else if (matches(hotkeyMap.viewMasonryVertical)) {
      this.setMethodMasonryVertical();
    } else if (matches(hotkeyMap.viewMasonryHorizontal)) {
      this.setMethodMasonryHorizontal();
    } else if (matches(hotkeyMap.viewSlide)) {
      this.toggleSlideMode();
    } else {
      isMatch = false;
    }

    if (isMatch) {
      e.preventDefault();
    }
  }

  @action.bound moveOutlinerSplitter(x: number, width: number) {
    if (this.isOutlinerOpen) {
      const w = clamp(x, UiStore.MIN_OUTLINER_WIDTH, width * 0.75);
      this.outlinerWidth = w;

      // TODO: Automatically collapse if less than 3/4 of min-width?
      if (x < UiStore.MIN_OUTLINER_WIDTH * 0.75) {
        this.isOutlinerOpen = false;
      }
    } else if (x >= UiStore.MIN_OUTLINER_WIDTH) {
      this.isOutlinerOpen = true;
    }
  }

  @action.bound moveInspectorSplitter(x: number, width: number) {
    // The inspector is on the right side, so we need to calculate the offset.
    const offsetX = width - x;
    if (this.isInspectorOpen) {
      const w = clamp(offsetX, UiStore.MIN_INSPECTOR_WIDTH, width * 0.75);
      this.inspectorWidth = w;

      if (offsetX < UiStore.MIN_INSPECTOR_WIDTH * 0.75) {
        this.isInspectorOpen = false;
      }
    } else if (offsetX >= UiStore.MIN_INSPECTOR_WIDTH) {
      this.isInspectorOpen = true;
    }
  }

  // Storing preferences
  @action recoverPersistentPreferences() {
    const prefsString = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (prefsString) {
      try {
        const prefs = JSON.parse(prefsString);
        this.setTheme(prefs.theme);
        this.setIsOutlinerOpen(prefs.isOutlinerOpen);
        this.isInspectorOpen = Boolean(prefs.isInspectorOpen);
        this.setThumbnailDirectory(prefs.thumbnailDirectory);
        this.setImportDirectory(prefs.importDirectory);
        this.setMethod(prefs.method);
        this.setThumbnailSize(prefs.thumbnailSize);
        this.setThumbnailShape(prefs.thumbnailShape);
        this.isThumbnailTagOverlayEnabled = Boolean(prefs.isThumbnailTagOverlayEnabled ?? true);
        this.outlinerWidth = Math.max(Number(prefs.outlinerWidth), UiStore.MIN_OUTLINER_WIDTH);
        this.inspectorWidth = Math.max(Number(prefs.inspectorWidth), UiStore.MIN_INSPECTOR_WIDTH);
        Object.entries<string>(prefs.hotkeyMap).forEach(
          ([k, v]) => k in defaultHotkeyMap && (this.hotkeyMap[k as keyof IHotkeyMap] = v),
        );
        console.info('recovered', prefs.hotkeyMap);
      } catch (e) {
        console.error('Cannot parse persistent preferences', e);
      }
      // Set the native window theme based on the application theme
      RendererMessenger.setTheme({ theme: this.theme === 'dark' ? 'dark' : 'light' });
    }

    // Set default thumbnail directory in case none was specified
    if (this.thumbnailDirectory.length === 0) {
      getDefaultThumbnailDirectory().then((defaultThumbDir) => {
        this.setThumbnailDirectory(defaultThumbDir);
        fse.ensureDirSync(this.thumbnailDirectory);
      });
    }
  }

  @action storePersistentPreferences() {
    const prefs: any = {};
    for (const field of PersistentPreferenceFields) {
      prefs[field] = this[field];
    }
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  }

  /////////////////// Helper methods ///////////////////
  @action private setTheme(theme: 'light' | 'dark' = 'dark') {
    this.theme = theme;
  }

  @action private setIsOutlinerOpen(value: boolean = true) {
    this.isOutlinerOpen = value;
  }

  @action private setMethod(method: ViewMethod = ViewMethod.Grid) {
    this.method = method;
  }

  @action private setThumbnailSize(size: ThumbnailSize = 'medium') {
    this.thumbnailSize = size;
  }

  @action private setThumbnailShape(shape: ThumbnailShape) {
    this.thumbnailShape = shape;
  }
}

export default UiStore;
