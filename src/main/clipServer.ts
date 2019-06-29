import http, { Server } from 'http';
import path from 'path';
import os from 'os';
import fse from 'fs-extra';

import { SERVER_PORT } from '../config';
import { app } from 'electron';

// Contains a single preferences JSON object
const preferencesFilePath = path.join(app.getPath('userData'), 'clipPreferences.json');
// Contains a IImportItem JSON object per line
const importQueueFilePath = path.join(app.getPath('userData'), 'importQueue.txt');

export interface IImportItem {
  filePath: string;
  tags: string[];
  dateAdded: Date;
}

/** A class that hosts the clip server that browser extensions can connect to */
class ClipServer {
  private preferences = {
    isEnabled: false,
    downloadPath: path.join(os.homedir(), 'Allusion'),
  };

  private server: Server | null = null;
  private importImage: (item: IImportItem) => Promise<boolean>;
  private requestTags: () => Promise<string[]>;

  constructor(
    importImage: (item: IImportItem) => Promise<boolean>,
    requestTags: () => Promise<string[]>,
  ) {
    this.importImage = importImage;
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
        // A POST request will contain an image and some metadata
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          try {
            const { filename, url, imgBase64 } = JSON.parse(body);
            console.log('Received file', url);

            // Todo: Check not to overwrite existing files - downloaded images can often have the same name (image.jpg, download.jpg, etc.)
            // Todo: sanitize filename: Some symbols from URLs might not be supported on the filesystem (depends on OS)
            const downloadPath = path.join(this.preferences.downloadPath, filename);

            await this.downloadImage(downloadPath, imgBase64);

            const item: IImportItem = {
              filePath: downloadPath,
              tags: [],
              dateAdded: new Date(),
            };

            const isImported = await this.importImage(item);
            if (!isImported) {
              await this.enqueue(item);
            }

            res.end({ message: 'OK!' });
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
