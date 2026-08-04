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
import ExternalLink from 'src/frontend/components/ExternalLink';
import FileInput from 'src/frontend/components/FileInput';
import { useTranslation } from 'react-i18next';

export const ImportExport = observer(() => {
  const { t } = useTranslation();
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

  const handleChooseImportDir = async ([path]: [string, ...string[]]) => {
    try {
      const [numTags, numFiles] = await rootStore.peekDatabaseFile(path);
      setConfirmingFileImport({
        path,
        info: t('settings.importExport.backupInfo', {
          numTags,
          tagCount: tagStore.count,
          numFiles,
          fileCount: fileStore.numTotalFiles,
        }),
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
      <h3>{t('settings.importExport.fileMetadataTitle')}</h3>

      <p>{t('settings.importExport.fileMetadataDesc')}</p>
      <Callout icon={IconSet.INFO}>
        {t('settings.importExport.separatorIntro')}{' '}
        <pre style={{ display: 'inline' }}>
          {['Food', 'Fruit', 'Apple'].join(exifTool.hierarchicalSeparator)}
        </pre>
        .
      </Callout>
      <div className="vstack">
        <label>
          {t('settings.importExport.hierarchicalSeparator')}
          <select
            value={exifTool.hierarchicalSeparator}
            onChange={(e) => exifTool.setHierarchicalSeparator(e.target.value)}
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
            text={t('settings.importExport.importFromMetadata')}
            onClick={fileStore.readTagsFromFiles}
            styling="outlined"
          />
          <Button
            text={t('settings.importExport.exportToMetadata')}
            onClick={() => setConfirmingMetadataExport(true)}
            styling="outlined"
          />
          <Alert
            open={isConfirmingMetadataExport}
            title={t('settings.importExport.confirmOverwriteTitle')}
            primaryButtonText={t('settings.importExport.export')}
            onClick={(button) => {
              if (button === DialogButton.PrimaryButton) {
                fileStore.writeTagsToFiles();
              }
              setConfirmingMetadataExport(false);
            }}
          >
            <p>{t('settings.importExport.overwriteInfo')}</p>
          </Alert>
        </ButtonGroup>
      </div>

      <h3>{t('settings.importExport.backupTitle')}</h3>

      <Callout icon={IconSet.INFO}>
        {t('settings.importExport.automaticBackupsIntro')}{' '}
        <ExternalLink url={backupDir}>{t('settings.importExport.backupDirectory')}</ExternalLink>.
      </Callout>
      <ButtonGroup>
        <FileInput
          className="btn-outlined"
          options={{
            properties: ['openFile'],
            filters: [{ extensions: ['json'], name: 'JSON' }],
            defaultPath: backupDir,
          }}
          onChange={handleChooseImportDir}
        >
          {IconSet.IMPORT} {t('settings.importExport.restoreFromFile')}
        </FileInput>
        <Button
          text={t('settings.importExport.backupToFile')}
          onClick={handleCreateExport}
          icon={IconSet.OPEN_EXTERNAL}
          styling="outlined"
        />

        <Alert
          open={Boolean(isConfirmingFileImport)}
          title={t('settings.importExport.restoreConfirmTitle')}
          primaryButtonText={t('settings.importExport.import')}
          onClick={async (button) => {
            if (isConfirmingFileImport && button === DialogButton.PrimaryButton) {
              AppToaster.show({
                message: t('settings.importExport.restoring'),
                timeout: 5000,
              });
              try {
                await rootStore.restoreDatabaseFromFile(isConfirmingFileImport.path);
                RendererMessenger.reload();
              } catch (e) {
                console.error('Could not restore backup', e);
                AppToaster.show({
                  message: t('settings.importExport.restoreFailed'),
                  timeout: 5000,
                });
              }
            }
            setConfirmingFileImport(undefined);
          }}
        >
          <p>{t('settings.importExport.restoreWarning')}</p>
          <p>{isConfirmingFileImport?.info}</p>
        </Alert>
      </ButtonGroup>
    </>
  );
});
