/** Haber kapak görseli adaylarından yayıncı logosu / site ikonlarını ayıklar. */

const LOGO_PATH_RE =
  /(?:^|[/_.-])(?:logo|logotype|logosu|brand(?:ing)?|favicon|apple-touch(?:-icon)?|touch-icon|sprite|site-icon|header-logo|footer-logo|publisher-logo|masthead|default-og|og-default|placeholder|no-image|noimage)(?:[._-]|$)/i;

const LOGO_ASSETS_RE = /\/assets\/(?:img|images|static)\/(?:logo|brand)\b/i;

const HURRIYET_LOGO_RE =
  /hurriyet|hürriyet|hurriyetcomtr|hurriyet-logo|hurriyet_logo|hurriyet-logo/i;

const SMALL_DIM_RE = /(?:^|[?&])(?:w|width|h|height|resize)=(\d+)/gi;

/** Yayıncı sitesi ile görsel CDN'i eşleştir (ör. patronlardunyasi.com → pdimage.com). */
const PUBLISHER_IMAGE_CDN_RULES: Array<{ pageHost: RegExp; imageHost: RegExp }> = [
  { pageHost: /patronlardunyasi\.com/i, imageHost: /(^|\.)pdimage\.com$/i },
];

const TR_PUBLISHER_TOKENS = [
  "hurriyet",
  "hürriyet",
  "ntv",
  "sozcu",
  "sözcü",
  "haberler",
  "milliyet",
  "sabah",
  "haberturk",
  "habertürk",
  "cnn",
  "aa",
  "anadolu",
  "trt",
  "yenisafak",
  "yenişafak",
  "posta",
  "fanatik",
  "mynet",
  "ensonhaber",
  "internethaber",
  "takvim",
  "star",
  "ahaber",
  "cnnturk",
  "haber7",
  "yenicag",
  "yeniçağ",
  "karar",
  "birgun",
  "birgün",
  "cumhuriyet",
  "dunya",
  "dünya",
  "sondakika",
];

function decodePathSegment(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function basename(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  return decodePathSegment(last.replace(/\?.*$/, ""));
}

/** URL sorgu / dosya adından küçük görsel boyutunu tahmin eder (<200 ise logo/banner olabilir). */
export function inferredImageMaxSide(url: string): number | null {
  const sides: number[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(SMALL_DIM_RE.source, SMALL_DIM_RE.flags);
  while ((m = re.exec(url)) !== null) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) sides.push(n);
  }
  const dimMatch = url.match(/\/(\d{2,3})x(\d{2,3})\//i);
  if (dimMatch) {
    sides.push(Number(dimMatch[1]), Number(dimMatch[2]));
  }
  if (!sides.length) return null;
  return Math.max(...sides);
}

export function hostnameFromUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return undefined;
  }
}

function publisherTokenFromHost(host: string | undefined): string | undefined {
  if (!host) return undefined;
  const base = host.replace(/^www\./i, "").split(".")[0] ?? "";
  return base.toLowerCase().replace(/[^a-z0-9ğüşıöç]/gi, "");
}

function publisherTokensInHost(host: string | undefined): string[] {
  if (!host) return [];
  const h = host.toLowerCase();
  const out: string[] = [];
  const base = publisherTokenFromHost(host);
  if (base) out.push(base);
  for (const tok of TR_PUBLISHER_TOKENS) {
    const t = tok.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (t && h.includes(t) && !out.includes(t)) out.push(t);
  }
  return out;
}

function isPublisherNameOnlyFilename(filename: string, pageHost?: string): boolean {
  const base = filename
    .replace(/\.(jpe?g|png|gif|webp|svg|avif)(\?.*)?$/i, "")
    .replace(/[-_]/g, "")
    .toLowerCase();
  if (!base || base.length > 40) return false;

  const hostToken = publisherTokenFromHost(pageHost);
  if (hostToken && (base === hostToken || base === `${hostToken}logo` || base === `logo${hostToken}`)) {
    return true;
  }

  for (const tok of TR_PUBLISHER_TOKENS) {
    const t = tok.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!t) continue;
    if (base === t || base === `${t}logo` || base === `logo${t}`) return true;
  }
  return false;
}

function publisherStem(host: string | undefined): string {
  if (!host) return "";
  return (
    host
      .replace(/^www\./i, "")
      .split(".")[0]
      ?.toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "") ?? ""
  );
}

