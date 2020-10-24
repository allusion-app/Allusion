import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import { IconSet } from 'components';
import {
  Toolbar as Commandbar,
  ToolbarToggleButton,
  ToolbarMenuButton,
  Menu,
  MenuItem,
  MenuCheckboxItem,
} from 'components/menu';
import ContentToolbar from './ContentToolbar';
import { KeyCombo } from '@blueprintjs/core';

// Tooltip info
export const enum Tooltip {
  Add = 'Toggle Add Panel',
  Outliner = 'Toggle Outliner',
  Search = 'Toggle Search Panel',
  Media = 'Number of files in library',
  Select = 'Selects or deselects all images',
  TagFiles = 'Quick add or delete tags to selection',
  Delete = 'Delete selected missing images from library',
  View = 'Change view content panel',
  Filter = 'Filter view content panel',
  Back = 'Back to Content panel',
  Preview = 'Open selected images in a preview window',
}

const isMac = process.platform === 'darwin';

const Toolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);

  return (
    <Commandbar
      id="toolbar"
      className={isMac ? 'mac-toolbar' : undefined}
      label="App Command Bar"
      controls="layout-container"
    >
      {/* <ToolbarToggleButton
        showLabel="never"
        icon={IconSet.OUTLINER}
        onClick={uiStore.toggleOutliner}
        pressed={uiStore.isOutlinerOpen}
        text="Outliner"
        tooltip={Tooltip.Outliner}
      /> */}

      <ContentToolbar />

      <ToolbarMenuButton
        showLabel="never"
        icon={IconSet.MORE}
        text="More"
        tooltip="See more"
        id="__secondary-menu"
        controls="__secondary-menu-options"
      >
        <Menu id="__secondary-menu-options" labelledby="__secondary-menu">
          <MenuCheckboxItem
            onClick={uiStore.toggleInspector}
            checked={uiStore.isInspectorOpen}
            text="Show Inspector"
            accelerator={<KeyCombo minimal combo={uiStore.hotkeyMap.toggleInspector} />}
          />
          <MenuItem
            icon={IconSet.SEARCH_EXTENDED}
            onClick={uiStore.toggleAdvancedSearch}
            text="Advanced Search"
            accelerator={<KeyCombo minimal combo={uiStore.hotkeyMap.advancedSearch} />}
          />
          <MenuItem
            icon={IconSet.HELPCENTER}
            onClick={uiStore.toggleHelpCenter}
            text="Help Center"
            accelerator={<KeyCombo minimal combo={uiStore.hotkeyMap.toggleHelpCenter} />}
          />
          <MenuItem
            icon={IconSet.SETTINGS}
            onClick={uiStore.toggleSettings}
            text="Settings"
            accelerator={<KeyCombo minimal combo={uiStore.hotkeyMap.toggleSettings} />}
          />
        </Menu>
      </ToolbarMenuButton>

      {isMac && <div id="window-resize-area" />}
    </Commandbar>
  );
});

export default Toolbar;
