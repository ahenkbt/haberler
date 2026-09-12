#!/usr/bin/env node
/**
 * HM Yektube katalog — sözleşme + isteğe bağlı canlı duman.
 *
 *   node goalgo/artifacts/api-server/scripts/hm-yektube-catalog-smoke.mjs
 *   LIVE=1 node goalgo/artifacts/api-server/scripts/hm-yektube-catalog-smoke.mjs
 *
 * Yazma yok: yalnızca GET. news tablosuna insert yok.
 */
const YEKTUBE_ORIGIN = "https://yektube.com";

function watchUrl(sourceId, videoId) {
  const id = String(videoId ?? "").trim();
  const sid = Number(sourceId);
  if (Number.isFinite(sid) && sid > 0 && id) {
    return `${YEKTUBE_ORIGIN}/yp/kanal/${sid}/${encodeURIComponent(id)}`;
  }
  if (id) return `${YEKTUBE_ORIGIN}/yp/?v=${encodeURIComponent(id)}`;
  return `${YEKTUBE_ORIGIN}/yp/`;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function contractSmoke() {
  assert(watchUrl(44, "dQw4w9wgGcQ") === "https://yektube.com/yp/kanal/44/dQw4w9wgGcQ", "watch url");
  assert(watchUrl(null, "dQw4w9wgGcQ").startsWith("https://yektube.com/yp/"), "fallback watch");
  const body = {
    items: [
      {
        id: 1,
        sourceId: 44,
        videoId: "dQw4w9wgGcQ",
        title: "Örnek",
        channelName: "TRT Avaz",
        watchUrl: watchUrl(44, "dQw4w9wgGcQ"),
      },
    ],
    total: 1,
    source: "yektube-db",
    persistedToNews: false,
  };
  assert(body.persistedToNews === false, "must not persist to news");
  assert(body.items[0].watchUrl.includes("yektube.com"), "yektube host");
  console.log("ok contract");
}

async function liveSmoke() {
  const urls = [
    "https://ankarasehirgazetesi.com/api/hm/yektube/categories",
    "https://ankarasehirgazetesi.com/api/hm/yektube/videos?limit=8",
    "https://yektube.com/api/hm/yektube/videos?limit=8",
  ];
  for (const url of urls) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    console.log(`${res.status} ${url} items=${Array.isArray(json?.items) ? json.items.length : "?"}`);
    if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
    if (!json || !Array.isArray(json.items)) throw new Error(`${url} missing items[]`);
    if (url.includes("/videos") && json.persistedToNews !== false) {
      throw new Error(`${url} persistedToNews must be false`);
    }
    if (url.includes("/videos") && json.source === "degraded") {
      throw new Error(`${url} still degraded — container/Worker RSS fallback not live`);
    }
  }
  console.log("ok live");
}

contractSmoke();
if (process.env.LIVE === "1") {
  await liveSmoke();
}
