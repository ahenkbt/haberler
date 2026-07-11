import {
  getSiteIntegrationKeys,
  normalizeGeminiApiKey,
} from "./aiChatProviders.js";
import { fetchWebSearchFallback } from "./web-search-fallback.js";

/** Google Search grounding için kanıtlanmış model (3.1-lite grounding chunk döndürmeyebilir). */
export const DEFAULT_GEMINI_MODEL =
  (process.env.GEMINI_MODEL ?? process.env.GOOGLE_GEMINI_MODEL ?? "gemini-2.5-flash").trim() ||
  "gemini-2.5-flash";

/** Chat / genel fallback zinciri. */
const GEMINI_MODEL_FALLBACKS = [
  DEFAULT_GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
].filter((m, i, a) => m && a.indexOf(m) === i);

/** /ara internet araması — hızlı, tek amaçlı (edge ~25s limit). */
const GEMINI_UNIFIED_SEARCH_MODELS = [
  DEFAULT_GEMINI_MODEL,
  "gemini-2.5-flash",
].filter((m, i, a) => m && a.indexOf(m) === i);

const GEMINI_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.GEMINI_TIMEOUT_MS ?? 18_000) || 18_000, 5_000),
  45_000,
);

export type GeminiWebResult = {
  id: string;
  title: string;
  url: string;
  snippet: string | null;
};

export type GeminiGroundedResponse = {
  text: string | null;
  webResults: GeminiWebResult[];
  model: string | null;
  httpStatus: number;
  detail?: string;
  webSearchQueries?: string[];
};

type GroundingChunk = { web?: { uri?: string; title?: string } };
type GroundingMetadata = {
  webSearchQueries?: string[];
  groundingChunks?: GroundingChunk[];
  searchEntryPoint?: { renderedContent?: string };
};

function isGeminiSearchExplicitlyDisabled(): boolean {
  const raw = String(process.env.GEMINI_SEARCH_ENABLED ?? "1").trim().toLowerCase();
  return raw === "0" || raw === "false" || raw === "off" || raw === "no";
}

/** İnternet araması / grounding açık mı (anahtar + GEMINI_SEARCH_ENABLED). */
export async function isGeminiInternetSearchAvailable(): Promise<boolean> {
  if (isGeminiSearchExplicitlyDisabled()) return false;
  const site = await getSiteIntegrationKeys();
  return !!site.geminiApiKey;
}

function isModelNotFound(httpStatus: number, detail?: string): boolean {
  if (httpStatus === 404) return true;
  const d = String(detail ?? "").toLowerCase();
  return (
    d.includes("not found") ||
    d.includes("not_found") ||
    d.includes("is not supported") ||
    d.includes("does not exist") ||
    d.includes("unknown model") ||
    d.includes("invalid model")
  );
}

function isKeyOrPermissionError(httpStatus: number, detail?: string): boolean {
  if ([401, 403].includes(httpStatus)) return true;
  const d = String(detail ?? "").toLowerCase();
  return (
    d.includes("api key not valid") ||
    d.includes("api_key_invalid") ||
    d.includes("invalid api key") ||
    d.includes("permission denied")
  );
}

function isQuotaOrRateLimitError(httpStatus: number, detail?: string): boolean {
  if (httpStatus === 429) return true;
  const d = String(detail ?? "").toLowerCase();
  return (
    d.includes("quota") ||
    d.includes("rate limit") ||
    d.includes("rate-limit") ||
    d.includes("resource exhausted") ||
    d.includes("too many requests")
  );
}

