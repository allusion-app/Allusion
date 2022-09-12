import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../contexts/StoreContext';

import { IconSet } from 'widgets';
import { ToolbarButton } from 'widgets/menus';
import { FileRemoval } from 'src/frontend/components/RemovalAlert';
import FileTagEditor from 'src/frontend/containers/AppToolbar/FileTagEditor';
import Searchbar from './Searchbar';
import { SortCommand, ViewCommand } from './Menus';

const OutlinerToggle = observer(() => {
  const { uiStore } = useStore();

  return (
    <ToolbarButton
      id="outliner-toggle"
      text="Toggle Outliner"
      icon={uiStore.isOutlinerOpen ? IconSet.DOUBLE_CARET : IconSet.MENU_HAMBURGER}
      controls="outliner"
      pressed={uiStore.isOutlinerOpen}
      onClick={uiStore.toggleOutliner}
      tabIndex={0}
    />
  );
});

const PrimaryCommands = observer(() => {
  const rootStore = useStore();

  return (
    <>
      <OutlinerToggle />
      <FileSelectionCommand />

      <Searchbar />

      {/* TODO: Put back tag button (or just the T hotkey) */}
      {rootStore.showsMissingContent ? (
        // Only show option to remove selected files in toolbar when viewing missing files */}
        <RemoveFilesPopover />
      ) : (
        // Only show when not viewing missing files (so it is replaced by the Delete button)
        <FileTagEditor />
      )}

      <SortCommand />

      <ViewCommand />
    </>
  );
});

export default PrimaryCommands;

export const SlideModeCommand = observer(() => {
  const { uiStore } = useStore();
  return (
    <>
      <ToolbarButton
        isCollapsible={false}
        icon={IconSet.ARROW_LEFT}
        onClick={uiStore.disableSlideMode}
        text="Back"
        tooltip="Back to content panel"
      />

      <div className="spacer" />

      <FileTagEditor />

      <ToolbarButton
        icon={IconSet.INFO}
        onClick={uiStore.toggleInspector}
        checked={uiStore.isInspectorOpen}
        text="Toggle the inspector panel"
        tooltip="Toggle the inspector panel"
      />
    </>
  );
});

const FileSelectionCommand = observer(() => {
  const { uiStore, fileStore } = useStore();
  const selectionCount = uiStore.fileSelection.size;
  const fileCount = fileStore.fileList.length;

  const allFilesSelected = fileCount > 0 && selectionCount === fileCount;
  // If everything is selected, deselect all. Else, select all
  const handleToggleSelect = () => {
    selectionCount === fileCount ? uiStore.clearFileSelection() : uiStore.selectAllFiles();
  };

  return (
    <ToolbarButton
      isCollapsible={false}
      icon={allFilesSelected ? IconSet.SELECT_ALL_CHECKED : IconSet.SELECT_ALL}
      onClick={handleToggleSelect}
      pressed={allFilesSelected}
      text={selectionCount}
      tooltip="Selects or deselects all images"
      disabled={fileCount === 0}
    />
  );
});

const RemoveFilesPopover = observer(() => {
  const { uiStore } = useStore();
  return (
    <>
      <ToolbarButton
        icon={IconSet.DELETE}
        disabled={uiStore.fileSelection.size === 0}
        onClick={uiStore.openToolbarFileRemover}
        text="Delete"
        tooltip="Delete selected missing images from library"
      />
      <FileRemoval />
    </>
  );
});
