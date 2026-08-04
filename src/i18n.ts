import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Dynamically load locale resources from the locales directory.
const requireLocale = (require as any).context('./locales', false, /\.json$/);

type LocaleResources = Record<string, { translation: Record<string, unknown> }>;

function loadLocaleResources(): LocaleResources {
  return requireLocale.keys().reduce<LocaleResources>((resources, path) => {
    const languageCode = path.replace(/^\.\//, '').replace(/\.json$/, '');
    const translation = requireLocale(path);
    resources[languageCode] = { translation };
    return resources;
  }, {});
}

const resources = loadLocaleResources();

function detectPreferredLanguage(): string {
  try {
    const stored = localStorage.getItem('i18nextLng') || localStorage.getItem('appLanguage');
    if (stored && Object.prototype.hasOwnProperty.call(resources, stored)) {
      return stored;
    }
    if (typeof navigator !== 'undefined' && navigator.language) {
      const language = navigator.language.toLowerCase();
      if (language.startsWith('ja') && Object.prototype.hasOwnProperty.call(resources, 'ja')) {
        return 'ja';
      }
      if (language.startsWith('en') && Object.prototype.hasOwnProperty.call(resources, 'en')) {
        return 'en';
      }
    }
  } catch (e) {
    // ignore and fallback
  }
  return Object.keys(resources)[0] ?? 'en';
}

const preferred = detectPreferredLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: preferred,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Helpful log for debugging language selection in renderer
if (typeof window !== 'undefined' && (window as any).console) {
  (window as any).console.info('[i18n] initialized, language=', i18n.language || preferred);
}

export default i18n;
