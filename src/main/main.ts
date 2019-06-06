import { app, BrowserWindow, Menu } from 'electron';
import SysPath from 'path';
import fse from 'fs-extra';

import AppIcon from '../renderer/resources/logo/favicon_512x512.png';
import { isDev } from '../config';
import { setupServer } from './clipServer';

let mainWindow: BrowserWindow | null;

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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// Todo: Only launch when user presses a button. Else it will show a popup on startup
setupServer(
  async (filename: string, tags: string[], imgBase64: string) => {
    const downloadDir = SysPath.join(__dirname, '..', 'download');
    const downloadPath = SysPath.join(downloadDir, filename); // todo: sanitize filename

    console.log('writing to', downloadPath);

    // Todo: Check not to overwrite existing files
    try {
      const rawData = imgBase64.substr(imgBase64.indexOf(',') + 1); // remove base64 header
      await fse.mkdirs(downloadDir);
      await fse.writeFile(downloadPath, rawData, 'base64');
    } catch (e) {
      console.error(e);
    }

    console.log('done');

    // Todo: notify renderer
    // Some foundation for communication was already made in the preview-window branch
  },
  async () => ['banana', 'apple'],
);
