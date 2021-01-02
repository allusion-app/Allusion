import DBRepository, { dbInit, dbDelete, FileOrder } from './DBRepository';
import { dbConfig, DB_NAME } from './config';

import { ID } from '../entities/ID';
import { IFile } from '../entities/File';
import { ILocation } from '../entities/Location';
import { ITag, ROOT_TAG_ID } from '../entities/Tag';
import { SearchCriteria, IStringSearchCriteria } from '../entities/SearchCriteria';

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

  constructor() {
    console.info(`Initializing database "${DB_NAME}"...`);
    // Initialize database tables
    const db = dbInit(dbConfig, DB_NAME);
    this.fileRepository = new DBRepository('files', db);
    this.tagRepository = new DBRepository('tags', db);
    this.locationRepository = new DBRepository('locations', db);
  }

  async init(): Promise<void> {
    // Create a root tag if it does not exist
    const tagCount = await this.tagRepository.count();
    if (tagCount === 0) {
      await this.createTag({
        id: ROOT_TAG_ID,
        name: 'Root',
        dateAdded: new Date(),
        subTags: [],
        color: '',
      });
    }
  }

  async fetchTags(): Promise<ITag[]> {
    console.info('Backend: Fetching tags...');
    return this.tagRepository.getAll({});
  }

  async fetchFiles(order: keyof IFile, fileOrder: FileOrder): Promise<IFile[]> {
    console.info('Backend: Fetching files...');
    return this.fileRepository.getAll({ order, fileOrder });
  }

  async fetchFilesByID(ids: ID[]): Promise<IFile[]> {
    console.info('Backend: Fetching files by ID...');
    const files = await this.fileRepository.getByIds(ids);
    return files.filter((f) => f !== undefined) as IFile[];
  }

  async fetchLocations(order: keyof ILocation, fileOrder: FileOrder): Promise<ILocation[]> {
    console.info('Backend: Fetching locations...');
    return this.locationRepository.getAll({ order, fileOrder });
  }

  async searchFiles(
    criteria: SearchCriteria<IFile> | [SearchCriteria<IFile>],
    order: keyof IFile,
    fileOrder: FileOrder,
    matchAny?: boolean,
  ): Promise<IFile[]> {
    console.info('Backend: Searching files...', criteria, { matchAny });
    return this.fileRepository.find({ criteria, order, fileOrder, matchAny });
  }

  async createTag(tag: ITag): Promise<ITag> {
    console.info('Backend: Creating tag...', tag);
    return this.tagRepository.create(tag);
  }

  async createFile(file: IFile): Promise<IFile> {
    console.info('Backend: Creating file...', file);
    return this.fileRepository.create(file);
  }

  async createLocation(location: ILocation): Promise<ILocation> {
    console.info('Backend: Create location...', location);
    return this.locationRepository.create(location);
  }

  async saveTag(tag: ITag): Promise<ITag> {
    console.info('Backend: Saving tag...', tag);
    return this.tagRepository.update(tag);
  }

  async saveFile(file: IFile): Promise<IFile> {
    console.info('Backend: Saving file...', file);
    return this.fileRepository.update(file);
  }

  async saveFiles(files: IFile[]): Promise<IFile[]> {
    console.info('Backend: Saving files...', files);
    return this.fileRepository.updateMany(files);
  }

  async saveLocation(location: ILocation): Promise<ILocation> {
    console.info('Backend: Saving location...', location);
    return this.locationRepository.update(location);
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
      file.tags.splice(file.tags.indexOf(tag));
    }
    // Update files in db
    await this.saveFiles(filesWithTag);
    // Remove tag from db
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
      file.tags = file.tags.filter((t) => deletedTags.has(t));
    }
    // Update files in db
    await this.saveFiles(filesWithTags);
    // Remove tag from db
    return this.tagRepository.removeMany(tags);
  }

  async removeFiles(files: ID[]): Promise<void> {
    console.info('Backend: Removing files...', files);
    return this.fileRepository.removeMany(files);
  }

  async removeLocation(location: ID): Promise<void> {
    console.info('Backend: Remove location...', location);
    const filesWithLocation = await this.fileRepository.find({
      criteria: { key: 'locationId', value: location, operator: 'equals', valueType: 'string' },
    });
    await this.removeFiles(filesWithLocation.map((f) => f.id));
    return this.locationRepository.remove(location);
  }

  async countFiles(
    criteria: SearchCriteria<IFile> | [SearchCriteria<IFile>],
    matchAny?: boolean,
  ): Promise<number> {
    console.info('Get number of files...', criteria, matchAny);
    return this.fileRepository.count({
      criteria,
      matchAny,
    });
  }

  // Creates many files at once, and checks for duplicates in the path they are in
  async createFilesFromPath(path: string, files: IFile[]): Promise<IFile[]> {
    console.info('Backend: Creating files...', path, files);
    // Search for file paths that start with 'path', so those can be filtered out
    const criteria: IStringSearchCriteria<IFile> = {
      valueType: 'string',
      operator: 'contains', // Fixme: should be startWith, but doesn't work for some reason :/ 'path' is not an index for 'files' collection?!
      key: 'absolutePath',
      value: path,
    };
    const existingFilesInPath: IFile[] = await this.fileRepository.find({ criteria });
    const newFiles = files.filter((file) =>
      existingFilesInPath.every((f) => f.absolutePath !== file.absolutePath),
    );
    return this.fileRepository.createMany(newFiles);
  }

  async clearDatabase(): Promise<void> {
    console.info('Clearing database...');
    return dbDelete(DB_NAME);
  }
}
