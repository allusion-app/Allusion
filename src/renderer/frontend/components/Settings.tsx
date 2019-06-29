import React, { useContext, useEffect, useState, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { Drawer, Classes, Switch, Button, Callout, H4, FormGroup } from '@blueprintjs/core';

import StoreContext from '../contexts/StoreContext';
import IconSet from './Icons';
import { ClearDbButton } from './ErrorBoundary';
import { ipcRenderer, remote } from 'electron';

const Settings = () => {
  const { uiStore } = useContext(StoreContext);

  const [isClipServerRunning, setClipServerRunning] = useState(false);
  const [isRunningInBackground, setRunningInBackground] = useState(false);
  const [importPath, setImportPath] = useState('');

  const toggleClipServer = useCallback(() => {
    ipcRenderer.send('setClipServerEnabled', !isClipServerRunning);
    setClipServerRunning(!isClipServerRunning);
  }, [setClipServerRunning, isClipServerRunning]);

  const toggleRunInBackground = useCallback(() => {
    ipcRenderer.send('setRunningInBackground', !isRunningInBackground);
    setRunningInBackground(!isRunningInBackground);
  }, [setRunningInBackground, isRunningInBackground]);

  const browseImportDir = useCallback(() => {
    const dirs = remote.dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    if (!dirs) {
      return;
    }
    const dir = dirs[0];
    setImportPath(dir);
    ipcRenderer.send('setDownloadPath', dir);
  }, [setImportPath]);

  useEffect(() => {
    setClipServerRunning(ipcRenderer.sendSync('isClipServerRunning'));
    setRunningInBackground(ipcRenderer.sendSync('isRunningInBackground'));
    setImportPath(ipcRenderer.sendSync('getDownloadPath'));
  }, []);

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
        <Switch checked={uiStore.isFullScreen} onChange={uiStore.toggleFullScreen} label="Full screen" />
        <Switch checked={uiStore.theme === 'DARK'} onChange={uiStore.toggleTheme} label="Dark theme" />

        <div className="bp3-divider" />

        <Switch checked={isRunningInBackground} onChange={toggleRunInBackground} label="Run in background" />
        <Switch checked={isClipServerRunning} onChange={toggleClipServer} label="Browser extension support" />

        <FormGroup
          label="Import directory"
        >
          <label
            className={`${Classes.FILL} ${Classes.FILE_INPUT} ${Classes.FILE_INPUT_HAS_SELECTION}`}
            htmlFor="importPathInput"
          >
            {/* Where to import images you drop on the app or import through the browser extension */}
            <span
              className={Classes.FILE_UPLOAD_INPUT}
              id="importPathInput"
              onClick={browseImportDir}
              >
              {importPath}
            </span>
          </label>
        </FormGroup>

        <div className="bp3-divider" />

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
};

export default observer(Settings);
