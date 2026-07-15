import { spawnSync } from "node:child_process";
import { resolveApiOrigin } from "./resolve-api-origin.mjs";

const apiOrigin = resolveApiOrigin(); // Cloudflare: boş = aynı origin /api → Container

const env = {
  ...process.env,
  // Boş string aynı-origin; harici URL yalnızca API_ORIGIN verilirse
  VITE_PUBLIC_API_ORIGIN: apiOrigin,
  VITE_YEKTUBE_V2_ENABLED: "true",
  VITE_YEKTUBE_DEDICATED_HOSTS: "yektube.com",
  VITE_YEKTUBE_DEDICATED_PATH: "/yp",
  VITE_YEKTUBE_REDIRECT_TO_CANONICAL: "0",
  VITE_YEKTUBE_PORTAL_SURFACE_HOSTS: "yekpare.net",
  VITE_PORTAL_HOSTS:
    process.env.VITE_PORTAL_HOSTS ||
    "goalgo.org,turkiye.li,getirsepeti.com.tr,ahenk.net.tr,turk.eco,www.turk.eco",
};

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("pnpm", ["run", "build:web:full"]);
run("node", ["scripts/generate-public-sitemap.mjs", "artifacts/ahenkpress/dist/public"]);
// _redirects Workers asset-first + worker.js ile birlikte yedek; CF Pages uyumu için bırakılır
run("node", ["scripts/write-netlify-redirects.mjs", "artifacts/ahenkpress/dist/public"]);
console.log("cloudflare-deploy-rev=20260715-worker-assets-render");
