import { Router, type IRouter } from "express";
import { eq, sql, asc } from "drizzle-orm";
import { db, siteSettingsTable, yekpareServiceTypesTable } from "@workspace/db";
import { UpdateSiteSettingsBody } from "@workspace/api-zod";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";
import { fetchUsdTryRateFromFrankfurter } from "../lib/fetch-usd-try";
import {
  validateMainNavJsonInput,
  validateFooterNavJsonInput,
  validateFooterLegalLinksJsonInput,
  validateFooterInfoLinksJsonInput,
  validateLegalPagesJsonInput,
  validateModulesEnabledJsonInput,
  validateHomeSectionsJsonInput,
} from "@workspace/site-nav";
import { serializeSettings } from "../lib/serializers";
import { clearTravelpayoutsConfigCache } from "../lib/travelpayouts";
import { validateHomepageDesignJsonInput } from "../lib/homepage-design";
import {
  normalizeSeoVerification,
  parseSeoVerificationJson,
  resolveSeoVerificationForHost,
  serializeSeoVerificationJson,
  normalizeHostKey,
} from "../lib/seo-verification";

const router: IRouter = Router();
let ensuredExtraSettingsCols = false;

async function ensureExtraSettingsColumns() {
  if (ensuredExtraSettingsCols) return;
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS bank_account_holder TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS bank_iban TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS bank_name_branch TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS bank_account_number TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS google_places_api_key TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS google_maps_server_key TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS openai_api_key TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS openai_model TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS magnific_api_key TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS magnific_webhook_secret TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS admin_callmebot_api_key TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS smtp_host TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS smtp_port TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS smtp_user TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS smtp_pass TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS smtp_from TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_host TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_port TEXT DEFAULT '993'`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_user TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_pass TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS imap_folder TEXT DEFAULT 'INBOX'`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS gemini_api_key TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS deepseek_api_key TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS travelpayouts_api_token TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS travelpayouts_marker TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_legal_links_json TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS legal_pages_json TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_info_links_json TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS news_layout_json TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS main_nav_json TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_nav_json TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS modules_enabled_json TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS home_sections_json TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS homepage_design_json TEXT`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS public_theme_key TEXT NOT NULL DEFAULT 'yekpare-sade'`);
  await db.execute(
    sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS provider_membership_standard_usd NUMERIC(10, 2) NOT NULL DEFAULT 10`,
  );
  await db.execute(
    sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS provider_membership_gold_usd NUMERIC(10, 2) NOT NULL DEFAULT 10`,
  );
  await db.execute(
    sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS provider_membership_premium_per_business_usd NUMERIC(10, 2) NOT NULL DEFAULT 10`,
  );
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS usd_try_rate NUMERIC(14, 6)`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS usd_try_updated_at TIMESTAMPTZ`);
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS verification_json TEXT`);
  ensuredExtraSettingsCols = true;
}

async function getOrCreate() {
  await ensureExtraSettingsColumns();
  const rows = await db.select().from(siteSettingsTable).limit(1);
  if (rows[0]) return rows[0];
  const [row] = await db
    .insert(siteSettingsTable)
    .values({})
    .returning();
  return row;
}

router.get("/settings", async (_req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  const row = await getOrCreate();
  res.json(serializeSettings(row));
});

/** Google Search Console vb. doğrulama botları — yalnızca meta etiket içeriği (herkese açık). */
router.get("/public/portal-seo", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  const row = await getOrCreate();
  const store = parseSeoVerificationJson(row.verificationJson);
  const fwd = String(req.get("x-forwarded-host") ?? "")
    .split(",")[0]
    ?.trim();
  const host = normalizeHostKey(fwd || String(req.get("host") ?? ""));
  const seoVerification = resolveSeoVerificationForHost(store, host);
  res.json({
    siteName: row.siteName,
    host: host || null,
    seoVerification,
  });
});

