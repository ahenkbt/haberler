import { and, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  hmSiteEditorsTable,
} from "@workspace/db";
import { ensureHmSiteEditorUsernameColumn } from "./hm-editor-profile.js";
import { ensureHmNewsSiteWritableColumns, listHmNewsSitesCompat } from "./hm-site-compat.js";
import { sanitizeHmPublicLayoutRecord } from "./hm-layout-sanitize.js";
import { HM_TEPE_MANSET_DEFAULT_ON_REV } from "./hm-tepe-manset-layout.js";
import {
  DEFAULT_HM_NEWS_RSS_SOURCE_PACK_FLAGS,
  HM_RSS_KARMA_DEFAULTS_REV,
} from "./hm-rss-source-packs.js";

/**
 * Kırşehir Haber — kanonik slug `kirsehirhaber` (/tr/kirsehirhaber).
 * Eski `kh` silindi; yeniden oluşturulmaz. Su / suhaberajansi.com'a dokunmaz.
 */
export const KH_SITE_SLUG = "kirsehirhaber";
export const KH_DISPLAY_NAME = "KIRŞEHİR HABER PORTALI";
export const KH_DOMAINS = ["kirsehirhaber.org", "kirsehri.com", "kirsehir.net"] as const;
/** Eski / alternatif slug'lar — yalnızca bulmak için; yazarken kanonik `kirsehirhaber` kullanılır. */
export const KH_LEGACY_SLUGS = ["kirsehirhaber", "kirsehir", "kh"] as const;

export function isKhNewsHost(domain: string | null | undefined): boolean {
  const host = normalizeHost(domain);
  return Boolean(host) && (KH_DOMAINS as readonly string[]).includes(host);
}

export function isKhNewsSlug(slug: string | null | undefined): boolean {
  const s = normalizeSlug(slug);
  return (KH_LEGACY_SLUGS as readonly string[]).includes(s);
}

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

function normalizeSlug(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
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
    hmTepeMansetOptInRev: HM_TEPE_MANSET_DEFAULT_ON_REV,
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
    hmRssSourcePacks: { ...DEFAULT_HM_NEWS_RSS_SOURCE_PACK_FLAGS },
    hmRssKarmaDefaultsRev: HM_RSS_KARMA_DEFAULTS_REV,
    hmYekparePoolReceiveEnabled: true,
    hmHomepageLocalCity: "kirsehir",
    hmClassicAraMansetCategorySlugs: ["yerel", "gundem"],
    hmNewsFeaturedCategoryStripSlugs: ["yerel", "gundem"],
    hmCategorySortSlugs: ["yerel", "gundem", "dunya", "ekonomi", "politika", "spor", "teknoloji"],
    hmRssIntegrationMode: "live",
    /** İlk açılışta havuz haberleriyle dolu görünsün */
    hmAllowCrossSiteManualNews: true,
    hmFooterAboutHtml:
      "Kırşehir Haber, kentin gündemini, yerel gelişmeleri ve Türkiye’den seçilmiş haberleri okuyucuya ulaştıran dijital haber platformudur.",
  });
}

/** İkinci Kırşehir editörü — paralel oturum için ayrı hesap. */
export const KH_YEKEPARE_EDITOR = {
  email: "yekpare@gmail.com",
  username: "yekpare",
  password: "yekpare",
  displayName: "Yekpare Editör",
} as const;

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
  } else {
    const passwordHash = await bcrypt.hash(`KhHaber!${siteId}-${Date.now().toString(36)}`, 10);
    await dualWriteInsert(hmSiteEditorsTable, {
      siteId,
      email,
      passwordHash,
      displayName: KH_DISPLAY_NAME,
      isActive: true,
    });
  }
  await ensureYekpareEditorForKh(siteId);
}

