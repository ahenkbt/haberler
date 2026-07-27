/**
 * Render API gecikmeli olsa bile: editör haber sitelerinde
 * - başka sitenin / merkez sync manuel haberleri sızmasın
 * - 12 saatten eski DB haberleri public vitrinde düşsün
 *
 * Havuz onaylı yerel kopyalar (site_id = istenen site) geçer.
 */

const MAX_AGE_MS = 12 * 60 * 60 * 1000;

function parseSiteId(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function itemAgeMs(item) {
  const raw = item?.createdAt ?? item?.publishedAt ?? item?.date ?? null;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? Date.now() - t : null;
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

/** Public vitrin satırı bu editör sitesinde görünür mü? */
export function hmPublicNewsItemAllowed(item, siteId) {
  if (!item || siteId == null) return false;
  const sid = item.siteId ?? item.publishedOnSiteId ?? null;
  const rss = String(item.rssSourceUrl ?? "").trim();
  const manual = item.isEditorManual === true || item.siteOnly === true;

  // Kesin: başka sitenin yerel satırı yok.
  if (sid != null && Number(sid) !== Number(siteId)) return false;

  // Merkez sync — yalnızca kaynak sitede (havuz onayı ayrı yerel satır).
  if (isYekpareSyncRef(rss)) {
    const origin = syncOriginSiteId(rss);
    if (origin != null && Number(origin) !== Number(siteId)) return false;
    // Kaynak sitede bile merkez kopya yerine yerel satır tercih; merkez sync'i gizle.
    if (sid == null) return false;
  }

  // site_id NULL merkez satır: manuel ise asla; pool ref değilse editör sitesinde gösterme.
  if (sid == null) {
    if (manual) return false;
    if (isYekparePoolRef(rss)) return false;
    // Eski merkez RSS sızıntısı — editör sitesi public vitrinde yok.
    return false;
  }

  // 12 saat tazelik (DB/manuel; RSS hybrid ayrı bandda kalabilir ama DB listelerinde uygula)
  const age = itemAgeMs(item);
  if (age != null && age > MAX_AGE_MS) return false;

  return Number(sid) === Number(siteId);
}

function filterItemArray(items, siteId) {
  if (!Array.isArray(items)) return items;
  return items.filter((item) => hmPublicNewsItemAllowed(item, siteId));
}

function filterHomeBundle(payload, siteId) {
  if (!payload || typeof payload !== "object") return payload;
  const next = { ...payload, siteId: payload.siteId ?? siteId };
  for (const key of ["featured", "manualEditor", "centerHeadlines", "breaking", "popular"]) {
    if (Array.isArray(payload[key])) next[key] = filterItemArray(payload[key], siteId);
  }
  return next;
}

function filterNewsListPayload(payload, siteId) {
  if (!payload || typeof payload !== "object") return payload;
  const next = { ...payload };
  if (Array.isArray(payload.items)) {
    next.items = filterItemArray(payload.items, siteId);
    if (typeof payload.total === "number") next.total = next.items.length;
  }
  if (Array.isArray(payload.news)) next.news = filterItemArray(payload.news, siteId);
  if (Array.isArray(payload.data)) next.data = filterItemArray(payload.data, siteId);
  return next;
}

/**
 * Upstream JSON yanıtını site izolasyonu + 12s ile süzer.
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

    const text = await upstream.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return new Response(text, { status: upstream.status, headers: outHeaders });
    }

    const filtered = isHomeBundle ? filterHomeBundle(payload, siteId) : filterNewsListPayload(payload, siteId);
    outHeaders.set("x-yekpare-hm-news-edge-filter", "site-isolation-12h");
    outHeaders.set("cache-control", "private, no-store, max-age=0, must-revalidate");
    outHeaders.set("cdn-cache-control", "no-store");
    return new Response(JSON.stringify(filtered), {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch (err) {
    console.error("[hm-public-news-edge-filter]", String(err?.message || err).slice(0, 200));
    // Body tüketilmiş olabilir — fail-open için üst katmanda yeniden çekilmez; null dönme.
    return null;
  }
}
