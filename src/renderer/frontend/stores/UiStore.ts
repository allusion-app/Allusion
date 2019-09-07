import { action, observable, computed } from 'mobx';
import { remote, ipcRenderer } from 'electron';

import RootStore from './RootStore';
import { ClientFile, IFile } from '../../entities/File';
import { ID } from '../../entities/ID';
import { ClientTag } from '../../entities/Tag';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from '../../entities/TagCollection';
import { IArraySearchCriteria, SearchCriteria } from '../../entities/SearchCriteria';

interface IHotkeyMap {
  // Outerliner actions
  toggleOutliner: string;
  openOutlinerImport: string;
  openOutlinerTags: string;
  openOutlinerSearch: string;
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

  // Other
  openPreviewWindow: string;
}

// https://blueprintjs.com/docs/#core/components/hotkeys.dialog
const defaultHotkeyMap: IHotkeyMap = {
  toggleOutliner: '1',
  toggleInspector: '2',
  openOutlinerImport: 'shift + 1',
  openOutlinerTags: 'shift + 2',
  openOutlinerSearch: 'shift + 3',
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
  'viewMethod',
  'viewContent',
  'firstIndexInView',
  'fileOrder',
  'fileOrderDescending',
  'fileLayout',
  'thumbnailSize',
];

const PREFERENCES_STORAGE_KEY = 'preferences';

export type ViewMethod = 'list' | 'grid' | 'mason' | 'slide';
export type FileSearchCriteria = SearchCriteria<IFile>;

class UiStore {
  rootStore: RootStore;

  @observable isInitialized = false;

  // Theme
  @observable theme: 'LIGHT' | 'DARK' = 'DARK';

  // FullScreen
  @observable isFullScreen: boolean = false;

  // UI
  @observable outlinerPage: 'IMPORT' | 'TAGS' | 'SEARCH' = 'TAGS';
  @observable isOutlinerOpen: boolean = true;
  @observable isInspectorOpen: boolean = false;
  @observable isSettingsOpen: boolean = false;
  @observable isToolbarTagSelectorOpen: boolean = false;
  @observable isPreviewOpen: boolean = false;
  @observable isToolbarFileRemoverOpen: boolean = false;
  @observable isOutlinerTagRemoverOpen: 'selection' | ID | null = null;
  @observable isQuickSearchOpen: boolean = false;
  @observable isAdvancedSearchOpen: boolean = false;

  // VIEW
  @observable viewMethod: ViewMethod = 'grid';
  /** Index of the first item in the viewport */
  @observable firstIndexInView: number = 0;
  /** The origin of the current files that are shown */
  @observable viewContent: 'query' | 'all' | 'untagged' = 'all';
  @observable thumbnailSize: 'small' | 'medium' | 'large' = 'medium';

  // Content
  @observable fileOrder: keyof IFile = 'dateAdded';
  @observable fileOrderDescending = true;
  @observable fileLayout: 'LIST' | 'GRID' | 'MASONRY' | 'SLIDE' = 'GRID';
  @observable imageViewerFile: ClientFile | null = null;

  // Selections
  // Observable arrays recommended like this here https://github.com/mobxjs/mobx/issues/669#issuecomment-269119270
  readonly fileSelection = observable<ID>([]);
  readonly tagSelection = observable<ID>([]);

  readonly searchCriteriaList = observable<FileSearchCriteria>([]);

  @observable hotkeyMap: IHotkeyMap = defaultHotkeyMap;

  @computed get clientFileSelection(): ClientFile[] {
    return this.fileSelection.map((id) =>
      this.rootStore.fileStore.fileList.find((f) => f.id === id),
    ) as ClientFile[];
  }

