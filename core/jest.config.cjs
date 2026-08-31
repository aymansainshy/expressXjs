module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  rootDir: '.',
  testMatch: ['**/*.spec.ts'],

  moduleFileExtensions: ['ts', 'js'],

  // 🔑 allow TS path aliases
  moduleNameMapper: {
    '^@expressX/core/(.*)$': '<rootDir>/src/$1'
  },

  // Decorators need this
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
};
