/**
 * Geçici: trafik → Render (SPA + API).
 * Eski Netlify Service Worker / cache için TEK SEFERLIK purge (JS boot + cookie).
 * Clear-Site-Data HTML yanıtlarında kullanılmaz — Chrome navigasyonu ERR_FAILED
 * ile düşürüp cookie yazılmadan döngüye sokabiliyor (yekpare.net/admin).
 */

const DEFAULT_API = "https://goalgo-y7ze.onrender.com";
/**
 * Cookie sürümü — artırınca tüm ziyaretçilerde Netlify SW yeniden temizlenir.
 * (Eski cookie ile purge atlanınca /tr/vkd Netlify 404 görünmeye devam ediyordu.)
 */
const PURGE_COOKIE = "__yekpare_sw_purged_v20260715c";
/**
 * HM + portal: bir kez daha agresif Clear-Site-Data.
 */
const FORCE_PURGE_HOSTS = new Set([
  "yekpare.net",
  "www.yekpare.net",
  "haberler.ahenkbt.workers.dev",
  "vatanhaber.net",
  "www.vatanhaber.net",
  "vatankahramanlari.org",
  "www.vatankahramanlari.org",
  "ankarasehirgazetesi.com",
  "www.ankarasehirgazetesi.com",
  "ankarahabergundemi.com",
  "www.ankarahabergundemi.com",
]);
const FORCE_PURGE_COOKIE = "__yekpare_sw_purged_hm_20260715d";

const PORTAL_HOSTS = new Set([
  "yekpare.net",
  "www.yekpare.net",
  "turknet.app",
  "www.turknet.app",
  "goalgo.org",
  "turkiye.li",
  "getirsepeti.com.tr",
  "ahenk.net.tr",
  "haberler.ahenkbt.workers.dev",
]);

/** Eski Netlify SW'yi öldürür; kendini de kaldırır. */
const KILL_SW = `/* yekpare-netlify-purge */
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_) {}
    try {
      await self.registration.unregister();
    } catch (_) {}
    try {
      const clientsList = await self.clients.matchAll({ type: 'window' });
      for (const c of clientsList) {
        try { c.navigate(c.url); } catch (_) {}
      }
    } catch (_) {}
  })());
});
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
`;

/** Tek seferlik SW unregister (+ gerektiğinde bir reload). Cookie ile tekrarlanmaz. */
function purgeBootScript(cookieName) {
  return `
<script>
(function () {
  if (!('serviceWorker' in navigator)) return;
  var done = false;
  var COOKIE = ${JSON.stringify(cookieName)};
  function hasPurgeCookie() {
    try {
      return document.cookie.split(';').some(function (c) {
        return c.trim().indexOf(COOKIE + '=1') === 0;
      });
    } catch (_) { return false; }
  }
  function purge() {
    if (done || hasPurgeCookie()) return;
    done = true;
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      return Promise.all(regs.map(function (r) { return r.unregister(); }));
    }).then(function () {
      if (!window.caches) return;
      return caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      });
    }).then(function () {
      try {
        // Netlify / eski HM cache anahtarlarını temizle
        var rm = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && (k.indexOf('nf_') === 0 || k.indexOf('netlify') !== -1)) rm.push(k);
        }
        rm.forEach(function (k) { localStorage.removeItem(k); });
      } catch (_) {}
      var u = new URL(location.href);
      if (!u.searchParams.has('_cf_purge')) {
        u.searchParams.set('_cf_purge', '1');
        location.replace(u.toString());
      }
    }).catch(function () {});
  }
  purge();
  try {
    navigator.serviceWorker.register = function () {
      return Promise.reject(new Error('sw-disabled-cf-render'));
    };
  } catch (_) {}
})();
</script>
`;
}

/**
 * Her HTML'de: yeni SW register engelle + kalan Netlify SW'yi unregister et.
 * Clear-Site-Data yapmaz (editör JWT korunur); sadece SW katmanını öldürür.
 */
const SW_BLOCK_BOOT = `
<script>
(function () {
  if (!('serviceWorker' in navigator)) return;
  try {
    navigator.serviceWorker.register = function () {
      return Promise.reject(new Error('sw-disabled-cf-render'));
    };
  } catch (_) {}
  navigator.serviceWorker.getRegistrations().then(function (regs) {
    if (!regs || !regs.length) return;
    return Promise.all(regs.map(function (r) { return r.unregister(); })).then(function () {
      if (!window.caches) return;
      return caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      });
    }).then(function () {
      // Kontrollü bir kez yenile — Netlify "Site not found" SW yanıtını düşür
      try {
        var u = new URL(location.href);
        if (!u.searchParams.has('_sw_kill')) {
          u.searchParams.set('_sw_kill', '1');
          location.replace(u.toString());
        }
      } catch (_) {}
    });
  }).catch(function () {});
})();
</script>
`;

