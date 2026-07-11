import { db, siteSettingsTable } from "@workspace/db";

export type ChatProvider = "openai" | "gemini" | "deepseek";
export type PreferredChatProvider = ChatProvider | "auto";

const DEFAULT_DEEPSEEK_MODEL =
  (process.env.DEEPSEEK_MODEL ?? "deepseek-chat").trim() || "deepseek-chat";

export type ChatCallResult = {
  text: string | null;
  provider: ChatProvider | null;
  httpStatus: number;
  detail?: string;
  /** OpenAI kota / faturalama hatası sonrası Gemini denendi mi */
  geminiFallbackAttempted?: boolean;
};

export const DEFAULT_GEMINI_MODEL =
  (process.env.GEMINI_MODEL ?? process.env.GOOGLE_GEMINI_MODEL ?? "gemini-3.1-flash-lite").trim() ||
  "gemini-3.1-flash-lite";

const GEMINI_MODEL_FALLBACKS = [
  DEFAULT_GEMINI_MODEL,
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
].filter((m, i, a) => m && a.indexOf(m) === i);

/** Genel Ayarlar / site_settings alanından gelen anahtarı normalize eder. */
export function normalizeGeminiApiKey(raw: string | null | undefined): string {
  let k = String(raw ?? "").trim();
  if (/^bearer\s+/i.test(k)) k = k.replace(/^bearer\s+/i, "").trim();
  return k;
}

function isGeminiModelNotFound(httpStatus: number, detail?: string): boolean {
  if (httpStatus === 404) return true;
  const d = String(detail ?? "").toLowerCase();
  return (
    d.includes("not found") ||
    d.includes("not_found") ||
    d.includes("is not supported") ||
    d.includes("does not exist") ||
    d.includes("unknown model") ||
    d.includes("invalid model") ||
    d.includes("model not found")
  );
}

function isGeminiKeyOrPermissionError(httpStatus: number, detail?: string): boolean {
  if ([401, 403].includes(httpStatus)) return true;
  const d = String(detail ?? "").toLowerCase();
  return (
    d.includes("api key not valid") ||
    d.includes("api_key_invalid") ||
    d.includes("invalid api key") ||
    d.includes("permission denied") ||
    (d.includes("api") && d.includes("key") && d.includes("invalid")) ||
    (d.includes("generative language api") && (d.includes("disabled") || d.includes("not enabled")))
  );
}

function shouldTryNextGeminiModel(httpStatus: number, detail?: string): boolean {
  if (isGeminiKeyOrPermissionError(httpStatus, detail)) return false;
  return isGeminiModelNotFound(httpStatus, detail);
}

