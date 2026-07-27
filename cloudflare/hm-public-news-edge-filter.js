/**
 * Render API gecikmeli olsa bile: editör haber sitelerinde
 * - başka sitenin manuel / sync haberleri sızmasın
 * - site_only / is_editor_manual yabancı satırlar düşsün
 *
 * Kategori kutusu (categorySlug) isteklerinde canlı RSS (site_id null) kalabilir —
 * aksi halde SPOR vb. kutular boşalıp yanlış backfill'e yol açıyordu.
 */

function parseSiteId(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isYekpareSyncRef(url) {
  return /^yekpare-hm-sync:\d+:/.test(String(url ?? "").trim());
}

function isYekparePoolRef(url) {
  return /^yekpare-hm-pool:\d+:/.test(String(url ?? "").trim());
}

function syncOriginSiteId(url) {
  const m = String(url ?? "").trim().match(/^yekpare-hm-sync:(\d+):/);
  return m ? Number(m[1]) : null;
}

function isLiveRssRow(item) {
  const source = String(item?.source ?? "").trim().toLowerCase();
  if (source === "rss") return true;
  const rss = String(item?.rssSourceUrl ?? "").trim();
  if (!rss) return false;
  if (isYekpareSyncRef(rss) || isYekparePoolRef(rss)) return false;
  return /^https?:\/\//i.test(rss);
}

/**
 * @param {object} item
 * @param {number} siteId
 * @param {{ allowCentralRss?: boolean }} [opts]
 */
export function hmPublicNewsItemAllowed(item, siteId, opts = {}) {
  if (!item || siteId == null) return false;
  const sid = item.siteId ?? item.publishedOnSiteId ?? null;
  const rss = String(item.rssSourceUrl ?? "").trim();
  const manual = item.isEditorManual === true || item.siteOnly === true;
  const allowCentralRss = opts.allowCentralRss === true;

  // Kesin: başka sitenin yerel satırı yok.
  if (sid != null && Number(sid) !== Number(siteId)) return false;

  // Merkez sync — yabancı kaynak asla; null site_id sync kopyası da yok.
  if (isYekpareSyncRef(rss)) {
    const origin = syncOriginSiteId(rss);
    if (origin != null && Number(origin) !== Number(siteId)) return false;
    if (sid == null) return false;
  }

  if (sid == null) {
    if (manual) return false;
    if (isYekparePoolRef(rss)) return false;
    // Kategori kutusu / hybrid: canlı RSS (API zaten categorySlug ile süzdü) kalsın.
    if (allowCentralRss && isLiveRssRow(item)) return true;
    return false;
  }

  // Bu sitenin satırı — manuel dahil (yalnızca kendi site_id'si).
  return Number(sid) === Number(siteId);
}

function filterItemArray(items, siteId, opts) {
  if (!Array.isArray(items)) return items;
  return items.filter((item) => hmPublicNewsItemAllowed(item, siteId, opts));
}

function filterHomeBundle(payload, siteId) {
  if (!payload || typeof payload !== "object") return payload;
  const next = { ...payload, siteId: payload.siteId ?? siteId };
  const opts = { allowCentralRss: false };
  for (const key of ["featured", "manualEditor", "centerHeadlines", "breaking", "popular"]) {
    if (Array.isArray(payload[key])) next[key] = filterItemArray(payload[key], siteId, opts);
  }
  return next;
}

function filterNewsListPayload(payload, siteId, opts) {
  if (!payload || typeof payload !== "object") return payload;
  const next = { ...payload };
  if (Array.isArray(payload.items)) {
    next.items = filterItemArray(payload.items, siteId, opts);
    if (typeof payload.total === "number") next.total = next.items.length;
  }
  if (Array.isArray(payload.news)) next.news = filterItemArray(payload.news, siteId, opts);
  if (Array.isArray(payload.data)) next.data = filterItemArray(payload.data, siteId, opts);
  return next;
}

/**
 * Upstream JSON yanıtını site izolasyonu ile süzer.
 * @returns {Response|null} null = dokunma
 */
export async function maybeFilterHmPublicNewsUpstream(incoming, upstream, outHeaders) {
  try {
    const path = String(incoming.pathname || "").replace(/\/+$/, "") || "/";
    const method = String(incoming.method || "GET").toUpperCase();
    if (method !== "GET") return null;
    if (!(upstream?.ok || upstream?.status === 200)) return null;

    const ct = String(outHeaders.get("content-type") || upstream.headers?.get?.("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) return null;

    const siteId =
      parseSiteId(incoming.searchParams.get("siteId")) ||
      parseSiteId(incoming.searchParams.get("site_id"));
    if (!siteId) return null;

    const isHomeBundle = path === "/api/hm/home-bundle";
    const isNewsList =
      path === "/api/news" ||
      path === "/api/news/hybrid" ||
      path === "/api/news/featured" ||
      path === "/api/news/breaking" ||
      path === "/api/news/hybrid/infinite";
    if (!isHomeBundle && !isNewsList) return null;

    const categorySlug = String(incoming.searchParams.get("categorySlug") || incoming.searchParams.get("category") || "")
      .trim()
      .toLowerCase();
    // Kategori kutusu çekiminde canlı RSS'e izin ver (SPOR vb.).
    const allowCentralRss = Boolean(categorySlug) || path === "/api/news/hybrid" || path === "/api/news/hybrid/infinite";

    const text = await upstream.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return new Response(text, { status: upstream.status, headers: outHeaders });
    }

    const opts = { allowCentralRss };
    const filtered = isHomeBundle ? filterHomeBundle(payload, siteId) : filterNewsListPayload(payload, siteId, opts);
    outHeaders.set("x-yekpare-hm-news-edge-filter", allowCentralRss ? "site-isolation+rss" : "site-isolation");
    outHeaders.set("cache-control", "private, no-store, max-age=0, must-revalidate");
    outHeaders.set("cdn-cache-control", "no-store");
    return new Response(JSON.stringify(filtered), {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch (err) {
    console.error("[hm-public-news-edge-filter]", String(err?.message || err).slice(0, 200));
    return null;
  }
}
