import { IFile } from '../entities/File';
import { ID } from '../entities/ID';
import { ITag } from '../entities/Tag';
import { dbConfig, DB_NAME } from './config';
import DBRepository, { dbInit, dbDelete, FileOrder } from './DBRepository';
import { ITagCollection, ROOT_TAG_COLLECTION_ID } from '../entities/TagCollection';
import { ILocation } from '../entities/Location';
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
  private tagCollectionRepository: DBRepository<ITagCollection>;
  private locationRepository: DBRepository<ILocation>;

  constructor() {
    // Initialize database tables
    const db = dbInit(dbConfig, DB_NAME);
    this.fileRepository = new DBRepository('files', db);
    this.tagRepository = new DBRepository('tags', db);
    this.tagCollectionRepository = new DBRepository('tagCollections', db);
    this.locationRepository = new DBRepository('locations', db);
  }

  async init(): Promise<void> {
    // Create a root 'Hierarchy' collection if it does not exist
    const colCount = await this.tagCollectionRepository.count();
    if (colCount === 0) {
      await this.createTagCollection({
        id: ROOT_TAG_COLLECTION_ID,
        name: 'Hierarchy',
        description: '',
        dateAdded: new Date(),
        subCollections: [],
        tags: [],
        color: '',
      });
    }
  }

  async fetchTags(): Promise<ITag[]> {
    console.log('Backend: Fetching tags...');
    return this.tagRepository.getAll({});
  }

  async fetchTagCollections(): Promise<ITagCollection[]> {
    console.log('Backend: Fetching tags collections...');
    return this.tagCollectionRepository.getAll({});
  }

  async fetchFiles(order: keyof IFile, fileOrder: FileOrder): Promise<IFile[]> {
    console.log('Backend: Fetching files...');
    return this.fileRepository.getAll({ order, fileOrder });
  }

  async fetchFilesByID(ids: ID[]): Promise<IFile[]> {
    console.log('Backend: Fetching files by ID...');
    const files = await Promise.all(ids.map((id) => this.fileRepository.get(id)));
    return files.filter((f) => f !== undefined) as IFile[];
  }

  async searchFiles(
    criteria: SearchCriteria<IFile> | [SearchCriteria<IFile>],
    order: keyof IFile,
    fileOrder: FileOrder,
    matchAny?: boolean,
  ): Promise<IFile[]> {
    console.log('Backend: Searching files...', criteria, { matchAny });
    return this.fileRepository.find({ criteria, order, fileOrder, matchAny });
  }

  async createTag(tag: ITag): Promise<ITag> {
    console.log('Backend: Creating tag...', tag);
    return await this.tagRepository.create(tag);
  }

  async createTagCollection(collection: ITagCollection): Promise<ITagCollection> {
    console.log('Backend: Creating tag collection...', collection);
    return this.tagCollectionRepository.create(collection);
  }

  async createFile(file: IFile): Promise<IFile> {
    console.log('Backend: Creating file...', file);
    return await this.fileRepository.create(file);
  }

  async saveTag(tag: ITag): Promise<ITag> {
    console.log('Backend: Saving tag...', tag);
    return await this.tagRepository.update(tag);
  }

  async saveTagCollection(tagCollection: ITagCollection): Promise<ITagCollection> {
    console.log('Backend: Saving tag collection...', tagCollection);
    return await this.tagCollectionRepository.update(tagCollection);
  }

  async saveFile(file: IFile): Promise<IFile> {
    console.log('Backend: Saving file...', file);
    return await this.fileRepository.update(file);
  }

  async removeTag(tag: ITag): Promise<void> {
    console.log('Removing tag...', tag);
    // We have to make sure files tagged with this tag should be untagged
    // Get all files with this tag
    const filesWithTag = await this.fileRepository.find({
      criteria: { key: 'tags', value: tag.id, operator: 'contains', valueType: 'array' },
    });
    // Remove tag from files
    filesWithTag.forEach((file) => file.tags.splice(file.tags.indexOf(tag.id)));
    // Update files in db
    await this.fileRepository.updateMany(filesWithTag);
    // Remove tag from db
    await this.tagRepository.remove(tag);
  }

  async removeTagCollection(tagCollection: ITagCollection): Promise<void> {
    console.log('Removing tag collection...', tagCollection);
    // Get all sub collections
    const subCollections = await Promise.all(
      tagCollection.subCollections.map((col) => this.tagCollectionRepository.get(col)),
    );
    // Remove subcollections
    await Promise.all(subCollections.map((col) => col && this.removeTagCollection(col)));
    // Get all tags
    const tags = await Promise.all(tagCollection.tags.map((tag) => this.tagRepository.get(tag)));
    // Remove tags properly
    await Promise.all(tags.map((tag) => tag && this.removeTag(tag)));
    // Remove tag collection itself from db
    await this.tagCollectionRepository.remove(tagCollection);
  }

  async removeFile(file: IFile): Promise<void> {
    console.log('Removing file...', file);
    await this.fileRepository.remove(file);
  }

  async removeFiles(files: IFile[]): Promise<void> {
    console.log('Removing files...', files);
    await this.fileRepository.removeMany(files);
  }

  async getNumUntaggedFiles(): Promise<number> {
    console.log('Get number of untagged files...');
    return this.fileRepository.count({
      criteria: { key: 'tags', value: [], valueType: 'array', operator: 'contains' },
    });
  }

  async getWatchedDirectories(order: keyof ILocation, fileOrder: FileOrder): Promise<ILocation[]> {
    console.log('Backend: Getting watched directories...');
    return this.locationRepository.getAll({ order, fileOrder });
  }

  async createLocation(dir: ILocation): Promise<ILocation> {
    console.log('Backend: Creating watched directory...');
    return this.locationRepository.create(dir);
  }

  async saveLocation(dir: ILocation): Promise<ILocation> {
    console.log('Backend: Saving watched directory...', dir);
    return await this.locationRepository.update(dir);
  }

  async removeLocation(dir: ILocation): Promise<void> {
    console.log('Backend: Removing watched directory...');
    return this.locationRepository.remove(dir);
  }

  // Creates many files at once, and checks for duplicates in the path they are in
  async createFilesFromPath(path: string, files: IFile[]): Promise<IFile[]> {
    console.log('Backend: Creating files...', path, files);
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
    console.log('Clearing database...');
    return dbDelete(DB_NAME);
  }
}
