import { getFilenameFriendlyFormattedDateTime } from 'common/fmt';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import SysPath from 'path';
import React, { useEffect, useState } from 'react';
import { AppToaster } from 'src/frontend/components/Toaster';
import { RendererMessenger } from 'src/ipc/renderer';
import { Button, ButtonGroup, IconSet } from 'widgets';
import { Callout } from 'widgets/notifications';
import { Alert, DialogButton } from 'widgets/popovers';
import { useStore } from '../../contexts/StoreContext';

export const ImportExport = observer(() => {
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
