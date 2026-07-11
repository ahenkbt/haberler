import { YEKTUBE_HOME } from "@/lib/yektubeUrls";

export type YektubeView =
  | "anasayfa"
  | "kanallar"
  | "playlists"
  | "podcasts"
  | "videolar"
  | "shorts"
  | "rastgele"
  | "onecikanlar"
  | "ara";

/** Menü slug → iç görünüm */
export const YEKTUBE_VIEW_SLUGS: Record<YektubeView, string> = {
  anasayfa: "",
  kanallar: "kanallar",
  playlists: "oynatma-listeleri",
  podcasts: "sesli-gunluk",
  videolar: "videolar",
  shorts: "yekcek",
  rastgele: "rastgele",
  onecikanlar: "one-cikanlar",
  ara: "ara",
};

const SLUG_TO_VIEW = new Map<string, YektubeView>([
  ["kanallar", "kanallar"],
  ["oynatma-listeleri", "playlists"],
  ["playlists", "playlists"],
  ["podcastler", "podcasts"],
  ["podcasts", "podcasts"],
  ["sesli-gunluk", "podcasts"],
  ["videolar", "videolar"],
  ["shorts", "shorts"],
  ["yekcek", "shorts"],
  ["rastgele", "rastgele"],
  ["one-cikanlar", "onecikanlar"],
  ["onecikanlar", "onecikanlar"],
  ["anasayfa", "anasayfa"],
  ["ara", "ara"],
]);

const VIEWS_WITH_CATEGORY = new Set<YektubeView>(["kanallar", "playlists", "podcasts", "videolar", "shorts"]);

const RESERVED_SECTIONS = new Set(["kanal", "playlist", "canlitv"]);

function resolveHome(home?: string | null): string {
  const h = (home ?? YEKTUBE_HOME).trim();
  if (!h) return YEKTUBE_HOME;
  return h.replace(/\/+$/, "") || YEKTUBE_HOME;
}

/** Menü görünümü için tam yol — örn. /yektube/kanallar/sinema */
export function yektubeSectionPath(
  view: YektubeView,
  home?: string | null,
  category?: string | null,
): string {
  const base = resolveHome(home);
  const slug = YEKTUBE_VIEW_SLUGS[view];
  const cat = category && category !== "all" ? String(category).trim() : "";
  if (!slug || view === "anasayfa") {
    return base;
  }
  if (cat && VIEWS_WITH_CATEGORY.has(view)) {
    return `${base}/${slug}/${encodeURIComponent(cat)}`;
  }
  return `${base}/${slug}`;
}

export function yektubeViewSlug(view: YektubeView): string {
  return YEKTUBE_VIEW_SLUGS[view] || view;
}

export function parseYektubeSectionPath(
  pathname: string,
  home?: string | null,
): { view: YektubeView; category: string } {
  const base = resolveHome(home);
  let rest = pathname;
  if (rest === base || rest === `${base}/`) {
    return { view: "anasayfa", category: "all" };
  }
  if (rest.startsWith(`${base}/`)) {
    rest = rest.slice(base.length + 1);
  } else if (rest.startsWith(base)) {
    rest = rest.slice(base.length).replace(/^\//, "");
  }
  rest = rest.replace(/\/+$/, "");
  if (!rest) {
    return { view: "anasayfa", category: "all" };
  }

  const parts = rest.split("/").filter(Boolean);
  const section = (parts[0] ?? "").toLowerCase();
  if (RESERVED_SECTIONS.has(section)) {
    return { view: "anasayfa", category: "all" };
  }

  const view = SLUG_TO_VIEW.get(section) ?? "anasayfa";
  if (view === "anasayfa") {
    return { view: "anasayfa", category: "all" };
  }

  const categoryRaw = parts[1];
  const category =
    categoryRaw && VIEWS_WITH_CATEGORY.has(view) ? decodeURIComponent(categoryRaw) : "all";
  return { view, category };
}

export function isYektubeViewActive(pathname: string, home: string | null | undefined, view: YektubeView): boolean {
  const parsed = parseYektubeSectionPath(pathname, home);
  return parsed.view === view;
}
