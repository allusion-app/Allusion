import { getThumbnailPath, isDirEmpty } from 'common/fs';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FileInput from 'src/frontend/components/FileInput';
import { RendererMessenger } from 'src/ipc/renderer';
import { Button, ButtonGroup, IconSet } from 'widgets';
import { useStore } from '../../contexts/StoreContext';
import { moveThumbnailDir } from '../../image/ThumbnailGeneration';
import { ClearDbButton } from '../ErrorBoundary';
import { Callout } from 'widgets/notifications';
import ExternalLink from 'src/frontend/components/ExternalLink';

export const Advanced = observer(() => {
  const { uiStore, fileStore } = useStore();
  const thumbnailDirectory = uiStore.thumbnailDirectory;

  const [defaultThumbnailDir, setDefaultThumbnailDir] = useState('');
  useEffect(() => {
    RendererMessenger.getDefaultThumbnailDirectory().then(setDefaultThumbnailDir);
  }, []);

  const { t } = useTranslation();

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

  const browseThumbnailDirectory = async ([newDir]: [string, ...string[]]) => {
    if (!(await isDirEmpty(newDir))) {
      if (window.confirm(t('settings.advanced.confirmNonEmptyDir', { directory: newDir }))) {
        changeThumbnailDirectory(newDir);
      }
    } else {
      changeThumbnailDirectory(newDir);
    }
  };

  return (
    <>
      {/* Todo: Add support to toggle this */}
      {/* <Switch checked={true} onChange={() => alert('Not supported yet')} label="Generate thumbnails" /> */}
      <Callout icon={IconSet.INFO}>
        {t('settings.advanced.defaultThumbIntro')}{' '}
        <ExternalLink url={defaultThumbnailDir}>{t('settings.advanced.tempFilesDir')}</ExternalLink>
        .
      </Callout>
      <div className="filepicker">
        <FileInput
          className="btn-minimal filepicker-input"
          options={{
            properties: ['openDirectory'],
            defaultPath: thumbnailDirectory,
          }}
          onChange={browseThumbnailDirectory}
        >
          {t('button.change')}
        </FileInput>
        <h3 className="filepicker-label">{t('settings.advanced.thumbnailDirectory')}</h3>
        <div className="filepicker-path">{thumbnailDirectory}</div>
      </div>

      <h3>{t('settings.advanced.development')}</h3>
      <ButtonGroup>
        <ClearDbButton />
        <Button
          onClick={RendererMessenger.toggleDevTools}
          styling="outlined"
          icon={IconSet.CHROME_DEVTOOLS}
          text={t('settings.advanced.toggleDevTools')}
        />
      </ButtonGroup>
    </>
  );
});
