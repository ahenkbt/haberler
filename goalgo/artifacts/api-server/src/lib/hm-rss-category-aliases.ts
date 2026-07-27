/**
 * RSS feed anahtarları ↔ site standart kategori slug eşlemesi.
 * Örn. son-dakika / türkiye RSS → site «gündem» kutusunda manuel haberlerle karışır.
 */

function normalizeSlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** RSS / eski anahtar → site vitrin slug (standart kategoriler). */
const RSS_TO_SITE_CATEGORY: Record<string, string> = {
  sondakika: "gundem",
  "son-dakika": "gundem",
  turkiye: "gundem",
  turkey: "gundem",
  "gundem-turkiye": "gundem",
  gundem: "gundem",
  dunya: "dunya",
  world: "dunya",
  ekonomi: "ekonomi",
  economy: "ekonomi",
  para: "ekonomi",
  ntvpara: "ekonomi",
  "ntv-para": "ekonomi",
  politika: "politika",
  siyaset: "politika",
  spor: "spor",
  sport: "spor",
  sporskor: "spor",
  "spor-skor": "spor",
  teknoloji: "teknoloji",
  technology: "teknoloji",
  egitim: "egitim",
  education: "egitim",
  saglik: "saglik",
  health: "saglik",
  yasam: "yasam",
  life: "yasam",
  "kultur-sanat": "yasam",
  kultur: "yasam",
  otomobil: "otomobil",
  auto: "otomobil",
  "savunma-sanayi": "savunma-sanayi",
  savunmasanayi: "savunma-sanayi",
};

/** Spor iç kategorileri — «spor» isteğine tek yönlü eşleşir (tersi yok). */
const SPOR_SUBCATEGORY_SLUGS = new Set([
  "futbol",
  "basketbol",
  "tenis",
  "voleybol",
  "ozel-haber",
  "ozelhaber",
]);

function isSporSubcategorySlug(slug: string): boolean {
  return SPOR_SUBCATEGORY_SLUGS.has(slug);
}

/** Alias genişletmesi: bir slug’ın tüm eşdeğerleri (eşleşme için). */
const ALIAS_GROUPS: string[][] = [
  ["gundem", "sondakika", "son-dakika", "turkiye", "turkey"],
  ["dunya", "world"],
  ["ekonomi", "para", "ntvpara", "ntv-para", "economy"],
  ["politika", "siyaset"],
  ["spor", "sport", "sporskor", "spor-skor"],
  ["teknoloji", "technology"],
  ["egitim", "education"],
  ["saglik", "health"],
  ["yasam", "life", "kultur", "kultur-sanat"],
  ["otomobil", "auto"],
  ["savunma-sanayi", "savunmasanayi", "savunmaSanayi"],
];

const ALIAS_SET_BY_SLUG = (() => {
  const map = new Map<string, Set<string>>();
  for (const group of ALIAS_GROUPS) {
    const normalized = group.map((s) => normalizeSlug(s)).filter(Boolean);
    const set = new Set(normalized);
    for (const slug of normalized) map.set(slug, set);
  }
  return map;
})();

/** RSS anahtarını site vitrin slug’ına çevir (yoksa normalize edilmiş hali). */
export function canonicalizeRssCategorySlug(raw: unknown): string {
  const slug = normalizeSlug(raw);
  if (!slug) return "";
  const fromTable = RSS_TO_SITE_CATEGORY[slug] || RSS_TO_SITE_CATEGORY[String(raw ?? "").trim()];
  if (fromTable) return normalizeSlug(fromTable) || fromTable;
  // camelCase id (sonDakika) normalizeSlug ile zaten sondakika olur
  return slug;
}

/** İki kategori slug’ı aynı vitrin kutusuna mı düşer? */
export function rssCategorySlugsMatch(a: unknown, b: unknown): boolean {
  const left = normalizeSlug(a);
  const right = normalizeSlug(b);
  if (!right) return true;
  if (!left) return false;
  if (left === right) return true;
  if (left.endsWith(`-${right}`) || right.endsWith(`-${left}`)) return true;
  const leftCanon = canonicalizeRssCategorySlug(left);
  const rightCanon = canonicalizeRssCategorySlug(right);
  if (leftCanon && rightCanon && leftCanon === rightCanon) return true;
  if (leftCanon === right || left === rightCanon) return true;
  const group = ALIAS_SET_BY_SLUG.get(left) || ALIAS_SET_BY_SLUG.get(leftCanon);
  if (group && (group.has(right) || group.has(rightCanon))) return true;
  // Tek yön: Futbol/Basketbol… → spor kutusu; genel spor feed’i alt sekmeye düşmez.
  if ((right === "spor" || rightCanon === "spor") && isSporSubcategorySlug(leftCanon || left)) {
    return true;
  }
  return false;
}

/** Eşleşme için aday slug listesi (orijinal + kanonik + grup). */
export function expandRssCategorySlugCandidates(...raws: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  };
  for (const raw of raws) {
    const slug = normalizeSlug(raw);
    if (!slug) continue;
    push(slug);
    const canon = canonicalizeRssCategorySlug(slug);
    push(canon);
    const group = ALIAS_SET_BY_SLUG.get(slug) || ALIAS_SET_BY_SLUG.get(canon);
    if (group) for (const g of group) push(g);
  }
  return out;
}
