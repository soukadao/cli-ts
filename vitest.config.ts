import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      reporter: "text",
      provider: "v8",
      thresholds: {
        statements: 80,
        branches: 60,
        functions: 70,
        lines: 80,
      },
    },
    include: ["src/**/*.test.ts"],
    exclude: [],
  },
});
