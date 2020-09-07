import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { KeyCombo } from '@blueprintjs/core';
import IconSet from 'components/Icons';
import { Tooltip } from '.';
import {
  ToolbarButton,
  ToolbarToggleButton,
  ToolbarMenuButton,
  MenuFlyout,
  MenuRadioItem,
} from 'components';
import { IFile } from '../../../entities/File';
import FileTags from '../../components/FileTag';
import { FileOrder } from '../../../backend/DBRepository';
import { useContext } from 'react';
import StoreContext from '../../contexts/StoreContext';
import { FileRemoval } from 'src/renderer/frontend/components/RemovalAlert';
import Searchbar from '../ContentView/Searchbar';

interface IFileSelection {
  allFilesSelected: boolean;
  toggleSelection: () => void;
  selectionCount: number;
}

const FileSelection = observer(
  ({ allFilesSelected, toggleSelection: toggle, selectionCount }: IFileSelection) => (
    <ToolbarToggleButton
      showLabel="always"
      icon={allFilesSelected ? IconSet.SELECT_ALL_CHECKED : IconSet.SELECT_ALL}
      onClick={toggle}
      pressed={allFilesSelected}
      text={selectionCount}
      // tooltip={Tooltip.Select}
    />
  ),
);

const RemoveFilesPopover = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <>
      <ToolbarButton
        icon={IconSet.DELETE}
        disabled={uiStore.fileSelection.size === 0}
        onClick={uiStore.openToolbarFileRemover}
        text="Delete"
        // tooltip={Tooltip.Delete}
        // Giving it a warning intent will make it stand out more - it is usually hidden so it might not be obviously discovered
        // intent="warning"
      />
      <FileRemoval
        onClose={uiStore.closeToolbarFileRemover}
        object={uiStore.isToolbarFileRemoverOpen ? uiStore.clientFileSelection : []}
      />
    </>
  );
});

interface IFileFilter {
  fileOrder: FileOrder;
  orderBy: keyof IFile;
  orderFilesBy: (prop: keyof IFile) => void;
  switchFileOrder: () => void;
}

const sortMenuData: Array<{ prop: keyof IFile; icon: JSX.Element; text: string }> = [
  // { prop: 'tags', icon: IconSet.TAG, text: 'Tag' },
  { prop: 'name', icon: IconSet.FILTER_NAME_UP, text: 'Name' },
  { prop: 'extension', icon: IconSet.FILTER_FILE_TYPE, text: 'File type' },
  { prop: 'size', icon: IconSet.FILTER_FILTER_DOWN, text: 'File size' },
  { prop: 'dateAdded', icon: IconSet.FILTER_DATE, text: 'Date added' },
  { prop: 'dateModified', icon: IconSet.FILTER_DATE, text: 'Date modified' },
];

const FileFilter = observer(() => {
  const {
    fileStore: { fileOrder, orderBy, orderFilesBy, switchFileOrder },
  } = useContext(StoreContext);
  const orderIcon = fileOrder === 'DESC' ? IconSet.ARROW_DOWN : IconSet.ARROW_UP;
  return (
    <ToolbarMenuButton
      icon={IconSet.FILTER}
      text="Filter"
      // tooltip={Tooltip.Filter}
      id="__sort-menu"
      controls="__sort-options"
    >
      <MenuFlyout id="__sort-options" labelledby="__sort-menu" role="group">
        {sortMenuData.map(({ prop, icon, text }) => (
          <MenuRadioItem
            key={prop}
            icon={icon}
            text={text}
            checked={orderBy === prop}
            accelerator={orderBy === prop ? orderIcon : undefined}
            onClick={() => (orderBy === prop ? switchFileOrder() : orderFilesBy(prop))}
          />
        ))}
      </MenuFlyout>
    </ToolbarMenuButton>
  );
});

const LayoutOptions = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <ToolbarMenuButton
      icon={IconSet.THUMB_BG}
      text="View"
      // tooltip={Tooltip.View}
      id="__layout-menu"
      controls="__layout-options"
    >
      <MenuFlyout id="__layout-options" labelledby="__layout-menu" role="group">
        <MenuRadioItem
          icon={IconSet.VIEW_LIST}
          onClick={uiStore.setMethodList}
          checked={uiStore.isList}
          text="List View"
          accelerator={<KeyCombo minimal combo={uiStore.hotkeyMap.viewList} />}
        />
        <MenuRadioItem
          icon={IconSet.VIEW_GRID}
          onClick={uiStore.setMethodGrid}
          checked={uiStore.isGrid}
          text="Grid View"
          accelerator={<KeyCombo minimal combo={uiStore.hotkeyMap.viewGrid} />}
        />
      </MenuFlyout>
    </ToolbarMenuButton>
  );
});

const SlideModeToolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <ToolbarButton
      showLabel="always"
      icon={IconSet.ARROW_LEFT}
      onClick={uiStore.disableSlideMode}
      text="Return"
      // tooltip={Tooltip.Back}
    />
  );
});

const ContentToolbar = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);
  const { fileSelection } = uiStore;

  // If everything is selected, deselect all. Else, select all
  const handleToggleSelect = useCallback(
    () =>
      fileSelection.size > 0 && fileSelection.size === fileStore.fileList.length
        ? uiStore.clearFileSelection()
        : uiStore.selectAllFiles(),
    [fileSelection, fileStore.fileList, uiStore],
  );

  if (uiStore.isSlideMode) {
    return <SlideModeToolbar />;
  } else {
    return (
      <>
        <FileSelection
          allFilesSelected={
            fileSelection.size > 0 && fileSelection.size === fileStore.fileList.length
          }
          toggleSelection={handleToggleSelect}
          selectionCount={fileSelection.size}
        />

        {fileStore.content === 'missing' ? (
          // Only show option to remove selected files in toolbar when viewing missing files */}
          <RemoveFilesPopover />
        ) : (
          // Only show when not viewing missing files (so it is replaced by the Delete button)
          <FileTags files={fileSelection.size > 0 ? uiStore.clientFileSelection : []} />
        )}

        <FileFilter />

        <LayoutOptions />

        <Searchbar />
      </>
    );
  }
});

export default ContentToolbar;
