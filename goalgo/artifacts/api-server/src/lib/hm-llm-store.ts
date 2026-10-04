import { eq, isNull, sql } from "drizzle-orm";
import {
  aiSettingsTable,
  db,
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmLlmProviderKeysTable,
  hmNewsSitesTable,
  newsDb,
  siteSettingsTable,
  type HmLlmProviderKeyRow,
} from "@workspace/db";
import { isCorporateHmSiteRow } from "./hm-yekpare-news-sync.js";
import {
  buildLlmAttempts,
  defaultLlmModel,
  emptyProviderPublic,
  isLlmProviderId,
  isMaskedKeyPlaceholder,
  last4OfApiKey,
  LLM_PROVIDER_IDS,
  statusFromOwnKeys,
  toProviderPublic,
  type LlmAttempt,
  type LlmChainRow,
  type LlmProviderId,
  type LlmProviderPublic,
} from "./hm-llm-catalog.js";
import { decryptLlmApiKey, encryptLlmApiKey, hmLlmKeySecret, isPlaintextLlmStorage } from "./hm-llm-crypto.js";

/**
 * Tablo: hm_llm_provider_keys (Neon, hm_news_sites ile aynı veritabanı).
 * site_id NULL = Haber Merkezi global. Çözüm sırası: site → global → env.
 * Ayrıntı: hm-llm-crypto.ts (HM_LLM_KEY_SECRET).
 */

export type LlmProviderPatch = {
  provider: LlmProviderId;
  enabled?: boolean;
  model?: string;
  priority?: number;
  apiKey?: string;
  clearKey?: boolean;
};

let ensurePromise: Promise<void> | null = null;
let plaintextUpgrade: Promise<void> | null = null;

const STALE_EMPTY_MODELS: Record<LlmProviderId, readonly string[]> = {
  evren: ["auto"],
  nvidia: ["meta/llama-3.1-8b-instruct"],
  gemini: ["gemini-2.0-flash-lite"],
  openai: ["gpt-4o-mini"],
};

const DDL = sql`
  CREATE TABLE IF NOT EXISTS hm_llm_provider_keys (
    id serial PRIMARY KEY,
    site_id integer,
    provider text NOT NULL,
    api_key_enc text NOT NULL DEFAULT '',
    api_key_last4 text NOT NULL DEFAULT '',
    enabled boolean NOT NULL DEFAULT true,
    model text NOT NULL DEFAULT '',
    priority integer NOT NULL DEFAULT 100,
    usage_count integer NOT NULL DEFAULT 0,
    last_used_at timestamptz,
    last_error text,
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`;

const DDL_DROP_FK = sql`
  ALTER TABLE hm_llm_provider_keys DROP CONSTRAINT IF EXISTS hm_llm_provider_keys_site_id_fkey
`;

const DDL_INDEX = sql`
  CREATE UNIQUE INDEX IF NOT EXISTS hm_llm_provider_keys_scope_provider_uidx
    ON hm_llm_provider_keys ((COALESCE(site_id, 0)), provider)
`;

async function execDdl(database: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> }): Promise<void> {
  await database.execute(DDL);
  await database.execute(DDL_DROP_FK);
  await database.execute(DDL_INDEX);
}

export function ensureHmLlmProviderKeysTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await execDdl(db);
      if (newsDb) {
        try {
          await execDdl(newsDb);
        } catch (err) {
          console.error("[hm-llm] haber DB tablo hazırlığı başarısız:", err instanceof Error ? err.message : err);
        }
      }
      await seedGlobalDefaults();
      await copyLegacyGlobalKeysIfEmpty();
      await refreshEmptyDefaultModels();
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise.then(() => upgradePlaintextKeys());
}

function readDb() {
  return getNewsDbForRead();
}

async function selectScope(siteId: number | null): Promise<HmLlmProviderKeyRow[]> {
  const where = siteId == null ? isNull(hmLlmProviderKeysTable.siteId) : eq(hmLlmProviderKeysTable.siteId, siteId);
  return readDb().select().from(hmLlmProviderKeysTable).where(where);
}

async function seedGlobalDefaults(): Promise<void> {
  const existing = await selectScope(null);
  const have = new Set(existing.map((r) => r.provider));
  for (const provider of LLM_PROVIDER_IDS) {
    if (have.has(provider)) continue;
    await dualWriteInsert(hmLlmProviderKeysTable, {
      siteId: null,
      provider,
      apiKeyEnc: "",
      apiKeyLast4: "",
      enabled: true,
      model: defaultLlmModel(provider),
      priority: emptyProviderPublic(provider).priority,
      usageCount: 0,
    });
  }
}

