import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      // `lcov` is what Codecov consumes in CI; the rest are for local use.
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**"],
      exclude: ["node_modules/**", "dist/**", "tests/**"],
      // The suite is fully covered; keep it that way.
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
