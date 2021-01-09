import path from 'path';
import fse from 'fs-extra';
import { action, observable, computed, observe, makeObservable } from 'mobx';

import RootStore from './RootStore';
import { ClientFile, IFile } from '../../entities/File';
import { ID } from '../../entities/ID';
import { ClientTag, ROOT_TAG_ID } from '../../entities/Tag';
import { ClientBaseCriteria, ClientIDSearchCriteria } from '../../entities/SearchCriteria';
import { RendererMessenger } from '../../../Messaging';
import { debounce } from '../utils';

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
  'thumbnailDirectory',
  'method',
  'thumbnailSize',
  'thumbnailShape',
  'hotkeyMap',
];

class UiStore {
  private readonly rootStore: RootStore;

  @observable isInitialized = false;

  // Theme
  @observable theme: 'LIGHT' | 'DARK' = 'DARK';

  // UI
  @observable isOutlinerOpen: boolean = true;
  @observable isInspectorOpen: boolean = false;
  @observable isSettingsOpen: boolean = false;
  @observable isHelpCenterOpen: boolean = false;
  @observable isLocationRecoveryOpen: ID | null = null;
  @observable isPreviewOpen: boolean = false;
  @observable isAdvancedSearchOpen: boolean = false;
  @observable searchMatchAny = false;
  @observable method: ViewMethod = ViewMethod.Grid;
  @observable isSlideMode: boolean = false;
  /** Index of the first item in the viewport */
  @observable firstItem: number = 0;
  @observable thumbnailSize: ThumbnailSize = 'medium';
  @observable thumbnailShape: ThumbnailShape = 'square';

  @observable isToolbarTagPopoverOpen: boolean = false;
  @observable isToolbarFileRemoverOpen: boolean = false;

  // Selections
  // Observable arrays recommended like this here https://github.com/mobxjs/mobx/issues/669#issuecomment-269119270.
  // However, sets are more suitable because they have quicker lookup performance.
  readonly fileSelection = observable(new Set<ClientFile>());
  readonly tagSelection = observable(new Set<ClientTag>());

  readonly searchCriteriaList = observable<FileSearchCriteria>([]);

  @observable thumbnailDirectory: string = '';

  @observable readonly hotkeyMap: IHotkeyMap = observable(defaultHotkeyMap);

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
    const previewFiles =
      this.fileSelection.size === 1
        ? this.rootStore.fileStore.fileList
        : Array.from(this.fileSelection);

    RendererMessenger.sendPreviewFiles({
      ids: previewFiles.map((file) => file.id),
      activeImgId: this.getFirstSelectedFileId(),
      thumbnailDirectory: this.thumbnailDirectory,
    });

    this.isPreviewOpen = true;

