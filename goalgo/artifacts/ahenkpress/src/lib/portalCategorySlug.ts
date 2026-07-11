import { humanizeNewsCategorySlug, normalizeNewsCategorySlug } from "./hmCategorySlug";

/** Yekpare portal `/tum-haberler` — kurumsal HM site sayfa kategorileri (haber deşil). */
const PORTAL_NON_NEWS_CATEGORY_SLUGS = new Set([
  "dernegimiz",
  "faaliyetler",
  "faaliyetlerimiz",
  "kurumsal",
  "hakkimizda",
  "kunye",
  "iletisim",
  "bagis",
  "bagis-yap",
  "yonetim",
  "teskilat",
  "uyelik",
  "vizyon",
  "misyon",
  "tarihce",
  "organlar",
  "yonetim-kurulu",
  "denetim-kurulu",
  "tuzuk",
  "kariyer",
  "gizlilik",
  "etkinlikler",
  "etkinliklerimiz",
  "projeler",
  "projelerimiz",
  "mutesebbis-heyeti",
  "genel-kurul",
  "baskanin-mesaji",
  "amacimiz",
  "hedefimiz",
  "subelerimiz",
  "temsilcilikler",
  "uyelik-formu",
  "aidat",
  "tanitim",
  "dernek-tarihcesi",
]);

const PORTAL_NON_NEWS_CATEGORY_SLUG_FRAGMENTS = [
  "dernegimiz",
  "faaliyet",
  "kurumsal",
  "hakkimizda",
  "yonetim-kurulu",
  "denetim-kurulu",
  "mutesebbis",
  "genel-kurul",
] as const;

const PORTAL_NON_NEWS_CATEGORY_LABELS = new Set(
  [
    "Derneşimiz",
    "Faaliyetler",
    "Faaliyetlerimiz",
    "Kurumsal",
    "Hakkımızda",
    "Künye",
    "Vizyon",
    "Misyon",
    "Tarihçe",
    "Üyelik",
    "Teşkilat",
    "Organlarımız",
    "Yönetim Kurulu",
    "Denetim Kurulu",
    "Bağış",
    "Bağış Yap",
    "Etkinliklerimiz",
    "Projelerimiz",
    "Başkanın Mesajı",
    "Amacımız",
    "Hedefimiz",
    "Şubelerimiz",
    "Temsilcilikler",
  ].map((label) => label.toLocaleLowerCase("tr-TR")),
);

function portalNonNewsSlugMatches(slug: string): boolean {
  if (!slug) return false;
  if (PORTAL_NON_NEWS_CATEGORY_SLUGS.has(slug)) return true;
  return PORTAL_NON_NEWS_CATEGORY_SLUG_FRAGMENTS.some(
    (frag) => slug === frag || slug.startsWith(`${frag}-`) || slug.endsWith(`-${frag}`) || slug.includes(`-${frag}-`),
  );
}

/** Yekpare portal haber listelerinde kurumsal/site sayfa kategorilerini ayıklar. HM editör sitelerinde kullanılmaz. */
export function isPortalNonNewsCategory(slugRaw: unknown, labelRaw?: unknown): boolean {
  const slug = normalizeNewsCategorySlug(slugRaw) || normalizeNewsCategorySlug(labelRaw);
  if (slug && portalNonNewsSlugMatches(slug)) return true;
  const label = String(labelRaw ?? "").trim().toLocaleLowerCase("tr-TR");
  if (!label) return false;
  if (PORTAL_NON_NEWS_CATEGORY_LABELS.has(label)) return true;
  for (const exact of PORTAL_NON_NEWS_CATEGORY_LABELS) {
    if (label.endsWith(` · ${exact}`) || label.endsWith(` - ${exact}`)) return true;
  }
  return false;
}

/** Portal kategori adından site önekini ayırır (`Site · Kategori`, `Site - Kategori`). */
export function pickPortalCategoryDisplayName(name: string, canonicalSlug: string): string {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return humanizeNewsCategorySlug(canonicalSlug);
  const dotParts = trimmed.split(" · ").map((part) => part.trim()).filter(Boolean);
  if (dotParts.length >= 2) return dotParts[dotParts.length - 1]!;
  const dashParts = trimmed.split(/\s+[-–—]\s+/).map((part) => part.trim()).filter(Boolean);
  if (dashParts.length >= 2) return dashParts[dashParts.length - 1]!;
  return trimmed;
}

/** Bilinen canonical slug kümesiyle `{site}-{category}` biçimini birleştirir. */
export function resolveCanonicalPortalCategorySlug(
  categorySlug: string,
  knownCanonicalSlugs: ReadonlySet<string>,
  siteSlugPrefixes: readonly string[] = [],
): string {
  let slug = normalizeNewsCategorySlug(categorySlug);
  if (!slug) return "";

  const prefixes = [...siteSlugPrefixes]
    .map((value) => normalizeNewsCategorySlug(value))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    const needle = `${prefix}-`;
    if (slug.startsWith(needle) && slug.length > needle.length) {
      slug = slug.slice(needle.length);
      break;
    }
  }

  if (knownCanonicalSlugs.has(slug)) return slug;
  const sorted = [...knownCanonicalSlugs].sort((a, b) => b.length - a.length);
  for (const canonical of sorted) {
    if (slug === canonical) return canonical;
    if (slug.endsWith(`-${canonical}`) && slug.length > canonical.length + 1) return canonical;
  }
  return slug;
}

export function resolvePortalCategoryLabel(
  slug: string,
  rawLabel: string,
  labelByCanonicalSlug: ReadonlyMap<string, string>,
): string {
  const canonical = slug;
  const fromApi = labelByCanonicalSlug.get(canonical);
  if (fromApi) return fromApi;
  return pickPortalCategoryDisplayName(rawLabel, canonical);
}
