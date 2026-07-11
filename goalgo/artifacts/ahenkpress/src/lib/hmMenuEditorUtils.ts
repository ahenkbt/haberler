import type { HmCorporateMenuItem } from "@/lib/newsSiteLayout";
import { normalizeHmEditorLoginMenuHref } from "@/lib/hmEditorPublicLinks";

export type MenuEditorRow = {
  item: HmCorporateMenuItem;
  depth: number;
};

export type HmMenuLocationKey =
  | "hmCorporateMenuItems"
  | "hmNewsStripMenuItems"
  | "hmNewsFooterMenuItems"
  | "hmNewsSidebarMenuItems";

export const HM_MENU_LOCATIONS: {
  key: HmMenuLocationKey;
  label: string;
  description: string;
  allowNesting: boolean;
}[] = [
  {
    key: "hmCorporateMenuItems",
    label: "Üst menü",
    description:
      "Logo bandının altındaki ana menü (Anasayfa, Sondakika, Video TV vb.). Kaydettikten sonra canlı sitede Ctrl+F5 ile yenileyin. Boş bırakılırsa varsayılan kısayollar kullanılır.",
    allowNesting: true,
  },
  {
    key: "hmNewsStripMenuItems",
    label: "Şerit menü",
    description:
      "Mobilde sayfa altında sabit duran menü (Anasayfa, Sondakika, Video, Harita, Bilgi Ağacı). Boş bırakılırsa varsayılan kısayollar kullanılır.",
    allowNesting: false,
  },
  {
    key: "hmNewsFooterMenuItems",
    label: "Footer menüsü",
    description:
      "Alt bilgideki Menü sütunu. Buraya öğe eklerseniz üst menüden bağımsız listelenir; boş bırakırsanız kurumsal temada üst menü grupları, haber temasında varsayılan footer linkleri kullanılır.",
    allowNesting: false,
  },
  {
    key: "hmNewsSidebarMenuItems",
    label: "Sidebar bağlantıları",
    description: "Anasayfa sağ sütunundaki özel bağlantılar (Popüler Haberler üstü).",
    allowNesting: false,
  },
];

