import { Transaction } from 'dexie';
import { IDBVersioningConfig } from './DBRepository';

// The name of the IndexedDB
export const DB_NAME = 'Allusion';

export const NUM_AUTO_BACKUPS = 6;

export const AUTO_BACKUP_TIMEOUT = 1000 * 60 * 10; // 10 minutes

export const INSTANT_BACKUP_FILENAME = 'allusion_data.json';

// Schema based on https://dexie.org/docs/Version/Version.stores()#schema-syntax
// Only for the indexes of the DB, not all fields
// Versions help with upgrading DB to new configurations:
// https://dexie.org/docs/Tutorial/Design#database-versioning
export const dbConfig: IDBVersioningConfig[] = [
  {
    // Version 4, 19-9-20: Added system created date
    version: 4,
    collections: [
      {
        name: 'files',
        schema:
          '++id, locationId, *tags, relativePath, &absolutePath, name, extension, size, width, height, dateAdded, dateModified, dateCreated',
      },
      {
        name: 'tags',
        schema: '++id',
      },
      {
        name: 'locations',
        schema: '++id, dateAdded',
      },
    ],
  },
  {
    // Version 5, 29-5-21: Added sub-locations
    version: 5,
    collections: [],
    upgrade: async (tx: Transaction): Promise<void> => {
      tx.table('locations')
        .toCollection()
        .modify((location: any) => {
          location.subLocations = [];
          return location;
        });
    },
  },
];
