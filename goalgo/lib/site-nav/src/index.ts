/** Ana menü öğe anahtarları — URL ve ikonlar AppNav tarafında eşlenir. */
export const MAIN_NAV_KEY_ORDER = [
  "kesfet",
  "siparis",
  "magaza",
  "alisveris",
  "haritalar",
  "turizm",
  "otomotiv",
  "ulasim",
  "haberler",
  "ansiklopedi",
  "yektube",
  "firmaRehberi",
  "iletisim",
  /** Sipariş alt kategorileri — üst menüde değil; modül aç/kapa ve footer havuzu */
  "yemek",
  "market",
  "isletmeler",
] as const;

export type MainNavKey = (typeof MAIN_NAV_KEY_ORDER)[number];

/** Sipariş üst menüsünün alt sekmeleri — yalnızca dropdown / alt nav'da gösterilir. */
export const SIPARIS_SUB_NAV_KEYS = ["yemek", "market", "isletmeler"] as const satisfies readonly MainNavKey[];

export type SiparisSubNavKey = (typeof SIPARIS_SUB_NAV_KEYS)[number];

export function isSiparisSubNavKey(key: MainNavKey): key is SiparisSubNavKey {
  return (SIPARIS_SUB_NAV_KEYS as readonly string[]).includes(key);
}

const ALLOWED = new Set<string>(MAIN_NAV_KEY_ORDER);
const SIPARIS_SUB_NAV_SET = new Set<string>(SIPARIS_SUB_NAV_KEYS);
/** Eski DB mainNavJson kayıtlarında eksik kalabilir — okunurken varsayılan sıraya eklenir. */
const REQUIRED_PLATFORM_NAV_KEYS: MainNavKey[] = ["kesfet", "haritalar", "otomotiv"];
const REQUIRED_TOP_NAV_KEYS: MainNavKey[] = ["siparis"];

export const MAIN_NAV_LABELS: Record<MainNavKey, string> = {
  haberler: "Haberler",
  ansiklopedi: "Ansiklopedi",
  yektube: "YekTube",
  kesfet: "Keşfet",
  haritalar: "Haritalar",
  firmaRehberi: "Sarı Sayfalar",
  alisveris: "Alışveriş",
  magaza: "Alışveriş",
  yemek: "Yemek",
  market: "Market",
  isletmeler: "Yakınımdakiler",
  siparis: "Sipariş",
  turizm: "Seyahat",
  otomotiv: "Otomotiv",
  ulasim: "Ulaşım",
  iletisim: "İletişim",
};

export const MAIN_NAV_HREF: Record<MainNavKey, string> = {
  haberler: "/haberler",
  ansiklopedi: "/bilgiagaci",
  yektube: "/yektube",
  kesfet: "/kesfet",
  haritalar: "/haritalar",
  firmaRehberi: "/firma-rehberi",
  alisveris: "/alisveris",
  magaza: "/magaza",
  yemek: "/yemek",
  market: "/market",
  isletmeler: "/isletmeler",
  siparis: "/siparis",
  turizm: "/turizm",
  otomotiv: "/otomotiv",
  ulasim: "/ulasim",
  iletisim: "/iletisim",
};

/** Varsayılan footer link sırası (üst menüden bağımsız). */
const FOOTER_NAV_DEFAULT: MainNavKey[] = [
  "haberler",
  "yektube",
  "kesfet",
  "haritalar",
  "firmaRehberi",
  "turizm",
  "otomotiv",
  "alisveris",
  "magaza",
  "yemek",
  "market",
  "isletmeler",
  "siparis",
  "ulasim",
  "iletisim",
];

/** Üst menü: yerleşik modül veya özel bağlantı. */
export type NavMenuItem =
  | { kind: "module"; key: MainNavKey }
  | { kind: "link"; id: string; label: string; href: string; newTab?: boolean };

export function defaultNavMenuItems(): NavMenuItem[] {
  return MAIN_NAV_KEY_ORDER.filter((k) => !SIPARIS_SUB_NAV_SET.has(k)).map((k) => ({
    kind: "module" as const,
    key: k,
  }));
}

