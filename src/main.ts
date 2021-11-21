import {
  app,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  dialog,
  Menu,
  nativeImage,
  nativeTheme,
  screen,
  session,
  shell,
  Tray,
} from 'electron';
import path from 'path';
import fse from 'fs-extra';
import { autoUpdater, UpdateInfo } from 'electron-updater';
import TrayIcon from '../resources/logo/png/full-color/allusion-logomark-fc-256x256.png';
import AppIcon from '../resources/logo/png/full-color/allusion-logomark-fc-512x512.png';
import TrayIconMac from '../resources/logo/png/black/allusionTemplate@2x.png'; // filename convention: https://www.electronjs.org/docs/api/native-image#template-image
import ClipServer, { IImportItem } from './clipper/server';
import { isDev } from './config';
import { ITag, ROOT_TAG_ID } from './entities/Tag';
import { MainMessenger, WindowSystemButtonPress } from './Messaging';
import { Rectangle } from 'electron/main';

// TODO: change this when running in portable mode, see portable-improvements branch
const basePath = app.getPath('userData');

const preferencesFilePath = path.join(basePath, 'preferences.json');
const windowStateFilePath = path.join(basePath, 'windowState.json');

type PreferencesFile = {
  checkForUpdatesOnStartup?: boolean;
};
let preferences: PreferencesFile = {};
const updatePreferences = (prefs: PreferencesFile) => {
  preferences = prefs;
  fse.writeJSONSync(preferencesFilePath, prefs);
};

let mainWindow: BrowserWindow | null = null;
let previewWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let clipServer: ClipServer | null = null;

function initialize() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (details.responseHeaders === undefined) {
      callback({});
    } else {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Cross-Origin-Opener-Policy': ['same-origin'],
          'Cross-Origin-Embedder-Policy': ['require-corp'],
        },
      });
    }
  });

  createWindow();
  createPreviewWindow();

  // Initialize preferences file and its consequences
  try {
    if (!fse.pathExists(basePath)) {
      fse.mkdirSync(basePath);
    }
    try {
      preferences = fse.readJSONSync(preferencesFilePath);
    } catch (e) {
      // Auto update enabled by default
      preferences = { checkForUpdatesOnStartup: true };
    }
    if (preferences.checkForUpdatesOnStartup) {
      autoUpdater.checkForUpdates();
    }
  } catch (e) {
    console.error(e);
  }
}

