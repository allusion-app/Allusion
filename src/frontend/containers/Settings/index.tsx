import { chromeExtensionUrl, firefoxExtensionUrl } from 'common/config';
import { getFilenameFriendlyFormattedDateTime } from 'common/fmt';
import { getThumbnailPath, isDirEmpty } from 'common/fs';
import { WINDOW_STORAGE_KEY } from 'common/window';
import { shell } from 'electron';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import SysPath from 'path';
import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { IMG_EXTENSIONS, IMG_EXTENSIONS_TYPE } from 'src/api/file';
import { AppToaster } from 'src/frontend/components/Toaster';
import useCustomTheme from 'src/frontend/hooks/useCustomTheme';
import { RendererMessenger } from 'src/ipc/renderer';
import {
  Button,
  ButtonGroup,
  Checkbox,
  IconButton,
  IconSet,
  Radio,
  RadioGroup,
  Toggle,
} from 'widgets';
import { Callout } from 'widgets/notifications';
import { Alert, DialogButton } from 'widgets/popovers';
import PopupWindow from '../../components/PopupWindow';
import { useStore } from '../../contexts/StoreContext';
import { moveThumbnailDir } from '../../image/ThumbnailGeneration';
import { ClearDbButton } from '../ErrorBoundary';
import HotkeyMapper from './HotkeyMapper';
import Tabs, { TabItem } from './Tabs';

const Settings = () => {
  const { uiStore } = useStore();

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
        <Tabs initTabItems={SETTINGS_TABS} />
      </div>
    </PopupWindow>
  );
};

export default observer(Settings);

const Appearance = observer(() => {
  const { uiStore } = useStore();

  const toggleFullScreen = (e: React.FormEvent<HTMLInputElement>) => {
    const isFullScreen = e.currentTarget.checked;
    localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify({ isFullScreen }));
    RendererMessenger.setFullScreen(isFullScreen);
  };

  return (
    <>
      <h2>Appearance</h2>

      <h3>Interface</h3>

      <div className="input-group">
        <fieldset>
          <legend>Dark theme</legend>
          <Toggle checked={uiStore.theme === 'dark'} onChange={uiStore.toggleTheme} />
        </fieldset>

        <CustomThemePicker />
      </div>

      <div className="input-group">
        <Zoom />

        <fieldset>
          <legend>Full screen</legend>
          <Toggle checked={uiStore.isFullScreen} onChange={toggleFullScreen} />
        </fieldset>
      </div>

      <div className="input-group">
        <RadioGroup name="Picture upscaling">
          <Radio
            label="Smooth"
            checked={uiStore.upscaleMode === 'smooth'}
            value="smooth"
            onChange={uiStore.setUpscaleModeSmooth}
          />
          <Radio
            label="Pixelated"
            checked={uiStore.upscaleMode === 'pixelated'}
            value="pixelated"
            onChange={uiStore.setUpscaleModePixelated}
          />
        </RadioGroup>
      </div>

      <h3>Thumbnail</h3>

      <div className="input-group">
        <fieldset>
          <legend>Show assigned tags</legend>
          <Toggle
            checked={uiStore.isThumbnailTagOverlayEnabled}
            onChange={uiStore.toggleThumbnailTagOverlay}
          />
        </fieldset>
        <fieldset>
          <legend>Show filename on thumbnail</legend>
          <Toggle
            checked={uiStore.isThumbnailFilenameOverlayEnabled}
            onChange={uiStore.toggleThumbnailFilenameOverlay}
          />
        </fieldset>
        <fieldset>
          <legend>Show resolution on thumbnail</legend>
          <Toggle
            checked={uiStore.isThumbnailResolutionOverlayEnabled}
            onChange={uiStore.toggleThumbnailResolutionOverlay}
          />
        </fieldset>
      </div>

      <br />

      <div className="input-group">
        <RadioGroup name="Shape">
          {/* TODO: Tooltips don't work here, even with <Overlay /> in <Settings /> */}
          {/* <span data-tooltip="The layout method for images that do not fit exactly in their thumbnail container. Mainly affects the Grid layout.">
            {IconSet.INFO}
            Test test
          </span> */}
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
  const [localZoomFactor, setLocalZoomFactor] = useState(() => RendererMessenger.getZoomFactor());

  useEffect(() => {
    RendererMessenger.setZoomFactor(localZoomFactor);
  }, [localZoomFactor]);

  return (
    <fieldset>
      <legend>UI Scale (zoom)</legend>
      <span className="zoom-input">
        <IconButton
          icon={<span>-</span>}
          onClick={() => setLocalZoomFactor(localZoomFactor - 0.1)}
          text="Decrease"
        />
        <span>{Math.round(100 * localZoomFactor)}%</span>
        <IconButton
          icon={<span>+</span>}
          onClick={() => setLocalZoomFactor(localZoomFactor + 0.1)}
          text="Increase"
        />
      </span>
    </fieldset>
  );
};

const CustomThemePicker = () => {
  const { theme, setTheme, refresh, options, themeDir } = useCustomTheme();

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <fieldset>
      <legend>Theme customization</legend>
      <select onChange={(e) => setTheme(e.target.value)} defaultValue={theme}>
        {<option value="">None (default)</option>}
        {options.map((file) => (
          <option key={file} value={file}>
            {file.replace('.css', '')}
          </option>
        ))}
      </select>{' '}
      <IconButton
        icon={IconSet.RELOAD}
        text="Refresh"
        onClick={refresh}
        data-tooltip="Reload the list of themes and current theme"
      />
      <IconButton
        icon={IconSet.FOLDER_CLOSE}
        text="Open"
        onClick={() => shell.showItemInFolder(themeDir)}
        data-tooltip="Open the directory containing the theme files"
      />
    </fieldset>
  );
};

