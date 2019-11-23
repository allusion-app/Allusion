import { ID } from './renderer/entities/ID';
import { IImportItem } from './main/clipServer';
import { ITag } from './renderer/entities/Tag';
import { ipcRenderer, ipcMain, WebContents, IpcMessageEvent } from 'electron';

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

//////////////////// Settings ////////////////////
export const IS_CLIP_SERVER_RUNNING = 'IS_CLIP_SERVER_RUNNING';
export const SET_CLIP_SERVER_ENABLED = 'SET_CLIP_SERVER_ENABLED';
export interface IClipServerEnabledMessage {
  isClipServerRunning: boolean;
}

export const IS_RUNNING_IN_BACKGROUND = 'IS_RUN_IN_BACKGROUND';
export const SET_RUN_IN_BACKGROUND = 'SET_RUN_IN_BACKGROUND';
export interface IRunInBackgroundMessage {
  isRunInBackground: boolean;
}

export const GET_DOWNLOAD_PATH = 'GET_DOWNLOAD_PATH';
export const SET_DOWNLOAD_PATH = 'SET_DOWNLOAD_PATH';
export interface IDownloadPathMessage {
  dir: string;
}

// Static methods for type safe IPC messages between renderer and main process

export class RendererMessenger {
  static initialized = () => ipcRenderer.send(INITIALIZED);

  static onGetTags = (cb: (e: IpcMessageEvent) => void) => ipcRenderer.on(GET_TAGS, cb);

  static getDownloadPath = (): string => ipcRenderer.sendSync(GET_DOWNLOAD_PATH);
  static getIsClipServerEnabled = (): boolean => ipcRenderer.sendSync(IS_CLIP_SERVER_RUNNING);
  static getIsRunningInBackground = (): boolean => ipcRenderer.sendSync(IS_RUNNING_IN_BACKGROUND);

  static setDownloadPath = (msg: IDownloadPathMessage) =>
    ipcRenderer.send(SET_DOWNLOAD_PATH, msg);
  static setClipServerEnabled = (msg: IClipServerEnabledMessage) =>
    ipcRenderer.send(SET_CLIP_SERVER_ENABLED, msg);
  static setRunInBackground = (msg: IRunInBackgroundMessage) =>
    ipcRenderer.send(SET_RUN_IN_BACKGROUND, msg);

  static storeFile = (msg: IStoreFileMessage) =>
    ipcRenderer.send(STORE_FILE, msg);
  static onceStoreFileReply = () =>
    new Promise<IStoreFileReplyMessage>((resolve) =>
      ipcRenderer.once(STORE_FILE_REPLY, (_: IpcMessageEvent, msg: IStoreFileReplyMessage) =>
        resolve(msg)));

  static onImportExternalImage = (cb: (msg: IImportExternalImageMessage) => void) =>
    ipcRenderer.on(IMPORT_EXTERNAL_IMAGE, (_: IpcMessageEvent, msg: IImportExternalImageMessage) => cb(msg));

  static onAddTagsToFile = (cb: (msg: IAddTagsToFileMessage) => void) =>
    ipcRenderer.on(ADD_TAGS_TO_FILE, (_: IpcMessageEvent, msg: IAddTagsToFileMessage) => cb(msg));

  static sendPreviewFiles = (msg: IPreviewFilesMessage) =>
    ipcRenderer.send(SEND_PREVIEW_FILES, msg);
  static onReceivePreviewFiles = (cb: (msg: IPreviewFilesMessage) => void) =>
    ipcRenderer.on(RECEIEVE_PREVIEW_FILES, (_: IpcMessageEvent, msg: IPreviewFilesMessage) => cb(msg));

  static onClosedPreviewWindow = (cb: () => void) =>
    ipcRenderer.on(CLOSED_PREVIEW_WINDOW, () => cb());

  // Todo: Add all messages in here, replace the ipcRenderer calls in other places
}

export class MainMessenger {
  static onceInitialized = async () =>
    new Promise((resolve) => ipcMain.once(INITIALIZED, resolve));

  static sendPreviewFiles = (wc: WebContents, msg: IPreviewFilesMessage) =>
    wc.send(RECEIEVE_PREVIEW_FILES, msg);

  // static

}
