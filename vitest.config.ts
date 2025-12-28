import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
    clearMocks: true,
    pool: "forks",
    maxWorkers: 1,
    isolate: false,
    coverage: {
      reporter: ["text", "lcov"],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
});
