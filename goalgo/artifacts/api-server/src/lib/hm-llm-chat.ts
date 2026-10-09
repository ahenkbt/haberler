import { callGeminiChat, callOpenAIChat, type ChatCallResult } from "./aiChatProviders.js";
import { defaultLlmModel, type LlmAttempt, type LlmProviderId } from "./hm-llm-catalog.js";
import { recordLlmAttempt, resolveLlmAttempts } from "./hm-llm-store.js";

const EVREN_BASE = (process.env.EVREN_API_BASE ?? "https://evren-llmapi.ssyz.org.tr/v1").replace(/\/$/, "");
const NVIDIA_BASE = (process.env.NVIDIA_API_BASE ?? "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");

function scrub(detail: string, apiKey: string): string {
  const raw = String(detail ?? "");
  const hidden = apiKey ? raw.split(apiKey).join("••••") : raw;
  return hidden.slice(0, 280);
}

async function callGeminiModel(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  temperature: number,
): Promise<ChatCallResult> {
  const chosen = (model || defaultLlmModel("gemini")).trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(chosen)}:generateContent`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        text: null,
        provider: null,
        httpStatus: res.status,
        detail: scrub(data?.error?.message || `HTTP ${res.status}`, apiKey),
      };
    }
    const parts = data.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts) ? parts.map((p) => p.text ?? "").join("").trim() : "";
    if (!text) return { text: null, provider: null, httpStatus: 200, detail: "Boş yanıt" };
    return { text, provider: "gemini", httpStatus: 200 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: null, provider: null, httpStatus: 0, detail: scrub(msg, apiKey) };
  }
}

async function callOpenAiCompatible(opts: {
  url: string;
  apiKey: string;
  auth: "bearer" | "x-api-key";
  model: string;
  system: string;
  user: string;
  temperature: number;
  provider: LlmProviderId;
  extraBody?: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<ChatCallResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth === "bearer") headers.Authorization = `Bearer ${opts.apiKey}`;
  else headers["X-API-Key"] = opts.apiKey;
  try {
    const res = await fetch(opts.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: opts.model,
        temperature: opts.temperature,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        ...(opts.extraBody ?? {}),
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      return { text: null, provider: null, httpStatus: res.status, detail: scrub(msg, opts.apiKey) };
    }
    const text = String(data.choices?.[0]?.message?.content ?? "").trim();
    if (!text) {
      return { text: null, provider: null, httpStatus: 200, detail: "Boş yanıt" };
    }
    return { text, provider: opts.provider === "openai" ? "openai" : null, httpStatus: 200 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: null, provider: null, httpStatus: 0, detail: scrub(msg, opts.apiKey) };
  }
}

export async function callLlmAttempt(
  attempt: LlmAttempt,
  opts: { system: string; user: string; temperature?: number },
): Promise<ChatCallResult> {
  const temperature = opts.temperature ?? 0.7;
  if (attempt.provider === "openai") {
    return callOpenAIChat(attempt.apiKey, attempt.model, opts.system, opts.user, temperature);
  }
  if (attempt.provider === "gemini") {
    const exact = await callGeminiModel(attempt.apiKey, attempt.model, opts.system, opts.user, temperature);
    if (exact.text) return exact;
    if (exact.httpStatus === 401 || exact.httpStatus === 403) return exact;
    return callGeminiChat(attempt.apiKey, opts.system, opts.user, temperature, false);
  }
  if (attempt.provider === "nvidia") {
    const result = await callOpenAiCompatible({
      url: `${NVIDIA_BASE}/chat/completions`,
      apiKey: attempt.apiKey,
      auth: "bearer",
      model: attempt.model,
      system: opts.system,
      user: opts.user,
      temperature,
      provider: "nvidia",
      // Nemotron 3.5 is a reasoning model: without this it spends ~250 tokens "thinking"
      // (16-20 s) and the visible answer can miss the expected text.
      extraBody: /nemotron/i.test(attempt.model) ? { chat_template_kwargs: { enable_thinking: false } } : undefined,
      timeoutMs: 45_000,
    });
    return result.text ? { ...result, provider: "openai" } : result;
  }
  return callOpenAiCompatible({
    url: `${EVREN_BASE}/chat/completions`,
    apiKey: attempt.apiKey,
    auth: "x-api-key",
    model: attempt.model || "auto",
    system: opts.system,
    user: opts.user,
    temperature,
    provider: "evren",
  });
}

export type LlmChainResult = ChatCallResult & {
  scope: "site" | "global" | "env" | null;
  llmProvider: LlmProviderId | null;
  model: string | null;
};

/**
 * Site anahtarı, olmazsa veya çağrı düşerse Haber Merkezi, sonra ortam değişkeni.
 */
export async function callChatWithLlmChain(opts: {
  siteId: number | null;
  system: string;
  user: string;
  temperature?: number;
}): Promise<LlmChainResult> {
  let attempts: LlmAttempt[] = [];
  try {
    attempts = await resolveLlmAttempts(opts.siteId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      text: null,
      provider: null,
      httpStatus: 0,
      detail: msg.slice(0, 200),
      scope: null,
      llmProvider: null,
      model: null,
    };
  }
  if (!attempts.length) {
    return {
      text: null,
      provider: null,
      httpStatus: 0,
      detail: "Evren, NVIDIA, Gemini veya OpenAI API anahtarı tanımlı değil",
      scope: null,
      llmProvider: null,
      model: null,
    };
  }
  let last: LlmChainResult = {
    text: null,
    provider: null,
    httpStatus: 0,
    detail: "Sağlayıcı denenmedi",
    scope: null,
    llmProvider: null,
    model: null,
  };
  for (const attempt of attempts) {
    const result = await callLlmAttempt(attempt, opts);
    if (result.text) {
      await recordLlmAttempt(attempt.rowId, true).catch(() => undefined);
      return {
        ...result,
        scope: attempt.scope,
        llmProvider: attempt.provider,
        model: attempt.model,
      };
    }
    await recordLlmAttempt(attempt.rowId, false, result.detail).catch(() => undefined);
    last = {
      ...result,
      detail: scrub(result.detail ?? "", attempt.apiKey),
      scope: attempt.scope,
      llmProvider: attempt.provider,
      model: attempt.model,
    };
  }
  return last;
}
