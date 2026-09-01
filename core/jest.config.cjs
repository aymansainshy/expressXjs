module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['reflect-metadata'],

  rootDir: '.',
  testMatch: ['**/*.spec.ts'],

  moduleFileExtensions: ['ts', 'js'],

  // 🔑 allow TS path aliases
  moduleNameMapper: {
    '^@expressX/core/(.*)$': '<rootDir>/src/$1'
  },

  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  }
};
