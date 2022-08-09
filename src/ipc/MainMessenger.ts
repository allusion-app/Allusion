import { BrowserWindow, ipcMain, WebContents } from 'electron/main';
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

export class MainMessenger {
  static onceInitialized = async (): Promise<unknown> => {
    return new Promise((resolve) => ipcMain.once(INITIALIZED, resolve));
  };

  static onClearDatabase = (cb: () => void) => ipcMain.on(CLEAR_DATABASE, cb);

  static onToggleDevTools = (cb: () => void) => ipcMain.on(TOGGLE_DEV_TOOLS, cb);

  static onReload = (cb: (frontEndOnly?: boolean) => void) =>
    ipcMain.on(RELOAD, (_, frontEndOnly) => cb(frontEndOnly));

  static onOpenDialog = (dialog: Electron.Dialog) =>
    ipcMain.handle(OPEN_DIALOG, (e, options) => {
      const bw = BrowserWindow.fromWebContents(e.sender);
      return bw ? dialog.showOpenDialog(bw, options) : dialog.showOpenDialog(options);
    });

  static onMessageBox = (dialog: Electron.Dialog) =>
    ipcMain.handle(MESSAGE_BOX, (e, options) => {
      const bw = BrowserWindow.fromWebContents(e.sender);
      return bw ? dialog.showMessageBox(bw, options) : dialog.showMessageBox(options);
    });

  static onMessageBoxSync = (dialog: Electron.Dialog) =>
    ipcMain.handle(MESSAGE_BOX_SYNC, (e, options) => {
      const bw = BrowserWindow.fromWebContents(e.sender);
      return bw ? dialog.showMessageBoxSync(bw, options) : dialog.showMessageBoxSync(options);
    });

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

  static getTags = async (wc: WebContents): Promise<TagsMessage> => {
    wc.send(GET_TAGS);
    return new Promise((resolve) =>
      ipcMain.once(RECEIVE_TAGS, (_, msg: TagsMessage) => resolve(msg)),
    );
  };

  static onSetClipServerEnabled = (cb: (msg: ClipServerEnabledMessage) => void) =>
    ipcMain.on(SET_CLIP_SERVER_ENABLED, (_, msg: ClipServerEnabledMessage) => cb(msg));

  static onSetClipServerImportLocation = (cb: (dir: string) => void) =>
    ipcMain.handle(SET_CLIP_SERVER_IMPORT_LOCATION, (_, dir) => cb(dir));

  static onSetTheme = (cb: (msg: ThemeMessage) => void) =>
    ipcMain.on(SET_THEME, (_, msg: ThemeMessage) => cb(msg));

  static onSetRunningInBackground = (cb: (msg: RunInBackgroundMessage) => void) =>
    ipcMain.on(SET_RUN_IN_BACKGROUND, (_, msg: RunInBackgroundMessage) => cb(msg));

  static onIsClipServerRunning = (cb: () => boolean) =>
    ipcMain.on(IS_CLIP_SERVER_RUNNING, (e) => (e.returnValue = cb()));

  static onIsRunningInBackground = (cb: () => boolean) =>
    ipcMain.on(IS_RUNNING_IN_BACKGROUND, (e) => (e.returnValue = cb()));

  static sendPreviewFiles = (wc: WebContents, msg: PreviewFilesMessage) =>
    wc.send(RECEIEVE_PREVIEW_FILES, msg);

  static sendImportExternalImage = (wc: WebContents, msg: ImportExternalImageMessage) =>
    wc.send(IMPORT_EXTERNAL_IMAGE, msg);

  static sendAddTagsToFile = (wc: WebContents, msg: AddTagsToFileMessage) =>
    wc.send(ADD_TAGS_TO_FILE, msg);

  static onSendPreviewFiles = (cb: (msg: PreviewFilesMessage) => void) =>
    ipcMain.on(SEND_PREVIEW_FILES, (_, msg: PreviewFilesMessage) => cb(msg));

  static sendClosedPreviewWindow = (wc: WebContents) => wc.send(CLOSED_PREVIEW_WINDOW);

  static onStoreFile = (getDownloadPath: (msg: StoreFileMessage) => Promise<string>) =>
    ipcMain.on(STORE_FILE, async (e, msg: StoreFileMessage) => {
      const downloadPath = await getDownloadPath(msg);
      e.sender.send(STORE_FILE_REPLY, { downloadPath } as StoreFileReplyMessage);
    });

  static onDragExport = (cb: (msg: DragExportMessage) => void) =>
    ipcMain.on(DRAG_EXPORT, (_, msg: DragExportMessage) => cb(msg));

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
