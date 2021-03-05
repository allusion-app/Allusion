import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';
import { RendererMessenger } from 'src/Messaging';
import { WINDOW_STORAGE_KEY } from 'src/renderer';
import { Button, ButtonGroup, IconSet, Radio, RadioGroup, Toggle } from 'widgets';
import StoreContext from '../../contexts/StoreContext';
import { moveThumbnailDir } from '../../ThumbnailGeneration';
import { getThumbnailPath, isDirEmpty } from '../../utils';
import { ClearDbButton } from '../ErrorBoundary';
import HotkeyMapper from './HotkeyMapper';
import PopupWindow from './PopupWindow';
import Tabs, { TabItem } from './Tabs';

const Appearance = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <>
      <h2>Appearance</h2>

      <h3>Interface</h3>
      <fieldset>
        <Toggle
          checked={uiStore.theme === 'DARK'}
          onChange={uiStore.toggleTheme}
          label="Dark theme"
        />
        <Toggle
          defaultChecked={RendererMessenger.isFullScreen()}
          onChange={toggleFullScreen}
          label="Full screen"
        />
      </fieldset>

      <h3>Thumbnail</h3>
      <div className="settings-thumbnail">
        <RadioGroup name="Size">
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
        <RadioGroup name="Shape">
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
        <Toggle
          defaultChecked={uiStore.isThumbnailTagOverlayEnabled}
          onChange={uiStore.toggleThumbnailTagOverlay}
          label="Show assigned tags"
        />
      </div>
    </>
  );
});

const BackgroundProcesses = () => (
  <>
    <h2>Options</h2>
    <fieldset>
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
    </fieldset>
  </>
);

const Shortcuts = () => (
  <>
    <h2>Shortcuts Map</h2>
    <p>
      Click on a key combination to modify it. After typing your new combination, press Enter to
      confirm or Escape to cancel.
    </p>
    <HotkeyMapper />
  </>
);

const Advanced = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);
  const thumbnailDirectory = uiStore.thumbnailDirectory;
  const browseThumbnailDirectory = async () => {
    const { filePaths: dirs } = await RendererMessenger.openDialog({
      properties: ['openDirectory'],
      defaultPath: thumbnailDirectory,
    });

    if (dirs.length === 0) {
      return;
    }
    const newDir = dirs[0];

    if (!(await isDirEmpty(newDir))) {
      alert('Please choose an empty directory. Allusion may delete any existing files.');
      return;
    }

    const oldDir = thumbnailDirectory;

    // Move thumbnail files
    await moveThumbnailDir(oldDir, newDir);
    uiStore.setThumbnailDirectory(newDir);

    // Reset thumbnail paths for those that already have one
    fileStore.fileList.forEach((f) => {
      if (f.thumbnailPath) {
        f.setThumbnailPath(getThumbnailPath(f.absolutePath, newDir));
      }
    });
  };
  return (
    <>
      <h2>Storage</h2>
      <div>
        {/* Todo: Add support to toggle this */}
        {/* <Switch checked={true} onChange={() => alert('Not supported yet')} label="Generate thumbnails" /> */}
        <fieldset>
          <legend>Thumbnail Directory</legend>
          <div className="input-file">
            <span className="input input-file-value">{thumbnailDirectory}</span>
            <Button styling="filled" text="Browse" onClick={browseThumbnailDirectory} />
          </div>
        </fieldset>
      </div>

      <h2>Development</h2>
      <ButtonGroup>
        <ClearDbButton />
        <Button
          onClick={RendererMessenger.toggleDevTools}
          styling="outlined"
          icon={IconSet.CHROME_DEVTOOLS}
          text="Toggle DevTools"
        />
      </ButtonGroup>
    </>
  );
});

const SETTINGS_TABS: TabItem[] = [
  {
    label: 'Appearance',
    content: <Appearance />,
  },
  {
    label: 'Shortcuts',
    content: <Shortcuts />,
  },
  {
    label: 'Background Processes',
    content: <BackgroundProcesses />,
  },
  {
    label: 'Advanced',
    content: <Advanced />,
  },
];

const Settings = () => {
  return (
    <div id="settings">
      <Tabs items={SETTINGS_TABS} />
    </div>
  );
};

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
      <div className={uiStore.theme === 'LIGHT' ? 'bp3-light' : 'bp3-dark'}>
        <Settings />
      </div>
    </PopupWindow>
  );
};

export default observer(SettingsWindow);

const toggleFullScreen = (e: React.FormEvent<HTMLInputElement>) => {
  const isFullScreen = e.currentTarget.checked;
  localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify({ isFullScreen }));
  RendererMessenger.setFullScreen(isFullScreen);
};

const toggleClipServer = (event: React.ChangeEvent<HTMLInputElement>) =>
  RendererMessenger.setClipServerEnabled({ isClipServerRunning: event.target.checked });

const toggleRunInBackground = (event: React.ChangeEvent<HTMLInputElement>) =>
  RendererMessenger.setRunInBackground({ isRunInBackground: event.target.checked });
