/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    // @noble/* v2 ships ESM-only — transform via ts-jest
    'node_modules/@noble/.+\\.js$': 'ts-jest',
  },
  // Allow @noble/* to be transformed (default pattern ignores all node_modules)
  transformIgnorePatterns: [
    'node_modules/(?!@noble/)',
  ],
}