    // remove focus from element so closing preview with spacebar does not trigger any ui elements
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  @action.bound toggleInspector() {
    this.setIsInspectorOpen(!this.isInspectorOpen);
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

  @action.bound openToolbarFileRemover() {
    this.isToolbarFileRemoverOpen = true;
  }

  @action.bound closeToolbarFileRemover() {
    this.isToolbarFileRemoverOpen = false;
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

  @action.bound closePreviewWindow() {
    this.isPreviewOpen = false;
  }

  @action.bound setThumbnailDirectory(dir: string = '') {
    this.thumbnailDirectory = dir;
  }

  @action.bound toggleTheme() {
    this.setTheme(this.theme === 'DARK' ? 'LIGHT' : 'DARK');
    RendererMessenger.setTheme({ theme: this.theme === 'DARK' ? 'dark' : 'light' });
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
    if (clear) {
      this.clearFileSelection();
    }
    this.fileSelection.add(file);
  }

  @action.bound deselectFile(file: ClientFile) {
    this.fileSelection.delete(file);
  }

  /**
   * Returns true if the file was selected.
   */
  @action.bound toggleFileSelection(file: ClientFile) {
    if (this.fileSelection.has(file)) {
      this.fileSelection.delete(file);
    } else {
      this.fileSelection.add(file);
    }
  }

  @action.bound selectFileRange(start: number, end: number) {
    this.fileSelection.clear();
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

  @action.bound deselectTag(tag: ClientTag) {
    this.tagSelection.delete(tag);
  }

  /**
   * Returns true if the tag was selected.
   */
  @action.bound toggleTagSelection(tag: ClientTag) {
    if (this.tagSelection.has(tag)) {
      this.tagSelection.delete(tag);
    } else {
      this.tagSelection.add(tag);
    }
  }

  // Range Selection using pre-order tree traversal
  @action.bound selectTagRange(tag: ClientTag, lastSelection: ID) {
    this.tagSelection.clear();
    let isSelecting = false;
    const selectRange = (node: ClientTag) => {
      if (node.id === lastSelection || node.id === tag.id) {
        if (!isSelecting) {
          // Start selection
          isSelecting = true;
        } else {
          // End selection
          this.tagSelection.add(node);
          isSelecting = false;
          return;
        }
      }

      if (isSelecting) {
        this.tagSelection.add(node);
      }

      for (const subTag of node.subTags) {
        selectRange(subTag);
      }
    };
    selectRange(this.rootStore.tagStore.root);
  }

  @action.bound selectAllTags() {
    this.tagSelection.replace(this.rootStore.tagStore.tagList);
    this.tagSelection.delete(this.rootStore.tagStore.root);
  }

  @action.bound clearTagSelection() {
    this.tagSelection.clear();
  }

  @action.bound async removeSelectedTags() {
    const ctx = this.getTagContextItems();
    return this.rootStore.tagStore.deleteTags(ctx.tags);
  }

  @action.bound colorSelectedTagsAndCollections(activeElementId: ID, color: string) {
    const ctx = this.getTagContextItems(activeElementId);
    const colorCollection = (tag: ClientTag) => {
      tag.setColor(color);
      tag.subTags.forEach((tag) => tag.setColor(color));
    };
    ctx.tags.forEach(colorCollection);
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
      const selectedTags = tagStore.tagList.filter((c) => c.isSelected);

      // root tag may not be present in the context
      const rootTagIndex = selectedTags.findIndex((col) => col.id === ROOT_TAG_ID);
      if (rootTagIndex >= 0) {
        selectedTags.splice(rootTagIndex, 1);
      }

      // Only include selected tags of which their parent is not selected
      const selectedColsNotInSelectedCols = selectedTags.filter((col) =>
        selectedTags.every((parent) => !parent.subTags.includes(col)),
      );
      contextTags.push(...selectedColsNotInSelectedCols);

      // Only include the selected tags that are not in a selected collection
      // const selectedTagsNotInSelectedCols = this.clientTagSelection.filter((t) =>
      //   selectedTags.every((col) => !col.tags.includes(t.id)),
      // );
      // contextTags.push(...selectedTagsNotInSelectedCols);
    }

    return {
      tags: contextTags,
    };
  }

  /**
   * @param targetId Where to move the selection to
   */
  @action.bound moveSelectedTagItems(id: ID) {
    const { tagStore } = this.rootStore;

    const target = tagStore.get(id);
    if (!target) {
      throw new Error('Invalid target to move to');
    }

    // Find all tags + collections in the current context (all selected items)
    const ctx = this.getTagContextItems();

    // Move tags and collections
    ctx.tags.forEach((tag) => target.insertSubTag(tag, 0));
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

  @action.bound replaceCriteriaWithTagSelection() {
    this.replaceSearchCriterias(
      Array.from(this.tagSelection, (tag) => new ClientIDSearchCriteria('tags', tag.id)),
    );
    this.clearTagSelection();
  }

  @action.bound replaceCriteriaItem(oldCrit: FileSearchCriteria, crit: FileSearchCriteria) {
    const index = this.searchCriteriaList.indexOf(oldCrit);
    if (index !== -1) {
      this.searchCriteriaList[index] = crit;
      this.viewQueryContent();
    }
  }

  @action.bound remapHotkey(action: keyof IHotkeyMap, combo: string) {
    this.hotkeyMap[action] = combo;
    // can't rely on the observer PersistentPreferenceFields, since it's an object
    // Would be neater with a deepObserve, but this works as well:
    this.storePersistentPreferences();
  }

  // Storing preferences
  @action recoverPersistentPreferences() {
    const prefsString = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (prefsString) {
      try {
        const prefs = JSON.parse(prefsString);
        this.setTheme(prefs.theme);
        this.setIsOutlinerOpen(prefs.isOutlinerOpen);
        this.setIsInspectorOpen(prefs.isInspectorOpen);
        this.setThumbnailDirectory(prefs.thumbnailDirectory);
        this.setMethod(prefs.method);
        this.setThumbnailSize(prefs.thumbnailSize);
        this.setThumbnailShape(prefs.thumbnailShape);
        Object.entries<string>(prefs.hotkeyMap).forEach(
          ([k, v]) => k in defaultHotkeyMap && (this.hotkeyMap[k as keyof IHotkeyMap] = v),
        );
        console.log('recovered', prefs.hotkeyMap, this.hotkeyMap);
      } catch (e) {
        console.error('Cannot parse persistent preferences', e);
      }
      // Set the native window theme based on the application theme
      RendererMessenger.setTheme({ theme: this.theme === 'DARK' ? 'dark' : 'light' })
    }

    // Set default thumbnail directory in case none was specified
    if (this.thumbnailDirectory.length === 0) {
      RendererMessenger.getPath('userData').then((userDataPath) => {
        this.setThumbnailDirectory(path.join(userDataPath, 'thumbnails'));
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

  @action private viewAllContent() {
    this.rootStore.fileStore.fetchAllFiles();
  }

  @action private viewQueryContent() {
    this.rootStore.fileStore.fetchFilesByQuery();
  }

  @action private setTheme(theme: 'LIGHT' | 'DARK' = 'DARK') {
    this.theme = theme;
  }

  @action private setIsOutlinerOpen(value: boolean = true) {
    this.isOutlinerOpen = value;
  }

  @action private setIsInspectorOpen(value: boolean = false) {
    this.isInspectorOpen = value;
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
