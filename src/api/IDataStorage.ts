import { IndexableType } from 'dexie';
import { ConditionDTO, OrderBy, OrderDirection } from './DataStorageSearch';
import { FileDTO } from './File';
import { FileSearchItemDTO } from './FileSearchItem';
import { ID } from './ID';
import { LocationDTO } from './Location';
import { TagDTO } from './Tag';

export interface IDataStorage {
  fetchTags: () => Promise<TagDTO[]>;
  fetchFiles: (order: OrderBy<FileDTO>, fileOrder: OrderDirection) => Promise<FileDTO[]>;
  fetchFilesByID: (ids: ID[]) => Promise<FileDTO[]>;
  fetchFilesByKey: (key: keyof FileDTO, value: IndexableType) => Promise<FileDTO[]>;
  fetchLocations: (order: keyof LocationDTO, fileOrder: OrderDirection) => Promise<LocationDTO[]>;
  fetchSearches: () => Promise<FileSearchItemDTO[]>;
  searchFiles: (
    criteria: ConditionDTO<FileDTO> | [ConditionDTO<FileDTO>],
    order: OrderBy<FileDTO>,
    fileOrder: OrderDirection,
    matchAny?: boolean,
  ) => Promise<FileDTO[]>;
  createTag: (tag: TagDTO) => Promise<void>;
  createFile: (file: FileDTO) => Promise<void>;
  createLocation: (location: LocationDTO) => Promise<void>;
  createSearch: (search: FileSearchItemDTO) => Promise<void>;
  saveTag: (tag: TagDTO) => Promise<void>;
  saveFiles: (files: FileDTO[]) => Promise<void>;
  saveLocation: (location: LocationDTO) => Promise<void>;
  saveSearch: (search: FileSearchItemDTO) => Promise<void>;
  removeTags: (tags: ID[]) => Promise<void>;
  mergeTags: (tagToBeRemoved: ID, tagToMergeWith: ID) => Promise<void>;
  removeFiles: (files: ID[]) => Promise<void>;
  removeLocation: (location: ID) => Promise<void>;
  removeSearch: (search: ID) => Promise<void>;
  countFiles: () => Promise<[fileCount: number, untaggedFileCount: number]>;
  createFilesFromPath: (path: string, files: FileDTO[]) => Promise<void>;
  clear: () => Promise<void>;
  backupToFile: (path: string) => Promise<void>;
  restoreFromFile: (path: string) => Promise<void>;
  peekFile: (path: string) => Promise<[numTags: number, numFiles: number]>;
}
