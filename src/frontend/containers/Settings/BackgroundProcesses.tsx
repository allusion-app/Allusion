import { chromeExtensionUrl, firefoxExtensionUrl } from 'common/config';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { RendererMessenger } from 'src/ipc/renderer';
import { Button, IconSet, Toggle } from 'widgets';
import { Callout } from 'widgets/notifications';
import { useStore } from '../../contexts/StoreContext';

export const BackgroundProcesses = observer(() => {
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
  const toggleRunInBackground = (value: boolean) => {
    setRunInBackground(value);
    RendererMessenger.setRunInBackground({ isRunInBackground: value });
  };

  const [isClipEnabled, setClipServerEnabled] = useState(() =>
    RendererMessenger.isClipServerEnabled(),
  );
  const toggleClipServer = (value: boolean) => {
    setClipServerEnabled(value);
    RendererMessenger.setClipServerEnabled({ isClipServerRunning: value });
  };

  return (
    <>
      <Toggle checked={isRunInBackground} onChange={toggleRunInBackground}>
        Run in background
      </Toggle>
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
      <Toggle
        checked={isClipEnabled}
        onChange={
          isClipEnabled || importDirectory
            ? toggleClipServer
            : () => {
                alert(
                  'Please choose a download directory first, where images downloaded through the browser extension will be stored.',
                );
              }
        }
      >
        Enable browser extension support
      </Toggle>
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