function humanizeSearchAiDetail(detail?: string, fallbackUsed?: boolean): string | undefined {
  const raw = String(detail ?? "").trim();
  if (!raw) {
    return fallbackUsed
      ? "Gemini yanıt vermedi; web sonuçları yedek kaynaktan getirildi."
      : undefined;
  }
  const lower = raw.toLowerCase();
  if (isQuotaOrRateLimitError(0, raw)) {
    return fallbackUsed
      ? "Gemini API kota limiti aşıldı. Web sonuçları yedek kaynaktan (DuckDuckGo) getirildi."
      : "Gemini API kota limiti aşıldı. Google AI Studio faturalandırmasını kontrol edin veya bir süre sonra tekrar deneyin.";
  }
  if (raw.includes("edge süre limiti") || raw.includes("süre bütçesi") || raw.includes("yanıt süresi aşıldı")) {
    return fallbackUsed
      ? "Gemini yanıt süresi aşıldı; web sonuçları yedek kaynaktan getirildi."
      : raw;
  }
  if (raw.length > 220) return `${raw.slice(0, 217)}…`;
  return raw;
}

function normalizeWebUrl(raw: string): string | null {
  const url = String(raw ?? "").trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname || parsed.hostname === "google.com" || parsed.hostname.endsWith(".google.com")) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function parseSearchEntryPointLinks(renderedContent?: string): GeminiWebResult[] {
  const html = String(renderedContent ?? "").trim();
  if (!html) return [];
  const out: GeminiWebResult[] = [];
  const seen = new Set<string>();
  const anchorRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html)) !== null) {
    let href = String(match[1] ?? "").trim();
    const title = String(match[2] ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (href.startsWith("/url?")) {
      try {
        const params = new URLSearchParams(href.split("?")[1] ?? "");
        href = params.get("url") ?? params.get("q") ?? href;
      } catch {
        /* olduğu gibi bırak */
      }
    }
    const url = normalizeWebUrl(href);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      id: `web-${out.length + 1}`,
      title: title || url,
      url,
      snippet: null,
    });
  }
  return out;
}

function extractUrlsFromText(text: string): GeminiWebResult[] {
  const out: GeminiWebResult[] = [];
  const seen = new Set<string>();
  const markdownRe = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let mdMatch: RegExpExecArray | null;
  while ((mdMatch = markdownRe.exec(text)) !== null) {
    const url = normalizeWebUrl(mdMatch[2] ?? "");
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      id: `web-${out.length + 1}`,
      title: String(mdMatch[1] ?? "").trim() || url,
      url,
      snippet: null,
    });
  }
  const bareRe = /https?:\/\/[^\s)\]"'<>]+/g;
  for (const raw of text.match(bareRe) ?? []) {
    const url = normalizeWebUrl(raw.replace(/[.,;:!?)]+$/, ""));
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      id: `web-${out.length + 1}`,
      title: url,
      url,
      snippet: null,
    });
  }
  return out;
}

function mergeWebResults(...lists: GeminiWebResult[][]): GeminiWebResult[] {
  const out: GeminiWebResult[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const item of list) {
      const url = normalizeWebUrl(item.url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push({ ...item, id: `web-${out.length + 1}`, url });
      if (out.length >= 12) return out;
    }
  }
  return out;
}

function parseGroundingWebResults(metadata?: GroundingMetadata, text?: string | null): GeminiWebResult[] {
  const chunkResults: GeminiWebResult[] = [];
  const seen = new Set<string>();
  for (const chunk of metadata?.groundingChunks ?? []) {
    const url = normalizeWebUrl(String(chunk.web?.uri ?? "").trim());
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const title = String(chunk.web?.title ?? "").trim() || url;
    chunkResults.push({
      id: `web-${chunkResults.length + 1}`,
      title,
      url,
      snippet: null,
    });
  }
  return mergeWebResults(
    chunkResults,
    parseSearchEntryPointLinks(metadata?.searchEntryPoint?.renderedContent),
    extractUrlsFromText(String(text ?? "")),
  );
}

