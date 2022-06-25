import { chromeExtensionUrl } from 'common/config';
import { getFilenameFriendlyFormattedDateTime } from 'common/fmt';
import { getThumbnailPath, isDirEmpty } from 'common/fs';
import { IS_DEV } from 'common/process';
import { WINDOW_STORAGE_KEY } from 'common/window';
import { shell } from 'electron';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import SysPath from 'path';
import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { TFunction, useTranslation } from 'react-i18next';
import { IMG_EXTENSIONS, IMG_EXTENSIONS_TYPE } from 'src/entities/File';
import { AppToaster } from 'src/frontend/components/Toaster';
import useCustomTheme from 'src/frontend/hooks/useCustomTheme';
import { locales } from 'src/i18n';
import { RendererMessenger } from 'src/Messaging';
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

  const { t } = useTranslation('settings');

  const toggleFullScreen = (e: React.FormEvent<HTMLInputElement>) => {
    const isFullScreen = e.currentTarget.checked;
    localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify({ isFullScreen }));
    RendererMessenger.setFullScreen(isFullScreen);
  };

  return (
    <>
      <h2>{t('appearance.header')}</h2>

      <h3>{t('appearance.interface.header')}</h3>

      <div className="input-group">
        <LanguagePicker />
      </div>

      <div className="input-group">
        <fieldset>
          <legend>{t('appearance.interface.darkTheme')}</legend>
          <Toggle checked={uiStore.theme === 'dark'} onChange={uiStore.toggleTheme} />
        </fieldset>

        <CustomThemePicker />
      </div>

      <div className="input-group">
        <Zoom />

        <fieldset>
          <legend>{t('appearance.interface.fullScreen')}</legend>
          <Toggle checked={uiStore.isFullScreen} onChange={toggleFullScreen} />
        </fieldset>
      </div>

      <h3>{t('appearance.thumbnail.header')}</h3>

      <div className="input-group">
        <fieldset>
          <legend>{t('appearance.thumbnail.showAssignedTags')}</legend>
          <Toggle
            checked={uiStore.isThumbnailTagOverlayEnabled}
            onChange={uiStore.toggleThumbnailTagOverlay}
          />
        </fieldset>
        <fieldset>
          <legend>{t('appearance.thumbnail.showFilename')}</legend>
          <Toggle
            checked={uiStore.isThumbnailFilenameOverlayEnabled}
            onChange={uiStore.toggleThumbnailFilenameOverlay}
          />
        </fieldset>
      </div>

      <br />

      <div className="input-group">
        <RadioGroup name={t('appearance.thumbnail.shape.label')}>
          {/* TODO: Tooltips don't work here, even with <Overlay /> in <Settings /> */}
          {/* <span data-tooltip="The layout method for images that do not fit exactly in their thumbnail container. Mainly affects the Grid layout.">
            {IconSet.INFO}
            Test test
          </span> */}
          <Radio
            label={t('appearance.thumbnail.shape.square')}
            checked={uiStore.thumbnailShape === 'square'}
            value="square"
            onChange={uiStore.setThumbnailSquare}
          />
          <Radio
            label={t('appearance.thumbnail.shape.letterbox')}
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

  const { t } = useTranslation('settings');

  useEffect(() => {
    RendererMessenger.setZoomFactor(localZoomFactor);
  }, [localZoomFactor]);

  return (
    <fieldset>
      <legend>{t('appearance.interface.uiScale')}</legend>
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

const LanguagePicker = () => {
  const { t, i18n } = useTranslation('settings');

  return (
    <fieldset>
      <legend>{t('appearance.interface.language')}</legend>
      <select
        onChange={async (e) => {
          await i18n.loadLanguages(e.target.value);
          await i18n.changeLanguage(e.target.value);
          console.log(i18n.getDataByLanguage('nl'));
        }}
        defaultValue={i18n.language}
      >
        {locales.map((lan) => (
          <option key={lan.value} value={lan.value}>
            {lan.label}
          </option>
        ))}
        {IS_DEV && <option value="cimode">{t('appearance.interface.languageDebug')}</option>}
      </select>{' '}
      {IS_DEV && (
        <>
          <IconButton
            icon={IconSet.RELOAD}
            text="Reload"
            onClick={async () => {
              await i18n.reloadResources();

              const currentLng = i18n.language;

              // Swap languages to trigger re-render
              await i18n.changeLanguage('cimode');
              await i18n.changeLanguage(currentLng);
            }}
            data-tooltip="Reload translation files (Dev mode only)"
          />
        </>
      )}
    </fieldset>
  );
};

const CustomThemePicker = () => {
  const { theme, setTheme, refresh, options, themeDir } = useCustomTheme();
  const { t } = useTranslation('settings');

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <fieldset>
      <legend>{t('appearance.interface.theme')}</legend>
      <select onChange={(e) => setTheme(e.target.value)} defaultValue={theme}>
        {<option value="">{t('appearance.interface.themeDefault')}</option>}
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
  const { t } = useTranslation('settings');

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
      const backupStats = await rootStore.peekDatabaseFile(path);
      setConfirmingFileImport({
        path,
        info: `Backup contains ${backupStats.numTags} tags (currently ${tagStore.count}) and ${backupStats.numFiles} images (currently ${fileStore.numTotalFiles}).`,
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
      <h2>{t('importExport.header')}</h2>

      <h3>{t('importExport.metadata')}</h3>

      <Callout icon={IconSet.INFO}>{t('importExport.metadataInfo')}</Callout>
      <fieldset>
        <legend>
          {t('importExport.hierarchicalSeparator')}{' '}
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
          text={t('importExport.import')}
          onClick={fileStore.readTagsFromFiles}
          styling="outlined"
        />
        <Button
          text={t('importExport.export')}
          onClick={() => setConfirmingMetadataExport(true)}
          styling="outlined"
        />
        <Alert
          open={isConfirmingMetadataExport}
          title={t('importExport.exportConfirmationTitle')}
          primaryButtonText="Export"
          onClick={(button) => {
            if (button === DialogButton.PrimaryButton) {
              fileStore.writeTagsToFiles();
            }
            setConfirmingMetadataExport(false);
          }}
        >
          <p>{t('importExport.exportConfirmationBody')}</p>
        </Alert>
      </ButtonGroup>

      <h3>{t('importExport.backupDatabase')}</h3>

      <Callout icon={IconSet.INFO}>{t('importExport.autoBackupInfo')}</Callout>
      <fieldset>
        <legend>{t('importExport.backupDirectory')}</legend>
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
          text={t('importExport.restoreBackup')}
          onClick={handleChooseImportDir}
          icon={IconSet.IMPORT}
          styling="outlined"
        />
        <Button
          text={t('importExport.createBackup')}
          onClick={handleCreateExport}
          icon={IconSet.OPEN_EXTERNAL}
          styling="outlined"
        />

        <Alert
          open={Boolean(isConfirmingFileImport)}
          title={t('importExport.restoreConfirmationTitle')}
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
          <p>{t('importExport.restoreConfirmationBody')}</p>
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
  psd: (
    <span title="Only a low-resolution thumbnail will be available" className="info-icon">
      {IconSet.INFO}
    </span>
  ),
};

const ImageFormatPicker = observer(() => {
  const { locationStore, fileStore } = useStore();
  const { t } = useTranslation(['common', 'settings']);

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
      <h2>{t('settings:imageFormats.header')}</h2>
      <fieldset>
        <legend>{t('settings:imageFormats.description')}</legend>
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
        <legend>{t('settings:imageFormats.confirmationWarning')}</legend>
        <Toggle
          checked={removeDisabledImages}
          onChange={toggleRemoveDisabledImages}
          onLabel={t('settings:imageFormats.excludeDisabledImages')}
          offLabel={t('settings:imageFormats.includeDisabledImages')}
        />
      </fieldset>

      <Button
        text={t('common:reset')}
        onClick={() => setNewEnabledFileExtensions(new Set(locationStore.enabledFileExtensions))}
      />
      <Button
        text={t('common:save')}
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
  const { t } = useTranslation('settings');

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

  const [isRunInBackground, setRunInBackground] = useState(
    RendererMessenger.isRunningInBackground(),
  );
  const toggleRunInBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRunInBackground(e.target.checked);
    RendererMessenger.setRunInBackground({ isRunInBackground: e.target.checked });
  };

  const [isClipEnabled, setClipServerEnabled] = useState(RendererMessenger.isClipServerEnabled());
  const toggleClipServer = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClipServerEnabled(e.target.checked);
    RendererMessenger.setClipServerEnabled({ isClipServerRunning: e.target.checked });
  };

  return (
    <>
      <h2>{t('backgroundProcesses.header')}</h2>
      <fieldset>
        <legend>{t('backgroundProcesses.runInBackground')}</legend>
        <Toggle checked={isRunInBackground} onChange={toggleRunInBackground} />
      </fieldset>

      <fieldset>
        <legend>{t('backgroundProcesses.downloadDirectory')}</legend>
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
        <legend>{t('backgroundProcesses.browserExtensionSupport')}</legend>
        <Toggle
          checked={isClipEnabled}
          onChange={
            isClipEnabled || importDirectory
              ? toggleClipServer
              : (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  alert(t('backgroundProcesses.chooseDownloadDirectoryFirst'));
                }
          }
        />
      </fieldset>

      <Callout icon={IconSet.INFO}>{t('backgroundProcesses.browserExtensionInfo')}</Callout>
      <Button
        onClick={() => shell.openExternal(chromeExtensionUrl)}
        styling="outlined"
        icon={IconSet.CHROME_DEVTOOLS}
        text={t('backgroundProcesses.browserExtensionCTA')}
      />
    </>
  );
});

const Shortcuts = observer(() => {
  const { t } = useTranslation('settings');
  return (
    <>
      <h2>{t('shortcuts.header')}</h2>
      <p>{t('shortcuts.instructions')}</p>
      <HotkeyMapper />
    </>
  );
});

const StartUpBehavior = observer(() => {
  const { uiStore } = useStore();
  const { t } = useTranslation('settings');

  const [isAutoUpdateEnabled, setAutoUpdateEnabled] = useState(
    RendererMessenger.isCheckUpdatesOnStartupEnabled(),
  );

  const toggleAutoUpdate = useCallback(() => {
    RendererMessenger.toggleCheckUpdatesOnStartup();
    setAutoUpdateEnabled((isOn) => !isOn);
  }, []);

  return (
    <>
      <h2>{t('shortcuts.header')}</h2>
      <h3>{t('startupBehavior.rememberSearchQuery')}</h3>
      <fieldset>
        <legend>{t('startupBehavior.rememberSearchQueryDescription')}</legend>
        <Toggle
          checked={uiStore.isRememberSearchEnabled}
          onChange={uiStore.toggleRememberSearchQuery}
        />
      </fieldset>

      <h3>{t('startupBehavior.automaticUpdates')}</h3>
      <fieldset>
        <legend></legend>
        <Toggle checked={isAutoUpdateEnabled} onChange={toggleAutoUpdate} />
      </fieldset>
    </>
  );
});

const Advanced = observer(() => {
  const { uiStore, fileStore } = useStore();
  const thumbnailDirectory = uiStore.thumbnailDirectory;
  const { t } = useTranslation('settings');

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
      <h2>{t('advanced.storage')}</h2>

      {/* Todo: Add support to toggle this */}
      {/* <Switch checked={true} onChange={() => alert('Not supported yet')} label="Generate thumbnails" /> */}
      <fieldset>
        <legend>{t('advanced.thumbnailDirectory')}</legend>
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

      <h2>{t('advanced.development')}</h2>
      <ButtonGroup>
        <ClearDbButton />
        <Button
          onClick={RendererMessenger.toggleDevTools}
          styling="outlined"
          icon={IconSet.CHROME_DEVTOOLS}
          text={t('advanced.devTools')}
        />
      </ButtonGroup>
    </>
  );
});

const SETTINGS_TABS: (t: TFunction<'settings', undefined>) => TabItem[] = (t) => [
  {
    label: t('appearance.header'),
    content: <Appearance />,
  },
  {
    label: t('shortcuts.header'),
    content: <Shortcuts />,
  },
  {
    label: t('startupBehavior.header'),
    content: <StartUpBehavior />,
  },
  {
    label: t('imageFormats.header'),
    content: <ImageFormatPicker />,
  },
  {
    label: t('importExport.header'),
    content: <ImportExport />,
  },
  {
    label: t('backgroundProcesses.header'),
    content: <BackgroundProcesses />,
  },
  {
    label: t('advanced.header'),
    content: <Advanced />,
  },
];
