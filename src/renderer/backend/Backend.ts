import { IFile } from '../entities/File';
import { ID } from '../entities/ID';
import { ITag, ROOT_TAG_ID } from '../entities/Tag';
import { dbConfig, DB_NAME } from './config';
import DBRepository, { dbInit, dbDelete, FileOrder } from './DBRepository';
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
  private locationRepository: DBRepository<ILocation>;

  constructor() {
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
        description: '',
        dateAdded: new Date(),
        subTags: [],
        color: '',
      });
    }
  }

  async fetchTags(): Promise<ITag[]> {
    console.log('Backend: Fetching tags...');
    return this.tagRepository.getAll({});
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

  async createFile(file: IFile): Promise<IFile> {
    console.log('Backend: Creating file...', file);
    return await this.fileRepository.create(file);
  }

  async saveTag(tag: ITag): Promise<ITag> {
    console.log('Backend: Saving tag...', tag);
    return await this.tagRepository.update(tag);
  }

  async saveFile(file: IFile): Promise<IFile> {
    console.log('Backend: Saving file...', file);
    return await this.fileRepository.update(file);
  }

  async removeTag(tag: ID): Promise<void> {
    console.log('Removing tag...', tag);
    // We have to make sure files tagged with this tag should be untagged
    // Get all files with this tag
    const filesWithTag = await this.fileRepository.find({
      criteria: { key: 'tags', value: tag, operator: 'contains', valueType: 'array' },
    });
    // Remove tag from files
    filesWithTag.forEach((file) => file.tags.splice(file.tags.indexOf(tag)));
    // Update files in db
    await this.fileRepository.updateMany(filesWithTag);
    // Remove tag from db
    return this.tagRepository.remove(tag);
  }

  // async removeFile(file: ID): Promise<void> {
  //   console.log('Removing file...', file);
  //   return this.fileRepository.remove(file);
  // }

  async removeFiles(files: ID[]): Promise<void> {
    console.log('Removing files...', files);
    return this.fileRepository.removeMany(files);
  }

  async countFiles(
    criteria: SearchCriteria<IFile> | [SearchCriteria<IFile>],
    matchAny?: boolean,
  ): Promise<number> {
    console.log('Get number of files...', criteria, matchAny);
    return this.fileRepository.count({
      criteria,
      matchAny,
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

  async removeLocation(dir: ID): Promise<void> {
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
