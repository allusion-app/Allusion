import { ID } from './renderer/entities/ID';
import { IImportItem } from './main/clipServer';
import { ITag } from './renderer/entities/Tag';
import { ipcRenderer, ipcMain, WebContents, IpcRenderer, IpcMain, app } from 'electron';

/**
 * All types of messages between the main and renderer process in one place, with type safety.
 */

/////////////////// General ////////////////////
export const INITIALIZED = 'INITIALIZED';

//////// Main proces (browser extension) ////////
export const GET_TAGS = 'GET_TAGS';
export const RECEIVE_TAGS = 'RECEIVE_TAGS';
export interface ITagsMessage {
  tags: ITag[];
}

export const STORE_FILE = 'STORE_FILE';
export interface IStoreFileMessage {
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
  thumbnailDirectory: string;
}

/////////////// Drag n drop export ///////////////
export const DRAG_EXPORT = 'DRAG_EXPORT';
export interface IDragExportMessage {
  absolutePaths: string[];
}

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

export const GET_USER_PICTURES_PATH = 'GET_USER_PICTURES_PATH';
export const GET_DOWNLOAD_PATH = 'GET_DOWNLOAD_PATH';
export const RECEIVE_DOWNLOAD_PATH = 'RECEIVE_DOWNLOAD_PATH';
export const SET_DOWNLOAD_PATH = 'S ET_DOWNLOAD_PATH';
export interface IDownloadPathMessage {
  dir: string;
}

// Static methods for type safe IPC messages between renderer and main process
export class RendererMessenger {
  static initialized = () => {
    ipcRenderer.send(INITIALIZED);
  };

  static onGetTags = (fetchTags: () => Promise<ITagsMessage>) => {
    ipcRenderer.on(GET_TAGS, async () => {
      const msg = await fetchTags();
      ipcRenderer.send(RECEIVE_TAGS, msg);
    });
  };

  static getIsClipServerEnabled = (): boolean => {
    return ipcRenderer.sendSync(IS_CLIP_SERVER_RUNNING);
  };

  static getIsRunningInBackground = (): boolean => {
    return ipcRenderer.sendSync(IS_RUNNING_IN_BACKGROUND);
  };

  static setDownloadPath = (msg: IDownloadPathMessage) => {
    ipcRenderer.send(SET_DOWNLOAD_PATH, msg);
  };

  static onGetDownloadPath = (cb: () => string) => {
    return ipcRenderer.on(RECEIVE_DOWNLOAD_PATH, cb);
  };

  static setClipServerEnabled = (msg: IClipServerEnabledMessage) => {
    ipcRenderer.send(SET_CLIP_SERVER_ENABLED, msg);
  };

  static setTheme = (msg: IThemeMessage) => {
    ipcRenderer.send(SET_THEME, msg);
  };


  static setRunInBackground = (msg: IRunInBackgroundMessage) => {
    ipcRenderer.send(SET_RUN_IN_BACKGROUND, msg);
  };

  static storeFile = (msg: IStoreFileMessage): Promise<IStoreFileReplyMessage> => {
    ipcRenderer.send(STORE_FILE, msg);
    return new Promise<IStoreFileReplyMessage>((resolve) =>
      ipcRenderer.once(STORE_FILE_REPLY, (_, msg: IStoreFileReplyMessage) => resolve(msg)),
    );
  };

  static startDragExport = (msg: IDragExportMessage) => {
    ipcRenderer.send(DRAG_EXPORT, msg);
  };

  static onImportExternalImage = (cb: (msg: IImportExternalImageMessage) => void): IpcRenderer => {
    return ipcRenderer.on(IMPORT_EXTERNAL_IMAGE, (_, msg: IImportExternalImageMessage) => cb(msg));
  };

  static onAddTagsToFile = (cb: (msg: IAddTagsToFileMessage) => void): IpcRenderer => {
    return ipcRenderer.on(ADD_TAGS_TO_FILE, (_, msg: IAddTagsToFileMessage) => cb(msg));
  };

  static sendPreviewFiles = (msg: IPreviewFilesMessage) => {
    ipcRenderer.send(SEND_PREVIEW_FILES, msg);
  };

  static onReceivePreviewFiles = (cb: (msg: IPreviewFilesMessage) => void): IpcRenderer => {
    return ipcRenderer.on(RECEIEVE_PREVIEW_FILES, (_, msg: IPreviewFilesMessage) => cb(msg));
  };

