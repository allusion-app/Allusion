import { app, BrowserWindow, Menu, Tray } from 'electron';
import SysPath from 'path';
import fse from 'fs-extra';
import os from 'os';

import AppIcon from '../renderer/resources/logo/favicon_512x512.png';
import { isDev } from '../config';
import { setupServer } from './clipServer';

let mainWindow: BrowserWindow | null;
let tray: Tray | null;

let runInBackground = true;

function createWindow() {
  const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  // Create the browser window.
  mainWindow = new BrowserWindow({
    // Todo: This setting looks nice on osx, but overlaps with native toolbar buttons
    // Fixed it by adding a margin-top to the body and giving html background color so it blends in
    // But new issue arissed in fullscreen than
    // titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
    },
    height,
    width,

    // fullscreen: true,
    icon: `${__dirname}/${AppIcon}`,
    // Should be same as body background: Only for split second before css is loaded
    backgroundColor: '#181818',
  });

  // Create our menu entries so that we can use MAC shortcuts
  const template = [
    // Mac App menu - used for styling so shortcuts work
    ...(process.platform === 'darwin' ? [
      {
        label: 'File', submenu: [
          { role: 'about' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { role: 'quit' },
        ],
      }] : []),
      {
        label: 'Edit', submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'delete' },
          { role: 'selectall' },
        ],
      },
      {
        label: 'View', submenu: [
          { role: 'reload' },
          { role: 'toggleFullScreen' },
          { role: 'toggleDevTools' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

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
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (!runInBackground) {
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

async function importExternalImage(filename: string, tags: string[], imgBase64: string) {
  const downloadDir = SysPath.join(os.homedir(), 'Allusion'); // todo: configurable by user
  const downloadPath = SysPath.join(downloadDir, filename); // todo: sanitize filename

  console.log('writing to', downloadPath);

  // Todo: Check not to overwrite existing files
  try {
    const rawData = imgBase64.substr(imgBase64.indexOf(',') + 1); // remove base64 header
    await fse.mkdirs(downloadDir);
    await fse.writeFile(downloadPath, rawData, 'base64');

    if (mainWindow) {
      mainWindow.webContents.send('importExternalImage', downloadPath);
    }

  } catch (e) {
    console.error(e);
  }

  console.log('done');

  // Todo: notify renderer
  // Some foundation for communication was already made in the preview-window branch
}

async function getTags() {
  // Todo: fetch tags from frontend
  return ['banana', 'apple'];
}

// Todo: Only launch server when user agrees. Else it will show a popup on startup requesting network access
setupServer(importExternalImage, getTags);
