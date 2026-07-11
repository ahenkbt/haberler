/** v2 SPA public kökü — prod: /yektube-v2 veya /yektube */
export const YEKTUBE_V2_PUBLIC_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_YEKTUBE_V2_PUBLIC_BASE?.trim()) ||
  "/yektube-v2";

function normalizeBase(base: string): string {
  const b = base.trim().replace(/\/+$/, "");
  return b || "/yektube-v2";
}

/** v1 bölüm slug → v2 rota (router içi, leading slash) */
export function mapV1SectionSuffixToV2(rest: string, search = ""): string {
  const clean = rest.replace(/\/+$/, "").replace(/^\//, "");
  if (!clean) return appendSearch("/", search);

  const parts = clean.split("/");
  const [section, a, b] = parts;

  if (section === "kanal") {
    if (a && b) return appendSearch(`/kanal/${a}/${decodeURIComponent(b)}`, search);
    if (a) return appendSearch(`/kanal/${a}`, search);
  }

  if (section === "playlist" && a) {
    if (b) return appendSearch(`/kanal/${a}/${decodeURIComponent(b)}`, search);
    return appendSearch(`/kanal/${a}`, search);
  }

  if (section === "canlitv") {
    if (a === "kanal" && b) return appendSearch(`/kanal/${b}`, search);
    return appendSearch("/", search);
  }

  switch (section) {
    case "yekcek":
    case "shorts":
      return appendSearch("/yekcek", search);
    case "abonelikler":
      return appendSearch("/abonelikler", search);
    case "kutuphane":
      return appendSearch("/kutuphane", search);
    case "ara":
      return appendSearch("/ara", search);
    case "videolar":
    case "kanallar":
    case "oynatma-listeleri":
    case "playlists":
    case "podcasts":
    case "podcastler":
    case "sesli-gunluk":
    case "rastgele":
    case "one-cikanlar":
    case "onecikanlar":
    case "anasayfa":
      return appendSearch("/", search);
    default:
      return appendSearch("/", search);
  }
}

function appendSearch(path: string, search: string): string {
  const q = search.trim();
  if (!q) return path;
  return `${path}${q.startsWith("?") ? q : `?${q}`}`;
}

const HM_VIDEO_TV_PORTAL_TOP_LEVEL: Record<string, string> = {
  muzik: "/muzik",
  cocuk: "/cocuk",
  yekcek: "/yp/yekcek",
  abonelikler: "/yp/abonelikler",
  kutuphane: "/yp/kutuphane",
  kategoriler: "/yp/kategoriler",
  ara: "/yp/ara",
  canli: "/canli",
  "yek-gonder": "/yek-gonder",
  yeklive: "/yek-gonder",
  hesabim: "/hesabim",
  studio: "/studio",
};

/** HM `/tr/:slug/video-tv/...` → yekpare.net `/yp` (veya `/muzik` vb.) göreli yol. */
export function mapHmVideoTvRestToPortalPath(rest: string): string {
  const trimmed = rest.replace(/\/+$/, "").replace(/^\//, "");
  if (!trimmed) return "/yp/";

  const [head, ...tail] = trimmed.split("/");
  if (head === "canlitv") return "/yp/";

  const mappedRoot = head ? HM_VIDEO_TV_PORTAL_TOP_LEVEL[head] : undefined;
  if (mappedRoot) {
    const suffix = tail.length ? `/${tail.join("/")}` : "";
    return `${mappedRoot}${suffix}`.replace(/\/{2,}/g, "/");
  }

  const sub = mapV1SectionSuffixToV2(`/${trimmed}`, "");
  const pathOnly = sub.split("?")[0] ?? "/";
  if (pathOnly === "/") return "/yp/";
  return `/yp${pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`}`;
}

function buildHmVideoTvEmbedPath(pathname: string, search = ""): string | null {
  const path = (pathname.split("?")[0] ?? "").replace(/\/+$/, "") || "/";
  const trMatch = path.match(/^\/tr\/([^/]+)\/video-tv(\/.*)?$/);
  const shortMatch = trMatch ? null : path.match(/^\/([^/]+)\/video-tv(\/.*)?$/);
  const hm = trMatch ?? shortMatch;
  if (!hm) return null;
  const slug = hm[1]!;
  if (!trMatch && (slug === "tr" || slug === "hm")) return null;
  const rest = hm[2] ?? "";
  const portalPath = mapHmVideoTvRestToPortalPath(rest);
  const embedQs = new URLSearchParams(search.replace(/^\?/, ""));
  embedQs.set("embed", "1");
  embedQs.set("hm", slug);
  const qStr = embedQs.toString();
  const [pathOnly] = portalPath.split("?");
  return `${pathOnly}${qStr ? `?${qStr}` : ""}`;
}

/** Tam site yolu → v2 SPA URL (query korunur) */
export function mapPathToYektubeV2(pathname: string, search = "", publicBase = YEKTUBE_V2_PUBLIC_BASE): string {
  const base = normalizeBase(publicBase);
  const path = (pathname.split("?")[0] ?? "").replace(/\/+$/, "") || "/";
  const qs = search || (pathname.includes("?") ? `?${pathname.split("?")[1]}` : "");

  const hmEmbed = buildHmVideoTvEmbedPath(pathname, qs);
  if (hmEmbed) return hmEmbed;

  if (path === "/yektube" || path.startsWith("/yektube/")) {
    const rest = path === "/yektube" ? "" : path.slice("/yektube".length);
    return `${base}${mapV1SectionSuffixToV2(rest, qs)}`;
  }

  if (path.startsWith("/video-tv")) {
    const rest = path.slice("/video-tv".length);
    return `${base}${mapV1SectionSuffixToV2(rest, qs)}`;
  }

  if (path === "/canlitv" || path.startsWith("/canlitv/")) {
    const rest = path === "/canlitv" ? "" : path.slice("/canlitv".length);
    return `${base}${mapV1SectionSuffixToV2(rest, qs)}`;
  }

  return `${base}${mapV1SectionSuffixToV2("", qs)}`;
}

/** Kalıcı SEO: v1 bölüm URL → v2 (veya sadeleştirilmiş v1 kanonik) */
export function mapLegacyYektubePathToCanonical(pathname: string, search = "", useV2: boolean): string {
  if (useV2) return mapPathToYektubeV2(pathname, search);
  const path = (pathname.split("?")[0] ?? "").replace(/\/+$/, "") || "/";
  const qs = search || "";

  const hm = path.match(/^\/tr\/([^/]+)\/video-tv(\/.*)?$/);
  if (hm) {
    const slug = hm[1]!;
    const rest = hm[2] ?? "";
    const mapped = mapV1SectionSuffixToV2(rest, qs);
    const canonicalRest = mapped.startsWith("/") ? mapped : `/${mapped}`;
    if (canonicalRest === appendSearch(rest, qs)) return `${path}${qs}`;
    return `/tr/${slug}/video-tv${canonicalRest}`;
  }

  if (path.startsWith("/video-tv/")) {
    const rest = path.slice("/video-tv".length);
    return appendSearch(`/yektube${mapV1SectionSuffixToV2(rest, "")}`, qs);
  }

  if (path.startsWith("/yektube/")) {
    const rest = path.slice("/yektube".length);
    const mapped = mapV1SectionSuffixToV2(rest, qs);
    if (mapped === appendSearch(rest, qs)) return `${path}${qs}`;
    return `/yektube${mapped}`;
  }

  return `${path}${qs}`;
}