function createWindow() {
  // Remember window size and position
  const previousWindowState = getPreviousWindowState();

  const mainOptions: BrowserWindowConstructorOptions = {
    titleBarStyle: 'hidden',
    // Disable native frame: we use a custom titlebar for all platforms: a unique one for MacOS, and one for windows/linux
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      // window.open should open a normal window like in a browser, not an electron BrowserWindowProxy
      nativeWindowOpen: true,
      nodeIntegrationInSubFrames: true,
      contextIsolation: false,
    },
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    icon: `${__dirname}/${AppIcon}`,
    // Should be same as body background: Only for split second before css is loaded
    backgroundColor: '#1c1e23',
    title: 'Allusion',
    show: false, // only show once initial loading is finished
    ...previousWindowState,
  };

  // Create the browser window.
  mainWindow = new BrowserWindow(mainOptions);
  mainWindow.on('ready-to-show', () => mainWindow?.show());

  // Customize new window opening
  // https://www.electronjs.org/docs/api/window-open
  mainWindow.webContents.setWindowOpenHandler(({ frameName }) => {
    if (mainWindow === null || mainWindow?.isDestroyed()) {
      return { action: 'deny' };
    }

    const WINDOW_TITLES: { [key: string]: string } = {
      settings: 'Settings',
      'help-center': 'Help Center',
      about: 'About',
    };

    if (!(frameName in WINDOW_TITLES)) {
      return { action: 'deny' };
    }

    // Open window on same display as main window
    const targetDisplay = getMainWindowDisplay();
    const bounds: Rectangle = { width: 680, height: 480, x: 0, y: 0 };
    bounds.x = targetDisplay.bounds.x + bounds.width / 2;
    bounds.y = targetDisplay.bounds.y + bounds.height / 2;

    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        ...bounds,
        icon: `${__dirname}/${AppIcon}`,
        // Should be same as body background: Only for split second before css is loaded
        backgroundColor: '#1c1e23',
        parent: mainWindow,
        title: `${WINDOW_TITLES[frameName]} • Allusion`,
        frame: true,
        titleBarStyle: 'default',
      },
    };
  });

  mainWindow.webContents.on('did-create-window', (childWindow) => {
    if (mainWindow === null || mainWindow?.isDestroyed()) {
      return;
    }

    childWindow.center(); // "center" in additionalOptions doesn't work :/
    childWindow.setMenu(null); // no toolbar needed

    if (isDev()) {
      childWindow.webContents.openDevTools();
    }

    mainWindow.webContents.once('will-navigate', () => {
      if (!childWindow?.isDestroyed()) {
        childWindow.close(); // close when main window is reloaded
      }
    });
  });

  mainWindow.addListener('enter-full-screen', () => {
    if (mainWindow !== null) {
      MainMessenger.fullscreenChanged(mainWindow.webContents, true);
    }
  });

  mainWindow.addListener('leave-full-screen', () => {
    if (mainWindow !== null) {
      MainMessenger.fullscreenChanged(mainWindow.webContents, false);
    }
  });

  mainWindow.addListener('resize', saveWindowState);
  mainWindow.addListener('move', saveWindowState);
  mainWindow.addListener('unmaximize', saveWindowState);
  mainWindow.addListener('maximize', saveWindowState);

  let menu = null;

  // Mac App menu - used for styling so shortcuts work
  // https://livebook.manning.com/book/cross-platform-desktop-applications/chapter-9/78

  // Create our menu entries so that we can use MAC shortcuts
  const menuBar: Electron.MenuItemConstructorOptions[] = [];

  menuBar.push({
    label: 'Allusion',
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services', submenu: [] },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => process.exit(0),
      },
    ],
  });

  menuBar.push({
    label: 'Edit',
    submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }],
  });

  menuBar.push({
    label: 'View',
    submenu: [
      {
        // FIXME: Just reloading window crashes due to an Electron bug related
        // to WASM.
        // A restart of the whole electron app circumvents that but not always.
        label: 'Reload',
        accelerator: 'CommandOrControl+R',
        click: forceRelaunch,
      },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      {
        label: 'Actual Size',
        accelerator: 'CommandOrControl+0',
        click: (_, browserWindow) => {
          if (browserWindow) {
            browserWindow.webContents.zoomFactor = 1;
          }
        },
      },
      {
        label: 'Zoom In',
        // TODO: Fix by using custom solution...
        accelerator: 'CommandOrControl+=',
        click: (_, browserWindow) => {
          if (browserWindow !== undefined) {
            browserWindow.webContents.setZoomFactor(
              Math.min(browserWindow.webContents.zoomFactor + 0.1, MAX_ZOOM_FACTOR),
            );
          }
        },
      },
      {
        label: 'Zoom Out',
        accelerator: 'CommandOrControl+-',
        click: (_, browserWindow) => {
          if (browserWindow !== undefined) {
            browserWindow.webContents.setZoomFactor(
              Math.max(browserWindow.webContents.zoomFactor - 0.1, MIN_ZOOM_FACTOR),
            );
          }
        },
      },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  });

  menu = Menu.buildFromTemplate(menuBar);

  Menu.setApplicationMenu(menu);

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // then maximize the window if it was previously
  if (previousWindowState.isMaximized) {
    mainWindow.maximize();
  }

  // Open the DevTools if in dev mode.
  if (isDev()) {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
    if (previewWindow !== null && !previewWindow.isDestroyed()) {
      previewWindow.close();
    }
  });

  mainWindow.on('maximize', () => {
    if (mainWindow !== null) {
      MainMessenger.maximize(mainWindow.webContents);
    }
  });

  mainWindow.on('unmaximize', () => {
    if (mainWindow !== null) {
      MainMessenger.unmaximize(mainWindow.webContents);
    }
  });

  if (clipServer === null) {
    clipServer = new ClipServer(importExternalImage, addTagsToFile, getTags);
  }

  // System tray icon: Always show on Mac, or other platforms when the app is running in the background
  // Useful for browser extension, so it will work even when the window is closed
  if (IS_MAC || clipServer.isRunInBackgroundEnabled()) {
    createTrayMenu();
  }

  // Import images that were added while the window was closed
  MainMessenger.onceInitialized().then(async () => {
    if (clipServer === null || mainWindow === null) {
      return;
    }
    const importItems = await clipServer.getImportQueue();
    await Promise.all(importItems.map(importExternalImage));
    clipServer.clearImportQueue();
  });
}

