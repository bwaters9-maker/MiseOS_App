export default {
  testEnvironment: 'node',
  transform: {
    '^.+\.(ts|tsx|js|jsx)$': ['ts-jest', { useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
};
