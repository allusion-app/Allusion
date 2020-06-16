import { IDBVersioningConfig } from './DBRepository';
import { IFile } from '../entities/File';
import Dexie from 'dexie';
import { ILocation } from '../entities/Location';

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
        schema:
          '++id, locationId, *tags, &path, name, extension, size, width, height, dateAdded, dateModified',
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
  {
    // Version 2, 11-4-20: We don't store the period on the files.extension field anymore
    version: 2,
    collections: [],
    upgrade: (tx: Dexie.Transaction): void => {
      tx.table('files')
        .toCollection()
        .modify((file: IFile) => {
          // Remove the period of a file extension, if it exists
          if (file.extension.startsWith('.')) {
            file.extension = file.extension.slice(1);
          }
        });
    },
  },
  {
    // Version 3, 13-6-20: Removed file "path", replaced with:
    // - "relativePath": the path relative to their location, and;
    // - "absolutePath": the same as the old "path", only used for searching
    // relativePath is not a unique value, e.g. two locations could have a file with path "myFolder/cat.jpg"
    // TODO: Maybe a unique compound index of locationId and relativePath?
    version: 3,
    collections: [
      {
        name: 'files',
        schema:
          '++id, locationId, *tags, relativePath, &absolutePath, name, extension, size, width, height, dateAdded, dateModified',
      },
    ],
    upgrade: async (tx: Dexie.Transaction): Promise<void> => {
      const locations: ILocation[] = await tx.table('locations').toArray();
      tx.table('files')
        .toCollection()
        .modify((file: any) => {
          if ('path' in file) {
            const oldPath: string = file.path;
            const loc = locations.find((loc) => loc.id === file.locationId);
            if (loc) {
              file.absolutePath = oldPath;
              file.relativePath = oldPath.replace(loc.path, '');
              file.path = undefined;
            }
          }
        });
    },
  },
];
