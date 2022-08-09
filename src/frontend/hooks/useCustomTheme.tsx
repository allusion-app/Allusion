import React, { useCallback, useContext, useEffect, useState } from 'react';
import fse from 'fs-extra';
import path from 'path';

import useLocalStorage from './useLocalStorage';
import { RendererMessenger } from 'src/ipc/RenderMessenger';
import { AppToaster } from '../components/Toaster';
import { getExtraResourcePath } from '../../../common/fs';

type CustomThemeContextType = {
  theme: string;
  setTheme: (filename: string) => void;
  themeDir: string;
  options: string[];
  refresh: () => void;
};

const CustomThemeContext = React.createContext<CustomThemeContextType>({
  theme: '',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setTheme: () => {},
  themeDir: '',
  options: [],
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  refresh: () => {},
});

/** Copies preset themes from /resources/themes into the user's custom theme directory */
async function copyPresets(themeDir: string) {
  try {
    const presetDir = getExtraResourcePath('themes');
    const files = await fse.readdir(presetDir);
    for (const file of files) {
      await fse.copy(`${presetDir}/${file}`, `${themeDir}/${file}`);
    }
  } catch (e) {
    console.error(e);
  }
}

async function loadThemeFiles(themeDir: string): Promise<string[]> {
  try {
    await fse.ensureDir(themeDir);

    // Place default custom themes from resources/themes in the theme directory
    await copyPresets(themeDir);

    const files = await fse.readdir(themeDir);
    return files.filter((f) => f.endsWith('.css'));
  } catch (e) {
    console.error(e);
  }
  return [];
}

function applyTheme(themeDir: string, filename: string) {
  // First clear the previously applied custom theme
  const customThemeLinkId = 'custom-theme-link';
  document.getElementById(customThemeLinkId)?.remove();

  // Then apply the new one
  if (filename) {
    const link = document.createElement('link');
    link.id = customThemeLinkId;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = `file:///${path.join(themeDir, filename)}`;

    link.onerror = () =>
      AppToaster.show({
        message: 'Could not load theme',
        timeout: 5000,
        clickAction: { onClick: RendererMessenger.toggleDevTools, label: 'Toggle DevTools' },
      });

    // The style of the settings panel doesn't automatically update, since it's a separate window
    // This function is exposed in the PopupWindow component as a workaround
    link.onload = () => (window as any).reapplyPopupStyles?.();

    document.head.appendChild(link);
  } else {
    (window as any).reapplyPopupStyles?.();
  }
}

export const CustomThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeDir, setThemeDir] = useState('');
  const [theme, setTheme] = useLocalStorage('custom-theme', '');
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    // Load options and previously selected theme on startup
    RendererMessenger.getThemesDirectory().then((dir) => {
      setThemeDir(dir);
      loadThemeFiles(dir).then(setOptions);
      if (theme) {
        applyTheme(dir, theme);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => {
    loadThemeFiles(themeDir).then(setOptions);
    applyTheme(themeDir, theme);
  }, [theme, themeDir]);

  const setThemeAndApply = useCallback(
    (filename: string) => {
      setTheme(filename);
      applyTheme(themeDir, filename);
    },
    [setTheme, themeDir],
  );

  return (
    <CustomThemeContext.Provider
      value={{ theme, setTheme: setThemeAndApply, options, refresh, themeDir }}
    >
      {children}
    </CustomThemeContext.Provider>
  );
};

export default function useCustomTheme() {
  return useContext(CustomThemeContext);
}
