import React from 'react';
import { observer } from 'mobx-react-lite';

import { FileOrder } from 'src/backend/DBRepository';

import { IFile } from 'src/entities/File';

import { IconSet, KeyCombo } from 'widgets';
import { MenuButton, MenuRadioGroup, MenuRadioItem } from 'widgets/menus';
import { useStore } from 'src/frontend/contexts/StoreContext';

// Tooltip info
const enum Tooltip {
  View = 'Change view content panel',
  Filter = 'Sort view content panel',
}

export const SortCommand = () => {
  return (
    <MenuButton
      icon={IconSet.SORT}
      text="Sort"
      tooltip={Tooltip.Filter}
      id="__sort-menu"
      menuID="__sort-options"
    >
      <SortMenuItems />
    </MenuButton>
  );
};

export const ViewCommand = () => {
  return (
    <MenuButton
      icon={IconSet.THUMB_BG}
      text="View"
      tooltip={Tooltip.View}
      id="__layout-menu"
      menuID="__layout-options"
    >
      <LayoutMenuItems />
    </MenuButton>
  );
};

const sortMenuData: Array<{ prop: keyof IFile; icon: JSX.Element; text: string }> = [
  // { prop: 'tags', icon: IconSet.TAG, text: 'Tag' },
  { prop: 'name', icon: IconSet.FILTER_NAME_UP, text: 'Name' },
  { prop: 'absolutePath', icon: IconSet.FOLDER_OPEN, text: 'Path' },
  { prop: 'extension', icon: IconSet.FILTER_FILE_TYPE, text: 'File type' },
  { prop: 'size', icon: IconSet.FILTER_FILTER_DOWN, text: 'File size' },
  { prop: 'dateAdded', icon: IconSet.FILTER_DATE, text: 'Date added' },
  { prop: 'dateModified', icon: IconSet.FILTER_DATE, text: 'Date modified' },
  { prop: 'dateCreated', icon: IconSet.FILTER_DATE, text: 'Date created' },
];

export const SortMenuItems = observer(() => {
  const { fileStore } = useStore();
  const { fileOrder, orderBy, orderFilesBy, switchFileOrder } = fileStore;
  const orderIcon = fileOrder === FileOrder.Desc ? IconSet.ARROW_DOWN : IconSet.ARROW_UP;

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

export const LayoutMenuItems = observer(() => {
  const { uiStore } = useStore();
  return (
    <MenuRadioGroup>
      <MenuRadioItem
        icon={IconSet.VIEW_LIST}
        onClick={uiStore.setMethodList}
        checked={uiStore.isList}
        text="List"
        accelerator={<KeyCombo combo={uiStore.hotkeyMap.viewList} />}
      />
      <MenuRadioItem
        icon={IconSet.VIEW_GRID}
        onClick={uiStore.setMethodGrid}
        checked={uiStore.isGrid}
        text="Grid"
        accelerator={<KeyCombo combo={uiStore.hotkeyMap.viewGrid} />}
      />
      <MenuRadioItem
        icon={IconSet.VIEW_MASON}
        onClick={uiStore.setMethodMasonryVertical}
        checked={uiStore.isMasonryVertical}
        // TODO: "masonry" might not ring a bell to some people. Suggestions for a better name? "Flow", "Stream"?
        text="Vertical Masonry"
        accelerator={<KeyCombo combo={uiStore.hotkeyMap.viewMasonryVertical} />}
      />
      <MenuRadioItem
        icon={IconSet.VIEW_MASON}
        onClick={uiStore.setMethodMasonryHorizontal}
        checked={uiStore.isMasonryHorizontal}
        text="Horizontal Masonry"
        accelerator={<KeyCombo combo={uiStore.hotkeyMap.viewMasonryHorizontal} />}
      />
    </MenuRadioGroup>
  );
});

export const ThumbnailSizeMenuItems = observer(() => {
  const { uiStore } = useStore();
  return (
    <MenuRadioGroup>
      <MenuRadioItem
        icon={IconSet.THUMB_SM}
        onClick={uiStore.setThumbnailSmall}
        checked={uiStore.thumbnailSize === 'small'}
        text="Small"
      />
      <MenuRadioItem
        icon={IconSet.THUMB_MD}
        onClick={uiStore.setThumbnailMedium}
        checked={uiStore.thumbnailSize === 'medium'}
        text="Medium"
      />
      <MenuRadioItem
        icon={IconSet.THUMB_BG}
        onClick={uiStore.setThumbnailLarge}
        checked={uiStore.thumbnailSize === 'large'}
        text="Large"
      />
    </MenuRadioGroup>
  );
});
