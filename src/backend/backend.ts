import Dexie, { IndexableType } from 'dexie';

import { FileSearchDTO } from '../api/file-search';
import { FileDTO } from '../api/file';
import { ID } from '../api/id';
import { LocationDTO } from '../api/location';
import { ConditionDTO, OrderBy, OrderDirection } from '../api/data-storage-search';
import { TagDTO, ROOT_TAG_ID } from '../api/tag';
import DBRepository, { dbDelete } from './db-repository';
import { DataStorage } from '../api/data-storage';

/**
 * The backend of the application serves as an API, even though it runs on the same machine.
 * This helps code organization by enforcing a clear separation between backend/frontend logic.
 * Whenever we want to change things in the backend, this should have no consequences in the frontend.
 * The backend has access to the database, which is exposed to the frontend through a set of endpoints.
 */
export default class Backend implements DataStorage {
  #files: DBRepository<FileDTO>;
  #tags: DBRepository<TagDTO>;
  #locations: DBRepository<LocationDTO>;
  #searches: DBRepository<FileSearchDTO>;
  #db: Dexie;
  #notifyChange: () => void;

  constructor(db: Dexie, notifyChange: () => void) {
    console.info(`Initializing database "${db.name}"...`);
    // Initialize database tables
    this.#files = new DBRepository('files', db);
    this.#tags = new DBRepository('tags', db);
    this.#locations = new DBRepository('locations', db);
    this.#searches = new DBRepository('searches', db);
    this.#db = db;
    this.#notifyChange = notifyChange;
  }

  static async init(db: Dexie, notifyChange: () => void): Promise<Backend> {
    const backend = new Backend(db, notifyChange);
    // Create a root tag if it does not exist
    const tagCount = await backend.#tags.count();
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
    return backend;
  }

  async fetchTags(): Promise<TagDTO[]> {
    console.info('Backend: Fetching tags...');
    return this.#tags.getAll();
  }

  async fetchFiles(order: OrderBy<FileDTO>, fileOrder: OrderDirection): Promise<FileDTO[]> {
    console.info('Backend: Fetching files...');
    return this.#files.getAllOrdered(order, fileOrder);
  }

  async fetchFilesByID(ids: ID[]): Promise<FileDTO[]> {
    console.info('Backend: Fetching files by ID...');
    const files = await this.#files.getByIds(ids);
    return files.filter((f) => f !== undefined) as FileDTO[];
  }

  async fetchFilesByKey(key: keyof FileDTO, value: IndexableType): Promise<FileDTO[]> {
    console.info('Backend: Fetching files by key/value...', { key, value });
    return this.#files.getByKey(key, value);
  }

  async fetchLocations(): Promise<LocationDTO[]> {
    console.info('Backend: Fetching locations...');
    return this.#locations.getAllOrdered('dateAdded', OrderDirection.Asc);
  }

  async fetchSearches(): Promise<FileSearchDTO[]> {
    console.info('Backend: Fetching searches...');
    return this.#searches.getAll();
  }

  async searchFiles(
    criteria: ConditionDTO<FileDTO> | [ConditionDTO<FileDTO>, ...ConditionDTO<FileDTO>[]],
    order: OrderBy<FileDTO>,
    fileOrder: OrderDirection,
    matchAny?: boolean,
  ): Promise<FileDTO[]> {
    console.info('Backend: Searching files...', { criteria, matchAny });
    const criterias = Array.isArray(criteria) ? criteria : ([criteria] as [ConditionDTO<FileDTO>]);
    return this.#files.find(criterias, order, fileOrder, matchAny);
  }

  async createTag(tag: TagDTO): Promise<void> {
    console.info('Backend: Creating tag...', tag);
    this.#notifyChange();
    return this.#tags.create(tag);
  }

  async createFile(file: FileDTO): Promise<void> {
    console.info('Backend: Creating file...', file);
    return this.#files.create(file);
  }

  async createLocation(location: LocationDTO): Promise<void> {
    console.info('Backend: Create location...', location);
    this.#notifyChange();
    return this.#locations.create(location);
  }

