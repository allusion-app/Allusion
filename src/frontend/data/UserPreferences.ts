import fse from 'fs-extra';
import { IMG_EXTENSIONS, IMG_EXTENSIONS_TYPE } from 'src/api/FileDTO';
import { FileOrder, FileSearchCriteriaDTO, OrderDirection } from 'src/api/FileSearchDTO';
import { RendererMessenger } from 'src/Messaging';
import {
  HierarchicalSeparator,
  HotkeyMap,
  ThumbnailShape,
  ThumbnailSize,
  ViewMethod,
} from './View';

export interface UserPreferences {
  theme: 'dark' | 'light';
  isOutlinerOpen: boolean;
  isInspectorOpen: boolean;
  thumbnailDirectory: string;
  importDirectory: string;
  method: ViewMethod;
  thumbnailSize: ThumbnailSize;
  thumbnailShape: ThumbnailShape;
  hotkeyMap: HotkeyMap;
  isThumbnailTagOverlayEnabled: boolean;
  isThumbnailFilenameOverlayEnabled: boolean;
  outlinerWidth: number;
  inspectorWidth: number;
  isFullScreen: boolean;
  isSlideMode: boolean;
  firstItem: number;
  searchMatchAny: boolean;
  searchCriteriaList: FileSearchCriteriaDTO[] | undefined;
  orderDirection: OrderDirection;
  orderBy: FileOrder;
  hierarchicalSeparator: HierarchicalSeparator;
  extensions: IMG_EXTENSIONS_TYPE[];
}

interface DeprecatedUserPreferences {
  /** @deprecated `orderDirection` used to be called `fileOrder`. Remove on stable version 1 release. */
  fileOrder: OrderDirection;
}

// https://blueprintjs.com/docs/#core/components/hotkeys.dialog
export const DEFAULT_HOTKEY_MAP: Readonly<HotkeyMap> = {
  toggleOutliner: '1',
  toggleInspector: '2',
  replaceQuery: 'r',
  toggleSettings: 's',
  toggleHelpCenter: 'h',
  deleteSelection: 'del',
  openTagEditor: 't',
  selectAll: 'mod + a',
  deselectAll: 'mod + d',
  viewSlide: 'enter', // TODO: backspace and escape are hardcoded hotkeys to exist slide mode
  viewList: 'alt + 1',
  viewGrid: 'alt + 2',
  viewMasonryVertical: 'alt + 3',
  viewMasonryHorizontal: 'alt + 4',
  search: 'mod + f',
  advancedSearch: 'mod + shift + f',
  openPreviewWindow: 'space',
};

const DEFAULT_USER_PREFERENCES: Readonly<UserPreferences> = {
  theme: 'dark',
  isOutlinerOpen: true,
  isInspectorOpen: true,
  thumbnailDirectory: '',
  importDirectory: '',
  method: ViewMethod.Grid,
  thumbnailSize: 'medium',
  thumbnailShape: 'square',
  hotkeyMap: DEFAULT_HOTKEY_MAP,
  isThumbnailTagOverlayEnabled: true,
  isThumbnailFilenameOverlayEnabled: false,
  outlinerWidth: 192,
  inspectorWidth: 288,
  isFullScreen: false,
  isSlideMode: false,
  firstItem: 0,
  searchMatchAny: false,
  searchCriteriaList: undefined,
  orderDirection: OrderDirection.Desc,
  orderBy: 'dateAdded',
  hierarchicalSeparator: '|',
  extensions: IMG_EXTENSIONS.slice(),
};

const PREFERENCES_STORAGE_KEY = 'preferences';
/** @deprecated Merged into preferences. Remove on stable version 1 release. */
const WINDOW_STORAGE_KEY = 'Allusion_Window';
/** @deprecated Merged into preferences. Remove on stable version 1 release. */
const FILE_STORAGE_KEY = 'Allusion_File';
/** @deprecated Merged into preferences. Remove on stable version 1 release. */
const HIERARCHICAL_SEPARATOR_KEY = 'hierarchical-separator';
/** @deprecated Merged into preferences. Remove on stable version 1 release. */
const LOCATION_STORAGE_KEY = 'location-store-preferences';

export async function loadUserPreferences(): Promise<Readonly<UserPreferences>> {
  try {
    const windowPreferences = JSON.parse(localStorage.getItem(WINDOW_STORAGE_KEY) ?? '{}');

    const fileStorePreferences = JSON.parse(localStorage.getItem(FILE_STORAGE_KEY) ?? '{}');

    const hierarchicalSeparatorPreference = localStorage.getItem(HIERARCHICAL_SEPARATOR_KEY);

    const locationStorePreferences = JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY) ?? '{}');

    const storedPreferences = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? '{}');

    const preferences: Partial<UserPreferences & DeprecatedUserPreferences> = {
      ...windowPreferences,
      ...fileStorePreferences,
      ...locationStorePreferences,
      hierarchicalSeparator: hierarchicalSeparatorPreference,
      ...storedPreferences,
    };

    const thumbnailDirectory = check(preferences, 'thumbnailDirectory', isString);

    return {
      theme: check(preferences, 'theme', isTheme),
      isOutlinerOpen: check(preferences, 'isOutlinerOpen', isBool),
      isInspectorOpen: check(preferences, 'isInspectorOpen', isBool),
      thumbnailDirectory:
        thumbnailDirectory.length === 0 ? await getDefaultThumbnailDirectory() : thumbnailDirectory,
      importDirectory: check(preferences, 'importDirectory', isString),
      method: check(preferences, 'method', isMethod),
      thumbnailSize: check(preferences, 'thumbnailSize', isThumbnailSize),
      thumbnailShape: check(preferences, 'thumbnailShape', isThumbnailShape),
      hotkeyMap: check(preferences, 'hotkeyMap', isHotkeyMap),
      isThumbnailTagOverlayEnabled: check(preferences, 'isThumbnailTagOverlayEnabled', isBool),
      isThumbnailFilenameOverlayEnabled: check(
        preferences,
        'isThumbnailFilenameOverlayEnabled',
        isBool,
      ),
      outlinerWidth: check(preferences, 'outlinerWidth', isValidLength),
      inspectorWidth: check(preferences, 'inspectorWidth', isValidLength),
      isFullScreen: check(preferences, 'isFullScreen', isBool),
      isSlideMode: check(preferences, 'isSlideMode', isBool),
      firstItem: check(preferences, 'firstItem', isValidLength),
      searchMatchAny: check(preferences, 'searchMatchAny', isBool),
      searchCriteriaList: check(preferences, 'searchCriteriaList', isSearchCriteriaList),
      orderDirection:
        preferences.fileOrder !== undefined && isOrderDirection(preferences.fileOrder)
          ? preferences.fileOrder
          : check(preferences, 'orderDirection', isOrderDirection),
      orderBy: check(preferences, 'orderBy', isFileOrder),
      hierarchicalSeparator: check(preferences, 'hierarchicalSeparator', isHierarchicalSeparator),
      extensions: check(preferences, 'extensions', isEnabledExtensions),
    };
  } catch (error) {
    console.error('Cannot parse persistent preferences', error);
    return structuredClone(DEFAULT_USER_PREFERENCES);
  }
}

