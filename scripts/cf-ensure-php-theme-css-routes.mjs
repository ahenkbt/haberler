/**
 * Rebind /assets/theme.css (+ theme.js) Worker routes for PHP Yenişafak brand hosts.
 *
 * Dashboard historically had Worker-less `theme.*` exclusions so CSS hit origin PHP
 * (max-age=86400, no x-yekpare-*). Exact theme.css routes in wrangler.toml must win
 * and point at the haberler Worker for decoratePhpThemeCss / concept colors.
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... node scripts/cf-ensure-php-theme-css-routes.mjs
 *   DRY_RUN=1 CLOUDFLARE_API_TOKEN=... node scripts/cf-ensure-php-theme-css-routes.mjs
 */
const API = "https://api.cloudflare.com/client/v4";
const SCRIPT = process.env.CF_WORKER_SCRIPT || "haberler";
const DRY_RUN = String(process.env.DRY_RUN || "").trim() === "1";

/** Apex zones that share Yenişafak /assets/theme.css (concept chrome inject). */
const ZONES = Object.freeze([
  "yesilvatan.gen.tr",
  "yerel.net.tr",
  "sehitgazi.org.tr",
  "turksav.org",
  "dunyasaglik.org",
  "turkatahaber.com",
  "fix.tc",
]);

function token() {
  return (
    String(process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || "").trim() || ""
  );
}

async function cf(path, { method = "GET", body } = {}) {
  const t = token();
  if (!t) throw new Error("CLOUDFLARE_API_TOKEN missing");
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${t}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.success !== false, status: res.status, json };
}

async function getZoneId(name) {
  const r = await cf(`/zones?name=${encodeURIComponent(name)}&status=active`);
  const id = r.json?.result?.[0]?.id;
  if (!id) throw new Error(`zone not found: ${name}`);
  return id;
}

function patternsForZone(zone) {
  const hosts = [zone, `www.${zone}`];
  const out = [];
  for (const host of hosts) {
    out.push(`${host}/assets/theme.css`);
    out.push(`${host}/assets/theme.js`);
  }
  return out;
}

/** Remove Worker-less theme.* exclusions that steal traffic from assets/* + exact routes. */
function isLegacyThemeExclusion(pattern, script) {
  if (script) return false;
  return /\/assets\/theme\.(css|js|\*)$/i.test(String(pattern || ""));
}

async function ensureZone(zone) {
  const zoneId = await getZoneId(zone);
  const list = await cf(`/zones/${zoneId}/workers/routes`);
  if (!list.ok) {
    throw new Error(`list routes ${zone}: HTTP ${list.status}`);
  }
  const existing = list.json?.result || [];
  const byPattern = new Map(existing.map((r) => [r.pattern, r]));

  let removed = 0;
  for (const row of existing) {
    if (!isLegacyThemeExclusion(row.pattern, row.script)) continue;
    if (DRY_RUN) {
      console.log(`[dry-run] DELETE ${zone} ${row.pattern} (script-less theme exclusion)`);
      continue;
    }
    const del = await cf(`/zones/${zoneId}/workers/routes/${row.id}`, { method: "DELETE" });
    if (del.ok) {
      console.log(`removed exclusion ${zone} ${row.pattern}`);
      byPattern.delete(row.pattern);
      removed += 1;
    } else {
      console.warn(
        `failed delete ${row.pattern}:`,
        del.json?.errors?.[0]?.message || del.status,
      );
    }
  }

  let ok = 0;
  let mutated = 0;
  for (const pattern of patternsForZone(zone)) {
    const row = byPattern.get(pattern);
    if (row?.script === SCRIPT) {
      ok += 1;
      continue;
    }
    if (row?.id) {
      if (DRY_RUN) {
        console.log(`[dry-run] rebind ${pattern} → ${SCRIPT}`);
        continue;
      }
      const r = await cf(`/zones/${zoneId}/workers/routes/${row.id}`, {
        method: "PUT",
        body: { pattern, script: SCRIPT },
      });
      console.log(`rebind ${pattern} ok=${r.ok}`, JSON.stringify(r.json?.errors || {}));
      if (r.ok) mutated += 1;
      continue;
    }
    if (DRY_RUN) {
      console.log(`[dry-run] create ${pattern} → ${SCRIPT}`);
      continue;
    }
    const r = await cf(`/zones/${zoneId}/workers/routes`, {
      method: "POST",
      body: { pattern, script: SCRIPT },
    });
    console.log(`create ${pattern} ok=${r.ok}`, JSON.stringify(r.json?.errors || {}));
    if (r.ok) mutated += 1;
  }

  console.log(
    `[php-theme-css-routes] ${zone}: bound=${ok} mutated=${mutated} removedExclusions=${removed}`,
  );
  return { ok, mutated, removed };
}

async function main() {
  if (!token()) {
    console.error("[php-theme-css-routes] CLOUDFLARE_API_TOKEN missing");
    process.exitCode = 1;
    return;
  }
  console.log(`[php-theme-css-routes] script=${SCRIPT} dryRun=${DRY_RUN} zones=${ZONES.length}`);
  let failed = 0;
  for (const zone of ZONES) {
    try {
      await ensureZone(zone);
    } catch (err) {
      failed += 1;
      console.error(`[php-theme-css-routes] ${zone}:`, err?.message || err);
    }
  }
  if (failed) {
    console.error(`[php-theme-css-routes] ${failed} zone(s) failed`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("[php-theme-css-routes] fatal", e);
  process.exitCode = 1;
});
