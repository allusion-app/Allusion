import { ipcRenderer, ipcMain, WebContents } from 'electron';
import path from 'path';

import { ID } from './entities/ID';
import { ITag } from './entities/Tag';

import { IImportItem } from './clipper/server';
import { ViewMethod } from './frontend/stores/UiStore';

/**
 * All types of messages between the main and renderer process in one place, with type safety.
 */
type SYSTEM_PATHS =
  | 'home'
  | 'appData'
  | 'userData'
  | 'cache'
  | 'temp'
  | 'exe'
  | 'module'
  | 'desktop'
  | 'documents'
  | 'downloads'
  | 'music'
  | 'pictures'
  | 'videos'
  | 'logs';

/////////////////// General ////////////////////
export const INITIALIZED = 'INITIALIZED';
const CLEAR_DATABASE = 'CLEAR_DATABASE';
const TOGGLE_DEV_TOOLS = 'TOGGLE_DEV_TOOLS';
const RELOAD = 'RELOAD';
const OPEN_DIALOG = 'OPEN_DIALOG';
const GET_PATH = 'GET_PATH';
const TRASH_FILE = 'TRASH_FILE';
const SET_FULL_SCREEN = 'SET_FULL_SCREEN';
const IS_FULL_SCREEN = 'IS_FULL_SCREEN';
const FULL_SCREEN_CHANGED = 'FULL_SCREEN_CHANGED';
const SET_ZOOM_FACTOR = 'SET_ZOOM_FACTOR';
const GET_ZOOM_FACTOR = 'GET_ZOOM_FACTOR';
const WINDOW_MAXIMIZE = 'WINDOW_MAXIMIZE';
const WINDOW_UNMAXIMIZE = 'WINDOW_UNMAXIMIZE';
const WINDOW_FOCUS = 'WINDOW_FOCUS';
const WINDOW_BLUR = 'WINDOW_BLUR';
const IS_MAXIMIZED = 'IS_MAXIMIZED';

/////////////////// Window system buttons ////////////////////
const WINDOW_SYSTEM_BUTTON_PRESS = 'WINDOW_SYSTEM_BUTTON_PRESS';
export const enum WindowSystemButtonPress {
  Minimize,
  Restore,
  Maximize,
  Close,
}

//////// Main proces (browser extension) ////////
export const GET_TAGS = 'GET_TAGS';
export const RECEIVE_TAGS = 'RECEIVE_TAGS';
export interface ITagsMessage {
  tags: ITag[];
}

export const STORE_FILE = 'STORE_FILE';
export interface IStoreFileMessage {
  directory: string;
  filenameWithExt: string;
  imgBase64: string;
}

export const STORE_FILE_REPLY = 'STORE_FILE_REPLY';
export interface IStoreFileReplyMessage {
  downloadPath: string;
}

export const IMPORT_EXTERNAL_IMAGE = 'IMPORT_EXTERNAL_IMAGE';
export interface IImportExternalImageMessage {
  item: IImportItem;
}

export const ADD_TAGS_TO_FILE = 'ADD_TAGS_TO_FILE';
export interface IAddTagsToFileMessage {
  item: IImportItem;
}

//////////////// Preview window ////////////////
export const CLOSED_PREVIEW_WINDOW = 'CLOSED_PREVIEW_WINDOW';

export const SEND_PREVIEW_FILES = 'SEND_PREVIEW_FILES_MESSAGE';
export const RECEIEVE_PREVIEW_FILES = 'RECEIEVE_PREVIEW_FILES_MESSAGE';
export interface IPreviewFilesMessage {
  ids: ID[];
  activeImgId?: ID;
  thumbnailDirectory: string;
  viewMethod: ViewMethod;
}

/////////////// Drag n drop export ///////////////
export const DRAG_EXPORT = 'DRAG_EXPORT';
export type IDragExportMessage = string[];

//////////////////// Settings ////////////////////
export const IS_CLIP_SERVER_RUNNING = 'IS_CLIP_SERVER_RUNNING';
export const SET_CLIP_SERVER_ENABLED = 'SET_CLIP_SERVER_ENABLED';
export const SET_CLIP_SERVER_IMPORT_LOCATION = 'SET_CLIP_SERVER_IMPORT_LOCATION';
export interface IClipServerEnabledMessage {
  isClipServerRunning: boolean;
}

