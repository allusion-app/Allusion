import { observable } from "mobx";
import RootStore from "./RootStore";

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
class UiState {
  rootStore: RootStore;

  @observable isSidebarOpen: boolean = true;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
  }
}

export default UiState;
