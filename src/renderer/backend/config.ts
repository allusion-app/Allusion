import { IDBVersioningConfig } from './DBRepository';

// The name of the IndexedDB
export const DB_NAME = 'Allusion';

// Schema based on https://dexie.org/docs/Version/Version.stores()#schema-syntax
// Only for the indexes of the DB, not all fields
// Versions help with upgrading DB to new configurations:
// https://dexie.org/docs/Tutorial/Design#database-versioning
export const dbConfig: IDBVersioningConfig[] = [
  {
    version: 1,
    collections: [
      {
        name: 'files',
        schema: '++id, locationId, *tags, path, name, extension, size, width, height, dateAdded, dateModified',
      },
      {
        name: 'tags',
        schema: '++id',
      },
      {
        name: 'tagCollections',
        schema: '++id',
      },
      {
        name: 'locations',
        schema: '++id, dateAdded',
      },
    ],
  },
];
