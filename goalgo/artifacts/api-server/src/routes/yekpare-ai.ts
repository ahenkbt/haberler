import { Router, type IRouter } from "express";
import { db, aiSettingsTable } from "@workspace/db";
import {
  callChatWithOpenAiGeminiFallback,
  callDeepSeekChat,
  callGeminiChat,
  getSiteIntegrationKeys,
  maskGeminiKeyHint,
  mergeChatKeysFromAiAndSite,
  type ChatCallResult,
} from "../lib/aiChatProviders.js";
import {
  buildYekpareAiSystemPrompt,
  buildYekpareAiUserMessage,
  type YekpareAiHistoryTurn,
} from "../lib/yekpareAiKnowledge.js";
import { DEFAULT_GEMINI_MODEL, resolveGeminiSearchConfig } from "../lib/geminiSearchService.js";
import {
  buildAiPayloadFromText,
  buildKeywordFallbackReply,
  parseYekpareAiJson,
  type YekpareAiChatPayload,
} from "../lib/yekpareAiFallback.js";
import {
  buildIntentFallbackReply,
  buildLocationContextNote,
  isGenericLinkSet,
  mergeIntentLinks,
  type YekpareAiLocationContext,
} from "../lib/yekpareAiIntent.js";

const router: IRouter = Router();

const MAX_MESSAGE_LEN = 500;
const MAX_PAGE_PATH_LEN = 200;
const MAX_HISTORY_TURNS = 6;
const CHAT_TEMPERATURE = 0.65;

type HistoryInput = { role?: unknown; text?: unknown };

type LocationInput = { city?: unknown; district?: unknown; label?: unknown };

function sanitizeHistory(raw: unknown): YekpareAiHistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  const out: YekpareAiHistoryTurn[] = [];
  for (const item of raw.slice(-MAX_HISTORY_TURNS)) {
    if (!item || typeof item !== "object") continue;
    const role = (item as HistoryInput).role === "assistant" ? "assistant" : "user";
    const text = String((item as HistoryInput).text ?? "").trim().slice(0, 400);
    if (!text) continue;
    out.push({ role, text });
  }
  return out;
}

function sanitizeLocationContext(raw: unknown): YekpareAiLocationContext | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as LocationInput;
  const city = String(row.city ?? "").trim().slice(0, 80);
  const district = String(row.district ?? "").trim().slice(0, 80);
  const label = String(row.label ?? "").trim().slice(0, 120);
  if (!city && !district && !label) return undefined;
  return {
    city: city || undefined,
    district: district || undefined,
    label: label || undefined,
  };
}

function sanitizeDiagnostic(detail?: string): string | undefined {
  const d = String(detail ?? "").trim();
  if (!d) return undefined;
  return d.replace(/AIza[\w-]{10,}/gi, "AIza…").slice(0, 180);
}

function enrichPayloadWithIntent(
  payload: YekpareAiChatPayload,
  message: string,
  pagePath?: string,
  location?: YekpareAiLocationContext,
): YekpareAiChatPayload {
  const intent = buildIntentFallbackReply(message, pagePath, location);
  if (!intent) return payload;
  const shouldMergeLinks =
    payload.links.length === 0 || isGenericLinkSet(payload.links);
  if (!shouldMergeLinks && payload.provider !== "fallback") return payload;
  return {
    ...payload,
    links: mergeIntentLinks(payload.links, intent.links),
    reply:
      payload.provider === "fallback" && payload.reply.length < 40
        ? intent.reply
        : payload.reply,
  };
}

function payloadFromAiResult(
  result: ChatCallResult,
  provider: YekpareAiChatPayload["provider"],
  message: string,
  pagePath?: string,
  location?: YekpareAiLocationContext,
): YekpareAiChatPayload | null {
  if (!result.text?.trim()) return null;
  const parsed = parseYekpareAiJson(result.text);
  if (parsed) {
    const base = buildAiPayloadFromText(parsed, provider);
    return enrichPayloadWithIntent(base, message, pagePath, location);
  }
  return enrichPayloadWithIntent(
    {
      reply: result.text.trim().slice(0, 1200),
      links: [],
      provider,
      aiConfigured: true,
    },
    message,
    pagePath,
    location,
  );
}

async function loadMergedChatKeys() {
  const [aiRow] = await db.select().from(aiSettingsTable).limit(1);
  const siteKeys = await getSiteIntegrationKeys();
  return {
    keys: mergeChatKeysFromAiAndSite(
      aiRow ?? { openaiApiKey: null, openaiModel: null, preferredProvider: "auto" },
      siteKeys,
    ),
    siteKeys,
  };
}

