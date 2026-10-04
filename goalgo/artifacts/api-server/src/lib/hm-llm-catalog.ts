/**
 * Saf LLM sağlayıcı kataloğu ve çağrı sırası.
 * GET API'leri anahtarın tamamını döndürmez; yalnızca son 4 karakter maskelenir.
 */

export const LLM_PROVIDER_IDS = ["evren", "nvidia", "gemini", "openai"] as const;
export type LlmProviderId = (typeof LLM_PROVIDER_IDS)[number];
export type LlmKeyScope = "site" | "global" | "env";

export type LlmProviderPublic = {
  provider: LlmProviderId;
  label: string;
  description: string;
  enabled: boolean;
  model: string;
  priority: number;
  hasKey: boolean;
  keyLast4: string;
  keyMasked: string;
  usageCount: number;
};

export type LlmChainRow = {
  id: number | null;
  provider: LlmProviderId;
  apiKey: string;
  model: string;
  enabled: boolean;
  priority: number;
};

export type LlmAttempt = {
  provider: LlmProviderId;
  apiKey: string;
  model: string;
  scope: LlmKeyScope;
  rowId: number | null;
};

const CATALOG: Record<
  LlmProviderId,
  { label: string; description: string; model: string; priority: number }
> = {
  evren: {
    label: "Evren",
    description: "Yerli Evren LLM geçidi. Varsayılan model auto (Evren seçer).",
    model: "auto",
    priority: 10,
  },
  nvidia: {
    label: "NVIDIA NIM",
    description: "Küçük ücretsiz instruct modeli. Varsayılan: meta/llama-3.1-8b-instruct.",
    model: "meta/llama-3.1-8b-instruct",
    priority: 20,
  },
  gemini: {
    label: "Google Gemini",
    description: "Ucuz Flash-Lite modeli. Varsayılan: gemini-2.0-flash-lite.",
    model: "gemini-2.0-flash-lite",
    priority: 30,
  },
  openai: {
    label: "OpenAI",
    description: "Ucuz mini model. Varsayılan: gpt-4o-mini.",
    model: "gpt-4o-mini",
    priority: 40,
  },
};

export function isLlmProviderId(value: unknown): value is LlmProviderId {
  return typeof value === "string" && (LLM_PROVIDER_IDS as readonly string[]).includes(value);
}

export function llmCatalog(provider: LlmProviderId) {
  return CATALOG[provider];
}

export function defaultLlmModel(provider: LlmProviderId): string {
  return CATALOG[provider].model;
}

export function last4OfApiKey(key: string): string {
  const t = String(key ?? "").trim();
  if (!t) return "";
  return t.slice(-4);
}

/** Arayüzde yalnızca son 4 karakter. Tam anahtar dönülmez. */
export function maskApiKeyLast4(last4: string): string {
  const t = String(last4 ?? "").trim();
  if (!t) return "";
  return `••••${t.slice(-4)}`;
}

export function isMaskedKeyPlaceholder(value: string): boolean {
  const t = String(value ?? "").trim();
  if (!t) return false;
  if (t.includes("•") || t.includes("*")) return true;
  if (t === "****" || t === "***" || t === "***configured***") return true;
  return false;
}

export function emptyProviderPublic(provider: LlmProviderId): LlmProviderPublic {
  const c = CATALOG[provider];
  return {
    provider,
    label: c.label,
    description: c.description,
    enabled: true,
    model: c.model,
    priority: c.priority,
    hasKey: false,
    keyLast4: "",
    keyMasked: "",
    usageCount: 0,
  };
}

export function toProviderPublic(row: {
  provider: LlmProviderId;
  enabled: boolean;
  model: string;
  priority: number;
  apiKeyLast4: string;
  hasKey: boolean;
  usageCount: number;
}): LlmProviderPublic {
  const base = emptyProviderPublic(row.provider);
  const last4 = String(row.apiKeyLast4 ?? "").trim().slice(-4);
  return {
    ...base,
    enabled: row.enabled,
    model: String(row.model ?? "").trim() || base.model,
    priority: Number.isFinite(row.priority) ? row.priority : base.priority,
    hasKey: row.hasKey,
    keyLast4: row.hasKey ? last4 : "",
    keyMasked: row.hasKey ? maskApiKeyLast4(last4) : "",
    usageCount: Math.max(0, Number(row.usageCount) || 0),
  };
}

/**
 * Çağrı sırası: önce sitenin kendi anahtarları (öncelik),
 * site anahtarı yoksa veya çağrı başarısızsa merkez, sonra ortam değişkeni.
 * Aynı sağlayıcı + aynı anahtar ikinci kez denenmez.
 */
export function buildLlmAttempts(input: {
  site: LlmChainRow[];
  global: LlmChainRow[];
  env: LlmChainRow[];
}): LlmAttempt[] {
  const out: LlmAttempt[] = [];
  const seen = new Set<string>();
  const push = (rows: LlmChainRow[], scope: LlmKeyScope) => {
    const ordered = [...rows]
      .filter((r) => r.enabled && String(r.apiKey ?? "").trim())
      .sort((a, b) => a.priority - b.priority || a.provider.localeCompare(b.provider));
    for (const row of ordered) {
      const key = String(row.apiKey).trim();
      const dedupe = `${row.provider}:${key}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      out.push({
        provider: row.provider,
        apiKey: key,
        model: String(row.model ?? "").trim() || defaultLlmModel(row.provider),
        scope,
        rowId: row.id,
      });
    }
  };
  push(input.site, "site");
  push(input.global, "global");
  push(
    input.env.map((row) => ({ ...row, enabled: true })),
    "env",
  );
  return out;
}

export function statusFromOwnKeys(hasOwnEnabledKey: boolean): {
  status: "own" | "merkez";
  statusText: string;
} {
  if (hasOwnEnabledKey) {
    return { status: "own", statusText: "Kendi API anahtarınız kullanılıyor" };
  }
  return { status: "merkez", statusText: "Merkez API kullanılıyor" };
}
