import React from 'react';
import { KeyCombo } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import UiStore from 'src/frontend/stores/UiStore';

import { IconSet } from 'widgets';
import { ToolbarMenuButton, Menu, MenuItem, MenuCheckboxItem } from 'widgets/menus';

const SecondaryCommands = observer(({ uiStore }: { uiStore: UiStore }) => {
  return (
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
  );
});

export default SecondaryCommands;
