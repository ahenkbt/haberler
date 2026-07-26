import { and, eq, ilike, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  authorsTable,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  hmSiteEditorsTable,
  newsTable,
} from "@workspace/db";
import { ensureHmNewsSiteWritableColumns, listHmNewsSitesCompat } from "./hm-site-compat.js";

export type HmBrandDomainBindingResult = {
  domain: string;
  slug: string;
  siteId: number | null;
  action:
    | "already_bound"
    | "bound_existing"
    | "created_site"
    | "repaired_conflict"
    | "skipped"
    | "error";
  detail?: string;
  movedNews?: number;
};

/** Özel alan → hedef slug (editör haber sitesi). Portal anasayfasına düşmesin. */
export const HM_BRAND_DOMAIN_BINDINGS: Array<{
  domain: string;
  slug: string;
  displayName: string;
  editorEmail: string;
  /** Bu id'ler asla marka sitesi olarak kullanılmaz (ör. ASG=3). */
  forbiddenIds?: number[];
}> = [
  {
    domain: "suhaberajansi.com",
    slug: "su",
    displayName: "Su Haber Ajansı",
    editorEmail: "editor@suhaberajansi.com",
    forbiddenIds: [3],
  },
];

const PROTECTED_SLUGS = new Set([
  "asg",
  "kirsehir",
  "vkd",
  "tr",
  "vatanhaber",
  "ankarahabergundemi",
  "trafik",
]);

/** Su editör haberlerinin yanlışlıkla yazıldığı eski site (Kırşehir). */
const KIRSEHIR_SITE_ID = 2;

const ASG_SITE_ID = 3;
const ASG_RESTORE = {
  slug: "asg",
  domain: "ankarasehirgazetesi.com",
  domain2: "www.ankarasehirgazetesi.com",
  displayName: "Ankara Şehir Gazetesi",
} as const;

function normalizeHost(raw: string): string {
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

function normalizeSlug(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function defaultSuLayoutJson(): string {
  return JSON.stringify({
    hmVitrinTheme: "esen",
    mansetVariant: "center-trio",
    showPlatformNav: false,
    hmNewsSliderEnabled: true,
    hmNewsBreakingBandEnabled: true,
    hmNewsHeaderMenuEnabled: true,
    hmNewsFooterEnabled: true,
    hmNewsEsenLeadPackEnabled: true,
    hmAllowCrossSiteManualNews: false,
    hmFooterAboutHtml:
      "Su Haber Ajansı, güncel haber akışını hızlı, tarafsız ve güvenilir bir şekilde okuyucuya ulaştırmayı hedefleyen dijital bir haber platformudur.",
  });
}

function isForbiddenBrandId(binding: (typeof HM_BRAND_DOMAIN_BINDINGS)[number], id: number): boolean {
  if (!Number.isFinite(id) || id <= 0) return true;
  return (binding.forbiddenIds ?? []).includes(id);
}

function rowLooksProtected(row: {
  id?: number;
  slug?: string | null;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
  displayName?: string | null;
}): boolean {
  const slug = normalizeSlug(String(row.slug ?? ""));
  if (PROTECTED_SLUGS.has(slug)) return true;
  const hosts = [row.domain, row.domain2, row.domain3].map((d) => normalizeHost(String(d ?? "")));
  if (hosts.some((h) => h.includes("ankarasehir") || h === "belediyehizmet.com")) return true;
  const name = String(row.displayName ?? "").toLowerCase();
  if (name.includes("ankara şehir") || name.includes("ankara sehir")) return true;
  return false;
}

/** Meta/API: bu satır Su markası için güvenli mi? */
export function isCleanHmBrandSiteRow(
  row: {
    id?: number;
    slug?: string | null;
    domain?: string | null;
    domain2?: string | null;
    domain3?: string | null;
    displayName?: string | null;
  } | null
  | undefined,
  binding: (typeof HM_BRAND_DOMAIN_BINDINGS)[number],
): boolean {
  if (!row?.id) return false;
  if (isForbiddenBrandId(binding, row.id)) return false;
  if (rowLooksProtected(row)) return false;
  const slug = normalizeSlug(String(row.slug ?? ""));
  return slug === binding.slug || slug === "suhaber";
}

export function findHmBrandBinding(opts: {
  domain?: string | null;
  slug?: string | null;
}): (typeof HM_BRAND_DOMAIN_BINDINGS)[number] | null {
  const host = normalizeHost(String(opts.domain ?? ""));
  const slug = normalizeSlug(String(opts.slug ?? ""));
  return (
    HM_BRAND_DOMAIN_BINDINGS.find((b) => (host && b.domain === host) || (slug && b.slug === slug)) || null
  );
}

async function clearBrandDomainFromSite(siteId: number, domain: string): Promise<void> {
  const host = normalizeHost(domain);
  const [row] = await getNewsDbForRead()
    .select({
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
    })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, siteId))
    .limit(1);
  if (!row) return;
  const patch: Partial<typeof hmNewsSitesTable.$inferInsert> = { updatedAt: new Date() };
  let changed = false;
  if (normalizeHost(row.domain ?? "") === host) {
    patch.domain = null;
    changed = true;
  }
  if (normalizeHost(row.domain2 ?? "") === host) {
    patch.domain2 = null;
    changed = true;
  }
  if (normalizeHost(row.domain3 ?? "") === host) {
    patch.domain3 = null;
    changed = true;
  }
  if (!changed) return;
  await dualWriteUpdate(hmNewsSitesTable, patch, eq(hmNewsSitesTable.id, siteId));
}

