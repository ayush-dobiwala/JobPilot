# Shared TypeScript, ESLint (flat config), and Prettier configs for all JS/TS workspaces.

- `@jobpilot/config/typescript/base` — strict TS (no `any`, unused locals, exact optional props)
- `@jobpilot/config/typescript/react` — DOM + JSX for Vite/React
- `@jobpilot/config/typescript/node` — NodeNext emit for API and libraries
- `@jobpilot/config/eslint/base` — `@typescript-eslint/no-explicit-any: error`
- `@jobpilot/config/eslint/react` — React + hooks overlay
- `@jobpilot/config/prettier` — shared formatting
