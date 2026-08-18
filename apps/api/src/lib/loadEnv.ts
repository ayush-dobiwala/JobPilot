import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const rootEnv = resolve(here, "../../../../.env");
const localEnv = resolve(here, "../../.env");

if (existsSync(rootEnv)) {
  config({ path: rootEnv });
}

if (existsSync(localEnv)) {
  config({ path: localEnv, override: true });
}