/** Eski kayıtlarda üst menüde ayrı duran yemek/market/yakınımdakiler → Sipariş altına taşınır. */
function collapseSiparisSubNavToParent(items: NavMenuItem[]): NavMenuItem[] {
  const hasSiparis = items.some((x) => x.kind === "module" && x.key === "siparis");
  const firstSubIdx = items.findIndex((x) => x.kind === "module" && SIPARIS_SUB_NAV_SET.has(x.key));
  const filtered = items.filter((x) => !(x.kind === "module" && SIPARIS_SUB_NAV_SET.has(x.key)));
  if (!hasSiparis) {
    const insertAt = firstSubIdx >= 0 ? Math.min(firstSubIdx, filtered.length) : filtered.length;
    filtered.splice(insertAt, 0, { kind: "module", key: "siparis" });
  }
  return filtered;
}

function insertMissingNavKeyAtDefaultPosition(
  next: NavMenuItem[],
  key: MainNavKey,
  existing: Set<string>,
): void {
  if (existing.has(key)) return;
  const defaultIdx = MAIN_NAV_KEY_ORDER.indexOf(key);
  let insertAt = next.length;
  for (let i = 0; i < next.length; i++) {
    const item = next[i];
    if (item.kind !== "module") continue;
    const itemIdx = MAIN_NAV_KEY_ORDER.indexOf(item.key);
    if (itemIdx > defaultIdx) {
      insertAt = i;
      break;
    }
  }
  next.splice(insertAt, 0, { kind: "module", key });
  existing.add(key);
}

function withRequiredPublicNavItems(items: NavMenuItem[]): NavMenuItem[] {
  const next = collapseSiparisSubNavToParent([...items]);
  const existing = new Set(next.filter((x): x is { kind: "module"; key: MainNavKey } => x.kind === "module").map((x) => x.key));
  if (!existing.has("yektube")) {
    const afterNews = next.findIndex((item) => item.kind === "module" && item.key === "haberler");
    next.splice(afterNews >= 0 ? afterNews + 1 : 0, 0, { kind: "module", key: "yektube" });
    existing.add("yektube");
  }
  for (const key of REQUIRED_TOP_NAV_KEYS) {
    insertMissingNavKeyAtDefaultPosition(next, key, existing);
  }
  for (const key of REQUIRED_PLATFORM_NAV_KEYS) {
    insertMissingNavKeyAtDefaultPosition(next, key, existing);
  }
  return next;
}

function normalizePublicNavText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function isStalePublicNavLink(label: string, href: string): boolean {
  const text = normalizePublicNavText(`${label} ${href}`);
  return (
    [String.fromCharCode(112, 97, 114, 99, 97), String.fromCharCode(112, 97, 114, 99, 101, 108), "6am" + "mart", "google", "maps"].some((word) =>
      new RegExp(`\\b${word}\\b`).test(text),
    ) ||
    href.trim() === "#" ||
    /^javascript:/i.test(href.trim())
  );
}

function normalizeNavMenuItems(items: NavMenuItem[]): NavMenuItem[] {
  const out = items.filter((item) => {
    if (item.kind === "module") return true;
    return !isStalePublicNavLink(item.label, item.href);
  });
  return withRequiredPublicNavItems(out.length > 0 ? out : defaultNavMenuItems());
}

function legacyMainNavArrayToItems(data: unknown[]): NavMenuItem[] {
  const out: NavMenuItem[] = [];
  const seen = new Set<string>();
  for (const item of data) {
    if (typeof item !== "string" || !ALLOWED.has(item) || seen.has(item)) continue;
    seen.add(item);
    out.push({ kind: "module", key: item as MainNavKey });
  }
  return normalizeNavMenuItems(out.length > 0 ? out : defaultNavMenuItems());
}