  async createSearch(search: FileSearchDTO): Promise<void> {
    console.info('Backend: Create search...', search);
    this.#notifyChange();
    return this.#searches.create(search);
  }

  async saveTag(tag: TagDTO): Promise<void> {
    console.info('Backend: Saving tag...', tag);
    this.#notifyChange();
    return this.#tags.update(tag);
  }

  async saveFiles(files: FileDTO[]): Promise<void> {
    console.info('Backend: Saving files...', files);
    this.#notifyChange();
    return this.#files.updateMany(files);
  }

  async saveLocation(location: LocationDTO): Promise<void> {
    console.info('Backend: Saving location...', location);
    this.#notifyChange();
    return this.#locations.update(location);
  }

  async saveSearch(search: FileSearchDTO): Promise<void> {
    console.info('Backend: Saving search...', search);
    this.#notifyChange();
    return this.#searches.update(search);
  }

  async removeTags(tags: ID[]): Promise<void> {
    console.info('Backend: Removing tags...', tags);
    // We have to make sure files tagged with these tags should be untagged
    // Get all files with these tags
    const filesWithTags = await this.#files.findExact({
      key: 'tags',
      value: tags,
      operator: 'contains',
      valueType: 'array',
    });
    const deletedTags = new Set(tags);
    // Remove tags from files
    for (const file of filesWithTags) {
      file.tags = file.tags.filter((t) => !deletedTags.has(t));
    }
    // Update files in db
    await this.saveFiles(filesWithTags);
    // Remove tag from db
    this.#notifyChange();
    return this.#tags.removeMany(tags);
  }

  async mergeTags(tagToBeRemoved: ID, tagToMergeWith: ID): Promise<void> {
    console.info('Merging tags', tagToBeRemoved, tagToMergeWith);
    // Replace tag on all files with the tag to be removed
    const filesWithTags = await this.#files.findExact({
      key: 'tags',
      value: [tagToBeRemoved],
      operator: 'contains',
      valueType: 'array',
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
    this.#notifyChange();
    await this.#tags.remove(tagToBeRemoved);
  }

  async removeFiles(files: ID[]): Promise<void> {
    console.info('Backend: Removing files...', files);
    this.#notifyChange();
    return this.#files.removeMany(files);
  }

  async removeLocation(location: ID): Promise<void> {
    console.info('Backend: Remove location...', location);
    const filesWithLocation = await this.#files.findExact({
      key: 'locationId',
      value: location,
      operator: 'equals',
      valueType: 'string',
    });
    await this.removeFiles(filesWithLocation.map((f) => f.id));
    this.#notifyChange();
    return this.#locations.remove(location);
  }

  async removeSearch(search: ID): Promise<void> {
    console.info('Backend: Removing search...', search);
    this.#notifyChange();
    return this.#searches.remove(search);
  }

  async countFiles(): Promise<[fileCount: number, untaggedFileCount: number]> {
    console.info('Get number stats of files...');
    const fileCount = this.#files.count();
    const untaggedFileCount = this.#files.countExact({
      key: 'tags',
      operator: 'contains',
      value: [],
      valueType: 'array',
    });
    return Promise.all([fileCount, untaggedFileCount]);
  }

  // Creates many files at once, and checks for duplicates in the path they are in
  async createFilesFromPath(path: string, files: FileDTO[]): Promise<void> {
    console.info('Backend: Creating files...', path, files);
    // Search for file paths that start with 'path', so those can be filtered out
    const existingFilesInPath = await this.#files.findExact({
      valueType: 'string',
      operator: 'startsWith',
      key: 'absolutePath',
      value: path,
    });
    console.debug('Filtering files...');
    const newFiles = files.filter((file) =>
      existingFilesInPath.every((f) => f.absolutePath !== file.absolutePath),
    );
    console.debug('Creating files...');
    await this.#files.createMany(newFiles);
    console.debug('Done!');
  }

  async clear(): Promise<void> {
    console.info('Clearing database...');
    dbDelete(this.#db.name);
  }
}
