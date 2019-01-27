
export const dbConfig = [
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
];
