import { IS_DEV } from 'common/process';
import i18n from 'i18next';
// import detector from 'i18next-browser-languagedetector';
import backend from 'i18next-fs-backend';
import { initReactI18next } from 'react-i18next';
import { join } from 'path';

// TypeScript setup: https://react.i18next.com/latest/typescript
//! Important: import all namespaces (for the default language, only)
import main from '../resources/locales/en/main.json';
import settings from '../resources/locales/en/settings.json';
import { lstatSync, readdirSync } from 'fs-extra';

export const resources = {
  en: {
    main,
    settings,
  },
} as const;

export const defaultNS: keyof typeof resources['en'] = 'main';

const localesDir = join(__dirname, IS_DEV ? '../resources/' : '', 'locales');

export const getSupportedLocales = () =>
  readdirSync(localesDir).filter((fileName) => {
    const joinedPath = join(localesDir, fileName);
    const isDirectory = lstatSync(joinedPath).isDirectory();
    return isDirectory;
  });

export const initI18n = () =>
  i18n
    // .use(detector)
    .use(backend)
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
      debug: IS_DEV,

      react: {
        useSuspense: false,
      },

      // load the files synchronously
      initImmediate: false,
      // preload: ['en', 'nl'],
      preload: getSupportedLocales(),

      // resources,

      backend: {
        // https://github.com/i18next/i18next-fs-backend
        // path where resources get loaded from, or a function
        // returning a path:
        // function(lngs, namespaces) { return customPath; }
        // the returned path will interpolate lng, ns if provided like giving a static path
        loadPath: join(localesDir, '/{{lng}}/{{ns}}.json'),

        // path to post missing resources
        addPath: join(localesDir, '/{{lng}}/{{ns}}.missing.json'),
      },
      defaultNS,
      fallbackLng: 'en', // use en if detected lng is not available
      saveMissing: IS_DEV, // send not translated keys to endpoint
      // saveMissingTo: 'current',

      interpolation: {
        escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
      },
    });

export default i18n;
