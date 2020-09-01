import React, { useContext, useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Drawer,
  Classes,
  Button,
  Callout,
  H4,
  FormGroup,
  KeyCombo,
  Switch,
  Radio,
  RadioGroup,
  Divider,
} from '@blueprintjs/core';

import StoreContext from '../contexts/StoreContext';
import IconSet from 'components/Icons';
import { ClearDbButton } from './ErrorBoundary';
import { remote } from 'electron';
import { moveThumbnailDir } from '../ThumbnailGeneration';
import { getThumbnailPath, isDirEmpty } from '../utils';
import { RendererMessenger } from '../../../Messaging';
import RootStore from '../stores/RootStore';
import ReactDOM from 'react-dom';
import PopupWindow from './PopupWindow';

// Window state
const WINDOW_STORAGE_KEY = 'Allusion_Window';

const toggleFullScreen = () => {
  const { isFullScreen, setFullScreen } = remote.getCurrentWindow();
  // Save window state
  localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify({ isFullScreen: !isFullScreen() }));
  setFullScreen(!isFullScreen());
};

const toggleClipServer = (event: React.ChangeEvent<HTMLInputElement>) =>
  RendererMessenger.setClipServerEnabled({ isClipServerRunning: event.target.checked });

const toggleRunInBackground = (event: React.ChangeEvent<HTMLInputElement>) =>
  RendererMessenger.setRunInBackground({ isRunInBackground: event.target.checked });

const SettingsForm = observer(() => {
  const { uiStore, fileStore, locationStore } = useContext(StoreContext);

  const browseImportDir = useCallback(() => {
    const dirs = remote.dialog.showOpenDialogSync({
      properties: ['openDirectory'],
    });

    if (!dirs) {
      return;
    }

    const chosenDir = dirs[0];
    locationStore.setDefaultLocation(chosenDir);

    // Todo: Provide option to move/copy the files in that directory (?)
    // Since the import dir could also contain non-allusion files, not sure if a good idea
    // But then there should be support for re-importing manually copied files
  }, [locationStore]);

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
  }, []);

  const browseThumbnailDirectory = useCallback(async () => {
    const dirs = remote.dialog.showOpenDialogSync({
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
        f.setThumbnailPath(getThumbnailPath(f.absolutePath, newDir));
      }
    });
  }, [fileStore.fileList, uiStore]);

  return (
    <div className="settings-form">
      <div className="column">
        <RadioGroup
          inline
          selectedValue={uiStore.thumbnailSize}
          onChange={() => undefined}
          label="Thumbnail size"
        >
          <Radio label="Small" value="small" onClick={uiStore.setThumbnailSmall} />
          <Radio label="Medium" value="medium" onClick={uiStore.setThumbnailMedium} />
          <Radio label="Large" value="large" onClick={uiStore.setThumbnailLarge} />
        </RadioGroup>

        <RadioGroup
          inline
          selectedValue={uiStore.thumbnailShape}
          onChange={() => undefined}
          label="Thumbnail shape"
        >
          <Radio label="Square" value="square" onClick={uiStore.setThumbnailSquare} />
          <Radio label="Letterbox" value="letterbox" onClick={uiStore.setThumbnailLetterbox} />
        </RadioGroup>
      </div>
      <div className="column">
        <Switch
          defaultChecked={remote.getCurrentWindow().isFullScreen()}
          onChange={toggleFullScreen}
          label="Full screen"
        />

        <Switch
          checked={uiStore.isToolbarVertical}
          onChange={uiStore.toggleToolbarVertical}
          label="Vertical toolbar"
        />

        <Switch
          checked={uiStore.theme === 'DARK'}
          onChange={uiStore.toggleTheme}
          label="Dark theme"
        />

        <Switch
          defaultChecked={RendererMessenger.getIsRunningInBackground()}
          onChange={toggleRunInBackground}
          label="Run in background"
        />

        <Switch
          defaultChecked={RendererMessenger.getIsClipServerEnabled()}
          onChange={toggleClipServer}
          label="Browser extension support"
        />
      </div>

      <Divider />

      <div>
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
              {locationStore.importDirectory}
            </span>
          </label>
        </FormGroup>
      </div>

      <Divider />

      <div>
        <ClearDbButton fill position="bottom-left" />

        <Button
          onClick={uiStore.toggleDevtools}
          intent="warning"
          icon={IconSet.CHROME_DEVTOOLS}
          fill
        >
          Toggle DevTools
        </Button>
      </div>

      <br />

      <Callout icon={IconSet.INFO}>
        <H4 className="bp3-heading inspectorHeading">Tip: Hotkeys</H4>
        <p>
          Did you know there are hotkeys available in most panels?
          <br />
          Press&nbsp;
          <KeyCombo combo="mod+k" />
          &nbsp;to see them.
        </p>
      </Callout>
    </div>
  );
});

export const SettingsDrawer = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <Drawer
      isOpen={uiStore.isSettingsOpen}
      icon={IconSet.SETTINGS}
      onClose={uiStore.toggleSettings}
      title="Settings"
      className="settings-drawer"
    >
      <div className={Classes.DRAWER_BODY}>
        <SettingsForm />
      </div>
    </Drawer>
  );
});

export const SettingsWindow: React.FC = observer(() => {
  const { uiStore } = useContext(StoreContext);

  if (!uiStore.isSettingsOpen) {
    return null;
  }

  return (
    <>
      {/* <SettingsDrawer /> */}
      <PopupWindow
        onClose={uiStore.closeSettings}
        windowName="settings"
        closeOnEscape
        additionalCloseKey={uiStore.hotkeyMap.toggleSettings}
      >
        <div id="settings-window" className={uiStore.theme === 'LIGHT' ? 'bp3-light' : 'bp3-dark'}>
          <SettingsForm />
        </div>
      </PopupWindow>
    </>
  );
});

export default SettingsWindow;
