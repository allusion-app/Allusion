/**
 * The data storage backup system and scheduler.
 */
export interface DataBackup {
  schedule(): void;
  backupToFile(path: string): Promise<void>;
  restoreFromFile(path: string): Promise<void>;
  peekFile(path: string): Promise<[numTags: number, numFiles: number]>;
}
