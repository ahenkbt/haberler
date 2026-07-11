import type { ListingFilterState } from "@/themes/bookingcore/components/BookingCoreFilterSidebar";
import {
  getTurizmCategoryIntro,
  MAIN_INTRO_MAX,
  splitIntroConfig,
  turizmBlogHref,
  type TurizmCategorySlug,
  type TurizmIntroCard,
  type TurizmIntroSection,
} from "./turizmCategoryIntroConfig";
import type { MergedTurizmCms, TurizmCmsIntroCardRow, TurizmCmsPayload } from "./turizmCmsTypes";

function rowToCard(row: TurizmCmsIntroCardRow): TurizmIntroCard {
  const filter = row.filter_json && Object.keys(row.filter_json).length > 0 ? row.filter_json : undefined;
  const href = row.link_url || (row.blog_slug ? turizmBlogHref(row.title, row.blog_slug) : turizmBlogHref(row.title));
  return {
    title: row.title,
    description: row.description || "",
    image: row.image_url || "/turizm/category-intro/travel.jpg",
    href: filter ? undefined : href,
    filter,
  };
}

function sortIntroRows(rows: TurizmCmsIntroCardRow[]): TurizmCmsIntroCardRow[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

function uniqueSectionTitles(rows: TurizmCmsIntroCardRow[]): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const row of rows) {
    const title = row.section_title || "Öne çıkan seçenekler";
    if (!seen.has(title)) {
      seen.add(title);
      titles.push(title);
    }
  }
  return titles;
}

function buildMainSectionFromRows(rows: TurizmCmsIntroCardRow[]): TurizmIntroSection[] {
  const mainRows = sortIntroRows(rows).slice(0, MAIN_INTRO_MAX);
  if (mainRows.length === 0) return [];

  const sectionTitles = uniqueSectionTitles(rows);
  const first = mainRows[0];
  return [
    {
      title: sectionTitles.length > 1 ? "Tanıtım" : first.section_title || "Tanıtım",
      description: first.section_description || "",
      cards: mainRows.map(rowToCard),
    },
  ];
}

function buildSidebarFromRows(mainRows: TurizmCmsIntroCardRow[], sidebarRows: TurizmCmsIntroCardRow[]): TurizmIntroCard[] {
  const overflow = sortIntroRows(mainRows).slice(MAIN_INTRO_MAX).map(rowToCard);
  const sidebar = sortIntroRows(sidebarRows).map(rowToCard);
  return [...overflow, ...sidebar];
}

export function mergeTurizmCms(slug: TurizmCategorySlug, api: TurizmCmsPayload | null): MergedTurizmCms {
  const staticConfig = getTurizmCategoryIntro(slug);
  const { mainSections: staticMain, sidebarCards: staticSidebar } = splitIntroConfig(staticConfig);

  const staticMainWithBlogLinks = staticMain.map((section) => ({
    ...section,
    cards: section.cards.map((card) => ({
      ...card,
      href: card.href || (card.filter ? undefined : turizmBlogHref(card.title)),
    })),
  }));

  const staticSidebarWithBlogLinks = staticSidebar.map((card) => ({
    ...card,
    href: card.href || (card.filter ? undefined : turizmBlogHref(card.title)),
  }));

  if (!api || api.introCards.length === 0) {
    return {
      slug,
      pageDescription: staticConfig.pageDescription,
      mainSections: staticMainWithBlogLinks,
      sidebarCards: staticSidebarWithBlogLinks,
      banners: api?.banners ?? [],
      featuredPosts: api?.featuredPosts ?? [],
    };
  }

  const mainRows = api.introCards.filter((c) => c.placement !== "sidebar");
  const sidebarRows = api.introCards.filter((c) => c.placement === "sidebar");
  const cmsSidebar = buildSidebarFromRows(mainRows, sidebarRows).map((card) => ({
    ...card,
    href: card.href || (card.filter ? undefined : turizmBlogHref(card.title)),
  }));

  return {
    slug,
    pageDescription: staticConfig.pageDescription,
    mainSections: mainRows.length > 0 ? buildMainSectionFromRows(mainRows) : staticMainWithBlogLinks,
    sidebarCards: cmsSidebar.length > 0 ? cmsSidebar : staticSidebarWithBlogLinks,
    banners: api.banners,
    featuredPosts: api.featuredPosts,
  };
}

export function cardFilterPatch(card: TurizmIntroCard): Partial<ListingFilterState> | undefined {
  return card.filter;
}