export const SET_THEME = 'SET_THEME';
export interface IThemeMessage {
  theme: 'light' | 'dark';
}

export const IS_RUNNING_IN_BACKGROUND = 'IS_RUN_IN_BACKGROUND';
export const SET_RUN_IN_BACKGROUND = 'SET_RUN_IN_BACKGROUND';
export interface IRunInBackgroundMessage {
  isRunInBackground: boolean;
}

export const GET_VERSION = 'GET_VERSION';
export const CHECK_FOR_UPDATES = 'CHECK_FOR_UPDATES';
export const TOGGLE_CHECK_UPDATES_ON_STARTUP = 'TOGGLE_CHECK_UPDATES_ON_STARTUP';
export const IS_CHECK_UPDATES_ON_STARTUP_ENABLED = 'IS_CHECK_UPDATES_ON_STARTUP_ENABLED';

// Static methods for type safe IPC messages between renderer and main process
export class RendererMessenger {
  static initialized = () => ipcRenderer.send(INITIALIZED);

  static clearDatabase = () => ipcRenderer.send(CLEAR_DATABASE);

  static toggleDevTools = () => ipcRenderer.send(TOGGLE_DEV_TOOLS);

  static reload = (frontEndOnly?: boolean) => ipcRenderer.send(RELOAD, frontEndOnly);

  static openDialog = (
    options: Electron.OpenDialogOptions,
  ): Promise<Electron.OpenDialogReturnValue> => ipcRenderer.invoke(OPEN_DIALOG, options);

  static getPath = (name: SYSTEM_PATHS): Promise<string> => ipcRenderer.invoke(GET_PATH, name);

  static trashFile = (absolutePath: string): Promise<Error | undefined> =>
    ipcRenderer.invoke(TRASH_FILE, absolutePath);

  static setFullScreen = (isFullScreen: boolean) =>
    ipcRenderer.invoke(SET_FULL_SCREEN, isFullScreen);

  static isFullScreen = (): boolean => ipcRenderer.sendSync(IS_FULL_SCREEN);

  static onFullScreenChanged = (cb: (val: boolean) => void) =>
    ipcRenderer.on(FULL_SCREEN_CHANGED, (_, val: boolean) => cb(val));

  static setZoomFactor = (level: number) => ipcRenderer.invoke(SET_ZOOM_FACTOR, level);

  static getZoomFactor = (): number => ipcRenderer.sendSync(GET_ZOOM_FACTOR);

  static onGetTags = (fetchTags: () => Promise<ITagsMessage>) =>
    ipcRenderer.on(GET_TAGS, async () => {
      const msg = await fetchTags();
      ipcRenderer.send(RECEIVE_TAGS, msg);
    });

  static isClipServerEnabled = (): boolean => ipcRenderer.sendSync(IS_CLIP_SERVER_RUNNING);

  static setClipServerImportLocation = (dir: string): Promise<void> =>
    ipcRenderer.invoke(SET_CLIP_SERVER_IMPORT_LOCATION, dir);

  static isRunningInBackground = (): boolean => ipcRenderer.sendSync(IS_RUNNING_IN_BACKGROUND);

  static setClipServerEnabled = (msg: IClipServerEnabledMessage) =>
    ipcRenderer.send(SET_CLIP_SERVER_ENABLED, msg);

  static setTheme = (msg: IThemeMessage) => ipcRenderer.send(SET_THEME, msg);

  static setRunInBackground = (msg: IRunInBackgroundMessage) =>
    ipcRenderer.send(SET_RUN_IN_BACKGROUND, msg);

  static storeFile = (msg: IStoreFileMessage): Promise<IStoreFileReplyMessage> => {
    ipcRenderer.send(STORE_FILE, msg);
    return new Promise<IStoreFileReplyMessage>((resolve) =>
      ipcRenderer.once(STORE_FILE_REPLY, (_, msg: IStoreFileReplyMessage) => resolve(msg)),
    );
  };

  static startDragExport = (msg: IDragExportMessage) => ipcRenderer.send(DRAG_EXPORT, msg);

  static onImportExternalImage = (cb: (msg: IImportExternalImageMessage) => void) =>
    ipcRenderer.on(IMPORT_EXTERNAL_IMAGE, (_, msg: IImportExternalImageMessage) => cb(msg));