/** Yönetici: Frankfurter üzerinden USD→TRY kurunu çekip site_settings’e yazar. */
router.post("/settings/refresh-usd-try", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "site_ayarlari")) return;
  await ensureExtraSettingsColumns();
  const rate = await fetchUsdTryRateFromFrankfurter();
  if (rate == null) {
    res.status(502).json({ error: "USD/TRY kuru alınamadı. Bir süre sonra tekrar deneyin." });
    return;
  }
  const current = await getOrCreate();
  const [row] = await db
    .update(siteSettingsTable)
    .set({
      usdTryRate: String(rate),
      usdTryUpdatedAt: new Date(),
    })
    .where(eq(siteSettingsTable.id, current.id))
    .returning();
  res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  res.json(serializeSettings(row));
});

/** Faz 0: birleşik hizmet / talep tipi kataloğu (sipariş, ulaşım, harita, …) */
router.get("/settings/service-types", async (_req, res): Promise<void> => {
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  const rows = await db
    .select()
    .from(yekpareServiceTypesTable)
    .where(eq(yekpareServiceTypesTable.active, true))
    .orderBy(asc(yekpareServiceTypesTable.sortOrder), asc(yekpareServiceTypesTable.code));
  res.json(rows);
});

router.put("/settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "site_ayarlari")) return;
  await ensureExtraSettingsColumns();
  const parsed = UpdateSiteSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  let payload = { ...parsed.data };
  if (payload.mainNavJson !== undefined) {
    const checked = validateMainNavJsonInput(payload.mainNavJson ?? null);
    if (!checked.ok) {
      res.status(400).json({ error: checked.error });
      return;
    }
    payload = { ...payload, mainNavJson: checked.value };
  }
  if (payload.footerNavJson !== undefined) {
    const checked = validateFooterNavJsonInput(payload.footerNavJson ?? null);
    if (!checked.ok) {
      res.status(400).json({ error: checked.error });
      return;
    }
    payload = { ...payload, footerNavJson: checked.value };
  }
  if (payload.modulesEnabledJson !== undefined) {
    const checked = validateModulesEnabledJsonInput(payload.modulesEnabledJson ?? null);
    if (!checked.ok) {
      res.status(400).json({ error: checked.error });
      return;
    }
    payload = { ...payload, modulesEnabledJson: checked.value };
  }
  if (payload.homeSectionsJson !== undefined) {
    const checked = validateHomeSectionsJsonInput(payload.homeSectionsJson ?? null);
    if (!checked.ok) {
      res.status(400).json({ error: checked.error });
      return;
    }
    payload = { ...payload, homeSectionsJson: checked.value };
  }
  if (payload.homepageDesignJson !== undefined) {
    const checked = validateHomepageDesignJsonInput(payload.homepageDesignJson ?? null);
    if (!checked.ok) {
      res.status(400).json({ error: checked.error });
      return;
    }
    payload = { ...payload, homepageDesignJson: checked.value };
  }
  if (payload.logoUrl !== undefined && payload.logoUrl != null) {
    const u = String(payload.logoUrl).trim();
    if (u.length > 2048) {
      res.status(400).json({ error: "logoUrl çok uzun" });
      return;
    }
    payload = { ...payload, logoUrl: u === "" ? null : u };
  }
  if (payload.mapsGoogleBrowserKey !== undefined && payload.mapsGoogleBrowserKey != null) {
    const u = String(payload.mapsGoogleBrowserKey).trim();
    if (u.length > 512) {
      res.status(400).json({ error: "mapsGoogleBrowserKey çok uzun" });
      return;
    }
    payload = { ...payload, mapsGoogleBrowserKey: u === "" ? null : u };
  }
  if (payload.publicThemeKey !== undefined) {
    payload = { ...payload, publicThemeKey: "yekpare-sade" };
  }
  const raw = (req.body ?? {}) as Record<string, unknown>;
  const googlePlacesApiKey = raw.googlePlacesApiKey == null ? undefined : String(raw.googlePlacesApiKey).trim();
  const googleMapsServerKey = raw.googleMapsServerKey == null ? undefined : String(raw.googleMapsServerKey).trim();
  const openaiApiKey = raw.openaiApiKey == null ? undefined : String(raw.openaiApiKey).trim();
  const openaiModel = raw.openaiModel == null ? undefined : String(raw.openaiModel).trim();
  const integrationPayload: Partial<typeof siteSettingsTable.$inferInsert> = {};
  const footerLegalRaw = raw.footerLegalLinksJson;
  if (footerLegalRaw !== undefined) {
    const checked = validateFooterLegalLinksJsonInput(
      footerLegalRaw == null ? null : String(footerLegalRaw),
    );
    if (!checked.ok) {
      res.status(400).json({ error: checked.error });
      return;
    }
    integrationPayload.footerLegalLinksJson = checked.value;
  }
  const footerInfoRaw = raw.footerInfoLinksJson;
  if (footerInfoRaw !== undefined) {
    const checked = validateFooterInfoLinksJsonInput(
      footerInfoRaw == null ? null : String(footerInfoRaw),
    );
    if (!checked.ok) {
      res.status(400).json({ error: checked.error });
      return;
    }
    (integrationPayload as Record<string, unknown>).footerInfoLinksJson = checked.value;
  }
  const legalPagesRaw = raw.legalPagesJson;
  if (legalPagesRaw !== undefined) {
    const checked = validateLegalPagesJsonInput(
      legalPagesRaw == null ? null : String(legalPagesRaw),
    );
    if (!checked.ok) {
      res.status(400).json({ error: checked.error });
      return;
    }
    integrationPayload.legalPagesJson = checked.value;
  }
  if (googlePlacesApiKey !== undefined) {
    if (googlePlacesApiKey.length > 512) {
      res.status(400).json({ error: "googlePlacesApiKey çok uzun" });
      return;
    }
    if (googlePlacesApiKey !== "***" && googlePlacesApiKey !== "***configured***") {
      integrationPayload.googlePlacesApiKey = googlePlacesApiKey === "" ? null : googlePlacesApiKey;
    }
  }
  if (googleMapsServerKey !== undefined) {
    if (googleMapsServerKey.length > 512) {
      res.status(400).json({ error: "googleMapsServerKey çok uzun" });
      return;
    }
    if (googleMapsServerKey !== "***" && googleMapsServerKey !== "***configured***") {
      integrationPayload.googleMapsServerKey = googleMapsServerKey === "" ? null : googleMapsServerKey;
    }
  }
  if (openaiApiKey !== undefined) {
    if (openaiApiKey.length > 512) {
      res.status(400).json({ error: "openaiApiKey çok uzun" });
      return;
    }
    if (openaiApiKey !== "***" && openaiApiKey !== "***configured***") {
      integrationPayload.openaiApiKey = openaiApiKey === "" ? null : openaiApiKey;
    }
  }
  if (openaiModel !== undefined) {
    if (openaiModel.length > 120) {
      res.status(400).json({ error: "openaiModel çok uzun" });
      return;
    }
    integrationPayload.openaiModel = openaiModel === "" ? null : openaiModel;
  }
  const magnificApiKey = raw.magnificApiKey == null ? undefined : String(raw.magnificApiKey).trim();
  const magnificWebhookSecret =
    raw.magnificWebhookSecret == null ? undefined : String(raw.magnificWebhookSecret).trim();
  if (magnificApiKey !== undefined) {
    if (magnificApiKey.length > 256) {
      res.status(400).json({ error: "magnificApiKey çok uzun" });
      return;
    }
    if (magnificApiKey !== "***" && magnificApiKey !== "***configured***") {
      integrationPayload.magnificApiKey = magnificApiKey === "" ? null : magnificApiKey;
    }
  }
  if (magnificWebhookSecret !== undefined) {
    if (magnificWebhookSecret.length > 256) {
      res.status(400).json({ error: "magnificWebhookSecret çok uzun" });
      return;
    }
    if (magnificWebhookSecret !== "***" && magnificWebhookSecret !== "***configured***") {
      integrationPayload.magnificWebhookSecret = magnificWebhookSecret === "" ? null : magnificWebhookSecret;
    }
  }
  const adminCallmebotApiKey =
    raw.adminCallmebotApiKey == null ? undefined : String(raw.adminCallmebotApiKey).trim();
  const smtpHost = raw.smtpHost == null ? undefined : String(raw.smtpHost).trim();
  const smtpPort = raw.smtpPort == null ? undefined : String(raw.smtpPort).trim();
  const smtpUser = raw.smtpUser == null ? undefined : String(raw.smtpUser).trim();
  const smtpPass = raw.smtpPass == null ? undefined : String(raw.smtpPass).trim();
  const smtpFrom = raw.smtpFrom == null ? undefined : String(raw.smtpFrom).trim();
  const geminiApiKey = raw.geminiApiKey == null ? undefined : String(raw.geminiApiKey).trim();
  const deepseekApiKey = raw.deepseekApiKey == null ? undefined : String(raw.deepseekApiKey).trim();
  if (adminCallmebotApiKey !== undefined) {
    if (adminCallmebotApiKey.length > 256) {
      res.status(400).json({ error: "adminCallmebotApiKey çok uzun" });
      return;
    }
    if (adminCallmebotApiKey !== "***") {
      integrationPayload.adminCallmebotApiKey = adminCallmebotApiKey === "" ? null : adminCallmebotApiKey;
    }
  }
  if (smtpHost !== undefined) {
    if (smtpHost.length > 256) {
      res.status(400).json({ error: "smtpHost çok uzun" });
      return;
    }
    integrationPayload.smtpHost = smtpHost === "" ? null : smtpHost;
  }
  if (smtpPort !== undefined) {
    if (smtpPort.length > 16) {
      res.status(400).json({ error: "smtpPort çok uzun" });
      return;
    }
    integrationPayload.smtpPort = smtpPort === "" ? null : smtpPort;
  }
  if (smtpUser !== undefined) {
    if (smtpUser.length > 256) {
      res.status(400).json({ error: "smtpUser çok uzun" });
      return;
    }
    integrationPayload.smtpUser = smtpUser === "" ? null : smtpUser;
  }
  if (smtpPass !== undefined) {
    if (smtpPass.length > 512) {
      res.status(400).json({ error: "smtpPass çok uzun" });
      return;
    }
    if (smtpPass !== "***") {
      integrationPayload.smtpPass = smtpPass === "" ? null : smtpPass;
    }
  }
  if (smtpFrom !== undefined) {
    if (smtpFrom.length > 512) {
      res.status(400).json({ error: "smtpFrom çok uzun" });
      return;
    }
    integrationPayload.smtpFrom = smtpFrom === "" ? null : smtpFrom;
  }
  const imapHost = raw.imapHost == null ? undefined : String(raw.imapHost).trim();
  const imapPort = raw.imapPort == null ? undefined : String(raw.imapPort).trim();
  const imapUser = raw.imapUser == null ? undefined : String(raw.imapUser).trim();
  const imapPass = raw.imapPass == null ? undefined : String(raw.imapPass);
  const imapFolder = raw.imapFolder == null ? undefined : String(raw.imapFolder).trim();
  if (imapHost !== undefined) {
    if (imapHost.length > 256) {
      res.status(400).json({ error: "imapHost çok uzun" });
      return;
    }
    integrationPayload.imapHost = imapHost === "" ? null : imapHost;
  }
  if (imapPort !== undefined) {
    if (imapPort.length > 16) {
      res.status(400).json({ error: "imapPort çok uzun" });
      return;
    }
    integrationPayload.imapPort = imapPort === "" ? null : imapPort;
  }
  if (imapUser !== undefined) {
    if (imapUser.length > 256) {
      res.status(400).json({ error: "imapUser çok uzun" });
      return;
    }
    integrationPayload.imapUser = imapUser === "" ? null : imapUser;
  }
  if (imapPass !== undefined) {
    if (imapPass.length > 512) {
      res.status(400).json({ error: "imapPass çok uzun" });
      return;
    }
    if (imapPass !== "***") {
      integrationPayload.imapPass = imapPass === "" ? null : imapPass;
    }
  }
  if (imapFolder !== undefined) {
    if (imapFolder.length > 120) {
      res.status(400).json({ error: "imapFolder çok uzun" });
      return;
    }
    integrationPayload.imapFolder = imapFolder === "" ? null : imapFolder;
  }
  if (geminiApiKey !== undefined) {
    if (geminiApiKey.length > 512) {
      res.status(400).json({ error: "geminiApiKey çok uzun" });
      return;
    }
    if (geminiApiKey !== "***" && geminiApiKey !== "***configured***") {
      integrationPayload.geminiApiKey = geminiApiKey === "" ? null : geminiApiKey;
    }
  }
  const youtubeApiKey = raw.youtubeApiKey == null ? undefined : String(raw.youtubeApiKey).trim();
  if (youtubeApiKey !== undefined) {
    if (youtubeApiKey.length > 512) {
      res.status(400).json({ error: "youtubeApiKey çok uzun" });
      return;
    }
    if (youtubeApiKey !== "***" && youtubeApiKey !== "***configured***") {
      integrationPayload.youtubeApiKey = youtubeApiKey === "" ? null : youtubeApiKey;
    }
  }
  if (deepseekApiKey !== undefined) {
    if (deepseekApiKey.length > 512) {
      res.status(400).json({ error: "deepseekApiKey çok uzun" });
      return;
    }
    if (deepseekApiKey !== "***" && deepseekApiKey !== "***configured***") {
      integrationPayload.deepseekApiKey = deepseekApiKey === "" ? null : deepseekApiKey;
    }
  }
  const travelpayoutsApiToken =
    raw.travelpayoutsApiToken == null ? undefined : String(raw.travelpayoutsApiToken).trim();
  const travelpayoutsMarker =
    raw.travelpayoutsMarker == null ? undefined : String(raw.travelpayoutsMarker).trim();
  if (travelpayoutsApiToken !== undefined) {
    if (travelpayoutsApiToken.length > 256) {
      res.status(400).json({ error: "travelpayoutsApiToken çok uzun" });
      return;
    }
    // "***"/"***configured***" sentinel → mevcut token korunur (maskeli gösterim geri gönderilebilir).
    if (
      travelpayoutsApiToken !== "***" &&
      travelpayoutsApiToken !== "***configured***" &&
      !/^•+\d{0,4}$/.test(travelpayoutsApiToken)
    ) {
      integrationPayload.travelpayoutsApiToken = travelpayoutsApiToken === "" ? null : travelpayoutsApiToken;
    }
  }
  if (travelpayoutsMarker !== undefined) {
    if (travelpayoutsMarker.length > 64) {
      res.status(400).json({ error: "travelpayoutsMarker çok uzun" });
      return;
    }
    integrationPayload.travelpayoutsMarker = travelpayoutsMarker === "" ? null : travelpayoutsMarker;
  }

  function parseUsdMoneyField(label: string, v: unknown): string | undefined {
    if (v === undefined) return undefined;
    const s = String(v).trim().replace(/\s/g, "").replace(",", ".");
    if (s === "") return undefined;
    const n = parseFloat(s);
    if (!Number.isFinite(n) || n < 0 || n > 999_999) {
      res.status(400).json({ error: `${label} 0 ile 999999 arasında geçerli bir sayı olmalıdır` });
      return "__invalid__";
    }
    return n.toFixed(2);
  }

  if (raw.providerMembershipStandardUsd !== undefined) {
    const x = parseUsdMoneyField("Standart üyelik (USD)", raw.providerMembershipStandardUsd);
    if (x === "__invalid__") return;
    if (x !== undefined) integrationPayload.providerMembershipStandardUsd = x;
  }
  if (raw.providerMembershipGoldUsd !== undefined) {
    const x = parseUsdMoneyField("Gold üyelik (USD)", raw.providerMembershipGoldUsd);
    if (x === "__invalid__") return;
    if (x !== undefined) integrationPayload.providerMembershipGoldUsd = x;
  }
  if (raw.providerMembershipPremiumPerBusinessUsd !== undefined) {
    const x = parseUsdMoneyField("Premium işletme başı (USD)", raw.providerMembershipPremiumPerBusinessUsd);
    if (x === "__invalid__") return;
    if (x !== undefined) integrationPayload.providerMembershipPremiumPerBusinessUsd = x;
  }
  if (raw.usdTryRate !== undefined) {
    const s = String(raw.usdTryRate).trim().replace(/\s/g, "").replace(",", ".");
    if (s === "") {
      integrationPayload.usdTryRate = null;
      integrationPayload.usdTryUpdatedAt = null;
    } else {
      const n = parseFloat(s);
      if (!Number.isFinite(n) || n <= 0 || n > 9999) {
        res.status(400).json({ error: "usdTryRate geçersiz" });
        return;
      }
      integrationPayload.usdTryRate = String(Math.round(n * 1e6) / 1e6);
      integrationPayload.usdTryUpdatedAt = new Date();
    }
  }

  if (payload.homeRecentBusinessLimit !== undefined && payload.homeRecentBusinessLimit != null) {
    const n = Math.floor(Number(payload.homeRecentBusinessLimit));
    if (!Number.isFinite(n) || n < 5 || n > 30) {
      res.status(400).json({ error: "homeRecentBusinessLimit 5 ile 30 arasında olmalıdır" });
      return;
    }
    payload = { ...payload, homeRecentBusinessLimit: n };
  }
  const bankAccountHolder = raw.bankAccountHolder == null ? undefined : String(raw.bankAccountHolder).trim();
  const bankIban = raw.bankIban == null ? undefined : String(raw.bankIban).trim().toUpperCase();
  const bankNameBranch = raw.bankNameBranch == null ? undefined : String(raw.bankNameBranch).trim();
  const bankAccountNumber = raw.bankAccountNumber == null ? undefined : String(raw.bankAccountNumber).trim();
  const bankPayload: Partial<typeof siteSettingsTable.$inferInsert> = {};
  if (bankAccountHolder !== undefined) {
    if (bankAccountHolder.length > 200) {
      res.status(400).json({ error: "bankAccountHolder çok uzun" });
      return;
    }
    bankPayload.bankAccountHolder = bankAccountHolder === "" ? null : bankAccountHolder;
  }
  if (bankIban !== undefined) {
    if (bankIban.length > 64) {
      res.status(400).json({ error: "bankIban çok uzun" });
      return;
    }
    bankPayload.bankIban = bankIban === "" ? null : bankIban;
  }
  if (bankNameBranch !== undefined) {
    if (bankNameBranch.length > 200) {
      res.status(400).json({ error: "bankNameBranch çok uzun" });
      return;
    }
    bankPayload.bankNameBranch = bankNameBranch === "" ? null : bankNameBranch;
  }
  if (bankAccountNumber !== undefined) {
    if (bankAccountNumber.length > 64) {
      res.status(400).json({ error: "bankAccountNumber çok uzun" });
      return;
    }
    bankPayload.bankAccountNumber = bankAccountNumber === "" ? null : bankAccountNumber;
  }
  if (raw.seoVerification !== undefined) {
    const seoVerification = normalizeSeoVerification(raw.seoVerification);
    integrationPayload.verificationJson = serializeSeoVerificationJson(seoVerification);
  }
  const current = await getOrCreate();
  const [row] = await db
    .update(siteSettingsTable)
    .set({ ...payload, ...integrationPayload, ...bankPayload })
    .where(eq(siteSettingsTable.id, current.id))
    .returning();
  if ("travelpayoutsApiToken" in integrationPayload || "travelpayoutsMarker" in integrationPayload) {
    clearTravelpayoutsConfigCache();
  }
  res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  res.json(serializeSettings(row));
});

export default router;
