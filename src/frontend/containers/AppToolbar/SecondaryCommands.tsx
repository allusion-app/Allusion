import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

import { IconSet, KeyCombo } from 'widgets';
import { MenuButton, MenuItem } from 'widgets/menus';
import { RendererMessenger } from 'src/ipc/renderer';
import { useStore } from 'src/frontend/contexts/StoreContext';

const SecondaryCommands = observer(() => {
  const { uiStore } = useStore();
  const { t } = useTranslation();
  return (
    <MenuButton
      icon={IconSet.MORE}
      text={t('app.more')}
      tooltip={t('app.more')}
      id="__secondary-menu"
      menuID="__secondary-menu-options"
    >
      <MenuItem
        icon={IconSet.SEARCH_EXTENDED}
        onClick={uiStore.toggleAdvancedSearch}
        text={t('app.advancedSearch', 'Advanced Search')}
        accelerator={<KeyCombo combo={uiStore.hotkeyMap.advancedSearch} />}
      />
      <MenuItem
        icon={IconSet.HELPCENTER}
        onClick={uiStore.toggleHelpCenter}
        text={t('app.helpCenter')}
        accelerator={<KeyCombo combo={uiStore.hotkeyMap.toggleHelpCenter} />}
      />
      <MenuItem
        icon={IconSet.SETTINGS}
        onClick={uiStore.toggleSettings}
        text={t('app.settings')}
        accelerator={<KeyCombo combo={uiStore.hotkeyMap.toggleSettings} />}
      />
      <MenuItem
        icon={IconSet.RELOAD}
        onClick={RendererMessenger.checkForUpdates}
        text={t('app.checkForUpdates')}
      />
      <MenuItem icon={IconSet.LOGO} onClick={uiStore.toggleAbout} text={t('app.about')} />
    </MenuButton>
  );
});

export default SecondaryCommands;
