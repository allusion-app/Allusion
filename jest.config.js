module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  modulePaths: ['<rootDir>'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.jest.json',
    },
    'self': {
      // Fix for dexie-import-export error "ReferenceError: self is not defined"
      value: () => window,
    },
  },
};