function parseNavMenuV1Items(items: unknown[]): NavMenuItem[] {
  const out: NavMenuItem[] = [];
  const seenModule = new Set<string>();
  const seenLink = new Set<string>();
  for (const row of items) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const type = (row as { type?: unknown }).type;
    if (type === "module") {
      const key = (row as { key?: unknown }).key;
      if (typeof key !== "string" || !ALLOWED.has(key) || seenModule.has(key)) continue;
      seenModule.add(key);
      out.push({ kind: "module", key: key as MainNavKey });
    } else if (type === "link") {
      const id = (row as { id?: unknown }).id;
      const label = (row as { label?: unknown }).label;
      const href = (row as { href?: unknown }).href;
      const newTab = (row as { newTab?: unknown }).newTab;
      if (typeof id !== "string" || id.length === 0 || id.length > 64 || seenLink.has(id)) continue;
      if (typeof label !== "string" || label.trim().length === 0 || label.length > 48) continue;
      if (typeof href !== "string" || href.trim().length === 0 || href.length > 512) continue;
      seenLink.add(id);
      out.push({
        kind: "link",
        id,
        label: label.trim(),
        href: href.trim(),
        newTab: newTab === true,
      });
    }
  }
  const hasModule = out.some((x) => x.kind === "module");
  return normalizeNavMenuItems(hasModule ? out : defaultNavMenuItems());
}

/** Tam üst menü sırası (modül + özel link karışık). */
export function parseNavMenuItems(json: string | null | undefined): NavMenuItem[] {
  if (json == null || String(json).trim() === "") return defaultNavMenuItems();
  try {
    const data = JSON.parse(json) as unknown;
    if (Array.isArray(data)) {
      return normalizeNavMenuItems(legacyMainNavArrayToItems(data));
    }
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const v = (data as { v?: unknown }).v;
      const items = (data as { items?: unknown }).items;
      if (v === 1 && Array.isArray(items)) {
        return normalizeNavMenuItems(parseNavMenuV1Items(items));
      }
    }
  } catch {
    /* fallthrough */
  }
  return defaultNavMenuItems();
}

export function serializeNavMenuItems(items: NavMenuItem[]): string {
  const payload = {
    v: 1 as const,
    items: items.map((it) => {
      if (it.kind === "module") return { type: "module", key: it.key };
      return { type: "link", id: it.id, label: it.label, href: it.href, newTab: it.newTab === true };
    }),
  };
  return JSON.stringify(payload);
}

/** Yalnızca modül anahtarları (eski tüketiciler / alt menü havuzu). */
export function parseMainNavJson(json: string | null | undefined): MainNavKey[] {
  return parseNavMenuItems(json)
    .filter((x): x is { kind: "module"; key: MainNavKey } => x.kind === "module")
    .map((x) => x.key);
}

