import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFiles: ["<rootDir>/__tests__/integration/polyfills.ts"],
  // Integration tests share one Postgres DB and TRUNCATE in afterEach, so they
  // must not run in parallel; jest sizes its pool from host CPUs (16 on the
  // self-hosted runner), so pin to one worker.
  maxWorkers: 1,
  roots: ["<rootDir>/__tests__", "<rootDir>/deliberations"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
        },
      },
    ],
  },
  moduleNameMapper: {
    // CSS-module + next/font stubs let server manifests (which import a
    // theme.module.css and, for some slugs, next/font/google loaders) be
    // imported under ts-jest — needed by the eval guard test that iterates the
    // real server-registry. Order matters: the more specific keys precede the
    // catch-all `@/` alias.
    "\\.(css|scss|sass)$": "<rootDir>/__tests__/mocks/style-stub.js",
    // `@deliberations/ui` brand components import `*.svg` for their URL; stub
    // it so ts-jest doesn't try to parse the SVG markup as JS.
    "\\.svg$": "<rootDir>/__tests__/mocks/svg-stub.js",
    "^next/font/local$": "<rootDir>/__tests__/mocks/next-font.js",
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default config;
