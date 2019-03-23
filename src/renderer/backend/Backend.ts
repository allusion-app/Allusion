import { DbFile, IFile } from '../entities/File';
import { ID } from '../entities/ID';
import { DbTag, ITag } from '../entities/Tag';
import { dbConfig } from './config';
import DBRepository, { dbInit } from './DBRepository';

/**
 * The backend of the application serves as an API, even though it runs on the same machine.
 * This helps code organization by enforcing a clear seperation between backend/frontend logic.
 * Whenever we want to change things in the backend, this should have no consequences in the frontend.
 * The backend has access to the database, which is exposed to the frontend through a set of endpoints.
 */
export default class Backend {
  private fileRepository: DBRepository<IFile>;
  private tagRepository: DBRepository<ITag>;

  constructor() {
    this.fileRepository = new DBRepository('files');
    this.tagRepository = new DBRepository('tags');
  }

  async init() {
    // Initialize database tables
    await dbInit(dbConfig);

    // Here we could start indexing, or checking for changed files
  }

  async fetchTags(): Promise<ITag[]> {
    console.log('Backend: Fetching tags...');
    return await this.tagRepository.getAll();
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

  async createFile(id: ID, path: string, tags?: ID[]) {
    console.log('Backend: Creating file...', id, path);
    return await this.fileRepository.create(new DbFile(id, path, tags));
  }

  async saveTag(tag: ITag): Promise<ITag> {
    console.log('Backend: Saving tag...', tag);
    return await this.tagRepository.update(tag);
  }

  async saveFile(file: IFile): Promise<IFile> {
    console.log('Backend: Saving file...', file);
    return await this.fileRepository.update(file);
  }

  async findFilesBy(
    property: keyof IFile,
    query: any,
    count?: number,
  ): Promise<IFile[]> {
    console.log(`Searching files by ${property}...`);
    return await this.fileRepository.find(property, query, count);
  }

  async findFilesByTag(tag: ITag): Promise<IFile[]> {
    console.log(`Searching files by tag ${tag.name}...`);
    return await this.findFilesBy('tags', tag.id);
  }

  async removeTag(tag: ITag) {
    console.log('Removing tag...', tag);
    // Get all files with this tag
    const filesWithTag = await this.findFilesByTag(tag);
    // Remove tag from files
    filesWithTag.forEach((file) => file.tags.splice(file.tags.indexOf(tag.id)));
    // Update files in db
    await Promise.all(
      filesWithTag.map((file) => this.fileRepository.update(file)),
    );
    // Remove tag from db
    await this.tagRepository.remove(tag);
  }

  async removeFile(file: IFile) {
    console.log('Removing file...', file);
    await this.fileRepository.remove(file);
  }
}
