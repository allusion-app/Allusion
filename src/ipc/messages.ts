import { IImportItem } from '../clipper/server';
import { ID } from '../api/id';
import { TagDTO } from '../api/tag';
import { ViewMethod } from '../frontend/stores/UiStore';

/**
 * All types of messages between the main and renderer process in one place, with type safety.
 */
export type SYSTEM_PATHS =
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
export const CLEAR_DATABASE = 'CLEAR_DATABASE';
export const TOGGLE_DEV_TOOLS = 'TOGGLE_DEV_TOOLS';
export const RELOAD = 'RELOAD';
export const OPEN_DIALOG = 'OPEN_DIALOG';
export const MESSAGE_BOX = 'MESSAGE_BOX';
export const MESSAGE_BOX_SYNC = 'MESSAGE_BOX_SYNC';
export const GET_PATH = 'GET_PATH';
export const TRASH_FILE = 'TRASH_FILE';
export const SET_FULL_SCREEN = 'SET_FULL_SCREEN';
export const IS_FULL_SCREEN = 'IS_FULL_SCREEN';
export const FULL_SCREEN_CHANGED = 'FULL_SCREEN_CHANGED';
export const SET_ZOOM_FACTOR = 'SET_ZOOM_FACTOR';
export const GET_ZOOM_FACTOR = 'GET_ZOOM_FACTOR';
export const WINDOW_MAXIMIZE = 'WINDOW_MAXIMIZE';
export const WINDOW_UNMAXIMIZE = 'WINDOW_UNMAXIMIZE';
export const WINDOW_FOCUS = 'WINDOW_FOCUS';
export const WINDOW_BLUR = 'WINDOW_BLUR';
export const IS_MAXIMIZED = 'IS_MAXIMIZED';

/////////////////// Window system buttons ////////////////////
export const WINDOW_SYSTEM_BUTTON_PRESS = 'WINDOW_SYSTEM_BUTTON_PRESS';
export const enum WindowSystemButtonPress {
  Minimize,
  Restore,
  Maximize,
  Close,
}

//////// Main proces (browser extension) ////////
export const GET_TAGS = 'GET_TAGS';
export const RECEIVE_TAGS = 'RECEIVE_TAGS';
export type TagsMessage = {
  tags: TagDTO[];
};

export const STORE_FILE = 'STORE_FILE';
export type StoreFileMessage = {
  directory: string;
  filenameWithExt: string;
  imgBase64: string;
};

export const STORE_FILE_REPLY = 'STORE_FILE_REPLY';
export type StoreFileReplyMessage = {
  downloadPath: string;
};

export const IMPORT_EXTERNAL_IMAGE = 'IMPORT_EXTERNAL_IMAGE';
export type ImportExternalImageMessage = {
  item: IImportItem;
};

export const ADD_TAGS_TO_FILE = 'ADD_TAGS_TO_FILE';
export type AddTagsToFileMessage = {
  item: IImportItem;
};

//////////////// Preview window ////////////////
export const CLOSED_PREVIEW_WINDOW = 'CLOSED_PREVIEW_WINDOW';

export const SEND_PREVIEW_FILES = 'SEND_PREVIEW_FILES_MESSAGE';
export const RECEIEVE_PREVIEW_FILES = 'RECEIEVE_PREVIEW_FILES_MESSAGE';
export type PreviewFilesMessage = {
  ids: ID[];
  activeImgId?: ID;
  thumbnailDirectory: string;
  viewMethod: ViewMethod;
};

/////////////// Drag n drop export ///////////////
export const DRAG_EXPORT = 'DRAG_EXPORT';
export type DragExportMessage = string[];

//////////////////// Settings ////////////////////
export const IS_CLIP_SERVER_RUNNING = 'IS_CLIP_SERVER_RUNNING';
export const SET_CLIP_SERVER_ENABLED = 'SET_CLIP_SERVER_ENABLED';
export const SET_CLIP_SERVER_IMPORT_LOCATION = 'SET_CLIP_SERVER_IMPORT_LOCATION';
export type ClipServerEnabledMessage = {
  isClipServerRunning: boolean;
};

export const SET_THEME = 'SET_THEME';
export type ThemeMessage = {
  theme: 'light' | 'dark';
};

export const IS_RUNNING_IN_BACKGROUND = 'IS_RUN_IN_BACKGROUND';
export const SET_RUN_IN_BACKGROUND = 'SET_RUN_IN_BACKGROUND';
export type RunInBackgroundMessage = {
  isRunInBackground: boolean;
};

export const GET_VERSION = 'GET_VERSION';
export const CHECK_FOR_UPDATES = 'CHECK_FOR_UPDATES';
export const TOGGLE_CHECK_UPDATES_ON_STARTUP = 'TOGGLE_CHECK_UPDATES_ON_STARTUP';
export const IS_CHECK_UPDATES_ON_STARTUP_ENABLED = 'IS_CHECK_UPDATES_ON_STARTUP_ENABLED';
