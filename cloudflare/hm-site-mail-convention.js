/**
 * HM news sites: editor login + default mailbox naming convention (user rule 2026-10-08 21:02).
 *
 *   normal domain        sosyalhizmetler.tr      -> bilgi@sosyalhizmetler.tr
 *   subdomain site       kibris.gundemi.org      -> kibris@gundemi.org
 *                        grok-test.fix.tc        -> grok-test@fix.tc
 *
 * The editor username and password are both this address. Only NEWS sites (corporate VKD / TGD / TÜRKATA Vakfı
 * rows are excluded, same rule as api-server hm-site-kind.ts).
 */

/** Public-suffix-like second levels we host under (".tr" second-level zones etc.). */
const MULTI_LABEL_SUFFIXES = new Set([
  "com.tr", "net.tr", "org.tr", "gen.tr", "gov.tr", "edu.tr", "k12.tr", "bel.tr", "av.tr", "dr.tr", "bbs.tr",
  "biz.tr", "info.tr", "name.tr", "tel.tr", "web.tr", "pol.tr", "tsk.tr", "kep.tr", "tv.tr", "web.tr",
  "co.uk", "org.uk", "com.cy", "net.cy", "org.cy", "com.de",
]);

/** Shared platform zones: subdomains here are separate news sites, the apex is its own site. */
export const HM_PLATFORM_MAIL_ZONES = ["gundemi.org", "fix.tc"];

const CORPORATE_THEMES = new Set(["corporate", "kurumsal", "vatan"]);
const CORPORATE_SLUGS = new Set(["vkd", "vatankahramanlari", "trafik", "tr", "tukav", "turkatavakfi"]);
const CORPORATE_DOMAIN_HINTS = [
  /(^|\.)tukav\.org$/,
  /(^|\.)vatankahramanlari\.org(\.tr)?$/,
  /(^|\.)trafik\.gd$/,
  /(^|\.)tgd\.tc$/,
  /(^|\.)trafikdernegi\.com$/,
];

export function normalizeMailHost(raw) {
  const h = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
  if (!h || !/^[a-z0-9.-]+$/.test(h) || !h.includes(".")) return "";
  if (h.endsWith(".pages.dev") || h.endsWith(".workers.dev") || h === "localhost") return "";
  return h;
}

/** Registrable domain (eTLD+1) for our zones. */
export function registrableDomain(host) {
  const h = normalizeMailHost(host);
  if (!h) return "";
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  const last2 = parts.slice(-2).join(".");
  if (MULTI_LABEL_SUFFIXES.has(last2)) return parts.slice(-3).join(".");
  return last2;
}

/** Conventional address for one site host (see header). */
export function conventionalAddressForHost(host) {
  const h = normalizeMailHost(host);
  if (!h) return "";
  const reg = registrableDomain(h);
  if (!reg || reg === h) return `bilgi@${h}`;
  const sub = h.slice(0, -(reg.length + 1));
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(sub)) return `bilgi@${h}`;
  return `${sub}@${reg}`;
}

export function siteHosts(site) {
  const out = [];
  for (const raw of [site?.domain, site?.domain2, site?.domain3]) {
    const h = normalizeMailHost(raw);
    if (h && !out.includes(h)) out.push(h);
  }
  return out;
}

/** All conventional addresses of a site; first = primary (domain column). */
export function conventionalAddressesForSite(site) {
  const out = [];
  for (const h of siteHosts(site)) {
    const a = conventionalAddressForHost(h);
    if (a && !out.includes(a)) out.push(a);
  }
  return out;
}

function parseLayout(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const j = JSON.parse(raw);
      if (j && typeof j === "object" && !Array.isArray(j)) return j;
    } catch {
      /* ignore */
    }
  }
  return {};
}

/** News vs corporate (layout_json.hmSiteKind wins; else corporate theme / slug / domain hints). */
export function isHmNewsSite(site) {
  if (!site) return false;
  const layout = parseLayout(site.layout_json ?? site.layoutJson);
  const kind = String(layout.hmSiteKind ?? "").trim().toLowerCase();
  if (kind === "news" || kind === "haber") return true;
  if (kind === "corporate" || kind === "kurumsal") return false;
  if (CORPORATE_THEMES.has(String(layout.hmVitrinTheme ?? "").trim().toLowerCase())) return false;
  const slug = String(site.slug ?? "").trim().toLowerCase();
  if (CORPORATE_SLUGS.has(slug) || slug.includes("vatankahramanlari") || slug.includes("trafikdernegi")) return false;
  for (const h of siteHosts(site)) {
    if (CORPORATE_DOMAIN_HINTS.some((re) => re.test(h))) return false;
  }
  return true;
}

/**
 * Mail domains an editor of this site fully owns (any local part): its own custom domains.
 * Platform zones (gundemi.org / fix.tc) are shared by many sites, so a site there only owns its
 * conventional address (and boxes explicitly assigned to it).
 */
export function ownedMailDomainsForSite(site) {
  const out = [];
  for (const h of siteHosts(site)) {
    const reg = registrableDomain(h);
    if (HM_PLATFORM_MAIL_ZONES.includes(reg)) continue;
    if (reg !== h) continue; // custom subdomain of some other zone: convention address only
    if (!out.includes(h)) out.push(h);
  }
  return out;
}
