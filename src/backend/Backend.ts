import { exportDB, importDB, peakImportFile } from 'dexie-export-import';
import Dexie, { IndexableType } from 'dexie';
import fse from 'fs-extra';
import { RendererMessenger } from 'src/Messaging';
import { IFileSearchItem } from 'src/entities/SearchItem';
import { IFile } from '../entities/File';
import { ID } from '../entities/ID';
import { ILocation } from '../entities/Location';
import { IStringSearchCriteria, SearchCriteria } from '../entities/SearchCriteria';
import { ITag, ROOT_TAG_ID } from '../entities/Tag';
import BackupScheduler from './BackupScheduler';
import { dbConfig, DB_NAME } from './config';
import DBRepository, { dbDelete, dbInit, OrderDirection, SearchOrder } from './DBRepository';

export type FileOrder = SearchOrder<IFile>;

/**
 * The backend of the application serves as an API, even though it runs on the same machine.
 * This helps code organization by enforcing a clear seperation between backend/frontend logic.
 * Whenever we want to change things in the backend, this should have no consequences in the frontend.
 * The backend has access to the database, which is exposed to the frontend through a set of endpoints.
 */
export default class Backend {
  private fileRepository: DBRepository<IFile>;
  private tagRepository: DBRepository<ITag>;
  private locationRepository: DBRepository<ILocation>;
  private searchRepository: DBRepository<IFileSearchItem>;
  private db: Dexie;
  private backupScheduler: BackupScheduler;

  constructor() {
    console.info(`Initializing database "${DB_NAME}"...`);
    // Initialize database tables
    this.db = dbInit(dbConfig, DB_NAME);
    this.fileRepository = new DBRepository('files', this.db);
    this.tagRepository = new DBRepository('tags', this.db);
    this.locationRepository = new DBRepository('locations', this.db);
    this.searchRepository = new DBRepository('searches', this.db);
    this.backupScheduler = new BackupScheduler(this);
  }

  public static async connect(): Promise<Backend> {
    const backend = new Backend();
    // Create a root tag if it does not exist
    const tagCount = await backend.tagRepository.count();
    if (tagCount === 0) {
      await backend.createTag({
        id: ROOT_TAG_ID,
        name: 'Root',
        dateAdded: new Date(),
        subTags: [],
        color: '',
        isHidden: false,
      });
    }

    try {
      await backend.backupScheduler.initialize(await RendererMessenger.getDefaultBackupDirectory());
    } catch (e) {
      console.error('Could not initialize backup scheduler', e);
    }

    return backend;
  }

  async fetchTags(): Promise<ITag[]> {
    console.info('Backend: Fetching tags...');
    return this.tagRepository.getAll({});
  }

  async fetchFiles(order: FileOrder, fileOrder: OrderDirection): Promise<IFile[]> {
    console.info('Backend: Fetching files...');
    return this.fileRepository.getAll({ order, orderDirection: fileOrder });
  }

  async fetchFilesByID(ids: ID[]): Promise<IFile[]> {
    console.info('Backend: Fetching files by ID...');
    const files = await this.fileRepository.getByIds(ids);
    return files.filter((f) => f !== undefined) as IFile[];
  }

  async fetchFilesByKey(key: keyof IFile, value: IndexableType): Promise<IFile[]> {
    console.info('Backend: Fetching files by key/value...', { key, value });
    const files = await this.fileRepository.getByKey(key, value);
    return files;
  }

  async fetchLocations(order: keyof ILocation, fileOrder: OrderDirection): Promise<ILocation[]> {
    console.info('Backend: Fetching locations...');
    return this.locationRepository.getAll({ order, orderDirection: fileOrder });
  }

  async fetchSearches(): Promise<IFileSearchItem[]> {
    console.info('Backend: Fetching searches...');
    return this.searchRepository.getAll({});
  }

