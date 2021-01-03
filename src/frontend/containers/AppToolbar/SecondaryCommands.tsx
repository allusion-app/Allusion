import { KeyCombo } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import React from 'react';
import UiStore from 'src/frontend/stores/UiStore';
import { IconSet } from 'widgets';
import { MenuButton, MenuItem } from 'widgets/menus';

const SecondaryCommands = observer(({ uiStore }: { uiStore: UiStore }) => {
  return (
    <MenuButton
      showLabel="never"
      icon={IconSet.MORE}
      text="More"
      tooltip="See more"
      id="__secondary-menu"
      menuID="__secondary-menu-options"
    >
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
    </MenuButton>
  );
});

export default SecondaryCommands;
