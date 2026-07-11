import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let cachedRoot: string | null = null;

/** Monorepo `goalgo/` kökünü bulur (Docker /app, dev, bundled dist/index.mjs). */
export function resolveGoalgoRoot(): string {
  if (cachedRoot) return cachedRoot;

  const envRoot = process.env.GOALGO_ROOT?.trim();
  if (envRoot) {
    cachedRoot = path.resolve(envRoot);
    return cachedRoot;
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.cwd(),
    path.resolve(here, "../../.."),
    path.resolve(here, "../../../.."),
    path.resolve(here, "../../../../.."),
  ];

  for (const root of candidates) {
    if (existsSync(path.join(root, "data", "vkd"))) {
      cachedRoot = root;
      return root;
    }
  }

  cachedRoot = process.cwd();
  return cachedRoot;
}

export function resolveGoalgoDataPath(...segments: string[]): string {
  return path.join(resolveGoalgoRoot(), "data", ...segments);
}
