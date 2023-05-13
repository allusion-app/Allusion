import { Transaction } from 'dexie';
import { FileDTO } from 'src/api/file';
import { DBVersioningConfig } from './db-repository';
import fse from 'fs-extra';
import { PositionSource } from 'position-strings';

// The name of the IndexedDB
export const DB_NAME = 'Allusion';

export const NUM_AUTO_BACKUPS = 6;

export const AUTO_BACKUP_TIMEOUT = 1000 * 60 * 10; // 10 minutes

// Schema based on https://dexie.org/docs/Version/Version.stores()#schema-syntax
// Only for the indexes of the DB, not all fields
// Versions help with upgrading DB to new configurations:
// https://dexie.org/docs/Tutorial/Design#database-versioning
export const dbConfig: DBVersioningConfig[] = [
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
        .modify((file: FileDTO) => {
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
        .modify((file: FileDTO) => {
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
    version: 9,
    collections: [
      {
        name: 'locations',
        schema: '++id',
      },
    ],
    upgrade: (tx: Transaction): void => {
      tx.table('searches')
        .toCollection()
        .sortBy('index')
        .then((searches) => {
          const source = new PositionSource({ ID: 's' });
          let position: string | undefined = undefined;

          searches.forEach((search) => {
            delete search.index;
            position = source.createBetween(position);
            search.position = position;
          });

          return tx.table('searches').bulkPut(searches);
        });

      tx.table('locations')
        .toArray()
        .then((locations) => {
          locations.sort((a, b) =>
            a.index === b.index ? a.dateAdded.getTime() - b.dateAdded.getTime() : a.index - b.index,
          );
          const source = new PositionSource({ ID: 'l' });
          let position: string | undefined = undefined;

          locations.forEach((location) => {
            delete location.index;
            position = source.createBetween(position);
            location.position = position;
          });

          return tx.table('locations').bulkPut(locations);
        });

      tx.table('tags')
        .toArray()
        .then((tags) => {
          const source = new PositionSource({ ID: 't' });
          const tagGraph = new Map();
          tags.forEach((tag) => tagGraph.set(tag.id, tag));

          tags.forEach((tag) => {
            let position: string | undefined = undefined;

            for (const subTagId of tag.subTags) {
              const subTag = tagGraph.get(subTagId);

              if (subTag !== undefined) {
                position = source.createBetween(position);
                subTag.parent = tag.id;
                subTag.position = position;
              }
            }

            tag.parent = tag.parent ?? '';
            tag.position = tag.position ?? '';
            delete tag.subTags;
          });

          return tx.table('tags').bulkPut(tags);
        });
    },
  },
];
