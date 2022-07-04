export type HotkeyMap = {
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
};

export const enum ViewMethod {
  List,
  Grid,
  MasonryVertical,
  MasonryHorizontal,
}

export type ThumbnailSize = 'small' | 'medium' | 'large' | number;

export type ThumbnailShape = 'square' | 'letterbox';

export type HierarchicalSeparator = '|' | '/' | '\\' | ':';
