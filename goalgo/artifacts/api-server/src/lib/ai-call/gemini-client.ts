import type { ChatMessage, ChatResult } from "./openai-client.js";

export async function testGeminiConnection(apiKey: string, model = "gemini-2.0-flash"): Promise<ChatResult> {
  if (!apiKey.trim()) {
    return { ok: false, error: "Gemini API anahtarı boş." };
  }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Merhaba, bağlantı testi. Tek kelimeyle yanıt ver: tamam" }] }],
        generationConfig: { maxOutputTokens: 16 },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      return { ok: false, error: body.error?.message ?? `HTTP ${res.status}` };
    }
    const content = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return { ok: true, content: content ?? "OK", model };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function chatGemini(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<ChatResult> {
  if (!apiKey.trim()) {
    return { ok: false, error: "Gemini API anahtarı yapılandırılmamış." };
  }
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const turns = messages.filter((m) => m.role !== "system");
  const contents = turns.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      return { ok: false, error: body.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, content: body.candidates?.[0]?.content?.parts?.[0]?.text ?? "", model };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
