import { action, makeObservable, observable, reaction, runInAction } from 'mobx';

import { FileOrder } from 'src/backend/DBRepository';
import { IFile } from 'src/entities/File';
import { pathExists } from 'fs-extra';
import { getDefaultThumbnailDirectory } from 'src/config';
import { RendererMessenger } from 'src/Messaging';

export class Preferences {
  // Views
  @observable theme: 'light' | 'dark' = 'dark';
  @observable viewMethod: ViewMethod = ViewMethod.Grid;
  @observable fileOrder: FileOrder = FileOrder.Desc;
  @observable orderBy: keyof IFile = 'dateAdded';

  // Windows
  @observable isFullScreen: boolean = false;

  // Thumbnails
  @observable thumbnailSize: ThumbnailSize = ThumbnailSize.Medium;
  @observable thumbnailShape: ThumbnailShape = ThumbnailShape.Square;
  @observable showThumbnailTags: boolean = true;
  @observable thumbnailDirectory: string = '';

  // Browser Extension
  @observable importDirectory: string = '';

  // Panels
  @observable isOutlinerOpen: boolean = true;
  @observable outlinerWidth: number = Preferences.MIN_OUTLINER_WIDTH;
  @observable isInspectorOpen: boolean = true;
  @observable inspectorWidth: number = Preferences.MIN_INSPECTOR_WIDTH;

  // Hotkeys
  readonly hotkeyMap: IHotkeyMap = observable(Preferences.DEFAULT_HOTKEY_MAP);

  static STORAGE_KEY: string = 'preferences';

  static MIN_OUTLINER_WIDTH: number = 192; // default of 12 rem
  static MIN_INSPECTOR_WIDTH: number = 288; // default of 18 rem

  static DEFAULT_HOTKEY_MAP: IHotkeyMap = {
    toggleOutliner: '1',
    toggleInspector: '2',
    replaceQuery: 'r',
    toggleSettings: 's',
    toggleHelpCenter: 'h',
    deleteSelection: 'del',
    openTagEditor: 't',
    selectAll: 'mod + a',
    deselectAll: 'mod + d',
    viewSlide: 'alt + 0',
    viewList: 'alt + 1',
    viewGrid: 'alt + 2',
    viewMasonryVertical: 'alt + 3',
    viewMasonryHorizontal: 'alt + 4',
    search: 'mod + f',
    advancedSearch: 'mod + shift + f',
    openPreviewWindow: 'space',
  };

  constructor() {
    makeObservable(this);
  }

  @action async load() {
    try {
      const value = localStorage.getItem(Preferences.STORAGE_KEY);
      if (value === null) {
        console.info('Could not find preferences! Saving preferences with default values...');
        await this.parseThumbnailDirectory('');
        return;
      }

      const prefs = JSON.parse(value);
      this.parseTheme(prefs.theme);
      this.parseViewMethod(prefs.viewMethod);
      this.parseFileOrder(prefs.fileOrder);
      this.parseOrderBy(prefs.orderBy);
      this.parseThumbnailSize(prefs.thumbnailSize);
      this.parseThumbnailShape(prefs.thumbnailShape);
      this.parseShowThumbnailTags(prefs.showThumbnailTags);
      this.parseImportDirectory(prefs.importDirectory);
      this.parseIsOutlinerOpen(prefs.isOutlinerOpen);
      this.parseOutlinerWidth(prefs.outlinerWidth);
      this.parseIsInspectorOpen(prefs.isInspectorOpen);
      this.parseInspectorWidth(prefs.inspectorWidth);
      this.parseHotkeyMap(prefs.hotkeyMap);

      await this.parseThumbnailDirectory(prefs.thumbnailDirectory);
    } catch (error) {
      console.error('Cannot parse persistent preferences.', error);
    } finally {
      // Set window options and save preferences.
      runInAction(() => {
        RendererMessenger.setTheme({ theme: this.theme });
        RendererMessenger.setFullScreen(this.isFullScreen);
        localStorage.setItem(Preferences.STORAGE_KEY, JSON.stringify(this));
      });

      // Store preferences immediately when anything changes.
      reaction(
        () => ({ ...this, hotkeyMap: { ...this.hotkeyMap } }),
        (value, previousValue) => {
          localStorage.setItem(Preferences.STORAGE_KEY, JSON.stringify(value));

          // Notify window changes.
          if (previousValue.theme !== value.theme) {
            RendererMessenger.setTheme({ theme: value.theme });
          }
          if (previousValue.isFullScreen !== value.isFullScreen) {
            RendererMessenger.setFullScreen(value.isFullScreen);
          }
        },
        { delay: 1000 }, // 1 second
      );
    }
  }

  @action private parseTheme(theme: any) {
    const value = theme as 'dark' | 'light';
    switch (theme) {
      case 'dark':
      case 'light':
        this.theme = value;
        break;

      default:
        break;
    }
  }