function createPreviewWindow() {
  // Get display where main window is located
  const display = getMainWindowDisplay();

  // preview window is is sized relative to screen resolution by default
  const bounds: Rectangle = {
    width: (display.size.width * 3) / 4,
    height: (display.size.height * 3) / 4,
    x: display.bounds.x + display.bounds.width / 8,
    y: display.bounds.y + display.bounds.height / 8,
  };

  previewWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
    },
    minWidth: 224,
    minHeight: 224,
    ...bounds,
    icon: `${__dirname}/${AppIcon}`,
    // Should be same as body background: Only for split second before css is loaded
    backgroundColor: '#14181a',
    title: 'Allusion Quick View',
    show: false, // invis by default
  });
  previewWindow.setMenuBarVisibility(false);
  previewWindow.loadURL(`file://${__dirname}/index.html?preview=true`);
  previewWindow.on('close', (e) => {
    // Prevent close, hide the window instead, for faster launch next time
    if (mainWindow !== null) {
      e.preventDefault();
      MainMessenger.sendClosedPreviewWindow(mainWindow.webContents);
      mainWindow.focus();
    }
    if (previewWindow !== null) {
      previewWindow.hide();
    }
  });
  return previewWindow;
}

function createTrayMenu() {
  if (tray === null || tray.isDestroyed()) {
    const onTrayClick = () =>
      mainWindow === null || mainWindow.isDestroyed() ? initialize() : mainWindow.focus();

    tray = new Tray(`${__dirname}/${IS_MAC ? TrayIconMac : TrayIcon}`);
    const trayMenu = Menu.buildFromTemplate([
      {
        label: 'Open',
        type: 'normal',
        click: onTrayClick,
      },
      {
        label: 'Quit',
        click: () => process.exit(0),
      },
    ]);
    tray.setContextMenu(trayMenu);
    tray.setToolTip('Allusion - Your Visual Library');
    tray.on('click', onTrayClick);
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (clipServer === null || !clipServer.isRunInBackgroundEnabled()) {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }
});

// Ensure only a single instance of Allusion can be open
// https://www.electronjs.org/docs/api/app#apprequestsingleinstancelock
const HAS_INSTANCE_LOCK = app.requestSingleInstanceLock();
if (!HAS_INSTANCE_LOCK) {
  console.log('Another instance of Allusion is already running');
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow === null || mainWindow.isDestroyed()) {
      // In case there is no main window (could be running in background): re-initialize
      initialize();
    } else {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  // Only initialize window if no other instance is already running:
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(initialize);
}

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// Auto-updates: using electron-builders autoUpdater: https://www.electron.build/auto-update#quick-setup-guide
// How it should go:
// - Auto check for updates on startup (toggleable in settings) -> show toast message if update available
// - Option to check for updates in settings
// - Only download and install when user agrees
autoUpdater.autoDownload = false;
let hasCheckedForUpdateOnStartup = false;
if (isDev()) {
  autoUpdater.updateConfigPath = path.join(__dirname, '..', 'dev-app-update.yml');
}

