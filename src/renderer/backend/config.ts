import { IDBCollectionConfig } from './DBRepository';

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
