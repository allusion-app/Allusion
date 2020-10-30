import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { KeyCombo } from '@blueprintjs/core';
import { Tooltip } from '.';
import { IconSet } from 'components';
import {
  ToolbarButton,
  ToolbarToggleButton,
  ToolbarMenuButton,
  Menu,
  MenuRadioGroup,
  MenuRadioItem,
} from 'components/menu';
import { IFile } from '../../../entities/File';
import { FileOrder } from '../../../backend/DBRepository';
import { FileRemoval } from 'src/renderer/frontend/components/RemovalAlert';
import Searchbar from './Searchbar';
import { runInAction } from 'mobx';
import UiStore from '../../stores/UiStore';
import FileStore from '../../stores/FileStore';

type FileStoreProp = { fileStore: FileStore };
type UiStoreProp = { uiStore: UiStore };

const FileSelection = observer(({ uiStore, fileStore }: UiStoreProp & FileStoreProp) => {
  const allFilesSelected = uiStore.fileSelection.size === fileStore.fileList.length;
  // If everything is selected, deselect all. Else, select all
  const handleToggleSelect = useCallback(() => {
    runInAction(() => {
      uiStore.fileSelection.size === fileStore.fileList.length
        ? uiStore.clearFileSelection()
        : uiStore.selectAllFiles();
    });
  }, [fileStore, uiStore]);

  return (
    <ToolbarToggleButton
      showLabel="always"
      icon={allFilesSelected ? IconSet.SELECT_ALL_CHECKED : IconSet.SELECT_ALL}
      onClick={handleToggleSelect}
      pressed={allFilesSelected}
      text={uiStore.fileSelection.size}
      tooltip={Tooltip.Select}
    />
  );
});

const RemoveFilesPopover = observer(({ uiStore }: UiStoreProp) => {
  return (
    <>
      <ToolbarButton
        icon={IconSet.DELETE}
        disabled={uiStore.fileSelection.size === 0}
        onClick={uiStore.openToolbarFileRemover}
        text="Delete"
        tooltip={Tooltip.Delete}
        // Giving it a warning intent will make it stand out more - it is usually hidden so it might not be obviously discovered
        // intent="warning"
      />
      <FileRemoval />
    </>
  );
});

const sortMenuData: Array<{ prop: keyof IFile; icon: JSX.Element; text: string }> = [
  // { prop: 'tags', icon: IconSet.TAG, text: 'Tag' },
  { prop: 'name', icon: IconSet.FILTER_NAME_UP, text: 'Name' },
  { prop: 'extension', icon: IconSet.FILTER_FILE_TYPE, text: 'File type' },
  { prop: 'size', icon: IconSet.FILTER_FILTER_DOWN, text: 'File size' },
  { prop: 'dateAdded', icon: IconSet.FILTER_DATE, text: 'Date added' },
  { prop: 'dateModified', icon: IconSet.FILTER_DATE, text: 'Date modified' },
  { prop: 'dateCreated', icon: IconSet.FILTER_DATE, text: 'Date created' },
];

export const SortMenuItems = observer(({ fileStore }: FileStoreProp) => {
  const { fileOrder, orderBy, orderFilesBy, switchFileOrder } = fileStore;
  const orderIcon = fileOrder === FileOrder.DESC ? IconSet.ARROW_DOWN : IconSet.ARROW_UP;

  return (
    <MenuRadioGroup>
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
    </MenuRadioGroup>
  );
});

export const LayoutMenuItems = observer(({ uiStore }: UiStoreProp) => {
  return (
    <MenuRadioGroup>
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
    </MenuRadioGroup>
  );
});

const ContentToolbar = observer(({ uiStore, fileStore }: UiStoreProp & FileStoreProp) => {
  if (uiStore.isSlideMode) {
    return (
      <ToolbarButton
        showLabel="always"
        icon={IconSet.ARROW_LEFT}
        onClick={uiStore.disableSlideMode}
        text="Return"
        tooltip={Tooltip.Back}
      />
    );
  } else {
    return (
      <>
        <FileSelection uiStore={uiStore} fileStore={fileStore} />

        <Searchbar />

        {/* TODO: Put back tag button (or just the T hotkey) */}
        {fileStore.showsMissingContent ? (
          // Only show option to remove selected files in toolbar when viewing missing files */}
          <RemoveFilesPopover uiStore={uiStore} />
        ) : (
          // Only show when not viewing missing files (so it is replaced by the Delete button)
          // <FileTags files={fileSelection.size > 0 ? uiStore.clientFileSelection : []} />
          // Doesn't exist anymore :(
          // <TagFilesPopover
          //   files={uiStore.clientFileSelection}
          //   disabled={fileSelection.length <= 0 || fileStore.fileList.length <= 0}
          //   isOpen={uiStore.isToolbarTagSelectorOpen}
          //   close={uiStore.closeToolbarTagSelector}
          //   toggle={uiStore.toggleToolbarTagSelector}
          //   hidden={fileStore.content === 'missing'}
          // />
          <></>
        )}

        <ToolbarMenuButton
          showLabel="never"
          icon={IconSet.FILTER}
          text="Sort"
          tooltip={Tooltip.Filter}
          id="__sort-menu"
          controls="__sort-options"
        >
          <Menu id="__sort-options" labelledby="__sort-menu">
            <SortMenuItems fileStore={fileStore} />
          </Menu>
        </ToolbarMenuButton>

        <ToolbarMenuButton
          showLabel="never"
          icon={IconSet.THUMB_BG}
          text="View"
          tooltip={Tooltip.View}
          id="__layout-menu"
          controls="__layout-options"
        >
          <Menu id="__layout-options" labelledby="__layout-menu">
            <LayoutMenuItems uiStore={uiStore} />
          </Menu>
        </ToolbarMenuButton>
      </>
    );
  }
});

export default ContentToolbar;
