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
      <h3>Interface</h3>

      <div className="input-group">
        <RadioGroup name="Color Scheme" value={uiStore.theme} onChange={uiStore.setTheme}>
          <Radio value="light">Light</Radio>
          <Radio value="dark">Dark</Radio>
        </RadioGroup>

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
  const [localZoomFactor, setLocalZoomFactor] = useState(RendererMessenger.getZoomFactor);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value);
    setLocalZoomFactor(value);
    RendererMessenger.setZoomFactor(value);
  };

  return (
    <label>
      Zoom
      <select value={localZoomFactor} onChange={handleChange}>
        <option value={0.5}>50%</option>
        <option value={0.6}>60%</option>
        <option value={0.7}>70%</option>
        <option value={0.8}>80%</option>
        <option value={0.9}>90%</option>
        <option value={1.0}>100%</option>
        <option value={1.1}>110%</option>
        <option value={1.2}>120%</option>
        <option value={1.3}>130%</option>
        <option value={1.4}>140%</option>
        <option value={1.5}>150%</option>
        <option value={1.6}>160%</option>
        <option value={1.7}>170%</option>
        <option value={1.8}>180%</option>
        <option value={1.9}>190%</option>
        <option value={2.0}>200%</option>
      </select>
    </label>
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