function normalizeHostToken(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Yayıncının CDN / görsel sunucusu (habervakticom.teimg.com → habervakti.com). */
export function isRelatedPublisherImageUrl(imageUrl: string, pageUrl?: string): boolean {
  const pageHost = pageUrl ? hostnameFromUrl(pageUrl) : undefined;
  const imageHost = hostnameFromUrl(imageUrl);
  if (!pageHost || !imageHost) return false;
  if (pageHost === imageHost) return true;

  for (const rule of PUBLISHER_IMAGE_CDN_RULES) {
    if (rule.pageHost.test(pageHost) && rule.imageHost.test(imageHost)) return true;
  }

  const pageStem = publisherStem(pageHost);
  const imageHostToken = normalizeHostToken(imageHost);
  if (pageStem.length >= 4 && imageHostToken.includes(pageStem)) return true;

  try {
    const path = decodePathSegment(new URL(imageUrl).pathname).toLowerCase();
    if (pageStem.length >= 4) {
      if (path.includes(pageStem)) return true;
      if (path.includes(`${pageStem}-com`) || path.includes(`${pageStem}_com`)) return true;
    }
  } catch {
    /* ignore */
  }

  return false;
}

/** Görsel başka yayıncının alan adında (ör. makale NTV, og:image Hürriyet). */
export function isCrossPublisherImageUrl(imageUrl: string, pageUrl?: string): boolean {
  if (isRelatedPublisherImageUrl(imageUrl, pageUrl)) return false;

  const pageHost = pageUrl ? hostnameFromUrl(pageUrl) : undefined;
  const imageHost = hostnameFromUrl(imageUrl);
  if (!pageHost || !imageHost || pageHost === imageHost) return false;

  const pageTokens = publisherTokensInHost(pageHost);
  const imageTokens = publisherTokensInHost(imageHost);
  if (!pageTokens.length || !imageTokens.length) return false;

  const overlap = pageTokens.some((t) => imageTokens.includes(t));
  return !overlap;
}

/**
 * Yayıncı logosu / site ikonu / küçük banner adayı mı?
 * `pageUrl` verilirse yayıncı alan adıyla dosya adı eşleştirmesi yapılır.
 */
export function isLikelyPublisherLogoUrl(imageUrl: string, pageUrl?: string): boolean {
  const raw = String(imageUrl ?? "").trim();
  if (!raw || raw.toLowerCase().startsWith("data:")) return true;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return true;
  }

  const path = decodePathSegment(parsed.pathname).toLowerCase();
  const full = `${path}${parsed.search}`.toLowerCase();

  if (/\.svg(\?|#|$)/i.test(full)) return true;
  if (LOGO_PATH_RE.test(full) || LOGO_ASSETS_RE.test(full)) return true;
  if (HURRIYET_LOGO_RE.test(full) && (LOGO_PATH_RE.test(full) || /\/(?:img|images|static|assets)\//i.test(path))) {
    return true;
  }
  if (/\/(?:icon|icons|favicon|pwa|manifest)\b/i.test(path)) return true;
  if (/\/(?:header|footer|nav|menu|toolbar|brand-bar)\b/i.test(path) && /logo|brand|icon/i.test(full)) {
    return true;
  }

  const maxSide = inferredImageMaxSide(raw);
  if (maxSide != null && maxSide < 200) return true;

  const pageHost = pageUrl ? hostnameFromUrl(pageUrl) : hostnameFromUrl(raw);
  const file = basename(path);
  if (isPublisherNameOnlyFilename(file, pageHost)) return true;

  const host = hostnameFromUrl(raw);
  if (host && pageHost && host === pageHost) {
    if (LOGO_PATH_RE.test(file) || isPublisherNameOnlyFilename(file, pageHost)) return true;
    if (path.split("/").filter(Boolean).length <= 2 && /logo|brand|icon|default/i.test(file)) return true;
  }

  if (pageUrl && isCrossPublisherImageUrl(raw, pageUrl)) return true;

  return false;
}

/** İlk geçerli (logo olmayan) haber görseli URL’si. */
export function pickFirstNewsImageUrl(candidates: string[], pageUrl?: string): string | null {
  for (const u of candidates) {
    const t = String(u ?? "").trim();
    if (!t || !/^https?:\/\//i.test(t)) continue;
    if (!isLikelyPublisherLogoUrl(t, pageUrl)) return t;
  }
  return null;
}

export function filterNewsImageUrls(candidates: string[], pageUrl?: string): string[] {
  const out: string[] = [];
  for (const u of candidates) {
    const t = String(u ?? "").trim();
    if (!t || !/^https?:\/\//i.test(t)) continue;
    if (isLikelyPublisherLogoUrl(t, pageUrl)) continue;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}
