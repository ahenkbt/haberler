import { resolveHmDomainSlugHint } from "./hmNestedMetaStorage";
import { LEGACY_PORTAL_HOSTS, PORTAL_ALIAS_HOSTS, PORTAL_HOST, PORTAL_WWW_HOST } from "./portalBrand";
import { readVendorDomainMetaCache } from "./vendorDomainStorage";

function normalizeHostKey(host: string): string {
  return host.toLowerCase().split(":")[0]?.replace(/^www\./, "") ?? "";
}

/** HM haber merkezi özel alanı (domain cache, erken bootstrap veya meta taraması). */
export function isKnownHmCustomHost(host: string): boolean {
  const h = normalizeHostKey(host);
  if (!h || isConfiguredPortalHost(h)) return false;
  return !!resolveHmDomainSlugHint(host);
}

/** Yapılandırılmış kanonik portal hostları (yekpare.net, turknet.app, VITE_PORTAL_HOSTS, localhost, *.vercel.app, *.netlify.app). */
export function isConfiguredPortalHost(host: string): boolean {
  const h = normalizeHostKey(host);
  if (!h || h === "localhost" || h === "127.0.0.1") return true;
  if (h === PORTAL_HOST || h === PORTAL_WWW_HOST) return true;
  if ((LEGACY_PORTAL_HOSTS as readonly string[]).includes(h)) return true;
  if ((PORTAL_ALIAS_HOSTS as readonly string[]).includes(h)) return true;
  if (h.endsWith(".vercel.app")) return true;
  if (h.endsWith(".netlify.app")) return true;
  const extra = String(import.meta.env.VITE_PORTAL_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^www\./, ""))
    .filter(Boolean);
  if (extra.includes(h)) return true;
  return false;
}

/** Yekpare ana portalında mı (HM özel alan değil)? */
export function isDefaultPortalHost(host: string): boolean {
  return isConfiguredPortalHost(host);
}

/**
 * Newsmap, Bilgi Ağacı ve YekTube yalnızca yekpare.net hub'ında açık.
 * HM özel alan ve `/tr/{slug}` (slug !== yekpare) için false.
 */
export function isYekparePortalHubOnly(host: string, slug?: string | null): boolean {
  if (!isDefaultPortalHost(host)) return false;
  const s = String(slug ?? "").trim().toLowerCase();
  if (s && s !== "yekpare") return false;
  return true;
}

/**
 * Mağaza özel alanı olarak önbellekte kayıtlı mı?
 * HM domain slug önbelleği yalnızca hızlı yönlendirme içindir; bağsız alanların portal sanılmasını önlemek için burada kullanılmaz.
 */
export function isKnownCustomBoundHost(host: string): boolean {
  const h = normalizeHostKey(host);
  if (!h || isConfiguredPortalHost(h)) return false;
  return !!readVendorDomainMetaCache(h);
}

/**
 * Portal vitrini gösterilmeli mi (anasayfa, SEO, göreli /api vekili, medya)?
 * Kanonik portal hostları: evet. Kayıtlı HM/mağaza özel alanı: hayır.
 * Bilinmeyen özel alan: portal sanılmaz (HM meta yüklenene kadar Yekpare SEO/flash önlenir).
 */
export function isEffectivePortalHost(host: string): boolean {
  const h = normalizeHostKey(host);
  if (!h || isConfiguredPortalHost(h)) return true;
  if (isKnownCustomBoundHost(h) || isKnownHmCustomHost(h)) return false;
  return false;
}
