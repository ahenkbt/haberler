import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// KURULUM.md (frontend 5173, API 3000). PORT ile ezilebilir; strictPort kapalı — port meşgulse sıradakini dener.
const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort);

const basePath = process.env.BASE_PATH ?? "/";
const monorepoRoot = path.resolve(import.meta.dirname, "..", "..");

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      // Vercel/Linux: pnpm workspace symlinks may not resolve in Rollup; use monorepo paths.
      "@workspace/api-client-react": path.resolve(
        monorepoRoot,
        "lib/api-client-react/src/index.ts",
      ),
      "@workspace/site-nav": path.resolve(
        monorepoRoot,
        "lib/site-nav/src/index.ts",
      ),
      "@workspace/yektube-core": path.resolve(monorepoRoot, "lib/yektube-core/src/index.ts"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: false,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      allow: [monorepoRoot],
    },
    // Yerelde API ayrı terminalde (PORT=3000) — tarayıcı /api → Vite bu adrese iletir (VITE_API_BASE_URL gerekmez).
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    strictPort: false,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
