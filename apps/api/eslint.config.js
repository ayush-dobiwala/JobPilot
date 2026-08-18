import { baseConfig } from "@jobpilot/config/eslint/base";

export default [
  ...baseConfig,
  {
    ignores: ["src/db/migrations/**", "drizzle.config.ts"],
  },
];