  @computed get clientTagSelection(): ClientTag[] {
    return this.tagSelection.map((id) => this.rootStore.tagStore.getTag(id)) as ClientTag[];
  }

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
  }

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

  /////////////////// Selection actions ///////////////////
  @action.bound selectFile(file: ClientFile, clear?: boolean) {
    if (clear) {
      this.fileSelection.clear();
    }
    this.fileSelection.push(file.id);
  }

  @action.bound deselectFile(file: ClientFile) {
    this.fileSelection.remove(file.id);
  }

  @action.bound clearFileSelection() {
    this.fileSelection.clear();
  }

  @action.bound selectAllFiles() {
    this.fileSelection.clear();
    this.fileSelection.push(...this.rootStore.fileStore.fileList.map((f) => f.id));
  }

  @action.bound deselectAllFiles() {
    this.fileSelection.clear();
  }

  @action.bound selectTag(tag: ClientTag, clear?: boolean) {
    if (clear) {
      this.tagSelection.clear();
    }
    this.tagSelection.push(tag.id);
  }

  @action.bound selectTags(tags: ClientTag[] | ID[], clear?: boolean) {
    if (clear) {
      this.tagSelection.clear();
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

  @action.bound setFileOrder(prop: keyof IFile) {
    this.fileOrder = prop;
    this.rootStore.fileStore.fetchFilesByTagIDs(this.tagSelection.toJS());
  }

  @action.bound setFileOrderDescending(descending: boolean) {
    this.fileOrderDescending = descending;
    this.rootStore.fileStore.fetchFilesByTagIDs(this.tagSelection.toJS());
  }

  @action.bound async removeSelectedTagsAndCollections() {
    const { tagStore, tagCollectionStore } = this.rootStore;
    const ctx = this.getTagContextItems();
    for (const col of ctx.collections) {
      if (col.id !== ROOT_TAG_COLLECTION_ID) {
        await tagCollectionStore.removeTagCollection(col);
      }
    }
    for (const tag of ctx.tags) {
      await tagStore.removeTag(tag);
    }
  }

  @action.bound async moveTag(id: ID, target: ClientTag | ClientTagCollection) {
    const tag = this.rootStore.tagStore.getTag(id);
    if (!tag) {
      throw new Error('Cannot find tag to move ' + id);
    }
    this.reorderTagList(tag, target);
  }

  @action.bound async moveCollection(id: ID, target: ClientTagCollection) {
    const collection = this.rootStore.tagCollectionStore.getTagCollection(id);
    if (!collection) {
      throw new Error('Cannot find collection to move ' + id);
    }
    this.reorderCollection(collection, target);
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
      const selectedTag = tagStore.getTag(activeItemId);
      if (selectedTag) {
        if (selectedTag.isSelected) {
          isContextTheSelection = true;
        } else {
          contextTags.push(selectedTag);
        }
      } else {
        const selectedCol = tagCollectionStore.getTagCollection(activeItemId);
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

    const target = tagStore.getTag(id) || tagCollectionStore.getTagCollection(id);
    if (!target) {
      throw new Error('Invalid target to move to');
    }

    const targetCol = target instanceof ClientTag ? target.parent : target;

    // Find all tags + collections in the current context (all selected items)
    const ctx = this.getTagContextItems();

    // Move tags and collections
    ctx.collections.forEach((col) => this.reorderCollection(col, targetCol));
    ctx.tags.forEach((tag) => this.reorderTagList(tag, targetCol));
  }

  /////////////////// Search Actions ///////////////////
  @action.bound async clearSearchQueryList() {
    this.searchCriteriaList.clear();
    await this.viewContentAll();
  }

  @action.bound async searchByQuery() {
    await this.rootStore.fileStore.fetchFilesByQuery();
    this.cleanFileSelection();
  }

  @action.bound async addSearchQuery(query: Exclude<FileSearchCriteria, 'key'>) {
    this.searchCriteriaList.push(query);
    this.viewContent = 'query';
  }

  @action.bound async removeSearchQuery(query: FileSearchCriteria) {
    this.searchCriteriaList.remove(query);
  }

  @action.bound addTagsToQuery(ids: ID[]) {
    this.addSearchQuery({
      key: 'tags',
      valueType: 'array',
      operator: 'contains',
      value: ids,
    } as IArraySearchCriteria<IFile>);
  }

  @action.bound replaceQuery(ids: ID[]) {
    this.searchCriteriaList.clear();
    this.addTagsToQuery(ids);
  }

  @action.bound replaceQueryWithSelection() {
    this.replaceQuery(this.tagSelection.toJS());
    this.searchByQuery();
  }

  /////////////////// UI Actions ///////////////////
  @action.bound toggleOutliner() {
    this.isOutlinerOpen = !this.isOutlinerOpen;
  }

  @action.bound openOutlinerImport() {
    this.outlinerPage = 'IMPORT';
    this.viewContentUntagged();
  }
  @action.bound openOutlinerTags() {
    this.outlinerPage = 'TAGS';
    this.viewContentAll();
  }
  @action.bound openOutlinerSearch() {
    this.outlinerPage = 'SEARCH';
    this.viewContentQuery();
  }

  @action.bound openPreviewWindow() {
    ipcRenderer.send('sendPreviewFiles', this.fileSelection.toJS());
    this.isPreviewOpen = true;

    // remove focus from element so closing preview with spacebar does not trigger any ui elements
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  // VIEW
  @action.bound viewList() {
    this.viewMethod = 'list';
  }
  @action.bound viewGrid() {
    this.viewMethod = 'grid';
  }
  @action.bound viewMason() {
    this.viewMethod = 'mason';
  }
  @action.bound viewSlide() {
    this.viewMethod = 'slide';
  }

  @action.bound viewContentAll() {
    this.tagSelection.clear();
    this.rootStore.fileStore.fetchAllFiles();
    this.viewContent = 'all';
    this.cleanFileSelection();
  }
  @action.bound viewContentUntagged() {
    this.tagSelection.clear();
    this.rootStore.fileStore.fetchUntaggedFiles();
    this.viewContent = 'untagged';
    this.cleanFileSelection();
  }
  @action.bound viewContentQuery() {
    this.tagSelection.clear();
    this.rootStore.fileStore.fetchFilesByQuery();
    this.viewContent = 'query';
    this.cleanFileSelection();
  }

  @action.bound setFirstIndexInView(index: number) {
    if (isFinite(index)) {
      this.firstIndexInView = index;
    }
  }

  @action.bound toggleInspector() {
    this.isInspectorOpen = !this.isInspectorOpen;
  }
  @action.bound toggleSettings() {
    this.isSettingsOpen = !this.isSettingsOpen;
  }
  @action.bound toggleTheme() {
    this.theme = this.theme === 'DARK' ? 'LIGHT' : 'DARK';
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

  @action.bound toggleDevtools() {
    remote.getCurrentWebContents().toggleDevTools();
  }
  @action.bound reload() {
    remote.getCurrentWindow().reload();
  }
  @action.bound toggleFullScreen() {
    this.isFullScreen = !this.isFullScreen;
    remote.getCurrentWindow().setFullScreen(this.isFullScreen);
  }
  @action.bound toggleQuickSearch() {
    this.isQuickSearchOpen = !this.isQuickSearchOpen;
    if (this.isQuickSearchOpen) {
      if (this.searchCriteriaList.length === 0) {
        this.searchCriteriaList.push(
          { key: 'tags', operator: 'contains', valueType: 'array', value: [] });
      }
    } else {
      this.clearSearchQueryList();
    }
  }
  @action.bound toggleAdvancedSearch() {
    this.isAdvancedSearchOpen = !this.isAdvancedSearchOpen;
    if (this.isAdvancedSearchOpen && !this.isQuickSearchOpen) {
      this.toggleQuickSearch();
    }
  }

  /////////////////// Helper methods ///////////////////
  /**
   * Deselect files that are not tagged with any tag in the current tag selection
   */
  private cleanFileSelection() {
    for (const file of this.clientFileSelection) {
      if (!file.tags.some((t) => this.tagSelection.includes(t))) {
        this.deselectFile(file);
      }
    }
  }

  private reorderTagList(tag: ClientTag, target: ClientTag | ClientTagCollection) {
    tag.parent.tags.remove(tag.id);

    if (target instanceof ClientTag) {
      const targetTags = target.parent.tags;
      // Insert the moved tag below the position of the current tag where it was dropped
      const insertionIndex = targetTags.indexOf(target.id) + 1;
      targetTags.splice(insertionIndex, 0, tag.id);
    } else {
      // Insert at start when dragging tag to collection
      target.tags.unshift(tag.id);
    }
  }

  private reorderCollection(col: ClientTagCollection, target: ClientTagCollection) {
    col.parent.subCollections.remove(col.id);
    target.subCollections.unshift(col.id);
  }
}

export default UiStore;