export function makeMenuItemId(prefix = "menu"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function cleanHmMenuItems(
  items: HmCorporateMenuItem[],
  opts?: { allowNesting?: boolean },
): HmCorporateMenuItem[] | null {
  const allowNesting = opts?.allowNesting !== false;
  const cleaned = items
    .map((item, index): HmCorporateMenuItem | null => {
      const label = item.label.trim().slice(0, 80);
      const href = item.href.trim() || "#";
      const normalizedHref = normalizeHmEditorLoginMenuHref(href);
      if (!label) return null;
      const id = item.id.trim() || `menu-${index + 1}`;
      const parentIdRaw = allowNesting ? (item.parentId ?? "").trim() : "";
      const iconRaw = String(item.icon ?? "").trim().slice(0, 8);
      const out: HmCorporateMenuItem = {
        id,
        label,
        href: normalizedHref,
        enabled: item.enabled === false ? false : true,
      };
      if (iconRaw) out.icon = iconRaw;
      if (parentIdRaw && parentIdRaw !== id) out.parentId = parentIdRaw;
      return out;
    })
    .filter((item): item is HmCorporateMenuItem => item != null)
    .slice(0, 40);
  return cleaned.length ? cleaned : null;
}

function childMap(items: HmCorporateMenuItem[]): Map<string, HmCorporateMenuItem[]> {
  const map = new Map<string, HmCorporateMenuItem[]>();
  for (const item of items) {
    const parentId = (item.parentId ?? "").trim();
    if (!parentId) continue;
    const list = map.get(parentId) ?? [];
    list.push(item);
    map.set(parentId, list);
  }
  return map;
}

export function itemsToMenuRows(items: HmCorporateMenuItem[]): MenuEditorRow[] {
  if (!items.length) return [];
  const ids = new Set(items.map((i) => i.id));
  const byParent = childMap(items);
  const visited = new Set<string>();
  const rows: MenuEditorRow[] = [];

  const walk = (item: HmCorporateMenuItem, depth: number) => {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    rows.push({ item, depth });
    for (const child of byParent.get(item.id) ?? []) walk(child, depth + 1);
  };

  for (const item of items) {
    const parentId = (item.parentId ?? "").trim();
    if (!parentId || !ids.has(parentId)) walk(item, 0);
  }
  return rows;
}

function parentIdForRow(rows: MenuEditorRow[], index: number): string | null {
  const depth = rows[index]?.depth ?? 0;
  if (depth <= 0) return null;
  for (let i = index - 1; i >= 0; i--) {
    if (rows[i].depth === depth - 1) return rows[i].item.id;
  }
  return null;
}

export function menuRowsToItems(rows: MenuEditorRow[]): HmCorporateMenuItem[] {
  return rows.map((row, index) => {
    const parentId = parentIdForRow(rows, index);
    const next: HmCorporateMenuItem = { ...row.item };
    if (parentId) next.parentId = parentId;
    else delete next.parentId;
    return next;
  });
}

function subtreeEndIndex(rows: MenuEditorRow[], startIndex: number): number {
  const baseDepth = rows[startIndex]?.depth ?? 0;
  let end = startIndex;
  for (let i = startIndex + 1; i < rows.length; i++) {
    if (rows[i].depth <= baseDepth) break;
    end = i;
  }
  return end;
}

function isDescendantByParent(items: HmCorporateMenuItem[], ancestorId: string, candidateId: string): boolean {
  const byId = new Map(items.map((item) => [item.id, item]));
  let current = byId.get(candidateId);
  while (current) {
    const parentId = (current.parentId ?? "").trim();
    if (!parentId) return false;
    if (parentId === ancestorId) return true;
    current = byId.get(parentId);
  }
  return false;
}

export type MenuDropPosition = "before" | "after" | "inside";

export function reorderMenuRows(
  rows: MenuEditorRow[],
  dragIndex: number,
  targetIndex: number,
  position: MenuDropPosition,
): MenuEditorRow[] {
  if (dragIndex === targetIndex) return rows;

  const flatItems = menuRowsToItems(rows);
  const dragId = rows[dragIndex]?.item.id;
  const targetId = rows[targetIndex]?.item.id;
  if (!dragId || !targetId) return rows;
  if (position === "inside" && isDescendantByParent(flatItems, dragId, targetId)) return rows;

  const next = [...rows];
  const [dragged] = next.splice(dragIndex, 1);
  let hoverIndex = targetIndex;
  if (dragIndex < targetIndex) hoverIndex--;

  const target = next[hoverIndex];
  if (!target || !dragged) return rows;

  let insertIndex = hoverIndex;
  let depth = target.depth;

  if (position === "inside") {
    depth = target.depth + 1;
    insertIndex = subtreeEndIndex(next, hoverIndex) + 1;
  } else if (position === "after") {
    insertIndex = subtreeEndIndex(next, hoverIndex) + 1;
  } else {
    insertIndex = hoverIndex;
  }

  next.splice(insertIndex, 0, { ...dragged, depth });
  return next;
}

export function menuItemTypeLabel(href: string): string {
  const h = href.trim();
  if (/^(?:https?:)?\/\//i.test(h) || /^\/https?:\/\//i.test(h)) return "Özel bağlantı";
  if (h.startsWith("/kategori/")) return "Kategori";
  if (h.startsWith("/haber/")) return "Haber";
  return "Sayfa";
}

export const HM_CORPORATE_VIDEO_TV_MENU_ITEM_ID = "menu-video-tv";

export function isHmCorporateMenuVideoTvItem(item: HmCorporateMenuItem): boolean {
  const href = String(item.href ?? "").trim().toLowerCase();
  const label = String(item.label ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const id = String(item.id ?? "").trim().toLowerCase();
  if (id === HM_CORPORATE_VIDEO_TV_MENU_ITEM_ID || id.includes("video-tv") || id.includes("videotv")) return true;
  return /\/video-tv(?:\/|$|\?)/.test(href) || href.endsWith("/video-tv") || label.includes("video tv") || label.includes("yektube");
}

export function buildCorporateMenuVideoTvItem(hmBase: string): HmCorporateMenuItem {
  const prefix = hmBase.trim().replace(/\/+$/, "");
  return {
    id: HM_CORPORATE_VIDEO_TV_MENU_ITEM_ID,
    label: "Video TV",
    href: `${prefix}/video-tv`,
    enabled: true,
  };
}

/** Kurumsal üst menüde Video TV kök öğesini listenin sonuna taşır; yoksa ekler. */
export function ensureCorporateMenuVideoTvAtEnd(
  items: HmCorporateMenuItem[],
  hmBase: string,
  opts?: { videoTvEnabled?: boolean },
): HmCorporateMenuItem[] {
  if (opts?.videoTvEnabled === false) return items;
  const existing = items.filter(isHmCorporateMenuVideoTvItem);
  const rest = items.filter((item) => !isHmCorporateMenuVideoTvItem(item));
  if (existing.length === 0) {
    return [...rest, buildCorporateMenuVideoTvItem(hmBase)];
  }
  const primary = existing[0];
  return [...rest, { ...primary, parentId: null }];
}
