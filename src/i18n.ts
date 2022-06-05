import { IS_DEV } from 'common/process';
import i18n from 'i18next';
import backend from 'i18next-fs-backend';
import { initReactI18next } from 'react-i18next';
import { join } from 'path';

// TypeScript setup: https://react.i18next.com/latest/typescript
//! Important: import all namespaces (for the default language, only)
import main from '../resources/locales/en/main.json';
import common from '../resources/locales/en/common.json';
import settings from '../resources/locales/en/settings.json';
import { lstatSync, readdirSync } from 'fs-extra';

export const resources = {
  en: {
    main,
    settings,
    common,
  },
} as const;

export const defaultNS: keyof typeof resources['en'] = 'main';

const localesDir = join(__dirname, IS_DEV ? '../resources/' : '', 'locales');

// See the readme in resources/locales/README.md for instructions on how to add new languages

export const locales: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  // { value: 'de', label: 'Deutsch' },
  // { value: 'fr', label: 'Français' },
  // { value: 'es', label: 'Español' },
  // { value: 'it', label: 'Italiano' },
  // { value: 'ja', label: '日本語' },
  // { value: 'zh', label: '中文' },
  // { value: 'ru', label: 'Русский' },
  // { value: 'pl', label: 'Polski' },
  // { value: 'pt', label: 'Português' },
  // { value: 'ko', label: '한국어' },
  // { value: 'ar', label: 'العربية' },
  // { value: 'tr', label: 'Türkçe' },
  // { value: 'uk', label: 'Українська' },
  // { value: 'vi', label: 'Tiếng Việt' },
  { value: 'nl', label: 'Nederlands' },
  // { value: 'id', label: 'Bahasa Indonesia' },
  // { value: 'ms', label: 'Bahasa Melayu' },
  // { value: 'th', label: 'ภาษาไทย' },
  // { value: 'hu', label: 'Magyar' },
  // { value: 'ro', label: 'Română' },
  // { value: 'sk', label: 'Slovenčina' },
  // { value: 'da', label: 'Dansk' },
  // { value: 'fi', label: 'Suomi' },
  // { value: 'sv', label: 'Svenska' },
  // { value: 'no', label: 'Norsk' },
  // { value: 'cs', label: 'Čeština' },
  // { value: 'sl', label: 'Slovenščina' },
  // { value: 'el', label: 'Ελληνικά' },
  // { value: 'bg', label: 'Български' },
];

export const getSupportedLocales = () =>
  readdirSync(localesDir).filter((fileName) => {
    const joinedPath = join(localesDir, fileName);
    const isDirectory = lstatSync(joinedPath).isDirectory();
    return isDirectory;
  });

// TODO: look further into utils for better usability

export const initI18n = async (lng = 'en') => {
  const localesOnDisk = getSupportedLocales();
  const enabledLocales = locales.map((l) => l.value);

  // If there is a mismatch between the locales on disk and those enabled in the UI, print a warning
  const diskLocalesNotEnabled = localesOnDisk.filter((l) => !enabledLocales.includes(l));
  const enabledLocalesNotOnDisk = enabledLocales.filter((l) => !localesOnDisk.includes(l));
  if (diskLocalesNotEnabled.length > 0 || enabledLocalesNotOnDisk.length > 0) {
    console.warn(
      `Warning: the following locales are enabled in the UI but not on disk: ${
        diskLocalesNotEnabled.join(', ') || 'none'
      }`,
    );
    console.warn(
      `Warning: the following locales are on disk but not enabled in the UI: ${
        enabledLocalesNotOnDisk.join(', ') || 'none'
      }`,
    );
  }

  await i18n
    // .use(detector)
    .use(backend)
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
      debug: IS_DEV,

      react: {
        useSuspense: false,
      },

      // load the files synchronously
      // initImmediate: false,
      // preload: ['en', 'nl'],
      preload: localesOnDisk,

      backend: {
        // https://github.com/i18next/i18next-fs-backend
        loadPath: join(localesDir, '/{{lng}}/{{ns}}.json'),
        addPath: join(localesDir, '/{{lng}}/{{ns}}.json'),
      },
      defaultNS,
      lng,
      fallbackLng: IS_DEV ? undefined : 'en', // use en if detected lng is not available
      saveMissing: IS_DEV, // send not translated keys to endpoint
      saveMissingTo: 'all',
      // missingKeyHandler: (lng, ns, key) => console.log(`Missing key: ${key}: ${ns} ${lng}`),

      interpolation: {
        escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
      },
    });

  // Not sure if this is needed. Couldn't get initialization right in my first attempt, tried a bunch of things
  await i18n.loadLanguages(localesOnDisk);
  await i18n.loadNamespaces(Object.keys(resources.en));
};

export default i18n;