/** OpenAI+Gemini birleşik detail satırından Gemini kısmını çıkarır (toast / RSS). */
export function extractGeminiDetailFromChatFailure(detail?: string): string | null {
  const raw = String(detail ?? "").trim();
  if (!raw) return null;
  const m = raw.match(/Gemini:\s*(.+)$/i);
  if (m?.[1]) return m[1].trim();
  if (/^gemini\//i.test(raw)) return raw;
  return null;
}

/** RSS / konu hata mesajında Gemini ayrıntısını öne alır. */
export function formatQuotaFallbackUserError(opts: {
  aiSkipped?: number;
  combinedDetail?: string;
}): string {
  const skipped =
    typeof opts.aiSkipped === "number" && opts.aiSkipped > 0
      ? ` (${opts.aiSkipped} madde atlandı)`
      : "";
  const geminiPart = extractGeminiDetailFromChatFailure(opts.combinedDetail);
  if (geminiPart) {
    return `OpenAI kotası doldu; Gemini de yanıt vermedi${skipped}. Gemini: ${geminiPart.slice(0, 280)}`;
  }
  const tail = opts.combinedDetail ? ` ${opts.combinedDetail.slice(0, 200)}` : "";
  return `OpenAI kotası doldu; Gemini de yanıt vermedi${skipped}.${tail}`;
}

export type GeminiKeySource = "site_settings" | "env" | null;

export type SiteIntegrationKeys = {
  geminiApiKey: string | null;
  geminiApiKeySource: GeminiKeySource;
  deepseekApiKey: string | null;
  openaiApiKey: string | null;
  openaiModel: string | null;
};

/** Gemini anahtarını DB veya ortam değişkeninden çözümler (Yekpare AI / RSS yedek). */
export function resolveGeminiApiKey(siteDbValue: string | null | undefined): {
  key: string | null;
  source: GeminiKeySource;
} {
  const fromDb = normalizeGeminiApiKey(siteDbValue);
  if (fromDb) return { key: fromDb, source: "site_settings" };
  const fromEnv = normalizeGeminiApiKey(
    process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_API_KEY ??
      process.env.GOOGLE_GEMINI_API_KEY ??
      "",
  );
  if (fromEnv) return { key: fromEnv, source: "env" };
  return { key: null, source: null };
}

export function maskGeminiKeyHint(key: string | null | undefined): string | null {
  const v = String(key ?? "").trim();
  if (!v) return null;
  if (v.length <= 8) return "****";
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

export async function getSiteIntegrationKeys(): Promise<SiteIntegrationKeys> {
  const [row] = await db
    .select({
      geminiApiKey: siteSettingsTable.geminiApiKey,
      deepseekApiKey: siteSettingsTable.deepseekApiKey,
      openaiApiKey: siteSettingsTable.openaiApiKey,
      openaiModel: siteSettingsTable.openaiModel,
    })
    .from(siteSettingsTable)
    .limit(1);
  const geminiResolved = resolveGeminiApiKey(row?.geminiApiKey);
  const deepseek = String(row?.deepseekApiKey ?? "").trim();
  const openai = String(row?.openaiApiKey ?? "").trim();
  const openaiModel = String(row?.openaiModel ?? "").trim();
  return {
    geminiApiKey: geminiResolved.key,
    geminiApiKeySource: geminiResolved.source,
    deepseekApiKey: deepseek || null,
    openaiApiKey: openai || null,
    openaiModel: openaiModel || null,
  };
}

export function normalizePreferredProvider(raw: string | null | undefined): PreferredChatProvider {
  const v = String(raw ?? "auto").trim().toLowerCase();
  if (v === "openai" || v === "gemini" || v === "deepseek") return v;
  return "auto";
}

export type MergedChatKeys = {
  openaiApiKey: string | null;
  openaiModel: string;
  geminiApiKey: string | null;
  deepseekApiKey: string | null;
  preferredProvider: PreferredChatProvider;
};

/** AI İçerik Robotu + Genel Ayarlar anahtarlarını birleştirir. */
export function mergeChatKeysFromAiAndSite(
  ai: { openaiApiKey?: string | null; openaiModel?: string | null; preferredProvider?: string | null },
  site: SiteIntegrationKeys,
): MergedChatKeys {
  const openaiApiKey = (String(ai.openaiApiKey ?? "").trim() || site.openaiApiKey) || null;
  const openaiModel =
    (String(ai.openaiModel ?? "").trim() || site.openaiModel || "gpt-4o-mini").trim() || "gpt-4o-mini";
  return {
    openaiApiKey,
    openaiModel,
    geminiApiKey: site.geminiApiKey,
    deepseekApiKey: site.deepseekApiKey,
    preferredProvider: normalizePreferredProvider(ai.preferredProvider),
  };
}

export function hasAnyChatApiKey(keys: {
  openaiApiKey: string | null;
  geminiApiKey: string | null;
  deepseekApiKey?: string | null;
}): boolean {
  return !!(keys.openaiApiKey || keys.geminiApiKey || keys.deepseekApiKey);
}

export function hasChatApiKeyForProvider(
  keys: { openaiApiKey: string | null; geminiApiKey: string | null; deepseekApiKey: string | null },
  provider: PreferredChatProvider,
): boolean {
  if (provider === "openai") return !!keys.openaiApiKey;
  if (provider === "gemini") return !!keys.geminiApiKey;
  if (provider === "deepseek") return !!keys.deepseekApiKey;
  return hasAnyChatApiKey(keys);
}

const PROVIDER_LABELS: Record<ChatProvider, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  deepseek: "DeepSeek",
};

export function missingProviderKeyMessage(provider: PreferredChatProvider): string {
  if (provider === "openai") {
    return "OpenAI API anahtarı girilmemiş. AI Ayarları veya Genel Ayarlar → Entegrasyonlar → OpenAI.";
  }
  if (provider === "gemini") {
    return "Gemini API anahtarı girilmemiş. Genel Ayarlar → Entegrasyonlar → Yapay zekâ → Google Gemini.";
  }
  if (provider === "deepseek") {
    return "DeepSeek API anahtarı girilmemiş. Genel Ayarlar → Entegrasyonlar → Yapay zekâ → DeepSeek.";
  }
  return "OpenAI veya Gemini API anahtarı girilmemiş. AI Ayarları veya Genel Ayarlar → Yapay zekâ.";
}

export function formatProviderChatFailure(
  provider: ChatProvider | PreferredChatProvider | null,
  detail?: string,
  httpStatus?: number,
): string {
  const label =
    provider === "auto"
      ? "AI (otomatik)"
      : provider
        ? PROVIDER_LABELS[provider as ChatProvider] ?? String(provider)
        : "AI";
  const tail = detail ? detail.slice(0, 280) : httpStatus ? `HTTP ${httpStatus}` : "yanıt yok";
  return `${label}: ${tail}`;
}

export function isOpenAiQuotaOrBillingError(httpStatus: number, detail?: string): boolean {
  const d = String(detail ?? "").toLowerCase();
  return (
    httpStatus === 429 ||
    d.includes("insufficient_quota") ||
    (d.includes("quota") && (d.includes("exceeded") || d.includes("insufficient"))) ||
    (d.includes("billing") && (d.includes("hard") || d.includes("limit") || d.includes("exceeded"))) ||
    /you exceeded your current quota/i.test(detail ?? "")
  );
}

export function isOpenAiFallbackTrigger(httpStatus: number, detail?: string): boolean {
  if (isOpenAiQuotaOrBillingError(httpStatus, detail)) return true;
  if ([401, 402, 403, 429, 500, 502, 503].includes(httpStatus)) return true;
  const d = String(detail ?? "").toLowerCase();
  return (
    d.includes("insufficient_quota") ||
    d.includes("quota") ||
    d.includes("billing") ||
    d.includes("rate_limit") ||
    d.includes("rate limit") ||
    d.includes("exceeded") ||
    d.includes("credit") ||
    d.includes("overloaded")
  );
}

export async function callOpenAIChat(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  temperature = 0.7,
): Promise<ChatCallResult> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {
        error?: { message?: string; code?: string };
      };
      const msg =
        typeof err?.error?.message === "string"
          ? err.error.message
          : typeof err?.error?.code === "string"
            ? err.error.code
            : JSON.stringify(err).slice(0, 400);
      console.error("[aiChat] OpenAI error:", err);
      return { text: null, provider: null, httpStatus: res.status, detail: msg || `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? null;
    return { text, provider: text ? "openai" : null, httpStatus: 200 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[aiChat] OpenAI fetch error:", e);
    return { text: null, provider: null, httpStatus: 0, detail: msg.slice(0, 400) };
  }
}

function isGeminiGoogleSearchEnabled(): boolean {
  const raw = String(process.env.GEMINI_SEARCH_ENABLED ?? "1").trim().toLowerCase();
  return !(raw === "0" || raw === "false" || raw === "off" || raw === "no");
}

async function geminiGenerateOnce(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  temperature: number,
  useSystemInstruction: boolean,
  useGoogleSearch = false,
): Promise<{ ok: boolean; text: string; httpStatus: number; detail: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body: Record<string, unknown> = useSystemInstruction
    ? {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature },
      }
    : {
        contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: { temperature },
      };
  if (useGoogleSearch && isGeminiGoogleSearchEnabled()) {
    body.tools = [{ google_search: {} }];
  }
  const timeoutMs = Math.min(
    Math.max(Number(process.env.GEMINI_TIMEOUT_MS ?? 18_000) || 18_000, 5_000),
    45_000,
  );
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = (await res.json().catch(() => ({}))) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string; status?: string; code?: number };
  };
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    return {
      ok: false,
      text: "",
      httpStatus: res.status,
      detail: `gemini/${model}: ${msg}`,
    };
  }
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p) => p.text ?? "").join("").trim() : "";
  if (!text) {
    return { ok: false, text: "", httpStatus: 200, detail: `gemini/${model}: boş yanıt (güvenlik filtresi olabilir)` };
  }
  return { ok: true, text, httpStatus: 200, detail: "" };
}

export async function callGeminiChat(
  apiKey: string,
  system: string,
  user: string,
  temperature = 0.7,
  useGoogleSearch = true,
): Promise<ChatCallResult> {
  const key = normalizeGeminiApiKey(apiKey);
  if (!key) {
    return { text: null, provider: null, httpStatus: 0, detail: "Gemini API anahtarı boş" };
  }
  if (!/^AIza[\w-]{20,}$/i.test(key)) {
    console.warn("[aiChat] Gemini key format unexpected (expected AIza… from Google AI Studio)");
  }

  let last: ChatCallResult = { text: null, provider: null, httpStatus: 0, detail: "Gemini denenmedi" };

  for (const model of GEMINI_MODEL_FALLBACKS) {
    for (const useSystemInstruction of [true, false]) {
      try {
        const attempt = await geminiGenerateOnce(
          key,
          model,
          system,
          user,
          temperature,
          useSystemInstruction,
          useGoogleSearch,
        );
        if (attempt.ok) {
          return { text: attempt.text, provider: "gemini", httpStatus: 200 };
        }
        last = {
          text: null,
          provider: null,
          httpStatus: attempt.httpStatus,
          detail: attempt.detail,
        };
        console.error(
          "[aiChat] Gemini error:",
          model,
          useSystemInstruction ? "systemInstruction" : "merged-prompt",
          attempt.detail,
        );
        if (isGeminiKeyOrPermissionError(attempt.httpStatus, attempt.detail)) {
          return last;
        }
        if (!useSystemInstruction && shouldTryNextGeminiModel(attempt.httpStatus, attempt.detail)) {
          break;
        }
        if (useSystemInstruction) continue;
        if (shouldTryNextGeminiModel(attempt.httpStatus, attempt.detail)) break;
        return last;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        last = { text: null, provider: null, httpStatus: 0, detail: `gemini/${model}: ${msg.slice(0, 200)}` };
        console.error("[aiChat] Gemini fetch error:", model, e);
      }
    }
  }
  return last;
}

export async function callDeepSeekChat(
  apiKey: string,
  system: string,
  user: string,
  temperature = 0.7,
  model = DEFAULT_DEEPSEEK_MODEL,
): Promise<ChatCallResult> {
  const key = String(apiKey ?? "").trim();
  if (!key) {
    return { text: null, provider: null, httpStatus: 0, detail: "DeepSeek API anahtarı boş" };
  }
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {
        error?: { message?: string; code?: string };
      };
      const msg =
        typeof err?.error?.message === "string"
          ? err.error.message
          : typeof err?.error?.code === "string"
            ? err.error.code
            : JSON.stringify(err).slice(0, 400);
      console.error("[aiChat] DeepSeek error:", err);
      return { text: null, provider: null, httpStatus: res.status, detail: msg || `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? null;
    return { text, provider: text ? "deepseek" : null, httpStatus: 200 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[aiChat] DeepSeek fetch error:", e);
    return { text: null, provider: null, httpStatus: 0, detail: msg.slice(0, 400) };
  }
}

/** Tek sağlayıcı; yedek zinciri yok (auto için `callChatWithOpenAiGeminiFallback` kullanın). */
export async function callChatWithProvider(
  provider: ChatProvider,
  opts: {
    openaiApiKey: string | null | undefined;
    openaiModel: string;
    geminiApiKey?: string | null;
    deepseekApiKey?: string | null;
    system: string;
    user: string;
    temperature?: number;
  },
): Promise<ChatCallResult> {
  if (provider === "openai") {
    const key = String(opts.openaiApiKey ?? "").trim();
    if (!key) {
      return { text: null, provider: null, httpStatus: 0, detail: missingProviderKeyMessage("openai") };
    }
    return callOpenAIChat(key, opts.openaiModel, opts.system, opts.user, opts.temperature ?? 0.7);
  }
  if (provider === "gemini") {
    let geminiKey = normalizeGeminiApiKey(opts.geminiApiKey);
    if (!geminiKey) {
      const site = await getSiteIntegrationKeys();
      geminiKey = site.geminiApiKey ?? "";
    }
    if (!geminiKey) {
      return { text: null, provider: null, httpStatus: 0, detail: missingProviderKeyMessage("gemini") };
    }
    return callGeminiChat(geminiKey, opts.system, opts.user, opts.temperature ?? 0.7);
  }
  let deepseekKey = String(opts.deepseekApiKey ?? "").trim();
  if (!deepseekKey) {
    const site = await getSiteIntegrationKeys();
    deepseekKey = site.deepseekApiKey ?? "";
  }
  if (!deepseekKey) {
    return { text: null, provider: null, httpStatus: 0, detail: missingProviderKeyMessage("deepseek") };
  }
  return callDeepSeekChat(deepseekKey, opts.system, opts.user, opts.temperature ?? 0.7);
}

/** `ai_settings.preferred_provider` veya açık sağlayıcı seçimine göre çağrı. */
export async function callChatForPreferredProvider(
  preferredProvider: PreferredChatProvider,
  opts: {
    openaiApiKey: string | null | undefined;
    openaiModel: string;
    geminiApiKey?: string | null;
    deepseekApiKey?: string | null;
    system: string;
    user: string;
    temperature?: number;
  },
): Promise<ChatCallResult> {
  if (preferredProvider === "auto") {
    return callChatWithOpenAiGeminiFallback({
      openaiApiKey: opts.openaiApiKey,
      openaiModel: opts.openaiModel,
      geminiApiKey: opts.geminiApiKey,
      system: opts.system,
      user: opts.user,
      temperature: opts.temperature,
    });
  }
  return callChatWithProvider(preferredProvider, opts);
}

/**
 * OpenAI dener; kota / yetki hatası veya boş yanıtta site Genel Ayarlar’daki Gemini anahtarına düşer.
 */
export async function callChatWithOpenAiGeminiFallback(opts: {
  openaiApiKey: string | null | undefined;
  openaiModel: string;
  geminiApiKey?: string | null;
  system: string;
  user: string;
  temperature?: number;
}): Promise<ChatCallResult> {
  const okey = String(opts.openaiApiKey ?? "").trim();
  const model = (opts.openaiModel ?? "gpt-4o-mini").trim() || "gpt-4o-mini";
  let geminiKey = normalizeGeminiApiKey(opts.geminiApiKey);
  if (!geminiKey) {
    const site = await getSiteIntegrationKeys();
    geminiKey = site.geminiApiKey ?? "";
  }

  if (okey) {
    const o = await callOpenAIChat(okey, model, opts.system, opts.user, opts.temperature ?? 0.7);
    if (o.text) return o;
    if (geminiKey && isOpenAiFallbackTrigger(o.httpStatus, o.detail)) {
      const g = await callGeminiChat(geminiKey, opts.system, opts.user, opts.temperature ?? 0.7);
      if (g.text) return { ...g, geminiFallbackAttempted: true };
      return {
        text: null,
        provider: null,
        httpStatus: g.httpStatus || o.httpStatus,
        detail: `OpenAI: ${o.detail ?? o.httpStatus}; Gemini: ${g.detail ?? g.httpStatus}`,
        geminiFallbackAttempted: true,
      };
    }
    return o;
  }

  if (geminiKey) {
    return callGeminiChat(geminiKey, opts.system, opts.user, opts.temperature ?? 0.7);
  }

  return {
    text: null,
    provider: null,
    httpStatus: 0,
    detail: "OpenAI veya Gemini API anahtarı tanımlı değil",
  };
}
