// jest.config.js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",
  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: ["src/**/*.{ts,tsx}", ".*(!\\.d\\.ts)$"],
  transform: {
    // Use ts-jest for ts/tsx files and tell it to use babel config for JSX
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        babelConfig: {
          presets: ["next/babel"], // Use Next.js's Babel preset
        },
      },
    ],
  },
  // Add this section to handle .js imports in ESM/TS projects
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  // Optional: If you encounter module resolution issues with aliases (like @/)
  // moduleNameMapper: {
  //   '^@/(.*)$': '<rootDir>/src/$1',
  // },
};
