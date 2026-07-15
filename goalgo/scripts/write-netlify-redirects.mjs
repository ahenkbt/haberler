import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveApiOrigin } from "./resolve-api-origin.mjs";

const apiOrigin = resolveApiOrigin();
const agentLabsUrl = String(process.env.AGENTLABS_URL ?? "").replace(/\/+$/, "");
const outDir = process.argv[2] || "artifacts/ahenkpress/dist/public";

/** Netlify / Cloudflare _redirects — özel kurallar önce, SPA catch-all en sonda. */
const lines = [];

if (agentLabsUrl) {
  lines.push(
    "# AI Call Center vekili (AGENTLABS_URL build env)",
    `/call-center-api/*  ${agentLabsUrl}/api/:splat  200`,
    `/call-center-app/*  ${agentLabsUrl}/:splat  200`,
    `/call-center-app  ${agentLabsUrl}/  200`,
    "",
  );
}

if (apiOrigin) {
  lines.push(
    "# Harici API vekili (yalnızca API_ORIGIN doluysa — Cloudflare aynı-origin'de Worker Container kullanır)",
    `/api/media/uploads/*  ${apiOrigin}/api/media/uploads/:splat  200`,
    `/api/*  ${apiOrigin}/api/:splat  200`,
    "",
    "# Sitemap vekili",
    `/sitemap.xml  ${apiOrigin}/api/sitemap/index.xml  200`,
    `/news-hm/:hmSlug/:catFile  ${apiOrigin}/api/sitemap/news-hm/:hmSlug/:catFile  200`,
    `/news-yekpare-cat-:catSlug.xml  ${apiOrigin}/api/sitemap/news-yekpare-cat-:catSlug.xml  200`,
    `/news-hm-:hmSlug.xml  ${apiOrigin}/api/sitemap/news-hm-:hmSlug.xml  200`,
    `/products-:page.xml  ${apiOrigin}/api/sitemap/products-:page.xml  200`,
    `/yektube-videos-:page.xml  ${apiOrigin}/api/sitemap/yektube-videos-:page.xml  200`,
    `/ansiklopedi.xml  ${apiOrigin}/api/sitemap/bilgiagaci.xml  200`,
    `/news-yekpare.xml  ${apiOrigin}/api/sitemap/news-yekpare.xml  200`,
    `/news.xml  ${apiOrigin}/api/sitemap/news.xml  200`,
    `/businesses.xml  ${apiOrigin}/api/sitemap/businesses.xml  200`,
    `/vendors-siparis.xml  ${apiOrigin}/api/sitemap/vendors-siparis.xml  200`,
    `/vendors-alisveris.xml  ${apiOrigin}/api/sitemap/vendors-alisveris.xml  200`,
    `/vendors-magaza.xml  ${apiOrigin}/api/sitemap/vendors-magaza.xml  200`,
    `/turizm.xml  ${apiOrigin}/api/sitemap/turizm.xml  200`,
    `/bilgiagaci.xml  ${apiOrigin}/api/sitemap/bilgiagaci.xml  200`,
    `/vendor-blogs.xml  ${apiOrigin}/api/sitemap/vendor-blogs.xml  200`,
    `/authors.xml  ${apiOrigin}/api/sitemap/authors.xml  200`,
    `/yektube-static.xml  ${apiOrigin}/api/sitemap/yektube-static.xml  200`,
    "",
  );
} else {
  lines.push(
    "# API / sitemap: Cloudflare Worker → Container (aynı origin). Harici _redirects yok.",
    "",
  );
}

lines.push(
  "# Yektube statik dosya eşlemeleri",
  "/yp/sw.js  /yektube-v2/sw.js  200",
  "/yp/manifest.webmanifest  /yektube-v2/manifest.webmanifest  200",
  "/yp/yektube-icon.png  /yektube-v2/yektube-icon.png  200",
  "/yp/yektube-logo.png  /yektube-v2/yektube-logo.png  200",
  "/yp/yektube-video-tv-logo.png  /yektube-v2/yektube-video-tv-logo.png  200",
  "/yp/offline.html  /yektube-v2/offline.html  200",
  "",
  "# Yektube SPA",
  "/yp  /yektube-v2/index.html  200",
  "/yp/*  /yektube-v2/index.html  200",
  "/muzik  /yektube-v2/index.html  200",
  "/muzik/*  /yektube-v2/index.html  200",
  "/cocuk  /yektube-v2/index.html  200",
  "/cocuk/*  /yektube-v2/index.html  200",
  "/canli  /yektube-v2/index.html  200",
  "/canli/*  /yektube-v2/index.html  200",
  "/yek-gonder  /yektube-v2/index.html  200",
  "/yek-gonder/*  /yektube-v2/index.html  200",
  "/hesabim  /yektube-v2/index.html  200",
  "/hesabim/*  /yektube-v2/index.html  200",
  "/studio  /yektube-v2/index.html  200",
  "/studio/*  /yektube-v2/index.html  200",
  "/yektube-v2  /yektube-v2/index.html  200",
  "/yektube-v2/  /yektube-v2/index.html  200",
  "/yektube-v2/*  /yektube-v2/index.html  200",
  "",
  "# Ana portal SPA",
  "/maps/place/*  /index.html  200",
  "/*  /index.html  200",
);

writeFileSync(join(outDir, "_redirects"), `${lines.join("\n")}\n`, "utf8");
console.log(
  `netlify-redirects → ${join(outDir, "_redirects")} (api=${apiOrigin || "same-origin"}${agentLabsUrl ? `, agentlabs=${agentLabsUrl}` : ""})`,
);
