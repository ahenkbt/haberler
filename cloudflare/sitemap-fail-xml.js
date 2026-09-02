/** GSC /sitemap.xml boş urlset görünmesin — API düşerse en az kök URL kalsın. */
export function sitemapFailXml(pathOnly, origin) {
  const home = `${String(origin || "").replace(/\/+$/, "")}/`;
  if (pathOnly === "/sitemap.xml") {
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n` +
      `  <url><loc>${home}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n` +
      `</urlset>`
    );
  }
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n` +
    `</urlset>`
  );
}
