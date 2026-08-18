import { reactConfig } from "@jobpilot/config/eslint/react";

export default [
  ...reactConfig,
  {
    ignores: ["dist/**"],
  },
];
