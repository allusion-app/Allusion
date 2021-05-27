import { shell } from 'electron';
import { action, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import SysPath from 'path';
import React, { useEffect, useState } from 'react';
import ExifIO from 'src/backend/ExifIO';
import {
  chromeExtensionUrl,
  getDefaultBackupDirectory,
  getDefaultThumbnailDirectory,
} from 'src/config';
import { ClientFile } from 'src/entities/File';
import { AppToaster } from 'src/frontend/components/Toaster';
import { Theme } from 'src/frontend/stores/Preferences';
import TagStore from 'src/frontend/stores/TagStore';
import { RendererMessenger } from 'src/Messaging';
import { Button, ButtonGroup, IconButton, IconSet, Radio, RadioGroup, Toggle } from 'widgets';
import { Callout } from 'widgets/notifications';
import { Alert, DialogButton } from 'widgets/popovers';
import PopupWindow from '../../components/PopupWindow';
import { useStore } from '../../contexts/StoreContext';
import { moveThumbnailDir } from '../../ThumbnailGeneration';
import { getFilenameFriendlyFormattedDateTime, getThumbnailPath, isDirEmpty } from '../../utils';
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
      additionalCloseKey={uiStore.preferences.hotkeyMap.toggleSettings}
    >
      <Tabs id="settings" className={uiStore.preferences.theme} tabItems={SETTINGS_TABS()} />
    </PopupWindow>
  );
};

export default observer(Settings);

