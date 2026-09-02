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

export type HmBrandDomainBindingResult = {
  domain: string;
  slug: string;
  siteId: number | null;
  action: "already_bound" | "bound_existing" | "created_site" | "skipped" | "error";
  detail?: string;
};

/**
 * Bilinen marka alanları (SPA / Worker host listesi).
 * Domain → site eşlemesi ARTIK admin panelinden yönetilir; burada sabit slug'a
 * zorla bağlama YAPILMAZ (suhaberajansi.com silinip /suha'ya taşınabilsin).
 */
export const HM_BRAND_DOMAIN_BINDINGS: Array<{
  domain: string;
  /** Yalnızca site hiç yokken ilk bootstrap için varsayılan slug (zorunlu rebind yok). */
  slug: string;
  displayName: string;
  editorEmail: string;
}> = [
  {
    domain: "suhaber.net",
    slug: "su",
    displayName: "Su Haber",
    editorEmail: "editor@suhaber.net",
  },
];

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

async function findSiteClaimingDomain(domain: string): Promise<{ id: number; slug: string } | null> {
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
    })
    .from(hmNewsSitesTable);
  for (const row of rows) {
    const claimed = [row.domain, row.domain2, row.domain3].map((d) => normalizeHost(String(d ?? "")));
    if (claimed.includes(host) || claimed.includes(www.replace(/^www\./, "")) || claimed.includes(www)) {
      return { id: row.id, slug: row.slug };
    }
  }
  return null;
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

/**
 * Marka alan bootstrap — admin domain sahipliğine saygı duyar.
 * - Domain bir sitede kayıtlıysa: dokunma (silinmiş domain'i /su'ya geri bağlama).
 * - Domain boşsa: sabit slug'a ZORLA bağlama YOK.
 * - Ne domain ne slug yoksa: bir kez site oluştur (domain'siz) — admin domain ekler.
 */
export async function ensureHmBrandDomainBindings(opts?: {
  dryRun?: boolean;
  /** true: domain boşken bile hardcoded slug'a bağla (eski davranış; varsayılan kapalı). */
  forceBindUnboundDomain?: boolean;
}): Promise<HmBrandDomainBindingResult[]> {
  const dryRun = opts?.dryRun === true;
  const forceBind = opts?.forceBindUnboundDomain === true;
  await ensureHmNewsSiteWritableColumns();
  const results: HmBrandDomainBindingResult[] = [];

  for (const binding of HM_BRAND_DOMAIN_BINDINGS) {
    const domain = normalizeHost(binding.domain);
    const slug = binding.slug.trim().toLowerCase();
    const altSlugs = new Set([slug, slug === "su" ? "suhaber" : ""].filter(Boolean));
    try {
      const claimed = await findSiteClaimingDomain(domain);
      if (claimed) {
        // Admin hangi siteye verdiyse orada kalsın — slug "su" diye taşıma.
        results.push({
          domain,
          slug: claimed.slug || slug,
          siteId: claimed.id,
          action: "already_bound",
          detail: `admin-owned by site #${claimed.id} (${claimed.slug})`,
        });
        continue;
      }

      const sites = await listHmNewsSitesCompat();
      const target = sites.find((s) => altSlugs.has(String(s.slug ?? "").toLowerCase()));

      if (target) {
        // Domain boş + slug var → admin bilerek silmiş olabilir; zorla geri bağlama.
        if (!forceBind) {
          results.push({
            domain,
            slug: target.slug,
            siteId: target.id,
            action: "skipped",
            detail: "domain unbound — admin assigns (no auto-rebind)",
          });
          continue;
        }
      }

      if (!target) {
        if (dryRun) {
          results.push({ domain, slug, siteId: null, action: "created_site", detail: "dry-run" });
          continue;
        }
        // İlk kurulum: site oluştur, domain'i admin bağlasın (zorla domain yazma).
        const [created] = await dualWriteInsert(hmNewsSitesTable, {
          slug,
          domain: null,
          domain2: null,
          domain3: null,
          displayName: binding.displayName,
          description: "Su Haber Ajansı dijital haber platformu",
          contactJson: JSON.stringify({ phone: "", email: binding.editorEmail, address: "" }),
          layoutJson: defaultSuLayoutJson(),
          verificationJson: null,
          active: true,
        });
        if (!created) {
          results.push({ domain, slug, siteId: null, action: "error", detail: "Site insert boş döndü" });
          continue;
        }
        await ensureEditorForSite(created.id, binding.editorEmail, binding.displayName);
        results.push({
          domain,
          slug,
          siteId: created.id,
          action: "created_site",
          detail: "site created without domain — assign in admin",
        });
        continue;
      }

      results.push({ domain, slug, siteId: target.id, action: "skipped" });
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
 * Meta öncesi: yalnızca site hiç yoksa bootstrap (domain zorla bağlanmaz).
 */
export async function ensureHmBrandSiteForMeta(opts: {
  domain?: string | null;
  slug?: string | null;
}): Promise<HmBrandDomainBindingResult[] | null> {
  const domain = normalizeHost(String(opts.domain ?? ""));
  const slug = String(opts.slug ?? "")
    .trim()
    .toLowerCase();
  const needsBind =
    (domain && isKnownHmBrandDomain(domain)) || (slug && isKnownHmBrandSlug(slug));
  if (!needsBind) return null;

  // Domain zaten bir sitede ise hiçbir şey yazma.
  if (domain) {
    const claimed = await findSiteClaimingDomain(domain);
    if (claimed) return [{ domain, slug: claimed.slug, siteId: claimed.id, action: "already_bound" }];
  }

  return ensureHmBrandDomainBindings({ dryRun: false, forceBindUnboundDomain: false });
}
