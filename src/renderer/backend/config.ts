import { IDBVersioningConfig } from './DBRepository';
import { IFile } from '../entities/File';

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
        schema: '++id, locationId, *tags, &path, name, extension, size, width, height, dateAdded, dateModified',
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
  }, {
    // Version 2, 11-4-20: We don't store the period on the files.extension field anymore
    version: 2,
    collections: [],
    upgrade: (tx) => {
      tx.table('files').toCollection().modify((file: IFile) => {
        // Remove the period of a file extension, if it exists
        if (file.extension.startsWith('.')) {
          file.extension = file.extension.slice(1);
        }
      })
    }
  }
];
