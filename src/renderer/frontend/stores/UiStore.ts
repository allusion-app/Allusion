import { action, observable, computed } from 'mobx';

import { ClientFile } from '../../entities/File';
import { ID } from '../../entities/ID';
import { ClientTag } from '../../entities/Tag';
import RootStore from './RootStore';

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
  rootStore: RootStore;

  // Theme
  @observable theme: 'LIGHT' | 'DARK' = 'DARK';

  // UI
  @observable outlinerPage: 'LOCATIONS' | 'TAGS' | 'SEARCH' = 'TAGS';
  @observable isInspectorOpen: boolean = true;
  @observable isSettingsOpen: boolean = false;

  // Selections
  // Observable arrays recommended like this here https://github.com/mobxjs/mobx/issues/669#issuecomment-269119270
  readonly fileSelection = observable<ID>([]);
  readonly tagSelection = observable<ID>([]);

  @computed get clientFileSelection(): ClientFile[] {
    return this.fileSelection.map((id) => this.rootStore.fileStore.fileList.find((f) => f.id === id)) as ClientFile[];
  }

  @computed get clientTagSelection(): ClientTag[] {
    return this.tagSelection.map((id) => this.rootStore.tagStore.tagList.find((t) => t.id === id)) as ClientTag[];
  }

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
  }

  @action selectFile(file: ClientFile) {
    this.fileSelection.push(file.id);
  }

  @action deselectFile(file: ClientFile) {
    this.fileSelection.remove(file.id);
  }

  @action selectTag(tag: ClientTag) {
    this.tagSelection.push(tag.id);
  }

  @action deselectTag(tag: ClientTag) {
    this.tagSelection.remove(tag.id);
  }
}

export default UiStore;
