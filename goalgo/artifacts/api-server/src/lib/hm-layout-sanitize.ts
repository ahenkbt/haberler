/** Tüm HM sitelerde VKD/kurumsal şablon sızıntısını temizler (Neon layout_json). */
export const HM_LAYOUT_SANITIZE_REV = "hm-layout-sanitize-20260727a";

const CORPORATE_ONLY_MODULES = new Set([
  "culturePortal",
  "ataturkCorner",
  "sehitSearch",
  "heritageInfo",
  "donationSupport",
]);

const VKD_MENU_PREFIX = "vkd-menu-";

const VKD_ONLY_PATH_PREFIXES = [
  "/faaliyetler",
  "/baskan",
  "/dernegimiz",
  "/sehit-gazi",
  "/bagis",
  "/yonetim-kurulu",
  "/tuzuk",
];

function normalizeSlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function isCorporateTheme(theme: unknown): boolean {
  const t = String(theme ?? "")
    .trim()
    .toLowerCase();
  return t === "corporate" || t === "kurumsal";
}

function pathOnlyHref(href: unknown): string {
  const raw = String(href ?? "").trim();
  if (!raw || raw === "#") return raw;
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).pathname.toLowerCase();
  } catch {
    /* relative */
  }
  return raw.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
}

export function isForeignCorporateMenuItem(item: Record<string, unknown>, siteSlug: string): boolean {
  const slug = normalizeSlug(siteSlug);
  if (slug === "vkd") return false;
  const id = String(item.id ?? "")
    .trim()
    .toLowerCase();
  const href = pathOnlyHref(item.href);
  if (id.startsWith(VKD_MENU_PREFIX)) return true;
  for (const p of VKD_ONLY_PATH_PREFIXES) {
    if (href === p || href.startsWith(`${p}/`)) return true;
  }
  if (href.includes("/ansiklopedi/t") || href.includes("/ansiklopedi/t%C3%BCrk")) return true;
  return false;
}

/** Kurumsal olmayan vitrinlerde VKD menü/modül/bant kalıntılarını kaldırır. */
export function sanitizeHmPublicLayoutRecord(
  layout: Record<string, unknown>,
  siteSlug: string,
): Record<string, unknown> {
  const slug = normalizeSlug(siteSlug);
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return {};
  if (isCorporateTheme(layout.hmVitrinTheme) && slug === "vkd") return layout;

  const next: Record<string, unknown> = { ...layout };

  if (Array.isArray(next.hmCorporateMenuItems)) {
    next.hmCorporateMenuItems = next.hmCorporateMenuItems.filter((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return false;
      return !isForeignCorporateMenuItem(row as Record<string, unknown>, slug);
    });
  }

  for (const key of [
    "hmNewsFooterMenuItems",
    "hmNewsSidebarMenuItems",
    "hmNewsStripMenuItems",
  ] as const) {
    if (Array.isArray(next[key])) {
      next[key] = (next[key] as unknown[]).filter((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return false;
        return !isForeignCorporateMenuItem(row as Record<string, unknown>, slug);
      });
    }
  }

  if (Array.isArray(next.hmNewsHomeModuleOrder)) {
    next.hmNewsHomeModuleOrder = next.hmNewsHomeModuleOrder.filter(
      (id) => !CORPORATE_ONLY_MODULES.has(String(id)),
    );
  }

  if (!isCorporateTheme(layout.hmVitrinTheme)) {
    next.hmCorporateAtaturkCornerEnabled = false;
    next.hmCorporateCulturePortalBandEnabled = false;
    next.hmCorporateWarsSectionEnabled = false;
    next.hmCorporateNationalDaysSectionEnabled = false;
    next.hmSehitSearchEnabled = false;
    next.sadeNewsAtaturkBandEnabled = false;
    next.sadeNewsHistoryNationalDaysBandEnabled = false;
  }

  next.hmLayoutSanitizeRev = HM_LAYOUT_SANITIZE_REV;
  return next;
}

export function layoutNeedsHmSanitize(layout: Record<string, unknown> | null | undefined): boolean {
  if (!layout || typeof layout !== "object") return true;
  return String(layout.hmLayoutSanitizeRev ?? "") !== HM_LAYOUT_SANITIZE_REV;
}

/** Boot — tüm aktif HM sitelerinde layout_json sızıntı temizliği. */
export async function repairAllHmLayoutSanitize(opts?: { dryRun?: boolean }): Promise<{
  scanned: number;
  updated: number;
}> {
  const { getNewsDbForRead, hmNewsSitesTable, dualWriteUpdate } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const dryRun = opts?.dryRun === true;
  const rows = await getNewsDbForRead()
    .select({ id: hmNewsSitesTable.id, slug: hmNewsSitesTable.slug, layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.active, true));
  let updated = 0;
  for (const row of rows) {
    let layout: Record<string, unknown> = {};
    try {
      const raw = row.layoutJson as unknown;
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        layout = { ...(raw as Record<string, unknown>) };
      } else {
        const text = raw != null ? String(raw).trim() : "";
        layout = text && text !== "[object Object]" ? (JSON.parse(text) as Record<string, unknown>) : {};
      }
    } catch {
      layout = {};
    }
    if (!layoutNeedsHmSanitize(layout)) continue;
    const next = sanitizeHmPublicLayoutRecord(layout, row.slug);
    if (dryRun) {
      updated += 1;
      continue;
    }
    await dualWriteUpdate(
      hmNewsSitesTable,
      { layoutJson: JSON.stringify(next), updatedAt: new Date() },
      eq(hmNewsSitesTable.id, row.id),
    );
    updated += 1;
  }
  return { scanned: rows.length, updated };
}