const Appearance = observer(() => {
  const { uiStore } = useStore();

  return (
    <>
      <h2>Appearance</h2>

      <h3>Interface</h3>
      <fieldset>
        <legend>Dark theme</legend>
        <Toggle checked={uiStore.preferences.theme === Theme.Dark} onChange={uiStore.toggleTheme} />
      </fieldset>

      <fieldset>
        <legend>Full screen</legend>
        <Toggle checked={uiStore.preferences.isFullScreen} onChange={uiStore.toggleFullScreen} />
      </fieldset>

      <Zoom />

      <h3>Thumbnail</h3>
      <fieldset>
        <legend>Show assigned tags</legend>
        <Toggle
          checked={uiStore.preferences.showThumbnailTags}
          onChange={uiStore.toggleThumbnailTagOverlay}
        />
      </fieldset>

      <div className="settings-thumbnail">
        <RadioGroup name="Size">
          <Radio
            label="Small"
            value="small"
            checked={uiStore.preferences.thumbnailSize === 'small'}
            onChange={uiStore.setThumbnailSmall}
          />
          <Radio
            label="Medium"
            value="medium"
            checked={uiStore.preferences.thumbnailSize === 'medium'}
            onChange={uiStore.setThumbnailMedium}
          />
          <Radio
            label="Large"
            value="large"
            checked={uiStore.preferences.thumbnailSize === 'large'}
            onChange={uiStore.setThumbnailLarge}
          />
        </RadioGroup>
        <RadioGroup name="Shape">
          <Radio
            label="Square"
            checked={uiStore.preferences.thumbnailShape === 'square'}
            value="square"
            onChange={uiStore.setThumbnailSquare}
          />
          <Radio
            label="Letterbox"
            checked={uiStore.preferences.thumbnailShape === 'letterbox'}
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
    <fieldset>
      <legend>Zoom</legend>
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
    getDefaultBackupDirectory().then(setBackupDir);
  }, []);

  const handleChooseImportDir = async () => {
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

  const importTags = action(async () => {
    const toastKey = 'read-tags-from-file';
    let lastProgress = '0';
    const handleProgress = (progress: number) => {
      const p = (progress * 100).toFixed(0);
      if (lastProgress === p) {
        return;
      }
      lastProgress = p;
      AppToaster.show(
        {
          message: `Reading tags from files ${p}%...`,
          timeout: 0,
        },
        toastKey,
      );
    };
    const message = await readTagsFromFiles(
      exifTool,
      fileStore.fileList.slice(),
      tagStore,
      handleProgress,
    );
    AppToaster.show({ message, timeout: 5000 }, toastKey);
  });

  const exportTags = action(async () => {
    const toastKey = 'write-tags-to-file';
    const lastProgress = '0';
    const handleProgress = (progress: number) => {
      const p = (progress * 100).toFixed(0);
      if (lastProgress === p) {
        return;
      }
      AppToaster.show(
        {
          message: `Writing tags to files ${p}%...`,
          timeout: 0,
        },
        toastKey,
      );
    };
    const message = await writeTagsToFiles(
      exifTool,
      fileStore.fileList.slice(),
      tagStore,
      handleProgress,
    );
    AppToaster.show({ message, timeout: 5000 }, toastKey);
  });

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
        <Button text="Import tags from file metadata" onClick={importTags} styling="outlined" />
        <Button
          text="Export tags to file metadata"
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
              exportTags();
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
  const { uiStore, locationStore } = useStore();

  const importDirectory = uiStore.preferences.importDirectory;
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
      <h2>Options</h2>
      <fieldset>
        <legend>Run in background</legend>
        <Toggle checked={isRunInBackground} onChange={toggleRunInBackground} />
      </fieldset>

      <fieldset>
        <legend>Browser extension support</legend>
        <Toggle
          checked={isClipEnabled}
          onChange={
            isClipEnabled || importDirectory
              ? toggleClipServer
              : (e) => {
                  console.log('came here');
                  e.preventDefault();
                  e.stopPropagation();
                  alert(
                    'Please choose a download directory first, where images downloaded through the browser extension will be stored.',
                  );
                }
          }
        />
      </fieldset>

      <fieldset>
        <legend>Browser extension download directory (must be in a Location)</legend>
        <div className="input-file">
          <input
            readOnly
            className="input input-file-value"
            value={uiStore.preferences.importDirectory ?? 'Not set'}
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
  const { uiStore, fileStore } = useStore();
  const thumbnailDirectory = uiStore.preferences.thumbnailDirectory;

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
          {defaultThumbnailDir !== uiStore.preferences.thumbnailDirectory && (
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

async function readTagsFromFiles(
  exifTool: ExifIO,
  fileList: readonly Readonly<ClientFile>[],
  tagStore: TagStore,
  progressHook: (progress: number) => void,
): Promise<string> {
  try {
    await exifTool.initialize();
    const numFiles = fileList.length;
    const root = runInAction(() => tagStore.root);
    for (let i = 0; i < numFiles; i++) {
      progressHook(i / numFiles);
      const absolutePath = fileList[i].absolutePath;

      try {
        const tagsNameHierarchies = await exifTool.readTags(absolutePath);

        // Now that we know the tag names in file metadata, add them to the files in Allusion
        // Main idea: Find matching tag with same name, otherwise, insert new
        //   for now, just match by the name at the bottom of the hierarchy

        for (const tagHierarchy of tagsNameHierarchies) {
          const match = tagStore.findByName(tagHierarchy[tagHierarchy.length - 1]);
          if (match !== undefined) {
            // If there is a match to the leaf tag, just add it to the file
            fileList[i].addTag(match);
          } else {
            // If there is no direct match to the leaf, insert it in the tag hierarchy: first check if any of its parents exist
            let curTag = root;
            for (const nodeName of tagHierarchy) {
              const nodeMatch = tagStore.findByName(nodeName);
              if (nodeMatch !== undefined) {
                curTag = nodeMatch;
              } else {
                curTag = await tagStore.create(nodeName, curTag);
              }
            }
            fileList[i].addTag(curTag);
          }
        }
      } catch (e) {
        console.error('Could not import tags for', absolutePath, e);
      }
    }
    return 'Reading tags from files... Done!';
  } catch (e) {
    console.error('Could not read tags', e);
    return 'Reading tags from files failed. Check the dev console for more details';
  } finally {
    await exifTool.close();
  }
}

async function writeTagsToFiles(
  exifTool: ExifIO,
  fileList: readonly Readonly<ClientFile>[],
  tagStore: TagStore,
  progressHook: (progress: number) => void,
) {
  try {
    await exifTool.initialize();
    const numFiles = fileList.length;
    const tagFilePairs = fileList.map(
      action((f) => ({
        absolutePath: f.absolutePath,
        tagHierarchy: Array.from(f.tags).map((t) => tagStore.getTreePath(t).map((t) => t.name)),
      })),
    );
    console.log(tagFilePairs);
    for (let i = 0; i < tagFilePairs.length; i++) {
      progressHook(i / numFiles);

      const { absolutePath, tagHierarchy } = tagFilePairs[i];
      try {
        await exifTool.writeTags(absolutePath, tagHierarchy);
      } catch (e) {
        console.error('Could not write tags to', absolutePath, tagHierarchy, e);
      }
    }
    return 'Writing tags to files... Done!';
  } catch (e) {
    console.error('Could not write tags', e);
    return 'Writing tags to files failed. Check the dev console for more details';
  } finally {
    exifTool.close();
  }
}