autoUpdater.on('error', (error) => {
  let errorMsg: string = (error.stack || error).toString() || 'Reason unknown, try again later.';

  // In case of no network connection...
  if (errorMsg.includes('INTERNET_DISCONNECTED')) {
    // no need to show an error dialog on startup
    if (!hasCheckedForUpdateOnStartup) {
      hasCheckedForUpdateOnStartup = true;
      return;
    }
    // Otherwise this error occured during a manual update check from the user, show a friendlier message
    errorMsg = 'There seems to be an issue with your internet connection.';
  }
  dialog.showErrorBox('Auto-update error: ', errorMsg);
  hasCheckedForUpdateOnStartup = true;
});

autoUpdater.on('update-available', async (info: UpdateInfo) => {
  if (mainWindow === null || mainWindow.isDestroyed()) {
    return;
  }

  const message = `Update available: ${
    info.releaseName || info.version
  }:\nDo you wish to update now?`;
  // info.releaseNotes attribute is HTML, could show that in renderer at some point

  const dialogResult = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Found Updates',
    message,
    buttons: ['Yes', 'No', 'Open release page'],
  });

  if (dialogResult.response === 0) {
    autoUpdater.downloadUpdate();
  } else if (dialogResult.response === 2) {
    shell.openExternal('https://github.com/allusion-app/Allusion/releases/latest');
  }
});

autoUpdater.on('update-not-available', () => {
  if (!hasCheckedForUpdateOnStartup) {
    // don't show a dialog if the update check was triggered automatically on start-up
    hasCheckedForUpdateOnStartup = true;
    return;
  }
  // Could also show this as a toast!
  if (mainWindow === null || mainWindow.isDestroyed()) {
    return;
  }
  dialog.showMessageBox(mainWindow, {
    title: 'No Update Available',
    message: `Current version is up-to-date (v${getVersion()})!`,
  });
});

autoUpdater.on('update-downloaded', async () => {
  await dialog.showMessageBox({
    title: 'Install Updates',
    message: 'Updates downloaded, Allusion will restart...',
  });
  setImmediate(() => autoUpdater.quitAndInstall());
});

// Check for updates on startup
// TODO: Make this disableable
autoUpdater.checkForUpdates();

//---------------------------------------------------------------------------------//
// Messaging: Sending and receiving messages between the main and renderer process //
//---------------------------------------------------------------------------------//
MainMessenger.onIsClipServerRunning(() => clipServer!.isEnabled());
MainMessenger.onIsRunningInBackground(() => clipServer!.isRunInBackgroundEnabled());

MainMessenger.onSetClipServerEnabled(({ isClipServerRunning }) =>
  clipServer?.setEnabled(isClipServerRunning),
);
MainMessenger.onSetClipServerImportLocation((dir) => clipServer?.setImportLocation(dir));
MainMessenger.onSetRunningInBackground(({ isRunInBackground }) => {
  if (clipServer === null) {
    return;
  }
  clipServer.setRunInBackground(isRunInBackground);
  if (isRunInBackground) {
    createTrayMenu();
  } else if (tray) {
    tray.destroy();
    tray = null;
  }
});

MainMessenger.onStoreFile(({ directory, filenameWithExt, imgBase64 }) =>
  clipServer!.storeImageWithoutImport(directory, filenameWithExt, imgBase64),
);

