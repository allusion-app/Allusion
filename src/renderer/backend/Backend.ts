import { DbFile, IFile } from '../entities/File';
import { ID } from '../entities/ID';
import { DbTag, ITag } from '../entities/Tag';
import { dbConfig } from './config';
import DBRepository, { dbInit } from './DBRepository';
import { ITagCollection, DbTagCollection, ROOT_TAG_COLLECTION_ID } from '../entities/TagCollection';

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

  constructor() {
    this.fileRepository = new DBRepository('files');
    this.tagRepository = new DBRepository('tags');
    this.tagCollectionRepository = new DBRepository('tagCollections');
  }

  async init() {
    // Initialize database tables
    await dbInit(dbConfig);

    // Create a root 'Hierarchy' collection if it does not exist
    const colCount = await this.tagCollectionRepository.count('id');
    if (colCount === 0) {
      await this.createTagCollection(ROOT_TAG_COLLECTION_ID, 'Hierarchy');
    }

    // Here we could start indexing, or checking for changed files
  }

  async fetchTags(): Promise<ITag[]> {
    console.log('Backend: Fetching tags...');
    return await this.tagRepository.getAll();
  }

  async fetchTagCollections(): Promise<ITagCollection[]> {
    console.log('Backend: Fetching tags collections...');
    return await this.tagCollectionRepository.getAll();
  }

  async fetchFiles(): Promise<IFile[]> {
    console.log('Backend: Fetching files...');
    return await this.fileRepository.getAll();
  }

  async searchFiles(tags: ID[]): Promise<IFile[]> {
    console.log('Backend: Searching files...', tags);
    return await this.fileRepository.find('tags', tags);
  }

  async createTag(id: ID, name: string, description?: string) {
    console.log('Backend: Creating tag...', id, name, description);
    return await this.tagRepository.create(new DbTag(id, name, description));
  }

  async createTagCollection(id: ID, name: string, description?: string) {
    console.log('Backend: Creating tag collection...', id, name, description);
    return this.tagCollectionRepository.create(new DbTagCollection(id, name, description));
  }

  async createFile(id: ID, path: string, tags?: ID[]) {
    console.log('Backend: Creating file...', id, path);
    return await this.fileRepository.create(new DbFile(id, path, tags));
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
    const filesWithTag = await this.fileRepository.find('tags', tag.id);
    // Remove tag from files
    filesWithTag.forEach((file) => file.tags.splice(file.tags.indexOf(tag.id)));
    // Update files in db
    await Promise.all(
      filesWithTag.map((file) => this.fileRepository.update(file)),
    );
    // Remove tag from db
    await this.tagRepository.remove(tag);
  }

  async removeTagCollection(tagCollection: ITagCollection) {
    console.log('Removing tag collection...', tagCollection);
    // Get all sub collections
    const subCollections = await Promise.all(tagCollection.subCollections.map(
      (col) => this.tagCollectionRepository.get(col)));
    // Remove subcollections
    await Promise.all(subCollections.map((col) => this.removeTagCollection(col)));
    // Get all tags
    const tags = await Promise.all(tagCollection.tags.map((tag) => this.tagRepository.get(tag)));
    // Remove tags properly
    // Todo: Should we really delete all tags in this collection, or e.g. transfer them to a 'main' tag collection?
    await Promise.all(tags.map((tag) => this.removeTag(tag)));
    // Remove tag collection itself from db
    await this.tagCollectionRepository.remove(tagCollection);
  }

  async removeFile(file: IFile) {
    console.log('Removing file...', file);
    await this.fileRepository.remove(file);
  }
}
