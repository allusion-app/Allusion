import React from 'react';
import { observer } from 'mobx-react-lite';

import UiStore from 'src/frontend/stores/UiStore';
import { IconSet, KeyCombo } from 'widgets';
import { MenuButton, MenuItem } from 'widgets/menus';
import { RendererMessenger } from 'src/Messaging';

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
        accelerator={<KeyCombo combo={uiStore.hotkeyMap.advancedSearch} />}
      />
      <MenuItem
        icon={IconSet.HELPCENTER}
        onClick={uiStore.toggleHelpCenter}
        text="Help Center"
        accelerator={<KeyCombo combo={uiStore.hotkeyMap.toggleHelpCenter} />}
      />
      <MenuItem
        icon={IconSet.SETTINGS}
        onClick={uiStore.toggleSettings}
        text="Settings"
        accelerator={<KeyCombo combo={uiStore.hotkeyMap.toggleSettings} />}
      />
      <MenuItem
        icon={IconSet.ARROW_UP}
        onClick={RendererMessenger.checkForUpdates}
        text="Check for updates"
      />
      <MenuItem icon={IconSet.LOGO} onClick={uiStore.toggleAbout} text="About" />
    </MenuButton>
  );
});

export default SecondaryCommands;