/** yekpare@gmail.com / yekpare — Kırşehir ikinci editör (şifre her ensure'da senkron). */
export async function ensureYekpareEditorForKh(siteId: number): Promise<void> {
  await ensureHmSiteEditorUsernameColumn().catch(() => undefined);
  const email = KH_YEKEPARE_EDITOR.email;
  const passwordHash = await bcrypt.hash(KH_YEKEPARE_EDITOR.password, 10);
  const [existing] = await getNewsDbForRead()
    .select({ id: hmSiteEditorsTable.id })
    .from(hmSiteEditorsTable)
    .where(and(eq(hmSiteEditorsTable.siteId, siteId), sql`lower(${hmSiteEditorsTable.email}) = ${email}`))
    .limit(1);
  if (existing) {
    await dualWriteUpdate(
      hmSiteEditorsTable,
      {
        passwordHash,
        username: KH_YEKEPARE_EDITOR.username,
        displayName: KH_YEKEPARE_EDITOR.displayName,
        isActive: true,
        updatedAt: new Date(),
      },
      eq(hmSiteEditorsTable.id, existing.id),
    );
    return;
  }
  await dualWriteInsert(hmSiteEditorsTable, {
    siteId,
    email,
    username: KH_YEKEPARE_EDITOR.username,
    passwordHash,
    displayName: KH_YEKEPARE_EDITOR.displayName,
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

/** Retired duplicates keep their row and content, but must not win by-domain or slug lookup. */
export const KH_RETIRED_SLUG_PREFIX = "kirsehirhaber-retired-";

export function isRetiredKhSlug(slug: string | null | undefined): boolean {
  return normalizeSlug(slug).startsWith(KH_RETIRED_SLUG_PREFIX);
}

export type KhSitePickRow = {
  id: number;
  slug: string | null;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
  active?: boolean | null;
};

function rowIsKhSite(row: KhSitePickRow): boolean {
  if (isKhNewsSlug(row.slug) || isRetiredKhSlug(row.slug)) return true;
  return KH_DOMAINS.some(
    (host) =>
      hostMatches(row.domain, host) ||
      hostMatches(row.domain2, host) ||
      hostMatches(row.domain3, host),
  );
}

/**
 * One stable row. Prefer the active `kirsehirhaber` slug with the lowest id
 * (LiveBridge 944 when that row is still active). Never the newest throwaway.
 * Retired rows are reused only when nothing else is left, so ensure does not insert.
 */
export function pickStableKhSite<T extends KhSitePickRow>(sites: T[]): T | null {
  const kh = (Array.isArray(sites) ? sites : []).filter((row) => row && Number(row.id) > 0 && rowIsKhSite(row));
  const live = kh.filter((row) => !isRetiredKhSlug(row.slug));
  const pool = live.length ? live : kh;
  const exact = pool.filter((row) => normalizeSlug(row.slug) === KH_SITE_SLUG);
  const exactActive = exact.filter((row) => row.active !== false);
  const active = pool.filter((row) => row.active !== false);
  const candidates = exactActive.length ? exactActive : exact.length ? exact : active.length ? active : pool;
  const pinned = candidates.find((row) => Number(row.id) === 944 && normalizeSlug(row.slug) === KH_SITE_SLUG);
  if (pinned) return pinned;
  return [...candidates].sort((a, b) => Number(a.id) - Number(b.id))[0] ?? null;
}

async function retireExtraKhRows(
  sites: Array<{ id: number; slug: string | null }>,
  keepId: number,
): Promise<void> {
  for (const row of sites) {
    if (!row || row.id === keepId) continue;
    if (!isKhNewsSlug(row.slug) || isRetiredKhSlug(row.slug)) continue;
    await dualWriteUpdate(
      hmNewsSitesTable,
      {
        active: false,
        slug: `${KH_RETIRED_SLUG_PREFIX}${row.id}`,
        domain: null,
        domain2: null,
        domain3: null,
        updatedAt: new Date(),
      },
      eq(hmNewsSitesTable.id, row.id),
    );
  }
}

async function bindKhDomains(siteId: number): Promise<void> {
  const full = {
    slug: KH_SITE_SLUG,
    domain: KH_DOMAINS[0],
    domain2: KH_DOMAINS[1],
    domain3: KH_DOMAINS[2],
    active: true,
    updatedAt: new Date(),
  };
  try {
    await dualWriteUpdate(hmNewsSitesTable, full, eq(hmNewsSitesTable.id, siteId));
    return;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/unique|duplicate|domain2|domain3|column/i.test(msg)) throw err;
  }
  await releaseKhDomainsFromOthers(siteId);
  await dualWriteUpdate(
    hmNewsSitesTable,
    {
      slug: KH_SITE_SLUG,
      domain: KH_DOMAINS[0],
      active: true,
      updatedAt: new Date(),
    },
    eq(hmNewsSitesTable.id, siteId),
  );
}

/**
 * /tr/kirsehirhaber sitesini oluşturur veya günceller; Kırşehir domainlerini bağlar.
 * Eski slug `kh` yeniden yaratılmaz. suhaberajansi.com / slug=su satırına yazmaz.
 */
export async function ensureKhNewsSite(opts?: { dryRun?: boolean }): Promise<KhSiteEnsureResult> {
  const dryRun = opts?.dryRun === true;
  await ensureHmNewsSiteWritableColumns();

  const sites = await listHmNewsSitesCompat();
  const target = pickStableKhSite(sites);

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
      detail: "kirsehirhaber site + domains",
      domains: [...KH_DOMAINS],
    };
  }

  await retireExtraKhRows(sites, target.id);
  // 2026-10-09: Kırşehir moved to kirsehir.gundemi.org and kirsehirhaber.org stays closed.
  // Once the panel gave the row a host outside KH_DOMAINS, boot must not pull it back.
  const panelOwnsDomains = [target.domain, target.domain2, target.domain3].some((d) => {
    const h = String(d ?? "").trim().toLowerCase().replace(/^www\./, "");
    return h !== "" && !(KH_DOMAINS as readonly string[]).includes(h);
  });
  if (!panelOwnsDomains) {
    await releaseKhDomainsFromOthers(target.id);
    await bindKhDomains(target.id);
  }

  let layoutJson = target.layoutJson;
  try {
    const parsed = layoutJson ? (JSON.parse(String(layoutJson)) as Record<string, unknown>) : {};
    const defaults = JSON.parse(defaultKhLayoutJson()) as Record<string, unknown>;
    const next = sanitizeHmPublicLayoutRecord(
      {
        ...defaults,
        ...parsed,
        hmVitrinTheme: parsed.hmVitrinTheme || "esen",
        mansetVariant: parsed.mansetVariant || "center-trio",
        hmNewsTepeMansetEnabled: parsed.hmNewsTepeMansetEnabled !== false,
        hmTepeMansetOptInRev: parsed.hmTepeMansetOptInRev,
        hmNewsSliderEnabled: true,
        hmNewsBreakingBandEnabled: true,
        hmNewsGoogleNewsBandEnabled: true,
        hmNewsEsenLeadPackEnabled: true,
        hybridRssEnabled: true,
        hmRssSourcePacks: { ...DEFAULT_HM_NEWS_RSS_SOURCE_PACK_FLAGS },
        hmRssKarmaDefaultsRev: HM_RSS_KARMA_DEFAULTS_REV,
        hmYekparePoolReceiveEnabled: true,
        hmHomepageLocalCity: parsed.hmHomepageLocalCity || "kirsehir",
        hmClassicAraMansetCategorySlugs: Array.isArray(parsed.hmClassicAraMansetCategorySlugs)
          ? parsed.hmClassicAraMansetCategorySlugs
          : defaults.hmClassicAraMansetCategorySlugs,
        hmNewsFeaturedCategoryStripSlugs: Array.isArray(parsed.hmNewsFeaturedCategoryStripSlugs)
          ? parsed.hmNewsFeaturedCategoryStripSlugs
          : defaults.hmNewsFeaturedCategoryStripSlugs,
        hmCategorySortSlugs: Array.isArray(parsed.hmCategorySortSlugs)
          ? parsed.hmCategorySortSlugs
          : defaults.hmCategorySortSlugs,
        hmAllowCrossSiteManualNews: parsed.hmAllowCrossSiteManualNews ?? true,
        hmNewsHomeModuleOrder:
          Array.isArray(parsed.hmNewsHomeModuleOrder) && parsed.hmNewsHomeModuleOrder.length > 0
            ? parsed.hmNewsHomeModuleOrder
            : defaults.hmNewsHomeModuleOrder,
      },
      KH_SITE_SLUG,
    );
    layoutJson = JSON.stringify(next);
  } catch {
    layoutJson = defaultKhLayoutJson();
  }

  try {
    await dualWriteUpdate(
      hmNewsSitesTable,
      {
        displayName: target.displayName?.trim() || KH_DISPLAY_NAME,
        layoutJson,
        updatedAt: new Date(),
      },
      eq(hmNewsSitesTable.id, target.id),
    );
  } catch (err) {
    console.error(
      "[hm-kh] layout update",
      err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
    );
  }
  await ensureEditorForKh(target.id);

  return {
    siteId: target.id,
    action: "updated",
    detail: "kirsehirhaber domains + full layout",
    domains: [...KH_DOMAINS],
  };
}
