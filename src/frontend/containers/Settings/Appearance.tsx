import { WINDOW_STORAGE_KEY } from 'common/window';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useCustomTheme from 'src/frontend/hooks/useCustomTheme';
import { RendererMessenger } from 'src/ipc/renderer';
import { Button, IconSet, Radio, RadioGroup, Toggle } from 'widgets';
import { useStore } from '../../contexts/StoreContext';

export const Appearance = observer(() => {
  const { uiStore } = useStore();

  const toggleFullScreen = (value: boolean) => {
    localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify({ isFullScreen: value }));
    RendererMessenger.setFullScreen(value);
  };

  const { t } = useTranslation();

  return (
    <>
      <h3>{t('settings.appearance.theme')}</h3>

      <div className="vstack">
        <RadioGroup
          orientation="horizontal"
          name={t('settings.appearance.colorScheme')}
          value={uiStore.theme}
          onChange={uiStore.setTheme}
        >
          <Radio value="light">{t('settings.appearance.light')}</Radio>
          <Radio value="dark">{t('settings.appearance.dark')}</Radio>
        </RadioGroup>
        <CustomThemePicker />
      </div>

      <h3>{t('settings.appearance.display')}</h3>

      <div className="vstack">
        <Toggle checked={uiStore.isFullScreen} onChange={toggleFullScreen}>
          {t('settings.appearance.showFullScreen')}
        </Toggle>
        <Zoom />
        <RadioGroup
          orientation="horizontal"
          name={t('settings.appearance.scaleImages')}
          value={uiStore.upscaleMode}
          onChange={uiStore.setUpscaleMode}
        >
          <Radio value="smooth">{t('settings.appearance.smooth')}</Radio>
          <Radio value="pixelated">{t('settings.appearance.pixelated')}</Radio>
        </RadioGroup>
      </div>

      <h3>{t('settings.appearance.thumbnail')}</h3>

      <div className="vstack">
        <Toggle
          checked={uiStore.isThumbnailTagOverlayEnabled}
          onChange={uiStore.toggleThumbnailTagOverlay}
        >
          {t('settings.appearance.showAssignedTags')}
        </Toggle>
        <Toggle
          checked={uiStore.isThumbnailFilenameOverlayEnabled}
          onChange={uiStore.toggleThumbnailFilenameOverlay}
        >
          {t('settings.appearance.showFilename')}
        </Toggle>
        <Toggle
          checked={uiStore.isThumbnailResolutionOverlayEnabled}
          onChange={uiStore.toggleThumbnailResolutionOverlay}
        >
          {t('settings.appearance.showResolution')}
        </Toggle>
        <RadioGroup
          orientation="horizontal"
          name={t('settings.appearance.shape')}
          value={uiStore.thumbnailShape}
          onChange={uiStore.setThumbnailShape}
        >
          <Radio value="square">{t('settings.appearance.square')}</Radio>
          <Radio value="letterbox">{t('settings.appearance.letterbox')}</Radio>
        </RadioGroup>
      </div>
    </>
  );
});

const Zoom = () => {
  const { t } = useTranslation();
  const [localZoomFactor, setLocalZoomFactor] = useState(RendererMessenger.getZoomFactor);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value);
    setLocalZoomFactor(value);
    RendererMessenger.setZoomFactor(value);
  };

  const p = (n: number) => t('settings.zoom.percent', { pct: n });

  return (
    <label>
      {t('settings.zoom.label')}
      <select value={localZoomFactor} onChange={handleChange}>
        <option value={0.5}>{p(50)}</option>
        <option value={0.6}>{p(60)}</option>
        <option value={0.7}>{p(70)}</option>
        <option value={0.8}>{p(80)}</option>
        <option value={0.9}>{p(90)}</option>
        <option value={1.0}>{p(100)}</option>
        <option value={1.1}>{p(110)}</option>
        <option value={1.2}>{p(120)}</option>
        <option value={1.3}>{p(130)}</option>
        <option value={1.4}>{p(140)}</option>
        <option value={1.5}>{p(150)}</option>
        <option value={1.6}>{p(160)}</option>
        <option value={1.7}>{p(170)}</option>
        <option value={1.8}>{p(180)}</option>
        <option value={1.9}>{p(190)}</option>
        <option value={2.0}>{p(200)}</option>
      </select>
    </label>
  );
};

const CustomThemePicker = () => {
  const { t } = useTranslation(); // ◀︎ 追加しました
  const { theme, setTheme, refresh, options, themeDir } = useCustomTheme();

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="hstack">
      <label>
        {t('settings.appearance.customTheme')}
        <select onChange={(e) => setTheme(e.target.value)} defaultValue={theme}>
          {<option value="">{t('settings.appearance.none')}</option>}
          {options.map((file) => (
            <option key={file} value={file}>
              {file.replace('.css', '')}
            </option>
          ))}
        </select>
      </label>
      <Button
        icon={IconSet.FOLDER_CLOSE}
        text={t('button.add')}
        onClick={() => shell.openExternal(themeDir)}
        tooltip={t('settings.appearance.openThemeDir')}
      />
      <Button
        icon={IconSet.RELOAD}
        text={t('button.reload')}
        onClick={refresh}
        tooltip={t('settings.appearance.reloadThemes')}
      />
    </div>
  );
};
