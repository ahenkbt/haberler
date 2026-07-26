import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  hmSiteEditorsTable,
} from "@workspace/db";
import { ensureHmNewsSiteWritableColumns, listHmNewsSitesCompat } from "./hm-site-compat.js";

/** Kırşehir Haber — /tr/kh (Su / suhaberajansi.com'a dokunmaz). */
export const KH_SITE_SLUG = "kh";
export const KH_DISPLAY_NAME = "Kırşehir Haber";
export const KH_DOMAINS = ["kirsehirhaber.org", "kirsehri.com", "kirsehir.net"] as const;

export type KhSiteEnsureResult = {
  siteId: number | null;
  action: "created" | "updated" | "unchanged" | "error";
  detail?: string;
  domains: string[];
};

function normalizeHost(raw: string | null | undefined): string {
  return (
    String(raw ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      ?.split(":")[0]
      ?.replace(/^www\./, "")
      ?.replace(/\.$/, "") ?? ""
  );
}

function hostMatches(a: string | null | undefined, b: string): boolean {
  const aa = normalizeHost(a);
  const bb = normalizeHost(b);
  return Boolean(aa && bb && aa === bb);
}

function defaultKhLayoutJson(): string {
  return JSON.stringify({
    hmVitrinTheme: "esen",
    mansetVariant: "center-trio",
    showPlatformNav: false,
    hmChromeColorMode: "light",
    hmNewsHeaderMenuEnabled: true,
    hmNewsSliderEnabled: true,
    hmNewsTepeMansetEnabled: true,
    hmNewsHomeModuleOrder: [
      "tepeManset",
      "hero",
      "breakingBand",
      "googleNewsBand",
      "esenLeadPack",
      "mansetAd",
      "authorsStrip",
      "latestGrid",
    ],
    hmNewsBreakingBandEnabled: true,
    hmNewsGoogleNewsBandEnabled: true,
    hmNewsCategorySectionsEnabled: true,
    hmNewsQuickLinksEnabled: true,
    hmNewsAuthorsEnabled: true,
    hmNewsHorizontalAuthorsEnabled: true,
    hmNewsSidebarAuthorsEnabled: true,
    hmNewsSidebarEnabled: true,
    hmNewsSidebarCategoriesEnabled: true,
    hmNewsFooterEnabled: true,
    hmNewsFooterCategoriesEnabled: true,
    hmNewsEsenLeadPackEnabled: true,
    hmNewsVideoTvEnabled: true,
    sadeNewsCitiesBandEnabled: true,
    hybridRssEnabled: true,
    hmYekparePoolReceiveEnabled: true,
    hmRssIntegrationMode: "live",
    /** İlk açılışta havuz haberleriyle dolu görünsün */
    hmAllowCrossSiteManualNews: true,
    hmFooterAboutHtml:
      "Kırşehir Haber, kentin gündemini, yerel gelişmeleri ve Türkiye’den seçilmiş haberleri okuyucuya ulaştıran dijital haber platformudur.",
  });
}

async function ensureEditorForKh(siteId: number): Promise<void> {
  const email = "editor@kirsehirhaber.org";
  const [existing] = await getNewsDbForRead()
    .select({ id: hmSiteEditorsTable.id })
    .from(hmSiteEditorsTable)
    .where(and(eq(hmSiteEditorsTable.siteId, siteId), eq(hmSiteEditorsTable.email, email)))
    .limit(1);
  if (existing) {
    await dualWriteUpdate(
      hmSiteEditorsTable,
      { isActive: true, displayName: KH_DISPLAY_NAME, updatedAt: new Date() },
      eq(hmSiteEditorsTable.id, existing.id),
    );
    return;
  }
  const passwordHash = await bcrypt.hash(`KhHaber!${siteId}-${Date.now().toString(36)}`, 10);
  await dualWriteInsert(hmSiteEditorsTable, {
    siteId,
    email,
    passwordHash,
    displayName: KH_DISPLAY_NAME,
    isActive: true,
  });
}

/** Başka siteden (Su dahil değil — yalnızca kh domainlerini) temizle. */
async function releaseKhDomainsFromOthers(keepSiteId: number): Promise<void> {
  const rows = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
      slug: hmNewsSitesTable.slug,
    })
    .from(hmNewsSitesTable);

  for (const row of rows) {
    if (row.id === keepSiteId) continue;
    // Yalnızca Kırşehir domainlerini temizle — suhaberajansi.com'a dokunma
    const patch: Partial<typeof hmNewsSitesTable.$inferInsert> = { updatedAt: new Date() };
    let changed = false;
    for (const host of KH_DOMAINS) {
      if (hostMatches(row.domain, host)) {
        patch.domain = null;
        changed = true;
      }
      if (hostMatches(row.domain2, host)) {
        patch.domain2 = null;
        changed = true;
      }
      if (hostMatches(row.domain3, host)) {
        patch.domain3 = null;
        changed = true;
      }
    }
    if (!changed) continue;
    await dualWriteUpdate(hmNewsSitesTable, patch, eq(hmNewsSitesTable.id, row.id));
  }
}