async function callYekpareAssistant(
  message: string,
  pagePath?: string,
  history?: YekpareAiHistoryTurn[],
  location?: YekpareAiLocationContext,
): Promise<YekpareAiChatPayload> {
  const { keys, siteKeys } = await loadMergedChatKeys();
  const locationNote = buildLocationContextNote(location);
  const system = buildYekpareAiSystemPrompt(pagePath, locationNote);
  const user = buildYekpareAiUserMessage(message, pagePath, history, locationNote);
  const aiConfigured = !!(keys.geminiApiKey || keys.openaiApiKey || keys.deepseekApiKey);
  const diagnostics: string[] = [];

  if (keys.geminiApiKey) {
    const g = await callGeminiChat(keys.geminiApiKey, system, user, CHAT_TEMPERATURE);
    const payload = payloadFromAiResult(g, "gemini", message, pagePath, location);
    if (payload) return payload;
    if (g.detail) diagnostics.push(`Gemini: ${sanitizeDiagnostic(g.detail) ?? "yanıt yok"}`);
  }

  if (keys.openaiApiKey) {
    const chain = await callChatWithOpenAiGeminiFallback({
      openaiApiKey: keys.openaiApiKey,
      openaiModel: keys.openaiModel,
      geminiApiKey: keys.geminiApiKey,
      system,
      user,
      temperature: CHAT_TEMPERATURE,
    });
    const provider =
      chain.provider === "openai" || chain.provider === "gemini" || chain.provider === "deepseek"
        ? chain.provider
        : "openai";
    const payload = payloadFromAiResult(chain, provider, message, pagePath, location);
    if (payload) return payload;
    if (chain.detail) diagnostics.push(sanitizeDiagnostic(chain.detail) ?? "OpenAI yanıt yok");
  }

  if (keys.deepseekApiKey) {
    const d = await callDeepSeekChat(keys.deepseekApiKey, system, user, CHAT_TEMPERATURE);
    const payload = payloadFromAiResult(d, "deepseek", message, pagePath, location);
    if (payload) return payload;
    if (d.detail) diagnostics.push(`DeepSeek: ${sanitizeDiagnostic(d.detail) ?? "yanıt yok"}`);
  }

  const fallback = buildKeywordFallbackReply(message, pagePath, location);
  return {
    ...fallback,
    aiConfigured,
    diagnostic:
      aiConfigured && diagnostics.length > 0
        ? diagnostics.join(" | ")
        : !aiConfigured
          ? "Gemini/OpenAI/DeepSeek anahtarı yapılandırılmamış"
          : undefined,
  };
}

/** Herkese açık: Yekpare site rehberi sohbeti (Gemini / site entegrasyon anahtarları). */
router.post("/yekpare-ai/chat", async (req, res): Promise<void> => {
  const body = req.body as {
    message?: unknown;
    pagePath?: unknown;
    history?: unknown;
    locationContext?: unknown;
  };
  const message = String(body.message ?? "").trim();
  const pagePath = body.pagePath != null ? String(body.pagePath).trim().slice(0, MAX_PAGE_PATH_LEN) : "";
  const history = sanitizeHistory(body.history);
  const locationContext = sanitizeLocationContext(body.locationContext);

  if (!message) {
    res.status(400).json({ ok: false, error: "message gerekli" });
    return;
  }
  if (message.length > MAX_MESSAGE_LEN) {
    res.status(400).json({ ok: false, error: `Mesaj en fazla ${MAX_MESSAGE_LEN} karakter olabilir.` });
    return;
  }

  try {
    const result = await callYekpareAssistant(
      message,
      pagePath || undefined,
      history,
      locationContext,
    );
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[yekpare-ai] chat error:", e);
    const fallback = buildKeywordFallbackReply(message, pagePath || undefined, locationContext);
    res.json({
      ok: true,
      ...fallback,
      warning: msg.slice(0, 120),
    });
  }
});

/** Herkese açık: asistan yapılandırma özeti (anahtar sızmaz). */
router.get("/yekpare-ai/status", async (_req, res): Promise<void> => {
  const { keys, siteKeys } = await loadMergedChatKeys();
  const geminiConfigured = !!keys.geminiApiKey;
  const geminiSearch = await resolveGeminiSearchConfig();
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  res.json({
    ok: true,
    geminiConfigured,
    geminiModel: DEFAULT_GEMINI_MODEL,
    geminiSearchEnabled: geminiSearch.searchEnabled,
    geminiKeySource: siteKeys.geminiApiKeySource,
    geminiKeyHint: maskGeminiKeyHint(keys.geminiApiKey),
    openaiConfigured: !!keys.openaiApiKey,
    deepseekConfigured: !!keys.deepseekApiKey,
    preferredProvider: keys.preferredProvider,
    aiConfigured: !!(keys.geminiApiKey || keys.openaiApiKey || keys.deepseekApiKey),
    adminGeminiPath: "/admin/ayarlar?tab=entegrasyon#gemini-api-key",
    scopeNote:
      "Yekpare AI yalnızca yekpare.net hizmetleriyle ilgili sorulara yanıt verir; konu dışı istekler nazikçe reddedilir.",
    assistantFeatures: [
      "konum ve şehir bazlı yemek/işletme araması",
      "alternatif öneri (gözleme → pide/restoran)",
      "sipariş takip, üyelik ve işletme başvuru yönlendirmesi",
      "Gemini Google Search grounding (güncel bilgi)",
    ],
  });
});

export default router;
