const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: [
    "<rootDir>/jest.setup.js",
    "<rootDir>/src/__tests__/setup.ts",
  ],
  // Change this for API routes
  testEnvironment: "jest-environment-node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest"],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
  ],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.jest.json",
    },
  },
  moduleDirectories: ["node_modules", "<rootDir>/"],
  testMatch: [
    "**/__tests__/**/*.(spec|test).[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  // Add @auth/prisma-adapter to the list
  transformIgnorePatterns: [
    "/node_modules/(?!(@auth/core|@auth/prisma-adapter|@hookform/resolvers)/)",
  ],
};

module.exports = createJestConfig(customJestConfig);
