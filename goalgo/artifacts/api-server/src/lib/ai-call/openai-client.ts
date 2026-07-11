import type { AiCallProvider } from "./types.js";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatResult = {
  ok: boolean;
  content?: string;
  error?: string;
  model?: string;
};

export async function testOpenAiConnection(apiKey: string, model = "gpt-4o-mini"): Promise<ChatResult> {
  if (!apiKey.trim()) {
    return { ok: false, error: "OpenAI API anahtarı boş." };
  }
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Merhaba, bağlantı testi. Tek kelimeyle yanıt ver: tamam" }],
        max_tokens: 16,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      return { ok: false, error: body.error?.message ?? `HTTP ${res.status}` };
    }
    const content = body.choices?.[0]?.message?.content?.trim();
    return { ok: true, content: content ?? "OK", model };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function chatOpenAi(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<ChatResult> {
  if (!apiKey.trim()) {
    return { ok: false, error: "OpenAI API anahtarı yapılandırılmamış." };
  }
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, max_tokens: 1024 }),
      signal: AbortSignal.timeout(60_000),
    });
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      return { ok: false, error: body.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, content: body.choices?.[0]?.message?.content ?? "", model };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function demoOpenAiReply(provider: AiCallProvider, prompt: string): ChatResult {
  return {
    ok: true,
    model: provider === "openai" ? "gpt-4o-mini (demo)" : "gemini-2.0-flash (demo)",
    content: `[Demo mod] "${prompt.slice(0, 80)}" konusunda size yardımcı olabilirim. Gerçek arama için API anahtarınızı Ayarlar'dan ekleyin.`,
  };
}