  @action private parseViewMethod(viewMethod: any) {
    const value = viewMethod as ViewMethod;
    switch (value) {
      case ViewMethod.List:
      case ViewMethod.Grid:
      case ViewMethod.MasonryVertical:
      case ViewMethod.MasonryHorizontal:
        this.viewMethod = value;
        break;

      default:
        break;
    }
  }

  @action private parseFileOrder(fileOrder: any) {
    const value = fileOrder as FileOrder;
    switch (value) {
      case FileOrder.Asc:
      case FileOrder.Desc:
        this.fileOrder = value;
        break;

      default:
        break;
    }
  }

  @action private parseOrderBy(orderBy: any) {
    const value = orderBy as keyof IFile;
    switch (value) {
      case 'absolutePath':
      case 'dateAdded':
      case 'dateCreated':
      case 'dateModified':
      case 'extension':
      case 'height':
      case 'id':
      case 'locationId':
      case 'name':
      case 'relativePath':
      case 'size':
      case 'tags':
      case 'width':
        this.orderBy = value;
        break;

      default:
        break;
    }
  }

  @action private parseThumbnailSize(thumbnailSize: any) {
    const value = thumbnailSize as ThumbnailSize;
    switch (value) {
      case ThumbnailSize.Small:
      case ThumbnailSize.Medium:
      case ThumbnailSize.Large:
        this.thumbnailSize = value;
        break;

      default:
        break;
    }
  }

  @action private parseThumbnailShape(thumbnailShape: any) {
    const value = thumbnailShape as ThumbnailShape;
    switch (value) {
      case ThumbnailShape.Letterbox:
      case ThumbnailShape.Square:
        this.thumbnailShape = value;
        break;

      default:
        break;
    }
  }

  @action private parseShowThumbnailTags(showThumbnailTags: any) {
    if (typeof showThumbnailTags === 'boolean') {
      this.showThumbnailTags = showThumbnailTags;
    }
  }

  @action private async parseThumbnailDirectory(thumbnailDirectory: any) {
    let value = thumbnailDirectory;
    if (typeof value !== 'string' || value.length === 0 || !(await pathExists(value))) {
      value = await getDefaultThumbnailDirectory();
    }
    runInAction(() => {
      this.thumbnailDirectory = value;
    });
  }

  @action private parseImportDirectory(importDirectory: any) {
    if (typeof importDirectory === 'string') {
      this.importDirectory = importDirectory;
    }
  }

  @action private parseIsOutlinerOpen(isOutlinerOpen: any) {
    if (typeof isOutlinerOpen === 'boolean') {
      this.isOutlinerOpen = isOutlinerOpen;
    }
  }

  @action private parseOutlinerWidth(outlinerWidth: any) {
    if (typeof outlinerWidth === 'number') {
      this.outlinerWidth = Math.max(Preferences.MIN_OUTLINER_WIDTH, outlinerWidth);
    }
  }

  @action private parseIsInspectorOpen(isInspectorOpen: any) {
    if (typeof isInspectorOpen === 'boolean') {
      this.isInspectorOpen = isInspectorOpen;
    }
  }

  @action private parseInspectorWidth(inspectorWidth: any) {
    if (typeof inspectorWidth === 'number') {
      this.inspectorWidth = Math.max(Preferences.MIN_INSPECTOR_WIDTH, inspectorWidth);
    }
  }

  @action private parseHotkeyMap(hotkeyMap: any) {
    if (typeof hotkeyMap !== 'object') {
      return;
    }
    for (const key of Object.keys(this.hotkeyMap)) {
      const value = hotkeyMap[key];
      if (typeof value === 'string') {
        this.hotkeyMap[key as keyof IHotkeyMap] = value;
      }
    }
  }
}

export const enum Theme {
  Dark = 'dark',
  Light = 'light',
}

export const enum ViewMethod {
  List,
  Grid,
  MasonryVertical,
  MasonryHorizontal,
}

export const enum ThumbnailSize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
}

export const enum ThumbnailShape {
  Square = 'square',
  Letterbox = 'letterbox',
}

export interface IHotkeyMap {
  // Outerliner actions
  toggleOutliner: string;
  replaceQuery: string;

  // Inspector actions
  toggleInspector: string;
  toggleSettings: string;
  toggleHelpCenter: string;

  // Toolbar actions (these should only be active when the content area is focused)
  deleteSelection: string;
  openTagEditor: string;
  selectAll: string;
  deselectAll: string;
  viewList: string;
  viewGrid: string;
  viewMasonryVertical: string;
  viewMasonryHorizontal: string;
  viewSlide: string;
  search: string;
  advancedSearch: string;

  // Other
  openPreviewWindow: string;
}
