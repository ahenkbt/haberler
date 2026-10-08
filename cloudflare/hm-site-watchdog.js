/**
 * Haber siteleri sağlık bekçisi (PBX AI Bekçi benzeri, salt okunur + hafif onarım).
 * Cron: Worker scheduled → probe siteler + API.
 * GET  /api/hm/admin/site-watchdog
 * POST /api/hm/admin/site-watchdog/run
 * POST /api/hm/admin/site-watchdog/sync-site  { siteId }
 * POST /api/hm/admin/site-watchdog/sync-all   { limit? }
 *
 * Önemli: PHP Neon eşitleme ≠ HTTP probe. Self-fetch aynı Worker rotasına
 * gidince Cloudflare origin'e düşer — PHP temada /editor SPA 404 (yanlış kritik).
 */
import { neonSqlClient, neonNewsSqlClient, shouldEdgeDualWriteNewsDb } from "./neon-edge-db.js";
import { fetchApi, resolveApiOrigin } from "./api-upstream.js";
import { syncSiteToPhpNeon } from "./hm-php-neon-sync-edge.js";
import {
  loadPanelSession,
  readCookie,
  sessionGrantsHmSites,
  unsignConnectSid,
} from "./hm-admin-site-edge.js";
import { handleEdgeHealthzLive } from "./hm-edge-healthz.js";
import {
  isPhpCorporateThemeHost,
  isPhpThemePublicHost,
} from "./php-theme-legacy-redirect.js";

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
    const status = res?.status ?? 0;
    const header = String(res?.headers?.get("x-yekpare-frontend") || "").slice(0, 80);
    const ok = status >= 200 && status < 400;
    return {
      url,
      status,
      ms: msTaken,
      ok,
      header,
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

/** Container healthz — public fetch değil (self-fetch origin/cold FAIL). */
async function probeContainerHealthz(env, origin, ms = 8000) {
  const url = `${origin}/api/healthz`;
  const started = Date.now();
  try {
    const res = await Promise.race([
      fetchApi(env, url, {
        method: "GET",
        headers: { "user-agent": "yekpare-hm-watchdog/1.0" },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);
    const status = res?.status ?? 0;
    return {
      url,
      status,
      ms: Date.now() - started,
      ok: status >= 200 && status < 400,
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

/**
 * Kenar /api/healthz/live — Worker içinde doğrudan handler.
 * Public fetch aynı zone'da origin/Container'a düşer ve soğukken FAIL eder;
 * panel ise kenardan 200 alır.
 */
async function probeEdgeLive(env, origin) {
  const url = `${origin}/api/healthz/live`;
  const started = Date.now();
  try {
    const res = await handleEdgeHealthzLive(
      new Request(url, { method: "GET", headers: { "user-agent": "yekpare-hm-watchdog/1.0" } }),
      env,
      null,
    );
    if (!res) {
      return { url, status: 0, ms: Date.now() - started, ok: false, error: "edge handler yok" };
    }
    return {
      url,
      status: res.status,
      ms: Date.now() - started,
      ok: res.status >= 200 && res.status < 400,
      header: String(res.headers?.get("x-yekpare-frontend") || "").slice(0, 80),
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

function siteDisplayName(site) {
  return String(site.name || site.display_name || site.slug || "").trim() || `site-${site.id}`;
}

/**
 * PHP tema origin'de /editor SPA yok (Worker rotası). Self-fetch origin 404 verir;
 * tarayıcı Cloudflare üzerinden 200 alır. Köşe yazarı PHP'de de olabilir.
 */
export function siteProbePaths(host) {
  const h = String(host || "").toLowerCase();
  const phpTheme = isPhpThemePublicHost(h);
  return {
    home: `https://${h}/`,
    // PHP temada editor Worker-only; probe yine /editor/giris (dışarıdan 200),
    // classifySiteProbeIssues origin 404'ü soft sayar.
    editor: `https://${h}/editor/giris`,
    kose: `https://${h}/koseyazari/giris`,
    phpTheme,
    corporate: isPhpCorporateThemeHost(h),
  };
}

/**
 * @param {{ home?: {ok?:boolean,status?:number,ms?:number}, editor?: {ok?:boolean,status?:number}, kose?: {ok?:boolean,status?:number}, phpTheme?: boolean, corporate?: boolean, dualWriteReady?: boolean }} p
 * @returns {{ hard: string[], soft: string[] }}
 */
export function classifySiteProbeIssues(p = {}) {
  const hard = [];
  const soft = [];
  const homeOk = Boolean(p.home?.ok);
  const editorOk = Boolean(p.editor?.ok);
  const koseOk = Boolean(p.kose?.ok);
  const phpTheme = Boolean(p.phpTheme);
  const corporate = Boolean(p.corporate);
  const dualWriteReady = Boolean(p.dualWriteReady);

  if (corporate && !homeOk) {
    soft.push(
      "Hostinger php-kurumsal yüklenmemiş veya origin yanıt vermiyor (hostinger/php-kurumsal/DEPLOY.md); /editor Worker’da kalır — haber twin’leri etkilenmez",
    );
    return { hard, soft };
  }

  if (!homeOk) hard.push("anasayfa açılmıyor");

  if (!editorOk) {
    const editor404 = Number(p.editor?.status) === 404;
    // PHP tema: Worker self-fetch origin'e düşer → /editor 404; home 200 + dual-write ise soft.
    if (phpTheme && editor404 && homeOk && dualWriteReady) {
      soft.push(
        "editör /editor/giris kenar self-fetch’te origin 404 (SPA Worker rotası; tarayıcıda açılır) — eşitleme ile ilgili değil",
      );
    } else if (phpTheme && editor404 && homeOk) {
      soft.push(
        "editör /editor/giris kenar self-fetch’te origin 404 (SPA Worker rotası; tarayıcıda açılır)",
      );
    } else {
      hard.push("editör girişi açılmıyor");
    }
  }

  if (!koseOk) {
    if (phpTheme && homeOk && Number(p.kose?.status) === 404) {
      soft.push("köşe yazarı girişi origin’de yok veya Worker rotası self-fetch 404");
    } else {
      hard.push("köşe yazarı girişi açılmıyor");
    }
  }

  if (homeOk && Number(p.home?.ms) > 5000) {
    soft.push(`yavaş anasayfa (${p.home.ms}ms)`);
  }

  return { hard, soft };
}

/**
 * hm_news_sites.display_name (şemada `name` kolonu yok).
 * @returns {Promise<Array<{id:number,slug:string,name:string,domain?:string,domain2?:string,domain3?:string,active?:boolean}>>}
 */
export async function listActiveHmSites(sql) {
  if (!sql) return [];
  const rows = await sql`
    SELECT id, slug, display_name, domain, domain2, domain3, active
    FROM hm_news_sites
    WHERE active IS DISTINCT FROM false
    ORDER BY id ASC
    LIMIT 40
  `;
  return (rows || []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: String(row.display_name || row.slug || "").trim(),
    domain: row.domain,
    domain2: row.domain2,
    domain3: row.domain3,
    active: row.active,
  }));
}

export async function runHmSiteWatchdog(env, opts = {}) {
  const sql = neonSqlClient(env);
  const newsSql = shouldEdgeDualWriteNewsDb(env) ? neonNewsSqlClient(env) : null;
  const startedAt = new Date().toISOString();
  const issues = [];
  const sites = [];
  const origin = resolveApiOrigin(env) || "https://ahenk.net.tr";

  const [apiLive, apiFull] = await Promise.all([
    probeEdgeLive(env, origin),
    probeContainerHealthz(env, origin, 8000),
  ]);

  if (!apiLive.ok) {
    issues.push({
      kind: "api",
      severity: "high",
      message: `${origin.replace(/^https?:\/\//, "")} /api/healthz/live kenar handler yanıt vermiyor`,
    });
  }
  // Full healthz Container'a gider — soğuk başlangıç uyarısı (live OK ise panel çalışır).
  if (!apiFull.ok) {
    issues.push({
      kind: "api",
      severity: apiLive.ok ? "medium" : "high",
      message: apiLive.ok
        ? `${origin.replace(/^https?:\/\//, "")} /api/healthz soğuk veya meşgul (kenar live OK — panel oturumu kenardan okunur; eşitleme ile ilgili değil)`
        : `${origin.replace(/^https?:\/\//, "")} /api/healthz zaman aşımı veya hata (Sunucu hatası buradan gelir)`,
    });
  }

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
      rows = await listActiveHmSites(sql);
    } catch (err) {
      issues.push({
        kind: "db",
        severity: "high",
        message: `Worker Neon okunamadı: ${String(err?.message || err).slice(0, 100)}`,
      });
    }
  } else {
    issues.push({ kind: "db", severity: "high", message: "DATABASE_URL kenarda yok" });
  }

  const maxSites = Math.min(asPositiveLimit(opts.limit) || 12, 24);
  const slice = (rows || []).slice(0, maxSites);
  // Site probe'ları paralel — sıralı 9s×3×N tarama paneli kilitlemesin.
  const probed = await Promise.all(
    slice.map(async (site) => {
      const host = hostOf(site);
      if (!host) {
        return {
          site,
          host: "",
          home: null,
          editor: null,
          kose: null,
          hard: ["domain yok"],
          soft: [],
          phpTheme: false,
          corporate: false,
        };
      }
      const paths = siteProbePaths(host);
      const [home, editor, kose] = await Promise.all([
        probeUrl(paths.home, 9000),
        probeUrl(paths.editor, 9000),
        probeUrl(paths.kose, 9000),
      ]);
      const { hard, soft } = classifySiteProbeIssues({
        home,
        editor,
        kose,
        phpTheme: paths.phpTheme,
        corporate: paths.corporate,
        dualWriteReady,
      });
      return {
        site,
        host,
        home,
        editor,
        kose,
        hard,
        soft,
        phpTheme: paths.phpTheme,
        corporate: paths.corporate,
      };
    }),
  );

  for (const row of probed) {
    const label = siteDisplayName(row.site);
    for (const msg of row.hard) {
      const homeDown = !row.home?.ok;
      issues.push({
        kind: "site",
        severity: homeDown && !row.corporate ? "high" : "medium",
        siteId: row.site.id,
        slug: row.site.slug,
        message: `${label}: ${msg}`,
      });
    }
    for (const msg of row.soft) {
      issues.push({
        kind: "site",
        severity: "low",
        siteId: row.site.id,
        slug: row.site.slug,
        message: `${label}: ${msg}`,
      });
    }
    sites.push({
      id: row.site.id,
      slug: row.site.slug,
      name: label,
      host: row.host || null,
      home: row.home,
      editor: row.editor,
      kose: row.kose,
      phpTheme: row.phpTheme,
      corporate: row.corporate,
      // Soft (self-fetch 404 / Hostinger bekleyen) SORUN sayılmaz.
      ok: row.hard.length === 0,
      softIssues: row.soft,
      canSync: dualWriteReady,
    });
  }

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    dualWriteReady,
    api: { live: apiLive, healthz: apiFull },
    sites,
    issues,
    // Yalnızca high severity → sağlıksız (soğuk Container / soft probe medium|low kalır).
    healthy: issues.filter((i) => i.severity === "high").length === 0,
    note:
      "PHP Neon eşitleme içerik DB’sini doldurur; HTTP probe (editör 404 / healthz) ayrı konudur. Soft uyarılar eşitleme başarısızlığı değildir.",
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
    const dualWriteReady = shouldEdgeDualWriteNewsDb(env);
    // Tarama başarısız olsa bile site listesi + eşitleme butonları için katalog.
    let catalog = [];
    try {
      const sql = neonSqlClient(env);
      catalog = await listActiveHmSites(sql);
    } catch (err) {
      console.error("[hm-site-watchdog/catalog]", String(err?.message || err).slice(0, 120));
    }
    return jsonResponse(200, {
      ok: true,
      last,
      dualWriteReady,
      sites: catalog.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        host: hostOf(s) || null,
        canSync: dualWriteReady,
      })),
    });
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
    const result = await syncSiteToPhpNeon(env, siteId, {
      limit: body?.limit,
      full: body?.full,
      offset: body?.offset,
    });
    return jsonResponse(200, { ok: true, ...result });
  }

  if (path === "/api/hm/admin/site-watchdog/sync-all" && method === "POST") {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    if (!shouldEdgeDualWriteNewsDb(env)) {
      return jsonResponse(503, { ok: false, error: "Dual-write kapalı — NEWS_DATABASE_URL kontrol edin" });
    }
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const sql = neonSqlClient(env);
    let catalog = [];
    try {
      catalog = await listActiveHmSites(sql);
    } catch (err) {
      return jsonResponse(503, {
        ok: false,
        error: `Worker Neon okunamadı: ${String(err?.message || err).slice(0, 100)}`,
      });
    }
    const maxSites = Math.min(asPositiveLimit(body?.limit) || 24, 40);
    const results = [];
    for (const site of catalog.slice(0, maxSites)) {
      const result = await syncSiteToPhpNeon(env, site.id, {
        limit: body?.perSiteLimit,
        full: body?.full,
        offset: body?.offset,
      });
      results.push({
        siteId: site.id,
        slug: site.slug,
        name: site.name,
        ...result,
      });
    }
    return jsonResponse(200, {
      ok: true,
      synced: results.length,
      results,
      note: "Eşitleme PHP Neon içeriğini doldurur. Kalan SORUN çoğu zaman kenar probe (editör SPA / healthz) — «Şimdi tara» ile soft/kritik ayrımını görün.",
    });
  }

  return null;
}
