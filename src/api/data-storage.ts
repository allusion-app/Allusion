import { IndexableType } from 'dexie';
import { ConditionDTO, OrderBy, OrderDirection } from './data-storage-search';
import { FileDTO } from './file';
import { FileSearchDTO } from './file-search';
import { ID } from './id';
import { LocationDTO } from './location';
import { TagDTO } from './tag';

/**
 * The user generated persisted data edited or viewed by one or multiple actors (users, multiple devices etc.).
 *
 * The document contains data about
 * * files (index map),
 * * tags (tree),
 * * locations (list) and
 * * searches (list).
 */
export interface DataStorage {
  fetchTags(): Promise<TagDTO[]>;
  fetchFiles(order: OrderBy<FileDTO>, fileOrder: OrderDirection): Promise<FileDTO[]>;
  fetchFilesByID(ids: ID[]): Promise<FileDTO[]>;
  fetchFilesByKey(key: keyof FileDTO, value: IndexableType): Promise<FileDTO[]>;
  fetchLocations(): Promise<LocationDTO[]>;
  fetchSearches(): Promise<FileSearchDTO[]>;
  searchFiles(
    criteria: ConditionDTO<FileDTO> | [ConditionDTO<FileDTO>, ...ConditionDTO<FileDTO>[]],
    order: OrderBy<FileDTO>,
    fileOrder: OrderDirection,
    matchAny?: boolean,
  ): Promise<FileDTO[]>;
  createTag(tag: TagDTO): Promise<void>;
  createFilesFromPath(path: string, files: FileDTO[]): Promise<void>;
  createLocation(location: LocationDTO): Promise<void>;
  createSearch(search: FileSearchDTO): Promise<void>;
  saveTag(tag: TagDTO): Promise<void>;
  saveFiles(files: FileDTO[]): Promise<void>;
  saveLocation(location: LocationDTO): Promise<void>;
  saveSearch(search: FileSearchDTO): Promise<void>;
  removeTags(tags: ID[]): Promise<void>;
  mergeTags(tagToBeRemoved: ID, tagToMergeWith: ID): Promise<void>;
  removeFiles(files: ID[]): Promise<void>;
  removeLocation(location: ID): Promise<void>;
  removeSearch(search: ID): Promise<void>;
  countFiles(): Promise<[fileCount: number, untaggedFileCount: number]>;
  clear(): Promise<void>;
  backupToFile(path: string): Promise<void>;
  restoreFromFile(path: string): Promise<void>;
  peekFile(path: string): Promise<[numTags: number, numFiles: number]>;
}