  async searchFiles(
    criteria: SearchCriteria<IFile> | [SearchCriteria<IFile>],
    order: FileOrder,
    fileOrder: OrderDirection,
    matchAny?: boolean,
  ): Promise<IFile[]> {
    console.info('Backend: Searching files...', criteria, { matchAny });
    return this.fileRepository.find({ criteria, order, orderDirection: fileOrder, matchAny });
  }

  async createTag(tag: ITag): Promise<ITag> {
    console.info('Backend: Creating tag...', tag);
    this.backupScheduler.notifyChange();
    return this.tagRepository.create(tag);
  }

  async createFile(file: IFile): Promise<IFile> {
    console.info('Backend: Creating file...', file);
    return this.fileRepository.create(file);
  }

  async createLocation(location: ILocation): Promise<ILocation> {
    console.info('Backend: Create location...', location);
    this.backupScheduler.notifyChange();
    return this.locationRepository.create(location);
  }

  async createSearch(search: IFileSearchItem): Promise<IFileSearchItem> {
    console.info('Backend: Create search...', search);
    this.backupScheduler.notifyChange();
    return this.searchRepository.create(search);
  }

  async saveTag(tag: ITag): Promise<ITag> {
    console.info('Backend: Saving tag...', tag);
    this.backupScheduler.notifyChange();
    return this.tagRepository.update(tag);
  }

  async saveFile(file: IFile): Promise<IFile> {
    console.info('Backend: Saving file...', file);
    this.backupScheduler.notifyChange();
    return this.fileRepository.update(file);
  }

  async saveFiles(files: IFile[]): Promise<IFile[]> {
    console.info('Backend: Saving files...', files);
    this.backupScheduler.notifyChange();
    return this.fileRepository.updateMany(files);
  }

  async saveLocation(location: ILocation): Promise<ILocation> {
    console.info('Backend: Saving location...', location);
    this.backupScheduler.notifyChange();
    return this.locationRepository.update(location);
  }

  async saveSearch(search: IFileSearchItem): Promise<IFileSearchItem> {
    console.info('Backend: Saving search...', search);
    this.backupScheduler.notifyChange();
    return this.searchRepository.update(search);
  }

  async removeTag(tag: ID): Promise<void> {
    console.info('Backend: Removing tag...', tag);
    // We have to make sure files tagged with this tag should be untagged
    // Get all files with this tag
    const filesWithTag = await this.fileRepository.find({
      criteria: { key: 'tags', value: tag, operator: 'contains', valueType: 'array' },
    });
    // Remove tag from files
    for (const file of filesWithTag) {
      file.tags.splice(file.tags.indexOf(tag), 1);
    }
    // Update files in db
    await this.saveFiles(filesWithTag);
    // Remove tag from db
    this.backupScheduler.notifyChange();
    return this.tagRepository.remove(tag);
  }

  async removeTags(tags: ID[]): Promise<void> {
    console.info('Backend: Removing tags...', tags);
    // We have to make sure files tagged with these tags should be untagged
    // Get all files with these tags
    const filesWithTags = await this.fileRepository.find({
      criteria: { key: 'tags', value: tags, operator: 'contains', valueType: 'array' },
    });
    const deletedTags = new Set(tags);
    // Remove tags from files
    for (const file of filesWithTags) {
      file.tags = file.tags.filter((t) => !deletedTags.has(t));
    }
    // Update files in db
    await this.saveFiles(filesWithTags);
    // Remove tag from db
    this.backupScheduler.notifyChange();
    return this.tagRepository.removeMany(tags);
  }