  static onAddTagsToFile = (cb: (msg: IAddTagsToFileMessage) => void) =>
    ipcRenderer.on(ADD_TAGS_TO_FILE, (_, msg: IAddTagsToFileMessage) => cb(msg));

  static sendPreviewFiles = (msg: IPreviewFilesMessage) => {
    ipcRenderer.send(SEND_PREVIEW_FILES, msg);
  };

  static onReceivePreviewFiles = (cb: (msg: IPreviewFilesMessage) => void) =>
    ipcRenderer.on(RECEIEVE_PREVIEW_FILES, (_, msg: IPreviewFilesMessage) => cb(msg));

  static onClosedPreviewWindow = (cb: () => void) => ipcRenderer.on(CLOSED_PREVIEW_WINDOW, cb);

  static onMaximize = (cb: () => void) => ipcRenderer.on(WINDOW_MAXIMIZE, () => cb());

  static onUnmaximize = (cb: () => void) => ipcRenderer.on(WINDOW_UNMAXIMIZE, () => cb());

  static onFocus = (cb: () => void) => ipcRenderer.on(WINDOW_FOCUS, () => cb());

  static onBlur = (cb: () => void) => ipcRenderer.on(WINDOW_BLUR, () => cb());

  static pressWindowSystemButton = (button: WindowSystemButtonPress) =>
    ipcRenderer.send(WINDOW_SYSTEM_BUTTON_PRESS, button);

  static isMaximized = (): boolean => ipcRenderer.sendSync(IS_MAXIMIZED);

  static getVersion = (): string => ipcRenderer.sendSync(GET_VERSION);

  static checkForUpdates = async () => ipcRenderer.invoke(CHECK_FOR_UPDATES);

  static isCheckUpdatesOnStartupEnabled = (): boolean =>
    ipcRenderer.sendSync(IS_CHECK_UPDATES_ON_STARTUP_ENABLED);

  static toggleCheckUpdatesOnStartup = (): void =>
    ipcRenderer.send(TOGGLE_CHECK_UPDATES_ON_STARTUP);

  static getDefaultThumbnailDirectory = async () => {
    const userDataPath = await RendererMessenger.getPath('temp');
    return path.join(userDataPath, 'Allusion', 'thumbnails');
  };

  static getDefaultBackupDirectory = async () => {
    const userDataPath = await RendererMessenger.getPath('userData');
    return path.join(userDataPath, 'backups');
  };
}

export class MainMessenger {
  static onceInitialized = async (): Promise<unknown> => {
    return new Promise((resolve) => ipcMain.once(INITIALIZED, resolve));
  };

  static onClearDatabase = (cb: () => void) => ipcMain.on(CLEAR_DATABASE, cb);

  static onToggleDevTools = (cb: () => void) => ipcMain.on(TOGGLE_DEV_TOOLS, cb);

  static onReload = (cb: (frontEndOnly?: boolean) => void) =>
    ipcMain.on(RELOAD, (_, frontEndOnly) => cb(frontEndOnly));

  static onOpenDialog = (dialog: Electron.Dialog) =>
    ipcMain.handle(OPEN_DIALOG, (_, options) => dialog.showOpenDialog(options));

  static onGetPath = (cb: (name: SYSTEM_PATHS) => string) =>
    ipcMain.handle(GET_PATH, (_, name) => cb(name));

  static onTrashFile = (cb: (absolutePath: string) => Promise<void>) =>
    ipcMain.handle(TRASH_FILE, async (_, absolutePath) => {
      try {
        await cb(absolutePath);
      } catch (e) {
        return e;
      }
    });

  static onSetFullScreen = (cb: (isFullScreen: boolean) => void) =>
    ipcMain.handle(SET_FULL_SCREEN, (_, isFullScreen) => cb(isFullScreen));

  static onIsFullScreen = (cb: () => boolean) =>
    ipcMain.on(IS_FULL_SCREEN, (e) => (e.returnValue = cb()));

  static fullscreenChanged = (wc: WebContents, isFullScreen: boolean) =>
    wc.send(FULL_SCREEN_CHANGED, isFullScreen);

  static onSetZoomFactor = (cb: (level: number) => void) =>
    ipcMain.handle(SET_ZOOM_FACTOR, (_, level) => cb(level));

  static onGetZoomFactor = (cb: () => number) =>
    ipcMain.on(GET_ZOOM_FACTOR, (e) => (e.returnValue = cb()));

