import { useCallback, useEffect } from 'react';
import { RendererMessenger } from 'src/ipc/RenderMessenger';
import { AppToaster } from '../components/Toaster';
import UiStore from '../stores/UiStore';

const DEFAULT_FILE_NAME = 'image.png';

export function useClipboardImporter(uiStore: UiStore) {
  const pasteHandle = useCallback(
    (e: ClipboardEvent) => {
      const { items, files } = e.clipboardData!;

      let fileName = `allusion_${Date.now()}`;
      const type = items[0].type;
      if (!type.match(/image/)) {
        return;
      }

      const blob = items[0].getAsFile();
      if (!blob) {
        return;
      }
      const file = files[0];
      if (file && file.type.includes('image')) {
        fileName = file.name == DEFAULT_FILE_NAME ? `allusion_${file.lastModified}.png` : file.name;
      }

      const reader = new FileReader();
      const directory = uiStore.importDirectory;
      if (!directory) {
        AppToaster.show({
          message: 'Please choose a location. Settings>BackgroundProcesses>Browse',
          timeout: 5000,
        });
        return;
      }
      reader.addEventListener('loadend', async function (e) {
        const imgBase64 = e.target!.result!.toString();
        if (!fileName.includes('.')) {
          let ext = imgBase64.split(';')[0].split('/')[1];
          if (ext === 'jpeg') {
            ext = 'jpg';
          }
          fileName = `${fileName}.${ext}`;
        }
        await RendererMessenger.storeFile({
          directory,
          filenameWithExt: fileName,
          imgBase64,
        });
      });
      reader.readAsDataURL(blob);
    },
    [uiStore.importDirectory],
  );

  return useEffect(() => {
    document.body.addEventListener('paste', pasteHandle);
    return () => document.body.removeEventListener('paste', pasteHandle);
  }, [pasteHandle]);
}
