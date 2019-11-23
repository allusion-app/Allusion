import path from 'path';
import fse from 'fs-extra';
import { action, observable, computed } from 'mobx';
import { remote, ipcRenderer } from 'electron';

import RootStore from '../stores/RootStore';
import { ClientFile, IFile } from '../../entities/File';
import { ID } from '../../entities/ID';
import { ClientTag } from '../../entities/Tag';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from '../../entities/TagCollection';
import View, { ViewMethod, ViewContent, ViewThumbnailSize } from './View';
import {
  ClientBaseCriteria,
  ClientArraySearchCriteria,
} from '../../entities/SearchCriteria';

export type FileSearchCriteria = ClientBaseCriteria<IFile>;
export const PREFERENCES_STORAGE_KEY = 'preferences';

interface IHotkeyMap {
  // Outerliner actions
  toggleOutliner: string;
  openOutlinerImport: string;
  openOutlinerTags: string;
  replaceQuery: string;

  // Inspector actions
  toggleInspector: string;
  toggleSettings: string;

  // Toolbar actions (these should only be active when the content area is focused)
  openTagSelector: string;
  deleteSelection: string;
  selectAll: string;
  deselectAll: string;
  viewList: string;
  viewGrid: string;
  viewMason: string;
  viewSlide: string;
  quickSearch: string;
  advancedSearch: string;
  closeSearch: string;

  // Other
  openPreviewWindow: string;
}

// https://blueprintjs.com/docs/#core/components/hotkeys.dialog
const defaultHotkeyMap: IHotkeyMap = {
  toggleOutliner: '1',
  toggleInspector: '2',
  openOutlinerImport: 'shift + 1',
  openOutlinerTags: 'shift + 2',
  replaceQuery: 'r',
  openTagSelector: 't',
  toggleSettings: 's',
  deleteSelection: 'del',
  selectAll: 'mod + a',
  deselectAll: 'mod + d',
  viewList: 'alt + 1',
  viewGrid: 'alt + 2',
  viewMason: 'alt + 3',
  viewSlide: 'alt + 4',
  quickSearch: 'mod + f',
  advancedSearch: 'mod + shift + f',
  openPreviewWindow: 'space',
  closeSearch: 'escape',
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
  'isFullScreen',
  'outlinerPage',
  'isOutlinerOpen',
  'isInspectorOpen',
  'thumbnailDirectory',
];

class UiStore {
  rootStore: RootStore;
  // View (Main Content)
  public view: View = new View();

  @observable isInitialized = false;

  // Theme
  @observable theme: 'LIGHT' | 'DARK' = 'DARK';

  // FullScreen
  @observable isFullScreen: boolean = false;

  // UI
  @observable outlinerPage: 'IMPORT' | 'TAGS' = 'TAGS';
  @observable isOutlinerOpen: boolean = true;
  @observable isInspectorOpen: boolean = false;
  @observable isSettingsOpen: boolean = false;
  @observable isToolbarTagSelectorOpen: boolean = false;
  @observable isToolbarFileRemoverOpen: boolean = false;
  @observable isOutlinerTagRemoverOpen: 'selection' | ID | null = null;
  @observable isPreviewOpen: boolean = false;
  @observable isQuickSearchOpen: boolean = false;
  @observable isAdvancedSearchOpen: boolean = false;
  @observable imageViewerFile: ClientFile | null = null;

  // Selections
  // Observable arrays recommended like this here https://github.com/mobxjs/mobx/issues/669#issuecomment-269119270
  readonly fileSelection = observable<ID>([]);
  readonly tagSelection = observable<ID>([]);

  readonly searchCriteriaList = observable<FileSearchCriteria>([]);

  @observable thumbnailDirectory: string = '';