  static onClosedPreviewWindow = (cb: () => void): IpcRenderer => {
    return ipcRenderer.on(CLOSED_PREVIEW_WINDOW, cb);
  };

  static getUserPicturesPath = (): string => ipcRenderer.sendSync(GET_USER_PICTURES_PATH);
}

export class MainMessenger {
  static onceInitialized = async (): Promise<unknown> => {
    return new Promise((resolve) => ipcMain.once(INITIALIZED, resolve));
  };

  static getTags = async (wc: WebContents): Promise<ITagsMessage> => {
    wc.send(GET_TAGS);
    return new Promise((resolve) =>
      ipcMain.once(RECEIVE_TAGS, (_, msg: ITagsMessage) => resolve(msg)),
    );
  };

  static onSetDownloadPath = (cb: (msg: IDownloadPathMessage) => void): IpcMain => {
    return ipcMain.on(SET_DOWNLOAD_PATH, (_, msg: IDownloadPathMessage) => cb(msg));
  };

  static onSetClipServerEnabled = (cb: (msg: IClipServerEnabledMessage) => void): IpcMain => {
    return ipcMain.on(SET_CLIP_SERVER_ENABLED, (_, msg: IClipServerEnabledMessage) => cb(msg));
  };

  static onSetTheme = (cb: (msg: IThemeMessage) => void): IpcMain => {
    return ipcMain.on(SET_THEME, (_, msg: IThemeMessage) => cb(msg));
  };

  static onSetRunningInBackground = (cb: (msg: IRunInBackgroundMessage) => void): IpcMain => {
    return ipcMain.on(SET_RUN_IN_BACKGROUND, (_, msg: IRunInBackgroundMessage) => cb(msg));
  };

  static getDownloadPath = (wc: WebContents): Promise<IDownloadPathMessage> => {
    wc.send(GET_DOWNLOAD_PATH);
    return new Promise((resolve) =>
      ipcMain.once(RECEIVE_DOWNLOAD_PATH, (_, msg: IDownloadPathMessage) => resolve(msg)),
    );
  };

  static onIsClipServerRunning = (cb: () => boolean): IpcMain => {
    return ipcMain.on(IS_CLIP_SERVER_RUNNING, (e) => (e.returnValue = cb()));
  };

  static onIsRunningInBackground = (cb: () => boolean): IpcMain => {
    return ipcMain.on(IS_RUNNING_IN_BACKGROUND, (e) => (e.returnValue = cb()));
  };

  static sendPreviewFiles = (wc: WebContents, msg: IPreviewFilesMessage) => {
    wc.send(RECEIEVE_PREVIEW_FILES, msg);
  };

  static sendImportExternalImage = (wc: WebContents, msg: IImportExternalImageMessage) => {
    wc.send(IMPORT_EXTERNAL_IMAGE, msg);
  };

  static sendAddTagsToFile = (wc: WebContents, msg: IAddTagsToFileMessage) => {
    wc.send(ADD_TAGS_TO_FILE, msg);
  };

  static onSendPreviewFiles = (cb: (msg: IPreviewFilesMessage) => void): IpcMain => {
    return ipcMain.on(SEND_PREVIEW_FILES, (_, msg: IPreviewFilesMessage) => cb(msg));
  };

  static sendClosedPreviewWindow = (wc: WebContents) => {
    wc.send(CLOSED_PREVIEW_WINDOW);
  };

  static onStoreFile = (getDownloadPath: (msg: IStoreFileMessage) => Promise<string>) => {
    ipcMain.on(STORE_FILE, async (e, msg: IStoreFileMessage) => {
      const downloadPath = await getDownloadPath(msg);
      e.sender.send(STORE_FILE_REPLY, { downloadPath } as IStoreFileReplyMessage);
    });
  };

  static onDragExport = (cb: (msg: IDragExportMessage) => void): IpcMain => {
    return ipcMain.on(DRAG_EXPORT, (_, msg: IDragExportMessage) => cb(msg));
  };

  static onGetUserPicturesPath = (): IpcMain => {
    return ipcMain.on(GET_USER_PICTURES_PATH, (e) => (e.returnValue = app.getPath('pictures')));
  };
}
