import React, { useContext, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { Drawer, Classes, Switch, Button, Callout, H4, RadioGroup, Radio } from '@blueprintjs/core';

import StoreContext from '../contexts/StoreContext';
import IconSet from './Icons';
import { ClearDbButton } from './ErrorBoundary';

const Settings = observer(() => {
  const { uiStore } = useContext(StoreContext);

  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  const viewSmall = useCallback(() => { uiStore.thumbnailSize = 'small'; }, []);
  const viewMedium = useCallback(() => { uiStore.thumbnailSize = 'medium'; }, []);
  const viewLarge = useCallback(() => { uiStore.thumbnailSize = 'large'; }, []);

  return (
    <Drawer
      isOpen={uiStore.isSettingsOpen}
      icon={IconSet.SETTINGS}
      onClose={uiStore.toggleSettings}
      title="Settings"
      className={themeClass}
    >
      <div className={Classes.DRAWER_BODY}>
        <RadioGroup
          selectedValue={uiStore.thumbnailSize}
          onChange={() => undefined}
          label="Thumbnail size"
          inline
        >
          <Radio label="Small" value="small" onClick={viewSmall} />
          <Radio label="Medium" value="medium" onClick={viewMedium} />
          <Radio label="Large" value="large" onClick={viewLarge} />
        </RadioGroup>

        <Switch checked={uiStore.isFullScreen} onChange={uiStore.toggleFullScreen} label="Full screen" />
        <Switch checked={uiStore.theme === 'DARK'} onChange={uiStore.toggleTheme} label="Dark theme" />
        <div className="bp3-divider"></div>

        <ClearDbButton fill position="bottom-left" />

        <Button onClick={uiStore.toggleDevtools} intent="warning" icon={IconSet.CHROME_DEVTOOLS} fill>
          Toggle DevTools
        </Button>

        <br />

        <Callout icon={IconSet.INFO}>
          <H4 className="bp3-heading inspectorHeading">Tip: Hotkeys</H4>
          <p>
            Did you know there are hotkeys?
            <br/>
            Press&nbsp;
            <span className={Classes.KEY_COMBO}>
              <span className={`${Classes.KEY} ${Classes.MODIFIER_KEY}`}>
                shift
              </span>
              &nbsp;
              <span className={Classes.KEY}>
                /
              </span>
              &nbsp;to see them.
            </span>
          </p>
        </Callout>
      </div>
    </Drawer>
  );
});

export default Settings;
