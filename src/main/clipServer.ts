import http, { Server } from 'http';
import path from 'path';
import os from 'os';
import fse from 'fs-extra';

import { SERVER_PORT } from '../config';
import { app } from 'electron';
import { ITag } from '../renderer/entities/Tag';

// Contains a single preferences JSON object
const preferencesFilePath = path.join(app.getPath('userData'), 'clipPreferences.json');
// Contains a IImportItem JSON object per line
const importQueueFilePath = path.join(app.getPath('userData'), 'importQueue.txt');

export interface IImportItem {
  filePath: string;
  tagNames: string[];
  dateAdded: Date;
}

/** A class that hosts the clip server that browser extensions can connect to */
class ClipServer {

  /**
   * Sanitizes filename: Some symbols from URLs might not be supported on the filesystem (depends on OS)
   * Check not to overwrite existing files - downloaded images can often have the same name (image.jpg, download.jpg)
   */
  private static async createDownloadPath(directory: string, filename: string, noIncrement?: boolean) {
    // Sanitize (filter out weird symbols, emojis, etc.)
    const sanitzedFilename = filename.replace(/[^a-zA-Z0-9-_\.\(\)\- ]/g, '_');
    let filePath = path.join(directory, sanitzedFilename);

    const dotIndex = sanitzedFilename.lastIndexOf('.');
    const baseFilename = sanitzedFilename.substr(0, dotIndex);
    const ext = sanitzedFilename.substr(dotIndex + 1);

    function addCountToFilename(num: number) {
      return path.join(directory, `${baseFilename} ${num}.${ext}`);
    }

    // Check if already exists
    let count = 0;
    while (await fse.pathExists(filePath)) {
      count++;
      filePath = addCountToFilename(count);
    }

    // This will return the newest file with the same filename, by not incrementing after the last exiting file
    if (noIncrement) {
      if (count === 1) {
        filePath = path.join(directory, sanitzedFilename);
      } else {
        filePath = addCountToFilename(count - 1);
      }
    }

    return filePath;
  }

  private preferences = {
    isEnabled: false,
    downloadPath: path.join(os.homedir(), 'Allusion'),
    runInBackground: false,
  };

  private server: Server | null = null;
  private importImage: (item: IImportItem) => Promise<boolean>;
  private addTagsToFile: (item: IImportItem) => Promise<boolean>;
  private requestTags: () => Promise<ITag[]>;

  constructor(
    importImage: (item: IImportItem) => Promise<boolean>,
    addTagsToFile: (item: IImportItem) => Promise<boolean>,
    requestTags: () => Promise<ITag[]>,
  ) {
    this.importImage = importImage;
    this.addTagsToFile = addTagsToFile;
    this.requestTags = requestTags;

    if (fse.existsSync(preferencesFilePath)) {
      const existingPrefs =  fse.readJSONSync(preferencesFilePath);
      this.preferences = {
        ...this.preferences,
       ...existingPrefs,
      };
    }

    if (this.preferences.isEnabled) {
      this.startServer();
    }
  }

  setEnabled(isEnabled: boolean) {
    this.preferences.isEnabled = isEnabled;
    this.savePreferences();
    if (!isEnabled) {
      this.stopServer();
    } else if (!this.server) {
      this.startServer();
    }
  }

  isEnabled() {
    return this.preferences.isEnabled;
  }

  getDownloadPath() {
    return this.preferences.downloadPath;
  }

  setDownloadPath(downloadPath: string) {
    this.preferences.downloadPath = downloadPath;
    this.savePreferences();
  }

  setRunInBackground(isEnabled: boolean) {
    this.preferences.runInBackground = isEnabled;
    this.savePreferences();
  }

  isRunInBackgroundEnabled() {
    return this.preferences.runInBackground;
  }

  async getImportQueue(): Promise<IImportItem[]> {
    if (!(await fse.pathExists(importQueueFilePath))) {
      return [];
    }
    const fileContent = await fse.readFile(importQueueFilePath, 'utf8');
    const items = fileContent.trim().split('\n').map((line) => JSON.parse(line));
    return items;
  }

  async clearImportQueue(): Promise<void> {
    fse.remove(importQueueFilePath);
  }

  private startServer() {
    console.log('Running clip server...');
    this.server = http.createServer(async (req, res) => {
      if (req.method === 'POST') {
        // Parse the content of the POST request
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          try {
            // Check what kind of message has been sent
            if (req.url && req.url.endsWith('import-image')) {
              const { filename, imgBase64 } = JSON.parse(body);
              console.log('Received file', filename);

              const downloadPath = await ClipServer.createDownloadPath(this.preferences.downloadPath, filename);

              await this.downloadImage(downloadPath, imgBase64);

              const item: IImportItem = {
                filePath: downloadPath,
                tagNames: [],
                dateAdded: new Date(),
              };

              const isImported = await this.importImage(item);
              if (!isImported) {
                await this.enqueue(item);
              }

              res.end({ message: 'OK!' });
            } else if (req.url && req.url.endsWith('/set-tags')) {
              const { tagNames, filename } = JSON.parse(body);

              const downloadPath = await ClipServer.createDownloadPath(this.preferences.downloadPath, filename, true);

              const item: IImportItem = {
                filePath: downloadPath,
                tagNames,
                dateAdded: new Date(),
              };

              const isUpdated = await this.addTagsToFile(item);
              if (!isUpdated) {
                await this.replaceLastQueueItem(item);
              }
              res.end({ message: 'OK!' });
            }
          } catch (e) {
            res.end(JSON.stringify(e));
          }
        });
      } else if (req.method === 'GET') {
        if (req.url && req.url.endsWith('/tags')) {
          const tags = await this.requestTags();
          res.end(JSON.stringify(tags));
        }
      }
    }).listen(SERVER_PORT, 'localhost');
  }

  private stopServer() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  // When the window is not open, add the request to a queue so that it can get imported when the window opens
  private async enqueue(item: IImportItem) {
    await fse.appendFile(importQueueFilePath, `${JSON.stringify(item)}\n`);
  }

  private async replaceLastQueueItem(item: IImportItem) {
    const fileContent = await fse.readFile(importQueueFilePath, 'utf8');
    let lines = fileContent.split('\n');
    if (lines.length > 1) {
      lines[lines.length - 1] = `${JSON.stringify(item)}`;
    } else {
      lines = [`${JSON.stringify(item)}`, ''];
    }
    await fse.writeFile(importQueueFilePath, lines.join('\n'));
  }

  // private async getLastQueueItem(): Promise<IImportItem | undefined> {
  //   const fileContent = await fse.readFile(importQueueFilePath, 'utf8');
  //   const lines = fileContent.split('\n');
  //   if (lines.length > 1) {
  //     return JSON.parse(lines[lines.length - 1]);
  //   } else {
  //     return undefined;
  //   }
  // }

  private async downloadImage(downloadPath: string, imgBase64: string) {
    const rawData = imgBase64.substr(imgBase64.indexOf(',') + 1); // remove base64 header
    await fse.mkdirs(this.preferences.downloadPath);
    await fse.writeFile(downloadPath, rawData, 'base64');
  }

  private savePreferences() {
    fse.writeJSONSync(preferencesFilePath, this.preferences);
  }
}

export default ClipServer;
