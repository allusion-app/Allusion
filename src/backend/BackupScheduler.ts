import fse from 'fs-extra';
import path from 'path';
import { debounce } from 'src/frontend/utils';

import Backend from './Backend';
import { NUM_AUTO_BACKUPS, AUTO_BACKUP_TIMEOUT } from './config';

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
  private lastBackupIndex: number = 0;
  private lastBackupDate: Date = new Date(0);
  private backupDirectory: string = '';

  private debouncedCreatePeriodicBackup: () => Promise<void>;

  constructor(private backend: Backend) {
    // Wait 10 seconds after a change for any other changes before creating a backup
    this.debouncedCreatePeriodicBackup = debounce(this.createPeriodicBackup, 10000).bind(this);
  }

  async initialize(backupDirectory: string): Promise<void> {
    this.backupDirectory = backupDirectory;

    await fse.ensureDir(this.backupDirectory);

    await this.checkForLongTermBackups();
  }

  private async checkForLongTermBackups() {
    // TODO: this is not optimal. Could also re-use previous backups and rename them to 'daily' or 'weekly'

    // Check for daily backup
    await this.checkDateAndCreateBackup('daily.json', getToday());

    // Check for weekly backup
    await this.checkDateAndCreateBackup('weekly.json', getWeekStart());
  }

  /** Creates a backup if the file creation date is less than the provided date */
  private async checkDateAndCreateBackup(filename: string, dateToCheck: Date): Promise<void> {
    const filePath = path.join(this.backupDirectory, filename);
    let createBackup = false;
    try {
      const stats = await fse.stat(filePath);
      createBackup = stats.ctime < dateToCheck;
    } catch (e) {
      // File not found
      createBackup = true;
    }
    if (createBackup) {
      try {
        await this.backend.backupDatabaseToFile(filePath);
        console.log('Created backup', filename);
      } catch (e) {
        console.error('Could not create backup', filename, e);
      }
    }
  }

  private async createPeriodicBackup() {
    const filePath = path.join(this.backupDirectory, `auto-backup-${this.lastBackupIndex}.json`);
    this.backend
      .backupDatabaseToFile(filePath)
      .then(() => console.log('Created automatic backup', filePath))
      .catch(console.error);
    this.lastBackupDate = new Date();
    this.lastBackupIndex = (this.lastBackupIndex + 1) % NUM_AUTO_BACKUPS;
  }

  notifyChange(): void {
    if (new Date().getTime() > this.lastBackupDate.getTime() + AUTO_BACKUP_TIMEOUT) {
      this.debouncedCreatePeriodicBackup();
    }
  }
}