// Forward files from the main window to the preview window
MainMessenger.onSendPreviewFiles((msg) => {
  // Create preview window if needed, and send the files selected in the primary window
  if (previewWindow === null || previewWindow.isDestroyed()) {
    // The Window object might've been destroyed if it was hidden for too long -> Recreate it
    if (previewWindow?.isDestroyed()) {
      console.warn('Preview window was destroyed! Attemping to recreate...');
    }

    previewWindow = createPreviewWindow();
    MainMessenger.onceInitialized().then(() => {
      if (previewWindow) {
        MainMessenger.sendPreviewFiles(previewWindow.webContents, msg);
      }
    });
  } else {
    MainMessenger.sendPreviewFiles(previewWindow.webContents, msg);
    if (!previewWindow.isVisible()) {
      previewWindow.show();
    }
    previewWindow.focus();
  }
});

// Set native window theme (frame, menu bar)
MainMessenger.onSetTheme((msg) => (nativeTheme.themeSource = msg.theme));

MainMessenger.onDragExport((absolutePaths) => {
  if (mainWindow === null || absolutePaths.length === 0) {
    return;
  }

  // TODO: should use the thumbnail used in the renderer process here, so formats not natively supported (e.g. webp) can be used as well
  let previewIcon = nativeImage.createEmpty();
  try {
    previewIcon = nativeImage.createFromPath(absolutePaths[0]);
  } catch (e) {
    console.error('Could not create drag icon', absolutePaths[0], e);
  }

  const isPreviewEmpty = previewIcon.isEmpty();
  if (!isPreviewEmpty) {
    // Resize preview to something resonable: taking into account aspect ratio
    const ratio = previewIcon.getAspectRatio();
    const size = previewIcon.getSize();
    const targetThumbSize = 200;
    if (size.width > targetThumbSize || size.height > targetThumbSize) {
      previewIcon =
        ratio > 1
          ? previewIcon.resize({ width: targetThumbSize })
          : previewIcon.resize({ height: targetThumbSize });
    }
  }

  // Need to cast item as `any` since the types are not correct. The `files` field is allowed but
  // not according to the electron documentation where it is `file`.
  mainWindow.webContents.startDrag({
    files: absolutePaths,
    // Just show the first image as a thumbnail for now
    // TODO: Show some indication that multiple images are dragged, would be cool to show a stack of the first few of them
    icon: isPreviewEmpty ? AppIcon : previewIcon,
  } as any);
});

MainMessenger.onClearDatabase(forceRelaunch);

MainMessenger.onToggleDevTools(() => mainWindow?.webContents.toggleDevTools());

MainMessenger.onReload(forceRelaunch);

MainMessenger.onOpenDialog(dialog);

MainMessenger.onGetPath((path) => app.getPath(path));

MainMessenger.onIsFullScreen(() => mainWindow?.isFullScreen() ?? false);

MainMessenger.onSetFullScreen((isFullScreen) => mainWindow?.setFullScreen(isFullScreen));

MainMessenger.onGetZoomFactor(() => mainWindow?.webContents.zoomFactor ?? 1);

MainMessenger.onSetZoomFactor((factor) => {
  if (mainWindow !== null) {
    const zoom = Math.max(MIN_ZOOM_FACTOR, Math.min(factor, MAX_ZOOM_FACTOR));
    mainWindow.webContents.setZoomFactor(zoom);
  }
});

MainMessenger.onWindowSystemButtonPressed((button: WindowSystemButtonPress) => {
  if (mainWindow !== null) {
    switch (button) {
      case WindowSystemButtonPress.Close:
        mainWindow.close();
        break;

      case WindowSystemButtonPress.Maximize:
        mainWindow.maximize();
        break;

      case WindowSystemButtonPress.Minimize:
        mainWindow.minimize();
        break;

      case WindowSystemButtonPress.Restore:
        mainWindow.restore();
        break;

      default:
        break;
    }
  }
});

MainMessenger.onIsMaximized(() => mainWindow?.isMaximized() ?? false);

MainMessenger.onGetVersion(getVersion);

MainMessenger.onCheckForUpdates(() => autoUpdater.checkForUpdates());