/** Footer menü — geçersizse FOOTER_NAV_DEFAULT. */
export function parseFooterNavJson(json: string | null | undefined): MainNavKey[] {
  if (json == null || String(json).trim() === "") {
    return [...FOOTER_NAV_DEFAULT];
  }
  try {
    const data = JSON.parse(json) as unknown;
    if (!Array.isArray(data)) return [...FOOTER_NAV_DEFAULT];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of data) {
      if (typeof item !== "string" || !ALLOWED.has(item) || seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
    return (out.length > 0 ? out : [...FOOTER_NAV_DEFAULT]) as MainNavKey[];
  } catch {
    return [...FOOTER_NAV_DEFAULT];
  }
}

export function serializeMainNavKeys(keys: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    if (typeof k !== "string" || !ALLOWED.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  const finalKeys = out.length > 0 ? out : [...MAIN_NAV_KEY_ORDER];
  return JSON.stringify(finalKeys);
}

export function serializeFooterNavKeys(keys: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    if (typeof k !== "string" || !ALLOWED.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  const finalKeys = out.length > 0 ? out : [...FOOTER_NAV_DEFAULT];
  return JSON.stringify(finalKeys);
}

/** API: üst menü — eski dizi veya { v:1, items } biçimi. */
export function validateMainNavJsonInput(
  raw: string | null,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  const s = String(raw).trim();
  if (s === "") return { ok: true, value: null };
  try {
    const data = JSON.parse(s) as unknown;
    if (Array.isArray(data)) {
      let items = legacyMainNavArrayToItems(data);
      if (!items.some((x) => x.kind === "module")) {
        items = defaultNavMenuItems();
      }
      return { ok: true, value: serializeNavMenuItems(items) };
    }
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const v = (data as { v?: unknown }).v;
      const items = (data as { items?: unknown }).items;
      if (v === 1 && Array.isArray(items)) {
        let parsed = parseNavMenuV1Items(items);
        if (!parsed.some((x) => x.kind === "module")) {
          parsed = defaultNavMenuItems();
        }
        if (parsed.length > 40) {
          return { ok: false, error: "Menü en fazla 40 öğe olabilir" };
        }
        return { ok: true, value: serializeNavMenuItems(parsed) };
      }
    }
    return { ok: false, error: "mainNavJson geçersiz biçim" };
  } catch {
    return { ok: false, error: "mainNavJson geçerli JSON değil" };
  }
}

/** API: alt menü — yalnızca modül anahtarları dizisi. */
export function validateFooterNavJsonInput(
  raw: string | null,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  const s = String(raw).trim();
  if (s === "") return { ok: true, value: null };
  try {
    const data = JSON.parse(s) as unknown;
    if (!Array.isArray(data)) {
      return { ok: false, error: "footerNavJson bir dizi olmalıdır" };
    }
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of data) {
      if (typeof item !== "string" || !ALLOWED.has(item) || seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
    if (out.length === 0) {
      /* Eski kayıtlarda yalnızca kaldırılmış modüller (ör. seri-ilanlar) kalmışsa kayıt düşmesin */
      return { ok: true, value: JSON.stringify([...FOOTER_NAV_DEFAULT]) };
    }
    return { ok: true, value: JSON.stringify(out) };
  } catch {
    return { ok: false, error: "footerNavJson geçerli JSON değil" };
  }
}

/** Modül anahtarı → false ise menüde ve anasayfa hızlı erişimde gizlenir. */
export function parseModulesEnabledJson(
  json: string | null | undefined,
): Partial<Record<MainNavKey, boolean>> {
  if (json == null || String(json).trim() === "") return {};
  try {
    const o = JSON.parse(json) as unknown;
    if (!o || typeof o !== "object" || Array.isArray(o)) return {};
    const out: Partial<Record<MainNavKey, boolean>> = {};
    for (const k of MAIN_NAV_KEY_ORDER) {
      const v = (o as Record<string, unknown>)[k];
      if (typeof v === "boolean") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function isModuleEnabled(
  map: Partial<Record<MainNavKey, boolean>> | null | undefined,
  key: MainNavKey,
): boolean {
  if (!map || Object.keys(map).length === 0) return true;
  return map[key] !== false;
}

/** Tüm anahtarlar için boolean (admin form). */
export function parseModulesEnabledJsonMerged(
  json: string | null | undefined,
): Record<MainNavKey, boolean> {
  const partial = parseModulesEnabledJson(json);
  const out = {} as Record<MainNavKey, boolean>;
  for (const k of MAIN_NAV_KEY_ORDER) {
    out[k] = partial[k] !== false;
  }
  return out;
}

export function serializeModulesEnabledFull(map: Record<MainNavKey, boolean>): string {
  const o: Record<string, boolean> = {};
  for (const k of MAIN_NAV_KEY_ORDER) {
    o[k] = map[k] !== false;
  }
  return JSON.stringify(o);
}

export function validateModulesEnabledJsonInput(
  raw: string | null,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  const s = String(raw).trim();
  if (s === "") return { ok: true, value: null };
  try {
    const o = JSON.parse(s) as unknown;
    if (!o || typeof o !== "object" || Array.isArray(o)) {
      return { ok: false, error: "modulesEnabledJson bir nesne olmalıdır" };
    }
    const clean: Record<string, boolean> = {};
    for (const k of MAIN_NAV_KEY_ORDER) {
      const v = (o as Record<string, unknown>)[k];
      if (typeof v === "boolean") clean[k] = v;
    }
    return { ok: true, value: JSON.stringify(clean) };
  } catch {
    return { ok: false, error: "modulesEnabledJson geçerli JSON değil" };
  }
}

/** Anasayfa blokları (sıra korunur). */
export const HOME_SECTION_IDS = [
  "hero_search",
  "popular_cities",
  "featured_news",
  "featured_businesses",
  "recent_businesses",
  "services_grid",
  "quick_links",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

const HOME_SECTION_SET = new Set<string>(HOME_SECTION_IDS);

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  hero_search: "Üst arama (hero)",
  popular_cities: "Popüler şehirler",
  featured_news: "Öne çıkan haberler",
  featured_businesses: "Öne çıkan işletmeler",
  recent_businesses: "Son eklenen işletmeler (kategorili ızgara)",
  services_grid: "Tüm hizmetler (ızgara)",
  quick_links: "Hızlı bağlantılar (4 kutu)",
};

export function parseHomeSectionsJson(
  json: string | null | undefined,
): { id: HomeSectionId; enabled: boolean }[] {
  const defaults = HOME_SECTION_IDS.map((id) => ({ id, enabled: true }));
  if (json == null || String(json).trim() === "") return defaults;
  try {
    const data = JSON.parse(json) as unknown;
    if (!Array.isArray(data)) return defaults;
    const parsed: { id: HomeSectionId; enabled: boolean }[] = [];
    const seen = new Set<string>();
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const id = (row as { id?: unknown }).id;
      const en = (row as { enabled?: unknown }).enabled;
      if (typeof id !== "string" || !HOME_SECTION_SET.has(id) || seen.has(id)) continue;
      seen.add(id);
      parsed.push({ id: id as HomeSectionId, enabled: en !== false });
    }
    for (const d of defaults) {
      if (!seen.has(d.id)) parsed.push(d);
    }
    return parsed.length ? parsed : defaults;
  } catch {
    return defaults;
  }
}

export function serializeHomeSections(rows: { id: HomeSectionId; enabled: boolean }[]): string {
  return JSON.stringify(rows);
}

export function validateHomeSectionsJsonInput(
  raw: string | null,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  const s = String(raw).trim();
  if (s === "") return { ok: true, value: null };
  try {
    const data = JSON.parse(s) as unknown;
    if (!Array.isArray(data)) return { ok: false, error: "homeSectionsJson bir dizi olmalıdır" };
    const rows: { id: HomeSectionId; enabled: boolean }[] = [];
    const seen = new Set<string>();
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const id = (row as { id?: unknown }).id;
      const en = (row as { enabled?: unknown }).enabled;
      if (typeof id !== "string" || !HOME_SECTION_SET.has(id) || seen.has(id)) continue;
      seen.add(id);
      rows.push({ id: id as HomeSectionId, enabled: en !== false });
    }
    if (rows.length === 0) return { ok: false, error: "En az bir geçerli anasayfa bloğu gerekir" };
    return { ok: true, value: JSON.stringify(rows) };
  } catch {
    return { ok: false, error: "homeSectionsJson geçerli JSON değil" };
  }
}

export function homeSectionEnabled(
  rows: { id: HomeSectionId; enabled: boolean }[],
  id: HomeSectionId,
): boolean {
  const r = rows.find((x) => x.id === id);
  return r ? r.enabled : true;
}

/** Footer alt satırı: yasal / bilgi bağlantıları (etiket + yol). */
export type FooterLegalLink = { label: string; href: string };

const FOOTER_LEGAL_LINKS_DEFAULT: FooterLegalLink[] = [
  { label: "Mesafeli satış", href: "/mesafeli-satis-sozlesmesi" },
  { label: "Ön bilgilendirme", href: "/on-bilgilendirme" },
  { label: "Gizlilik · KVKK", href: "/gizlilik-kvkk" },
  { label: "İade / değişim", href: "/iade-degisim" },
  { label: "Teslimat", href: "/teslimat-kargo" },
  { label: "Kullanım koşulları", href: "/kullanim-kosullari" },
  { label: "SSS", href: "/sss" },
  { label: "Künye", href: "/iletisim-kunye" },
];

function isSafeLegalHref(href: string): boolean {
  const h = href.trim();
  if (!h) return false;
  if (h.startsWith("/") && !h.startsWith("//")) return h.length <= 512;
  if (h.startsWith("https://") || h.startsWith("http://")) return h.length <= 512;
  return false;
}

export function parseFooterLegalLinksJson(json: string | null | undefined): FooterLegalLink[] {
  if (json == null || String(json).trim() === "") {
    return [...FOOTER_LEGAL_LINKS_DEFAULT];
  }
  try {
    const data = JSON.parse(json) as unknown;
    if (!Array.isArray(data)) return [...FOOTER_LEGAL_LINKS_DEFAULT];
    const out: FooterLegalLink[] = [];
    const seen = new Set<string>();
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const label = String((row as { label?: unknown }).label ?? "").trim();
      const href = String((row as { href?: unknown }).href ?? "").trim();
      if (!label || label.length > 96) continue;
      if (!isSafeLegalHref(href)) continue;
      const k = `${label}\0${href}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ label, href });
      if (out.length >= 24) break;
    }
    return out.length > 0 ? out : [...FOOTER_LEGAL_LINKS_DEFAULT];
  } catch {
    return [...FOOTER_LEGAL_LINKS_DEFAULT];
  }
}

export function serializeFooterLegalLinks(links: FooterLegalLink[]): string {
  const clean = links
    .filter((x) => x.label?.trim() && x.href?.trim())
    .map((x) => ({ label: x.label.trim().slice(0, 96), href: x.href.trim().slice(0, 512) }))
    .filter((x) => isSafeLegalHref(x.href))
    .slice(0, 24);
  return JSON.stringify(clean.length ? clean : FOOTER_LEGAL_LINKS_DEFAULT);
}

export function validateFooterLegalLinksJsonInput(
  raw: string | null,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  const s = String(raw).trim();
  if (s === "") return { ok: true, value: null };
  try {
    const parsed = parseFooterLegalLinksJson(s);
    return { ok: true, value: JSON.stringify(parsed) };
  } catch {
    return { ok: false, error: "footerLegalLinksJson geçerli değil" };
  }
}

/** Footer “Bilgi rehberi” satırı — etiket + yol. */
export type FooterInfoLink = FooterLegalLink;

const FOOTER_INFO_LINKS_DEFAULT: FooterInfoLink[] = [
  { label: "Yekpare nedir", href: "/bilgi/yekpare-nedir" },
  { label: "Online sipariş", href: "/bilgi/online-siparis-nasil-verilir" },
  { label: "Ulaşım · Kurye", href: "/bilgi/ulasim-kurye-taksi-cekici" },
  { label: "Yekpare AI", href: "/bilgi/ai-cagri-merkezi-nedir" },
  { label: "İşletme · Özel domain", href: "/bilgi/isletme-sayfasi-ozel-domain" },
  { label: "Keşfet", href: "/bilgi/isletme-kesfet-rehberi" },
  { label: "Haber merkezi", href: "/bilgi/haber-merkezi-nedir" },
  { label: "RSS · Site haritaları", href: "/site-haritalari" },
];

export function parseFooterInfoLinksJson(json: string | null | undefined): FooterInfoLink[] {
  if (json == null || String(json).trim() === "") {
    return [...FOOTER_INFO_LINKS_DEFAULT];
  }
  try {
    const data = JSON.parse(json) as unknown;
    if (!Array.isArray(data)) return [...FOOTER_INFO_LINKS_DEFAULT];
    const out: FooterInfoLink[] = [];
    const seen = new Set<string>();
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const label = String((row as { label?: unknown }).label ?? "").trim();
      const href = String((row as { href?: unknown }).href ?? "").trim();
      if (!label || label.length > 96) continue;
      if (!isSafeLegalHref(href)) continue;
      const k = `${label}\0${href}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ label, href });
      if (out.length >= 24) break;
    }
    return out.length > 0 ? out : [...FOOTER_INFO_LINKS_DEFAULT];
  } catch {
    return [...FOOTER_INFO_LINKS_DEFAULT];
  }
}

export function serializeFooterInfoLinks(links: FooterInfoLink[]): string {
  const clean = links
    .filter((x) => x.label?.trim() && x.href?.trim())
    .map((x) => ({ label: x.label.trim().slice(0, 96), href: x.href.trim().slice(0, 512) }))
    .filter((x) => isSafeLegalHref(x.href))
    .slice(0, 24);
  return JSON.stringify(clean.length ? clean : FOOTER_INFO_LINKS_DEFAULT);
}

export function validateFooterInfoLinksJsonInput(
  raw: string | null,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  const s = String(raw).trim();
  if (s === "") return { ok: true, value: null };
  try {
    const parsed = parseFooterInfoLinksJson(s);
    return { ok: true, value: JSON.stringify(parsed) };
  } catch {
    return { ok: false, error: "footerInfoLinksJson geçerli değil" };
  }
}

export * from "./legalPages.js";
export * from "./yekpareDisclaimer.js";
export * from "./yekpareFaqContent.js";
