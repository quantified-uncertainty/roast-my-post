// jest.config.js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "../../",
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",
  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: ["src/**/*.{ts,tsx}", ".*(!\\.d\\.ts)$"],
  transform: {
    // Reintroduce babelConfig to ensure ts-jest uses Babel for JSX
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        useESM: true,
        babelConfig: {
          presets: [
            "@babel/preset-env",
            ["@babel/preset-react", { runtime: "automatic" }],
            "@babel/preset-typescript",
          ],
        },
      },
    ],
    // Keep this transform for the specific ESM modules (pnpm structure)
    "node_modules/(\\.pnpm/)?(.+/)?(remark-parse|remark-slate|remark-gfm|unified|micromark.*|mdast-util-.*|decode-named-character-reference|character-entities|bail|unist-util-.*|nanoid|ccount|devlop)/.*\\.js$":
      [
        "babel-jest",
        {
          presets: ["@babel/preset-env"],
          plugins: ["@babel/plugin-transform-modules-commonjs"],
        },
      ],
  },
  // Update transformIgnorePatterns to NOT ignore these ESM modules (pnpm structure)
  transformIgnorePatterns: [
    // Ignore node_modules EXCEPT the ones listed below, accounting for pnpm structure
    "/node_modules/(?!(\\.pnpm/)?(.+/)?(remark-parse|remark-slate|remark-gfm|unified|micromark.*|mdast-util-.*|decode-named-character-reference|character-entities|bail|unist-util-.*|next-auth|@auth|nanoid|ccount|devlop)/)",
  ],
  // Add this section to handle .js imports in ESM/TS projects
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@roast/db$": "<rootDir>/../../internal-packages/db/src/index.ts",
    "^@roast/ai$": "<rootDir>/../../internal-packages/ai/src/index.ts",
    "^@roast/ai/(.*)$": "<rootDir>/../../internal-packages/ai/src/$1",
    "^@roast/domain$": "<rootDir>/../../internal-packages/domain/src/index.ts",
    "^@roast/domain/(.*)$": "<rootDir>/../../internal-packages/domain/src/$1",
    "^server-only$": "<rootDir>/src/__mocks__/server-only.js",
    "^next-auth$": "<rootDir>/src/__mocks__/next-auth.js",
    "^next-auth/providers/resend$": "<rootDir>/src/__mocks__/next-auth/providers/resend.js",
    "^@auth/prisma-adapter$": "<rootDir>/src/__mocks__/@auth/prisma-adapter.js",
    "^next/font/google$": "<rootDir>/src/__mocks__/next/font/google.js",
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts", "<rootDir>/config/jest/setup.js"],
  // Only match test files that are NOT Vitest tests (.vtest/.vspec files)
  testMatch: [
    "**/__tests__/**/*.(test|spec).[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
    "!**/*.vtest.[jt]s?(x)",
    "!**/*.vspec.[jt]s?(x)"
  ],
  // Exclude Playwright tests and Vitest tests from Jest
  testPathIgnorePatterns: ["/node_modules/", "/tests/playwright/"],
};