async function geminiGenerateGroundedOnce(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  temperature: number,
  useGoogleSearch: boolean,
  useSystemInstruction = true,
  timeoutMs = GEMINI_TIMEOUT_MS,
): Promise<GeminiGroundedResponse> {
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
  if (useGoogleSearch) {
    body.tools = [{ google_search: {} }];
  }

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
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      groundingMetadata?: GroundingMetadata;
      finishReason?: string;
    }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    return {
      text: null,
      webResults: [],
      model,
      httpStatus: res.status,
      detail: `gemini/${model}: ${msg}`,
    };
  }

  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .filter((p) => p.thought !== true)
        .map((p) => p.text ?? "")
        .join("")
        .trim()
    : "";
  const webResults = parseGroundingWebResults(candidate?.groundingMetadata, text);
  const finishReason = String(candidate?.finishReason ?? "").trim();

  if (!text) {
    return {
      text: null,
      webResults,
      model,
      httpStatus: 200,
      detail: `gemini/${model}: boş yanıt${finishReason ? ` (${finishReason})` : ""}`,
      webSearchQueries: candidate?.groundingMetadata?.webSearchQueries,
    };
  }

  return {
    text,
    webResults,
    model,
    httpStatus: 200,
    webSearchQueries: candidate?.groundingMetadata?.webSearchQueries,
  };
}

function isUsableGroundedAttempt(attempt: GeminiGroundedResponse): boolean {
  return Boolean(attempt.text?.trim()) || attempt.webResults.length > 0;
}

/** Gemini + Google Search grounding (chatbot ve /ara özeti). */
export async function callGeminiGrounded(opts: {
  apiKey?: string | null;
  system: string;
  user: string;
  temperature?: number;
  useGoogleSearch?: boolean;
}): Promise<GeminiGroundedResponse> {
  let key = normalizeGeminiApiKey(opts.apiKey);
  if (!key) {
    const site = await getSiteIntegrationKeys();
    key = site.geminiApiKey ?? "";
  }
  if (!key) {
    return {
      text: null,
      webResults: [],
      model: null,
      httpStatus: 0,
      detail: "Gemini API anahtarı yapılandırılmamış",
    };
  }

  const temperature = opts.temperature ?? 0.65;
  const useGoogleSearch = opts.useGoogleSearch !== false && !isGeminiSearchExplicitlyDisabled();
  let last: GeminiGroundedResponse = {
    text: null,
    webResults: [],
    model: null,
    httpStatus: 0,
    detail: "Gemini denenmedi",
  };

  for (const model of GEMINI_MODEL_FALLBACKS) {
    for (const useSystemInstruction of [true, false]) {
      try {
        const attempt = await geminiGenerateGroundedOnce(
          key,
          model,
          opts.system,
          opts.user,
          temperature,
          useGoogleSearch,
          useSystemInstruction,
        );
        if (isUsableGroundedAttempt(attempt)) return attempt;
        last = attempt;
        if (isKeyOrPermissionError(attempt.httpStatus, attempt.detail)) return last;
        if (isModelNotFound(attempt.httpStatus, attempt.detail)) break;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        last = {
          text: null,
          webResults: [],
          model,
          httpStatus: 0,
          detail: `gemini/${model}: ${msg.slice(0, 200)}`,
        };
      }
    }
  }
  return last;
}

export type UnifiedSearchAiMeta = {
  detail?: string;
  httpStatus?: number;
  webSearchQueries?: string[];
  modelsTried?: string[];
  timedOut?: boolean;
  fallbackUsed?: boolean;
  fallbackSource?: "duckduckgo";
};

export type UnifiedSearchAiPayload = {
  aiSummary: string | null;
  webResults: GeminiWebResult[];
  model: string | null;
  enabled: boolean;
  meta?: UnifiedSearchAiMeta;
};

const UNIFIED_SEARCH_GEMINI_BUDGET_MS = Math.min(
  Math.max(Number(process.env.GEMINI_UNIFIED_SEARCH_BUDGET_MS ?? 8_000) || 8_000, 3_000),
  15_000,
);

function buildSearchAiMeta(
  result: GeminiGroundedResponse,
  modelsTried: string[],
  extra?: Partial<UnifiedSearchAiMeta>,
): UnifiedSearchAiMeta {
  return {
    detail: result.detail,
    httpStatus: result.httpStatus || undefined,
    webSearchQueries: result.webSearchQueries,
    modelsTried,
    ...extra,
  };
}

