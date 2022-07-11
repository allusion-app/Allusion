import { action, computed, makeAutoObservable, makeObservable, observable } from 'mobx';
import { ClientFile } from 'src/entities/File';
import { ID } from 'src/entities/ID';
import { ClientFileSearchCriteria, IFileSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientTag } from 'src/entities/Tag';
import { RendererMessenger } from 'src/Messaging';
import { comboMatches, getKeyCombo, parseKeyCombo } from '../hotkeyParser';
import { clamp, notEmpty } from 'common/core';
import RootStore from './RootStore';
import { Selection } from '../data/Selection';
import { UserPreferences } from '../data/UserPreferences';
import { HotkeyMap, ThumbnailShape, ThumbnailSize, ViewMethod } from '../data/View';

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
  static MIN_OUTLINER_WIDTH = 192; // default of 12 rem
  static MIN_INSPECTOR_WIDTH = 288; // default of 18 rem

  private readonly rootStore: RootStore;

  @observable isInitialized = false;

  // Theme
  @observable theme: 'light' | 'dark';

  // UI
  @observable isOutlinerOpen: boolean;
  @observable isInspectorOpen: boolean;
  @observable isSettingsOpen: boolean = false;
  @observable isHelpCenterOpen: boolean = false;
  @observable isAboutOpen: boolean = false;
  @observable isLocationRecoveryOpen: ID | null = null;
  @observable isPreviewOpen: boolean = false;
  @observable isAdvancedSearchOpen: boolean = false;
  @observable searchMatchAny = false;
  @observable method: ViewMethod;
  @observable isSlideMode: boolean = false;
  @observable isFullScreen: boolean;
  @observable outlinerWidth: number;
  @observable inspectorWidth: number;
  /** Whether to show the tags on images in the content view */
  @observable isThumbnailTagOverlayEnabled: boolean;
  @observable isThumbnailFilenameOverlayEnabled: boolean;
  /** Whether to restore the last search query on start-up */
  @observable isRememberSearchEnabled: boolean;
  /** Index of the first item in the viewport. Also acts as the current item shown in slide mode */
  // TODO: Might be better to store the ID to the file. I believe we were storing the index for performance, but we have instant conversion between index/ID now
  @observable firstItem: number = 0;
  @observable thumbnailSize: ThumbnailSize | number;
  @observable thumbnailShape: ThumbnailShape;

  @observable isToolbarTagPopoverOpen: boolean = false;
  /** Dialog for removing unlinked files from Allusion's database */
  @observable isToolbarFileRemoverOpen: boolean = false;
  /** Dialog for moving files to the system's trash bin, and removing from Allusion's database */
  @observable isMoveFilesToTrashOpen: boolean = false;

  // Selections
  // Observable arrays recommended like this here https://github.com/mobxjs/mobx/issues/669#issuecomment-269119270.
  // However, sets are more suitable because they have quicker lookup performance.
  public readonly fileSelection = new Selection<ClientFile>();
  public readonly tagSelection = new Selection<ClientTag>();

  public readonly searchCriteriaList = observable<IFileSearchCriteria>([]);

  @observable thumbnailDirectory: string;
  @observable importDirectory: string; // for browser extension. Must be a (sub-folder of a) Location

  @observable readonly hotkeyMap: HotkeyMap;

  constructor(rootStore: RootStore, preferences: Readonly<UserPreferences>) {
    this.rootStore = rootStore;

    this.theme = preferences.theme;
    this.isOutlinerOpen = preferences.isOutlinerOpen;
    this.isInspectorOpen = preferences.isInspectorOpen;
    this.thumbnailDirectory = preferences.thumbnailDirectory;
    this.importDirectory = preferences.importDirectory;
    this.method = preferences.method;
    this.thumbnailSize = preferences.thumbnailSize;
    this.thumbnailShape = preferences.thumbnailShape;
    this.isThumbnailTagOverlayEnabled = preferences.isThumbnailTagOverlayEnabled;
    this.isThumbnailFilenameOverlayEnabled = preferences.isThumbnailFilenameOverlayEnabled;
    this.outlinerWidth = Math.max(preferences.outlinerWidth, UiStore.MIN_OUTLINER_WIDTH);
    this.inspectorWidth = Math.max(preferences.inspectorWidth, UiStore.MIN_INSPECTOR_WIDTH);
    this.isFullScreen = preferences.isFullScreen;
    this.hotkeyMap = makeAutoObservable(preferences.hotkeyMap);

    this.isRememberSearchEnabled = preferences.searchCriteriaList !== undefined;

    if (preferences.searchCriteriaList !== undefined) {
      // If remember search criteria, restore the search criteria list...
      const newCrits = preferences.searchCriteriaList.map(ClientFileSearchCriteria.clone);
      this.searchCriteriaList.replace(newCrits);

      // and other content-related options. So it's just like you never closed Allusion!
      this.firstItem = preferences.firstItem;
      this.searchMatchAny = preferences.searchMatchAny;
      this.isSlideMode = preferences.isSlideMode;
    }

    makeObservable(this);
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

  @action.bound
  public setThumbnailSquare() {
    this.thumbnailShape = 'square';
  }

  @action.bound
  public setThumbnailLetterbox() {
    this.thumbnailShape = 'letterbox';
  }

  @action.bound setFirstItem(index: number = 0) {
    if (isFinite(index) && index < this.rootStore.fileStore.fileList.length) {
      this.firstItem = index;
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
  }

  @action.bound disableSlideMode() {
    this.isSlideMode = false;
  }

  @action.bound toggleSlideMode() {
    this.isSlideMode = !this.isSlideMode;
  }

  public toggleFullScreen() {
    this.isFullScreen = !this.isFullScreen;
    RendererMessenger.setFullScreen(this.isFullScreen);
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

  @action.bound
  public openOutliner() {
    this.isOutlinerOpen = true;
  }

  @action.bound
  public toggleOutliner() {
    this.isOutlinerOpen = !this.isOutlinerOpen;
  }

  @action.bound openPreviewWindow() {
    // Don't open when no files have been selected
    if (this.fileSelection.isEmpty) {
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
    if (!this.fileSelection.isEmpty) {
      this.isMoveFilesToTrashOpen = false;
    }
  }

  @action.bound toggleToolbarTagPopover() {
    this.isToolbarTagPopoverOpen = !this.isToolbarTagPopoverOpen;
  }

  @action.bound openToolbarTagPopover() {
    if (!this.fileSelection.isEmpty) {
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

  @action.bound
  public toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
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
  public selectFile(file: ClientFile, clear?: boolean): void {
    if (clear === true) {
      this.fileSelection.clear();
    }
    this.fileSelection.selectAdditive(file);
    this.setFirstItem(this.rootStore.fileStore.getIndex(file.id));
  }

  public selectFileRange(start: number, end: number, additive: boolean): void {
    const fileList = this.rootStore.fileStore.fileList.slice(start, end + 1);
    if (!additive) {
      this.fileSelection.select(...fileList);
    } else {
      this.fileSelection.selectAdditive(...fileList);
    }
  }

  /** Selects a range of tags, where indices correspond to the flattened tag list. */
  public selectTagRange(start: number, end: number, additive: boolean): void {
    const tagTreeList = this.rootStore.tagStore.tagList.slice(start, end + 1);
    if (!additive) {
      this.tagSelection.select(...tagTreeList);
    } else {
      this.tagSelection.selectAdditive(...tagTreeList);
    }
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
  @action.bound
  public clearSearchCriteriaList() {
    if (this.searchCriteriaList.length > 0) {
      this.searchCriteriaList.clear();
      this.viewAllContent();
    }
  }

  @action.bound
  public addSearchCriteria(...queries: IFileSearchCriteria[]) {
    this.searchCriteriaList.push(...queries);
    this.viewQueryContent();
  }

  @action.bound
  public toggleSearchCriterias(queries: IFileSearchCriteria[]) {
    // TODO: can be improved
    const deepEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

    // With control, add or remove the criteria based on whether they're already being searched with
    const existingMatchingCriterias = queries.map((crit) =>
      this.searchCriteriaList.find((other) => deepEqual(other, crit)),
    );
    if (existingMatchingCriterias.every(notEmpty)) {
      // If they're already in there, remove them
      existingMatchingCriterias.forEach((query) => {
        this.searchCriteriaList.remove(query);
      });
      if (this.searchCriteriaList.length > 0) {
        this.viewQueryContent();
      } else {
        this.viewAllContent();
      }
    } else {
      // If they're not already in there, add them
      this.addSearchCriteria(...queries);
    }
  }

  @action.bound
  public removeSearchCriteria(query: IFileSearchCriteria) {
    this.searchCriteriaList.remove(query);
    if (this.searchCriteriaList.length > 0) {
      this.viewQueryContent();
    } else {
      this.viewAllContent();
    }
  }

  @action.bound
  public replaceSearchCriteria(...queries: IFileSearchCriteria[]) {
    this.searchCriteriaList.replace(queries);

    if (this.searchCriteriaList.length > 0) {
      this.viewQueryContent();
    } else {
      this.viewAllContent();
    }
  }

  @action.bound
  public removeSearchCriteriaByIndex(i: number) {
    this.searchCriteriaList.splice(i, 1);

    if (this.searchCriteriaList.length > 0) {
      this.viewQueryContent();
    } else {
      this.viewAllContent();
    }
  }

  @action.bound
  public addTagSelectionToCriteria() {
    const newCrits = Array.from(this.tagSelection, (tag) =>
      ClientFileSearchCriteria.tags('containsRecursively', [tag.id]),
    );
    this.addSearchCriteria(...newCrits);
    this.tagSelection.clear();
  }

  @action.bound
  public replaceCriteriaWithTagSelection() {
    this.replaceSearchCriteria(
      ...Array.from(this.tagSelection, (tag) =>
        ClientFileSearchCriteria.tags('containsRecursively', [tag.id]),
      ),
    );
    this.tagSelection.clear();
  }

  @action.bound getCriteriaByValue(value: any) {
    return this.searchCriteriaList.find(
      (c: any) => c.value === value || c.value?.includes?.(value),
    );
  }

  @action.bound
  public remapHotkey(action: keyof HotkeyMap, combo: string) {
    this.hotkeyMap[action] = combo;
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

  /////////////////// Helper methods ///////////////////
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

  private viewAllContent() {
    this.rootStore.fileStore.fetchAllFiles();
  }

  private viewQueryContent() {
    this.rootStore.fileStore.fetchFilesByQuery();
  }
}

export default UiStore;