  async mergeTags(tagToBeRemoved: ID, tagToMergeWith: ID): Promise<void> {
    console.info('Merging tags', tagToBeRemoved, tagToMergeWith);
    // Replace tag on all files with the tag to be removed
    const filesWithTags = await this.fileRepository.find({
      criteria: { key: 'tags', value: [tagToBeRemoved], operator: 'contains', valueType: 'array' },
    });
    for (const file of filesWithTags) {
      // Might contain duplicates if the tag to be merged with was already on the file, so array -> set -> array to remove dupes
      file.tags = Array.from(
        new Set(file.tags.map((t) => (t === tagToBeRemoved ? tagToMergeWith : t))),
      );
    }
    // Update files in db
    await this.saveFiles(filesWithTags);
    // Remove tag from DB
    this.backupScheduler.notifyChange();
    await this.tagRepository.remove(tagToBeRemoved);
  }

  async removeFiles(files: ID[]): Promise<void> {
    console.info('Backend: Removing files...', files);
    this.backupScheduler.notifyChange();
    return this.fileRepository.removeMany(files);
  }

  async removeLocation(location: ID): Promise<void> {
    console.info('Backend: Remove location...', location);
    const filesWithLocation = await this.fileRepository.find({
      criteria: { key: 'locationId', value: location, operator: 'equals', valueType: 'string' },
    });
    await this.removeFiles(filesWithLocation.map((f) => f.id));
    this.backupScheduler.notifyChange();
    return this.locationRepository.remove(location);
  }

  async removeSearch(search: IFileSearchItem): Promise<void> {
    console.info('Backend: Removing search...', search);
    this.backupScheduler.notifyChange();
    return this.searchRepository.remove(search.id);
  }

  async countFiles(
    criteria?: SearchCriteria<IFile> | [SearchCriteria<IFile>],
    matchAny?: boolean,
  ): Promise<number> {
    console.info('Get number of files...', criteria, matchAny);
    return this.fileRepository.count(
      criteria
        ? {
            criteria,
            matchAny,
          }
        : undefined,
    );
  }

  // Creates many files at once, and checks for duplicates in the path they are in
  async createFilesFromPath(path: string, files: IFile[]): Promise<IFile[]> {
    console.info('Backend: Creating files...', path, files);
    // Search for file paths that start with 'path', so those can be filtered out
    const criteria: IStringSearchCriteria<IFile> = {
      valueType: 'string',
      operator: 'startsWith',
      key: 'absolutePath',
      value: path,
    };
    const existingFilesInPath: IFile[] = await this.fileRepository.find({ criteria });
    console.debug('Filtering files...');
    const newFiles = files.filter((file) =>
      existingFilesInPath.every((f) => f.absolutePath !== file.absolutePath),
    );
    console.debug('Creating files...');
    const res = await this.fileRepository.createMany(newFiles);
    console.debug('Done!');
    return res;
  }

  async clearDatabase(): Promise<void> {
    return dbDelete(DB_NAME);
  }

  async backupDatabaseToFile(path: string): Promise<void> {
    const blob = await exportDB(this.db, { prettyJson: false });
    // might be nice to zip it and encode as base64 to save space. Keeping it simple for now
    await fse.ensureFile(path);
    await fse.writeFile(path, await blob.text());
  }

  async restoreDatabaseFromFile(path: string): Promise<void> {
    const buffer = await fse.readFile(path);
    const blob = new Blob([buffer]);
    await this.clearDatabase();
    console.log('Importing database backup', path);
    await importDB(blob);
    // There also is "importInto" which as an "clearTablesBeforeImport" option,
    // but that didn't seem to work correctly (files were always re-created after restarting for some reason)
  }

  async peekDatabaseFile(path: string): Promise<{ numTags: number; numFiles: number }> {
    const buffer = await fse.readFile(path);
    const blob = new Blob([buffer]);
    const metadata = await peakImportFile(blob); // heh, they made a typo
    const tagsTable = metadata.data.tables.find((t) => t.name === 'tags');
    const filesTable = metadata.data.tables.find((t) => t.name === 'files');
    if (tagsTable && filesTable) {
      return {
        numTags: tagsTable.rowCount,
        numFiles: filesTable.rowCount,
      };
    }
    throw new Error('Database does not contain a table for files and/or tags');
  }
}
