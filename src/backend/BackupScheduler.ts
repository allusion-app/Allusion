import fse from 'fs-extra';
import path from 'path';
import { debounce } from 'src/frontend/utils';

import Backend from './Backend';
import { NUM_AUTO_BACKUPS, AUTO_BACKUP_TIMEOUT, INSTANT_BACKUP_FILENAME } from './config';

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

export default class BackupScheduler {
  private backupDirectory: string = '';

  private lastBackupIndex: number = 0;
  private lastBackupDate: Date = new Date(0);

  private isInstantBackupEnabled?: boolean;

  private debouncedCreatePeriodicBackup: () => Promise<void>;
  private debouncedCreateInstantBackup: () => Promise<void>;

  constructor(private backend: Backend) {
    // Wait 10 seconds after a change for any other changes before creating a backup
    this.debouncedCreatePeriodicBackup = debounce(this.createPeriodicBackup, 10000).bind(this);

    // When running the application as a portable executable, save the state immediately
    // after any change is made, so it can always be recovered on startup,
    // even when running on a different device
    // (needed since IndexedDB is stored in AppData: not relative to the exectuable)
    // Saving it after any change has been made, waiting 3 seconds until no changes have been made
    this.debouncedCreateInstantBackup = debounce(this.createInstantBackup, 3000).bind(this);
  }

  async initialize(backupDirectory: string, instantBackups: boolean): Promise<void> {
    this.isInstantBackupEnabled = instantBackups;
    this.backupDirectory = backupDirectory;
    await fse.ensureDir(this.backupDirectory);
  }

  /** Creates a copy of a backup file, when the target file creation date is less than the provided date */
  private static async copyFileIfCreatedBeforeDate(
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

  private async createPeriodicBackup() {
    const filePath = path.join(this.backupDirectory, `auto-backup-${this.lastBackupIndex}.json`);

    this.lastBackupDate = new Date();
    this.lastBackupIndex = (this.lastBackupIndex + 1) % NUM_AUTO_BACKUPS;

    try {
      await this.backend.backupDatabaseToFile(filePath);
      console.log('Created automatic backup', filePath);

      // Check for daily backup
      await BackupScheduler.copyFileIfCreatedBeforeDate(
        filePath,
        path.join(this.backupDirectory, 'daily.json'),
        getToday(),
      );

      // Check for weekly backup
      await BackupScheduler.copyFileIfCreatedBeforeDate(
        filePath,
        path.join(this.backupDirectory, 'weekly.json'),
        getWeekStart(),
      );
    } catch (e) {
      console.error('Could not create periodic backup', filePath, e);
    }
  }

  private async createInstantBackup() {
    const filePath = path.join(this.backupDirectory, INSTANT_BACKUP_FILENAME);

    try {
      await this.backend.backupDatabaseToFile(filePath);
      console.log('Created instant backup', filePath);
    } catch (e) {
      console.error('Could not create instant backup', filePath, e);
    }
  }

  notifyChange(): void {
    if (new Date().getTime() > this.lastBackupDate.getTime() + AUTO_BACKUP_TIMEOUT) {
      this.debouncedCreatePeriodicBackup();
    }
    if (this.isInstantBackupEnabled) {
      this.debouncedCreateInstantBackup();
    }
  }
}
