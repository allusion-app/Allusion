import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

import { OrderBy, OrderDirection } from 'src/api/data-storage-search';
import { FileDTO } from 'src/api/file';
import { IconSet, KeyCombo } from 'widgets';
import { MenuButton, MenuRadioGroup, MenuRadioItem } from 'widgets/menus';
import { getThumbnailSize } from '../ContentView/utils';
import { MenuDivider, MenuSliderItem } from 'widgets/menus/menu-items';
import { useStore } from 'src/frontend/contexts/StoreContext';

// Tooltip info
const enum Tooltip {
  View = 'Change view content panel',
  Filter = 'Sort view content panel',
}

export const SortCommand = () => {
  const { t } = useTranslation();
  return (
    <MenuButton
      icon={IconSet.SORT}
      text={t('app.sort', 'Sort')}
      tooltip={t('toolbar.sortTooltip', Tooltip.Filter)}
      id="__sort-menu"
      menuID="__sort-options"
    >
      <SortMenuItems />
    </MenuButton>
  );
};

export const ViewCommand = () => {
  const { t } = useTranslation();
  return (
    <MenuButton
      icon={IconSet.THUMB_BG}
      text={t('app.view', 'View')}
      tooltip={t('toolbar.viewTooltip', Tooltip.View)}
      id="__layout-menu"
      menuID="__layout-options"
    >
      <LayoutMenuItems />

      <MenuDivider />

      <ThumbnailSizeSliderMenuItem />
    </MenuButton>
  );
};

const sortMenuData: Array<{
  prop: OrderBy<FileDTO>;
  icon: JSX.Element;
  text: string;
  hideDirection?: boolean;
}> = [
  // { prop: 'tags', icon: IconSet.TAG, text: 'Tag' },
  { prop: 'name', icon: IconSet.FILTER_NAME_UP, text: 'Name' },
  { prop: 'absolutePath', icon: IconSet.FOLDER_OPEN, text: 'Path' },
  { prop: 'extension', icon: IconSet.FILTER_FILE_TYPE, text: 'File type' },
  { prop: 'size', icon: IconSet.FILTER_FILTER_DOWN, text: 'File size' },
  { prop: 'dateAdded', icon: IconSet.FILTER_DATE, text: 'Date added' },
  { prop: 'dateModified', icon: IconSet.FILTER_DATE, text: 'Date modified' },
  { prop: 'dateCreated', icon: IconSet.FILTER_DATE, text: 'Date created' },
  { prop: 'random', icon: IconSet.RELOAD_COMPACT, text: 'Random', hideDirection: true },
];

export const SortMenuItems = observer(() => {
  const { t } = useTranslation();
  const { fileStore } = useStore();
  const { orderDirection: fileOrder, orderBy, orderFilesBy, switchOrderDirection } = fileStore;
  const orderIcon = fileOrder === OrderDirection.Desc ? IconSet.ARROW_DOWN : IconSet.ARROW_UP;

  const keyMap: Record<string, string> = {
    name: 'sort.name',
    absolutePath: 'sort.path',
    extension: 'sort.fileType',
    size: 'sort.fileSize',
    dateAdded: 'sort.dateAdded',
    dateModified: 'sort.dateModified',
    dateCreated: 'sort.dateCreated',
    random: 'sort.random',
  };

  return (
    <MenuRadioGroup>
      {sortMenuData.map(({ prop, icon, text, hideDirection }) => (
        <MenuRadioItem
          key={prop}
          icon={icon}
          text={t(keyMap[prop] || 'sort.name', text)}
          checked={orderBy === prop}
          accelerator={orderBy === prop && !hideDirection ? orderIcon : undefined}
          onClick={() => (orderBy === prop ? switchOrderDirection() : orderFilesBy(prop))}
        />
      ))}
    </MenuRadioGroup>
  );
});

const thumbnailSizeOptions = [
  { value: 128 },
  { value: 208, label: 'Small' },
  { value: 288 },
  { value: 368, label: 'Medium' },
  { value: 448 },
  { value: 528, label: 'Large' },
  { value: 608 },
];

export const LayoutMenuItems = observer(() => {
  const { uiStore } = useStore();
  const { t } = useTranslation();
  return (
    <MenuRadioGroup>
      <MenuRadioItem
        icon={IconSet.VIEW_LIST}
        onClick={uiStore.setMethodList}
        checked={uiStore.isList}
        text={t('layout.list', 'List')}
        accelerator={<KeyCombo combo={uiStore.hotkeyMap.viewList} />}
      />
      <MenuRadioItem
        icon={IconSet.VIEW_GRID}
        onClick={uiStore.setMethodGrid}
        checked={uiStore.isGrid}
        text={t('layout.grid', 'Grid')}
        accelerator={<KeyCombo combo={uiStore.hotkeyMap.viewGrid} />}
      />
      <MenuRadioItem
        icon={IconSet.VIEW_MASONRY_V}
        onClick={uiStore.setMethodMasonryVertical}
        checked={uiStore.isMasonryVertical}
        // TODO: "masonry" might not ring a bell to some people. Suggestions for a better name? "Flow", "Stream"?
        text={t('layout.verticalMasonry', 'Vertical Masonry')}
        accelerator={<KeyCombo combo={uiStore.hotkeyMap.viewMasonryVertical} />}
      />
      <MenuRadioItem
        icon={IconSet.VIEW_MASONRY_H}
        onClick={uiStore.setMethodMasonryHorizontal}
        checked={uiStore.isMasonryHorizontal}
        text={t('layout.horizontalMasonry', 'Horizontal Masonry')}
        accelerator={<KeyCombo combo={uiStore.hotkeyMap.viewMasonryHorizontal} />}
      />
    </MenuRadioGroup>
  );
});

export const ThumbnailSizeSliderMenuItem = observer(() => {
  const { uiStore } = useStore();
  const { t } = useTranslation();

  const options = thumbnailSizeOptions.map((o) => ({
    ...o,
    label: o.label ? t(`thumbnail.${o.label.toLowerCase()}`, o.label) : undefined,
  }));

  return (
    <MenuSliderItem
      value={getThumbnailSize(uiStore.thumbnailSize)}
      label={t('thumbnail.size', 'Thumbnail size')}
      onChange={uiStore.setThumbnailSize}
      id="thumbnail-sizes"
      options={options}
      min={thumbnailSizeOptions[0].value}
      max={thumbnailSizeOptions[thumbnailSizeOptions.length - 1].value}
      step={20}
    />
  );
});
