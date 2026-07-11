import { chatGemini } from "./gemini-client.js";
import { chatOpenAi, demoOpenAiReply, type ChatMessage, type ChatResult } from "./openai-client.js";
import { decryptSecret } from "./crypto.js";
import { loadSettingsRow } from "./service.js";
import type { AiCallAssistant, AiCallProvider } from "./types.js";

export async function resolveProviderKeys(): Promise<{
  openaiKey: string;
  geminiKey: string;
  demoMode: boolean;
  defaultProvider: AiCallProvider;
  defaultModel: string;
}> {
  const row = await loadSettingsRow();
  return {
    openaiKey: row.openai_api_key_enc ? decryptSecret(row.openai_api_key_enc) : "",
    geminiKey: row.gemini_api_key_enc ? decryptSecret(row.gemini_api_key_enc) : "",
    demoMode: row.demo_mode === true,
    defaultProvider: (row.default_provider === "gemini" ? "gemini" : "openai") as AiCallProvider,
    defaultModel: row.default_model ?? "gpt-4o-mini",
  };
}

export async function chatWithProvider(
  assistant: Pick<AiCallAssistant, "provider" | "model" | "systemPrompt">,
  userMessage: string,
  history: ChatMessage[] = [],
): Promise<ChatResult> {
  const keys = await resolveProviderKeys();
  const provider = assistant.provider ?? keys.defaultProvider;
  const model = assistant.model || keys.defaultModel;
  const messages: ChatMessage[] = [
    { role: "system", content: assistant.systemPrompt || "Sen yardımcı bir çağrı merkezi asistanısın." },
    ...history,
    { role: "user", content: userMessage },
  ];

  if (keys.demoMode && !keys.openaiKey && !keys.geminiKey) {
    return demoOpenAiReply(provider, userMessage);
  }

  if (provider === "gemini") {
    if (!keys.geminiKey && keys.demoMode) return demoOpenAiReply(provider, userMessage);
    return chatGemini(keys.geminiKey, model.startsWith("gemini") ? model : "gemini-2.0-flash", messages);
  }

  if (!keys.openaiKey && keys.demoMode) return demoOpenAiReply(provider, userMessage);
  return chatOpenAi(keys.openaiKey, model, messages);
}

export async function testProviderConnection(
  provider: AiCallProvider,
  apiKey?: string,
  model?: string,
): Promise<ChatResult> {
  const keys = await resolveProviderKeys();
  if (provider === "gemini") {
    const key = apiKey?.trim() || keys.geminiKey;
    if (!key && keys.demoMode) {
      return { ok: true, content: "Demo mod: Gemini anahtarı olmadan simülasyon aktif.", model: "demo" };
    }
    const { testGeminiConnection } = await import("./gemini-client.js");
    return testGeminiConnection(key, model ?? "gemini-2.0-flash");
  }
  const key = apiKey?.trim() || keys.openaiKey;
  if (!key && keys.demoMode) {
    return { ok: true, content: "Demo mod: OpenAI anahtarı olmadan simülasyon aktif.", model: "demo" };
  }
  const { testOpenAiConnection } = await import("./openai-client.js");
  return testOpenAiConnection(key, model ?? keys.defaultModel);
}