async function readLegacyOpenAi(): Promise<{ key: string; model: string }> {
  const [ai] = await db
    .select({ key: aiSettingsTable.openaiApiKey, model: aiSettingsTable.openaiModel })
    .from(aiSettingsTable)
    .limit(1);
  const [site] = await db
    .select({ key: siteSettingsTable.openaiApiKey, model: siteSettingsTable.openaiModel })
    .from(siteSettingsTable)
    .limit(1);
  const key = String(ai?.key ?? "").trim() || String(site?.key ?? "").trim();
  const model = String(ai?.model ?? "").trim() || String(site?.model ?? "").trim() || defaultLlmModel("openai");
  return { key, model };
}

async function readLegacyGemini(): Promise<string> {
  const [site] = await db
    .select({ key: siteSettingsTable.geminiApiKey })
    .from(siteSettingsTable)
    .limit(1);
  return String(site?.key ?? "").trim();
}

async function copyLegacyGlobalKeysIfEmpty(): Promise<void> {
  const rows = await selectScope(null);
  const openai = rows.find((r) => r.provider === "openai");
  const gemini = rows.find((r) => r.provider === "gemini");
  if (openai && !String(openai.apiKeyEnc ?? "").trim()) {
    const legacy = await readLegacyOpenAi();
    if (legacy.key) {
      await writeKeyMaterial(openai.id, legacy.key, legacy.model);
    }
  }
  if (gemini && !String(gemini.apiKeyEnc ?? "").trim()) {
    const key = await readLegacyGemini();
    if (key) await writeKeyMaterial(gemini.id, key, gemini.model || defaultLlmModel("gemini"));
  }
}

async function writeKeyMaterial(id: number, plaintext: string, model?: string): Promise<void> {
  const key = plaintext.trim();
  await dualWriteUpdate(
    hmLlmProviderKeysTable,
    {
      apiKeyEnc: key ? encryptLlmApiKey(key) : "",
      apiKeyLast4: last4OfApiKey(key),
      ...(model ? { model } : {}),
      ...(key ? { enabled: true } : {}),
      updatedAt: new Date(),
    },
    eq(hmLlmProviderKeysTable.id, id),
  );
}

async function refreshEmptyDefaultModels(): Promise<void> {
  const rows = await readDb().select().from(hmLlmProviderKeysTable);
  for (const row of rows) {
    if (!isLlmProviderId(row.provider)) continue;
    if (String(row.apiKeyEnc ?? "").trim()) continue;
    const current = String(row.model ?? "").trim();
    const next = defaultLlmModel(row.provider);
    if (current === next) continue;
    if (current && !STALE_EMPTY_MODELS[row.provider].includes(current)) continue;
    await dualWriteUpdate(
      hmLlmProviderKeysTable,
      { model: next, updatedAt: new Date() },
      eq(hmLlmProviderKeysTable.id, row.id),
    );
  }
}

async function upgradePlaintextKeys(): Promise<void> {
  if (!hmLlmKeySecret()) return;
  if (plaintextUpgrade) return plaintextUpgrade;
  plaintextUpgrade = (async () => {
    const rows = await readDb().select().from(hmLlmProviderKeysTable);
    for (const row of rows) {
      if (!isPlaintextLlmStorage(row.apiKeyEnc)) continue;
      const plain = decryptLlmApiKey(row.apiKeyEnc);
      if (!plain) continue;
      await dualWriteUpdate(
        hmLlmProviderKeysTable,
        { apiKeyEnc: encryptLlmApiKey(plain), updatedAt: new Date() },
        eq(hmLlmProviderKeysTable.id, row.id),
      );
    }
  })().catch((err) => {
    plaintextUpgrade = null;
    throw err;
  });
  return plaintextUpgrade;
}

function rowHasKey(row: HmLlmProviderKeyRow | undefined): boolean {
  return Boolean(String(row?.apiKeyEnc ?? "").trim());
}

