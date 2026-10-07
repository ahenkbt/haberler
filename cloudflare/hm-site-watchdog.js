/**
 * Haber siteleri sağlık bekçisi (PBX AI Bekçi benzeri, salt okunur + hafif onarım).
 * Cron: Worker scheduled → probe siteler + API.
 * GET  /api/hm/admin/site-watchdog
 * POST /api/hm/admin/site-watchdog/run
 * POST /api/hm/admin/site-watchdog/sync-site  { siteId }
 */
import { neonSqlClient, neonNewsSqlClient, shouldEdgeDualWriteNewsDb } from "./neon-edge-db.js";
import { syncSiteToPhpNeon } from "./hm-php-neon-sync-edge.js";
import {
  loadPanelSession,
  readCookie,
  sessionGrantsHmSites,
  unsignConnectSid,
} from "./hm-admin-site-edge.js";

const KV_KEY = "hm-site-watchdog:last";

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      "x-yekpare-frontend": "cloudflare-hm-site-watchdog",
    },
  });
}

async function requireAdmin(request, env) {
  const secret = String(env?.SESSION_SECRET || "").trim();
  if (!secret) return { error: jsonResponse(503, { ok: false, error: "SESSION_SECRET yok" }) };
  const sid = await unsignConnectSid(readCookie(request.headers.get("cookie"), "connect.sid"), secret);
  if (!sid) return { error: jsonResponse(401, { ok: false, error: "Yönetici girişi gerekli" }) };
  let sess;
  try {
    ({ sess } = await loadPanelSession(env, sid));
  } catch {
    return { error: jsonResponse(503, { ok: false, error: "Oturum okunamadı" }) };
  }
  if (!sess || sess.panelBootstrap !== true) {
    return { error: jsonResponse(401, { ok: false, error: "Yönetici girişi gerekli" }) };
  }
  if (!sessionGrantsHmSites(sess)) {
    return { error: jsonResponse(403, { ok: false, error: "Yetki yok" }) };
  }
  return { sess };
}

async function probeUrl(url, ms = 8000) {
  const started = Date.now();
  try {
    const res = await Promise.race([
      fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { "user-agent": "yekpare-hm-watchdog/1.0" },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);
    const msTaken = Date.now() - started;
    const ok = res && res.status >= 200 && res.status < 500;
    return {
      url,
      status: res?.status ?? 0,
      ms: msTaken,
      ok: Boolean(ok && res.status < 400),
      header: String(res?.headers?.get("x-yekpare-frontend") || "").slice(0, 80),
    };
  } catch (err) {
    return {
      url,
      status: 0,
      ms: Date.now() - started,
      ok: false,
      error: String(err?.message || err).slice(0, 120),
    };
  }
}

function hostOf(site) {
  const raw = String(site.domain || site.domain2 || site.domain3 || "").trim();
  return raw
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .replace(/^www\./i, "")
    .toLowerCase();
}

export async function runHmSiteWatchdog(env, opts = {}) {
  const sql = neonSqlClient(env);
  const newsSql = shouldEdgeDualWriteNewsDb(env) ? neonNewsSqlClient(env) : null;
  const startedAt = new Date().toISOString();
  const issues = [];
  const sites = [];

  const apiLive = await probeUrl("https://ahenk.net.tr/api/healthz/live", 6000);
  const apiFull = await probeUrl("https://ahenk.net.tr/api/healthz", 10000);
  if (!apiLive.ok) issues.push({ kind: "api", severity: "high", message: "ahenk.net.tr /api/healthz/live yanıt vermiyor" });
  if (!apiFull.ok) issues.push({ kind: "api", severity: "high", message: "ahenk.net.tr /api/healthz zaman aşımı veya hata (Sunucu hatası buradan gelir)" });

  const dualWriteReady = Boolean(newsSql && shouldEdgeDualWriteNewsDb(env));
  if (!dualWriteReady) {
    issues.push({
      kind: "db",
      severity: "high",
      message: "PHP Neon dual-write kapalı: NEWS_DATABASE_URL / NEWS_DB_WRITE kontrol edin (panel≠site DB)",
    });
  }

  let rows = [];
  if (sql) {
    try {
      rows = await sql`
        SELECT id, slug, name, domain, domain2, domain3, active
        FROM hm_news_sites
        WHERE active IS DISTINCT FROM false
        ORDER BY id ASC
        LIMIT 40
      `;
    } catch (err) {
      issues.push({ kind: "db", severity: "high", message: `Worker Neon okunamadı: ${String(err?.message || err).slice(0, 100)}` });
    }
  } else {
    issues.push({ kind: "db", severity: "high", message: "DATABASE_URL kenarda yok" });
  }

  const maxSites = Math.min(asPositiveLimit(opts.limit) || 12, 24);
  for (const site of (rows || []).slice(0, maxSites)) {
    const host = hostOf(site);
    if (!host) continue;
    const home = await probeUrl(`https://${host}/`, 9000);
    const editor = await probeUrl(`https://${host}/editor/giris`, 9000);
    const kose = await probeUrl(`https://${host}/koseyazari/giris`, 9000);
    const siteIssues = [];
    if (!home.ok) siteIssues.push("anasayfa açılmıyor");
    if (!editor.ok) siteIssues.push("editör girişi açılmıyor");
    if (!kose.ok) siteIssues.push("köşe yazarı girişi açılmıyor");
    if (home.ms > 5000) siteIssues.push(`yavaş anasayfa (${home.ms}ms)`);
    for (const msg of siteIssues) {
      issues.push({
        kind: "site",
        severity: home.ok ? "medium" : "high",
        siteId: site.id,
        slug: site.slug,
        message: `${site.name || site.slug}: ${msg}`,
      });
    }
    sites.push({
      id: site.id,
      slug: site.slug,
      name: site.name,
      host,
      home,
      editor,
      kose,
      ok: siteIssues.length === 0,
    });
  }

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    dualWriteReady,
    api: { live: apiLive, healthz: apiFull },
    sites,
    issues,
    healthy: issues.filter((i) => i.severity === "high").length === 0,
  };

  try {
    if (env?.HM_EDGE_CACHE?.put) {
      await env.HM_EDGE_CACHE.put(KV_KEY, JSON.stringify(report), { expirationTtl: 60 * 60 * 6 });
    }
  } catch {
    /* kv optional */
  }

  return report;
}

function asPositiveLimit(v) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

async function readLastReport(env) {
  try {
    if (env?.HM_EDGE_CACHE?.get) {
      const raw = await env.HM_EDGE_CACHE.get(KV_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function handleHmSiteWatchdogEdge(request, env, incoming) {
  const method = String(request.method || "GET").toUpperCase();
  const path = String(incoming?.pathname || "").replace(/\/+$/, "") || "/";

  if (path === "/api/hm/admin/site-watchdog" && method === "GET") {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const last = await readLastReport(env);
    return jsonResponse(200, { ok: true, last, dualWriteReady: shouldEdgeDualWriteNewsDb(env) });
  }

  if (path === "/api/hm/admin/site-watchdog/run" && method === "POST") {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const report = await runHmSiteWatchdog(env, {});
    return jsonResponse(200, { ok: true, report });
  }

  if (path === "/api/hm/admin/site-watchdog/sync-site" && method === "POST") {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const siteId = asPositiveLimit(body?.siteId ?? body?.site_id);
    if (!siteId) return jsonResponse(400, { ok: false, error: "siteId gerekli" });
    const result = await syncSiteToPhpNeon(env, siteId, { limit: body?.limit || 120 });
    return jsonResponse(200, { ok: true, ...result });
  }

  return null;
}
