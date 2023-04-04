import { observer } from 'mobx-react-lite';
import React, { useCallback, useState } from 'react';
import { RendererMessenger } from 'src/ipc/renderer';
import { Toggle } from 'widgets';
import { useStore } from '../../contexts/StoreContext';

export const StartupBehavior = observer(() => {
  const { uiStore } = useStore();

  const [isAutoUpdateEnabled, setAutoUpdateEnabled] = useState(
    RendererMessenger.isCheckUpdatesOnStartupEnabled,
  );

  const toggleAutoUpdate = useCallback(() => {
    RendererMessenger.toggleCheckUpdatesOnStartup();
    setAutoUpdateEnabled((isOn) => !isOn);
  }, []);

  return (
    <div className="vstack">
      <Toggle
        checked={uiStore.isRememberSearchEnabled}
        onChange={uiStore.toggleRememberSearchQuery}
      >
        Restore and query last submitted search query
      </Toggle>
      <Toggle checked={isAutoUpdateEnabled} onChange={toggleAutoUpdate}>
        Check for updates
      </Toggle>
    </div>
  );
});
