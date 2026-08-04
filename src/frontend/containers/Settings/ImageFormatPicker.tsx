import { observer } from 'mobx-react-lite';
import React, { ReactNode, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IMG_EXTENSIONS, IMG_EXTENSIONS_TYPE } from 'src/api/file';
import { RendererMessenger } from 'src/ipc/renderer';
import { Button, Checkbox, IconSet, Toggle } from 'widgets';
import { useStore } from '../../contexts/StoreContext';

export const ImageFormatPicker = observer(() => {
  const { locationStore, fileStore } = useStore();

  const [removeDisabledImages, setRemoveDisabledImages] = useState(true);
  const toggleRemoveDisabledImages = useCallback(() => setRemoveDisabledImages((val) => !val), []);

  const [newEnabledFileExtensions, setNewEnabledFileExtensions] = useState(
    new Set(locationStore.enabledFileExtensions),
  );
  const toggleExtension = useCallback(
    (ext: IMG_EXTENSIONS_TYPE) => {
      const newNewEnabledFileExtensions = new Set(newEnabledFileExtensions);
      if (newEnabledFileExtensions.has(ext)) {
        newNewEnabledFileExtensions.delete(ext);
      } else {
        newNewEnabledFileExtensions.add(ext);
      }
      setNewEnabledFileExtensions(newNewEnabledFileExtensions);
    },
    [newEnabledFileExtensions],
  );

  const { t } = useTranslation();

  const onSubmit = useCallback(async () => {
    if (removeDisabledImages) {
      const extensionsToDelete = IMG_EXTENSIONS.filter((ext) => !newEnabledFileExtensions.has(ext));

      for (const ext of extensionsToDelete) {
        await fileStore.deleteFilesByExtension(ext);
      }
    }

    locationStore.setSupportedImageExtensions(newEnabledFileExtensions);

    window.alert(t('settings.imageFormat.restartNotice'));

    RendererMessenger.reload();
  }, [fileStore, locationStore, newEnabledFileExtensions, removeDisabledImages, t]);

  // TODO: group extensions by type: JPG+JPEG+JFIF, TIF+TIFF, etc

  const imageFormatInts: Partial<Record<IMG_EXTENSIONS_TYPE, ReactNode>> = {
    exr: (
      <span
        // TODO: Get TooltipLayer working in PopupWindow: tried a bunch of things but no bueno
        title={t('settings.imageFormat.exrWarning')}
        className="info-icon"
      >
        {IconSet.WARNING}
      </span>
    ),
  };

  return (
    <>
      <fieldset>
        <legend>{t('settings.imageFormat.legend')}</legend>
        <div className="checkbox-set-container">
          {IMG_EXTENSIONS.map((ext) => (
            <Checkbox
              key={ext}
              checked={newEnabledFileExtensions.has(ext)}
              onChange={() => toggleExtension(ext)}
            >
              {ext}
              {imageFormatInts[ext] && <> {imageFormatInts[ext]}</>}
            </Checkbox>
          ))}
        </div>
      </fieldset>

      <Toggle checked={removeDisabledImages} onChange={toggleRemoveDisabledImages}>
        {t('settings.imageFormat.removeAfterSave')}
      </Toggle>

      <Button
        text={t('button.reset')}
        onClick={() => setNewEnabledFileExtensions(new Set(locationStore.enabledFileExtensions))}
      />
      <Button
        text={t('button.save')}
        styling="filled"
        onClick={onSubmit}
        disabled={
          newEnabledFileExtensions.size === 0 ||
          // Disabled if identical
          (newEnabledFileExtensions.size === locationStore.enabledFileExtensions.size &&
            Array.from(newEnabledFileExtensions.values()).every((ext) =>
              locationStore.enabledFileExtensions.has(ext),
            ))
        }
      />
    </>
  );
});
