import { shell } from 'electron';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useContext, useEffect, useState } from 'react';
import { chromeExtensionUrl } from 'src/config';
import UiStore from 'src/frontend/stores/UiStore';
import { RendererMessenger } from 'src/Messaging';
import { WINDOW_STORAGE_KEY } from 'src/renderer';
import { Button, ButtonGroup, IconButton, IconSet, Radio, RadioGroup, Toggle } from 'widgets';
import { Callout } from 'widgets/notifications';
import { Alert, DialogButton } from 'widgets/popovers';
import PopupWindow from '../../components/PopupWindow';
import StoreContext from '../../contexts/StoreContext';
import { moveThumbnailDir } from '../../ThumbnailGeneration';
import { getThumbnailPath, isDirEmpty } from '../../utils';
import { ClearDbButton } from '../ErrorBoundary';
import HotkeyMapper from './HotkeyMapper';
import Tabs, { TabItem } from './Tabs';

const Appearance = observer(() => {
  const { uiStore } = useContext(StoreContext);

  return (
    <>
      <h2>Appearance</h2>

      <h3>Interface</h3>
      <Toggle
        checked={uiStore.theme === 'dark'}
        onChange={uiStore.toggleTheme}
        label="Dark theme"
      />
      <Toggle
        defaultChecked={uiStore.isFullScreen}
        onChange={toggleFullScreen}
        label="Full screen"
      />
      <Zoom />

      <h3>Thumbnail</h3>
      <Toggle
        defaultChecked={uiStore.isThumbnailTagOverlayEnabled}
        onChange={uiStore.toggleThumbnailTagOverlay}
        label="Show assigned tags"
      />
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
      </div>
    </>
  );
});

const Zoom = () => {
  const [localZoomFactor, setLocalZoomFactor] = useState(RendererMessenger.getZoomFactor());

  useEffect(() => {
    RendererMessenger.setZoomFactor(localZoomFactor);
  }, [localZoomFactor]);

  return (
    <div className="zoom-widget">
      Zoom
      <span className="zoom-input">
        <IconButton
          icon={<span>-</span>}
          onClick={() => setLocalZoomFactor(localZoomFactor - 0.1)}
          text="Zoom out"
        />
        <span>{Math.round(100 * localZoomFactor)}%</span>
        <IconButton
          icon={<span>+</span>}
          onClick={() => setLocalZoomFactor(localZoomFactor + 0.1)}
          text="Zoom in"
        />
      </span>
    </div>
  );
};

const ImportExport = observer(() => {
  const { fileStore } = useContext(StoreContext);
  const [isConfirmingExport, setConfirmingExport] = useState(false);
  return (
    <>
      <h2>Import/Export</h2>

      <h3>Metadata</h3>
      <Callout icon={IconSet.INFO}>
        This option is useful for importing/exporting tags from/to other software, or when you use
        Allusion for images on multiple devices synchronized using a service such as Dropbox or
        Google Drive.
      </Callout>

      <label id="hierarchical-separator">
        <span>
          Hierarchical separator, e.g.{' '}
          <pre style={{ display: 'inline' }}>
            {['Food', 'Fruit', 'Apple'].join(fileStore.exifTool.hierarchicalSeparator)}
          </pre>
        </span>
        <select
          value={fileStore.exifTool.hierarchicalSeparator}
          onChange={(e) => fileStore.exifTool.setHierarchicalSeparator(e.target.value)}
        >
          <option value="|">|</option>
          <option value="/">/</option>
          <option value="\">\</option>
          <option value=":">:</option>
        </select>
      </label>
      {/* TODO: adobe bridge has option to read with multiple separators */}

      <ButtonGroup>
        <Button
          text="Import tags from file metadata"
          onClick={fileStore.readTagsFromFiles}
          styling="outlined"
        />
        <Button
          text="Write tags to file metadata"
          onClick={() => setConfirmingExport(true)}
          styling="outlined"
        />
        <Alert
          open={isConfirmingExport}
          title="Are you sure you want to write Allusion's tags to your image files?"
          information="This will overwrite any existing tags ('keywords') on those files, so it is recommended you have imported them first"
          primaryButtonText="Export"
          closeButtonText="Cancel"
          // defaultButton={}
          onClick={(button) => {
            if (button === DialogButton.PrimaryButton) {
              fileStore.writeTagsToFiles();
            }
            setConfirmingExport(false);
          }}
        />
      </ButtonGroup>

      {/* TODO: already implemented in other branch */}
      {/* <h3>Backup</h3>
        <Button text="Export database..." onClick={console.log} icon={IconSet.OPEN_EXTERNAL} />
        <Button text="Import database..." onClick={console.log} icon={IconSet.IMPORT} />
        <Button
          text="Full export (including images)..."
          onClick={console.log}
          icon={IconSet.MEDIA}
        /> */}
    </>
  );
});