/**
 * /tr/kh sitesini oluşturur veya günceller; Kırşehir domainlerini bağlar.
 * suhaberajansi.com / slug=su satırına yazmaz.
 */
export async function ensureKhNewsSite(opts?: { dryRun?: boolean }): Promise<KhSiteEnsureResult> {
  const dryRun = opts?.dryRun === true;
  await ensureHmNewsSiteWritableColumns();

  const sites = await listHmNewsSitesCompat();
  let target =
    sites.find((s) => String(s.slug ?? "").trim().toLowerCase() === KH_SITE_SLUG) ??
    sites.find((s) => String(s.slug ?? "").trim().toLowerCase() === "kirsehir");

  if (dryRun) {
    return {
      siteId: target?.id ?? null,
      action: target ? "unchanged" : "created",
      detail: "dry-run",
      domains: [...KH_DOMAINS],
    };
  }

  if (!target) {
    const [created] = await dualWriteInsert(hmNewsSitesTable, {
      slug: KH_SITE_SLUG,
      domain: KH_DOMAINS[0],
      domain2: KH_DOMAINS[1],
      domain3: KH_DOMAINS[2],
      displayName: KH_DISPLAY_NAME,
      description: "Kırşehir’in dijital haber platformu",
      contactJson: JSON.stringify({ phone: "", email: "editor@kirsehirhaber.org", address: "Kırşehir" }),
      layoutJson: defaultKhLayoutJson(),
      verificationJson: null,
      active: true,
    });
    if (!created) {
      return { siteId: null, action: "error", detail: "insert boş", domains: [...KH_DOMAINS] };
    }
    await releaseKhDomainsFromOthers(created.id);
    await ensureEditorForKh(created.id);
    return {
      siteId: created.id,
      action: "created",
      detail: "kh site + domains",
      domains: [...KH_DOMAINS],
    };
  }

  await releaseKhDomainsFromOthers(target.id);

  let layoutJson = target.layoutJson;
  try {
    const parsed = layoutJson ? (JSON.parse(String(layoutJson)) as Record<string, unknown>) : {};
    const defaults = JSON.parse(defaultKhLayoutJson()) as Record<string, unknown>;
    const next = {
      ...defaults,
      ...parsed,
      hmVitrinTheme: parsed.hmVitrinTheme || "esen",
      mansetVariant: parsed.mansetVariant || "center-trio",
      hmNewsTepeMansetEnabled: true,
      hmNewsSliderEnabled: true,
      hmNewsBreakingBandEnabled: true,
      hmNewsGoogleNewsBandEnabled: true,
      hmNewsEsenLeadPackEnabled: true,
      hybridRssEnabled: true,
      hmYekparePoolReceiveEnabled: true,
      hmAllowCrossSiteManualNews: parsed.hmAllowCrossSiteManualNews ?? true,
      hmNewsHomeModuleOrder:
        Array.isArray(parsed.hmNewsHomeModuleOrder) && parsed.hmNewsHomeModuleOrder.length > 0
          ? parsed.hmNewsHomeModuleOrder
          : defaults.hmNewsHomeModuleOrder,
    };
    layoutJson = JSON.stringify(next);
  } catch {
    layoutJson = defaultKhLayoutJson();
  }

  await dualWriteUpdate(
    hmNewsSitesTable,
    {
      slug: KH_SITE_SLUG,
      displayName: target.displayName?.trim() || KH_DISPLAY_NAME,
      domain: KH_DOMAINS[0],
      domain2: KH_DOMAINS[1],
      domain3: KH_DOMAINS[2],
      layoutJson,
      active: true,
      updatedAt: new Date(),
    },
    eq(hmNewsSitesTable.id, target.id),
  );
  await ensureEditorForKh(target.id);

  return {
    siteId: target.id,
    action: "updated",
    detail: "kh domains + full layout",
    domains: [...KH_DOMAINS],
  };
}
