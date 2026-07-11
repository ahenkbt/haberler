/** `/tr/:slug` meta önbelleği — ilk boyamada Yekpare başlık/ikon flash’ını azaltır. */

export const HM_META_LS_PREFIX = "hm-nested-meta:v1:";
export const HM_DOMAIN_SLUG_LS_PREFIX = "hm-domain-slug:v1:";
export const HM_META_LS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type HmNestedMetaCached = {
  id: number;
  slug: string;
  domain: string | null;
  domain2?: string | null;
  domain3?: string | null;
  displayName: string;
  description?: string | null;
  layout?: unknown;
  contact?: { phone?: string; email?: string; address?: string; notes?: string } | null;
  seoVerification?: Record<string, unknown> | null;
  createdAt?: string;
  layoutUpdatedAt?: string | null;
};

type HmNestedMetaStored = { data: HmNestedMetaCached; updatedAt: number };
type HmDomainSlugStored = { slug: string; updatedAt: number };

export function normalizeHmSlugSegment(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function hmNestedMetaStorageKey(pathSlug: string): string {
  return `${HM_META_LS_PREFIX}${normalizeHmSlugSegment(pathSlug)}`;
}

function hmDomainSlugStorageKey(host: string): string {
  return `${HM_DOMAIN_SLUG_LS_PREFIX}${host.toLowerCase().split(":")[0] ?? ""}`;
}

export function readHmNestedMetaCache(pathSlugRaw: string): HmNestedMetaStored | undefined {
  if (typeof window === "undefined") return undefined;
  const pathSlug = normalizeHmSlugSegment(pathSlugRaw);
  if (!pathSlug) return undefined;
  try {
    const raw = localStorage.getItem(hmNestedMetaStorageKey(pathSlug));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as HmNestedMetaStored;
    const d = parsed?.data;
    if (!d || typeof d.id !== "number" || !d.slug) return undefined;
    if (normalizeHmSlugSegment(d.slug) !== pathSlug) return undefined;
    const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;
    if (Date.now() - updatedAt > HM_META_LS_MAX_AGE_MS) return undefined;
    return { data: d, updatedAt };
  } catch {
    return undefined;
  }
}

export function writeHmNestedMetaCache(pathSlugRaw: string, data: HmNestedMetaCached): void {
  if (typeof window === "undefined") return;
  const pathSlug = normalizeHmSlugSegment(pathSlugRaw);
  if (!pathSlug) return;
  try {
    const payload: HmNestedMetaStored = { data, updatedAt: Date.now() };
    localStorage.setItem(hmNestedMetaStorageKey(pathSlug), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function readHmDomainSlugCache(hostRaw: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const host = hostRaw.toLowerCase().split(":")[0] ?? "";
  if (!host) return undefined;
  try {
    const raw = localStorage.getItem(hmDomainSlugStorageKey(host));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as HmDomainSlugStored;
    const slug = normalizeHmSlugSegment(parsed?.slug ?? "");
    if (!slug) return undefined;
    const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;
    if (Date.now() - updatedAt > HM_META_LS_MAX_AGE_MS) return undefined;
    return slug;
  } catch {
    return undefined;
  }
}

export function writeHmDomainSlugCache(hostRaw: string, slugRaw: string): void {
  if (typeof window === "undefined") return;
  const slug = normalizeHmSlugSegment(slugRaw);
  if (!slug) return;
  const host = hostRaw.toLowerCase().split(":")[0] ?? "";
  if (!host) return;
  const payload: HmDomainSlugStored = { slug, updatedAt: Date.now() };
  const writeOne = (keyHost: string) => {
    if (!keyHost) return;
    try {
      localStorage.setItem(hmDomainSlugStorageKey(keyHost), JSON.stringify(payload));
    } catch {
      /* quota */
    }
  };
  writeOne(host);
  const apex = normalizeHmDomainHost(host);
  if (apex) {
    writeOne(apex);
    writeOne(`www.${apex}`);
  }
}

export function clearHmDomainSlugCache(hostRaw: string): void {
  if (typeof window === "undefined") return;
  const host = hostRaw.toLowerCase().split(":")[0] ?? "";
  if (!host) return;
  try {
    localStorage.removeItem(hmDomainSlugStorageKey(host));
  } catch {
    /* quota / private mode */
  }
}

function normalizeHmDomainHost(hostRaw: string): string {
  return String(hostRaw ?? "")
    .trim()
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "");
}

function hmDomainMatchesMetaHost(metaHost: string, host: string): boolean {
  const a = normalizeHmDomainHost(metaHost);
  const b = normalizeHmDomainHost(host);
  if (!a || !b) return false;
  return a === b || `www.${a}` === b || a === `www.${b}`;
}

/** index.html erken bootstrap — React yüklenmeden özel alan slug ipucu. */
export function readHmDomainBootSlug(hostRaw: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const host = normalizeHmDomainHost(hostRaw);
  if (!host) return undefined;
  try {
    const boot = window.__YEKPARE_HM_DOMAIN_BOOT__;
    if (!boot?.slug) return undefined;
    const bootHost = normalizeHmDomainHost(boot.host ?? boot.domain ?? "");
    if (bootHost && bootHost !== host) return undefined;
    const slug = normalizeHmSlugSegment(boot.slug);
    return slug || undefined;
  } catch {
    return undefined;
  }
}

/** Meta önbelleğinde kayıtlı domain/domain2/domain3 ile eşleşen slug. */
export function findHmSlugByDomainInMetaCache(hostRaw: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const host = normalizeHmDomainHost(hostRaw);
  if (!host) return undefined;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(HM_META_LS_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let parsed: HmNestedMetaStored;
      try {
        parsed = JSON.parse(raw) as HmNestedMetaStored;
      } catch {
        continue;
      }
      const d = parsed?.data;
      if (!d?.slug) continue;
      const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;
      if (Date.now() - updatedAt > HM_META_LS_MAX_AGE_MS) continue;
      const domains = [d.domain, d.domain2 ?? null, d.domain3 ?? null];
      if (!domains.some((dom) => typeof dom === "string" && hmDomainMatchesMetaHost(dom, host))) continue;
      const slug = normalizeHmSlugSegment(d.slug);
      if (slug) return slug;
    }
  } catch {
    /* quota / private mode */
  }
  return undefined;
}

/** Özel alan slug ipucu — domain cache, erken bootstrap ve meta taraması. */
export function resolveHmDomainSlugHint(hostRaw: string): string | undefined {
  const host = hostRaw.toLowerCase().split(":")[0] ?? "";
  if (!host) return undefined;
  const apex = normalizeHmDomainHost(host);
  const www = apex ? `www.${apex}` : "";
  return (
    readHmDomainSlugCache(host) ||
    (apex && apex !== host ? readHmDomainSlugCache(apex) : undefined) ||
    (www && www !== host ? readHmDomainSlugCache(www) : undefined) ||
    readHmDomainBootSlug(host) ||
    findHmSlugByDomainInMetaCache(host)
  );
}

export function hasHmDomainEvidence(hostRaw: string): boolean {
  const slug = resolveHmDomainSlugHint(hostRaw);
  if (!slug) return false;
  return Boolean(readHmNestedMetaCache(slug)?.data);
}

/** Layout JSON’dan sekme ikonu URL’si (favicon öncelikli, yoksa logo). */
export function hmSiteIconUrlFromLayout(layout: unknown): string | null {
  if (layout == null) return null;
  let j: Record<string, unknown>;
  if (typeof layout === "string") {
    try {
      j = JSON.parse(layout) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof layout === "object") {
    j = layout as Record<string, unknown>;
  } else {
    return null;
  }
  const fav =
    typeof j.faviconUrl === "string" && j.faviconUrl.trim().length > 0 ? j.faviconUrl.trim() : "";
  if (fav) return fav;
  const logoUrl =
    typeof j.logoUrl === "string" && j.logoUrl.trim().length > 0 ? j.logoUrl.trim() : "";
  if (logoUrl) return logoUrl;
  const legacy = typeof j.logo === "string" && j.logo.trim().length > 0 ? j.logo.trim() : "";
  return legacy || null;
}

export function hmSiteDisplayNameFromMeta(meta: HmNestedMetaCached): string {
  const name = String(meta.displayName ?? "").trim();
  if (name) return name;
  return normalizeHmSlugSegment(meta.slug)
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
