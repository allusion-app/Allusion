import React, { useContext, useEffect, useState, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Drawer,
  Classes,
  Switch,
  Button,
  Callout,
  H4,
  RadioGroup,
  Radio,
  FormGroup,
  KeyCombo,
} from '@blueprintjs/core';

import StoreContext from '../contexts/StoreContext';
import IconSet from './Icons';
import { ClearDbButton } from './ErrorBoundary';
import { remote } from 'electron';
import { moveThumbnailDir } from '../ThumbnailGeneration';
import { getThumbnailPath, isDirEmpty } from '../utils';
import { RendererMessenger } from '../../../Messaging';

// Window state
const WINDOW_STORAGE_KEY = 'Allusion_Window';

const Settings = observer(() => {
  const { uiStore, fileStore, locationStore } = useContext(StoreContext);

  const [isClipServerRunning, setClipServerRunning] = useState(false);
  const [isRunningInBackground, setRunningInBackground] = useState(false);
  const [importPath, setImportPath] = useState(locationStore.importDirectory);

  const toggleFullScreen = useCallback(() => {
    const { isFullScreen, setFullScreen } = remote.getCurrentWindow();
    // Save window state
    localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify({ isFullScreen: !isFullScreen() }));
    setFullScreen(!isFullScreen());
  }, []);

  const toggleClipServer = useCallback(() => {
    RendererMessenger.setClipServerEnabled({ isClipServerRunning: !isClipServerRunning });
    setClipServerRunning(!isClipServerRunning);
  }, [setClipServerRunning, isClipServerRunning]);

  const toggleRunInBackground = useCallback(() => {
    RendererMessenger.setRunInBackground({ isRunInBackground: !isRunningInBackground });
    setRunningInBackground(!isRunningInBackground);
  }, [setRunningInBackground, isRunningInBackground]);

  const browseImportDir = useCallback(() => {
    const dirs = remote.dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    if (!dirs) {
      return;
    }

    const chosenDir = dirs[0];
    locationStore.changeDefaultLocation(chosenDir);
    setImportPath(chosenDir);

    // Todo: Provide option to move/copy the files in that directory (?)
    // Since the import dir could also contain non-allusion files, not sure if a good idea
    // But then there should be support for re-importing manually copied files
  }, [setImportPath, locationStore]);

  useEffect(() => {
    // Load last window state
    const preferences = localStorage.getItem(WINDOW_STORAGE_KEY);
    if (preferences) {
      try {
        const prefs = JSON.parse(preferences);
        if (prefs.isFullScreen) {
          remote.getCurrentWindow().setFullScreen(prefs.isFullScreen);
        }
      } catch (e) {
        console.log('Cannot load persistent preferences', e);
      }
    }
    setClipServerRunning(RendererMessenger.getIsClipServerEnabled());
    setRunningInBackground(RendererMessenger.getIsRunningInBackground());
  }, []);

  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  const browseThumbnailDirectory = useCallback(async () => {
    const dirs = remote.dialog.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: uiStore.thumbnailDirectory,
    });

    if (!dirs) {
      return;
    }
    const newDir = dirs[0];

    if (!(await isDirEmpty(newDir))) {
      alert('Please choose an empty directory.');
      return;
    }

    const oldDir = uiStore.thumbnailDirectory;

    // Move thumbnail files
    await moveThumbnailDir(oldDir, newDir);
    uiStore.setThumbnailDirectory(newDir);

    // Reset thumbnail paths for those that already have one
    fileStore.fileList.forEach((f) => {
      if (f.thumbnailPath) {
        f.setThumbnailPath(getThumbnailPath(f.path, newDir));
      }
    });
  }, [fileStore.fileList, uiStore]);

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
          selectedValue={uiStore.view.thumbnailSize}
          onChange={() => undefined}
          label="Thumbnail size"
          inline
        >
          <Radio label="Small" value="small" onClick={uiStore.view.setThumbnailSmall} />
          <Radio label="Medium" value="medium" onClick={uiStore.view.setThumbnailMedium} />
          <Radio label="Large" value="large" onClick={uiStore.view.setThumbnailLarge} />
        </RadioGroup>

        <RadioGroup
          selectedValue={uiStore.view.thumbnailShape}
          onChange={() => undefined}
          label="Thumbnail shape"
          inline
        >
          <Radio label="Square" value="square" onClick={uiStore.view.setThumbnailSquare} />
          <Radio label="Letterbox" value="letterbox" onClick={uiStore.view.setThumbnailLetterbox} />
        </RadioGroup>

        <Switch
          defaultChecked={remote.getCurrentWindow().isFullScreen()}
          onChange={toggleFullScreen}
          label="Full screen"
        />
        <Switch
          checked={uiStore.theme === 'DARK'}
          onChange={uiStore.toggleTheme}
          label="Dark theme"
        />

        <Switch
          checked={isRunningInBackground}
          onChange={toggleRunInBackground}
          label="Run in background"
        />
        <Switch
          checked={isClipServerRunning}
          onChange={toggleClipServer}
          label="Browser extension support"
        />

        <div className="bp3-divider" />
        {/* Todo: Add support to toggle this */}
        {/* <Switch checked={true} onChange={() => alert('Not supported yet')} label="Generate thumbnails" /> */}
        <FormGroup label="Thumbnail directory">
          <label
            className={`${Classes.FILL} ${Classes.FILE_INPUT} ${Classes.FILE_INPUT_HAS_SELECTION}`}
            htmlFor="thumbnailPathInput"
          >
            {/* Where to import images you drop on the app or import through the browser extension */}
            <span
              className={Classes.FILE_UPLOAD_INPUT}
              id="thumbnailPathInput"
              onClick={browseThumbnailDirectory}
              title={uiStore.thumbnailDirectory}
            >
              {uiStore.thumbnailDirectory}
            </span>
          </label>
        </FormGroup>

        <FormGroup label="Import directory">
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

        <Button
          onClick={uiStore.toggleDevtools}
          intent="warning"
          icon={IconSet.CHROME_DEVTOOLS}
          fill
        >
          Toggle DevTools
        </Button>

        <br />

        <Callout icon={IconSet.INFO}>
          <H4 className="bp3-heading inspectorHeading">Tip: Hotkeys</H4>
          <p>
            Did you know there are hotkeys?
            <br />
            Press&nbsp;
            <KeyCombo combo="mod+k" />
            &nbsp;to see them.
          </p>
        </Callout>
      </div>
    </Drawer>
  );
});

export default Settings;
