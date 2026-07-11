import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    env: {
      DATABASE_URL: "postgresql://127.0.0.1:5432/goalgo_test",
    },
  },
});
