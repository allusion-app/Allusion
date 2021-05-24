import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';
import StoreContext from '../../contexts/StoreContext';

import UiStore from 'src/frontend/stores/UiStore';
import FileStore from 'src/frontend/stores/FileStore';
import { IconSet } from 'widgets';
import { ToolbarButton, ToolbarToggleButton } from 'widgets/menus';
import { FileRemoval } from 'src/frontend/components/RemovalAlert';
import TagFilesPopover from 'src/frontend/containers/AppToolbar/TagFilesPopover';
import Searchbar from './Searchbar';
import { SortCommand, ViewCommand } from './Menus';

// Tooltip info
export const enum Tooltip {
  TagFiles = 'Quick add or delete tags to selection',
  Select = 'Selects or deselects all images',
  Delete = 'Delete selected missing images from library',
  Inspector = 'Toggle the inspector panel',
  Back = 'Back to content panel',
}

const OutlinerToggle = observer(() => {
  const { uiStore } = useContext(StoreContext);

  return (
    <button
      autoFocus
      id="outliner-toggle"
      className="btn toolbar-button"
      aria-controls="outliner"
      aria-pressed={uiStore.preferences.isOutlinerOpen}
      onClick={uiStore.toggleOutliner}
      tabIndex={0}
    >
      <span className="btn-content-icon" aria-hidden="true">
        {uiStore.preferences.isOutlinerOpen ? IconSet.DOUBLE_CARET : IconSet.MENU_HAMBURGER}
      </span>
      <span className="btn-content-text hidden">Toggle Outliner</span>
    </button>
  );
});

const PrimaryCommands = observer((props: { uiStore: UiStore; fileStore: FileStore }) => {
  const { uiStore, fileStore } = props;

  return (
    <>
      <OutlinerToggle />
      <FileSelectionCommand fileStore={fileStore} />

      <Searchbar />

      {/* TODO: Put back tag button (or just the T hotkey) */}
      {uiStore.showsMissingContent ? (
        // Only show option to remove selected files in toolbar when viewing missing files */}
        <RemoveFilesPopover uiStore={uiStore} fileStore={fileStore} />
      ) : (
        // Only show when not viewing missing files (so it is replaced by the Delete button)
        <TagFilesPopover />
      )}

      <SortCommand uiStore={uiStore} />

      <ViewCommand uiStore={uiStore} />
    </>
  );
});

export default PrimaryCommands;

export const SlideModeCommand = observer(({ uiStore }: { uiStore: UiStore }) => {
  return (
    <>
      <ToolbarButton
        showLabel="always"
        icon={IconSet.ARROW_LEFT}
        onClick={uiStore.disableSlideMode}
        text="Back"
        tooltip={Tooltip.Back}
      />

      <div className="spacer" />

      <ToolbarButton
        showLabel="never"
        icon={IconSet.INFO}
        onClick={uiStore.toggleInspector}
        checked={uiStore.preferences.isInspectorOpen}
        text={Tooltip.Inspector}
        tooltip={Tooltip.Inspector}
      />
    </>
  );
});

const FileSelectionCommand = observer((props: { fileStore: FileStore }) => {
  const { fileStore } = props;
  const selectionCount = fileStore.selection.size;
  const fileCount = fileStore.fileList.length;

  const allFilesSelected = fileCount > 0 && selectionCount === fileCount;
  // If everything is selected, deselect all. Else, select all
  const handleToggleSelect = () => {
    selectionCount === fileCount ? fileStore.deselectAll() : fileStore.selectAll();
  };

  return (
    <ToolbarToggleButton
      showLabel="always"
      icon={allFilesSelected ? IconSet.SELECT_ALL_CHECKED : IconSet.SELECT_ALL}
      onClick={handleToggleSelect}
      pressed={allFilesSelected}
      text={selectionCount}
      tooltip={Tooltip.Select}
      disabled={fileCount === 0}
    />
  );
});

const RemoveFilesPopover = observer((props: { uiStore: UiStore; fileStore: FileStore }) => {
  const { uiStore, fileStore } = props;
  return (
    <>
      <ToolbarButton
        icon={IconSet.DELETE}
        disabled={fileStore.selection.size === 0}
        onClick={uiStore.openToolbarFileRemover}
        text="Delete"
        tooltip={Tooltip.Delete}
      />
      <FileRemoval />
    </>
  );
});