MainMessenger.onToggleCheckUpdatesOnStartup(() => {
  updatePreferences({
    ...preferences,
    checkForUpdatesOnStartup: !preferences.checkForUpdatesOnStartup,
  });
});

MainMessenger.onIsCheckUpdatesOnStartupEnabled(() => !!preferences.checkForUpdatesOnStartup);

// Helper functions and variables/constants

const IS_MAC = process.platform === 'darwin';
const MIN_ZOOM_FACTOR = 0.5;
const MAX_ZOOM_FACTOR = 2;
const MIN_WINDOW_WIDTH = 240;
const MIN_WINDOW_HEIGHT = 64;

function getMainWindowDisplay() {
  if (mainWindow !== null) {
    const winBounds = mainWindow.getBounds();
    return screen.getDisplayNearestPoint({
      x: winBounds.x + winBounds.width / 2,
      y: winBounds.y + winBounds.height / 2,
    });
  }
  return screen.getPrimaryDisplay();
}

// Based on https://github.com/electron/electron/issues/526
function getPreviousWindowState(): Electron.Rectangle & { isMaximized?: boolean } {
  const options: Electron.Rectangle & { isMaximized?: boolean } = {
    x: 0,
    y: 0,
    width: MIN_WINDOW_WIDTH,
    height: MIN_WINDOW_HEIGHT,
  };
  try {
    const state = fse.readJSONSync(windowStateFilePath);
    state.x = Number(state.x);
    state.y = Number(state.y);
    state.width = Number(state.width);
    state.height = Number(state.height);
    state.isMaximized = Boolean(state.isMaximized);

    const area = screen.getDisplayMatching(state).workArea;
    // If the saved position still valid (the window is entirely inside the display area), use it.
    if (
      state.x >= area.x &&
      state.y >= area.y &&
      state.x + state.width <= area.x + area.width &&
      state.y + state.height <= area.y + area.height
    ) {
      options.x = state.x;
      options.y = state.y;
    }
    // If the saved size is still valid, use it.
    if (state.width <= area.width || state.height <= area.height) {
      options.width = state.width;
      options.height = state.height;
    }
    options.isMaximized = state.isMaximized;
  } catch (e) {
    console.error('Could not read window state file!', e);
    // Fallback to primary display screen size
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    options.width = width;
    options.height = height;
  }
  return options;
}

// Save window position and bounds: https://github.com/electron/electron/issues/526
let saveBoundsTimeout: ReturnType<typeof setTimeout> | null = null;
function saveWindowState() {
  if (saveBoundsTimeout) clearTimeout(saveBoundsTimeout);
  saveBoundsTimeout = setTimeout(() => {
    saveBoundsTimeout = null;
    if (mainWindow !== null) {
      const state = Object.assign(
        { isMaximized: mainWindow.isMaximized() },
        mainWindow.getNormalBounds(),
      );
      fse.writeFileSync(windowStateFilePath, JSON.stringify(state, null, 2));
    }
  }, 1000);
}

function forceRelaunch() {
  app.relaunch();
  app.exit();
}

function getVersion(): string {
  if (isDev()) {
    // Weird quirk: it returns the Electron version in dev mode
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../package.json').version;
  } else {
    return app.getVersion();
  }
}

/** Returns whether main window is open - so whether files can be immediately imported */
async function importExternalImage(item: IImportItem): Promise<boolean> {
  if (mainWindow !== null) {
    MainMessenger.sendImportExternalImage(mainWindow.webContents, { item });
    return true;
  }
  return false;
}

async function addTagsToFile(item: IImportItem): Promise<boolean> {
  if (mainWindow !== null) {
    MainMessenger.sendAddTagsToFile(mainWindow.webContents, { item });
    return true;
  }
  return false;
}

async function getTags(): Promise<ITag[]> {
  if (mainWindow !== null) {
    const { tags } = await MainMessenger.getTags(mainWindow.webContents);
    return tags.filter((t) => t.id !== ROOT_TAG_ID);
  }
  return [];
}