  @observable hotkeyMap: IHotkeyMap = defaultHotkeyMap;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
  }

  @action.bound init() {
    this.isInitialized = true;
  }

  /////////////////// UI Actions ///////////////////
  @action.bound toggleOutliner() {
    this.setIsOutlinerOpen(!this.isOutlinerOpen);
  }

  @action.bound openOutlinerImport() {
    this.setOutlinerPage('IMPORT');
    if (!this.view.showsUntaggedContent) {
      this.viewUntaggedContent();
    }
  }
  @action.bound openOutlinerTags() {
    this.setOutlinerPage('TAGS');
    if (!this.view.showsAllContent) {
      this.viewAllContent();
    }
  }

  @action.bound openPreviewWindow() {
    ipcRenderer.send('sendPreviewFiles', this.fileSelection.toJS(), this.thumbnailDirectory);
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

  @action.bound toggleToolbarTagSelector() {
    this.isToolbarTagSelectorOpen = this.fileSelection.length > 0 && !this.isToolbarTagSelectorOpen;
  }

  @action.bound openToolbarTagSelector() {
    this.isToolbarTagSelectorOpen = this.fileSelection.length > 0;
  }

  @action.bound closeToolbarTagSelector() {
    this.isToolbarTagSelectorOpen = false;
  }

  @action.bound toggleToolbarFileRemover() {
    this.isToolbarFileRemoverOpen = this.fileSelection.length > 0 && !this.isToolbarFileRemoverOpen;
  }

  @action.bound openToolbarFileRemover() {
    this.isToolbarFileRemoverOpen = true;
  }

  @action.bound closeToolbarFileRemover() {
    this.isToolbarFileRemoverOpen = false;
  }

  @action.bound openOutlinerTagRemover(val?: 'selected' | ID) {
    this.isOutlinerTagRemoverOpen = val || 'selected';
  }

  @action.bound closeOutlinerTagRemover() {
    this.isOutlinerTagRemoverOpen = null;
  }

  @action.bound closePreviewWindow() {
    this.isPreviewOpen = false;
  }

  @computed get clientFileSelection(): ClientFile[] {
    return this.fileSelection
      .map((id) => this.rootStore.fileStore.get(id))
      .filter((f) => f !== undefined) as ClientFile[];
  }

  @computed get clientTagSelection(): ClientTag[] {
    return this.tagSelection
      .map((id) => this.rootStore.tagStore.get(id))
      .filter((t) => t !== undefined) as ClientTag[];
  }

  @action.bound setImageViewer(file: ClientFile | null) {
    this.imageViewerFile = file;
  }

  @action.bound setThumbnailDirectory(dir: string = '') {
    this.thumbnailDirectory = dir;
  }

  @action.bound orderFilesBy(prop: keyof IFile) {
    this.view.orderFilesBy(prop);
    this.refetch();
  }

  @action.bound switchFileOrder() {
    this.view.switchFileOrder();
    this.refetch();
  }

  @action.bound refetch() {
    if (this.view.showsAllContent) {
      this.rootStore.fileStore.fetchAllFiles();
    } else if (this.view.showsUntaggedContent) {
      this.rootStore.fileStore.fetchUntaggedFiles();
    } else if (this.view.showsQueryContent) {
      this.rootStore.fileStore.fetchFilesByQuery();
    }
  }

  /////////////////// Selection actions ///////////////////
  @action.bound selectFile(file: ClientFile, clear?: boolean) {
    if (clear) {
      this.clearFileSelection();
    }
    this.fileSelection.push(file.id);
  }

  @action.bound selectFiles(files: ID[], clear?: boolean) {
    if (clear) {
      this.clearFileSelection();
    }
    this.fileSelection.push(...files);
  }

  @action.bound deselectFile(file: ClientFile) {
    this.fileSelection.remove(file.id);
  }

  @action.bound clearFileSelection() {
    this.fileSelection.clear();
  }

  @action.bound selectAllFiles() {
    this.clearFileSelection();
    this.fileSelection.push(...this.rootStore.fileStore.fileList.map((f) => f.id));
  }

  @action.bound selectTag(tag: ClientTag, clear?: boolean) {
    if (clear) {
      this.clearTagSelection();
    }
    this.tagSelection.push(tag.id);
  }

  @action.bound selectTags(tags: ClientTag[] | ID[], clear?: boolean) {
    if (clear) {
      this.clearTagSelection();
    }
    if (tags.length === 0) {
      return;
    }
    if (tags[0] instanceof ClientTag) {
      this.tagSelection.push(
        ...(tags as ClientTag[])
          .filter((t) => !this.tagSelection.includes(t.id))
          .map((tag: ClientTag) => tag.id),
      );
    } else {
      this.tagSelection.push(...(tags as ID[]).filter((t) => !this.tagSelection.includes(t)));
    }
  }

  @action.bound deselectTags(tags: ClientTag[] | ID[]) {
    if (tags.length === 0) {
      return;
    }
    if (tags[0] instanceof ClientTag) {
      (tags as ClientTag[]).forEach((tag) => this.tagSelection.remove(tag.id));
    } else {
      (tags as ID[]).forEach((tag) => this.tagSelection.remove(tag));
    }
  }

  @action.bound deselectTag(tag: ClientTag | ID) {
    this.tagSelection.remove(tag instanceof ClientTag ? tag.id : tag);
  }

  @action.bound clearTagSelection() {
    this.tagSelection.clear();
  }

  @action.bound async removeSelectedTagsAndCollections() {
    const ctx = this.getTagContextItems();
    for (const col of ctx.collections) {
      if (col.id !== ROOT_TAG_COLLECTION_ID) {
        await col.delete();
      }
    }
    for (const tag of ctx.tags) {
      await tag.delete();
    }
  }

  @action.bound async moveTag(id: ID, target: ClientTag | ClientTagCollection) {
    const tag = this.rootStore.tagStore.get(id);
    if (!tag) {
      throw new Error('Cannot find tag to move ' + id);
    }

    if (target instanceof ClientTag) {
      // Insert the moved tag below the position of the current tag where it was dropped
      const insertionIndex = target.parent.tags.indexOf(target.id) + 1;
      target.parent.insertTag(tag, insertionIndex);
    } else {
      // Insert at start when dragging tag to collection
      target.insertTag(tag);
    }
  }

  @action.bound async moveCollection(id: ID, target: ClientTagCollection) {
    const collection = this.rootStore.tagCollectionStore.get(id);
    if (!collection) {
      throw new Error('Cannot find collection to move ' + id);
    }
    target.insertCollection(collection);
  }

  @action.bound async colorSelectedTagsAndCollections(activeElementId: ID, color: string) {
    const ctx = this.getTagContextItems(activeElementId);
    ctx.collections.forEach((col) => col.setColor(color));
    ctx.tags.forEach((tag) => tag.setColor(color));
  }

  /**
   * Returns the tags and tag collections that are in the context of an action,
   * e.g. all selected items when choosing to delete an item that is selected,
   * or only a single item when moving a single tag that is not selected.
   * @returns The collections and tags in the context. Tags belonging to collections in the context are not included,
   * but can be easily found by getting the tags from each collection.
   */
  @action.bound getTagContextItems(activeItemId?: ID) {
    const { tagStore, tagCollectionStore } = this.rootStore;

    // If no id was given, the context is the tag selection. Else, it might be a single tag/collection
    let isContextTheSelection = activeItemId === undefined;

    const contextTags: ClientTag[] = [];
    const contextCols: ClientTagCollection[] = [];

    // If an id is given, check whether it belongs to a tag or collection
    if (activeItemId) {
      const selectedTag = tagStore.get(activeItemId);
      if (selectedTag) {
        if (selectedTag.isSelected) {
          isContextTheSelection = true;
        } else {
          contextTags.push(selectedTag);
        }
      } else {
        const selectedCol = tagCollectionStore.get(activeItemId);
        if (selectedCol) {
          if (selectedCol.isSelected) {
            isContextTheSelection = true;
          } else {
            contextCols.push(selectedCol);
          }
        }
      }
    }

    // If no id is given or when the selected tag or collection is selected, the context is the whole selection
    if (isContextTheSelection) {
      const selectedCols = tagCollectionStore.tagCollectionList.filter((c) => c.isSelected);

      // root collection may not be present in the context
      const rootColIndex = selectedCols.findIndex((col) => col.id === ROOT_TAG_COLLECTION_ID);
      if (rootColIndex >= 0) {
        selectedCols.splice(rootColIndex, 1);
      }

      // Only include selected collections of which their parent is not selected
      const selectedColsNotInSelectedCols = selectedCols.filter(
        (col) => !selectedCols.some((parent) => parent.subCollections.includes(col.id)),
      );
      contextCols.push(...selectedColsNotInSelectedCols);

      // Only include the selected tags that are not in a selected collection
      const selectedTagsNotInSelectedCols = this.clientTagSelection.filter(
        (t) => !selectedCols.some((col) => col.tags.includes(t.id)),
      );
      contextTags.push(...selectedTagsNotInSelectedCols);
    }

    return {
      tags: contextTags,
      collections: contextCols,
    };
  }

  /**
   * @param targetId Where to move the selection to
   */
  @action.bound async moveSelectedTagItems(id: ID) {
    const { tagStore, tagCollectionStore } = this.rootStore;

    const target = tagStore.get(id) || tagCollectionStore.get(id);
    if (!target) {
      throw new Error('Invalid target to move to');
    }

    const targetCol = target instanceof ClientTag ? target.parent : target;

    // Find all tags + collections in the current context (all selected items)
    const ctx = this.getTagContextItems();

    // Move tags and collections
    ctx.collections.forEach((col) => targetCol.insertCollection(col));
    ctx.tags.forEach((tag) => targetCol.insertTag(tag));
  }

  /////////////////// Search Actions ///////////////////
  @action.bound openQuickSearch() {
    this.isQuickSearchOpen = true;
  }

  @action.bound async clearSearchCriteriaList() {
    this.searchCriteriaList.clear();
    this.viewAllContent();
  }

  @action.bound async searchByQuery() {
    await this.rootStore.fileStore.fetchFilesByQuery();
    this.cleanFileSelection();
    this.view.setContentQuery();
  }

  @action.bound async addSearchCriteria(query: Exclude<FileSearchCriteria, 'key'>) {
    // Remove empty array criteria if it already exists before adding the new one
    if (this.searchCriteriaList.length === 1 && this.searchCriteriaList[0].valueType === 'array') {
      if ((this.searchCriteriaList[0] as ClientArraySearchCriteria<IFile>).value.length === 0) {
        this.searchCriteriaList.clear();
      }
    }
    this.searchCriteriaList.push(query);
    this.view.setContentQuery();
  }

  @action.bound async removeSearchCriteria(query: FileSearchCriteria) {
    this.searchCriteriaList.remove(query);
  }

  @action.bound async removeSearchCriteriaByIndex(i: number) {
    this.searchCriteriaList.splice(i, 1);
  }

  @action.bound addTagsToCriteria(ids: ID[]) {
    this.addSearchCriteria(new ClientArraySearchCriteria<IFile>('tags', ids));
    this.openQuickSearch();
    this.searchByQuery();
  }

  @action.bound replaceCriteriaWithTags(ids: ID[]) {
    this.searchCriteriaList.replace([new ClientArraySearchCriteria<IFile>('tags', ids)]);
    this.view.setContentQuery();
    this.openQuickSearch();
    this.searchByQuery();
  }

  @action.bound replaceCriteriaWithTagSelection() {
    this.replaceCriteriaWithTags(this.tagSelection.toJS());
    this.searchByQuery();
    this.openQuickSearch();
  }

  @action.bound replaceCriteriaItem(oldCrit: FileSearchCriteria, crit: FileSearchCriteria) {
    const index = this.searchCriteriaList.indexOf(oldCrit);
    if (index !== -1) {
      this.searchCriteriaList[index] = crit;
    }
  }

  /////////////////// UI Actions ///////////////////
  @action.bound viewAllContent() {
    this.tagSelection.clear();
    this.rootStore.fileStore.fetchAllFiles();
    this.view.setContentAll();
    this.cleanFileSelection();
  }
  @action.bound viewUntaggedContent() {
    this.tagSelection.clear();
    this.rootStore.fileStore.fetchUntaggedFiles();
    this.view.setContentUntagged();
    this.cleanFileSelection();
  }
  @action.bound viewQueryContent() {
    this.tagSelection.clear();
    this.rootStore.fileStore.fetchFilesByQuery();
    this.view.setContentQuery();
    this.cleanFileSelection();

    if (this.isAdvancedSearchOpen) {
      this.toggleAdvancedSearch();
    }
  }

  @action.bound toggleTheme() {
    this.setTheme(this.theme === 'DARK' ? 'LIGHT' : 'DARK');
  }

  @action.bound toggleDevtools() {
    remote.getCurrentWebContents().toggleDevTools();
  }
  @action.bound reload() {
    remote.getCurrentWindow().reload();
  }
  @action.bound toggleFullScreen() {
    this.setIsFullScreen(!this.isFullScreen);
    remote.getCurrentWindow().setFullScreen(this.isFullScreen);
  }
  @action.bound toggleQuickSearch() {
    this.isQuickSearchOpen = !this.isQuickSearchOpen;
    if (this.isQuickSearchOpen) {
      if (this.searchCriteriaList.length === 0) {
        this.searchCriteriaList.push(new ClientArraySearchCriteria('tags'));
      }
    } else {
      this.clearSearchCriteriaList();
    }
  }
  @action.bound toggleAdvancedSearch() {
    this.isAdvancedSearchOpen = !this.isAdvancedSearchOpen;
    if (this.isAdvancedSearchOpen && !this.isQuickSearchOpen) {
      this.toggleQuickSearch();
    }
  }
  @action.bound closeSearch() {
    if (this.isQuickSearchOpen) {
      this.toggleQuickSearch();
    }
  }
  @action.bound openSearch() {
    if (!this.isQuickSearchOpen) {
      this.toggleQuickSearch();
    }
  }

  // Storing preferences
  recoverPersistentPreferences() {
    const prefsString = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (prefsString) {
      try {
        const prefs = JSON.parse(prefsString);
        this.setTheme(prefs.theme);
        this.setIsFullScreen(prefs.isFullScreen);
        this.setOutlinerPage(prefs.outlinerPage);
        this.setIsOutlinerOpen(prefs.isOutlinerOpen);
        this.setIsInspectorOpen(prefs.isInspectorOpen);
        this.setThumbnailDirectory(prefs.thumbnailDirectory);
        this.view.loadPreferences(prefs);
      } catch (e) {
        console.log('Cannot parse persistent preferences', e);
      }
    }

    // Set default thumbnail directory in case none was specified
    if (!this.thumbnailDirectory) {
      this.setThumbnailDirectory(path.join(remote.app.getPath('userData'), 'thumbnails'));
      fse.ensureDirSync(this.thumbnailDirectory);
    }
  }

  storePersistentPreferences() {
    let prefs: any = {};
    for (const field of PersistentPreferenceFields) {
      prefs[field] = this[field];
    }
    prefs = this.view.savePreferences(prefs);
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  }

  /////////////////// Helper methods ///////////////////
  /**
   * Deselect files that are not tagged with any tag in the current tag selection
   */
  @action private cleanFileSelection() {
    for (const file of this.clientFileSelection) {
      if (!file.tags.some((t) => this.tagSelection.includes(t))) {
        this.deselectFile(file);
      }
    }
  }

  @action private setTheme(theme: 'LIGHT' | 'DARK' = 'DARK') {
    this.theme = theme;
  }

  @action private setIsFullScreen(value: boolean = false) {
    this.isFullScreen = value;
  }

  @action private setOutlinerPage(page: 'IMPORT' | 'TAGS' = 'TAGS') {
    this.outlinerPage = page;
  }

  @action private setIsOutlinerOpen(value: boolean = true) {
    this.isOutlinerOpen = value;
  }

  @action private setIsInspectorOpen(value: boolean = false) {
    this.isInspectorOpen = value;
  }
}

export default UiStore;

export { ViewMethod, ViewContent, ViewThumbnailSize };
