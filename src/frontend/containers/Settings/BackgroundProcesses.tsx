import { chromeExtensionUrl, firefoxExtensionUrl } from 'common/config';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ExternalLink from 'src/frontend/components/ExternalLink';
import { RendererMessenger } from 'src/ipc/renderer';
import { IconSet, Toggle } from 'widgets';
import { Callout } from 'widgets/notifications';
import { useStore } from '../../contexts/StoreContext';
import FileInput from 'src/frontend/components/FileInput';

export const BackgroundProcesses = observer(() => {
  const { uiStore, locationStore } = useStore();
  const { t } = useTranslation();

  const importDirectory = uiStore.importDirectory;
  const browseImportDirectory = async ([newDir]: [string, ...string[]]) => {
    if (locationStore.locationList.some((loc) => newDir.startsWith(loc.path))) {
      await RendererMessenger.setClipServerImportLocation(newDir);
      uiStore.setImportDirectory(newDir);
    } else {
      alert(t('settings.background.chooseLocationAlert'));
      return;
    }
  };

  const [isRunInBackground, setRunInBackground] = useState(RendererMessenger.isRunningInBackground);
  const toggleRunInBackground = (value: boolean) => {
    setRunInBackground(value);
    RendererMessenger.setRunInBackground({ isRunInBackground: value });
  };

  const [isClipEnabled, setClipServerEnabled] = useState(RendererMessenger.isClipServerEnabled);
  const toggleClipServer = (value: boolean) => {
    setClipServerEnabled(value);
    RendererMessenger.setClipServerEnabled({ isClipServerRunning: value });
  };

  return (
    <>
      <Toggle checked={isRunInBackground} onChange={toggleRunInBackground}>
        {t('settings.background.runInBackground')}
      </Toggle>
      <h3>{t('settings.background.browserExtension')}</h3>
      <Callout icon={IconSet.INFO}>
        {t('settings.background.installExtensionIntro')}{' '}
        <ExternalLink url={chromeExtensionUrl}>
          {t('settings.background.chromeWebStore')}
        </ExternalLink>{' '}
        {t('settings.background.or')}{' '}
        <ExternalLink url={firefoxExtensionUrl}>
          {t('settings.background.firefoxAddOns')}
        </ExternalLink>
        .
      </Callout>
      <Callout icon={IconSet.INFO}>{t('settings.background.keepWorkingWhenClosed')}</Callout>
      <Callout icon={IconSet.INFO}>{t('settings.background.chooseDownloadFolder')}</Callout>
      <Toggle
        checked={isClipEnabled}
        onChange={
          isClipEnabled || importDirectory
            ? toggleClipServer
            : () => alert(t('settings.background.chooseDownloadDirAlert'))
        }
      >
        {t('settings.background.runBrowserExtension')}
      </Toggle>
      <div className="filepicker">
        <FileInput
          className="btn-minimal filepicker-input"
          options={{
            properties: ['openDirectory'],
            defaultPath: importDirectory,
          }}
          onChange={browseImportDirectory}
        >
          {t('settings.background.change')}
        </FileInput>
        <h4 className="filepicker-label">{t('settings.background.downloadDirectory')}</h4>
        <div className="filepicker-path">
          {uiStore.importDirectory || t('settings.background.notSet')}
        </div>
      </div>
    </>
  );
});
