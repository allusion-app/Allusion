import { app, BrowserWindow, Menu, nativeImage, nativeTheme, screen, Tray } from 'electron';
import { autoUpdater } from 'electron-updater';
import AppIcon from '../../resources/logo/allusion-logomark-fc-512x512.png';
import TrayIcon from '../../resources/logo/allusion-logomark-fc-256x256.png';
import TrayIconMac from '../../resources/logo/allusion-logomark-white@2x.png';
import { isDev } from '../config';
import { MainMessenger } from '../Messaging';
import { ITag } from '../renderer/entities/Tag';
import ClipServer, { IImportItem } from './clipServer';

let mainWindow: BrowserWindow | null;
let previewWindow: BrowserWindow | null;
let tray: Tray | null;
let clipServer: ClipServer | null;

const isMac = process.platform === 'darwin';

const importExternalImage = async (item: IImportItem) => {
  if (mainWindow) {
    MainMessenger.sendImportExternalImage(mainWindow.webContents, { item });
    return true;
  }
  return false;
};

const addTagsToFile = async (item: IImportItem) => {
  if (mainWindow) {
    MainMessenger.sendAddTagsToFile(mainWindow.webContents, { item });
    return true;
  }
  return false;
};

const getTags = async (): Promise<ITag[]> => {
  if (mainWindow) {
    const { tags } = await MainMessenger.getTags(mainWindow.webContents);
    return tags;
  }
  // Todo: cache tags from frontend in case the window is closed
  return [];
};

let initialize = () => {
  console.error('Placeholder function. App was not properly initialized!');
};

function createTrayMenu() {
  if (!tray) {
    tray = new Tray(`${__dirname}/${isMac ? TrayIconMac : TrayIcon}`);
    const trayMenu = Menu.buildFromTemplate([
      {
        label: 'Open',
        type: 'normal',
        click: () => mainWindow?.focus() ?? initialize(),
      },
      {
        label: 'Quit',
        click: () => process.exit(0),
      },
    ]);
    tray.setContextMenu(trayMenu);
    tray.setToolTip('Allusion - Your Visual Library');
    tray.on('click', () => mainWindow?.focus() ?? initialize());
  }
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  // Create the browser window.
  mainWindow = new BrowserWindow({
    // Todo: This setting looks nice on osx, but overlaps with native toolbar buttons
    // Fixed it by adding a margin-top to the body and giving html background color so it blends in
    // But new issue arissed in fullscreen than
    titleBarStyle: 'hiddenInset',
    frame: !isMac,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      // window.open should open a normal window like in a browser, not an electron BrowserWindowProxy
      nativeWindowOpen: true,
      nodeIntegrationInSubFrames: true,
    },
    width,
    height,
    icon: `${__dirname}/${AppIcon}`,
    // Should be same as body background: Only for split second before css is loaded
    backgroundColor: '#14181a',
    title: 'Allusion',
    show: false,
  });
  mainWindow.on('ready-to-show', () => mainWindow?.show());

  // Customize new window opening
  // https://www.electronjs.org/docs/api/window-open
  mainWindow.webContents.on(
    'new-window',
    (event, url, frameName, disposition, options, additionalFeatures) => {
      if (frameName === 'settings') {
        event.preventDefault();
        // https://www.electronjs.org/docs/api/browser-window#class-browserwindow
        const additionalOptions: Electron.BrowserWindowConstructorOptions = {
          modal: true,
          parent: mainWindow!,
          width: 600,
          height: 570,
          title: 'Settings • Allusion',
          resizable: false,
        };
        Object.assign(options, additionalOptions);
        const settingsWindow = new BrowserWindow(options);
        settingsWindow.center(); // the "center" option doesn't work :/
        settingsWindow.setMenu(null); // no toolbar needed
        (event as any).newGuest = settingsWindow;
      }
    },
  );

  let menu = null;

  // Mac App menu - used for styling so shortcuts work
  // https://livebook.manning.com/book/cross-platform-desktop-applications/chapter-9/78
  if (isMac || isDev()) {
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
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: 'CommandOrControl+0',
          click: (_, browserWindow) => {
            browserWindow!.webContents.zoomFactor = 1;
          },
        },
        {
          label: 'Zoom In',
          // TODO: Fix by using custom solution...
          accelerator: 'CommandOrControl+=',
          click: (_, browserWindow) => {
            browserWindow!.webContents.zoomFactor += 0.1;
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'CommandOrControl+-',
          click: (_, browserWindow) => {
            browserWindow!.webContents.zoomFactor -= 0.1;
          },
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    });

    menuBar.push({
      label: 'Help',
      submenu: [
        {
          label: 'Show Keyboard Shortcuts',
          accelerator: 'CommandOrControl+K',
          click: (_, browserWindow) => {
            browserWindow!.webContents.sendInputEvent({
              type: 'keyDown',
              isTrusted: true,
              keyCode: '?',
            } as any);
          },
        },
      ],
    });

    menu = Menu.buildFromTemplate(menuBar);
  }
  Menu.setApplicationMenu(menu);

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // then maximize the window
  mainWindow.maximize();

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
    if (previewWindow) {
      previewWindow.close();
    }
  });

  if (!clipServer) {
    clipServer = new ClipServer(importExternalImage, addTagsToFile, getTags);
  }

  // System tray icon: Always show on Mac, or other platforms when the app is running in the background
  // Useful for browser extension, so it will work even when the window is closed
  if (isMac || clipServer.isRunInBackgroundEnabled()) {
    createTrayMenu();
  }

  // Import images that were added while the window was closed
  MainMessenger.onceInitialized().then(async () => {
    clipServer!.setDownloadPath((await MainMessenger.getDownloadPath(mainWindow!.webContents)).dir);
    const importItems = await clipServer!.getImportQueue();
    await Promise.all(importItems.map(importExternalImage));
    clipServer!.clearImportQueue();
  });
}