export function storeUserPreferences(preferences: Readonly<UserPreferences>): void {
  localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

export function clearUserPreferences(): void {
  localStorage.removeItem(PREFERENCES_STORAGE_KEY);
  localStorage.removeItem(WINDOW_STORAGE_KEY);
  localStorage.removeItem(FILE_STORAGE_KEY);
  localStorage.removeItem(HIERARCHICAL_SEPARATOR_KEY);
  localStorage.removeItem(LOCATION_STORAGE_KEY);
}

function check<K extends keyof UserPreferences>(
  storedPreferences: any,
  key: K,
  validate: (value: UserPreferences[K]) => boolean,
): UserPreferences[K] {
  if (key in storedPreferences && validate(storedPreferences[key])) {
    return storedPreferences[key];
  } else {
    return structuredClone(DEFAULT_USER_PREFERENCES[key]);
  }
}

function isBool(value: boolean): value is boolean {
  return typeof value === 'boolean';
}

function isString(value: string): value is string {
  return typeof value === 'string';
}

function isTheme(value: 'dark' | 'light'): value is 'dark' | 'light' {
  switch (value) {
    case 'dark':
    case 'light':
      return true;

    default:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustiveCheck: never = value;
      return false;
  }
}

function isMethod(value: ViewMethod): value is ViewMethod {
  switch (value) {
    case ViewMethod.Grid:
    case ViewMethod.List:
    case ViewMethod.MasonryHorizontal:
    case ViewMethod.MasonryVertical:
      return true;

    default:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustiveCheck: never = value;
      return false;
  }
}

function isThumbnailSize(value: ThumbnailSize): value is ThumbnailSize {
  switch (value) {
    case 'small':
    case 'medium':
    case 'large':
      return true;

    default:
      return isValidLength(value);
  }
}

function isThumbnailShape(value: ThumbnailShape): value is ThumbnailShape {
  switch (value) {
    case 'letterbox':
    case 'square':
      return true;

    default:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustiveCheck: never = value;
      return false;
  }
}

function isHotkeyMap(value: HotkeyMap): value is HotkeyMap {
  return Object.keys(DEFAULT_USER_PREFERENCES.hotkeyMap).every(
    (hotkey) => hotkey in value && typeof value[hotkey as keyof HotkeyMap] === 'string',
  );
}

function isOrderDirection(value: OrderDirection): value is OrderDirection {
  switch (value) {
    case OrderDirection.Asc:
    case OrderDirection.Desc:
      return true;

    default:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustiveCheck: never = value;
      return false;
  }
}

function isSearchCriteriaList(
  value: FileSearchCriteriaDTO[] | undefined,
): value is FileSearchCriteriaDTO[] | undefined {
  // TODO: More sophiscated parsing...
  return value === undefined || Array.isArray(value);
}

function isFileOrder(value: FileOrder): value is FileOrder {
  switch (value) {
    case 'absolutePath':
    case 'dateAdded':
    case 'dateCreated':
    case 'dateLastIndexed':
    case 'dateModified':
    case 'extension':
    case 'height':
    case 'width':
    case 'id':
    case 'ino':
    case 'locationId':
    case 'name':
    case 'random':
    case 'relativePath':
    case 'size':
    case 'tags':
      return true;

    default:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustiveCheck: never = value;
      return false;
  }
}

function isHierarchicalSeparator(value: HierarchicalSeparator): value is HierarchicalSeparator {
  switch (value) {
    case '/':
    case ':':
    case '\\':
    case '|':
      return true;

    default:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustiveCheck: never = value;
      return false;
  }
}

function isEnabledExtensions(
  value: IMG_EXTENSIONS_TYPE[] | undefined,
): value is IMG_EXTENSIONS_TYPE[] | undefined {
  // TODO: More sophiscated parsing...
  return value === undefined || Array.isArray(value);
}

function isValidLength(value: number): boolean {
  return isFinite(value) && value >= 0;
}

async function getDefaultThumbnailDirectory(): Promise<string> {
  try {
    const directory = await RendererMessenger.getDefaultThumbnailDirectory();
    await fse.ensureDir(directory);
    return directory;
  } catch (error) {
    console.error(error);
    return '';
  }
}