function publicFromRows(rows: HmLlmProviderKeyRow[]): LlmProviderPublic[] {
  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  return LLM_PROVIDER_IDS.map((provider) => {
    const row = byProvider.get(provider);
    if (!row || !isLlmProviderId(row.provider)) return emptyProviderPublic(provider);
    return toProviderPublic({
      provider,
      enabled: row.enabled,
      model: row.model,
      priority: row.priority,
      apiKeyLast4: row.apiKeyLast4,
      hasKey: rowHasKey(row),
      usageCount: row.usageCount,
    });
  });
}

export async function listLlmProvidersPublic(siteId: number | null): Promise<{
  providers: LlmProviderPublic[];
  status?: "own" | "merkez";
  statusText?: string;
}> {
  await ensureHmLlmProviderKeysTable();
  const rows = await selectScope(siteId);
  const providers = publicFromRows(rows);
  if (siteId == null) return { providers };
  const hasOwn = providers.some((p) => p.enabled && p.hasKey);
  return { providers, ...statusFromOwnKeys(hasOwn) };
}

export async function hmSiteIsCorporate(siteId: number): Promise<boolean> {
  const [row] = await readDb()
    .select({ layoutJson: hmNewsSitesTable.layoutJson })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.id, siteId))
    .limit(1);
  if (!row) return false;
  return isCorporateHmSiteRow({ layoutJson: row.layoutJson });
}

function assertPatch(raw: LlmProviderPatch): string | null {
  if (!isLlmProviderId(raw.provider)) return "Geçersiz sağlayıcı";
  if (raw.model != null && String(raw.model).trim().length > 120) return "Model adı çok uzun";
  if (raw.priority != null && (!Number.isFinite(raw.priority) || raw.priority < 1 || raw.priority > 999)) {
    return "Öncelik 1 ile 999 arasında olmalı";
  }
  if (raw.apiKey != null && !isMaskedKeyPlaceholder(raw.apiKey) && raw.apiKey.trim() && raw.apiKey.trim().length > 512) {
    return "API anahtarı çok uzun";
  }
  if (raw.apiKey != null && !isMaskedKeyPlaceholder(raw.apiKey) && raw.apiKey.trim() && raw.apiKey.trim().length < 8) {
    return "API anahtarı çok kısa";
  }
  return null;
}

async function upsertScopeRow(siteId: number | null, provider: LlmProviderId): Promise<HmLlmProviderKeyRow> {
  const rows = await selectScope(siteId);
  const found = rows.find((r) => r.provider === provider);
  if (found) return found;
  const [created] = await dualWriteInsert(hmLlmProviderKeysTable, {
    siteId,
    provider,
    apiKeyEnc: "",
    apiKeyLast4: "",
    enabled: true,
    model: defaultLlmModel(provider),
    priority: emptyProviderPublic(provider).priority,
    usageCount: 0,
  });
  return created;
}

async function mirrorGlobalToLegacy(provider: LlmProviderId, plaintext: string | null, model?: string): Promise<void> {
  if (provider === "openai") {
    const openaiApiKey = plaintext ?? "";
    const [ai] = await db.select({ id: aiSettingsTable.id }).from(aiSettingsTable).limit(1);
    if (ai) {
      await db
        .update(aiSettingsTable)
        .set({
          openaiApiKey,
          ...(model ? { openaiModel: model } : {}),
          updatedAt: new Date(),
        })
        .where(eq(aiSettingsTable.id, ai.id));
    }
    const [site] = await db.select({ id: siteSettingsTable.id }).from(siteSettingsTable).limit(1);
    if (site) {
      await db
        .update(siteSettingsTable)
        .set({
          openaiApiKey,
          ...(model ? { openaiModel: model } : {}),
        })
        .where(eq(siteSettingsTable.id, site.id));
    }
  }
  if (provider === "gemini" && plaintext !== undefined) {
    const [site] = await db.select({ id: siteSettingsTable.id }).from(siteSettingsTable).limit(1);
    if (site) {
      await db
        .update(siteSettingsTable)
        .set({ geminiApiKey: plaintext ?? "" })
        .where(eq(siteSettingsTable.id, site.id));
    }
  }
}

