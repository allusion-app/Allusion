import { app, BrowserWindow, Menu, Tray, ipcMain, IpcMessageEvent, screen } from 'electron';

import AppIcon from '../renderer/resources/logo/favicon_512x512.png';
import { isDev } from '../config';
import ClipServer, { IImportItem } from './clipServer';
import { ITag } from '../renderer/entities/Tag';

let mainWindow: BrowserWindow | null;
let previewWindow: BrowserWindow | null;
let tray: Tray | null;
let clipServer: ClipServer | null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  // Create the browser window.
  mainWindow = new BrowserWindow({
    // Todo: This setting looks nice on osx, but overlaps with native toolbar buttons
    // Fixed it by adding a margin-top to the body and giving html background color so it blends in
    // But new issue arissed in fullscreen than
    // titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
    },
    width,
    height,
    icon: `${__dirname}/${AppIcon}`,
    // Should be same as body background: Only for split second before css is loaded
    backgroundColor: '#181818',
    title: 'Allusion - Your Visual Library',
  });

  // Create our menu entries so that we can use MAC shortcuts
  const menuBar: Electron.MenuItemConstructorOptions[] = [];

  // Mac App menu - used for styling so shortcuts work
  if (process.platform === 'darwin') {
    menuBar.push({ role: 'appMenu' });
  }

  menuBar.push({
    label: 'Edit',
    submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }],
  });
  menuBar.push({
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      {
        label: 'Actual Size',
        accelerator: 'CommandOrControl+0',
        click: (_, browserWindow) => {
          browserWindow.webContents.setZoomFactor(1);
        },
      },
      {
        label: 'Zoom In',
        // TODO: Fix by using custom solution...
        accelerator: 'CommandOrControl+=',
        click: (_, browserWindow) => {
          browserWindow.webContents.setZoomFactor(browserWindow.webContents.getZoomFactor() + 0.1);
        },
      },
      {
        label: 'Zoom Out',
        accelerator: 'CommandOrControl+-',
        click: (_, browserWindow) => {
          browserWindow.webContents.setZoomFactor(browserWindow.webContents.getZoomFactor() - 0.1);
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
          browserWindow.webContents.sendInputEvent({
            type: 'keyDown',
            isTrusted: true,
            // @ts-ignore
            keyCode: '?',
          });
        },
      },
    ],
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuBar));

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
  });

  // System tray icon: For when the app can run in the background
  // Useful for browser extension, so it will work even when the window is closed
  if (!tray) {
    tray = new Tray(`${__dirname}/${AppIcon}`);
    const trayMenu = Menu.buildFromTemplate([
      { label: 'Open', type: 'normal', click: () => mainWindow ? mainWindow.focus() : createWindow() },
      { label: 'Exit', type: 'normal', click: app.quit },
    ]);
    tray.setContextMenu(trayMenu);
    tray.setToolTip('Allusion - Your Visual Library');
    tray.on('click', () => mainWindow ? mainWindow.focus() : createWindow());
  }

  if (!clipServer) {
    clipServer = new ClipServer(importExternalImage, addTagsToFile, getTags);
  }
  // Import images that were added while the window was closed
  ipcMain.once('initialized', async () => {
    if (clipServer) {
      const importItems = await clipServer.getImportQueue();
      await Promise.all(importItems.map(importExternalImage));
      clipServer.clearImportQueue();
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

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

// Messaging ///////////////////////////////
////////////////////////////////////////////
ipcMain.on('setDownloadPath', (event: IpcMessageEvent, path: string) => {
  if (clipServer) {
    clipServer.setDownloadPath(path);
  }
});

ipcMain.on('setClipServerEnabled', (event: IpcMessageEvent, isEnabled: boolean) => {
  if (clipServer) {
    clipServer.setEnabled(isEnabled);
  }
});
ipcMain.on('isClipServerRunning', (event: IpcMessageEvent) => {
  if (clipServer) {
    event.returnValue = clipServer.isEnabled();
  } else {
    event.returnValue = false;
  }
});

ipcMain.on('setDownloadPath', (event: IpcMessageEvent, path: string) => {
  if (clipServer) {
    clipServer.setDownloadPath(path);
  }
});
ipcMain.on('getDownloadPath', (event: IpcMessageEvent) => {
  if (clipServer) {
    event.returnValue = clipServer.getDownloadPath();
  }
});

ipcMain.on('setRunningInBackground', (event: IpcMessageEvent, isEnabled: boolean) => {
  if (clipServer) {
    clipServer.setRunInBackground(isEnabled);
  }
});
ipcMain.on('isRunningInBackground', (event: IpcMessageEvent) => {
  event.returnValue = clipServer && clipServer.isRunInBackgroundEnabled();
});

async function importExternalImage(item: IImportItem) {
  if (mainWindow) {
    mainWindow.webContents.send('importExternalImage', item);
    return true;
  }
  return false;
}

async function addTagsToFile(item: IImportItem) {
  if (mainWindow) {
    mainWindow.webContents.send('addTagsToFile', item);
    return true;
  }
  return false;
}

async function getTags(): Promise<ITag[]> {
  if (mainWindow) {
    mainWindow.webContents.send('getTags');
    return new Promise((resolve) => {
      ipcMain.once('receiveTags', (tags: ITag[]) => resolve(tags));
    });
  }
  // Todo: cache tags from frontend in case the window is closed
  return [];
}
function createPreviewWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  previewWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
    },
    minWidth: 224,
    minHeight: 224,
    width: Math.round(width * 2 / 3),
    height: Math.round(height * 2 / 3),
    icon: `${__dirname}/${AppIcon}`,
    // Should be same as body background: Only for split second before css is loaded
    backgroundColor: '#181818',
    title: 'Allusion Quick View',
  });
  previewWindow.setMenuBarVisibility(false);
  previewWindow.loadURL(`file://${__dirname}/index.html?preview=true`);
  previewWindow.on('closed', () => {
    previewWindow = null;
    if (mainWindow) {
      mainWindow.webContents.send('closedPreviewWindow');
    }
  });
  return previewWindow;
}

ipcMain.on('sendPreviewFiles', (event: any, fileIds: string[]) => {
  // Create preview window if needed, and send the files selected in the primary window
  if (!previewWindow) {
    previewWindow = createPreviewWindow();
    ipcMain.once('initialized', () => {
      if (previewWindow) {
        previewWindow.webContents.send('receivePreviewFiles', fileIds);
      }
    });
  } else {
    previewWindow.webContents.send('receivePreviewFiles', fileIds);
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
