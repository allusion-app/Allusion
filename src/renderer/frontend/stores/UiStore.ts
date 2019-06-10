import { action, observable, computed } from 'mobx';

import { ClientFile, IFile } from '../../entities/File';
import { ID } from '../../entities/ID';
import { ClientTag } from '../../entities/Tag';
import RootStore from './RootStore';
import { remote } from 'electron';
import { ClientTagCollection } from '../../entities/TagCollection';

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
  deleteSelectedFiles: string;
  selectAllFiles: string;
  deselectAllFiles: string;
  viewList: string;
  viewGrid: string;
  viewMason: string;
  viewSlide: string;
}

const defaultHotkeyMap: IHotkeyMap = {
  toggleOutliner: '1',
  toggleInspector: '2',
  openOutlinerImport: 'shift + 1',
  openOutlinerTags: 'shift + 2',
  openOutlinerSearch: 'shift + 3',
  replaceQuery: 'r',
  openTagSelector: 't',
  toggleSettings: 's',
  deleteSelectedFiles: 'del',
  selectAllFiles: 'mod + a',
  deselectAllFiles: 'mod + d',
  viewList: 'alt + 1',
  viewGrid: 'alt + 2',
  viewMason: 'alt + 3',
  viewSlide: 'alt + 4',
};

type SearchQueryAction = 'include' | 'exclude';
type SearchQueryOperator = 'and' | 'or';
interface ISearchQuery {
  action: SearchQueryAction;
  /** Operator between previous query and this query */
  operator: SearchQueryOperator;
}

export interface ITagSearchQuery extends ISearchQuery {
  value: ID[];
}
// interface IFilenameSearchQuery extends ISearchQuery {
//   value: string;
// }
// interface IFilenameSearchQuery extends ISearchQuery {
//   value: string;
// }

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

