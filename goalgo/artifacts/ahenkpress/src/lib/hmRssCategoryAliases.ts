/**
 * RSS feed anahtarları ↔ site standart kategori slug eşlemesi.
 * API `hm-rss-category-aliases.ts` ile aynı sözlük — vitrin kutularında karma gösterim.
 */

import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import { isSporSubcategorySlug } from "@/lib/hmSporSubcategories";

/** RSS / eski anahtar → site vitrin slug. */
const RSS_TO_SITE_CATEGORY: Record<string, string> = {
  sondakika: "gundem",
  "son-dakika": "gundem",
  turkiye: "gundem",
  turkey: "gundem",
  "gundem-turkiye": "gundem",
  gundem: "gundem",
  genel: "gundem",
  guncel: "gundem",
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
  "teknoloji-ve-bilim": "teknoloji",
  teknolojivebilim: "teknoloji",
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
  magazin: "magazin",
  asayis: "asayis",
  yerel: "yerel",
  "yerel-haber": "yerel",
  yozgat: "yerel",
  "savunma-sanayi": "savunma-sanayi",
  savunmasanayi: "savunma-sanayi",
};

const ALIAS_GROUPS: string[][] = [
  ["gundem", "sondakika", "son-dakika", "turkiye", "turkey", "genel", "guncel"],
  ["dunya", "world"],
  ["ekonomi", "para", "ntvpara", "ntv-para", "economy"],
  ["politika", "siyaset"],
  ["spor", "sport", "sporskor", "spor-skor"],
  ["teknoloji", "technology", "teknoloji-ve-bilim", "teknolojivebilim"],
  ["egitim", "education"],
  ["saglik", "health"],
  ["yasam", "life", "kultur", "kultur-sanat"],
  ["otomobil", "auto"],
  ["magazin"],
  ["asayis"],
  ["yerel", "yerel-haber", "yozgat"],
  ["savunma-sanayi", "savunmasanayi"],
];

const ALIAS_SET_BY_SLUG = (() => {
  const map = new Map<string, Set<string>>();
  for (const group of ALIAS_GROUPS) {
    const normalized = group.map((s) => normalizeNewsCategorySlug(s)).filter(Boolean) as string[];
    const set = new Set(normalized);
    for (const slug of normalized) map.set(slug, set);
  }
  return map;
})();

export function canonicalizeRssCategorySlug(raw: unknown): string {
  const slug = normalizeNewsCategorySlug(raw);
  if (!slug) return "";
  const fromTable = RSS_TO_SITE_CATEGORY[slug];
  if (fromTable) return normalizeNewsCategorySlug(fromTable) || fromTable;
  return slug;
}

export function rssCategorySlugsMatch(a: unknown, b: unknown): boolean {
  const left = normalizeNewsCategorySlug(a);
  const right = normalizeNewsCategorySlug(b);
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
  // Tek yön: Futbol/Basketbol… feed’leri «spor» kutusuna girer; genel spor feed’i alt sekmeye girmez.
  if ((right === "spor" || rightCanon === "spor") && isSporSubcategorySlug(leftCanon || left)) {
    return true;
  }
  return false;
}

export function expandRssCategorySlugCandidates(...raws: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  };
  for (const raw of raws) {
    const slug = normalizeNewsCategorySlug(raw);
    if (!slug) continue;
    push(slug);
    const canon = canonicalizeRssCategorySlug(slug);
    push(canon);
    const group = ALIAS_SET_BY_SLUG.get(slug) || ALIAS_SET_BY_SLUG.get(canon);
    if (group) for (const g of group) push(g);
  }
  return out;
}
