import { observer } from 'mobx-react-lite';
import React, { useCallback, useState } from 'react';
import { RendererMessenger } from 'src/ipc/renderer';
import { Toggle } from 'widgets';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../contexts/StoreContext';

export const General = observer(() => {
  const { t } = useTranslation();
  const { uiStore } = useStore();
  const [isAutoUpdateEnabled, setAutoUpdateEnabled] = useState(
    RendererMessenger.isCheckUpdatesOnStartupEnabled,
  );

  const toggleAutoUpdate = useCallback(() => {
    RendererMessenger.toggleCheckUpdatesOnStartup();
    setAutoUpdateEnabled((enabled) => !enabled);
  }, []);

  return (
    <div className="vstack">
      <Toggle
        checked={uiStore.isRememberSearchEnabled}
        onChange={uiStore.toggleRememberSearchQuery}
      >
        {t('settings.general.restoreSearch')}
      </Toggle>
      <Toggle checked={isAutoUpdateEnabled} onChange={toggleAutoUpdate}>
        {t('settings.general.checkForUpdates')}
      </Toggle>
    </div>
  );
});