export async function saveLlmProviders(siteId: number | null, patches: LlmProviderPatch[]): Promise<string | null> {
  await ensureHmLlmProviderKeysTable();
  for (const patch of patches) {
    const err = assertPatch(patch);
    if (err) return err;
  }
  for (const patch of patches) {
    const row = await upsertScopeRow(siteId, patch.provider);
    const next: Partial<HmLlmProviderKeyRow> = { updatedAt: new Date() };
    if (typeof patch.enabled === "boolean") next.enabled = patch.enabled;
    if (patch.model != null && String(patch.model).trim()) next.model = String(patch.model).trim();
    if (patch.priority != null) next.priority = Math.trunc(patch.priority);
    let mirrored: string | null | undefined;
    if (patch.clearKey) {
      next.apiKeyEnc = "";
      next.apiKeyLast4 = "";
      mirrored = null;
    } else if (patch.apiKey != null && !isMaskedKeyPlaceholder(patch.apiKey) && patch.apiKey.trim()) {
      const key = patch.apiKey.trim();
      next.apiKeyEnc = encryptLlmApiKey(key);
      next.apiKeyLast4 = last4OfApiKey(key);
      mirrored = key;
    }
    await dualWriteUpdate(hmLlmProviderKeysTable, next, eq(hmLlmProviderKeysTable.id, row.id));
    if (siteId == null && mirrored !== undefined && (patch.provider === "openai" || patch.provider === "gemini")) {
      await mirrorGlobalToLegacy(patch.provider, mirrored, next.model ?? undefined);
    }
  }
  return null;
}

/** Eski Genel Ayarlar / AI Ayarları kaydı yeni global satıra işlenir. */
export async function syncLegacyGlobalFromSettings(input: {
  openaiApiKey?: string | null;
  openaiModel?: string | null;
  geminiApiKey?: string | null;
}): Promise<void> {
  try {
    await ensureHmLlmProviderKeysTable();
    if (input.openaiApiKey !== undefined || input.openaiModel) {
      const row = await upsertScopeRow(null, "openai");
      const patch: Partial<HmLlmProviderKeyRow> = { updatedAt: new Date() };
      if (input.openaiApiKey !== undefined) {
        const key = String(input.openaiApiKey ?? "").trim();
        patch.apiKeyEnc = key ? encryptLlmApiKey(key) : "";
        patch.apiKeyLast4 = last4OfApiKey(key);
        if (key) patch.enabled = true;
      }
      if (input.openaiModel && String(input.openaiModel).trim()) patch.model = String(input.openaiModel).trim();
      await dualWriteUpdate(hmLlmProviderKeysTable, patch, eq(hmLlmProviderKeysTable.id, row.id));
    }
    if (input.geminiApiKey !== undefined) {
      const row = await upsertScopeRow(null, "gemini");
      const key = String(input.geminiApiKey ?? "").trim();
      await dualWriteUpdate(
        hmLlmProviderKeysTable,
        {
          apiKeyEnc: key ? encryptLlmApiKey(key) : "",
          apiKeyLast4: last4OfApiKey(key),
          enabled: key ? true : row.enabled,
          updatedAt: new Date(),
        },
        eq(hmLlmProviderKeysTable.id, row.id),
      );
    }
  } catch (err) {
    console.error("[hm-llm] eski anahtar senkronu başarısız:", err instanceof Error ? err.message : err);
  }
}

export async function listOwnLlmProviderNamesBySite(): Promise<Map<number, string[]>> {
  await ensureHmLlmProviderKeysTable();
  const rows = await readDb()
    .select({
      siteId: hmLlmProviderKeysTable.siteId,
      provider: hmLlmProviderKeysTable.provider,
      apiKeyEnc: hmLlmProviderKeysTable.apiKeyEnc,
    })
    .from(hmLlmProviderKeysTable)
    .where(sql`${hmLlmProviderKeysTable.siteId} IS NOT NULL`);
  const map = new Map<number, string[]>();
  for (const row of rows) {
    if (row.siteId == null || !isLlmProviderId(row.provider) || !String(row.apiKeyEnc ?? "").trim()) continue;
    const list = map.get(row.siteId) ?? [];
    list.push(row.provider);
    map.set(row.siteId, list);
  }
  return map;
}

