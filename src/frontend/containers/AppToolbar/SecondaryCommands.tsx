import React from 'react';
import { observer } from 'mobx-react-lite';

import { IconSet, KeyCombo } from 'widgets';
import { MenuButton, MenuItem, MenuSubItem } from 'widgets/menus';
import { RendererMessenger } from 'src/Messaging';
import { ThumbnailSizeMenuItems } from './Menus';
import { useStore } from 'src/frontend/contexts/StoreContext';

const SecondaryCommands = observer(() => {
  const { uiStore } = useStore();
  return (
    <MenuButton
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
      <MenuSubItem icon={IconSet.THUMB_MD} text="Thumbnail size">
        <ThumbnailSizeMenuItems />
      </MenuSubItem>
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
        icon={IconSet.RELOAD}
        onClick={RendererMessenger.checkForUpdates}
        text="Check for updates"
      />
      <MenuItem icon={IconSet.LOGO} onClick={uiStore.toggleAbout} text="About" />
    </MenuButton>
  );
});

export default SecondaryCommands;
