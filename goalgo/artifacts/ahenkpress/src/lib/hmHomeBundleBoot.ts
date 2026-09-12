export type HmHomeBundleBoot = {
  siteId: number;
  savedAt: number;
  bundle: {
    siteId?: number;
    featured?: unknown[];
    tepeManset?: unknown[];
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
  const extra =
    (Array.isArray(bundle.tepeManset) ? bundle.tepeManset.length : 0) +
    (Array.isArray(bundle.centerHeadlines) ? bundle.centerHeadlines.length : 0) +
    (Array.isArray(bundle.manualEditor) ? bundle.manualEditor.length : 0) +
    (Array.isArray(bundle.breaking) ? bundle.breaking.length : 0) +
    (Array.isArray(bundle.popular) ? bundle.popular.length : 0);
  if (featured.length === 0 && extra === 0) {
    return undefined;
  }
  return bundle;
}
