import { Divider, Switch } from '@blueprintjs/core';
import { Button, ButtonGroup } from 'components';
import IconSet from 'components/Icons';
import { remote } from 'electron';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useContext, useEffect } from 'react';
import { RendererMessenger } from '../../../Messaging';
import StoreContext from '../contexts/StoreContext';
import { moveThumbnailDir } from '../ThumbnailGeneration';
import { getThumbnailPath, isDirEmpty } from '../utils';
import { ClearDbButton } from './ErrorBoundary';
import HotkeyMapper from './HotkeyMapper';
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
        <fieldset role="radiogroup">
          <legend>Thumbnail Size</legend>
          <label>
            <input
              type="radio"
              checked={uiStore.thumbnailSize === 'small'}
              name="Thumbnail Size"
              value="small"
              onChange={uiStore.setThumbnailSmall}
            />
            Small
          </label>
          <label>
            <input
              type="radio"
              checked={uiStore.thumbnailSize === 'medium'}
              name="Thumbnail Size"
              value="medium"
              onChange={uiStore.setThumbnailMedium}
            />
            Medium
          </label>
          <label>
            <input
              type="radio"
              checked={uiStore.thumbnailSize === 'large'}
              name="Thumbnail Size"
              value="large"
              onChange={uiStore.setThumbnailLarge}
            />
            Large
          </label>
        </fieldset>

        <fieldset role="radiogroup">
          <legend>Thumbnail Shape</legend>
          <label>
            <input
              type="radio"
              checked={uiStore.thumbnailShape === 'square'}
              name="Thumbnail Shape"
              value="square"
              onChange={uiStore.setThumbnailSquare}
            />
            Square
          </label>
          <label>
            <input
              type="radio"
              checked={uiStore.thumbnailShape === 'letterbox'}
              name="Thumbnail Shape"
              value="letterbox"
              onChange={uiStore.setThumbnailLetterbox}
            />
            Letterbox
          </label>
        </fieldset>
      </div>
      <div className="column">
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
        <fieldset>
          <legend>Thumbnail Directory</legend>

          {/* Where to import images you drop on the app or import through the browser extension */}
          <span title={uiStore.thumbnailDirectory}>{uiStore.thumbnailDirectory}</span>
          <Button styling="filled" text="Browse" onClick={browseThumbnailDirectory} />
        </fieldset>

        <fieldset>
          <legend>Import Directory</legend>
          <span title={locationStore.importDirectory}>{locationStore.importDirectory}</span>
          <Button styling="filled" text="Browse" onClick={browseImportDir} />
        </fieldset>
      </div>

      <Divider />

      <ButtonGroup>
        <ClearDbButton />
        <Button
          onClick={uiStore.toggleDevtools}
          styling="outlined"
          icon={IconSet.CHROME_DEVTOOLS}
          text="Toggle DevTools"
        />
      </ButtonGroup>

      <br />

      {/* <Callout icon={IconSet.INFO}>
        <H4 className="bp3-heading inspectorHeading">Tip: Hotkeys</H4>
        <p>
          Did you know there are hotkeys available in most panels?
          <br />
          Press&nbsp;
          <KeyCombo combo="mod+k" />
          &nbsp;to see them.
        </p>
      </Callout> */}

      <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '11px' }}>
        <HotkeyMapper />
      </div>
    </div>
  );
});

export const SettingsWindow: React.FC = observer(() => {
  const { uiStore } = useContext(StoreContext);

  if (!uiStore.isSettingsOpen) {
    return null;
  }

  return (
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
  );
});

export default SettingsWindow;
