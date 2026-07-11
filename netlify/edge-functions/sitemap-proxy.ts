import type { Context } from "https://edge.netlify.com";

const DEFAULT_API = "https://goalgo-y7ze.onrender.com";

const STATIC_XML = new Set(["/sitemap-static.xml", "/browserconfig.xml"]);

const LEAK_ORIGINS = [
  "https://goalgo-production.up.railway.app",
  "http://goalgo-production.up.railway.app",
  "https://goalgo-y7ze.onrender.com",
  "http://goalgo-y7ze.onrender.com",
];

function apiOrigin(): string {
  return (
    Netlify.env.get("RENDER_API_ORIGIN") ||
    Netlify.env.get("RAILWAY_API_ORIGIN") ||
    DEFAULT_API
  ).replace(/\/+$/, "");
}

/** Kök düzey sitemap .xml yollarını Railway /api/sitemap/* karşılığına eşler (middleware.js ile uyumlu). */
function rootSitemapApiPath(pathname: string): string | null {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (p === "/sitemap.xml") return "/api/sitemap/index.xml";
  const mHmCat = /^\/news-hm\/([^/]+)\/([^/]+)\.xml$/i.exec(p);
  if (mHmCat) return `/api/sitemap/news-hm/${mHmCat[1]}/${mHmCat[2]}.xml`;
  const mCat = /^\/news-yekpare-cat-(.+)\.xml$/i.exec(p);
  if (mCat) return `/api/sitemap/news-yekpare-cat-${mCat[1]}.xml`;
  const mHm = /^\/news-hm-(.+)\.xml$/i.exec(p);
  if (mHm) return `/api/sitemap/news-hm-${mHm[1]}.xml`;
  const mProducts = /^\/products-(\d+)\.xml$/i.exec(p);
  if (mProducts) return `/api/sitemap/products-${mProducts[1]}.xml`;
  const mYektubeVideos = /^\/yektube-videos-(\d+)\.xml$/i.exec(p);
  if (mYektubeVideos) return `/api/sitemap/yektube-videos-${mYektubeVideos[1]}.xml`;
  const known = new Set([
    "/news-yekpare.xml",
    "/news.xml",
    "/businesses.xml",
    "/vendors-siparis.xml",
    "/vendors-alisveris.xml",
    "/vendors-magaza.xml",
    "/turizm.xml",
    "/bilgiagaci.xml",
    "/vendor-blogs.xml",
    "/authors.xml",
    "/yektube-static.xml",
  ]);
  if (p === "/ansiklopedi.xml") return "/api/sitemap/bilgiagaci.xml";
  if (known.has(p)) return `/api/sitemap${p}`;
  return null;
}

function rewriteSitemapOrigins(xml: string, publicOrigin: string): string {
  const canonical = publicOrigin.replace(/\/+$/, "");
  let out = xml;
  for (const bad of LEAK_ORIGINS) {
    if (out.includes(bad)) out = out.split(bad).join(canonical);
  }
  return out;
}

function xmlResponse(request: Request, xml: string, cacheControl = "public, max-age=1800, stale-while-revalidate=86400") {
  const headers = new Headers({
    "content-type": "application/xml; charset=utf-8",
    "x-content-type-options": "nosniff",
    "cache-control": cacheControl,
  });
  if (request.method === "HEAD") {
    headers.set("content-length", String(new TextEncoder().encode(xml).byteLength));
    return new Response(null, { status: 200, headers });
  }
  return new Response(xml, { status: 200, headers });
}

async function proxySitemap(request: Request, incoming: URL, apiPath: string): Promise<Response | null> {
  const targetUrl = `${apiOrigin()}${apiPath}${incoming.search}`;
  const fetchMethod = request.method === "HEAD" ? "GET" : request.method;
  try {
    const upstream = await fetch(targetUrl, {
      method: fetchMethod,
      headers: {
        accept: "application/xml, text/xml, */*",
        "x-forwarded-host": incoming.host,
        "x-forwarded-proto": incoming.protocol.replace(":", ""),
      },
      redirect: "manual",
    });
    const ct = String(upstream.headers.get("content-type") ?? "").toLowerCase();
    if (!upstream.ok || (!ct.includes("xml") && !ct.includes("text/plain"))) {
      return null;
    }
    const text = rewriteSitemapOrigins(await upstream.text(), incoming.origin);
    const cache = upstream.headers.get("cache-control") || "public, max-age=1800, stale-while-revalidate=86400";
    return xmlResponse(request, text, cache);
  } catch {
    return null;
  }
}

const EMPTY_URLSET =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';

export default async (request: Request, context: Context) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return context.next();
  }

  const incoming = new URL(request.url);
  const pathOnly = incoming.pathname.replace(/\/+$/, "") || "/";

  if (!pathOnly.endsWith(".xml")) {
    return context.next();
  }

  if (STATIC_XML.has(pathOnly)) {
    return context.next();
  }

  const apiPath = rootSitemapApiPath(pathOnly);
  if (!apiPath) {
    return context.next();
  }

  const proxied = await proxySitemap(request, incoming, apiPath);
  if (proxied) return proxied;

  if (apiPath !== "/api/sitemap/index.xml") {
    return xmlResponse(request, EMPTY_URLSET);
  }

  return context.next();
};
