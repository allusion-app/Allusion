import { chromeExtensionUrl, firefoxExtensionUrl } from 'common/config';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import ExternalLink from 'src/frontend/components/ExternalLink';
import { RendererMessenger } from 'src/ipc/renderer';
import { IconSet, Toggle } from 'widgets';
import { Callout } from 'widgets/notifications';
import { useStore } from '../../contexts/StoreContext';
import FileInput from 'src/frontend/components/FileInput';

export const BackgroundProcesses = observer(() => {
  const { uiStore, locationStore } = useStore();

  const importDirectory = uiStore.importDirectory;
  const browseImportDirectory = async ([newDir]: [string, ...string[]]) => {
    if (locationStore.locationList.some((loc) => newDir.startsWith(loc.path))) {
      await RendererMessenger.setClipServerImportLocation(newDir);
      uiStore.setImportDirectory(newDir);
    } else {
      alert('Please choose a location or any of its subfolders.');
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
        Run in background
      </Toggle>
      <h3>Browser Extension</h3>
      <Callout icon={IconSet.INFO}>
        You need to install the browser extension before either in the{' '}
        <ExternalLink url={chromeExtensionUrl}>Chrome Web Store</ExternalLink> or{' '}
        <ExternalLink url={firefoxExtensionUrl}>Firefox Browser Add-Ons</ExternalLink>.
      </Callout>
      <Callout icon={IconSet.INFO}>
        To keep the browser extension working even when Allusion is closed, you must enable the Run
        in background option.
      </Callout>
      <Callout icon={IconSet.INFO}>
        For the browser extension to work, choose a download folder that is in one of your locations
        already added to Allusion.
      </Callout>
      <Toggle
        checked={isClipEnabled}
        onChange={
          isClipEnabled || importDirectory
            ? toggleClipServer
            : () => alert('Please choose a download directory first.')
        }
      >
        Run browser extension
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
          Change...
        </FileInput>
        <h4 className="filepicker-label">Download Directory</h4>
        <div className="filepicker-path">{uiStore.importDirectory || 'Not set'}</div>
      </div>
    </>
  );
});
