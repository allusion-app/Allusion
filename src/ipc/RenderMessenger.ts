import { ipcRenderer } from 'electron/renderer';
import path from 'path';
import {
  ADD_TAGS_TO_FILE,
  CHECK_FOR_UPDATES,
  CLEAR_DATABASE,
  CLOSED_PREVIEW_WINDOW,
  DRAG_EXPORT,
  FULL_SCREEN_CHANGED,
  GET_PATH,
  GET_TAGS,
  GET_VERSION,
  GET_ZOOM_FACTOR,
  AddTagsToFileMessage,
  ClipServerEnabledMessage,
  DragExportMessage,
  ImportExternalImageMessage,
  IMPORT_EXTERNAL_IMAGE,
  INITIALIZED,
  PreviewFilesMessage,
  RunInBackgroundMessage,
  StoreFileMessage,
  StoreFileReplyMessage,
  IS_CHECK_UPDATES_ON_STARTUP_ENABLED,
  IS_CLIP_SERVER_RUNNING,
  IS_FULL_SCREEN,
  IS_MAXIMIZED,
  IS_RUNNING_IN_BACKGROUND,
  TagsMessage,
  ThemeMessage,
  MESSAGE_BOX,
  MESSAGE_BOX_SYNC,
  OPEN_DIALOG,
  RECEIEVE_PREVIEW_FILES,
  RECEIVE_TAGS,
  RELOAD,
  SEND_PREVIEW_FILES,
  SET_CLIP_SERVER_ENABLED,
  SET_CLIP_SERVER_IMPORT_LOCATION,
  SET_FULL_SCREEN,
  SET_RUN_IN_BACKGROUND,
  SET_THEME,
  SET_ZOOM_FACTOR,
  STORE_FILE,
  STORE_FILE_REPLY,
  SYSTEM_PATHS,
  TOGGLE_CHECK_UPDATES_ON_STARTUP,
  TOGGLE_DEV_TOOLS,
  TRASH_FILE,
  WindowSystemButtonPress,
  WINDOW_BLUR,
  WINDOW_FOCUS,
  WINDOW_MAXIMIZE,
  WINDOW_SYSTEM_BUTTON_PRESS,
  WINDOW_UNMAXIMIZE,
} from './messages';

export class RendererMessenger {
  static initialized = () => ipcRenderer.send(INITIALIZED);

  static clearDatabase = () => ipcRenderer.send(CLEAR_DATABASE);

  static toggleDevTools = () => ipcRenderer.send(TOGGLE_DEV_TOOLS);

  static reload = (frontEndOnly?: boolean) => ipcRenderer.send(RELOAD, frontEndOnly);

  static showOpenDialog = (
    options: Electron.OpenDialogOptions,
  ): Promise<Electron.OpenDialogReturnValue> => ipcRenderer.invoke(OPEN_DIALOG, options);

  static showMessageBox = (
    options: Electron.MessageBoxOptions,
  ): Promise<Electron.MessageBoxReturnValue> => ipcRenderer.invoke(MESSAGE_BOX, options);

  static showMessageBoxSync = (options: Electron.MessageBoxSyncOptions): Promise<number> =>
    ipcRenderer.invoke(MESSAGE_BOX_SYNC, options);

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

  static onGetTags = (fetchTags: () => Promise<TagsMessage>) =>
    ipcRenderer.on(GET_TAGS, async () => {
      const msg = await fetchTags();
      ipcRenderer.send(RECEIVE_TAGS, msg);
    });

  static isClipServerEnabled = (): boolean => ipcRenderer.sendSync(IS_CLIP_SERVER_RUNNING);

  static setClipServerImportLocation = (dir: string): Promise<void> =>
    ipcRenderer.invoke(SET_CLIP_SERVER_IMPORT_LOCATION, dir);

  static isRunningInBackground = (): boolean => ipcRenderer.sendSync(IS_RUNNING_IN_BACKGROUND);

  static setClipServerEnabled = (msg: ClipServerEnabledMessage) =>
    ipcRenderer.send(SET_CLIP_SERVER_ENABLED, msg);

  static setTheme = (msg: ThemeMessage) => ipcRenderer.send(SET_THEME, msg);

  static setRunInBackground = (msg: RunInBackgroundMessage) =>
    ipcRenderer.send(SET_RUN_IN_BACKGROUND, msg);

  static storeFile = (msg: StoreFileMessage): Promise<StoreFileReplyMessage> => {
    ipcRenderer.send(STORE_FILE, msg);
    return new Promise<StoreFileReplyMessage>((resolve) =>
      ipcRenderer.once(STORE_FILE_REPLY, (_, msg: StoreFileReplyMessage) => resolve(msg)),
    );
  };

  static startDragExport = (msg: DragExportMessage) => ipcRenderer.send(DRAG_EXPORT, msg);

  static onImportExternalImage = (cb: (msg: ImportExternalImageMessage) => void) =>
    ipcRenderer.on(IMPORT_EXTERNAL_IMAGE, (_, msg: ImportExternalImageMessage) => cb(msg));

  static onAddTagsToFile = (cb: (msg: AddTagsToFileMessage) => void) =>
    ipcRenderer.on(ADD_TAGS_TO_FILE, (_, msg: AddTagsToFileMessage) => cb(msg));

  static sendPreviewFiles = (msg: PreviewFilesMessage) => {
    ipcRenderer.send(SEND_PREVIEW_FILES, msg);
  };

  static onReceivePreviewFiles = (cb: (msg: PreviewFilesMessage) => void) =>
    ipcRenderer.on(RECEIEVE_PREVIEW_FILES, (_, msg: PreviewFilesMessage) => cb(msg));

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

  static getThemesDirectory = async () => {
    const userDataPath = await RendererMessenger.getPath('userData');
    return path.join(userDataPath, 'themes');
  };
}
