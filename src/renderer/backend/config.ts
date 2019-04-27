import { IDBCollectionConfig } from './DBRepository';

// This should be incremented every time the config changes before a release
// The version is not used at the moment, but is useful in the future to properly upgrade the DB
export const DB_VERSION = 1;

export const dbConfig: IDBCollectionConfig[] = [
  {
    name: 'files',
    indices: [
      {
        name: 'tags',
        path: 'tags',
        opts: {
          unique: false,
          multiEntry: true,
        },
      },
      {
        name: 'path',
        path: 'path',
        opts: {
          unique: true,
        },
      },
      {
        name: 'dateAdded',
        path: 'dateAdded',
      },
    ],
  },
  {
    name: 'tags',
    indices: [],
  },
  {
    name: 'tagCollections',
    indices: [],
  },
];
