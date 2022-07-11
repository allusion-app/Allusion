import { Transaction } from 'dexie';
import { IFile } from 'src/entities/File';
import { IDBVersioningConfig } from './DBRepository';
import fse from 'fs-extra';

// The name of the IndexedDB
export const DB_NAME = 'Allusion';

export const NUM_AUTO_BACKUPS = 6;

export const AUTO_BACKUP_TIMEOUT = 1000 * 60 * 10; // 10 minutes

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
    upgrade: (tx: Transaction): void => {
      tx.table('locations')
        .toCollection()
        .modify((location: any) => {
          location.subLocations = [];
          return location;
        });
    },
  },
  {
    // Version 6, 13-11-21: Added lastIndexed date to File for recreating thumbnails
    version: 6,
    collections: [],
    upgrade: (tx: Transaction): void => {
      tx.table('files')
        .toCollection()
        .modify((file: IFile) => {
          file.dateLastIndexed = file.dateAdded;
          return file;
        });
    },
  },
  {
    // Version 7, 4-1-22: Added saved searches
    version: 7,
    collections: [
      {
        name: 'searches',
        schema: '++id',
      },
    ],
  },
  {
    // Version 8, 9-1-22: Added ino to file for detecting added/removed files as a single rename/move event
    version: 8,
    collections: [
      {
        name: 'files',
        schema:
          '++id, ino, locationId, *tags, relativePath, &absolutePath, name, extension, size, width, height, dateAdded, dateModified, dateCreated',
      },
    ],
    upgrade: (tx: Transaction): void => {
      tx.table('files')
        .toCollection()
        .modify((file: IFile) => {
          try {
            // apparently you can't do async stuff here, even though it is typed to return a PromiseLike :/
            const stats = fse.statSync(file.absolutePath);
            // fallback to random value so that it won't be recognized as identical file to others where no ino could be found
            file.ino = stats.ino.toString() || Math.random().toString();
          } catch (e) {
            console.warn(`Could not get ino for ${file.absolutePath}`);
          }
          return file;
        });
    },
  },
  {
    // Version 9, 10-7-22: Updated search schema for correctness and compactness
    version: 9,
    collections: [],
    upgrade: (tx: Transaction): void => {
      tx.table('searches')
        .toCollection()
        .modify((search: SearchItem) => {
          // Make matchAny non-optional
          search.matchAny = search.matchAny === true;

          // Store tag operators to avoid data loss on serialization and deserialization
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          for (const criteria of search.criteria!) {
            if (criteria.key === 'tags') {
              const tags = criteria.value as string[];

              if (tags.length > 1) {
                if (criteria.operator === 'contains') {
                  criteria.operator = 'containsRecursively';
                } else if (criteria.operator === 'notContains') {
                  criteria.operator = 'containsNotRecursively';
                }

                criteria.value = [tags[0]];
              }
            }

            // This can be derived at runtime based on either property key or value type.
            delete criteria.valueType;
          }

          // Purely naming improvement due to a search being made up of N criterias.
          search.criterias = structuredClone(search.criteria);
          delete search.criteria;
        });
    },
  },
];

// Version 8 partial schema of search items.
interface SearchItem extends Record<string, any> {
  criteria?: {
    key: string;
    valueType?: 'number' | 'date' | 'string' | 'array';
    operator: string;
    value: any;
  }[];
  matchAny?: boolean;
}
