/**
 * Sitemap ping — Google ve Bing'e sitemap URL'sini bildirir.
 * Kimlik doğrulama gerektirmez; Search Console / Bing Webmaster manuel gönderim yine önerilir.
 *
 * Kullanım:
 *   node scripts/ping-sitemap.mjs
 *   SITEMAP_URL=https://yekpare.net/sitemap.xml node scripts/ping-sitemap.mjs
 */

const sitemapUrl = String(process.env.SITEMAP_URL ?? "https://yekpare.net/sitemap.xml").trim();
const encoded = encodeURIComponent(sitemapUrl);

const targets = [
  { name: "Google", url: `https://www.google.com/ping?sitemap=${encoded}` },
  { name: "Bing", url: `https://www.bing.com/ping?sitemap=${encoded}` },
];

console.log(`[ping-sitemap] hedef: ${sitemapUrl}`);

for (const t of targets) {
  try {
    const res = await fetch(t.url, { method: "GET", redirect: "follow" });
    console.log(`[ping-sitemap] ${t.name}: HTTP ${res.status} ${res.statusText}`);
  } catch (err) {
    console.warn(`[ping-sitemap] ${t.name}:`, err instanceof Error ? err.message : err);
  }
}

console.log("[ping-sitemap] Manuel gönderim:");
console.log(`  Google Search Console → Sitemaps → ${sitemapUrl}`);
console.log(`  Bing Webmaster Tools → Sitemaps → ${sitemapUrl}`);
