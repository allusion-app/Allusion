# Localization

Localization has been set up with [i18next](https://www.i18next.com/).
This is one of the most used libraries for this purpose at the time, and supports loads of features and helpful utilities.
For instance, TypeScript will auto-complete the translation key when partially typing it out. And several CLI tools have been set up to keep the various languages in sync with each other and with the library's use in code.

For anyone looking to contribute to the localization: Have a quick look at the [i18n documentation]('https://www.i18next.com/misc/json-format') to know how to properly deal with plurals, nesting and other features. 

## Adding another language
This could still use some cleaning up. Currently, these steps need to be taken:
- Add your language to the top of the `src/i18n.ts` file so that the correct label can be shown in the language picker dropdown
- Add the language to the `i18n:sync` command in `package.json` and run it, to generate the files for your language and have them pre-filled with the primary (English) language
- Translate your files. The Google Translate and Code Spell Checker extension in VSCode might be of use.
TODO: use the [csv converter](https://github.com/andraaspar/i18next-json-csv-converter) so non-devs can contribute more easily

## Terminology 
Every language has its own folder with JSON files - each represents a _namespace_. 
Related entries, such as those found in the same UI section, are grouped together.

## Utils
- `yarn i18n:sync` will sync the translation files with each other, and remove/add entries based on language-specific properties
- `yarn i18n:scan` (NOTE: BROKEN ATM) will scan the code for uses of the translation library in order to add missing entries and remove unused entries. But it doesn't work great in combination with the React hook where a default namespace can be passed it: It doesn't understand it and will remove most translation entries. Left in here for possible future use.