function upstreamOrigin(env) {
  return String(env.API_ORIGIN || env.RENDER_API_ORIGIN || DEFAULT_API).replace(/\/+$/, "");
}

function isSwPath(pathname) {
  return (
    pathname === "/sw.js" ||
    pathname === "/yp/sw.js" ||
    pathname === "/yektube-v2/sw.js" ||
    pathname.endsWith("/sw.js")
  );
}

function cookieHas(request, name) {
  const raw = request.headers.get("cookie") || "";
  return new RegExp(`(?:^|;\\s*)${name}=1(?:;|$)`).test(raw);
}

function normalizeHost(host) {
  return String(host || "")
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "")
    .trim();
}

function needsForcePurge(hostname) {
  const h = String(hostname || "").toLowerCase().split(":")[0];
  return FORCE_PURGE_HOSTS.has(h) || FORCE_PURGE_HOSTS.has(h.replace(/^www\./, ""));
}

/** true → Clear-Site-Data + purge boot; false → atla */
function shouldOneShotPurge(request, hostname) {
  if (needsForcePurge(hostname)) {
    return !cookieHas(request, FORCE_PURGE_COOKIE);
  }
  return !cookieHas(request, PURGE_COOKIE);
}

function purgeCookieName(hostname) {
  return needsForcePurge(hostname) ? FORCE_PURGE_COOKIE : PURGE_COOKIE;
}

function isPortalHost(host) {
  const h = normalizeHost(host);
  if (!h) return true;
  if (PORTAL_HOSTS.has(h) || PORTAL_HOSTS.has(`www.${h}`)) return true;
  if (h.endsWith(".workers.dev") || h.endsWith(".vercel.app") || h.endsWith(".netlify.app")) return true;
  if (h === "localhost" || h === "127.0.0.1") return true;
  return false;
}

function rewriteHtml(html, { oneShotPurge, purgeCookie }) {
  let out = html;
  out = out.replace(
    /navigator\.serviceWorker\.register\s*\(\s*['`][^'"`]+['`]\s*\)[^;]*;?/g,
    "/* sw register stripped */;",
  );
  const boot = oneShotPurge ? purgeBootScript(purgeCookie) : SW_BLOCK_BOOT;
  if (out.includes("<head>")) {
    out = out.replace(
      "<head>",
      `<head>\n<meta name="x-yekpare-origin" content="cloudflare-render">\n${boot}`,
    );
  } else if (out.includes("<body")) {
    out = out.replace(/<body[^>]*>/, (m) => `${m}\n${boot}`);
  } else {
    out = boot + out;
  }
  return out;
}

function proxyInit(request, origin, incoming) {
  const headers = new Headers(request.headers);
  headers.set("host", new URL(origin).host);
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", "") || "https");
  headers.set("x-forwarded-for", request.headers.get("cf-connecting-ip") || "");
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ray");
  headers.delete("content-length");

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }
  return init;
}

/** Render henüz Site içi RSS hotfix’ini almadan vitrin boş kalmasın diye edge doldurma. */
const EDGE_RSS_CACHE_BASE = "https://edge-rss-cache.yekpare.internal/";

function decodeXmlEntities(raw) {
  return String(raw || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCharCode(Number(n));
      } catch {
        return "";
      }
    })
    .trim();
}

function xmlTag(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = String(block || "").match(re);
  return m ? decodeXmlEntities(m[1]) : "";
}

function xmlAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*/?>`, "i");
  const m = String(block || "").match(re);
  return m ? decodeXmlEntities(m[1]) : "";
}

function parseFeedEntries(xml) {
  const src = String(xml || "");
  const chunks = [];
  const entryRe = /<entry\b[\s\S]*?<\/entry>/gi;
  const itemRe = /<item\b[\s\S]*?<\/item>/gi;
  let m;
  while ((m = entryRe.exec(src))) chunks.push({ kind: "atom", body: m[0] });
  while ((m = itemRe.exec(src))) chunks.push({ kind: "rss", body: m[0] });
  const out = [];
  for (const chunk of chunks) {
    const body = chunk.body;
    let title = xmlTag(body, "title");
    let link =
      chunk.kind === "atom"
        ? xmlAttr(body, "link", "href") || xmlTag(body, "link")
        : xmlTag(body, "link") || xmlAttr(body, "link", "href");
    let id = xmlTag(body, "id") || xmlTag(body, "guid") || link;
    let spot = xmlTag(body, "summary") || xmlTag(body, "description") || xmlTag(body, "content");
    if (spot) spot = spot.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);
    let published =
      xmlTag(body, "published") ||
      xmlTag(body, "updated") ||
      xmlTag(body, "pubDate") ||
      new Date().toISOString();
    try {
      published = new Date(published).toISOString();
    } catch {
      published = new Date().toISOString();
    }
    const imageUrl =
      xmlAttr(body, "media:content", "url") ||
      xmlAttr(body, "media:thumbnail", "url") ||
      xmlAttr(body, "enclosure", "url") ||
      null;
    if (!title || !link) continue;
    if (!/^https?:\/\//i.test(link)) continue;
    out.push({ title, link, id, spot: spot || null, publishedAt: published, imageUrl });
  }
  return out;
}

async function sha1Hex(text) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(String(text || "")));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function cacheEdgeRssItem(item) {
  try {
    const id = String(item.id || "").replace(/^rss:/, "");
    if (!id) return;
    const req = new Request(`${EDGE_RSS_CACHE_BASE}${encodeURIComponent(id)}`);
    await caches.default.put(
      req,
      new Response(JSON.stringify(item), {
        headers: {
          "content-type": "application/json",
          "cache-control": "public, max-age=3600",
        },
      }),
    );
  } catch {
    /* ignore */
  }
}

async function readEdgeRssItem(itemId) {
  try {
    const id = String(itemId || "").replace(/^rss:/, "").trim();
    if (!id) return null;
    const hit = await caches.default.match(`${EDGE_RSS_CACHE_BASE}${encodeURIComponent(id)}`);
    if (!hit) return null;
    return await hit.json();
  } catch {
    return null;
  }
}

async function fetchSiteRssFeeds(origin, siteId, host) {
  const headers = { accept: "application/json" };
  let meta = null;
  if (host) {
    const r = await fetch(`${origin}/api/hm/meta/by-domain?domain=${encodeURIComponent(host)}`, {
      headers,
      cf: { cacheTtl: 60, cacheEverything: false },
    });
    if (r.ok) meta = await r.json().catch(() => null);
  }
  if (!meta || String(meta.id) !== String(siteId)) {
    // domain eşleşmezse bilinen host’lardan siteId yakala
    for (const d of [
      host,
      "vatanhaber.net",
      "ankarasehirgazetesi.com",
      "ankarahabergundemi.com",
      "vatankahramanlari.org",
    ].filter(Boolean)) {
      const r = await fetch(`${origin}/api/hm/meta/by-domain?domain=${encodeURIComponent(d)}`, {
        headers,
        cf: { cacheTtl: 120, cacheEverything: false },
      });
      if (!r.ok) continue;
      const row = await r.json().catch(() => null);
      if (row && String(row.id) === String(siteId)) {
        meta = row;
        break;
      }
    }
  }
  if (!meta || meta.layout?.hybridRssEnabled !== true) return [];
  const rows = Array.isArray(meta.layout?.hmNewsSiteRssFeedRows)
    ? meta.layout.hmNewsSiteRssFeedRows
    : [];
  const box = Array.isArray(meta.layout?.hmNewsBreakingRssFeedRows)
    ? meta.layout.hmNewsBreakingRssFeedRows
    : [];
  const merged = [...rows, ...box];
  const seen = new Set();
  const feeds = [];
  for (const row of merged) {
    const url = String(row?.url || "").trim();
    const localId = String(row?.id || row?.categoryKey || "feed").trim() || "feed";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const scope = rows.includes(row) ? "site" : "box";
    feeds.push({
      id: `hm-${siteId}-${scope}-${localId}`,
      label: String(row?.label || localId).trim() || localId,
      url,
      categorySlug: String(row?.categoryKey || row?.id || "gundem").trim() || "gundem",
    });
    if (feeds.length >= 10) break;
  }
  return feeds;
}

async function buildEdgeHybridRssItems(feeds, limit) {
  const items = [];
  const feedSlice = feeds.slice(0, 8);
  await Promise.all(
    feedSlice.map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
          cf: { cacheTtl: 300, cacheEverything: true },
        });
        if (!res.ok) return;
        const xml = await res.text();
        const entries = parseFeedEntries(xml).slice(0, 8);
        for (const entry of entries) {
          const rawId = await sha1Hex(`${feed.id}|${entry.link}|${entry.title}`);
          const hybrid = {
            id: `rss:${rawId}`,
            source: "rss",
            title: entry.title,
            slug: null,
            href: `/haberler/rss/${encodeURIComponent(rawId)}`,
            spot: entry.spot,
            content: null,
            imageUrl: entry.imageUrl,
            categorySlug: feed.categorySlug,
            categoryName: feed.label,
            categoryColor: "#CC0000",
            externalUrl: entry.link,
            rssSourceUrl: entry.link,
            originUrl: entry.link,
            sourceSiteUrl: null,
            publishedOnSiteId: null,
            sourceSiteSlug: null,
            publishedAt: entry.publishedAt,
            feedId: feed.id,
            feedLabel: feed.label,
            authorName: feed.label,
            isFeatured: false,
            isBreaking: false,
            views: 0,
            _edgeRss: true,
            link: entry.link,
          };
          items.push(hybrid);
          await cacheEdgeRssItem(hybrid);
        }
      } catch {
        /* feed fail ok */
      }
    }),
  );
  items.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  return items.slice(0, Math.max(1, limit));
}

function isHybridListPath(pathname) {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p === "/api/news/hybrid";
}

function hybridRssDetailId(pathname) {
  const p = pathname.replace(/\/+$/, "") || "/";
  const m = p.match(/^\/api\/news\/hybrid\/rss\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function maybeServeEdgeRssDetail(request, incoming, upstream) {
  const itemId = hybridRssDetailId(incoming.pathname);
  if (!itemId || request.method !== "GET") return null;
  const cached = await readEdgeRssItem(itemId);
  if (!cached) return null;
  // Upstream 404/502 ise edge önbellekten servis et
  if (upstream && upstream.status >= 200 && upstream.status < 400) {
    try {
      const data = await upstream.clone().json();
      if (data && (data.item || data.id || data.title)) return null;
    } catch {
      /* fall through to edge */
    }
  }
  return new Response(JSON.stringify({ item: cached, ...cached, edgeRss: true }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=120",
      "x-yekpare-frontend": "cloudflare-render-proxy",
      "x-yekpare-edge-rss": "detail",
    },
  });
}

async function maybeEnrichHybridRss(request, env, incoming, upstream) {
  if (request.method !== "GET" || !isHybridListPath(incoming.pathname)) return null;
  if (!upstream || !upstream.ok) return null;
  const ct = String(upstream.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("json")) return null;

  let data;
  try {
    data = await upstream.clone().json();
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;

  const rssCount = Number(data.sources?.rss || 0);
  if (rssCount > 0) return null;
  if (data.hybridRssEnabled === false) return null;

  const siteIdRaw = incoming.searchParams.get("siteId");
  const siteId = siteIdRaw ? Number(siteIdRaw) : NaN;
  if (!Number.isFinite(siteId) || siteId <= 0) return null;

  const rssOnly = ["1", "true", "yes"].includes(String(incoming.searchParams.get("rssOnly") || "").toLowerCase());
  const limit = Math.min(60, Math.max(5, Number(incoming.searchParams.get("limit") || 30) || 30));
  const origin = upstreamOrigin(env);
  const host = String(incoming.hostname || "").toLowerCase();

  const feeds = await fetchSiteRssFeeds(origin, siteId, host);
  if (!feeds.length) return null;
  const rssItems = await buildEdgeHybridRssItems(feeds, limit);
  if (!rssItems.length) return null;

  const existing = Array.isArray(data.items) ? data.items : [];
  const withoutRss = existing.filter((row) => row?.source !== "rss" && !String(row?.id || "").startsWith("rss:"));
  const mergedItems = rssOnly ? rssItems : [...rssItems, ...withoutRss].slice(0, limit);

  const outBody = {
    ...data,
    items: mergedItems,
    sources: {
      db: Number(data.sources?.db || withoutRss.length || 0),
      rss: rssItems.length,
    },
    edgeRssFilled: true,
    rssIntegrationMode: data.rssIntegrationMode || "edge",
    hybridRssEnabled: true,
  };

  const headers = new Headers(upstream.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-yekpare-frontend", "cloudflare-render-proxy");
  headers.set("x-yekpare-edge-rss", "filled");
  headers.set("x-yekpare-upstream", origin);
  headers.delete("content-length");
  return new Response(JSON.stringify(outBody), { status: 200, headers });
}

/**
 * Edge soft-redirect: HM özel alan kökü → /tr/{slug}
 * (Vercel middleware CF Worker yolunda çalışmadığı için Worker'da tekrarlanır.)
 */
async function redirectHmCustomDomainRoot(request, env, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const path = incoming.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/") return null;
  if (isPortalHost(incoming.hostname)) return null;

  const origin = upstreamOrigin(env);
  const domain = incoming.hostname.toLowerCase();
  try {
    const metaRes = await fetch(
      `${origin}/api/hm/meta/by-domain?domain=${encodeURIComponent(domain)}`,
      {
        headers: {
          accept: "application/json",
          "x-forwarded-host": incoming.host,
          "x-forwarded-proto": "https",
        },
        cf: { cacheTtl: 60, cacheEverything: false },
      },
    );
    if (!metaRes.ok) return null;
    const meta = await metaRes.json().catch(() => null);
    const slug = String(meta?.slug || "").trim();
    if (!slug) return null;
    const loc = `${incoming.origin}/tr/${encodeURIComponent(slug)}`;
    const headers = {
      location: loc,
      "cache-control": "no-store",
      "cdn-cache-control": "no-store",
      "x-yekpare-frontend": "cloudflare-render-proxy",
      "x-yekpare-hm-redirect": slug,
    };
    // HM alanlarında 308: cookie işaretle (Clear-Site-Data YOK —
    // Chrome document navigasyonunda ERR_FAILED üretebiliyor).
    if (needsForcePurge(incoming.hostname) && !cookieHas(request, FORCE_PURGE_COOKIE)) {
      headers["set-cookie"] =
        `${FORCE_PURGE_COOKIE}=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax`;
      headers["x-yekpare-purge"] = "hm-force-redirect";
    }
    return new Response(null, { status: 308, headers });
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);

    if (isSwPath(incoming.pathname)) {
      return new Response(KILL_SW, {
        status: 200,
        headers: {
          "content-type": "application/javascript; charset=utf-8",
          "cache-control": "no-store, max-age=0, must-revalidate",
          "x-yekpare-frontend": "cloudflare-render-proxy",
          "x-yekpare-sw": "kill-switch",
        },
      });
    }

    const hmRedirect = await redirectHmCustomDomainRoot(request, env, incoming);
    if (hmRedirect) return hmRedirect;

    const origin = upstreamOrigin(env);
    const target = new URL(incoming.pathname + incoming.search, origin);
    const oneShotPurge = shouldOneShotPurge(request, incoming.hostname);
    const purgeCookie = purgeCookieName(incoming.hostname);

    try {
      // Edge cache (varsa) bu istek için bypass
      const upstream = await fetch(target.toString(), {
        ...proxyInit(request, origin, incoming),
        cf: { cacheTtl: 0, cacheEverything: false },
      });

      const edgeDetail = await maybeServeEdgeRssDetail(request, incoming, upstream);
      if (edgeDetail) return edgeDetail;

      const edgeHybrid = await maybeEnrichHybridRss(request, env, incoming, upstream);
      if (edgeHybrid) return edgeHybrid;

      const out = new Headers(upstream.headers);
      out.delete("content-encoding");
      out.delete("transfer-encoding");
      out.set("x-yekpare-frontend", "cloudflare-render-proxy");
      out.set("x-yekpare-upstream", origin);
      out.set("cdn-cache-control", "no-store");

      const ct = String(out.get("content-type") || "").toLowerCase();
      if (ct.includes("text/html")) {
        out.set("cache-control", "no-store, max-age=0, must-revalidate");
        // Eski Netlify SW temizliği: yalnızca JS boot + cookie.
        // Clear-Site-Data HTML navigasyonunda Chrome'da ERR_FAILED yapabiliyor
        // (özellikle /admin); cookie de yazılamadan döngü oluşuyor.
        if (oneShotPurge) {
          out.append(
            "set-cookie",
            `${purgeCookie}=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax`,
          );
          out.set(
            "x-yekpare-purge",
            needsForcePurge(incoming.hostname) ? "hm-force-once" : "netlify-sw-once",
          );
        } else {
          out.set("x-yekpare-purge", "skipped");
        }
        if (request.method === "HEAD") {
          return new Response(null, { status: upstream.status, headers: out });
        }
        const html = await upstream.text();
        return new Response(rewriteHtml(html, { oneShotPurge, purgeCookie }), {
          status: upstream.status,
          headers: out,
        });
      }

      return new Response(upstream.body, { status: upstream.status, headers: out });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "render_upstream_unavailable",
          detail: String(err?.message || err),
          upstream: origin,
        }),
        {
          status: 502,
          headers: {
            "content-type": "application/json",
            "x-yekpare-frontend": "cloudflare-render-proxy",
          },
        },
      );
    }
  },
};
