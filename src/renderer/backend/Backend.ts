import { DbFile, IFile } from '../entities/File';
import { ID } from '../entities/ID';
import { DbTag, ITag } from '../entities/Tag';
import { dbConfig, DB_NAME } from './config';
import DBRepository, { dbInit, dbDelete } from './DBRepository';
import { ITagCollection, DbTagCollection, ROOT_TAG_COLLECTION_ID } from '../entities/TagCollection';
import { IWatchedDirectory } from '../entities/WatchedDirectory';

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
  private watchedDirectoryRepository: DBRepository<IWatchedDirectory>;

  constructor() {
    // Initialize database tables
    const db = dbInit(dbConfig, DB_NAME);
    this.fileRepository = new DBRepository('files', db);
    this.tagRepository = new DBRepository('tags', db);
    this.tagCollectionRepository = new DBRepository('tagCollections', db);
    this.watchedDirectoryRepository = new DBRepository('watchedDirectories', db);
  }

  async init() {
    // Create a root 'Hierarchy' collection if it does not exist
    const colCount = await this.tagCollectionRepository.count();
    if (colCount === 0) {
      await this.createTagCollection(ROOT_TAG_COLLECTION_ID, 'Hierarchy');
    }

    // Here we could start indexing, or checking for changed files
  }

  async fetchTags(): Promise<ITag[]> {
    console.log('Backend: Fetching tags...');
    return this.tagRepository.getAll({});
  }

  async fetchTagCollections(): Promise<ITagCollection[]> {
    console.log('Backend: Fetching tags collections...');
    return this.tagCollectionRepository.getAll({});
  }

  async fetchFiles(order: keyof IFile, descending: boolean): Promise<IFile[]> {
    console.log('Backend: Fetching files...');
    return this.fileRepository.getAll({ order, descending });
  }

  async fetchFilesByID(ids: ID[]): Promise<IFile[]> {
    console.log('Backend: Fetching files by ID...');
    const files = await Promise.all(ids.map((id) => this.fileRepository.get(id)));
    return files.filter((f) => f !== undefined) as IFile[];
  }

  async searchFiles(tags: ID[], order: keyof IFile, descending: boolean): Promise<IFile[]> {
    console.log('Backend: Searching files...', tags);
    return this.fileRepository.find({ queryField: 'tags', query: tags, order, descending });
  }

  async createTag(id: ID, name: string, description?: string) {
    console.log('Backend: Creating tag...', id, name, description);
    return await this.tagRepository.create(new DbTag(id, name, description));
  }

  async createTagCollection(id: ID, name: string, description?: string) {
    console.log('Backend: Creating tag collection...', id, name, description);
    return this.tagCollectionRepository.create(new DbTagCollection(id, name, description));
  }

  async createFile(file: IFile) {
    console.log('Backend: Creating file...', file);
    return await this.fileRepository.create(new DbFile(file));
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

  async removeTag(tag: ITag) {
    console.log('Removing tag...', tag);
    // We have to make sure files tagged with this tag should be untagged
    // Get all files with this tag
    const filesWithTag = await this.fileRepository.find({ queryField: 'tags', query: tag.id });
    // Remove tag from files
    filesWithTag.forEach((file) => file.tags.splice(file.tags.indexOf(tag.id)));
    // Update files in db
    await this.fileRepository.updateMany(filesWithTag);
    // Remove tag from db
    await this.tagRepository.remove(tag);
  }

  async removeTagCollection(tagCollection: ITagCollection) {
    console.log('Removing tag collection...', tagCollection);
    // Get all sub collections
    const subCollections = await Promise.all(
      tagCollection.subCollections.map((col) => this.tagCollectionRepository.get(col)));
    // Remove subcollections
    await Promise.all(subCollections.map((col) => col && this.removeTagCollection(col)));
    // Get all tags
    const tags = await Promise.all(tagCollection.tags.map((tag) => this.tagRepository.get(tag)));
    // Remove tags properly
    await Promise.all(tags.map((tag) => tag && this.removeTag(tag)));
    // Remove tag collection itself from db
    await this.tagCollectionRepository.remove(tagCollection);
  }

  async removeFile(file: IFile) {
    console.log('Removing file...', file);
    await this.fileRepository.remove(file);
  }

  async removeFiles(files: IFile[]) {
    console.log('Removing files...', files);
    await this.fileRepository.removeMany(files);
  }

  async getNumUntaggedFiles() {
    console.log('Get number of untagged files...');
    return this.fileRepository.count({ queryField: 'tags', query: [] });
  }

  async getWatchedDirectories(order: keyof IWatchedDirectory, descending: boolean) {
    console.log('Backend: Getting watched directories...');
    return this.watchedDirectoryRepository.getAll({ order, descending });
  }

  async createWatchedDirectory(dir: IWatchedDirectory) {
    console.log('Backend: Creating watched directory...');
    return this.watchedDirectoryRepository.create(dir);
  }

  async saveWatchedDirectory(dir: IWatchedDirectory) {
    console.log('Backend: Saving watched directory...', dir);
    return await this.watchedDirectoryRepository.update(dir);
  }

  async removeWatchedDirectory(dir: IWatchedDirectory) {
    console.log('Backend: Removing watched directory...');
    return this.watchedDirectoryRepository.remove(dir);
  }

  // Creates many files at once, and checks for duplicates in the path they are in
  async createFilesFromPath(path: string, files: IFile[]) {
    console.log('Backend: Creating files...', path, files);
    // Todo: Search for file paths that start with 'path'
    // const query: IStringSearchCriteria = {

    // }
    // this.fileRepository.find({ })
    const existingFilesInPath: IFile[] = [];
    const newFiles = files.filter((file) => existingFilesInPath.some((f) => f.path === file.path));
    return this.fileRepository.createMany(newFiles);
  }

  async clearDatabase() {
    console.log('Clearing database...');
    return dbDelete(DB_NAME);
  }
}
