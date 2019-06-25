import { app, BrowserWindow, ipcMain, Menu } from 'electron';

import AppIcon from '../renderer/resources/logo/favicon_512x512.png';
import { isDev } from '../config';

let mainWindow: BrowserWindow | null;
let previewWindow: BrowserWindow | null;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    // Todo: This setting looks nice on osx, but overlaps with native toolbar buttons
    // Fixed it by adding a margin-top to the body and giving html background color so it blends in
    // But new issue arissed in fullscreen than
    // titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
    },
    minWidth: 275,
    minHeight: 275,
    height: 640,
    width: 960,
    // fullscreen: true,
    icon: `${__dirname}/${AppIcon}`,
    // Should be same as body background: Only for split second before css is loaded
    backgroundColor: '#181818',
    title: 'Allusion - Your Visual Library',
  });

  // Create our menu entries so that we can use MAC shortcuts
  const menuBar: Electron.MenuItemConstructorOptions[] = [];

  // Mac App menu - used for styling so shortcuts work
  if (process.platform === 'darwin') {
    menuBar.push({
      label: 'File',
      submenu: [
        { role: 'about' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { role: 'quit' },
      ],
    });
  }
  menuBar.push({
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'delete' },
      { role: 'selectall' },
    ],
  });
  menuBar.push({
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'togglefullscreen' },
      { role: 'toggledevtools' },
    ],
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuBar));

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
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
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

function createPreviewWindow() {
  previewWindow = new BrowserWindow({
    minWidth: 224,
    minHeight: 224,
    height: 640,
    width: 960,
    // fullscreen: true,
    icon: `${__dirname}/${AppIcon}`,
    // Should be same as body background: Only for split second before css is loaded
    backgroundColor: '#181818',
    title: 'Allusion Quick View',
    // Not usefull on OSX
    // alwaysOnTop: true, 
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
