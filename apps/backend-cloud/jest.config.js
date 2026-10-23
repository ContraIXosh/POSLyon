/** @type {import('jest').Config} */
module.exports = {
  displayName: 'backend-cloud',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@poslyon/domain-core$': '<rootDir>/../../libs/domain-core/src/index.ts',
    '^@poslyon/domain-core/(.*)$': '<rootDir>/../../libs/domain-core/src/$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
};