/** ASG (id=3) Su'ya dönüştürülmüşse kimliği geri ver; Su domainini temizle. */
async function restoreAsgIfCorrupted(row: {
  id: number;
  slug: string;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
}): Promise<boolean> {
  if (row.id !== ASG_SITE_ID) return false;
  const slug = normalizeSlug(row.slug);
  const hosts = [row.domain, row.domain2, row.domain3].map((d) => normalizeHost(String(d ?? "")));
  const hasSuDomain = hosts.includes("suhaberajansi.com");
  const suSlug = slug === "su" || slug === "suhaber";
  if (!hasSuDomain && !suSlug) return false;
  await dualWriteUpdate(
    hmNewsSitesTable,
    {
      slug: ASG_RESTORE.slug,
      domain: ASG_RESTORE.domain,
      domain2: ASG_RESTORE.domain2,
      domain3: null,
      displayName: ASG_RESTORE.displayName,
      active: true,
      updatedAt: new Date(),
    },
    eq(hmNewsSitesTable.id, ASG_SITE_ID),
  );
  return true;
}

async function findSiteClaimingDomain(domain: string): Promise<{
  id: number;
  slug: string;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
  displayName?: string | null;
} | null> {
  const host = normalizeHost(domain);
  if (!host) return null;
  const www = `www.${host}`;
  const rows = await getNewsDbForRead()
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
      displayName: hmNewsSitesTable.displayName,
    })
    .from(hmNewsSitesTable);
  for (const row of rows) {
    const claimed = [row.domain, row.domain2, row.domain3].map((d) => normalizeHost(String(d ?? "")));
    if (claimed.includes(host) || claimed.includes(www)) {
      return row;
    }
  }
  return null;
}

async function bindDomainToSite(siteId: number, domain: string): Promise<"domain" | "domain2" | "domain3" | null> {
  const host = normalizeHost(domain);
  const [row] = await getNewsDbForRead()
    .select({
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
    })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, siteId))
    .limit(1);
  if (!row) return null;

  const patch: Partial<typeof hmNewsSitesTable.$inferInsert> = {
    active: true,
    updatedAt: new Date(),
  };
  let slot: "domain" | "domain2" | "domain3" | null = null;
  const d1 = normalizeHost(row.domain ?? "");
  const d2 = normalizeHost(row.domain2 ?? "");
  const d3 = normalizeHost(row.domain3 ?? "");
  if (!d1 || d1 === host) {
    patch.domain = host;
    slot = "domain";
  } else if (!d2 || d2 === host) {
    patch.domain2 = host;
    slot = "domain2";
  } else if (!d3 || d3 === host) {
    patch.domain3 = host;
    slot = "domain3";
  } else {
    patch.domain = host;
    slot = "domain";
  }
  await dualWriteUpdate(hmNewsSitesTable, patch, eq(hmNewsSitesTable.id, siteId));
  return slot;
}

