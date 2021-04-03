import { observer } from 'mobx-react-lite';
import React, { useCallback, useContext, useState } from 'react';
import { RendererMessenger } from 'src/Messaging';
import { WINDOW_STORAGE_KEY } from 'src/renderer';
import { Button, ButtonGroup, IconSet, Radio, RadioGroup, Toggle } from 'widgets';
import { Alert, DialogButton } from 'widgets/popovers';
import StoreContext from '../../contexts/StoreContext';
import { moveThumbnailDir } from '../../ThumbnailGeneration';
import { getThumbnailPath, isDirEmpty } from '../../utils';
import { ClearDbButton } from '../ErrorBoundary';
import HotkeyMapper from './HotkeyMapper';
import PopupWindow from './PopupWindow';
import Tabs, { TabItem } from './Tabs';

const Appearance = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const [localZoomFactor, setLocalZoomFactor] = useState(RendererMessenger.getZoomFactor());

  const incrementZoomFactor = useCallback(() => {
    RendererMessenger.setZoomFactor(localZoomFactor + 0.1);
    setLocalZoomFactor(localZoomFactor + 0.1);
  }, [localZoomFactor]);
  const decrementZoomFactor = useCallback(() => {
    RendererMessenger.setZoomFactor(localZoomFactor - 0.1);
    setLocalZoomFactor(localZoomFactor - 0.1);
  }, [localZoomFactor]);
  const resetZoomFactor = useCallback(() => {
    RendererMessenger.setZoomFactor(1);
    setLocalZoomFactor(1);
  }, []);

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

        <br />

        <div className="scale-widget">
          <ButtonGroup>
            <Button onClick={decrementZoomFactor} text="-" styling="outlined" />
            <Button onClick={incrementZoomFactor} text="+" styling="outlined" />
            <Button onClick={resetZoomFactor} icon={IconSet.RELOAD} text="" styling="outlined" />
          </ButtonGroup>
          <span>Scale: {Math.round(100 * localZoomFactor)}%</span>
        </div>
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

const ImportExport = observer(() => {
  const { fileStore } = useContext(StoreContext);
  const [isConfirmingExport, setConfirmingExport] = useState(false);
  return (
    <>
      <h2>Import/Export</h2>

      <h3>Metadata</h3>
      <p>
        {IconSet.INFO} This option is useful for importing/exporting tags from/to other software, or
        when you use Allusion for images on multiple devices synchronized using a service such as
        Dropbox or Google Drive.
      </p>
      <fieldset>
        <label>
          <select
            style={{ width: '40px', marginRight: '8px' }}
            value={fileStore.exifTool.hierarchicalSeparator}
            onChange={(e) => fileStore.exifTool.setHierarchicalSeparator(e.target.value)}
          >
            <option value="|">&apos;|&apos;</option>
            <option value="/">&apos;/&apos;</option>
            <option value="\">&apos;\&apos;</option>
            <option value=":">&apos;:&apos;</option>
          </select>
          Hierarchical separator
        </label>
        {/* TODO: adobe bridge has option to read with multiple separators */}

        <ButtonGroup>
          <Button text="Import tags from file metadata" onClick={fileStore.readTagsFromFiles} />
          <Button
            text="Write tags to file metadata"
            onClick={() => setConfirmingExport(true)}
            styling="minimal"
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
      </fieldset>

      {/* TODO: already implemented in other branch */}
      {/* <h3>Backup</h3>
      <fieldset>
        <Button text="Export database..." onClick={console.log} icon={IconSet.OPEN_EXTERNAL} />
        <Button text="Import database..." onClick={console.log} icon={IconSet.IMPORT} />
        <Button
          text="Full export (including images)..."
          onClick={console.log}
          icon={IconSet.MEDIA}
        />
      </fieldset> */}
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
