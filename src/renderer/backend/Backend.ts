
import { IFile } from '../entities/File';
import { ID } from '../entities/ID';
import { ITag, Tag } from '../entities/Tag';
import { dbConfig } from './config';
import DBRepository, { dbInit } from "./DBRepository";

/**
 * The backend of the application serves as an API, even though it runs on the same machine.
 * This helps code organization by enforcing a clear seperation between backend/frontend logic.
 * Whenever we want to change things in the backend, this should have no consequences in the frontend.
 * The backend has access to the database, which is exposed to the frontend through a set of endpoints.
 */
export default class Backend {
  private fileRepository: DBRepository<IFile>;
  private tagRepository: DBRepository<ITag>;

  async init() {
    // Initialize database tables
    await dbInit(dbConfig);

    this.fileRepository = new DBRepository("files");
    this.tagRepository = new DBRepository("tags");

    // Here we could start indexing, or checking for changed files
  }

  async fetchTags(): Promise<ITag[]> {
    console.log('Backend: Fetching tags...');
    return await this.tagRepository.getAll();
  }
  async createTag(id: ID, name: string, description?: string) {
    console.log('Backend: Creating tag...', id, name, description);
    return await this.tagRepository.create(new Tag(id, name, description));
  }
  async saveTag(tag: ITag): Promise<ITag> {
    console.log('Backend: Saving tag...', tag);
    return await this.tagRepository.update(tag);
  }
  async removeTag(tag: ITag) {
    console.log('Removing tag...', tag);
    await this.tagRepository.remove(tag.id);
  }
}
