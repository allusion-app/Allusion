import { ipcRenderer, ipcMain, WebContents } from 'electron';

import { ID } from './entities/ID';
import { ITag } from './entities/Tag';

import { IImportItem } from './clipper/server';

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
  | 'logs'
  | 'pepperFlashSystemPlugin';

/////////////////// General ////////////////////
export const INITIALIZED = 'INITIALIZED';
const CLEAR_DATABASE = 'CLEAR_DATABASE';
const TOGGLE_DEV_TOOLS = 'TOGGLE_DEV_TOOLS';
const RELOAD = 'RELOAD';
const OPEN_DIALOG = 'OPEN_DIALOG';
const GET_PATH = 'GET_PATH';
const SET_FULL_SCREEN = 'SET_FULL_SCREEN';
const IS_FULL_SCREEN = 'IS_FULL_SCREEN';

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
}

/////////////// Drag n drop export ///////////////
export const DRAG_EXPORT = 'DRAG_EXPORT';
export type IDragExportMessage = string[];

//////////////////// Settings ////////////////////
export const IS_CLIP_SERVER_RUNNING = 'IS_CLIP_SERVER_RUNNING';
export const SET_CLIP_SERVER_ENABLED = 'SET_CLIP_SERVER_ENABLED';
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

export const GET_DOWNLOAD_PATH = 'GET_DOWNLOAD_PATH';
export const RECEIVE_DOWNLOAD_PATH = 'RECEIVE_DOWNLOAD_PATH';
export const SET_DOWNLOAD_PATH = 'SET_DOWNLOAD_PATH';
export interface IDownloadPathMessage {
  dir: string;
}

// Static methods for type safe IPC messages between renderer and main process
export class RendererMessenger {
  static initialized = () => ipcRenderer.send(INITIALIZED);

  static clearDatabase = () => ipcRenderer.send(CLEAR_DATABASE);

  static toggleDevTools = () => ipcRenderer.send(TOGGLE_DEV_TOOLS);

  static reload = () => ipcRenderer.send(RELOAD);

  static openDialog = (
    options: Electron.OpenDialogOptions,
  ): Promise<Electron.OpenDialogReturnValue> => ipcRenderer.invoke(OPEN_DIALOG, options);

  static getPath = (name: SYSTEM_PATHS): Promise<string> => ipcRenderer.invoke(GET_PATH, name);

  static setFullScreen = (isFullScreen: boolean) =>
    ipcRenderer.invoke(SET_FULL_SCREEN, isFullScreen);

  static isFullScreen = (): boolean => ipcRenderer.sendSync(IS_FULL_SCREEN);

  static onGetTags = (fetchTags: () => Promise<ITagsMessage>) =>
    ipcRenderer.on(GET_TAGS, async () => {
      const msg = await fetchTags();
      ipcRenderer.send(RECEIVE_TAGS, msg);
    });

  static isClipServerEnabled = (): boolean => ipcRenderer.sendSync(IS_CLIP_SERVER_RUNNING);

  static isRunningInBackground = (): boolean => ipcRenderer.sendSync(IS_RUNNING_IN_BACKGROUND);

  static setDownloadPath = (msg: IDownloadPathMessage) => ipcRenderer.send(SET_DOWNLOAD_PATH, msg);

  static onGetDownloadPath = (cb: () => string) => ipcRenderer.on(RECEIVE_DOWNLOAD_PATH, cb);

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
}

export class MainMessenger {
  static onceInitialized = async (): Promise<unknown> => {
    return new Promise((resolve) => ipcMain.once(INITIALIZED, resolve));
  };

  static onClearDatabase = (cb: () => void) => ipcMain.on(CLEAR_DATABASE, cb);

  static onToggleDevTools = (cb: () => void) => ipcMain.on(TOGGLE_DEV_TOOLS, cb);

  static onReload = (cb: () => void) => ipcMain.on(RELOAD, cb);

  static onOpenDialog = (dialog: Electron.Dialog) =>
    ipcMain.handle(OPEN_DIALOG, (_, options) => dialog.showOpenDialog(options));

  static onGetPath = (app: Electron.App) =>
    ipcMain.handle(GET_PATH, (_, name) => app.getPath(name));

  static onSetFullScreen = (cb: (isFullScreen: boolean) => void) =>
    ipcMain.handle(SET_FULL_SCREEN, (_, isFullScreen) => cb(isFullScreen));

  static onIsFullScreen = (cb: () => boolean) =>
    ipcMain.on(IS_FULL_SCREEN, (e) => (e.returnValue = cb()));

  static getTags = async (wc: WebContents): Promise<ITagsMessage> => {
    wc.send(GET_TAGS);
    return new Promise((resolve) =>
      ipcMain.once(RECEIVE_TAGS, (_, msg: ITagsMessage) => resolve(msg)),
    );
  };

  static onSetDownloadPath = (cb: (msg: IDownloadPathMessage) => void) =>
    ipcMain.on(SET_DOWNLOAD_PATH, (_, msg: IDownloadPathMessage) => cb(msg));

  static onSetClipServerEnabled = (cb: (msg: IClipServerEnabledMessage) => void) =>
    ipcMain.on(SET_CLIP_SERVER_ENABLED, (_, msg: IClipServerEnabledMessage) => cb(msg));

  static onSetTheme = (cb: (msg: IThemeMessage) => void) =>
    ipcMain.on(SET_THEME, (_, msg: IThemeMessage) => cb(msg));

  static onSetRunningInBackground = (cb: (msg: IRunInBackgroundMessage) => void) =>
    ipcMain.on(SET_RUN_IN_BACKGROUND, (_, msg: IRunInBackgroundMessage) => cb(msg));

  static getDownloadPath = (wc: WebContents): Promise<IDownloadPathMessage> => {
    wc.send(GET_DOWNLOAD_PATH);
    return new Promise((resolve) =>
      ipcMain.once(RECEIVE_DOWNLOAD_PATH, (_, msg: IDownloadPathMessage) => resolve(msg)),
    );
  };

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
}
