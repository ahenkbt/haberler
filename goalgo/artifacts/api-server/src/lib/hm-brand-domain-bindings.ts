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

/** Özel alan → hedef slug (editör haber sitesi). Portal anasayfasına düşmesin. */
export const HM_BRAND_DOMAIN_BINDINGS: Array<{
  domain: string;
  slug: string;
  displayName: string;
  editorEmail: string;
}> = [
  {
    domain: "suhaberajansi.com",
    slug: "su",
    displayName: "Su Haber Ajansı",
    editorEmail: "editor@suhaberajansi.com",
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
    if (claimed.includes(host) || claimed.includes(www)) {
      return { id: row.id, slug: row.slug };
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

/** suhaberajansi.com gibi marka alanlarını editör haber sitesine bağlar / site yoksa oluşturur. */
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
      const claimed = await findSiteClaimingDomain(domain);
      if (claimed) {
        if (!dryRun) {
          await dualWriteUpdate(
            hmNewsSitesTable,
            { active: true, updatedAt: new Date() },
            eq(hmNewsSitesTable.id, claimed.id),
          );
        }
        results.push({
          domain,
          slug: claimed.slug || slug,
          siteId: claimed.id,
          action: "already_bound",
        });
        continue;
      }

      const sites = await listHmNewsSitesCompat();
      const target = sites.find((s) => altSlugs.has(String(s.slug ?? "").toLowerCase()));
      if (target) {
        if (dryRun) {
          results.push({
            domain,
            slug: target.slug,
            siteId: target.id,
            action: "bound_existing",
            detail: "dry-run",
          });
          continue;
        }
        await bindDomainToSite(target.id, domain);
        await dualWriteUpdate(
          hmNewsSitesTable,
          {
            active: true,
            displayName: binding.displayName,
            updatedAt: new Date(),
          },
          eq(hmNewsSitesTable.id, target.id),
        );
        await ensureEditorForSite(target.id, binding.editorEmail, binding.displayName);
        results.push({ domain, slug: target.slug, siteId: target.id, action: "bound_existing" });
        continue;
      }

      if (dryRun) {
        results.push({ domain, slug, siteId: null, action: "created_site", detail: "dry-run" });
        continue;
      }

      const [created] = await dualWriteInsert(hmNewsSitesTable, {
        slug,
        domain,
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
      results.push({ domain, slug, siteId: created.id, action: "created_site" });
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
