/**
 * Live ASG / AHG domain + logo repair on panel Neon and PHP Neon.
 *
 * PHP canonical is the first domain column. ankara.fix.tc and gundem.fix.tc
 * stay first. The old apexes stay attached so the VPS does not fall back to TurkAta.
 * The public logo grid reads NEWS_DATABASE_URL first and skips inactive or
 * suspended rows, so both databases are updated and the panel data-URI logo is
 * copied across when the other row has none.
 *
 * Does not print database URLs, passwords, or logo bytes.
 *
 *   node --import tsx ./scripts/ensure-asg-ahg-rebrand-domains.ts
 */
import pg from "pg";

type Spec = {
  label: string;
  slugs: string[];
    domain: string;
  domain2: string | null;
  domain3: string | null;
  displayName: string;
};

const SPECS: Spec[] = [
  {
    label: "ASG",
    slugs: ["asg", "ankarasehirgazetesi"],
    domain: "ankara.fix.tc",
    domain2: "ankarasehirgazetesi.com",
    domain3: null,
    displayName: "Ankara Şehir Gazetesi",
  },
  {
    label: "AHG",
    slugs: ["ankarahabergundemi", "ahg"],
    domain: "gundem.fix.tc",
    domain2: "ankarahabergundemi.com",
    domain3: "ankara.gundemi.org",
    displayName: "Ankara Haber Gündemi",
  },
];

type SiteRow = {
  id: number;
  slug: string;
  domain: string | null;
  domain2: string | null;
  domain3: string | null;
  active: boolean;
  layout_json: string | null;
};

function safeErr(err: unknown): string {
  return String((err as { message?: string })?.message || err)
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[url]")
    .slice(0, 400);
}

function dbIdentity(url: string): string {
  try {
    const u = new URL(url.replace(/^postgresql:/i, "http:").replace(/^postgres:/i, "http:"));
    return `${u.hostname}${u.pathname}`;
  } catch {
    return "";
  }
}

function poolFor(url: string): pg.Pool {
  return new pg.Pool({
    connectionString: url,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 25000,
    statement_timeout: 30000,
  });
}

