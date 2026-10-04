module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  clearMocks: true,
  setupFilesAfterEnv: ['./tests/setup.js'],
};
