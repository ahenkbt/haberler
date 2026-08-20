export type HmHomeBundleBoot = {
  siteId: number;
  savedAt: number;
  bundle: {
    siteId?: number;
    featured?: unknown[];
    manualEditor?: unknown[];
    centerHeadlines?: unknown[];
    breaking?: unknown[];
    popular?: unknown[];
  };
};

/** Worker / index.html erken bootstrap — React mount olmadan manşet verisi. */
export function readHmHomeBundleBoot(siteId: number): HmHomeBundleBoot["bundle"] | undefined {
  if (typeof window === "undefined" || !Number.isFinite(siteId) || siteId <= 0) return undefined;
  const early = window.__YEKPARE_HM_HOME_BUNDLE__;
  if (!early || Number(early.siteId) !== siteId) return undefined;
  const bundle = early.bundle;
  if (!bundle || typeof bundle !== "object") return undefined;
  const featured = Array.isArray(bundle.featured) ? bundle.featured : [];
  if (featured.length === 0 && !Array.isArray(bundle.breaking) && !Array.isArray(bundle.popular)) {
    return undefined;
  }
  return bundle;
}
