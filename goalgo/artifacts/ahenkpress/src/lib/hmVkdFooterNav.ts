import type { HmCorporateMenuItem, NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";

export type HmCorporateFooterLink = {
  key: string;
  label: string;
  href: string;
  external?: boolean;
  rss?: boolean;
};

export type HmCorporateFooterMenuGroup = {
  key: string;
  heading: string;
  links: HmCorporateFooterLink[];
};

export type VkdFooterNavOpts = {
  layoutPrefs: NewsSiteLayoutPrefs;
  h: (path: string) => string;
};

function isExternalHmHref(href: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(String(href ?? "").trim());
}

function resolveStoredHmHref(h: (path: string) => string, href: string): string {
  const raw = String(href ?? "").trim();
  if (!raw || raw === "#") return "#";
  if (isExternalHmHref(raw)) return raw;
  return h(raw.startsWith("/") ? raw : `/${raw}`);
}

/** VKD footer «Menü» — yalnızca Kurumsal alt bağlantıları (sıra sabit). */
export const VKD_FOOTER_KURUMSAL_SPECS: { id: string; label: string; href: string }[] = [
  { id: "vkd-menu-kur-hakkimizda", label: "Hakkımızda", href: "/hakkimizda" },
  { id: "vkd-menu-kur-baskan", label: "Genel Başkan", href: "/baskan" },
  { id: "vkd-menu-kur-dernegimiz", label: "Derneğimiz", href: "/kategori/dernegimiz" },
  { id: "vkd-menu-kur-vakif", label: "Vakfımız", href: "/vakif" },
  { id: "vkd-menu-kur-isbirligi", label: "İşbirliği", href: "/isbirligi" },
  { id: "vkd-menu-kur-hizmet", label: "Hizmet Bölgelerimiz", href: "/hizmet-bolgesi" },
  { id: "vkd-menu-kur-hukuk", label: "Hukuk ve Savunuculuk", href: "/hukuk-savunuculuk" },
  { id: "vkd-menu-kur-stk", label: "Uluslararası STK", href: "/uluslararasi-stk" },
  { id: "vkd-menu-kur-bagis", label: "Bağış", href: "/bagis" },
];

/** VKD footer «Haber kategorileri» — yalnızca bu slug'lar (sıra sabit). */
export const VKD_FOOTER_CATEGORY_LINKS: { label: string; slug: string }[] = [
  { label: "Derneğimiz", slug: "dernegimiz" },
  { label: "Faaliyetlerimiz", slug: "faaliyetlerimiz" },
  { label: "Şehit Gazi", slug: "sehit-gazi" },
];

function storedKurumsalById(items: HmCorporateMenuItem[]): Map<string, HmCorporateMenuItem> {
  const map = new Map<string, HmCorporateMenuItem>();
  for (const item of items) {
    if ((item.parentId ?? "").trim() !== "vkd-menu-kurumsal") continue;
    if (item.enabled === false) continue;
    map.set(item.id, item);
  }
  return map;
}

/** VKD kurumsal vitrin footer menüsü: tek grup «KURUMSAL», üst menüdeki diğer kökler yok. */
export function buildVkdCorporateFooterMenuGroups(opts: VkdFooterNavOpts): HmCorporateFooterMenuGroup[] {
  const { layoutPrefs, h } = opts;
  const stored = storedKurumsalById(layoutPrefs.hmCorporateMenuItems ?? []);
  const links: HmCorporateFooterLink[] = [];

  for (const spec of VKD_FOOTER_KURUMSAL_SPECS) {
    const row = stored.get(spec.id);
    const rawHref = (row?.href ?? spec.href).trim();
    const href = resolveStoredHmHref(h, rawHref);
    if (!href || href === "#") continue;
    links.push({
      key: spec.id,
      label: (row?.label ?? spec.label).trim() || spec.label,
      href,
      external: isExternalHmHref(href),
    });
  }

  return links.length ? [{ key: "vkd-menu-kurumsal", heading: "KURUMSAL", links }] : [];
}

export function filterVkdFooterCategoryLinks(
  apiRows: { label: string; slug: string }[],
): { label: string; slug: string }[] {
  const bySlug = new Map(apiRows.map((r) => [r.slug.toLowerCase(), r]));
  const out: { label: string; slug: string }[] = [];
  for (const spec of VKD_FOOTER_CATEGORY_LINKS) {
    const fromApi = bySlug.get(spec.slug);
    out.push({
      slug: spec.slug,
      label: (fromApi?.label ?? spec.label).trim() || spec.label,
    });
  }
  return out;
}

export function isVkdSiteSlug(siteSlug: string | null | undefined): boolean {
  const s = siteSlug?.trim().toLowerCase() ?? "";
  return s === "vkd" || s === "vatankahramanlari" || s.includes("vatankahramanlari");
}
