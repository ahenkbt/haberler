import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import { sortHmCategoriesForNav } from "@/lib/hmCategoryNav";
import { HM_STANDARD_NEWS_CATEGORIES } from "@/lib/hmStandardNewsCategories";
import { resolveHmCategoryEmoji } from "@/lib/hmCategoryEmoji";
import { decodeHmDisplayText } from "@/lib/hmDisplayText";
import { isHmPublicNavExternal, normalizeHmPublicExternalHref } from "@/lib/hmPublicLinks";
import { HM_TELIF_MENU_LABEL } from "@/lib/hmTelifDefaults";

export type HmNewsCategoryMenuItem = {
  key: string;
  label: string;
  slug: string;
  href: string;
  emoji: string;
  external?: boolean;
  active?: boolean;
  kind: "category" | "page";
};

function normPath(p: string): string {
  return (p || "/").replace(/\/$/, "") || "/";
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

function resolveMenuHref(h: (path: string) => string, href: string): { href: string; external: boolean } {
  const raw = String(href ?? "").trim();
  if (!raw || raw === "#") return { href: "#", external: false };
  const normalizedExternal = normalizeHmPublicExternalHref(raw);
  if (normalizedExternal) return { href: normalizedExternal, external: true };
  if (isHmPublicNavExternal(raw)) return { href: raw, external: true };
  return { href: h(raw.startsWith("/") ? raw : `/${raw}`), external: false };
}

export function buildHmNewsCategoryMenuItems(opts: {
  h: (path: string) => string;
  apiCategories: Array<{ slug?: string; name?: string; sortOrder?: number | null }>;
  rssRows: Array<{ slug: string; label: string }>;
  hiddenSlugs: Set<string>;
  sortSlugs?: string[] | null;
  locPath?: string;
  includeContactLinks?: boolean;
  /** Haber sitesi: telif sayfası yalnızca Editör → Sayfalar'da açıksa menüde. */
  includeTelifLink?: boolean;
  /** Haber sitesi: Gündem, Dünya, Ekonomi, Politika, Spor, Teknoloji — yalnızca aktif genel kategoriler. */
  includeStandardNewsCategories?: boolean;
  activeGlobalSlugs?: ReadonlySet<string>;
}): HmNewsCategoryMenuItem[] {
  const {
    h,
    apiCategories,
    rssRows,
    hiddenSlugs,
    sortSlugs,
    locPath = "/",
    includeContactLinks = true,
    includeTelifLink = false,
    includeStandardNewsCategories = false,
    activeGlobalSlugs,
  } = opts;

  const bySlug = new Map<string, HmNewsCategoryMenuItem>();

  const ensureCategory = (
    slugRaw: unknown,
    labelRaw: unknown,
    sortOrder?: number | null,
    sourceKey?: string,
  ) => {
    const slug = normalizeNewsCategorySlug(slugRaw) || normalizeNewsCategorySlug(labelRaw);
    if (!slug || hiddenSlugs.has(slug)) return;
    const label = decodeHmDisplayText(String(labelRaw ?? "").trim() || slug);
    const href = h(`/kategori/${encodeURIComponent(slug)}`);
    const prev = bySlug.get(slug);
    if (prev) {
      if (label && prev.label === prev.slug) prev.label = label;
      return;
    }
    bySlug.set(slug, {
      key: sourceKey ?? `cat-${slug}`,
      label,
      slug,
      href,
      emoji: resolveHmCategoryEmoji(slug, label),
      active: normPath(locPath) === normPath(pathOnlyHref(href)),
      kind: "category",
    });
    void sortOrder;
  };

  if (includeStandardNewsCategories) {
    for (const std of HM_STANDARD_NEWS_CATEGORIES) {
      if (activeGlobalSlugs && !activeGlobalSlugs.has(normalizeNewsCategorySlug(std.slug))) continue;
      ensureCategory(std.slug, std.label, 0, `std-${std.slug}`);
    }
  }
  for (const cat of apiCategories) {
    ensureCategory(
      cat.slug,
      cat.name ?? cat.slug,
      typeof cat.sortOrder === "number" ? cat.sortOrder : null,
    );
  }
  for (const row of rssRows) {
    ensureCategory(row.slug, row.label || row.slug, null, `rss-${row.slug}`);
  }

  const sorted = sortHmCategoriesForNav(
    Array.from(bySlug.values()).map((item) => ({
      ...item,
      sortOrder: apiCategories.find((c) => normalizeNewsCategorySlug(c.slug) === item.slug)?.sortOrder ?? null,
    })),
    sortSlugs,
  );

  const out = sorted.map(({ sortOrder: _sortOrder, ...item }) => item);

  if (includeContactLinks) {
    const pages: Array<{ key: string; slug: string; label: string; path: string; emoji: string }> = [
      { key: "iletisim", slug: "iletisim", label: "İletişim", path: "/iletisim", emoji: resolveHmCategoryEmoji("iletisim", "İletişim") },
      { key: "kunye", slug: "kunye", label: "Künye", path: "/kunye", emoji: resolveHmCategoryEmoji("kunye", "Künye") },
    ];
    if (includeTelifLink) {
      pages.push({
        key: "telif-kullanim",
        slug: "telif-kullanim",
        label: HM_TELIF_MENU_LABEL,
        path: "/telif-kullanim",
        emoji: resolveHmCategoryEmoji("telif", HM_TELIF_MENU_LABEL),
      });
    }
    for (const page of pages) {
      const resolved = resolveMenuHref(h, page.path);
      out.push({
        key: page.key,
        label: page.label,
        slug: page.slug,
        href: resolved.href,
        emoji: page.emoji,
        external: resolved.external,
        active: normPath(locPath) === normPath(pathOnlyHref(resolved.href)),
        kind: "page",
      });
    }
  }

  return out;
}