async function ensureEditorForSite(siteId: number, email: string, displayName: string): Promise<void> {
  const em = email.trim().toLowerCase();
  const [existing] = await getNewsDbForRead()
    .select({ id: hmSiteEditorsTable.id })
    .from(hmSiteEditorsTable)
    .where(and(eq(hmSiteEditorsTable.siteId, siteId), eq(hmSiteEditorsTable.email, em)))
    .limit(1);
  if (existing) {
    await dualWriteUpdate(
      hmSiteEditorsTable,
      { isActive: true, displayName, updatedAt: new Date() },
      eq(hmSiteEditorsTable.id, existing.id),
    );
    return;
  }
  const passwordHash = await bcrypt.hash(`SuHaber!${siteId}-${Date.now().toString(36)}`, 10);
  await dualWriteInsert(hmSiteEditorsTable, {
    siteId,
    email: em,
    passwordHash,
    displayName,
    isActive: true,
  });
}

async function migrateSuAuthorsFromKirsehir(suSiteId: number): Promise<number> {
  const authors = await getNewsDbForRead()
    .select({ id: authorsTable.id, name: authorsTable.name })
    .from(authorsTable)
    .where(
      and(
        eq(authorsTable.hmSiteId, KIRSEHIR_SITE_ID),
        or(
          ilike(authorsTable.name, "%Serkan Sekreter%"),
          ilike(authorsTable.name, "%Su Mengüç%"),
          ilike(authorsTable.name, "%Su Menguc%"),
        ),
      ),
    );
  let moved = 0;
  for (const author of authors) {
    await dualWriteUpdate(
      authorsTable,
      { hmSiteId: suSiteId },
      eq(authorsTable.id, author.id),
    );
    moved += 1;
  }
  return moved;
}

async function migrateSuNewsFromKirsehir(suSiteId: number): Promise<number> {
  if (!Number.isFinite(suSiteId) || suSiteId <= 0) return 0;
  const candidates = await getNewsDbForRead()
    .select({
      id: newsTable.id,
      title: newsTable.title,
      slug: newsTable.slug,
      siteOnly: newsTable.siteOnly,
    })
    .from(newsTable)
    .where(
      and(
        or(eq(newsTable.siteId, KIRSEHIR_SITE_ID), eq(newsTable.ownerSiteId, KIRSEHIR_SITE_ID)),
        eq(newsTable.isEditorManual, true),
        or(
          eq(newsTable.siteOnly, true),
          ilike(newsTable.title, "%Su Mengüç%"),
          ilike(newsTable.title, "%Su Menguc%"),
          ilike(newsTable.slug, "%su-menguc%"),
          ilike(newsTable.slug, "%ahlaki-restorasyon%"),
          ilike(newsTable.slug, "%gelecek-partisi-genel-merkezi%"),
        ),
      ),
    );

  let moved = 0;
  for (const row of candidates) {
    await dualWriteUpdate(
      newsTable,
      {
        siteId: suSiteId,
        ownerSiteId: suSiteId,
        siteOnly: true,
        updatedAt: new Date(),
      },
      eq(newsTable.id, row.id),
    );
    moved += 1;
  }

  await migrateSuAuthorsFromKirsehir(suSiteId).catch(() => 0);

  // Kırşehir'de çapraz site manuel haber sızıntısını kapat
  const [kirsehir] = await getNewsDbForRead()
    .select({ id: hmNewsSitesTable.id, layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, KIRSEHIR_SITE_ID))
    .limit(1);
  if (kirsehir) {
    let layoutObj: Record<string, unknown> = {};
    try {
      const parsed = kirsehir.layoutJson ? JSON.parse(String(kirsehir.layoutJson)) : {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        layoutObj = parsed as Record<string, unknown>;
      }
    } catch {
      layoutObj = {};
    }
    if (layoutObj.hmAllowCrossSiteManualNews !== false) {
      layoutObj.hmAllowCrossSiteManualNews = false;
      await dualWriteUpdate(
        hmNewsSitesTable,
        { layoutJson: JSON.stringify(layoutObj), updatedAt: new Date() },
        eq(hmNewsSitesTable.id, KIRSEHIR_SITE_ID),
      );
    }
  }

  return moved;
}

