import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { resolveApiOrigin } from "./resolve-api-origin.mjs";

const apiBase = resolveApiOrigin();
const outDir = process.argv[2] || "artifacts/ahenkpress/dist/public";
const portalOrigin = String(process.env.SITEMAP_PORTAL_ORIGIN ?? "https://yekpare.net").replace(/\/+$/, "");
const portalHost = new URL(portalOrigin).hostname.replace(/^www\./i, "");
const today = new Date().toISOString().split("T")[0];

const fallbackIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${portalOrigin}/sitemap-static.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${portalOrigin}/news-yekpare.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${portalOrigin}/businesses.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${portalOrigin}/sarisayfalar.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${portalOrigin}/otomotiv.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${portalOrigin}/vendors-siparis.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${portalOrigin}/vendors-magaza.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${portalOrigin}/turizm.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${portalOrigin}/authors.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${portalOrigin}/ansiklopedi.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${portalOrigin}/vendor-blogs.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${portalOrigin}/yektube-static.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${portalOrigin}/yektube-videos-1.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${portalOrigin}/products-1.xml</loc><lastmod>${today}</lastmod></sitemap>
</sitemapindex>`;

const LEAK_ORIGINS = [
  "https://goalgo-production.up.railway.app",
  "http://goalgo-production.up.railway.app",
  "https://goalgo-y7ze.onrender.com",
  "http://goalgo-y7ze.onrender.com",
];

function rewriteSitemapOrigins(xml, canonicalOrigin) {
  const canonical = canonicalOrigin.replace(/\/+$/, "");
  let out = xml;
  for (const bad of LEAK_ORIGINS) {
    if (out.includes(bad)) out = out.split(bad).join(canonical);
  }
  return out;
}

function extractChildPaths(xml) {
  const paths = new Set();
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) {
    try {
      const pathname = new URL(m[1].trim()).pathname.replace(/^\/+/, "");
      if (pathname && pathname !== "sitemap.xml") paths.add(pathname);
    } catch {
      /* ignore */
    }
  }
  return [...paths];
}

async function fetchXml(url, attempt = 1) {
  const res = await fetch(url, {
    headers: {
      accept: "application/xml, text/xml, */*",
      "x-forwarded-host": portalHost,
      "x-forwarded-proto": "https",
    },
  });
  const text = await res.text();
  const looksXml =
    text.includes("<urlset") || text.includes("<sitemapindex") || text.trimStart().startsWith("<?xml");
  if ((!res.ok || !looksXml) && attempt < 2 && (res.status === 502 || res.status === 503 || res.status === 504)) {
    await new Promise((r) => setTimeout(r, 1500));
    return fetchXml(url, attempt + 1);
  }
  if (!res.ok || !looksXml) {
    throw new Error(`${url} HTTP ${res.status}`);
  }
  return text;
}

function writeXml(relativePath, xml) {
  const dest = join(outDir, relativePath);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, xml, "utf8");
  return dest;
}

function removeIfExists(relativePath) {
  const dest = join(outDir, relativePath);
  try {
    unlinkSync(dest);
    return true;
  } catch {
    return false;
  }
}

mkdirSync(outDir, { recursive: true });

let indexXml = fallbackIndex;
try {
  indexXml = await fetchXml(`${apiBase}/api/sitemap/index.xml`);
} catch (err) {
  console.warn("[sitemap] index API failed, using fallback:", err instanceof Error ? err.message : err);
}

const bakedIndex = rewriteSitemapOrigins(indexXml, portalOrigin);
writeXml("sitemap.xml", bakedIndex);
console.log(`[sitemap] wrote sitemap.xml (${bakedIndex.length} bytes)`);

const childPaths = extractChildPaths(bakedIndex);
console.log(`[sitemap] clearing ${childPaths.length} dynamic child paths (runtime proxy via Netlify edge)`);

let removed = 0;
for (const rel of childPaths) {
  if (rel === "sitemap-static.xml") continue;
  if (removeIfExists(rel)) {
    removed += 1;
    console.log(`[sitemap] removed baked ${rel}`);
  }
}

console.log(`[sitemap] removed ${removed} stale child files; dynamic sitemaps served at runtime`);
