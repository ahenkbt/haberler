import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/index.mjs",
  sourcemap: true,
  target: "node20",
  external: ["express", "cors", "dotenv", "jsonwebtoken", "ws", "bcryptjs"],
});