async function insertCleanSuSite(binding: (typeof HM_BRAND_DOMAIN_BINDINGS)[number]) {
  const [created] = await dualWriteInsert(hmNewsSitesTable, {
    slug: binding.slug,
    domain: binding.domain,
    domain2: null,
    domain3: null,
    displayName: binding.displayName,
    description: "Su Haber Ajansı dijital haber platformu",
    contactJson: JSON.stringify({ phone: "", email: binding.editorEmail, address: "" }),
    layoutJson: defaultSuLayoutJson(),
    verificationJson: null,
    active: true,
  });
  return created ?? null;
}

/** suhaberajansi.com gibi marka alanlarını bağımsız editör haber sitesine bağlar / site yoksa oluşturur. */
export async function ensureHmBrandDomainBindings(opts?: {
  dryRun?: boolean;
}): Promise<HmBrandDomainBindingResult[]> {
  const dryRun = opts?.dryRun === true;
  await ensureHmNewsSiteWritableColumns();
  const results: HmBrandDomainBindingResult[] = [];

  for (const binding of HM_BRAND_DOMAIN_BINDINGS) {
    const domain = normalizeHost(binding.domain);
    const slug = binding.slug.trim().toLowerCase();
    const altSlugs = new Set([slug, slug === "su" ? "suhaber" : ""].filter(Boolean));
    try {
      const sites = await listHmNewsSitesCompat();

      // 1) Kirli / korumalı satırlardan Su domainini temizle; ASG kimliğini onar
      for (const site of sites) {
        const hosts = [site.domain, site.domain2, site.domain3].map((d) => normalizeHost(String(d ?? "")));
        const siteSlug = normalizeSlug(site.slug);
        const claimsSuDomain = hosts.includes(domain);
        const claimsSuSlug = altSlugs.has(siteSlug);
        const dirty =
          isForbiddenBrandId(binding, site.id) ||
          rowLooksProtected(site) ||
          (claimsSuSlug && isForbiddenBrandId(binding, site.id));

        if (!claimsSuDomain && !(claimsSuSlug && dirty)) continue;

        if (dryRun) continue;

        if (site.id === ASG_SITE_ID) {
          await restoreAsgIfCorrupted(site);
          continue;
        }

        if (dirty || (claimsSuDomain && !isCleanHmBrandSiteRow(site, binding))) {
          await clearBrandDomainFromSite(site.id, domain);
          if (claimsSuSlug && (PROTECTED_SLUGS.has(siteSlug) || isForbiddenBrandId(binding, site.id))) {
            // korumalı slug'a dokunma; yalnızca yanlış "su" slug'ını orphan et
          } else if (claimsSuSlug && !PROTECTED_SLUGS.has(siteSlug)) {
            await dualWriteUpdate(
              hmNewsSitesTable,
              { slug: `su-orphaned-${site.id}`, updatedAt: new Date() },
              eq(hmNewsSitesTable.id, site.id),
            );
          }
        }
      }

      // 2) Temiz Su satırı bul
      const refreshed = await listHmNewsSitesCompat();
      let target = refreshed.find((s) => isCleanHmBrandSiteRow(s, binding));

      if (target) {
        const already = [target.domain, target.domain2, target.domain3]
          .map((d) => normalizeHost(String(d ?? "")))
          .includes(domain);
        if (dryRun) {
          results.push({
            domain,
            slug: target.slug,
            siteId: target.id,
            action: already ? "already_bound" : "bound_existing",
            detail: "dry-run",
          });
          continue;
        }
        if (!already) await bindDomainToSite(target.id, domain);
        await dualWriteUpdate(
          hmNewsSitesTable,
          {
            slug,
            active: true,
            displayName: binding.displayName,
            updatedAt: new Date(),
          },
          eq(hmNewsSitesTable.id, target.id),
        );
        // Diğer sitelerden domain temizliği
        for (const site of refreshed) {
          if (site.id === target.id) continue;
          const hosts = [site.domain, site.domain2, site.domain3].map((d) => normalizeHost(String(d ?? "")));
          if (hosts.includes(domain)) await clearBrandDomainFromSite(site.id, domain);
        }
        await ensureEditorForSite(target.id, binding.editorEmail, binding.displayName);
        const movedNews = await migrateSuNewsFromKirsehir(target.id);
        results.push({
          domain,
          slug,
          siteId: target.id,
          action: already ? "already_bound" : "repaired_conflict",
          movedNews,
        });
        continue;
      }

      if (dryRun) {
        results.push({ domain, slug, siteId: null, action: "created_site", detail: "dry-run" });
        continue;
      }

      // 3) Bağımsız Su sitesi oluştur
      let createdId: number | null = null;
      try {
        const created = await insertCleanSuSite(binding);
        createdId = created?.id ?? null;
      } catch (err) {
        // slug çakışması — orphan satırı geri al
        const orphan = refreshed.find(
          (s) =>
            normalizeSlug(s.slug).startsWith("su-orphaned-") &&
            !isForbiddenBrandId(binding, s.id) &&
            !rowLooksProtected(s),
        );
        if (orphan) {
          await dualWriteUpdate(
            hmNewsSitesTable,
            {
              slug,
              domain,
              domain2: null,
              domain3: null,
              displayName: binding.displayName,
              description: "Su Haber Ajansı dijital haber platformu",
              layoutJson: orphan.layoutJson?.trim() ? orphan.layoutJson : defaultSuLayoutJson(),
              active: true,
              updatedAt: new Date(),
            },
            eq(hmNewsSitesTable.id, orphan.id),
          );
          createdId = orphan.id;
        } else {
          throw err;
        }
      }

      if (!createdId || isForbiddenBrandId(binding, createdId)) {
        results.push({ domain, slug, siteId: null, action: "error", detail: "Site insert boş veya yasaklı id" });
        continue;
      }

      // Claim eden yabancı sitelerden domain temizle
      const after = await listHmNewsSitesCompat();
      for (const site of after) {
        if (site.id === createdId) continue;
        const hosts = [site.domain, site.domain2, site.domain3].map((d) => normalizeHost(String(d ?? "")));
        if (hosts.includes(domain)) await clearBrandDomainFromSite(site.id, domain);
      }

      await ensureEditorForSite(createdId, binding.editorEmail, binding.displayName);
      const movedNews = await migrateSuNewsFromKirsehir(createdId);
      results.push({
        domain,
        slug,
        siteId: createdId,
        action: "created_site",
        movedNews,
        detail: movedNews > 0 ? `kirsehir→su ${movedNews} haber` : undefined,
      });
    } catch (e) {
      results.push({
        domain,
        slug,
        siteId: null,
        action: "error",
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return results;
}

/** Worker / SPA için bilinen HM özel alan listesi (www’siz). */
export function listHmBrandDomains(): string[] {
  return HM_BRAND_DOMAIN_BINDINGS.map((b) => normalizeHost(b.domain)).filter(Boolean);
}

export function isKnownHmBrandDomain(domain: string): boolean {
  const host = normalizeHost(domain);
  return Boolean(host) && listHmBrandDomains().includes(host);
}

export function isKnownHmBrandSlug(slug: string): boolean {
  const s = String(slug ?? "")
    .trim()
    .toLowerCase();
  return Boolean(s) && HM_BRAND_DOMAIN_BINDINGS.some((b) => b.slug === s);
}

/**
 * Meta öncesi: bilinen marka alan/slug için bağımsız site yoksa oluşturur;
 * ASG(id=3) / Kırşehir çakışmasını onarır.
 */
export async function ensureHmBrandSiteForMeta(opts: {
  domain?: string | null;
  slug?: string | null;
}): Promise<HmBrandDomainBindingResult[] | null> {
  const domain = normalizeHost(String(opts.domain ?? ""));
  const slug = String(opts.slug ?? "")
    .trim()
    .toLowerCase();
  const binding = findHmBrandBinding({ domain, slug });
  if (!binding) return null;

  // Çakışmalı mevcut satır varsa da onar (yalnızca 404 değil).
  if (domain) {
    const claimed = await findSiteClaimingDomain(domain);
    if (claimed && isCleanHmBrandSiteRow(claimed, binding)) {
      // Temiz — yine de haber göçü / ASG onarımı için tam ensure çalıştırılabilir ama
      // hot-path'de gereksiz yazmayı azalt: yine ensure çağır (migrate no-op olur).
    }
  }

  return ensureHmBrandDomainBindings({ dryRun: false });
}

/** Test / meta: satır marka ile çakışıyor mu? */
export function hmBrandMetaConflicts(
  upstream: { id?: number; slug?: string | null; domain?: string | null; displayName?: string | null } | null,
  binding: (typeof HM_BRAND_DOMAIN_BINDINGS)[number],
): boolean {
  if (!upstream?.id) return true;
  return !isCleanHmBrandSiteRow(upstream, binding);
}
