import fse from 'fs-extra';
import { FileOrder } from 'src/backend/Backend';
import { OrderDirection } from 'src/backend/DBRepository';
import { IFile } from 'src/entities/File';
import { SearchCriteria } from 'src/entities/SearchCriteria';
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
  searchCriteriaList: SearchCriteria<IFile>[] | undefined;
  orderDirection: OrderDirection;
  orderBy: FileOrder;
  hierarchicalSeparator: HierarchicalSeparator;
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
};

const PREFERENCES_STORAGE_KEY = 'preferences';
/** @deprecated Merged into preferences. Remove on stable version 1 release. */
const FILE_STORAGE_KEY = 'Allusion_File';
/** @deprecated Merged into preferences. Remove on stable version 1 release. */
const HIERARCHICAL_SEPARATOR_KEY = 'hierarchical-separator';

export async function loadUserPreferences(): Promise<Readonly<UserPreferences>> {
  try {
    const fileStorePreferences = JSON.parse(localStorage.getItem(FILE_STORAGE_KEY) ?? '{}');

    const hierarchicalSeparatorPreference = localStorage.getItem(HIERARCHICAL_SEPARATOR_KEY);

    const uiStorePreferences = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? '{}');

    const storedPreferences: Partial<UserPreferences & DeprecatedUserPreferences> = {
      ...uiStorePreferences,
      ...fileStorePreferences,
      hierarchicalSeparator: hierarchicalSeparatorPreference,
    };

    let thumbnailDirectory = check(storedPreferences, 'thumbnailDirectory');

    if (thumbnailDirectory.length === 0) {
      thumbnailDirectory = await getDefaultThumbnailDirectory();
    }

    return {
      theme: check(storedPreferences, 'theme', isTheme),
      isOutlinerOpen: check(storedPreferences, 'isOutlinerOpen'),
      isInspectorOpen: check(storedPreferences, 'isInspectorOpen'),
      thumbnailDirectory,
      importDirectory: check(storedPreferences, 'importDirectory'),
      method: check(storedPreferences, 'method', isMethod),
      thumbnailSize: check(storedPreferences, 'thumbnailSize', isThumbnailSize),
      thumbnailShape: check(storedPreferences, 'thumbnailShape', isThumbnailShape),
      hotkeyMap: check(storedPreferences, 'hotkeyMap', isHotkeyMap),
      isThumbnailTagOverlayEnabled: check(storedPreferences, 'isThumbnailTagOverlayEnabled'),
      isThumbnailFilenameOverlayEnabled: check(
        storedPreferences,
        'isThumbnailFilenameOverlayEnabled',
      ),
      outlinerWidth: check(storedPreferences, 'outlinerWidth', isValidLength),
      inspectorWidth: check(storedPreferences, 'inspectorWidth', isValidLength),
      isFullScreen: check(storedPreferences, 'isFullScreen'),
      isSlideMode: check(storedPreferences, 'isSlideMode'),
      firstItem: check(storedPreferences, 'firstItem', isValidLength),
      searchMatchAny: check(storedPreferences, 'searchMatchAny'),
      searchCriteriaList: check(storedPreferences, 'searchCriteriaList', isSearchCriteriaList),
      orderDirection:
        storedPreferences.fileOrder !== undefined && isOrderDirection(storedPreferences.fileOrder)
          ? storedPreferences.fileOrder
          : check(storedPreferences, 'orderDirection', isOrderDirection),
      orderBy: check(storedPreferences, 'orderBy', isFileOrder),
      hierarchicalSeparator: check(
        storedPreferences,
        'hierarchicalSeparator',
        isHierarchicalSeparator,
      ),
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
  localStorage.removeItem(FILE_STORAGE_KEY);
  localStorage.removeItem(HIERARCHICAL_SEPARATOR_KEY);
}

function check<K extends keyof UserPreferences>(
  storedPreferences: any,
  key: K,
  validate: (value: UserPreferences[K]) => boolean = () => true,
): UserPreferences[K] {
  if (key in storedPreferences && validate(storedPreferences[key])) {
    return storedPreferences[key];
  } else {
    return structuredClone(DEFAULT_USER_PREFERENCES[key]);
  }
}

function isTheme(value: 'dark' | 'light'): value is 'dark' | 'light' {
  switch (value) {
    case 'dark':
    case 'light':
      return true;

    default:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustive_check: never = value;
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
      const _exhaustive_check: never = value;
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
      const _exhaustive_check: never = value;
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
      const _exhaustive_check: never = value;
      return false;
  }
}

function isSearchCriteriaList(
  value: SearchCriteria<IFile>[] | undefined,
): value is SearchCriteria<IFile>[] | undefined {
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
      const _exhaustive_check: never = value;
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
      const _exhaustive_check: never = value;
      return false;
  }
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
