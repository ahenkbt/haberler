/** GSC /sitemap.xml boş urlset görünmesin — API düşerse en az kök URL kalsın. */
export function sitemapFailXml(pathOnly, origin) {
  const home = `${String(origin || "").replace(/\/+$/, "")}/`;
  if (pathOnly === "/sitemap.xml" || pathOnly === "/sitemap-web.xml") {
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url><loc>${home}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n` +
      `</urlset>`
    );
  }
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n` +
    `</urlset>`
  );
}

/**
 * GSC web sitemap: xmlns:news + eski news:publication_date dosyayı
 * Google News haritası sanıp "0 keşfedilen sayfa" gösterir.
 * Yalnız loc (+ lastmod) bırak.
 */
export function toGscWebSitemapXml(xml) {
  const src = String(xml || "");
  const urls = [];
  const seen = new Set();
  const re = /<url>([\s\S]*?)<\/url>/gi;
  let m;
  while ((m = re.exec(src))) {
    const locM = /<loc>\s*([^<]+?)\s*<\/loc>/i.exec(m[1]);
    if (!locM) continue;
    const loc = locM[1].trim();
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    const lastM = /<lastmod>\s*([^<]+?)\s*<\/lastmod>/i.exec(m[1]);
    const lastmod = lastM ? lastM[1].trim() : "";
    urls.push(
      lastmod
        ? `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
        : `  <url>\n    <loc>${loc}</loc>\n  </url>`,
    );
  }
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls.join("\n")}\n` +
    `</urlset>`
  );
}

export function isGscWebSitemapPath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return p === "/sitemap.xml" || p === "/sitemap-web.xml";
}

function sitemapPathOnly(pathname) {
  return String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
}

/** Public sitemap files and /api/sitemap/*.xml — never pass a container 500 through as HTML. */
export function isSitemapFailSoftPath(pathname) {
  const lower = sitemapPathOnly(pathname).toLowerCase();
  if (lower.startsWith("/api/sitemap/") && lower.endsWith(".xml")) return true;
  if (!lower.endsWith(".xml")) return false;
  if (
    lower === "/sitemap.xml" ||
    lower === "/sitemap-web.xml" ||
    lower === "/sitemap-index.xml" ||
    lower === "/sitemap-news.xml" ||
    lower === "/sitemap-pages.xml" ||
    lower === "/google-news.xml" ||
    lower === "/news-yekpare-google-news.xml"
  ) {
    return true;
  }
  if (lower.startsWith("/news-hm-") || lower.startsWith("/news-hm/")) return true;
  if (lower.startsWith("/news-yekpare")) return true;
  return false;
}

/**
 * Fail-soft body shape. API index/news-hm files are the public web sitemap
 * when the container errors, so the fallback stays a homepage urlset.
 */
export function sitemapFailPublicPath(pathname) {
  const p = sitemapPathOnly(pathname);
  const lower = p.toLowerCase();
  if (
    lower === "/api/sitemap/index.xml" ||
    lower === "/api/sitemap/news-yekpare.xml" ||
    /^\/api\/sitemap\/news-hm-[^/]+\.xml$/i.test(lower)
  ) {
    return "/sitemap.xml";
  }
  if (lower.endsWith("/google-news.xml") || lower.endsWith("-google-news.xml")) return "/google-news.xml";
  return p;
}

/** 5xx or a 2xx that is not XML. 404 stays 404. */
export function sitemapUpstreamShouldFailSoft(pathname, status, contentType) {
  if (!isSitemapFailSoftPath(pathname)) return false;
  const code = Number(status) || 0;
  if (code === 0 || code >= 500) return true;
  if (code < 200 || code >= 300) return false;
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("xml") || ct.includes("text/plain")) return false;
  return true;
}
