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
    // Simplify ts-jest config to rely on tsconfig.json for JSX
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        useESM: true, // Keep ESM handling
        // Remove explicit babelConfig here, let ts-jest handle it
      },
    ],
    // Improved regex to better match the ESM packages we need to transform
    "node_modules/(?!(remark-parse|remark-slate|unified|micromark|mdast-util-from-markdown|decode-named-character-reference|mdast-util-to-string|character-entities|bail|unist-util-is|unist-util-visit|unist-util-visit-parents)/.*)\\.js$":
      [
        "babel-jest",
        {
          presets: ["@babel/preset-env"],
          plugins: ["@babel/plugin-transform-modules-commonjs"],
        },
      ],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(remark-parse|remark-slate|unified|micromark|mdast-util-from-markdown|decode-named-character-reference|mdast-util-to-string|character-entities|bail|unist-util-is|unist-util-visit|unist-util-visit-parents)/.*)",
  ],
  // Add this section to handle .js imports in ESM/TS projects
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
};