function parseLayout(raw: string | null): Record<string, unknown> {
  try {
    const v = JSON.parse(String(raw || ""));
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function logoScore(value: unknown): number {
  const s = String(value ?? "").trim();
  if (!s) return 0;
  if (/^data:image\//i.test(s)) return 1_000_000 + s.length;
  return 1_000 + Math.min(s.length, 800);
}

export function pickBestLogo(values: unknown[]): string {
  let best = "";
  let score = 0;
  for (const value of values) {
    const s = String(value ?? "").trim();
    const next = logoScore(s);
    if (next > score) {
      best = s;
      score = next;
    }
  }
  return best;
}

/** Drop the flags that keep a row off the public news-site grid, and keep the real logo. */
export function patchRebrandLayout(raw: string | null, logoUrl: string): { json: string; changed: boolean; notes: string[] } {
  const original = raw == null ? "" : String(raw);
  let layout: Record<string, unknown>;
  try {
    const v = JSON.parse(original || "");
    if (!v || typeof v !== "object" || Array.isArray(v)) {
      if (!logoUrl) return { json: original, changed: false, notes: ["layout kept"] };
      layout = {};
    } else {
      layout = v as Record<string, unknown>;
    }
  } catch {
    if (!logoUrl) return { json: original, changed: false, notes: ["layout kept"] };
    layout = {};
  }
  const notes: string[] = [];
  if (layout.hmPublicSuspended === true) {
    delete layout.hmPublicSuspended;
    notes.push("cleared hmPublicSuspended");
  }
  if (layout.hmIl81) {
    delete layout.hmIl81;
    notes.push("cleared hmIl81");
  }
  if (layout.hmCorporateSite === true) {
    delete layout.hmCorporateSite;
    notes.push("cleared hmCorporateSite");
  }
  if (layout.hmSiteKind === "kurumsal") {
    delete layout.hmSiteKind;
    notes.push("cleared hmSiteKind");
  }
  if ("hmDisplayNameOverride" in layout) {
    delete layout.hmDisplayNameOverride;
    notes.push("cleared hmDisplayNameOverride");
  }
  const current = String(layout.logoUrl ?? "").trim();
  if (logoUrl && logoUrl !== current) {
    layout.logoUrl = logoUrl;
    notes.push(`logo ${current.length} -> ${logoUrl.length}`);
  }
  if (!notes.length) return { json: original, changed: false, notes };
  return { json: JSON.stringify(layout), changed: true, notes };
}

function summarize(row: SiteRow | null) {
  if (!row) return null;
  const layout = parseLayout(row.layout_json);
  return {
    id: row.id,
    slug: row.slug,
    domain: row.domain,
    domain2: row.domain2,
    domain3: row.domain3,
    active: row.active,
    suspended: layout.hmPublicSuspended === true,
    logoLen: String(layout.logoUrl ?? "").length,
  };
}

async function loadRows(pool: pg.Pool, spec: Spec): Promise<SiteRow[]> {
  const res = await pool.query(
    `SELECT id, slug, domain, domain2, domain3, active, layout_json
     FROM hm_news_sites
     WHERE lower(slug) = ANY($1::text[])`,
    [spec.slugs],
  );
  return res.rows as SiteRow[];
}

function chooseRow(rows: SiteRow[], spec: Spec): SiteRow | null {
  return rows.find((row) => spec.slugs.includes(String(row.slug || "").trim().toLowerCase())) ?? null;
}

async function applyDb(
  pool: pg.Pool,
  label: string,
  logos: Map<string, string>,
): Promise<{ label: string; rows: unknown[] }> {
  const client = await pool.connect();
  const report: unknown[] = [];
  try {
    await client.query("BEGIN");
    for (const spec of SPECS) {
      const beforeRows = (await client.query(
        `SELECT id, slug, domain, domain2, domain3, active, layout_json
         FROM hm_news_sites WHERE lower(slug) = ANY($1::text[])`,
        [spec.slugs],
      )).rows as SiteRow[];
      const target = chooseRow(beforeRows, spec);
      if (!target) {
        throw new Error(`${label} missing ${spec.label} slug`);
      }
      const hosts = [spec.domain, spec.domain2, spec.domain3].filter((h): h is string => Boolean(h));
      let detached = 0;
      for (const host of hosts) {
        const cleared = await client.query(
          `UPDATE hm_news_sites
           SET domain = CASE WHEN lower(btrim(domain)) = $1 THEN NULL ELSE domain END,
               domain2 = CASE WHEN lower(btrim(domain2)) = $1 THEN NULL ELSE domain2 END,
               domain3 = CASE WHEN lower(btrim(domain3)) = $1 THEN NULL ELSE domain3 END,
               updated_at = now()
           WHERE id <> $2
             AND (lower(btrim(coalesce(domain, ''))) = $1
               OR lower(btrim(coalesce(domain2, ''))) = $1
               OR lower(btrim(coalesce(domain3, ''))) = $1)`,
          [host, target.id],
        );
        detached += cleared.rowCount ?? 0;
      }
      const patched = patchRebrandLayout(target.layout_json, logos.get(spec.label) || "");
      await client.query(
        `UPDATE hm_news_sites
         SET domain = $1, domain2 = $2, domain3 = $3, display_name = $4, active = true, layout_json = $5, updated_at = now()
         WHERE id = $6`,
        [spec.domain, spec.domain2, spec.domain3, spec.displayName, patched.json, target.id],
      );
      const after = (await client.query(
        `SELECT id, slug, domain, domain2, domain3, active, layout_json FROM hm_news_sites WHERE id = $1`,
        [target.id],
      )).rows[0] as SiteRow;
      report.push({
        spec: spec.label,
        before: summarize(target),
        after: summarize(after),
        detached,
        notes: patched.notes,
      });
    }
    await client.query("COMMIT");
    return { label, rows: report };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

async function purgeCaches(): Promise<void> {
  const token = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();
  if (!token) {
    console.log(JSON.stringify({ purge: "skipped" }));
    return;
  }
  const urls = [
    "https://turkatahaber.com/api/hm/public/news-sites",
    "https://turkatahaber.com/api/hm/public/news-sites/3/logo",
    "https://turkatahaber.com/api/hm/public/news-sites/8/logo",
    "https://ahenk.net.tr/api/hm/public/news-sites",
    "https://ahenk.net.tr/api/hm/public/news-sites/3/logo",
    "https://ahenk.net.tr/api/hm/public/news-sites/8/logo",
    "https://ankara.fix.tc/",
    "https://gundem.fix.tc/",
  ];
  const zoneCache = new Map<string, string | null>();
  async function zoneId(host: string): Promise<string | null> {
    const name = host.replace(/^www\./, "");
    if (zoneCache.has(name)) return zoneCache.get(name) ?? null;
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(name)}&per_page=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await res.json().catch(() => null)) as { result?: { id?: string }[] } | null;
    const id = json?.result?.[0]?.id || null;
    zoneCache.set(name, id);
    return id;
  }
  const byZone = new Map<string, string[]>();
  for (const url of urls) {
    const id = await zoneId(new URL(url).hostname);
    if (!id) continue;
    const list = byZone.get(id) ?? [];
    list.push(url);
    byZone.set(id, list);
  }
  let purged = 0;
  for (const [id, files] of byZone) {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${id}/purge_cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
    const json = (await res.json().catch(() => null)) as { success?: boolean } | null;
    if (res.ok && json?.success !== false) purged += files.length;
  }
  console.log(JSON.stringify({ purge: "ok", zones: byZone.size, files: purged }));
}

export async function ensureAsgAhgLiveDomains(): Promise<void> {
  const panelUrl = String(process.env.DATABASE_URL || "").trim();
  const newsUrl = String(process.env.NEWS_DATABASE_URL || "").trim();
  if (!panelUrl) throw new Error("DATABASE_URL missing");
  if (!newsUrl) throw new Error("NEWS_DATABASE_URL missing");

  const same = dbIdentity(panelUrl) !== "" && dbIdentity(panelUrl) === dbIdentity(newsUrl);
  const targets = same
    ? [{ label: "panel+news", url: panelUrl }]
    : [
        { label: "panel", url: panelUrl },
        { label: "news", url: newsUrl },
      ];
  const pools = targets.map((t) => ({ ...t, pool: poolFor(t.url) }));
  try {
    const logos = new Map<string, string>();
    for (const spec of SPECS) {
      const values: unknown[] = [];
      for (const item of pools) {
        for (const row of await loadRows(item.pool, spec)) {
          values.push(parseLayout(row.layout_json).logoUrl);
        }
      }
      logos.set(spec.label, pickBestLogo(values));
    }
    const reports = [];
    for (const item of pools) {
      reports.push(await applyDb(item.pool, item.label, logos));
    }
    console.log(JSON.stringify({ ok: true, sameDb: same, reports }, null, 2));
    await purgeCaches().catch((err) => {
      console.log(JSON.stringify({ purge: "failed", error: safeErr(err) }));
    });
  } finally {
    await Promise.all(pools.map((item) => item.pool.end().catch(() => undefined)));
  }
}

const isDirect = process.argv[1]?.includes("ensure-asg-ahg-rebrand-domains");
if (isDirect) {
  ensureAsgAhgLiveDomains().catch((err) => {
    console.error(safeErr(err));
    process.exit(1);
  });
}
