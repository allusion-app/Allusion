import fse from 'fs-extra';
import { action, computed, makeObservable, observable, observe } from 'mobx';
import { ClientFile, IFile } from 'src/entities/File';
import { ID } from 'src/entities/ID';
import {
  ClientBaseCriteria,
  ClientTagSearchCriteria,
  FileSearchCriteria,
  SearchCriteria,
} from 'src/entities/SearchCriteria';
import { ClientTag } from 'src/entities/Tag';
import { RendererMessenger } from 'src/Messaging';
import { IS_PREVIEW_WINDOW } from 'common/window';
import { comboMatches, getKeyCombo, parseKeyCombo } from '../hotkeyParser';
import { clamp } from 'common/core';
import { debounce } from 'common/timeout';
import RootStore from './RootStore';

export const enum ViewMethod {
  List,
  Grid,
  MasonryVertical,
  MasonryHorizontal,
}
export type ThumbnailSize = 'small' | 'medium' | 'large' | number;
type ThumbnailShape = 'square' | 'letterbox';
const PREFERENCES_STORAGE_KEY = 'preferences';

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
  viewSlide: 'enter', // TODO: backspace and escape are hardcoded hotkeys to exist slide mode
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
  'isThumbnailFilenameOverlayEnabled',
  'outlinerWidth',
  'inspectorWidth',
  'isRememberSearchEnabled',
  // the following are only restored when isRememberSearchEnabled is enabled
  'isSlideMode',
  'firstItem',
  'searchMatchAny',
];

class UiStore {
  static MIN_OUTLINER_WIDTH = 192; // default of 12 rem
  static MIN_INSPECTOR_WIDTH = 288; // default of 18 rem

  private readonly rootStore: RootStore;

  @observable isInitialized = false;

  // Theme
  @observable theme: 'light' | 'dark' = 'dark';

  @observable windowTitle = 'Allusion';

  // UI
  @observable isOutlinerOpen: boolean = true;
  @observable isInspectorOpen: boolean = true;
  @observable isSettingsOpen: boolean = false;
  @observable isHelpCenterOpen: boolean = false;
  @observable isAboutOpen: boolean = false;
  @observable isLocationRecoveryOpen: ID | null = null;
  @observable isPreviewOpen: boolean = false;
  @observable isAdvancedSearchOpen: boolean = false;
  @observable searchMatchAny = false;
  @observable method: ViewMethod = ViewMethod.Grid;
  @observable isSlideMode: boolean = false;
  @observable isFullScreen: boolean = false;
  @observable outlinerWidth: number = UiStore.MIN_OUTLINER_WIDTH;
  @observable inspectorWidth: number = UiStore.MIN_INSPECTOR_WIDTH;
  /** Whether to show the tags on images in the content view */
  @observable isThumbnailTagOverlayEnabled: boolean = true;
  @observable isThumbnailFilenameOverlayEnabled: boolean = false;
  /** Whether to restore the last search query on start-up */
  @observable isRememberSearchEnabled: boolean = false;
  /** Index of the first item in the viewport. Also acts as the current item shown in slide mode */
  // TODO: Might be better to store the ID to the file. I believe we were storing the index for performance, but we have instant conversion between index/ID now
  @observable firstItem: number = 0;
  @observable thumbnailSize: ThumbnailSize | number = 'medium';
  @observable thumbnailShape: ThumbnailShape = 'square';

  @observable isToolbarTagPopoverOpen: boolean = false;
  /** Dialog for removing unlinked files from Allusion's database */
  @observable isToolbarFileRemoverOpen: boolean = false;
  /** Dialog for moving files to the system's trash bin, and removing from Allusion's database */
  @observable isMoveFilesToTrashOpen: boolean = false;

  // Selections
  // Observable arrays recommended like this here https://github.com/mobxjs/mobx/issues/669#issuecomment-269119270.
  // However, sets are more suitable because they have quicker lookup performance.
  readonly fileSelection = observable(new Set<ClientFile>());
  readonly tagSelection = observable(new Set<ClientTag>());

  readonly searchCriteriaList = observable<FileSearchCriteria>([]);

  @observable thumbnailDirectory: string = '';
  @observable importDirectory: string = ''; // for browser extension. Must be a (sub-folder of a) Location

