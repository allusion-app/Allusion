import React, { useContext, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import StoreContext from '../contexts/StoreContext';
import { Button, ButtonGroup, IconSet, Radio, RadioGroup, Toggle } from 'components';
import { ClearDbButton } from '../components/ErrorBoundary';
import { moveThumbnailDir } from '../ThumbnailGeneration';
import { getThumbnailPath, isDirEmpty } from '../utils';
import { RendererMessenger } from '../../../Messaging';
import HotkeyMapper from '../components/HotkeyMapper';
import PopupWindow from '../components/PopupWindow';
import { WINDOW_STORAGE_KEY } from 'src/renderer/renderer';

const toggleFullScreen = (e: React.FormEvent<HTMLInputElement>) => {
  const isFullScreen = e.currentTarget.checked;
  localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify({ isFullScreen }));
  RendererMessenger.setFullScreen(isFullScreen);
};

const toggleClipServer = (event: React.ChangeEvent<HTMLInputElement>) =>
  RendererMessenger.setClipServerEnabled({ isClipServerRunning: event.target.checked });

const toggleRunInBackground = (event: React.ChangeEvent<HTMLInputElement>) =>
  RendererMessenger.setRunInBackground({ isRunInBackground: event.target.checked });

const SettingsForm = observer(() => {
  const { uiStore, fileStore, locationStore } = useContext(StoreContext);

  const browseImportDir = useCallback(async () => {
    const { filePaths: dirs } = await RendererMessenger.openDialog({
      properties: ['openDirectory'],
    });

    if (dirs.length === 0) {
      return;
    }

    const chosenDir = dirs[0];
    locationStore.setDefaultLocation(chosenDir);

    // Todo: Provide option to move/copy the files in that directory (?)
    // Since the import dir could also contain non-allusion files, not sure if a good idea
    // But then there should be support for re-importing manually copied files
  }, [locationStore]);

  const browseThumbnailDirectory = useCallback(async () => {
    const { filePaths: dirs } = await RendererMessenger.openDialog({
      properties: ['openDirectory'],
      defaultPath: uiStore.thumbnailDirectory,
    });

    if (dirs.length === 0) {
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
        <RadioGroup name="Thumbnail Size">
          <Radio
            label="Small"
            value="small"
            checked={uiStore.thumbnailSize === 'small'}
            onChange={uiStore.setThumbnailSmall}
          />
          <Radio
            label="Medium"
            value="medium"
            checked={uiStore.thumbnailSize === 'medium'}
            onChange={uiStore.setThumbnailMedium}
          />
          <Radio
            label="Large"
            value="large"
            checked={uiStore.thumbnailSize === 'large'}
            onChange={uiStore.setThumbnailLarge}
          />
        </RadioGroup>

        <RadioGroup name="Thumbnail Shape">
          <Radio
            label="Square"
            checked={uiStore.thumbnailShape === 'square'}
            value="square"
            onChange={uiStore.setThumbnailSquare}
          />
          <Radio
            label="Letterbox"
            checked={uiStore.thumbnailShape === 'letterbox'}
            value="letterbox"
            onChange={uiStore.setThumbnailLetterbox}
          />
        </RadioGroup>
      </div>
      <div className="column">
        <Toggle
          defaultChecked={RendererMessenger.isFullScreen()}
          onChange={toggleFullScreen}
          label="Full screen"
        />

        <Toggle
          checked={uiStore.theme === 'DARK'}
          onChange={uiStore.toggleTheme}
          label="Dark theme"
        />

        <Toggle
          defaultChecked={RendererMessenger.isRunningInBackground()}
          onChange={toggleRunInBackground}
          label="Run in background"
        />

        <Toggle
          defaultChecked={RendererMessenger.isClipServerEnabled()}
          onChange={toggleClipServer}
          label="Browser extension support"
        />
      </div>

      <hr />

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

      <hr />

      <div>
        <p>
          Click on a key combination to modify it. After typing your new combination, press Enter to
          confirm or Escape to cancel. The application must be reloaded for the changes to take
          effect.
        </p>
        <Button icon={IconSet.RELOAD} text="Reload" onClick={() => window.location.reload()} />
        <HotkeyMapper />
      </div>

      <hr />

      <ButtonGroup>
        <ClearDbButton />
        <Button
          onClick={RendererMessenger.toggleDevTools}
          styling="outlined"
          icon={IconSet.CHROME_DEVTOOLS}
          text="Toggle DevTools"
        />
      </ButtonGroup>
    </div>
  );
});

const SettingsWindow = () => {
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
};

export default observer(SettingsWindow);
