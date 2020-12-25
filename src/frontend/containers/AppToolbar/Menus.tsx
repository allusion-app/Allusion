import React from 'react';
import { observer } from 'mobx-react-lite';
import { KeyCombo } from '@blueprintjs/core';

import { FileOrder } from 'src/backend/DBRepository';

import { IFile } from 'src/entities/File';

import UiStore from 'src/frontend/stores/UiStore';
import FileStore from 'src/frontend/stores/FileStore';

import { IconSet } from 'widgets';
import { MenuButton, MenuRadioGroup, MenuRadioItem } from 'widgets/menus';

// Tooltip info
const enum Tooltip {
  View = 'Change view content panel',
  Filter = 'Sort view content panel',
}

export const SortCommand = ({ fileStore }: { fileStore: FileStore }) => {
  return (
    <MenuButton
      showLabel="never"
      icon={IconSet.FILTER}
      text="Sort"
      tooltip={Tooltip.Filter}
      id="__sort-menu"
      controls="__sort-options"
    >
      <SortMenuItems fileStore={fileStore} />
    </MenuButton>
  );
};

export const ViewCommand = ({ uiStore }: { uiStore: UiStore }) => {
  return (
    <MenuButton
      showLabel="never"
      icon={IconSet.THUMB_BG}
      text="View"
      tooltip={Tooltip.View}
      id="__layout-menu"
      controls="__layout-options"
    >
      <LayoutMenuItems uiStore={uiStore} />
    </MenuButton>
  );
};

const sortMenuData: Array<{ prop: keyof IFile; icon: JSX.Element; text: string }> = [
  // { prop: 'tags', icon: IconSet.TAG, text: 'Tag' },
  { prop: 'name', icon: IconSet.FILTER_NAME_UP, text: 'Name' },
  { prop: 'extension', icon: IconSet.FILTER_FILE_TYPE, text: 'File type' },
  { prop: 'size', icon: IconSet.FILTER_FILTER_DOWN, text: 'File size' },
  { prop: 'dateAdded', icon: IconSet.FILTER_DATE, text: 'Date added' },
  { prop: 'dateModified', icon: IconSet.FILTER_DATE, text: 'Date modified' },
  { prop: 'dateCreated', icon: IconSet.FILTER_DATE, text: 'Date created' },
];

export const SortMenuItems = observer(({ fileStore }: { fileStore: FileStore }) => {
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

export const LayoutMenuItems = observer(({ uiStore }: { uiStore: UiStore }) => {
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