function envChainRows(): LlmChainRow[] {
  const pick = (...names: string[]) => {
    for (const name of names) {
      const value = String(process.env[name] ?? "").trim();
      if (value) return value;
    }
    return "";
  };
  const specs: Array<{ provider: LlmProviderId; key: string; model: string; priority: number }> = [
    {
      provider: "evren",
      key: pick("EVREN_LLM_API_KEY", "EVREN_API_KEY"),
      model: pick("EVREN_MODEL") || defaultLlmModel("evren"),
      priority: 10,
    },
    {
      provider: "nvidia",
      key: pick("NVIDIA_API_KEY", "NVIDIA_NIM_API_KEY"),
      model: pick("NVIDIA_MODEL") || defaultLlmModel("nvidia"),
      priority: 20,
    },
    {
      provider: "gemini",
      key: pick("GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY", "GOOGLE_API_KEY"),
      model: pick("GEMINI_MODEL", "GOOGLE_GEMINI_MODEL") || defaultLlmModel("gemini"),
      priority: 30,
    },
    {
      provider: "openai",
      key: pick("OPENAI_API_KEY"),
      model: pick("OPENAI_MODEL") || defaultLlmModel("openai"),
      priority: 40,
    },
  ];
  return specs.map((s) => ({
    id: null,
    provider: s.provider,
    apiKey: s.key,
    model: s.model,
    enabled: true,
    priority: s.priority,
  }));
}

function decryptRows(rows: HmLlmProviderKeyRow[]): LlmChainRow[] {
  return rows.flatMap((row) => {
    if (!isLlmProviderId(row.provider)) return [];
    return [
      {
        id: row.id,
        provider: row.provider,
        apiKey: decryptLlmApiKey(row.apiKeyEnc),
        model: row.model || defaultLlmModel(row.provider),
        enabled: row.enabled,
        priority: row.priority,
      },
    ];
  });
}

async function withLegacyGlobal(rows: LlmChainRow[]): Promise<LlmChainRow[]> {
  const next = [...rows];
  const openai = next.find((r) => r.provider === "openai");
  if (!openai?.apiKey) {
    const legacy = await readLegacyOpenAi();
    if (legacy.key) {
      if (openai) {
        openai.apiKey = legacy.key;
        if (!openai.model) openai.model = legacy.model;
      } else {
        next.push({
          id: null,
          provider: "openai",
          apiKey: legacy.key,
          model: legacy.model,
          enabled: true,
          priority: 40,
        });
      }
    }
  }
  const gemini = next.find((r) => r.provider === "gemini");
  if (!gemini?.apiKey) {
    const key = await readLegacyGemini();
    if (key) {
      if (gemini) gemini.apiKey = key;
      else {
        next.push({
          id: null,
          provider: "gemini",
          apiKey: key,
          model: defaultLlmModel("gemini"),
          enabled: true,
          priority: 30,
        });
      }
    }
  }
  return next;
}

export async function resolveLlmAttempts(siteId: number | null): Promise<LlmAttempt[]> {
  await ensureHmLlmProviderKeysTable();
  const siteRows = siteId != null ? decryptRows(await selectScope(siteId)) : [];
  const globalRows = await withLegacyGlobal(decryptRows(await selectScope(null)));
  return buildLlmAttempts({ site: siteRows, global: globalRows, env: envChainRows() });
}

export async function recordLlmAttempt(rowId: number | null, ok: boolean, errorMessage?: string): Promise<void> {
  if (rowId == null) return;
  const [row] = await readDb()
    .select({ usageCount: hmLlmProviderKeysTable.usageCount })
    .from(hmLlmProviderKeysTable)
    .where(eq(hmLlmProviderKeysTable.id, rowId))
    .limit(1);
  if (!row) return;
  const scrubbed = String(errorMessage ?? "").replace(/sk-[A-Za-z0-9_\-]+/g, "••••").slice(0, 240);
  await dualWriteUpdate(
    hmLlmProviderKeysTable,
    {
      usageCount: ok ? (row.usageCount ?? 0) + 1 : row.usageCount,
      lastUsedAt: ok ? new Date() : undefined,
      lastError: ok ? null : scrubbed || null,
      updatedAt: new Date(),
    },
    eq(hmLlmProviderKeysTable.id, rowId),
  );
}

/** Test çağrısı: yalnızca bu kapsamın kayıtlı anahtarı. Merkez anahtarı site testine karışmaz. */
export async function resolveStoredKeyForTest(
  siteId: number | null,
  provider: LlmProviderId,
): Promise<{ apiKey: string; model: string } | null> {
  await ensureHmLlmProviderKeysTable();
  const rows = decryptRows(await selectScope(siteId));
  let row = rows.find((r) => r.provider === provider && r.apiKey);
  if (!row && siteId == null) {
    const legacy = await withLegacyGlobal(rows);
    row = legacy.find((r) => r.provider === provider && r.apiKey);
  }
  if (!row?.apiKey) return null;
  return { apiKey: row.apiKey, model: row.model || defaultLlmModel(provider) };
}
