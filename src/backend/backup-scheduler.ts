import Dexie from 'dexie';
import { exportDB, importDB, peakImportFile } from 'dexie-export-import';
import fse from 'fs-extra';
import path from 'path';

import { debounce } from 'common/timeout';
import { NUM_AUTO_BACKUPS, AUTO_BACKUP_TIMEOUT } from './config';
import { dbDelete } from './db-repository';
import { DataBackup } from 'src/api/data-backup';

/** Returns the date at 00:00 today */
function getToday(): Date {
  const today = new Date();
  today.setHours(0);
  today.setMinutes(0);
  today.setSeconds(0, 0);
  return today;
}

/** Returns the date at the start of the current week (Sunday at 00:00) */
function getWeekStart(): Date {
  const date = getToday();
  const dayOfWeek = date.getDay();
  date.setDate(date.getDate() - dayOfWeek);
  return date;
}

export default class BackupScheduler implements DataBackup {
  #db: Dexie;
  #backupDirectory: string = '';
  #lastBackupIndex: number = 0;
  #lastBackupDate: Date = new Date(0);

  constructor(db: Dexie, directory: string) {
    this.#db = db;
    this.#backupDirectory = directory;
  }

  static async init(db: Dexie, backupDirectory: string): Promise<BackupScheduler> {
    await fse.ensureDir(backupDirectory);
    return new BackupScheduler(db, backupDirectory);
  }

  schedule(): void {
    if (new Date().getTime() > this.#lastBackupDate.getTime() + AUTO_BACKUP_TIMEOUT) {
      this.#createPeriodicBackup();
    }
  }

  /** Creates a copy of a backup file, when the target file creation date is less than the provided date */
  static async #copyFileIfCreatedBeforeDate(
    srcPath: string,
    targetPath: string,
    dateToCheck: Date,
  ): Promise<boolean> {
    let createBackup = false;
    try {
      // If file creation date is less than provided date, create a back-up
      const stats = await fse.stat(targetPath);
      createBackup = stats.ctime < dateToCheck;
    } catch (e) {
      // File not found
      createBackup = true;
    }
    if (createBackup) {
      try {
        await fse.copyFile(srcPath, targetPath);
        console.log('Created backup', targetPath);
        return true;
      } catch (e) {
        console.error('Could not create backup', targetPath, e);
      }
    }
    return false;
  }

  // Wait 10 seconds after a change for any other changes before creating a backup.
  #createPeriodicBackup = debounce(async (): Promise<void> => {
    const filePath = path.join(this.#backupDirectory, `auto-backup-${this.#lastBackupIndex}.json`);

    this.#lastBackupDate = new Date();
    this.#lastBackupIndex = (this.#lastBackupIndex + 1) % NUM_AUTO_BACKUPS;

    try {
      await this.backupToFile(filePath);

      console.log('Created automatic backup', filePath);

      // Check for daily backup
      await BackupScheduler.#copyFileIfCreatedBeforeDate(
        filePath,
        path.join(this.#backupDirectory, 'daily.json'),
        getToday(),
      );

      // Check for weekly backup
      await BackupScheduler.#copyFileIfCreatedBeforeDate(
        filePath,
        path.join(this.#backupDirectory, 'weekly.json'),
        getWeekStart(),
      );
    } catch (e) {
      console.error('Could not create periodic backup', filePath, e);
    }
  }, 10000);

  async backupToFile(path: string): Promise<void> {
    console.info('IndexedDB: Exporting database backup...', path);

    const blob = await exportDB(this.#db, { prettyJson: false });
    // might be nice to zip it and encode as base64 to save space. Keeping it simple for now
    await fse.ensureFile(path);
    await fse.writeFile(path, await blob.text());
  }

  async restoreFromFile(path: string): Promise<void> {
    console.info('IndexedDB: Importing database backup...', path);

    const buffer = await fse.readFile(path);
    const blob = new Blob([buffer]);

    console.debug('Clearing database...');
    dbDelete(this.#db.name);

    await importDB(blob);
    // There also is "importInto" which as an "clearTablesBeforeImport" option,
    // but that didn't seem to work correctly (files were always re-created after restarting for some reason)
  }

  async peekFile(path: string): Promise<[numTags: number, numFiles: number]> {
    console.info('IndexedDB: Peeking database backup...', path);
    const buffer = await fse.readFile(path);
    const blob = new Blob([buffer]);
    const metadata = await peakImportFile(blob); // heh, they made a typo
    const tagsTable = metadata.data.tables.find((t) => t.name === 'tags');
    const filesTable = metadata.data.tables.find((t) => t.name === 'files');
    if (tagsTable && filesTable) {
      return [tagsTable.rowCount, filesTable.rowCount];
    }
    throw new Error('Database does not contain a table for files and/or tags');
  }
}
