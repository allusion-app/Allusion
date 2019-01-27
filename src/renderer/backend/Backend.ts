import { IFile } from '../classes/File';
import { ITag } from '../classes/Tag';
import { dbConfig } from './config';
import DBRepository, { dbInit } from "./DBRepository";

/**
 * The backend of the application serves as an API, even though it runs on the same machine.
 * This helps code organization by enforcing a clear seperation between backend/frontend logic.
 * Whenever we want to change things in the backend, this should have no consequences in the frontend.
 * The backend has access to the database, which is exposed to the frontend through a set of endpoints.
 */
class Backend {
  private fileRepository: DBRepository<IFile>;
  private tagRepository: DBRepository<ITag>;

  async init() {
    // Initialize database tables
    await dbInit(dbConfig);

    // Here we could start indexing, or checking for changed files
  }
}

// Create and export a single instance of the Backend.
// Could be changed later for (unit) testing purposes.
const instance = new Backend();

export default instance;
