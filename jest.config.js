/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>/server/tests'],
  setupFilesAfterEnv: ['<rootDir>/server/tests/setup.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/server/tsconfig.json',
      },
    ],
  },
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['server/src/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  verbose: true,
  testTimeout: 10000,
};
