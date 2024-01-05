

/**  @type {import('@jest/types').Config.ProjectConfig} */
const config = {
  "roots": [
    "<rootDir>/tests",
    "<rootDir>/regression-tests"
  ],
  "testMatch": [
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  "moduleNameMapper": {
    "^(\\.{1,2}/.*)\\.[jt]s$": "$1"
  },

  "preset": "ts-jest"
};

module.exports = config;