function createPreviewWindow() {
  // Get display where main window is located
  let display = screen.getPrimaryDisplay();
  if (mainWindow) {
    const winBounds = mainWindow.getBounds();
    display = screen.getDisplayNearestPoint({ x: winBounds.x, y: winBounds.y });
  }

  previewWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
    },
    minWidth: 224,
    minHeight: 224,
    height: (display.size.height * 3) / 4, // preview window is is sized relative to screen resolution by default
    width: (display.size.width * 3) / 4,
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
    if (mainWindow) {
      e.preventDefault();
      MainMessenger.sendClosedPreviewWindow(mainWindow.webContents);
      mainWindow.focus();
    }
    if (previewWindow) {
      previewWindow.hide();
    }
  });
  return previewWindow;
}

initialize = () => {
  createWindow();
  createPreviewWindow();

  autoUpdater.checkForUpdatesAndNotify();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', initialize);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (!(clipServer && clipServer.isRunInBackgroundEnabled())) {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// Messaging: Sending and receiving messages between the main and renderer process //
/////////////////////////////////////////////////////////////////////////////////////
MainMessenger.onSetDownloadPath(({ dir }) => clipServer!.setDownloadPath(dir));
MainMessenger.onIsClipServerRunning(() => clipServer!.isEnabled());
MainMessenger.onIsRunningInBackground(() => clipServer!.isRunInBackgroundEnabled());

MainMessenger.onSetDownloadPath(({ dir }) => clipServer!.setDownloadPath(dir));
MainMessenger.onSetClipServerEnabled(({ isClipServerRunning }) =>
  clipServer!.setEnabled(isClipServerRunning),
);
MainMessenger.onSetRunningInBackground(({ isRunInBackground }) => {
  clipServer!.setRunInBackground(isRunInBackground);
  if (isRunInBackground) {
    createTrayMenu();
  } else if (tray) {
    tray.destroy();
    tray = null;
  }
});

MainMessenger.onStoreFile(({ filenameWithExt, imgBase64 }) =>
  clipServer!.storeImageWithoutImport(filenameWithExt, imgBase64),
);

// Forward files from the main window to the preview window
MainMessenger.onSendPreviewFiles((msg) => {
  // Create preview window if needed, and send the files selected in the primary window
  if (!previewWindow || previewWindow.isDestroyed()) {
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

// TODO: Should set this on startup: E.g. Choosing light theme, but having a dark system theme, will be incorrect after restart
MainMessenger.onSetTheme((msg) => (nativeTheme.themeSource = msg.theme));

MainMessenger.onDragExport(({ absolutePaths }) => {
  if (!mainWindow) return;
  if (absolutePaths.length > 0) {
    mainWindow.webContents.startDrag({
      files: absolutePaths,
      // Just show the first image as a thumbnail for now
      // TODO: Show some indication that multiple images are dragged, would be cool to show a stack of the first few of them
      // also, this will show really big icons for narrow images, should take into account their aspect ratio
      icon: nativeImage.createFromPath(absolutePaths[0]).resize({ width: 200 }) || AppIcon,
    } as any); // need to "any" this since the types are not correct: the files field is allowed but not according to TypeScript
  }
});

MainMessenger.onGetUserPicturesPath();