  @observable readonly hotkeyMap: IHotkeyMap = observable(defaultHotkeyMap);

  private debouncedStorePersistentPreferences: () => void;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    makeObservable(this);

    // Store preferences immediately when anything is changed
    this.debouncedStorePersistentPreferences = debounce(this.storePersistentPreferences, 200).bind(
      this,
    );
    if (!IS_PREVIEW_WINDOW) {
      PersistentPreferenceFields.forEach((f) =>
        observe(this, f, this.debouncedStorePersistentPreferences),
      );
    }
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

  @action.bound setThumbnailSize(size: ThumbnailSize) {
    this.thumbnailSize = size;
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

  @action updateWindowTitle() {
    if (this.isSlideMode && this.rootStore.fileStore.fileList.length > 0) {
      const activeFile = this.rootStore.fileStore.fileList[this.firstItem];
      this.windowTitle = `${activeFile.filename}.${activeFile.extension} - Allusion`;
    } else {
      this.windowTitle = 'Allusion';
    }
  }

  @action.bound setFirstItem(index: number = 0) {
    if (isFinite(index) && index < this.rootStore.fileStore.fileList.length) {
      this.firstItem = index;
      this.updateWindowTitle();
    }
  }

  @action setMethod(method: ViewMethod) {
    this.method = method;
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
    this.updateWindowTitle();
  }

  @action.bound disableSlideMode() {
    this.isSlideMode = false;
    this.updateWindowTitle();
  }

  @action.bound toggleSlideMode() {
    this.isSlideMode = !this.isSlideMode;
    this.updateWindowTitle();
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

  @action.bound toggleThumbnailFilenameOverlay() {
    this.isThumbnailFilenameOverlayEnabled = !this.isThumbnailFilenameOverlayEnabled;
  }

  @action.bound toggleRememberSearchQuery() {
    this.isRememberSearchEnabled = !this.isRememberSearchEnabled;
  }

  @action.bound openOutliner() {
    this.setIsOutlinerOpen(true);
  }

  @action.bound toggleOutliner() {
    this.setIsOutlinerOpen(!this.isOutlinerOpen);
  }

  @action.bound openPreviewWindow() {
    // Don't open when no files have been selected
    if (this.fileSelection.size === 0) {
      return;
    }

    // If only one image was selected, open all images, but focus on the selected image. Otherwise, open selected images
    // TODO: FIXME: Disabled for now: makes it a lot less "snappy", takes a while for the message to come through
    // this.fileSelection.size === 1
    //   ? this.rootStore.fileStore.fileList
    //   : Array.from(this.fileSelection);

    RendererMessenger.sendPreviewFiles({
      ids: Array.from(this.fileSelection, (file) => file.id),
      activeImgId: this.getFirstSelectedFileId(),
      thumbnailDirectory: this.thumbnailDirectory,
      viewMethod: this.method,
    });

    this.isPreviewOpen = true;

    // remove focus from element so closing preview with spacebar does not trigger any ui elements
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  @action.bound toggleInspector() {
    this.isInspectorOpen = !this.isInspectorOpen;
  }

  @action.bound openInspector() {
    this.isInspectorOpen = true;
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

  @action.bound toggleAbout() {
    this.isAboutOpen = !this.isAboutOpen;
  }

  @action.bound closeAbout() {
    this.isAboutOpen = false;
  }

  @action.bound openToolbarFileRemover() {
    if (!this.rootStore.fileStore.showsMissingContent) {
      this.rootStore.fileStore.fetchMissingFiles();
    }
    this.isToolbarFileRemoverOpen = true;
  }

  @action.bound closeToolbarFileRemover() {
    this.isToolbarFileRemoverOpen = false;
  }

  @action.bound openMoveFilesToTrash() {
    this.isMoveFilesToTrashOpen = true;
  }

  @action.bound closeMoveFilesToTrash() {
    if (this.fileSelection.size > 0) {
      this.isMoveFilesToTrashOpen = false;
    }
  }

  @action.bound toggleToolbarTagPopover() {
    this.isToolbarTagPopoverOpen = !this.isToolbarTagPopoverOpen;
  }

  @action.bound openToolbarTagPopover() {
    if (this.fileSelection.size > 0) {
      this.isToolbarTagPopoverOpen = true;
    }
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

  @action.bound closePreviewWindow() {
    this.isPreviewOpen = false;
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

  /////////////////// Selection actions ///////////////////
  @action.bound selectFile(file: ClientFile, clear?: boolean) {
    if (clear === true) {
      this.clearFileSelection();
    }
    this.fileSelection.add(file);
    this.setFirstItem(this.rootStore.fileStore.getIndex(file.id));
  }

  @action.bound deselectFile(file: ClientFile) {
    this.fileSelection.delete(file);
  }

  @action.bound toggleFileSelection(file: ClientFile, clear?: boolean) {
    if (this.fileSelection.has(file)) {
      this.fileSelection.delete(file);
    } else {
      if (clear) {
        this.fileSelection.clear();
      }
      this.fileSelection.add(file);
    }
  }

  @action.bound selectFileRange(start: number, end: number, additive?: boolean) {
    if (!additive) {
      this.fileSelection.clear();
    }
    for (let i = start; i <= end; i++) {
      this.fileSelection.add(this.rootStore.fileStore.fileList[i]);
    }
  }

  @action.bound selectAllFiles() {
    this.fileSelection.replace(this.rootStore.fileStore.fileList);
  }

  @action.bound clearFileSelection() {
    this.fileSelection.clear();
  }

  @action.bound selectTag(tag: ClientTag, clear?: boolean) {
    if (clear === true) {
      this.clearTagSelection();
    }
    this.tagSelection.add(tag);
  }

  @action.bound deselectTag(tag: ClientTag) {
    this.tagSelection.delete(tag);
  }

  @action.bound toggleTagSelection(tag: ClientTag) {
    if (this.tagSelection.has(tag)) {
      this.tagSelection.delete(tag);
    } else {
      this.tagSelection.add(tag);
    }
  }

  /** Selects a range of tags, where indices correspond to the flattened tag list. */
  @action.bound selectTagRange(start: number, end: number, additive?: boolean) {
    const tagTreeList = this.rootStore.tagStore.tagList;
    if (!additive) {
      this.tagSelection.replace(tagTreeList.slice(start, end + 1));
      return;
    }
    for (let i = start; i <= end; i++) {
      this.tagSelection.add(tagTreeList[i]);
    }
  }

  @action.bound selectAllTags() {
    this.tagSelection.replace(this.rootStore.tagStore.tagList);
  }

  @action.bound clearTagSelection() {
    this.tagSelection.clear();
  }

  @action.bound async removeSelectedTags() {
    const ctx = this.getTagContextItems();
    return this.rootStore.tagStore.deleteTags(ctx);
  }

  @action.bound colorSelectedTagsAndCollections(activeElementId: ID, color: string) {
    const ctx = this.getTagContextItems(activeElementId);
    const colorCollection = (tag: ClientTag) => {
      tag.setColor(color);
      tag.subTags.forEach((tag) => tag.setColor(color));
    };
    ctx.forEach(colorCollection);
  }

  /**
   * Returns the tags and tag collections that are in the context of an action,
   * e.g. all selected items when choosing to delete an item that is selected,
   * or only a single item when moving a single tag that is not selected.
   * @returns The collections and tags in the context. Tags belonging to collections in the context are not included,
   * but can be easily found by getting the tags from each collection.
   */
  @action.bound getTagContextItems(activeItemId?: ID) {
    const { tagStore } = this.rootStore;

    // If no id was given, the context is the tag selection. Else, it might be a single tag/collection
    let isContextTheSelection = activeItemId === undefined;

    const contextTags: ClientTag[] = [];

    // If an id is given, check whether it belongs to a tag or collection
    if (activeItemId) {
      const selectedTag = tagStore.get(activeItemId);
      if (selectedTag) {
        if (selectedTag.isSelected) {
          isContextTheSelection = true;
        } else {
          contextTags.push(selectedTag);
        }
      }
    }

    // If no id is given or when the selected tag or collection is selected, the context is the whole selection
    if (isContextTheSelection) {
      contextTags.push(...this.tagSelection);
    }

    return contextTags;
  }

  /**
   * @param targetId Where to move the selection to
   */
  @action.bound moveSelectedTagItems(id: ID, pos = 0) {
    const { tagStore } = this.rootStore;

    const target = tagStore.get(id);
    if (!target) {
      throw new Error('Invalid target to move to');
    }

    // Find all tags + collections in the current context (all selected items)
    const ctx = this.getTagContextItems();

    // Move tags and collections
    ctx.forEach((tag) => target.insertSubTag(tag, pos));
  }

  /////////////////// Search Actions ///////////////////
  @action.bound clearSearchCriteriaList() {
    if (this.searchCriteriaList.length > 0) {
      this.searchCriteriaList.forEach((c) => c.dispose());
      this.searchCriteriaList.clear();
      this.viewAllContent();
    }
  }

  @action.bound addSearchCriteria(query: Exclude<FileSearchCriteria, 'key'>) {
    this.searchCriteriaList.push(query);
    this.viewQueryContent();
    query.observe(this.debouncedStorePersistentPreferences);
  }

  @action.bound addSearchCriterias(queries: Exclude<FileSearchCriteria[], 'key'>) {
    this.searchCriteriaList.push(...queries);
    queries.forEach((query) => query.observe(this.debouncedStorePersistentPreferences));
    this.viewQueryContent();
  }

  @action.bound removeSearchCriteria(query: FileSearchCriteria) {
    query.dispose();
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
    this.searchCriteriaList.forEach((c) => c.dispose());

    this.searchCriteriaList.replace(queries);

    queries.forEach((query) => query.observe(this.debouncedStorePersistentPreferences));

    if (this.searchCriteriaList.length > 0) {
      this.viewQueryContent();
    } else {
      this.viewAllContent();
    }
  }

  @action.bound removeSearchCriteriaByIndex(i: number) {
    const removedCrits = this.searchCriteriaList.splice(i, 1);

    removedCrits.forEach((c) => c.dispose());

    if (this.searchCriteriaList.length > 0) {
      this.viewQueryContent();
    } else {
      this.viewAllContent();
    }
  }

  @action.bound addTagSelectionToCriteria() {
    const newCrits = Array.from(
      this.tagSelection,
      (tag) => new ClientTagSearchCriteria('tags', tag.id),
    );
    newCrits.forEach((crit) => crit.observe(this.debouncedStorePersistentPreferences));
    this.addSearchCriterias(newCrits);
    this.clearTagSelection();
  }

  @action.bound replaceCriteriaWithTagSelection() {
    this.replaceSearchCriterias(
      Array.from(this.tagSelection, (tag) => new ClientTagSearchCriteria('tags', tag.id)),
    );
    this.clearTagSelection();
  }

  @action.bound replaceCriteriaItem(oldCrit: FileSearchCriteria, crit: FileSearchCriteria) {
    const index = this.searchCriteriaList.indexOf(oldCrit);
    if (index !== -1) {
      this.searchCriteriaList[index].dispose();
      this.searchCriteriaList[index] = crit;
      crit.observe(this.debouncedStorePersistentPreferences);
      this.viewQueryContent();
    }
  }

  @action.bound getCriteriaByValue(value: any) {
    return this.searchCriteriaList.find(
      (c: any) => c.value === value || c.value?.includes?.(value),
    );
  }

  @action.bound remapHotkey(action: keyof IHotkeyMap, combo: string) {
    this.hotkeyMap[action] = combo;
    // can't rely on the observer PersistentPreferenceFields, since it's an object
    // Would be neater with a deepObserve, but this works as well:
    this.storePersistentPreferences();
  }

  @action.bound processGlobalShortCuts(e: KeyboardEvent) {
    if ((e.target as HTMLElement | null)?.matches('input')) {
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
      this.openPreviewWindow();
      e.preventDefault(); // prevent scrolling with space when opening the preview window
      // Search
    } else if (matches(hotkeyMap.search)) {
      (document.querySelector('.searchbar input') as HTMLElement).focus();
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

      // Automatically collapse if less than 3/4 of min-width?
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
        if (prefs.theme) {
          this.setTheme(prefs.theme);
        }
        this.setIsOutlinerOpen(prefs.isOutlinerOpen);
        this.isInspectorOpen = Boolean(prefs.isInspectorOpen);
        if (prefs.thumbnailDirectory) {
          this.setThumbnailDirectory(prefs.thumbnailDirectory);
        }
        if (prefs.importDirectory) {
          this.setImportDirectory(prefs.importDirectory);
        }
        this.setMethod(Number(prefs.method));
        if (prefs.thumbnailSize) {
          this.setThumbnailSize(prefs.thumbnailSize);
        }
        if (prefs.thumbnailShape) {
          this.setThumbnailShape(prefs.thumbnailShape);
        }
        this.isThumbnailTagOverlayEnabled = Boolean(prefs.isThumbnailTagOverlayEnabled ?? true);
        this.isThumbnailFilenameOverlayEnabled = Boolean(
          prefs.isThumbnailFilenameOverlayEnabled ?? false,
        );
        this.outlinerWidth = Math.max(Number(prefs.outlinerWidth), UiStore.MIN_OUTLINER_WIDTH);
        this.inspectorWidth = Math.max(Number(prefs.inspectorWidth), UiStore.MIN_INSPECTOR_WIDTH);
        Object.entries<string>(prefs.hotkeyMap).forEach(
          ([k, v]) => k in defaultHotkeyMap && (this.hotkeyMap[k as keyof IHotkeyMap] = v),
        );

        this.isRememberSearchEnabled = Boolean(prefs.isRememberSearchEnabled);
        if (this.isRememberSearchEnabled) {
          // If remember search criteria, restore the search criteria list...
          const serializedCriteriaList: SearchCriteria<IFile>[] = JSON.parse(
            prefs.searchCriteriaList || '[]',
          );
          const newCrits = serializedCriteriaList.map((c) => ClientBaseCriteria.deserialize(c));
          this.searchCriteriaList.push(...newCrits);
          newCrits.forEach((crit) => crit.observe(this.debouncedStorePersistentPreferences));

          // and other content-related options. So it's just like you never closed Allusion!
          this.firstItem = prefs.firstItem;
          this.searchMatchAny = prefs.searchMatchAny;
          this.isSlideMode = prefs.isSlideMode;
        }
        console.info('recovered', prefs);
      } catch (e) {
        console.error('Cannot parse persistent preferences', e);
      }
      // Set the native window theme based on the application theme
      RendererMessenger.setTheme({ theme: this.theme === 'dark' ? 'dark' : 'light' });
    }

    // Set default thumbnail directory in case none was specified
    if (this.thumbnailDirectory.length === 0) {
      RendererMessenger.getDefaultThumbnailDirectory().then((defaultThumbDir) => {
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

    // searchCriteriaList can't be observed; do it manually
    prefs['searchCriteriaList'] = JSON.stringify(
      this.searchCriteriaList.map((c) => c.serialize(this.rootStore)),
    );

    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  }

  clearPersistentPreferences() {
    localStorage.removeItem(PREFERENCES_STORAGE_KEY);
  }

  /////////////////// Helper methods ///////////////////
  @action.bound clearSelection() {
    this.tagSelection.clear();
    this.fileSelection.clear();
  }

  getFirstSelectedFileId(): ID | undefined {
    return this.firstSelectedFile?.id;
  }

  @computed get firstSelectedFile(): ClientFile | undefined {
    for (const file of this.fileSelection) {
      return file;
    }
    return undefined;
  }

  /** Return {@link UiStore.firstItem}: first item visible in viewport, and the current item in SlideMode */
  @computed get firstFileInView(): ClientFile | undefined {
    return this.firstItem < this.rootStore.fileStore.fileList.length
      ? this.rootStore.fileStore.fileList[this.firstItem]
      : undefined;
  }

  @action private viewAllContent() {
    this.rootStore.fileStore.fetchAllFiles();
  }

  @action private viewQueryContent() {
    this.rootStore.fileStore.fetchFilesByQuery();
  }

  @action private setTheme(theme: 'light' | 'dark' = 'dark') {
    this.theme = theme;
  }

  @action private setIsOutlinerOpen(value: boolean = true) {
    this.isOutlinerOpen = value;
  }

  @action private setThumbnailShape(shape: ThumbnailShape) {
    this.thumbnailShape = shape;
  }
}

export default UiStore;
