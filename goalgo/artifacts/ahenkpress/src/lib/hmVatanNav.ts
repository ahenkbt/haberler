/**
 * Vatan shell navigation model — built directly from the editor-owned
 * `hmCorporateMenuItems` (roots = items without `parentId`, children by `parentId`).
 * Deliberately does NOT use `filterPrimaryCorporateMenuRoots` (it hides roots).
 */
import type { HmCorporateMenuItem, NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { decodeHmDisplayText } from "@/lib/hmDisplayText";
import { isHmPublicNavExternal } from "@/lib/hmPublicLinks";
import { isHmCorporateMenuVideoTvItem } from "@/lib/hmMenuEditorUtils";
import {
  VKD_FOOTER_ATATURK_SPECS,
  VKD_FOOTER_KURUMSAL_SPECS,
  VKD_FOOTER_MEMORIAL_SPECS,
  type HmCorporateFooterMenuGroup,
} from "@/lib/hmVkdFooterNav";
import { resolveVatanNavGroupImage } from "@/lib/hmVatanHomeContent";

export type VatanNavLink = {
  key: string;
  label: string;
  href: string;
  external: boolean;
};

export type VatanNavGroup = {
  key: string;
  label: string;
  children: VatanNavLink[];
  image: string;
  imageCaption: string;
};

export type VatanNavModel = {
  /** Up to `VATAN_PRIMARY_GROUP_LIMIT` group roots for the primary row. */
  primaryGroups: VatanNavGroup[];
  /** Group roots beyond the limit — rendered inside a single "Daha Fazla" panel. */
  overflowGroups: VatanNavGroup[];
  /** Roots that are plain links (KÜNYE, TALEP FORMU, Video TV …). Never news. */
  utilityLinks: VatanNavLink[];
  /**
   * Editor-stored news roots (e.g. HABERLER → /tum-haberler). Surfaced only at the
   * very end of the mobile menu — never in the desktop header or mega panel.
   */
  newsLinks: VatanNavLink[];
};

export const VATAN_PRIMARY_GROUP_LIMIT = 5;
export const VATAN_OVERFLOW_GROUP_LABEL = "Daha Fazla";

function cleanLabel(raw: unknown): string {
  return decodeHmDisplayText(raw).replace(/\s+/g, " ").trim();
}

function isRealHref(href: string): boolean {
  const raw = String(href ?? "").trim();
  return raw.length > 0 && raw !== "#";
}

export function resolveVatanHref(h: (path: string) => string, href: string): string {
  const raw = String(href ?? "").trim();
  if (!isRealHref(raw)) return "#";
  if (isHmPublicNavExternal(raw)) return raw;
  return h(raw.startsWith("/") ? raw : `/${raw}`);
}

const NEWS_HREF_RE = /^\/?(tum-haberler|haberler|haber|son-dakika|gundem|manset)(\/|\?|#|$)/i;
const NEWS_LABEL_RE = /haber|son dakika|gündem|manşet|duyuru/i;

/**
 * A menu item whose target is the news listing / news detail. Editor category
 * pages (`/kategori/*`) are deliberately NOT treated as news: they are content
 * sections the editor named (e.g. "Derneğimiz").
 */
export function isVatanNewsMenuItem(item: Pick<HmCorporateMenuItem, "label" | "href">): boolean {
  const raw = String(item.href ?? "").trim();
  if (isRealHref(raw) && !isHmPublicNavExternal(raw)) {
    const path = raw.replace(/^\/tr\/[^/]+/, "");
    if (NEWS_HREF_RE.test(path)) return true;
  }
  return NEWS_LABEL_RE.test(cleanLabel(item.label));
}

function toLink(h: (path: string) => string, item: HmCorporateMenuItem): VatanNavLink | null {
  const label = cleanLabel(item.label);
  if (!label || !isRealHref(item.href)) return null;
  const href = resolveVatanHref(h, item.href);
  return { key: item.id, label, href, external: isHmPublicNavExternal(href) };
}

export function buildVatanNavModel(
  layoutPrefs: NewsSiteLayoutPrefs,
  h: (path: string) => string,
  opts: { showVideoTvLink: boolean },
): VatanNavModel {
  const items = (layoutPrefs.hmCorporateMenuItems ?? []).filter((it) => it && it.enabled !== false);
  const roots = items.filter((it) => !String(it.parentId ?? "").trim());
  const childrenByParent = new Map<string, HmCorporateMenuItem[]>();
  for (const it of items) {
    const pid = String(it.parentId ?? "").trim();
    if (!pid) continue;
    const list = childrenByParent.get(pid) ?? [];
    list.push(it);
    childrenByParent.set(pid, list);
  }

  const groups: VatanNavGroup[] = [];
  const utilityLinks: VatanNavLink[] = [];
  const newsLinks: VatanNavLink[] = [];

  for (const root of roots) {
    const label = cleanLabel(root.label);
    if (!label) continue;
    if (!opts.showVideoTvLink && isHmCorporateMenuVideoTvItem(root)) continue;
    const rawChildren = (childrenByParent.get(root.id) ?? []).filter(
      (c) => !(!opts.showVideoTvLink && isHmCorporateMenuVideoTvItem(c)),
    );

    if (isVatanNewsMenuItem(root)) {
      // Stored news root: keep it reachable (mobile menu tail) but out of the desktop chrome.
      const rootLink = toLink(h, root);
      if (rootLink) newsLinks.push(rootLink);
      for (const c of rawChildren) {
        const l = toLink(h, c);
        if (l) newsLinks.push(l);
      }
      continue;
    }

    const children = rawChildren
      .filter((c) => !isVatanNewsMenuItem(c))
      .map((c) => toLink(h, c))
      .filter((c): c is VatanNavLink => c != null);
    if (children.length > 0) {
      const img = resolveVatanNavGroupImage(root.id, label);
      groups.push({ key: root.id, label, children, image: img.image, imageCaption: img.caption });
      continue;
    }
    const link = toLink(h, root);
    if (link) utilityLinks.push(link);
  }

  return {
    primaryGroups: groups.slice(0, VATAN_PRIMARY_GROUP_LIMIT),
    overflowGroups: groups.slice(VATAN_PRIMARY_GROUP_LIMIT),
    utilityLinks,
    newsLinks,
  };
}

/** Sosyal Hizmetler footer column mirrors `data/vkd/menu.json`. */
export const VKD_FOOTER_SOSYAL_SPECS: { id: string; label: string; href: string }[] = [
  { id: "vkd-menu-sos-haklar", label: "Şehit-Gazi Hakları", href: "/sehit-gazi-haklari" },
  { id: "vkd-menu-sos-burs", label: "Burs Programı", href: "/burs" },
  { id: "vkd-menu-sos-uluslararasi", label: "Uluslararası Ş-G Hakları", href: "/uluslararasi-sehit-gazi-haklari" },
  { id: "vkd-menu-sos-yurtici", label: "Yurtiçi Kuruluşlar", href: "/turkiye-sehit-gazi-dernekleri" },
  { id: "vkd-menu-sos-yurtdisi", label: "Yurtdışı Kuruluşlar", href: "/dunya-sehit-gazi-kuruluslari" },
];

function specGroup(
  key: string,
  heading: string,
  specs: { id: string; label: string; href: string }[],
  stored: Map<string, HmCorporateMenuItem>,
  h: (path: string) => string,
): HmCorporateFooterMenuGroup | null {
  const links = [];
  for (const spec of specs) {
    const row = stored.get(spec.id);
    if (row && row.enabled === false) continue;
    const rawHref = String(row?.href ?? spec.href).trim();
    const href = resolveVatanHref(h, rawHref);
    if (href === "#") continue;
    links.push({
      key: spec.id,
      label: cleanLabel(row?.label) || spec.label,
      href,
      external: isHmPublicNavExternal(href),
    });
  }
  return links.length ? { key, heading, links } : null;
}

export function buildVatanFooterGroups(
  layoutPrefs: NewsSiteLayoutPrefs,
  h: (path: string) => string,
): HmCorporateFooterMenuGroup[] {
  const stored = new Map<string, HmCorporateMenuItem>();
  for (const item of layoutPrefs.hmCorporateMenuItems ?? []) stored.set(item.id, item);
  const groups = [
    specGroup("vkd-menu-kurumsal", "Kurumsal", VKD_FOOTER_KURUMSAL_SPECS, stored, h),
    specGroup("vkd-menu-hatira", "Hatıra", VKD_FOOTER_MEMORIAL_SPECS, stored, h),
    specGroup("vkd-menu-sosyal", "Sosyal Hizmetler", VKD_FOOTER_SOSYAL_SPECS, stored, h),
    specGroup("vkd-menu-ataturk", "Atatürk", VKD_FOOTER_ATATURK_SPECS, stored, h),
  ];
  return groups.filter((g): g is HmCorporateFooterMenuGroup => g != null);
}

/** Group label for a pathname (used for breadcrumbs / eyebrows on interior pages). */
export function resolveVatanMenuGroupForPath(
  layoutPrefs: NewsSiteLayoutPrefs,
  pathname: string,
): { rootId: string; label: string } | null {
  const path = String(pathname ?? "").split("?")[0].replace(/\/+$/, "") || "/";
  const items = (layoutPrefs.hmCorporateMenuItems ?? []).filter((it) => it && it.enabled !== false);
  const byId = new Map(items.map((it) => [it.id, it] as const));
  for (const it of items) {
    const href = String(it.href ?? "").trim().replace(/\/+$/, "");
    if (!href || href === "#" || href !== path) continue;
    const pid = String(it.parentId ?? "").trim();
    const root = pid ? byId.get(pid) : it;
    if (!root) continue;
    const label = cleanLabel(root.label);
    if (label) return { rootId: root.id, label };
  }
  return null;
}