const BackgroundProcesses = observer(() => {
  const { uiStore, locationStore } = useContext(StoreContext);

  const importDirectory = uiStore.importDirectory;
  const browseImportDirectory = async () => {
    const { filePaths: dirs } = await RendererMessenger.openDialog({
      properties: ['openDirectory'],
      defaultPath: importDirectory,
    });

    if (dirs.length === 0) {
      return;
    }
    const newDir = dirs[0];

    if (locationStore.locationList.some((loc) => newDir.startsWith(loc.path))) {
      await RendererMessenger.setClipServerImportLocation(newDir);
      uiStore.setImportDirectory(newDir);
    } else {
      alert('Please choose a location or any of its subfolders.');
      return;
    }
  };

  const [isClipEnabled, setClipServerEnabled] = useState(RendererMessenger.isClipServerEnabled());
  const handleSetClipServerEnabled = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClipServerEnabled(e.target.checked);
    toggleClipServer(e);
  };

  return (
    <>
      <h2>Options</h2>
      <Toggle
        defaultChecked={RendererMessenger.isRunningInBackground()}
        onChange={toggleRunInBackground}
        label="Run in background"
      />

      <Toggle
        checked={isClipEnabled}
        onChange={
          isClipEnabled || importDirectory
            ? handleSetClipServerEnabled
            : (e) => {
                console.log('came here');
                e.preventDefault();
                e.stopPropagation();
                alert(
                  'Please choose a download directory first, where images downloaded through the browser extension will be stored.',
                );
              }
        }
        label="Browser extension support"
      />

      <fieldset>
        <legend>Browser extension download directory (must be in a Location)</legend>
        <div className="input-file">
          <input
            readOnly
            className="input input-file-value"
            value={uiStore.importDirectory || 'Not set'}
          />
          <Button
            styling="minimal"
            icon={IconSet.FOLDER_CLOSE}
            text="Browse"
            onClick={browseImportDirectory}
          />
        </div>
      </fieldset>

      {/* TODO: Link to chrome extension page when it's up */}
      <Button
        onClick={() => shell.openExternal(chromeExtensionUrl)}
        styling="outlined"
        icon={IconSet.CHROME_DEVTOOLS}
        text="Get the extension from the Chrome Web Store"
      />
    </>
  );
});

const Shortcuts = () => (
  <>
    <h2>Keyboard shortcuts</h2>
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

  const [defaultThumbnailDir, setDefaultThumbnailDir] = useState('');
  useEffect(() => void UiStore.getDefaultThumbnailDirectory().then(setDefaultThumbnailDir), []);

  const changeThumbnailDirectory = async (newDir: string) => {
    const oldDir = thumbnailDirectory;

    // Move thumbnail files
    await moveThumbnailDir(oldDir, newDir);
    uiStore.setThumbnailDirectory(newDir);

    // Reset thumbnail paths for those that already have one
    runInAction(() => {
      for (const f of fileStore.fileList) {
        if (f.thumbnailPath && f.thumbnailPath !== f.absolutePath) {
          f.setThumbnailPath(getThumbnailPath(f.absolutePath, newDir));
        }
      }
    });
  };

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
      if (
        window.confirm(
          `The directory you picked is not empty. Allusion might delete any files inside of it. Do you still wish to pick this directory?\n\nYou picked: ${newDir}`,
        )
      ) {
        changeThumbnailDirectory(newDir);
      }
    } else {
      changeThumbnailDirectory(newDir);
    }
  };
  return (
    <>
      <h2>Storage</h2>

      {/* Todo: Add support to toggle this */}
      {/* <Switch checked={true} onChange={() => alert('Not supported yet')} label="Generate thumbnails" /> */}
      <fieldset>
        <legend>Thumbnail Directory</legend>
        <div className="input-file">
          <input readOnly className="input input-file-value" value={thumbnailDirectory} />
          <Button
            styling="minimal"
            icon={IconSet.FOLDER_CLOSE}
            text="Browse"
            onClick={browseThumbnailDirectory}
          />
          {defaultThumbnailDir && defaultThumbnailDir !== uiStore.thumbnailDirectory && (
            <Button
              icon={IconSet.RELOAD}
              text="Reset"
              onClick={() => changeThumbnailDirectory(defaultThumbnailDir)}
            />
          )}
        </div>
      </fieldset>

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
    label: 'Import/Export',
    content: <ImportExport />,
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
      <div id="settings" className={uiStore.theme}>
        <Tabs items={SETTINGS_TABS} />
      </div>
    </PopupWindow>
  );
};

export default observer(Settings);

const toggleFullScreen = (e: React.FormEvent<HTMLInputElement>) => {
  const isFullScreen = e.currentTarget.checked;
  localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify({ isFullScreen }));
  RendererMessenger.setFullScreen(isFullScreen);
};

const toggleClipServer = (event: React.ChangeEvent<HTMLInputElement>) =>
  RendererMessenger.setClipServerEnabled({ isClipServerRunning: event.target.checked });

const toggleRunInBackground = (event: React.ChangeEvent<HTMLInputElement>) =>
  RendererMessenger.setRunInBackground({ isRunInBackground: event.target.checked });
