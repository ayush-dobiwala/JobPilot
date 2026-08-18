import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const root = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(root, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, monorepoRoot, "");
  const apiUrl = env.VITE_API_URL || "http://localhost:3001";
  const publishableKey = env.VITE_CLERK_PUBLISHABLE_KEY || env.CLERK_PUBLISHABLE_KEY || "";

  return {
    plugins: [react()],
    envDir: monorepoRoot,
    resolve: {
      alias: {
        "@": resolve(root, "src"),
      },
    },
    define: {
      "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": JSON.stringify(publishableKey),
      "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl),
    },
    server: {
      port: 5173,
      proxy: {
        "/api": apiUrl,
        "/health": apiUrl,
      },
    },
  };
});
