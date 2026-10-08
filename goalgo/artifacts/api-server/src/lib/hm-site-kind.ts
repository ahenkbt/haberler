/**
 * HM site type (news vs corporate) + platform alias domains.
 *
 * - News sites (/admin/haber-siteleri) always get <slug>.gundemi.org and <slug>.fix.tc on the PHP theme.
 *   VPS: wildcard DNS *.gundemi.org / *.fix.tc (proxied) + Traefik HostRegexp → php-theme-yenisafak, which
 *   resolves the host against hm_news_sites.domain/domain2/domain3 (dual-written to twilight-pine).
 * - Canonical / sitemap / robots / OG / RSS use the FIRST domain (PHP App.php origin = https://<domain>).
 *   So the order is: custom domain(s) first, then <slug>.gundemi.org, then <slug>.fix.tc.
 * - Corporate sites (/admin/hm-kurumsal) never get platform aliases (those hosts route to the news theme).
 * - The type is locked once created (layout_json.hmSiteKind); news ↔ corporate conversion is refused.
 */

export type HmSiteKind = "news" | "corporate";

export const HM_PLATFORM_ALIAS_ZONES = ["gundemi.org", "fix.tc"] as const;
export type HmPlatformAliasZone = (typeof HM_PLATFORM_ALIAS_ZONES)[number];

const CORPORATE_THEMES = new Set(["corporate", "kurumsal", "vatan"]);
/** Known corporate rows (VKD, TGD, TÜRKATA Vakfı = slug `tr` / tukav.org). */
const CORPORATE_SLUGS = new Set(["vkd", "vatankahramanlari", "trafik", "tr", "tukav", "turkatavakfi"]);
const CORPORATE_DOMAIN_HINTS = [/(^|\.)tukav\.org$/, /(^|\.)vatankahramanlari\.org(\.tr)?$/, /(^|\.)trafik\.gd$/, /(^|\.)tgd\.tc$/, /(^|\.)trafikdernegi\.com$/];

export function parseLayoutObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const j = JSON.parse(raw) as unknown;
      if (j && typeof j === "object" && !Array.isArray(j)) return j as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  return {};
}

export function normalizeHmSiteKind(raw: unknown): HmSiteKind | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "news" || v === "haber") return "news";
  if (v === "corporate" || v === "kurumsal") return "corporate";
  return null;
}

/** Explicit layout_json.hmSiteKind wins; otherwise corporate vitrin theme / known corporate slug or domain. */
export function resolveHmSiteKind(site: {
  slug?: string | null;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
  layoutJson?: unknown;
}): HmSiteKind {
  const layout = parseLayoutObject(site.layoutJson);
  const explicit = normalizeHmSiteKind(layout.hmSiteKind);
  if (explicit) return explicit;
  if (CORPORATE_THEMES.has(String(layout.hmVitrinTheme ?? "").trim().toLowerCase())) return "corporate";
  const slug = String(site.slug ?? "").trim().toLowerCase();
  if (CORPORATE_SLUGS.has(slug) || slug.includes("vatankahramanlari") || slug.includes("trafikdernegi")) {
    return "corporate";
  }
  for (const d of [site.domain, site.domain2, site.domain3]) {
    const h = normalizeAliasHost(d);
    if (h && CORPORATE_DOMAIN_HINTS.some((re) => re.test(h))) return "corporate";
  }
  return "news";
}

