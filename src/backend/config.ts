import { IDBVersioningConfig } from './DBRepository';

// The name of the IndexedDB
export const DB_NAME = 'Allusion';

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
    // Example upgrade for future versions:
    // upgrade: async (tx: Transaction): Promise<void> => {
    //   tx.table('files')
    //     .toCollection()
    //     .modify((file: any) => {
    //       try {
    //         const stats = fse.statSync(file.absolutePath);
    //         file.dateCreated = stats.ctime;
    //       } catch (e) {
    //         console.error(
    //           'Could not migrate created date of file, using fallback',
    //           file.absolutePath,
    //         );
    //         file.dateCreated = file.dateAdded;
    //       }
    //       return file;
    //     });
    // },
  },
];
