module.exports = {
  // Test environment
  testEnvironment: "node",

  // File extensions to test
  testMatch: ["**/tests/**/*.test.js", "**/*.test.js"],

  // Extensions Jest should look for
  moduleFileExtensions: ["js", "json"],

  // Setup files
  setupFilesAfterEnv: [],

  // Coverage configuration
  collectCoverageFrom: [
    "**/*.js",
    "!**/node_modules/**",
    "!**/tests/**",
    "!**/coverage/**",
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,
};