const ImportExport = observer(() => {
  const rootStore = useStore();
  const { fileStore, tagStore, exifTool } = rootStore;
  const [isConfirmingMetadataExport, setConfirmingMetadataExport] = useState(false);
  const [isConfirmingFileImport, setConfirmingFileImport] = useState<{
    path: string;
    info: string;
  }>();
  const [backupDir, setBackupDir] = useState('');
  useEffect(() => {
    RendererMessenger.getDefaultBackupDirectory().then(setBackupDir);
  }, []);

  const handleChooseImportDir = async () => {
    const { filePaths } = await RendererMessenger.showOpenDialog({
      properties: ['openFile'],
      filters: [{ extensions: ['json'], name: 'JSON' }],
      defaultPath: backupDir,
    });
    const path = filePaths[0];
    if (!path) {
      return;
    }
    try {
      const [numTags, numFiles] = await rootStore.peekDatabaseFile(path);
      setConfirmingFileImport({
        path,
        info: `Backup contains ${numTags} tags (currently ${tagStore.count}) and ${numFiles} images (currently ${fileStore.numTotalFiles}).`,
      });
    } catch (e) {
      console.log(e);
      AppToaster.show({ message: 'Backup file is invalid', timeout: 5000 });
    }
  };

  const handleCreateExport = async () => {
    const formattedDateTime = getFilenameFriendlyFormattedDateTime(new Date());
    const filename = `backup_${formattedDateTime}.json`.replaceAll(':', '-');
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
  };

  return (
    <>
      <h2>Import/Export</h2>

      <h3>File Metadata</h3>

      <Callout icon={IconSet.INFO}>
        This option is useful for importing/exporting tags from/to other software. If you use a
        service like Dropbox or Google, you can write your tags to your files on one device and read
        them on other devices.
      </Callout>
      <fieldset>
        <legend>
          Hierarchical separator, e.g.{' '}
          <pre style={{ display: 'inline' }}>
            {['Food', 'Fruit', 'Apple'].join(exifTool.hierarchicalSeparator)}
          </pre>
        </legend>
        <select
          value={exifTool.hierarchicalSeparator}
          onChange={(e) => exifTool.setHierarchicalSeparator(e.target.value)}
        >
          <option value="|">|</option>
          <option value="/">/</option>
          <option value="\">\</option>
          <option value=":">:</option>
        </select>
      </fieldset>
      {/* TODO: adobe bridge has option to read with multiple separators */}

      <ButtonGroup>
        <Button
          text="Import tags from file metadata"
          onClick={fileStore.readTagsFromFiles}
          styling="outlined"
        />
        <Button
          text="Export tags to file metadata"
          onClick={() => setConfirmingMetadataExport(true)}
          styling="outlined"
        />
        <Alert
          open={isConfirmingMetadataExport}
          title="Are you sure you want to overwrite your files' tags?"
          primaryButtonText="Export"
          onClick={(button) => {
            if (button === DialogButton.PrimaryButton) {
              fileStore.writeTagsToFiles();
            }
            setConfirmingMetadataExport(false);
          }}
        >
          <p>
            This will overwrite any existing tags (a.k.a. keywords) in those files with
            Allusion&#39;s tags. It is recommended to import all tags before writing new tags.
          </p>
        </Alert>
      </ButtonGroup>

      <h3>Backup Database as File</h3>

      <Callout icon={IconSet.INFO}>Automatic back-ups are created every 10 minutes.</Callout>
      <fieldset>
        <legend>Backup Directory</legend>
        <div className="input-file">
          <input readOnly className="input input-file-value" value={backupDir} />
          <Button
            styling="minimal"
            icon={IconSet.FOLDER_CLOSE}
            text="Open"
            onClick={() => shell.showItemInFolder(backupDir)}
          />
        </div>
      </fieldset>

      <ButtonGroup>
        <Button
          text="Restore database from file"
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
          primaryButtonText="Import"
          onClick={async (button) => {
            if (isConfirmingFileImport && button === DialogButton.PrimaryButton) {
              AppToaster.show({
                message: 'Restoring database... Allusion will restart',
                timeout: 5000,
              });
              try {
                await rootStore.restoreDatabaseFromFile(isConfirmingFileImport.path);
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
        >
          <p>
            This will replace your current tag hierarchy and any tags assigned to images, so it is
            recommended you create a backup first.
          </p>
          <p>{isConfirmingFileImport?.info}</p>
        </Alert>
      </ButtonGroup>
    </>
  );
});

const imageFormatInts: Partial<Record<IMG_EXTENSIONS_TYPE, ReactNode>> = {
  exr: (
    <span
      // TODO: Get TooltipLayer working in PopupWindow: tried a bunch of things but no bueno
      title="Experimental: May slow down the application when enabled (disabled by default)"
      className="info-icon"
    >
      {IconSet.WARNING}
    </span>
  ),
};

const ImageFormatPicker = observer(() => {
  const { locationStore, fileStore } = useStore();

  const [removeDisabledImages, setRemoveDisabledImages] = useState(true);
  const toggleRemoveDisabledImages = useCallback(() => setRemoveDisabledImages((val) => !val), []);

  const [newEnabledFileExtensions, setNewEnabledFileExtensions] = useState(
    new Set(locationStore.enabledFileExtensions),
  );
  const toggleExtension = useCallback(
    (ext: IMG_EXTENSIONS_TYPE) => {
      const newNewEnabledFileExtensions = new Set(newEnabledFileExtensions);
      if (newEnabledFileExtensions.has(ext)) {
        newNewEnabledFileExtensions.delete(ext);
      } else {
        newNewEnabledFileExtensions.add(ext);
      }
      setNewEnabledFileExtensions(newNewEnabledFileExtensions);
    },
    [newEnabledFileExtensions],
  );

  const onSubmit = useCallback(async () => {
    if (removeDisabledImages) {
      const extensionsToDelete = IMG_EXTENSIONS.filter((ext) => !newEnabledFileExtensions.has(ext));

      for (const ext of extensionsToDelete) {
        await fileStore.deleteFilesByExtension(ext);
      }
    }

    locationStore.setSupportedImageExtensions(newEnabledFileExtensions);

    window.alert('Allusion will restart to load your new preferences.');

    RendererMessenger.reload();
  }, [fileStore, locationStore, newEnabledFileExtensions, removeDisabledImages]);

  // TODO: group extensions by type: JPG+JPEG+JFIF, TIF+TIFF, etc
  return (
    <>
      <h2>Image formats</h2>
      <fieldset>
        <legend>Image formats to be discovered by Allusion in your Locations</legend>
        <div className="checkbox-set-container">
          {IMG_EXTENSIONS.map((ext) => (
            <div className="item" key={ext}>
              <Checkbox
                label={ext}
                checked={newEnabledFileExtensions.has(ext)}
                onChange={() => toggleExtension(ext)}
              />
              {imageFormatInts[ext] && <> {imageFormatInts[ext]}</>}
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>
          There may already be images discovered by Allusion with file extensions you have disabled.
          <br />
          Would you like to exclude these images from Allusion after saving, or keep them around?
        </legend>
        <Toggle
          checked={removeDisabledImages}
          onChange={toggleRemoveDisabledImages}
          onLabel="Exclude images"
          offLabel="Keep images"
        />
      </fieldset>

      <Button
        text="Reset"
        onClick={() => setNewEnabledFileExtensions(new Set(locationStore.enabledFileExtensions))}
      />
      <Button
        text="Save"
        styling="filled"
        onClick={onSubmit}
        disabled={
          newEnabledFileExtensions.size === 0 ||
          // Disabled if identical
          (newEnabledFileExtensions.size === locationStore.enabledFileExtensions.size &&
            Array.from(newEnabledFileExtensions.values()).every((ext) =>
              locationStore.enabledFileExtensions.has(ext),
            ))
        }
      />
    </>
  );
});

const BackgroundProcesses = observer(() => {
  const { uiStore, locationStore } = useStore();

  const importDirectory = uiStore.importDirectory;
  const browseImportDirectory = async () => {
    const { filePaths: dirs } = await RendererMessenger.showOpenDialog({
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

  const [isRunInBackground, setRunInBackground] = useState(() =>
    RendererMessenger.isRunningInBackground(),
  );
  const toggleRunInBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRunInBackground(e.target.checked);
    RendererMessenger.setRunInBackground({ isRunInBackground: e.target.checked });
  };

  const [isClipEnabled, setClipServerEnabled] = useState(() =>
    RendererMessenger.isClipServerEnabled(),
  );
  const toggleClipServer = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClipServerEnabled(e.target.checked);
    RendererMessenger.setClipServerEnabled({ isClipServerRunning: e.target.checked });
  };

  return (
    <>
      <h2>Options</h2>
      <fieldset>
        <legend>Run in background</legend>
        <Toggle checked={isRunInBackground} onChange={toggleRunInBackground} />
      </fieldset>
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
      <fieldset>
        <legend>Browser extension support</legend>
        <Toggle
          checked={isClipEnabled}
          onChange={
            isClipEnabled || importDirectory
              ? toggleClipServer
              : (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  alert(
                    'Please choose a download directory first, where images downloaded through the browser extension will be stored.',
                  );
                }
          }
        />
      </fieldset>
      <Callout icon={IconSet.INFO}>
        For the browser extension to work, first choose a download folder that is in one of your
        locations already added to Allusion, then enable the browser extension support toggle.
        Finally, if you want the browser extension to work even when Allusion is not open, enable
        the run in background option.
      </Callout>
      <Button
        onClick={() => shell.openExternal(chromeExtensionUrl)}
        styling="outlined"
        text="Chrome Web Store"
      />{' '}
      <Button
        onClick={() => shell.openExternal(firefoxExtensionUrl)}
        styling="outlined"
        text="FireFox add-on"
      />
    </>
  );
});

const Shortcuts = observer(() => {
  return (
    <>
      <h2>Keyboard shortcuts</h2>
      <p>
        Click on a key combination to modify it. After typing your new combination, press Enter to
        confirm or Escape to cancel.
      </p>
      <HotkeyMapper />
    </>
  );
});

const StartUpBehavior = observer(() => {
  const { uiStore } = useStore();

  const [isAutoUpdateEnabled, setAutoUpdateEnabled] = useState(() =>
    RendererMessenger.isCheckUpdatesOnStartupEnabled(),
  );

  const toggleAutoUpdate = useCallback(() => {
    RendererMessenger.toggleCheckUpdatesOnStartup();
    setAutoUpdateEnabled((isOn) => !isOn);
  }, []);

  return (
    <>
      <h2>Start-up behavior</h2>
      <h3>Remember last search query</h3>
      <fieldset>
        <legend>
          Will restore the search query you had open when you last quit Allusion, so the same images
          will be shown in the gallery
        </legend>
        <Toggle
          checked={uiStore.isRememberSearchEnabled}
          onChange={uiStore.toggleRememberSearchQuery}
        />
      </fieldset>

      <h3>Automatic updates</h3>
      <fieldset>
        <legend>Check for updates when starting Allusion</legend>
        <Toggle checked={isAutoUpdateEnabled} onChange={toggleAutoUpdate} />
      </fieldset>
    </>
  );
});

const Advanced = observer(() => {
  const { uiStore, fileStore } = useStore();
  const thumbnailDirectory = uiStore.thumbnailDirectory;

  const [defaultThumbnailDir, setDefaultThumbnailDir] = useState('');
  useEffect(() => {
    RendererMessenger.getDefaultThumbnailDirectory().then(setDefaultThumbnailDir);
  }, []);

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
    const { filePaths: dirs } = await RendererMessenger.showOpenDialog({
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

const SETTINGS_TABS: () => TabItem[] = () => [
  {
    label: 'Appearance',
    content: <Appearance />,
  },
  {
    label: 'Shortcuts',
    content: <Shortcuts />,
  },
  {
    label: 'Start-up behavior',
    content: <StartUpBehavior />,
  },
  {
    label: 'Image formats',
    content: <ImageFormatPicker />,
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
