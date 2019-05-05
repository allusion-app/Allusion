import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Drawer, Classes, Switch, Button, Card, H5, Code } from '@blueprintjs/core';

import StoreContext from '../contexts/StoreContext';
import IconSet from './Icons';

const Settings = () => {
  const { uiStore } = useContext(StoreContext);

  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
    <Drawer
      isOpen={uiStore.isSettingsOpen}
      icon={IconSet.SETTINGS}
      onClose={uiStore.toggleSettings}
      title="Settings"
      className={themeClass}
    >
      <div className={Classes.DRAWER_BODY}>
        <div className={Classes.DIALOG_BODY}>
          <Switch checked={uiStore.theme === 'DARK'} onChange={uiStore.toggleTheme} label="Dark theme" />

          <Button disabled fill>Clear database</Button>

          <Button onClick={uiStore.toggleDevtools} intent="warning" icon="error" fill>
            Toggle the developer tools
          </Button>

          <br />

          <Card elevation={2}>
            <H5>Tip: Hotkeys</H5>
            <p>
              Did you know this application has hotkeys?
              Press <Code>?</Code> (<Code>shift + /</Code>) to see them.
            </p>
          </Card>
        </div>
      </div>
    </Drawer>
  );
};

export default observer(Settings);
