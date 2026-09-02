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