  static getTags = async (wc: WebContents): Promise<ITagsMessage> => {
    wc.send(GET_TAGS);
    return new Promise((resolve) =>
      ipcMain.once(RECEIVE_TAGS, (_, msg: ITagsMessage) => resolve(msg)),
    );
  };

  static onSetClipServerEnabled = (cb: (msg: IClipServerEnabledMessage) => void) =>
    ipcMain.on(SET_CLIP_SERVER_ENABLED, (_, msg: IClipServerEnabledMessage) => cb(msg));

  static onSetClipServerImportLocation = (cb: (dir: string) => void) =>
    ipcMain.handle(SET_CLIP_SERVER_IMPORT_LOCATION, (_, dir) => cb(dir));

  static onSetTheme = (cb: (msg: IThemeMessage) => void) =>
    ipcMain.on(SET_THEME, (_, msg: IThemeMessage) => cb(msg));

  static onSetRunningInBackground = (cb: (msg: IRunInBackgroundMessage) => void) =>
    ipcMain.on(SET_RUN_IN_BACKGROUND, (_, msg: IRunInBackgroundMessage) => cb(msg));

  static onIsClipServerRunning = (cb: () => boolean) =>
    ipcMain.on(IS_CLIP_SERVER_RUNNING, (e) => (e.returnValue = cb()));

  static onIsRunningInBackground = (cb: () => boolean) =>
    ipcMain.on(IS_RUNNING_IN_BACKGROUND, (e) => (e.returnValue = cb()));

  static sendPreviewFiles = (wc: WebContents, msg: IPreviewFilesMessage) =>
    wc.send(RECEIEVE_PREVIEW_FILES, msg);

  static sendImportExternalImage = (wc: WebContents, msg: IImportExternalImageMessage) =>
    wc.send(IMPORT_EXTERNAL_IMAGE, msg);

  static sendAddTagsToFile = (wc: WebContents, msg: IAddTagsToFileMessage) =>
    wc.send(ADD_TAGS_TO_FILE, msg);

  static onSendPreviewFiles = (cb: (msg: IPreviewFilesMessage) => void) =>
    ipcMain.on(SEND_PREVIEW_FILES, (_, msg: IPreviewFilesMessage) => cb(msg));

  static sendClosedPreviewWindow = (wc: WebContents) => wc.send(CLOSED_PREVIEW_WINDOW);

  static onStoreFile = (getDownloadPath: (msg: IStoreFileMessage) => Promise<string>) =>
    ipcMain.on(STORE_FILE, async (e, msg: IStoreFileMessage) => {
      const downloadPath = await getDownloadPath(msg);
      e.sender.send(STORE_FILE_REPLY, { downloadPath } as IStoreFileReplyMessage);
    });

  static onDragExport = (cb: (msg: IDragExportMessage) => void) =>
    ipcMain.on(DRAG_EXPORT, (_, msg: IDragExportMessage) => cb(msg));

  static maximize = (wc: WebContents) => wc.send(WINDOW_MAXIMIZE);

  static unmaximize = (wc: WebContents) => wc.send(WINDOW_UNMAXIMIZE);

  static focus = (wc: WebContents) => wc.send(WINDOW_FOCUS);

  static blur = (wc: WebContents) => wc.send(WINDOW_BLUR);

  static onWindowSystemButtonPressed = (cb: (button: WindowSystemButtonPress) => void) =>
    ipcMain.on(WINDOW_SYSTEM_BUTTON_PRESS, (_, button: WindowSystemButtonPress) => cb(button));

  static onIsMaximized = (cb: () => boolean) =>
    ipcMain.on(IS_MAXIMIZED, (e) => (e.returnValue = cb()));

  static onGetVersion = (cb: () => string) =>
    ipcMain.on(GET_VERSION, (e) => (e.returnValue = cb()));

  static onCheckForUpdates = (cb: () => void) => ipcMain.handle(CHECK_FOR_UPDATES, cb);

  static onToggleCheckUpdatesOnStartup = (cb: () => void) =>
    ipcMain.on(TOGGLE_CHECK_UPDATES_ON_STARTUP, cb);

  static onIsCheckUpdatesOnStartupEnabled = (cb: () => boolean) =>
    ipcMain.on(IS_CHECK_UPDATES_ON_STARTUP_ENABLED, (e) => (e.returnValue = cb()));
}
