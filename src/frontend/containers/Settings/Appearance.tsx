import { WINDOW_STORAGE_KEY } from 'common/window';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import useCustomTheme from 'src/frontend/hooks/useCustomTheme';
import { RendererMessenger } from 'src/ipc/renderer';
import { IconButton, IconSet, Radio, RadioGroup, Toggle } from 'widgets';
import { useStore } from '../../contexts/StoreContext';

export const Appearance = observer(() => {
  const { uiStore } = useStore();

  const toggleFullScreen = (value: boolean) => {
    localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify({ isFullScreen: value }));
    RendererMessenger.setFullScreen(value);
  };

  return (
    <>
      <h2>Appearance</h2>

      <h3>Interface</h3>

      <div className="input-group">
        <Toggle checked={uiStore.theme === 'dark'} onChange={uiStore.toggleTheme}>
          Enable dark theme
        </Toggle>

        <CustomThemePicker />
      </div>

      <div className="input-group">
        <Zoom />

        <Toggle checked={uiStore.isFullScreen} onChange={toggleFullScreen}>
          Show full screen
        </Toggle>
      </div>

      <div className="input-group">
        <RadioGroup
          name="Picture Upscaling"
          value={uiStore.upscaleMode}
          onChange={uiStore.setUpscaleMode}
        >
          <Radio value="smooth">Smooth</Radio>
          <Radio value="pixelated">Pixelated</Radio>
        </RadioGroup>
      </div>

      <h3>Thumbnail</h3>

      <div className="input-group">
        <Toggle
          checked={uiStore.isThumbnailTagOverlayEnabled}
          onChange={uiStore.toggleThumbnailTagOverlay}
        >
          Show assigned tags
        </Toggle>
        <Toggle
          checked={uiStore.isThumbnailFilenameOverlayEnabled}
          onChange={uiStore.toggleThumbnailFilenameOverlay}
        >
          Show filename
        </Toggle>
        <Toggle
          checked={uiStore.isThumbnailResolutionOverlayEnabled}
          onChange={uiStore.toggleThumbnailResolutionOverlay}
        >
          Show resolution
        </Toggle>
      </div>

      <br />

      <div className="input-group">
        <RadioGroup
          name="Shape"
          value={uiStore.thumbnailShape}
          onChange={uiStore.setThumbnailShape}
        >
          <Radio value="square">Square</Radio>
          <Radio value="letterbox">Letterbox</Radio>
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
