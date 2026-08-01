/**
 * Bu repodan (haberler Worker'ı) kalıcı olarak ayrılmış alan adları.
 *
 * Cloudflare panelinden elle silinen route / custom domain kayıtları, cron ile çalışan
 * `cf-fix-originless-dns.mjs` ve her `wrangler deploy` sonrası çalışan `cf-dns-cutover.mjs`
 * tarafından yeniden oluşturuluyordu. Buradaki alanlar hem otomasyondan dışlanır hem de
 * her çalıştırmada Worker'dan sökülür.
 *
 * DNS kayıtlarına dokunulmaz: alan adı başka bir projede/Worker'da yayında olabilir.
 */

export const DETACHED_ZONES = ["yekpare.net"];

export function isDetachedZone(name) {
  const h = String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  return DETACHED_ZONES.includes(h);
}

async function deleteZoneRoutes(request, { script, zoneId, log }) {
  const list = await request(`/zones/${zoneId}/workers/routes`);
  const routes = list.json?.result || [];
  let removed = 0;
  for (const route of routes) {
    if (route.script !== script) {
      log(`[detach] keep ${route.pattern} → ${route.script} (başka Worker)`);
      continue;
    }
    const r = await request(`/zones/${zoneId}/workers/routes/${route.id}`, { method: "DELETE" });
    log(`[detach] route sil ${route.pattern} ok=${r.ok}`, JSON.stringify(r.json?.errors || {}));
    if (r.ok) removed += 1;
  }
  return removed;
}

async function deleteCustomDomains(request, { accountId, script, zoneName, log }) {
  const list = await request(`/accounts/${accountId}/workers/domains?zone_name=${encodeURIComponent(zoneName)}`);
  const domains = list.json?.result || [];
  let removed = 0;
  for (const domain of domains) {
    if (domain.service !== script) {
      log(`[detach] keep custom domain ${domain.hostname} → ${domain.service}`);
      continue;
    }
    const r = await request(`/accounts/${accountId}/workers/domains/${domain.id}`, { method: "DELETE" });
    log(`[detach] custom domain sil ${domain.hostname} ok=${r.ok}`, JSON.stringify(r.json?.errors || {}));
    if (r.ok) removed += 1;
  }
  return removed;
}

/**
 * Ayrılmış alanları Worker'dan söker (route + custom domain). DNS kayıtları korunur.
 *
 * @param {(path: string, init?: { method?: string, body?: unknown }) => Promise<{ ok: boolean, json: any }>} request
 * @param {{ accountId: string, script: string, log?: (...args: unknown[]) => void }} options
 */
export async function detachRemovedDomains(request, { accountId, script, log = console.log }) {
  for (const zoneName of DETACHED_ZONES) {
    const zones = await request(`/zones?name=${encodeURIComponent(zoneName)}&account.id=${accountId}`);
    const zoneId = zones.json?.result?.[0]?.id;
    if (!zoneId) {
      log(`[detach] ${zoneName}: zone hesapta yok — atlandı`);
      continue;
    }
    const routes = await deleteZoneRoutes(request, { script, zoneId, log });
    const domains = await deleteCustomDomains(request, { accountId, script, zoneName, log });
    log(`[detach] ${zoneName}: ${routes} route + ${domains} custom domain kaldırıldı (${script})`);
  }
}