/** /ara — kısa süre bütçesiyle grounding (Vercel edge ~25s). */
async function callGeminiGroundedForUnifiedSearch(opts: {
  apiKey?: string | null;
  system: string;
  user: string;
  temperature?: number;
  budgetMs?: number;
}): Promise<GeminiGroundedResponse & { modelsTried: string[] }> {
  const budgetMs = opts.budgetMs ?? UNIFIED_SEARCH_GEMINI_BUDGET_MS;
  const deadline = Date.now() + budgetMs;
  const modelsTried: string[] = [];
  let last: GeminiGroundedResponse = {
    text: null,
    webResults: [],
    model: null,
    httpStatus: 0,
    detail: "Gemini denenmedi",
  };

  for (const model of GEMINI_UNIFIED_SEARCH_MODELS) {
    if (Date.now() >= deadline) {
      last = { ...last, detail: "Gemini süre bütçesi doldu" };
      break;
    }
    modelsTried.push(model);
    const perCallTimeout = Math.max(2_500, Math.min(8_000, deadline - Date.now()));
    try {
      const attempt = await geminiGenerateGroundedOnce(
        (await resolveGeminiKey(opts.apiKey)),
        model,
        opts.system,
        opts.user,
        opts.temperature ?? 0.4,
        true,
        true,
        perCallTimeout,
      );
      if (isUsableGroundedAttempt(attempt)) {
        return { ...attempt, modelsTried };
      }
      last = attempt;
      if (isKeyOrPermissionError(attempt.httpStatus, attempt.detail)) {
        return { ...last, modelsTried };
      }
      if (isQuotaOrRateLimitError(attempt.httpStatus, attempt.detail)) {
        return { ...last, modelsTried };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      last = {
        text: null,
        webResults: [],
        model,
        httpStatus: 0,
        detail: `gemini/${model}: ${msg.slice(0, 200)}`,
      };
    }
  }
  return { ...last, modelsTried };
}

async function resolveGeminiKey(apiKey?: string | null): Promise<string> {
  let key = normalizeGeminiApiKey(apiKey);
  if (!key) {
    const site = await getSiteIntegrationKeys();
    key = site.geminiApiKey ?? "";
  }
  return key;
}

/** /ara birleşik arama için internet özeti + kaynaklar. */
export async function buildUnifiedSearchAiPayload(
  query: string,
  opts?: { budgetMs?: number },
): Promise<UnifiedSearchAiPayload> {
  const enabled = await isGeminiInternetSearchAvailable();
  if (!enabled) {
    return {
      aiSummary: null,
      webResults: [],
      model: null,
      enabled: false,
      meta: { detail: "Gemini API anahtarı yok veya GEMINI_SEARCH_ENABLED=0" },
    };
  }

  const budgetMs = opts?.budgetMs ?? UNIFIED_SEARCH_GEMINI_BUDGET_MS;
  const deadline = Date.now() + budgetMs;
  const system = `Sen Yekpare arama asistanısın. Türkçe, kısa ve net yanıt ver.
Kullanıcı site genelinde arama yapıyor; yerel işletme/haber sonuçları ayrı listelenir.
Güncel veya genel bilgi gerekiyorsa web araması kullan.
2–4 cümle düz metin özeti yaz; kaynak numarası, markdown veya kod bloğu ekleme.`;

  const user = `"${query}" araması için kısa bir bilgi özeti yaz. Güncel olaylar veya genel bilgi gerekiyorsa mutlaka web araması kullan.`;

  let { modelsTried, ...result } = await callGeminiGroundedForUnifiedSearch({
    system,
    user,
    temperature: 0.4,
    budgetMs,
  });

  if (!result.webResults.length && Date.now() < deadline - 500 && !isQuotaOrRateLimitError(result.httpStatus, result.detail)) {
    const webOnly = await callGeminiGroundedForUnifiedSearch({
      system: `Verilen arama sorgusu için web'deki en alakalı sayfaları bul.
Her satırda şu formatta yaz: Başlık | https://tam-url
En fazla 8 satır; düz metin; kod bloğu kullanma.`,
      user: `"${query}" araması için en alakalı web sayfalarını listele.`,
      temperature: 0.2,
      budgetMs: Math.max(2_500, deadline - Date.now()),
    });
    modelsTried = [...modelsTried, ...webOnly.modelsTried];
    result = {
      ...result,
      webResults: mergeWebResults(
        result.webResults,
        webOnly.webResults,
        extractUrlsFromText(webOnly.text ?? ""),
      ),
      text: result.text ?? webOnly.text,
      model: result.model ?? webOnly.model,
      detail: result.detail ?? webOnly.detail,
      webSearchQueries: result.webSearchQueries ?? webOnly.webSearchQueries,
    };
  }

  let fallbackUsed = false;
  if (!result.webResults.length) {
    const fallbackMs = Math.max(1_500, Math.min(4_000, deadline - Date.now()));
    if (fallbackMs > 0) {
      const fallbackResults = await fetchWebSearchFallback(query, 8, fallbackMs).catch(() => []);
      if (fallbackResults.length) {
        fallbackUsed = true;
        result = {
          ...result,
          webResults: mergeWebResults(
            result.webResults,
            fallbackResults.map((item) => ({
              id: item.id,
              title: item.title,
              url: item.url,
              snippet: item.snippet,
            })),
          ),
        };
      }
    }
  }

  const meta = buildSearchAiMeta(result, modelsTried, {
    detail: humanizeSearchAiDetail(result.detail, fallbackUsed),
    fallbackUsed: fallbackUsed || undefined,
    fallbackSource: fallbackUsed ? "duckduckgo" : undefined,
  });

  if (!result.text && result.webResults.length === 0) {
    return {
      aiSummary: null,
      webResults: [],
      model: result.model,
      enabled: true,
      meta,
    };
  }

  return {
    aiSummary: result.text?.trim().slice(0, 900) ?? null,
    webResults: result.webResults,
    model: result.model,
    enabled: true,
    meta,
  };
}


/** Yazarken kısa tamamlama önerileri — yavaşsa boş döner (suggest endpoint zaman aşımı kullanır). */
export async function buildSearchAutocompleteAiSuggestions(
  partialQuery: string,
  maxItems = 2,
): Promise<string[]> {
  const q = partialQuery.trim();
  if (q.length < 3) return [];
  const enabled = await isGeminiInternetSearchAvailable();
  if (!enabled) return [];

  const system = `Sen Yekpare arama kutusu otomatik tamamlama asistanısın.
Kullanıcının yarım kalmış Türkçe aramasını tamamlayan kısa öneriler üret.
Yalnızca JSON dizisi döndür: ["öneri1","öneri2"]
Her öneri en fazla 6 kelime; tekrar etme; marka uydurma.`;

  const user = `Kısmi arama: "${q}"
En fazla ${maxItems} tamamlama önerisi ver.`;

  try {
    const result = await callGeminiGrounded({
      system,
      user,
      temperature: 0.35,
      useGoogleSearch: false,
    });
    if (!result.text) return [];
    const raw = result.text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => String(item ?? "").trim())
      .filter((item) => item.length >= 2 && item.length <= 80)
      .slice(0, maxItems);
  } catch {
    return [];
  }
}

/** Yönetim paneli / status için anahtar kaynağı (sızdırmadan). */
export async function resolveGeminiSearchConfig(): Promise<{
  model: string;
  searchEnabled: boolean;
  apiKeyConfigured: boolean;
  apiKeySource: "site_settings" | "env" | null;
}> {
  const site = await getSiteIntegrationKeys();
  return {
    model: DEFAULT_GEMINI_MODEL,
    searchEnabled: !isGeminiSearchExplicitlyDisabled() && !!site.geminiApiKey,
    apiKeyConfigured: !!site.geminiApiKey,
    apiKeySource: site.geminiApiKeySource,
  };
}