export type ViewMethod = 'list' | 'grid' | 'mason' | 'slide';

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
  @observable isInspectorOpen: boolean = true;
  @observable isSettingsOpen: boolean = false;
  @observable isToolbarTagSelectorOpen: boolean = false;
  @observable isToolbarFileRemoverOpen: boolean = false;
  @observable isOutlinerTagRemoverOpen: 'selection' | ID | null = null;

  // VIEW
  @observable viewMethod: ViewMethod = 'grid';
  /** Index of the first item in the viewport */
  @observable firstIndexInView: number = 0;
  /** The origin of the current files that are shown */
  @observable viewContent: 'query' | 'all' | 'untagged' = 'all';

  // Content
  @observable fileOrder: keyof IFile = 'dateAdded';
  @observable fileOrderDescending = true;
  @observable fileLayout: 'LIST' | 'GRID' | 'MASONRY' | 'SLIDE' = 'GRID';

  // Selections
  // Observable arrays recommended like this here https://github.com/mobxjs/mobx/issues/669#issuecomment-269119270
  readonly fileSelection = observable<ID>([]);
  readonly tagSelection = observable<ID>([]);

  readonly searchQueryList = observable<ISearchQuery>([]);

  @observable hotkeyMap: IHotkeyMap = defaultHotkeyMap;

  @computed get clientFileSelection(): ClientFile[] {
    return this.fileSelection.map((id) =>
      this.rootStore.fileStore.fileList.find((f) => f.id === id),
    ) as ClientFile[];
  }

  @computed get clientTagSelection(): ClientTag[] {
    return this.tagSelection.map((id) =>
      this.rootStore.tagStore.tagList.find((t) => t.id === id),
    ) as ClientTag[];
  }

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
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
    this.fileSelection.push(
      ...this.rootStore.fileStore.fileList.map((f) => f.id),
    );
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
          .map((tag: ClientTag) => tag.id));
    } else {
      this.tagSelection.push(
        ...(tags as ID[])
          .filter((t) => !this.tagSelection.includes(t)));
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
    // Remove tag collections
    const allCollectionIds = tagCollectionStore.tagCollectionList.map((c) => c.id);
    for (const colId of allCollectionIds) {
      const selectedCol = tagCollectionStore.tagCollectionList.find((c) => c.id === colId);
      if (selectedCol && selectedCol.isSelected) {
        await tagCollectionStore.removeTagCollection(selectedCol);
      }
    }
    // Remove left over tags (if any)
    const selectedTagIds = this.tagSelection.toJS();
    for (const tagId of selectedTagIds) {
      const selectedTag = tagStore.tagList.find((t) => t.id === tagId);
      if (selectedTag) {
        await tagStore.removeTag(selectedTag);
      }
    }
  }

  @action.bound async moveTag(tag: ClientTag | ID, target: ClientTag | ClientTagCollection, insertAtStart?: boolean) {
    if (!(tag instanceof ClientTag)) {
      const clientTag = this.rootStore.tagStore.tagList.find((t) => t.id === tag);
      if (clientTag) {
        tag = clientTag;
      } else {
        throw new Error('Cannot find tag to move ' + tag);
      }
    }

    tag.parent.tags.remove(tag.id);

    if (target instanceof ClientTag) {
      const targetCol = target.parent;
      const insertionIndex = targetCol.tags.indexOf(target.id);
      // Insert the moved tag to the position of the current tag where it was dropped
      targetCol.tags.splice(insertionIndex, 0, tag.id);
    } else {
      if (insertAtStart) {
        target.tags.splice(0, 0, tag.id);
      } else {
        target.tags.push(tag.id);
      }
    }
  }

  @action.bound async moveCollection(
    col: ClientTagCollection | ID, target: ClientTagCollection,
    insertAtStart?: boolean,
  ) {
    if (!(col instanceof ClientTagCollection)) {
      const clientCol = this.rootStore.tagCollectionStore.tagCollectionList.find((c) => c.id === col);
      if (clientCol) {
        col = clientCol;
      } else {
        throw new Error('Cannot find collection to move ' + col);
      }
    }

    col.parent.subCollections.remove(col.id);

    if (insertAtStart) {
      target.subCollections.splice(0, 0, col.id);
    } else {
      target.subCollections.push(col.id);
    }
  }

  /**
   * @param target Where to move the selection to
   * @param insertAtStart Whether to insert at the start, or the end
   */
  @action.bound async moveSelectedTagsAndCollections(targetId: ID, insertAtStart?: boolean) {
    const { tagStore, tagCollectionStore } = this.rootStore;

    // Todo: support moving unselected tag/collection

    const target = tagStore.tagList.find((tag) => tag.id === targetId)
      || tagCollectionStore.tagCollectionList.find((col) => col.id === targetId);

    if (!target) {
      throw new Error('Invalid target to move to');
    }

    const targetCol = target instanceof ClientTag ? target.parent : target;

    const selectedCols: ClientTagCollection[] = [];
    // Move collections
    const allCollectionIds = tagCollectionStore.tagCollectionList.map((c) => c.id);
    for (const colId of allCollectionIds) {
      const col = tagCollectionStore.tagCollectionList.find((c) => c.id === colId);
      if (col && col.isSelected) {
        selectedCols.push(col);
        const parent = tagCollectionStore.tagCollectionList.find((c) => c.subCollections.includes(colId));
        if (parent) {
          parent.subCollections.remove(colId);
          if (insertAtStart) {
            targetCol.subCollections.splice(0, 0, colId);
          } else {
            targetCol.subCollections.push(colId);
          }
        }
      }
    }

    // Move tags that are not in those collections
    const selectedTagsNotInSelectedCols = this.tagSelection.filter(
      (t) => !selectedCols.some((col) => col.getTagsRecursively().includes(t)));

    selectedTagsNotInSelectedCols.forEach((tagId) => {
      // Find original collection
      const parent = tagCollectionStore.tagCollectionList.find((c) => c.tags.includes(tagId));
      if (!parent) { return console.error('Could not find original collection when moving tag', tagId); }
      // Remove from orig collection
      parent.removeTag(tagId);
      // Find where to insert the moved tag
      if (target instanceof ClientTag) {
        const insertionIndex = targetCol.tags.indexOf(target.id);
        // Insert the moved tag to the position of the current tag where it was dropped
        targetCol.tags.splice(insertionIndex, 0, tagId);
      } else {
        if (insertAtStart) {
          targetCol.tags.splice(0, 0, tagId);
        } else {
          targetCol.tags.push(tagId);
        }
      }
    });
  }

  /////////////////// Search Actions ///////////////////
  @action.bound async clearSearchQueryList() {
    this.searchQueryList.clear();
    await this.viewContentAll();
  }

  @action.bound async addSearchQuery(query: ISearchQuery) {
    this.searchQueryList.push(query);
    await this.rootStore.fileStore.fetchFilesByQuery();
    this.cleanFileSelection();
    this.viewContent = 'query';
  }

  @action.bound async removeSearchQuery(query: ISearchQuery) {
    this.searchQueryList.remove(query);
    await this.rootStore.fileStore.fetchFilesByQuery();
    this.cleanFileSelection();
  }

  @action.bound addTagsToQuery(ids: ID[]) {
    this.addSearchQuery({
      action: 'include',
      operator: 'or',
      value: ids,
    } as ITagSearchQuery);
  }

  @action.bound replaceQuery(ids: ID[]) {
    this.searchQueryList.clear();
    this.addTagsToQuery(ids);
  }

  @action.bound replaceQueryWithSelection() {
    this.replaceQuery(this.tagSelection.toJS());
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
    this.isToolbarTagSelectorOpen =
      this.fileSelection.length > 0 && !this.isToolbarTagSelectorOpen;
  }
  @action.bound openToolbarTagSelector() {
    this.isToolbarTagSelectorOpen = this.fileSelection.length > 0;
  }
  @action.bound closeToolbarTagSelector() {
    this.isToolbarTagSelectorOpen = false;
  }

  @action.bound toggleToolbarFileRemover() {
    this.isToolbarFileRemoverOpen =
      this.fileSelection.length > 0 && !this.isToolbarFileRemoverOpen;
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
}

export default UiStore;
