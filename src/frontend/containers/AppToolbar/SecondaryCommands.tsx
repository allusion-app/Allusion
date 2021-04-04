import React from 'react';
import { observer } from 'mobx-react-lite';

import UiStore from 'src/frontend/stores/UiStore';
import { IconSet } from 'widgets';
import { MenuButton, MenuItem } from 'widgets/menus';
import { KeyCombo } from 'src/frontend/components/KeyCombo';

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
        icon={IconSet.LOGO}
        // TODO: Maybe add as native menu option (mac-os?)
        onClick={() =>
          window.alert(
            // eslint-disable-next-line prettier/prettier
            'TODO: This application was made by [us]. It\'s open source. You can contribute here if you wanna [link]',
          )
        }
        text="About"
      />
    </MenuButton>
  );
});

export default SecondaryCommands;
