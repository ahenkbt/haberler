/** HM embed / query tabanlı runtime ayarları */
export type YektubeRuntimeConfig = {
  embed: boolean;
  hmSlug: string | null;
  hmLogoUrl: string | null;
  hmDisplayName: string | null;
};

const SS_HM_EMBED = "yektube-hm-embed";
const SS_HM_SLUG = "yektube-hm-slug";
const SS_HM_LOGO = "yektube-hm-logo";
const SS_HM_NAME = "yektube-hm-name";

function isRunningInIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function readYektubeRuntimeConfig(): YektubeRuntimeConfig {
  if (typeof window === "undefined") {
    return { embed: false, hmSlug: null, hmLogoUrl: null, hmDisplayName: null };
  }
  const params = new URLSearchParams(window.location.search);
  const embedFromUrl = params.get("embed") === "1";
  const hmFromUrl = params.get("hm")?.trim() || null;
  const logoFromUrl = params.get("hmLogo")?.trim() || null;
  const nameFromUrl = params.get("hmName")?.trim() || null;
  const inIframe = isRunningInIframe();

  if (embedFromUrl && inIframe) sessionStorage.setItem(SS_HM_EMBED, "1");
  else if (!embedFromUrl && !inIframe) sessionStorage.removeItem(SS_HM_EMBED);
  if (hmFromUrl) sessionStorage.setItem(SS_HM_SLUG, hmFromUrl);
  if (logoFromUrl) sessionStorage.setItem(SS_HM_LOGO, logoFromUrl);
  if (nameFromUrl) sessionStorage.setItem(SS_HM_NAME, nameFromUrl);

  const embedActive = embedFromUrl || (inIframe && sessionStorage.getItem(SS_HM_EMBED) === "1");

  return {
    embed: embedActive,
    hmSlug: hmFromUrl || sessionStorage.getItem(SS_HM_SLUG) || null,
    hmLogoUrl: logoFromUrl || sessionStorage.getItem(SS_HM_LOGO) || null,
    hmDisplayName: nameFromUrl || sessionStorage.getItem(SS_HM_NAME) || null,
  };
}

/** HM haber sitesi Video TV iframe — `embed=1` veya `hm=` sorgu parametresi */
export function isHmEmbedSurface(): boolean {
  const cfg = readYektubeRuntimeConfig();
  return cfg.embed || Boolean(cfg.hmSlug);
}

export function isEmbedMode(): boolean {
  return isHmEmbedSurface();
}

/** HM iframe içi gezinmede embed/hm sorgu parametrelerini koru */
export function withHmEmbedQuery(href: string): string {
  const cfg = readYektubeRuntimeConfig();
  if (!cfg.embed && !cfg.hmSlug) return href;
  let out = href;
  if (cfg.embed) out = appendQueryParam(out, "embed", "1");
  if (cfg.hmSlug) out = appendQueryParam(out, "hm", cfg.hmSlug);
  if (cfg.hmLogoUrl) out = appendQueryParam(out, "hmLogo", cfg.hmLogoUrl);
  if (cfg.hmDisplayName) out = appendQueryParam(out, "hmName", cfg.hmDisplayName);
  return out;
}

/** href'e sorgu parametresi ekle (path-only linkler için) */
export function appendQueryParam(href: string, key: string, value: string): string {
  const hashIdx = href.indexOf("#");
  const hash = hashIdx >= 0 ? href.slice(hashIdx) : "";
  const pathAndQuery = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  const qIdx = pathAndQuery.indexOf("?");
  const path = qIdx >= 0 ? pathAndQuery.slice(0, qIdx) : pathAndQuery;
  const params = new URLSearchParams(qIdx >= 0 ? pathAndQuery.slice(qIdx + 1) : "");
  params.set(key, value);
  const q = params.toString();
  return `${path}${q ? `?${q}` : ""}${hash}`;
}
