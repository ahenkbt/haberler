import type { LucideIcon } from "lucide-react";
import type { HmCorporateMenuItem, NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { resolveHmCorporateAuthorsEnabled } from "@/lib/newsSiteLayout";
import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import { resolveHmCategoryLucideIcon } from "@/lib/hmCategoryIcon";
import { hmRequestFormPath, resolveHmCorporateRequestFormEnabled, resolveHmNewsRequestFormEnabled } from "@/lib/hmRequestForm";
import { buildVkdCorporateFooterMenuGroups } from "@/lib/hmVkdFooterNav";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { isHmPublicNavExternal } from "@/lib/hmPublicLinks";
import { BILGI_AGACI_DISPLAY_NAME } from "@/lib/bilgiAgaciBrand";
import { isYekparePortalHubOnly } from "@/lib/hmPortalHosts";
import { isHmCorporateMenuVideoTvItem } from "@/lib/hmMenuEditorUtils";
import { normalizeHmEditorLoginMenuHref } from "@/lib/hmEditorPublicLinks";
import {
  filterHmCorporateMenuItemsForTelifPolicy,
  filterHmExtraPagesExcludingTelif,
  isHmTelifMenuHref,
  shouldHideHmTelifNavLink,
  shouldShowHmTelifInPublicNav,
} from "@/lib/hmTelifNav";
import { HM_TELIF_MENU_LABEL } from "@/lib/hmTelifDefaults";
import { decodeHmDisplayText } from "@/lib/hmDisplayText";

export type HmCorporateNavMenuItem = {
  key: string;
  label: string;
  href: string;
  icon?: LucideIcon | null;
  active?: boolean;
  external?: boolean;
  children?: HmCorporateNavMenuItem[];
};

export type HmCorporateFooterLink = {
  key: string;
  label: string;
  href: string;
  external?: boolean;
  rss?: boolean;
};

export function isExternalHmHref(href: string): boolean {
  return isHmPublicNavExternal(href);
}

function isHmHubOnlyNavHref(href: string): boolean {
  const path = pathOnlyHref(href).toLowerCase();
  return (
    path === "/bilgiagaci" ||
    path.startsWith("/bilgiagaci/") ||
    path === "/ansiklopedi" ||
    path.startsWith("/ansiklopedi/") ||
    path === "/haritalar" ||
    path.startsWith("/haritalar/") ||
    path === "/newsmap" ||
    path.startsWith("/newsmap/") ||
    path === "/yektube" ||
    path.startsWith("/yektube/")
  );
}

function filterHubOnlyNavMenuItems(items: HmCorporateNavMenuItem[]): HmCorporateNavMenuItem[] {
  return items
    .filter((item) => !isHmHubOnlyNavHref(item.href))
    .map((item) => {
      const children = item.children?.filter((child) => !isHmHubOnlyNavHref(child.href)) ?? [];
      return children.length > 0 ? { ...item, children } : { ...item, children: children.length ? children : undefined };
    })
    .filter((item) => {
      const children = item.children ?? [];
      if (children.length > 0) return true;
      return !isHmHubOnlyNavHref(item.href) && item.href !== "#";
    });
}

/** Editörde kayıtlı üst menü (haber + kurumsal vitrin). */
export function hasConfiguredHmHeaderMenu(layoutPrefs: NewsSiteLayoutPrefs | null | undefined): boolean {
  return (layoutPrefs?.hmCorporateMenuItems ?? []).some(
    (item) => item.enabled !== false && String(item.label ?? "").trim().length > 0,
  );
}

export function resolveStoredHmHref(h: (path: string) => string, href: string): string {
  const raw = normalizeHmEditorLoginMenuHref(String(href ?? "").trim());
  if (!raw || raw === "#") return "#";
  if (isExternalHmHref(raw)) return raw;
  return h(raw.startsWith("/") ? raw : `/${raw}`);
}

export type BuildCorporateNavOpts = {
  layoutPrefs: NewsSiteLayoutPrefs;
  h: (path: string) => string;
  siteSlug: string;
  locPath: string;
  showVideoTvLink?: boolean;
  newsAuthorsEnabled?: boolean;
  newsRssEnabled?: boolean;
  requestFormEnabled?: boolean;
};

function normPath(p: string): string {
  return (p || "/").replace(/\/$/, "") || "/";
}

function normalizeCorporateMenuLabel(label: string): string {
  return decodeHmDisplayText(label)
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function navMenuLabel(raw: unknown): string {
  return decodeHmDisplayText(raw);
}

/** Editör menü öğesi — kategori slug/etiketinden Lucide ikon türet. */
function resolveNavMenuItemIcon(href: string, label: string, key?: string): LucideIcon | null {
  const path = pathOnlyHref(href);
  if (path === "/" || key === "home") return resolveHmCategoryLucideIcon("anasayfa", label);
  if (path.includes("/tum-haberler") || key === "all-news") return resolveHmCategoryLucideIcon("tum-haberler", label);
  if (path.includes("/yazarlar") || key === "yazarlar") return resolveHmCategoryLucideIcon("yazarlar", label);
  if (path.includes("/yektube") || path.includes("/video-tv") || key === "video-tv") {
    return resolveHmCategoryLucideIcon("yektube", label);
  }
  const catMatch = path.match(/\/kategori\/([^/?#]+)/i);
  if (catMatch?.[1]) {
    return resolveHmCategoryLucideIcon(decodeURIComponent(catMatch[1]), label);
  }
  const slug = normalizeNewsCategorySlug(label);
  if (slug) return resolveHmCategoryLucideIcon(slug, label);
  return resolveHmCategoryLucideIcon(key ?? label, label);
}

/** `hmCorporateMenuPrimaryOnly` açıkken üst menüde gösterilecek kökler. */
export function isKurumsalOrSosyalHizmetRoot(key: string, label: string): boolean {
  const id = String(key ?? "").trim().toLowerCase();
  const norm = normalizeCorporateMenuLabel(label);
  if (id === "vkd-menu-kurumsal" || id.endsWith("-kurumsal") || id.includes("menu-kurumsal")) return true;
  if (id === "vkd-menu-sosyal" || id.includes("menu-sosyal")) return true;
  if (norm === "kurumsal" || norm.startsWith("kurumsal ")) return true;
  if (norm.includes("sosyal") && norm.includes("hizmet")) return true;
  return false;
}

export function filterPrimaryCorporateMenuRoots(items: HmCorporateNavMenuItem[]): HmCorporateNavMenuItem[] {
  const filtered = items.filter((item) => isKurumsalOrSosyalHizmetRoot(item.key, item.label));
  return filtered.length > 0 ? filtered : items;
}

function pathOnlyHref(href: string): string {
  const raw = String(href ?? "").trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      return new URL(raw).pathname.replace(/\/$/, "") || "/";
    } catch {
      return raw.split("?")[0]?.replace(/\/$/, "") || "/";
    }
  }
  return raw.split("?")[0]?.replace(/\/$/, "") || "/";
}

/** Üst navigasyon — header şeridi ile aynı ağaç. */
export function buildCorporateHeaderNavItems(opts: BuildCorporateNavOpts): HmCorporateNavMenuItem[] {
  const {
    layoutPrefs,
    h,
    siteSlug,
    locPath,
    showVideoTvLink = true,
    newsAuthorsEnabled = resolveHmCorporateAuthorsEnabled(layoutPrefs),
    newsRssEnabled = layoutPrefs.hmNewsRssLinksEnabled !== false,
    requestFormEnabled = layoutPrefs.hmVitrinTheme === "corporate"
      ? resolveHmCorporateRequestFormEnabled(layoutPrefs)
      : resolveHmNewsRequestFormEnabled(layoutPrefs),
  } = opts;

  const portalHubOnly = resolvePortalHubOnly(siteSlug);
  const hmHomeHref = h("/");
  const yazarlarHref = h("/yazarlar");
  const hmVideoTvHref = h(`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(siteSlug)}/video-tv`);
  const siteneEkleHref = h("/sitene-ekle");
  const talepFormuHref = h(hmRequestFormPath());
  const rssHref = h("/rss-baglantilari");
  const ansiklopediHref = h("/bilgiagaci");
  const haritalarHref = h("/haritalar");
  const allNewsHref = h("/tum-haberler");

  const enabledExtraPages = filterHmExtraPagesExcludingTelif(layoutPrefs.hmExtraPages ?? []).map((p) => ({
    title: navMenuLabel(p.title.trim()),
    slug: p.slug.trim(),
  }));
  const hideTelifNav = shouldHideHmTelifNavLink(layoutPrefs);

  const onVitrin =
    locPath === normPath(`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(siteSlug)}`) ||
    locPath === normPath(`/${HM_SITE_PUBLIC_PREFIX}/${siteSlug}`);

  const telifNavItem: HmCorporateNavMenuItem | null = shouldShowHmTelifInPublicNav(layoutPrefs)
    ? {
        key: "telif-kullanim",
        label: HM_TELIF_MENU_LABEL,
        href: h("/telif-kullanim"),
        active: locPath === normPath(pathOnlyHref(h("/telif-kullanim"))),
      }
    : null;

  const corporateDropdownItems: HmCorporateNavMenuItem[] = [
    { key: "kunye", label: "Künye", href: h("/kunye"), active: locPath === normPath(pathOnlyHref(h("/kunye"))) },
    { key: "iletisim", label: "İletişim", href: h("/iletisim"), active: locPath === normPath(pathOnlyHref(h("/iletisim"))) },
    { key: "reklam", label: "Reklam", href: h("/reklam"), active: locPath === normPath(pathOnlyHref(h("/reklam"))) },
    { key: "abonelik", label: "Abonelik", href: h("/abonelik"), active: locPath === normPath(pathOnlyHref(h("/abonelik"))) },
    ...(telifNavItem ? [telifNavItem] : []),
    ...enabledExtraPages.map((p) => {
      const href = h(`/${encodeURIComponent(p.slug)}`);
      return {
        key: `page-${p.slug}`,
        label: p.title,
        href,
        active: locPath === normPath(pathOnlyHref(href)),
      };
    }),
  ];

  const mediaDropdownItems: HmCorporateNavMenuItem[] = [
    ...(newsAuthorsEnabled
      ? [{ key: "yazarlar", label: "Yazarlar", href: yazarlarHref, active: locPath === normPath(pathOnlyHref(yazarlarHref)) }]
      : []),
    ...(portalHubOnly && showVideoTvLink
      ? [{ key: "video-tv", label: "Video TV", href: hmVideoTvHref, active: locPath === normPath(pathOnlyHref(hmVideoTvHref)) }]
      : []),
    ...(portalHubOnly
      ? [
          { key: "ansiklopedi", label: BILGI_AGACI_DISPLAY_NAME, href: ansiklopediHref, active: locPath === normPath(pathOnlyHref(ansiklopediHref)) },
          { key: "haritalar", label: "Haritalar", href: haritalarHref, active: locPath === normPath(pathOnlyHref(haritalarHref)) },
        ]
      : []),
    ...(newsRssEnabled
      ? [{ key: "rss", label: "RSS", href: rssHref, active: locPath === normPath(pathOnlyHref(rssHref)) }]
      : []),
    ...(requestFormEnabled
      ? [{
          key: "talep-formu",
          label: "Talep Formu",
          href: talepFormuHref,
          active: locPath === normPath(pathOnlyHref(talepFormuHref)),
        }]
      : []),
    { key: "sitene-ekle", label: "Sitene Ekle", href: siteneEkleHref, active: locPath === normPath(pathOnlyHref(siteneEkleHref)) },
  ];

  const source = filterHmCorporateMenuItemsForTelifPolicy(
    (layoutPrefs.hmCorporateMenuItems ?? []).filter(
      (item) =>
        item.enabled !== false &&
        item.label.trim() &&
        (showVideoTvLink || !isHmCorporateMenuVideoTvItem(item)),
    ),
    layoutPrefs,
  );
  if (source.length > 0) {
    const byParent = new Map<string, HmCorporateMenuItem[]>();
    for (const item of source) {
      const parentId = (item.parentId ?? "").trim();
      if (!parentId) continue;
      if (hideTelifNav && isHmTelifMenuHref(item.href)) continue;
      const list = byParent.get(parentId) ?? [];
      list.push(item);
      byParent.set(parentId, list);
    }
    const roots = source.filter((item) => !(item.parentId ?? "").trim() && !(hideTelifNav && isHmTelifMenuHref(item.href)));
    const orderedRoots = [
      ...roots.filter((item) => !isHmCorporateMenuVideoTvItem(item)),
      ...roots.filter((item) => isHmCorporateMenuVideoTvItem(item)),
    ];
    const tree = orderedRoots.map((item) => {
      const href = resolveStoredHmHref(h, item.href);
      const children = (byParent.get(item.id) ?? [])
        .filter(
          (child) =>
            !(hideTelifNav && isHmTelifMenuHref(child.href)) &&
            (showVideoTvLink || !isHmCorporateMenuVideoTvItem(child)),
        )
        .map((child) => {
          const childHref = resolveStoredHmHref(h, child.href);
          return {
            key: child.id,
            label: navMenuLabel(child.label),
            icon: resolveNavMenuItemIcon(childHref, navMenuLabel(child.label), child.id),
            href: childHref,
            external: isExternalHmHref(childHref),
            active: !isExternalHmHref(childHref) && locPath === normPath(pathOnlyHref(childHref)),
          } satisfies HmCorporateNavMenuItem;
        });
      return {
        key: item.id,
        label: navMenuLabel(item.label),
        icon: resolveNavMenuItemIcon(href, navMenuLabel(item.label), item.id),
        href,
        external: isExternalHmHref(href),
        active: !isExternalHmHref(href) && locPath === normPath(pathOnlyHref(href)),
        children,
      } satisfies HmCorporateNavMenuItem;
    });
    return portalHubOnly ? tree : filterHubOnlyNavMenuItems(tree);
  }

  return [
    { key: "home", label: "Anasayfa", href: hmHomeHref, active: onVitrin },
    { key: "all-news", label: "Tüm Haberler", href: allNewsHref, active: locPath === normPath(pathOnlyHref(allNewsHref)) },
    { key: "corporate", label: "Kurumsal", href: "#", children: corporateDropdownItems },
    { key: "media", label: "Medya", href: "#", children: mediaDropdownItems },
  ];
}

function resolvePortalHubOnly(siteSlug: string): boolean {
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  return isYekparePortalHubOnly(host, siteSlug);
}

/** Editör haber siteleri — tüm public HM sayfalarında ortak üst şerit. */
export function buildEditorStandardNewsNavItems(opts: BuildCorporateNavOpts): HmCorporateNavMenuItem[] {
  const {
    h,
    siteSlug,
    locPath,
    showVideoTvLink = true,
    newsAuthorsEnabled = resolveHmCorporateAuthorsEnabled(opts.layoutPrefs),
  } = opts;

  const portalHubOnly = resolvePortalHubOnly(siteSlug);

  const hmHomeHref = h("/");
  const sonDakikaHref = h("/sondakika");
  const kisaKisaHref = h("/kisa-kisa");
  const hmVideoTvHref = h(`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(siteSlug)}/video-tv`);
  const bilgiAgaciHref = h("/bilgiagaci");
  const videoTvPath = normPath(pathOnlyHref(hmVideoTvHref));

  const onVitrin =
    locPath === normPath(`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(siteSlug)}`) ||
    locPath === normPath(`/${HM_SITE_PUBLIC_PREFIX}/${siteSlug}`);

  const items: HmCorporateNavMenuItem[] = [
    {
      key: "home",
      label: "Anasayfa",
      href: hmHomeHref,
      icon: resolveNavMenuItemIcon(hmHomeHref, "Anasayfa", "home"),
      active: onVitrin,
    },
    {
      key: "sondakika",
      label: "Sondakika",
      href: sonDakikaHref,
      icon: resolveNavMenuItemIcon(sonDakikaHref, "Sondakika", "sondakika"),
      active: locPath === normPath(pathOnlyHref(sonDakikaHref)),
    },
    {
      key: "kisa-kisa",
      label: "Dünyadan Kısa Kısa",
      href: kisaKisaHref,
      icon: resolveNavMenuItemIcon(kisaKisaHref, "Dünyadan Kısa Kısa", "kisa-kisa"),
      active: locPath === normPath(pathOnlyHref(kisaKisaHref)),
    },
  ];

  if (portalHubOnly && showVideoTvLink) {
    items.push({
      key: "video-tv",
      label: "Video",
      href: hmVideoTvHref,
      active: locPath === videoTvPath || locPath.startsWith(`${videoTvPath}/`),
    });
  }

  if (portalHubOnly) {
    const newsmapHref = h("/newsmap");
    const newsmapPath = normPath(pathOnlyHref(newsmapHref));
    items.push({
      key: "newsmap",
      label: "Haber Haritası",
      href: newsmapHref,
      active: locPath === newsmapPath || locPath.startsWith(`${newsmapPath}/`),
    });

    items.push({
      key: "bilgi-agaci",
      label: BILGI_AGACI_DISPLAY_NAME,
      href: bilgiAgaciHref,
      active: locPath === normPath(pathOnlyHref(bilgiAgaciHref)) || locPath.startsWith(`${normPath(pathOnlyHref(bilgiAgaciHref))}/`),
    });
  }

  return portalHubOnly ? items : filterHubOnlyNavMenuItems(items);
}

/** Mobil alt şerit menü — özel öğe listesi veya varsayılan haber kısayolları. */
export function buildHmStripMenuNavItems(opts: BuildCorporateNavOpts): HmCorporateNavMenuItem[] {
  const { layoutPrefs, h, locPath, siteSlug } = opts;
  const portalHubOnly = resolvePortalHubOnly(siteSlug);
  const custom = (layoutPrefs.hmNewsStripMenuItems ?? []).filter(
    (item) =>
      item.enabled !== false &&
      String(item.label ?? "").trim().length > 0 &&
      (opts.showVideoTvLink !== false || !isHmCorporateMenuVideoTvItem(item)) &&
      (portalHubOnly || !isHmHubOnlyNavHref(resolveStoredHmHref(h, item.href))),
  );
  if (custom.length > 0) {
    const mapped = custom.map((item) => {
      const href = resolveStoredHmHref(h, item.href);
      return {
        key: item.id,
        label: navMenuLabel(item.label),
        icon: resolveNavMenuItemIcon(href, navMenuLabel(item.label), item.id),
        href,
        external: isExternalHmHref(href),
        active: !isExternalHmHref(href) && locPath === normPath(pathOnlyHref(href)),
      } satisfies HmCorporateNavMenuItem;
    });
    return portalHubOnly ? mapped : filterHubOnlyNavMenuItems(mapped);
  }
  return buildEditorStandardNewsNavItems(opts).filter((item) => item.key !== "kisa-kisa");
}

export type HmCorporateFooterMenuGroup = {
  key: string;
  heading: string;
  links: HmCorporateFooterLink[];
};

function navItemToFooterLink(item: HmCorporateNavMenuItem, opts?: { rssKey?: string }): HmCorporateFooterLink | null {
  const href = String(item.href ?? "").trim();
  if (!href || href === "#") return null;
  return {
    key: item.key,
    label: item.label,
    href,
    external: item.external ?? isExternalHmHref(href),
    rss: opts?.rssKey === item.key || item.key === "rss",
  };
}

/** Footer — üst menü kökleri başlık, alt öğeler bağlantı (önek yok). */
export function buildCorporateFooterMenuGroups(
  opts: BuildCorporateNavOpts,
): HmCorporateFooterMenuGroup[] {
  if (opts.siteSlug.trim().toLowerCase() === "vkd") {
    return buildVkdCorporateFooterMenuGroups(opts);
  }

  const headerItems = buildCorporateHeaderNavItems(opts);
  const groups: HmCorporateFooterMenuGroup[] = [];

  for (const item of headerItems) {
    const children = item.children ?? [];
    if (children.length > 0) {
      const links = children
        .map((child) => navItemToFooterLink(child, { rssKey: "rss" }))
        .filter((link): link is HmCorporateFooterLink => link != null);
      if (links.length) groups.push({ key: item.key, heading: item.label, links: links.slice(0, 16) });
    } else {
      const link = navItemToFooterLink(item, { rssKey: "rss" });
      if (link) groups.push({ key: item.key, heading: item.label, links: [link] });
    }
  }

  return groups.slice(0, 8);
}

/** Düz footer listesi (başlık öneki olmadan). */
export function flattenCorporateNavForFooter(
  items: HmCorporateNavMenuItem[],
  opts?: { rssKey?: string },
): HmCorporateFooterLink[] {
  const out: HmCorporateFooterLink[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const children = item.children ?? [];
    const list = children.length > 0 ? children : [item];
    for (const child of list) {
      const link = navItemToFooterLink(child, opts);
      if (!link) continue;
      const dedupe = `${link.key}:${link.href}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      out.push(link);
    }
  }
  return out.slice(0, 32);
}

export function buildCorporateFooterPageLinks(opts: BuildCorporateNavOpts): HmCorporateFooterLink[] {
  return buildCorporateFooterMenuGroups(opts).flatMap((g) => g.links);
}
