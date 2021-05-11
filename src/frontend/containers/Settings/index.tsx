import { shell } from 'electron';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import SysPath from 'path';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  chromeExtensionUrl,
  getDefaultBackupDirectory,
  getDefaultThumbnailDirectory,
} from 'src/config';
import { AppToaster } from 'src/frontend/components/Toaster';
import { RendererMessenger } from 'src/Messaging';
import { WINDOW_STORAGE_KEY } from 'src/renderer';
import { Button, ButtonGroup, IconButton, IconSet, Radio, RadioGroup, Toggle } from 'widgets';
import { Callout } from 'widgets/notifications';
import { Alert, DialogButton } from 'widgets/popovers';
import PopupWindow from '../../components/PopupWindow';
import StoreContext from '../../contexts/StoreContext';
import { moveThumbnailDir } from '../../ThumbnailGeneration';
import { getFilenameFriendlyFormattedDateTime, getThumbnailPath, isDirEmpty } from '../../utils';
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
  const rootStore = useContext(StoreContext);
  const { fileStore, tagStore } = rootStore;
  const [isConfirmingMetadataExport, setConfirmingMetadataExport] = useState(false);
  const [isConfirmingFileImport, setConfirmingFileImport] = useState<{
    path: string;
    info: string;
  }>();
  const [backupDir, setBackupDir] = useState('');
  useEffect(() => {
    getDefaultBackupDirectory().then(setBackupDir);
  }, []);

  const handleChooseImportDir = useCallback(async () => {
    const { filePaths } = await RendererMessenger.openDialog({
      properties: ['openFile'],
      filters: [{ extensions: ['json'], name: 'JSON' }],
      defaultPath: backupDir,
    });
    const path = filePaths[0];
    if (!path) {
      return;
    }
    try {
      const backupStats = await rootStore.peekDatabaseFile(path);
      setConfirmingFileImport({
        path,
        info: `Backup contains ${backupStats.numTags} tags (currently ${tagStore.tagList.length}) and ${backupStats.numFiles} images (currently ${fileStore.numTotalFiles}).`,
      });
    } catch (e) {
      console.log(e);
      AppToaster.show({ message: 'Backup file is invalid', timeout: 5000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupDir]);

  const handleCreateExport = useCallback(async () => {
    let filename = `backup_${getFilenameFriendlyFormattedDateTime(new Date())}.json`;
    filename = filename.replaceAll(':', '-');
    const filepath = SysPath.join(backupDir, filename);
    try {
      await rootStore.backupDatabaseToFile(filepath);
      AppToaster.show({
        message: 'Backup created successfully!',
        clickAction: { label: 'View', onClick: () => shell.showItemInFolder(filepath) },
        timeout: 5000,
      });
    } catch (e) {
      console.error(e);
      AppToaster.show({
        message: 'Could not create backup, open DevTools for more details',
        clickAction: { label: 'View', onClick: RendererMessenger.toggleDevTools },
        timeout: 5000,
      });
    }
  }, [backupDir, rootStore]);

  return (
    <>
      <h2>Import/Export</h2>

      <h3>File Metadata</h3>

      <Callout icon={IconSet.INFO}>
        This option is useful for importing/exporting tags from/to other software. If you use a
        service like Dropbox or Google, you can write your tags to your files on one device and read
        them on other devices.
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
          onClick={() => setConfirmingMetadataExport(true)}
          styling="outlined"
        />
        <Alert
          open={isConfirmingMetadataExport}
          title="Are you sure you want to overwrite your files' tags?"
          information="This will overwrite any existing tags ('keywords') in those files with Allusion's tags. It is recommended to import all tags before writing new tags."
          primaryButtonText="Export"
          closeButtonText="Cancel"
          onClick={(button) => {
            if (button === DialogButton.PrimaryButton) {
              fileStore.writeTagsToFiles();
            }
            setConfirmingMetadataExport(false);
          }}
        />
      </ButtonGroup>

      <h3>Backup Database as File</h3>

      <Callout icon={IconSet.INFO}>Automatic back-ups are created every 10 minutes.</Callout>
      <fieldset>
        <legend>Backup Directory</legend>
        <div className="input-file">
          <input readOnly className="input input-file-value" value={backupDir} />
          <IconButton
            icon={IconSet.FOLDER_CLOSE}
            onClick={() => shell.showItemInFolder(backupDir)}
            text="Open in file explorer"
          />
        </div>
      </fieldset>

      <ButtonGroup>
        <Button
          text="Restore database from file..."
          onClick={handleChooseImportDir}
          icon={IconSet.IMPORT}
          styling="outlined"
        />
        <Button
          text="Backup database to file"
          onClick={handleCreateExport}
          icon={IconSet.OPEN_EXTERNAL}
          styling="outlined"
        />

        <Alert
          open={Boolean(isConfirmingFileImport)}
          title="Are you sure you want to restore the database from a backup?"
          information={`This will replace your current tag hierarchy and any tags assigned to images, so it is recommended you create a backup first.\n${isConfirmingFileImport?.info}`}
          primaryButtonText="Import"
          closeButtonText="Cancel"
          onClick={async (button) => {
            if (isConfirmingFileImport && button === DialogButton.PrimaryButton) {
              AppToaster.show({
                message: 'Restoring database... Allusion will restart',
                timeout: 5000,
              });
              try {
                await rootStore.restoreDatabaseFromFile(isConfirmingFileImport?.path);
                RendererMessenger.reload();
              } catch (e) {
                console.error('Could not restore backup', e);
                AppToaster.show({
                  message: 'Restoring database failed!',
                  timeout: 5000,
                });
              }
            }
            setConfirmingFileImport(undefined);
          }}
        />
      </ButtonGroup>
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
  useEffect(() => void getDefaultThumbnailDirectory().then(setDefaultThumbnailDir), []);

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