export function normalizeAliasHost(raw: unknown): string | null {
  const h = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .split(/[/?#]/)[0]
    ?.replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
  return h || null;
}

/** <label>.gundemi.org / <label>.fix.tc (one label; the apex itself is a real site, not an alias). */
export function platformAliasZone(raw: unknown): HmPlatformAliasZone | null {
  const h = normalizeAliasHost(raw);
  if (!h) return null;
  for (const zone of HM_PLATFORM_ALIAS_ZONES) {
    if (h.endsWith(`.${zone}`) && /^[a-z0-9-]+$/.test(h.slice(0, -(zone.length + 1)))) return zone;
  }
  return null;
}

export function isPlatformAliasHost(raw: unknown): boolean {
  return platformAliasZone(raw) !== null;
}

/** DNS label for a slug (a–z, 0–9, '-', max 63). */
export function platformLabelForSlug(slug: string): string {
  return String(slug ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63)
    .replace(/-$/, "");
}

export function platformAliasesForSlug(slug: string): { gundemi: string; fixTc: string } {
  const label = platformLabelForSlug(slug) || "site";
  return { gundemi: `${label}.gundemi.org`, fixTc: `${label}.fix.tc` };
}

export type HmDomainTriad = { domain: string | null; domain2: string | null; domain3: string | null };

/**
 * Orders domains for the PHP canonical rule: custom domains first (their relative order kept), then the
 * gundemi.org alias, then the fix.tc alias. Dedupes (www-insensitive). More than 3 → error.
 */
export function orderSiteDomains(hosts: Array<string | null | undefined>): { triad: HmDomainTriad; error?: string } {
  const seen = new Set<string>();
  const custom: string[] = [];
  const gundemi: string[] = [];
  const fix: string[] = [];
  for (const raw of hosts) {
    const original = String(raw ?? "").trim().toLowerCase();
    const key = normalizeAliasHost(original);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const zone = platformAliasZone(key);
    if (zone === "gundemi.org") gundemi.push(key);
    else if (zone === "fix.tc") fix.push(key);
    else custom.push(original.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").split(/[/?#]/)[0] ?? key);
  }
  const all = [...custom, ...gundemi, ...fix];
  const triad: HmDomainTriad = { domain: all[0] ?? null, domain2: all[1] ?? null, domain3: all[2] ?? null };
  if (all.length > 3) {
    return { triad, error: "Bir sitede en fazla 3 domain olabilir (kendi domaini + gundemi.org + fix.tc)." };
  }
  return { triad };
}

/**
 * New news site: given domains (custom ones) + both platform aliases unless explicitly switched off.
 * `aliases` = { gundemi?: boolean; fixTc?: boolean } — default true/true.
 */
export function planNewsSiteDomains(input: {
  slug: string;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
  aliases?: { gundemi?: boolean; fixTc?: boolean } | null;
}): { triad: HmDomainTriad; error?: string } {
  const a = platformAliasesForSlug(input.slug);
  const given = [input.domain, input.domain2, input.domain3].filter((d) => normalizeAliasHost(d));
  const wantGundemi = input.aliases?.gundemi !== false;
  const wantFix = input.aliases?.fixTc !== false;
  const list = given.filter((d) => {
    const z = platformAliasZone(d);
    if (z === "gundemi.org" && !wantGundemi) return false;
    if (z === "fix.tc" && !wantFix) return false;
    return true;
  });
  if (wantGundemi && !list.some((d) => platformAliasZone(d) === "gundemi.org")) list.push(a.gundemi);
  if (wantFix && !list.some((d) => platformAliasZone(d) === "fix.tc")) list.push(a.fixTc);
  const out = orderSiteDomains(list);
  if (!out.error && !out.triad.domain) {
    return { ...out, error: "Haber sitesinde en az bir domain kalmalı (gundemi.org, fix.tc veya kendi domaini)." };
  }
  return out;
}

/** Corporate sites: no platform aliases (they would route to the PHP news theme). */
export function corporateDomainError(triad: HmDomainTriad): string | null {
  for (const d of [triad.domain, triad.domain2, triad.domain3]) {
    if (isPlatformAliasHost(d)) {
      return `Kurumsal sitelere ${normalizeAliasHost(d)} gibi gundemi.org / fix.tc haber adresi verilemez (haber teması açar).`;
    }
  }
  return null;
}

/**
 * Site type lock for PATCH: incoming layout may not switch the kind or the vitrin theme family,
 * and a corporate site may not be flagged PHP (news) theme.
 */
export function siteKindPatchError(current: HmSiteKind, incomingLayout: Record<string, unknown>): string | null {
  const nextKind = normalizeHmSiteKind(incomingLayout.hmSiteKind);
  if ("hmSiteKind" in incomingLayout && nextKind !== current) {
    return current === "news"
      ? "Haber sitesi kurumsal siteye dönüştürülemez."
      : "Kurumsal site haber sitesine dönüştürülemez.";
  }
  if ("hmVitrinTheme" in incomingLayout) {
    const theme = String(incomingLayout.hmVitrinTheme ?? "").trim().toLowerCase();
    const corporateTheme = CORPORATE_THEMES.has(theme);
    if (current === "news" && corporateTheme) return "Haber sitesine kurumsal tema (VKD/VATAN) verilemez.";
    if (current === "corporate" && theme && !corporateTheme) {
      return "Kurumsal siteye haber teması verilemez; yalnızca kurumsal temalar (VKD / VATAN).";
    }
  }
  if (current === "news" && (incomingLayout.phpTheme === false || ["spa", "react", "worker"].includes(String(incomingLayout.frontend ?? "").toLowerCase()))) {
    return "Haber siteleri yalnızca PHP temasında yayınlanır.";
  }
  if (current === "corporate" && (incomingLayout.phpTheme === true || String(incomingLayout.frontend ?? "").toLowerCase() === "php")) {
    return "Kurumsal site PHP haber temasına alınamaz.";
  }
  return null;
}

/** Layout keys written on create, by kind. */
export function siteKindLayoutDefaults(kind: HmSiteKind, corporateTheme?: unknown): Record<string, unknown> {
  if (kind === "corporate") {
    const t = String(corporateTheme ?? "").trim().toLowerCase();
    return { hmSiteKind: "corporate", hmVitrinTheme: t === "vatan" ? "vatan" : "corporate", phpTheme: false, frontend: "spa" };
  }
  return { hmSiteKind: "news", hmVitrinTheme: "yenisafak", phpTheme: true, frontend: "php" };
}
