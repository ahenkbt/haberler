import axios from "axios";
import { callGeminiChat } from "./aiChatProviders.js";

export type SiteAiKeys = {
  openaiApiKey?: string | null;
  openaiModel?: string | null;
  geminiApiKey?: string | null;
  deepseekApiKey?: string | null;
};

export type VendorAboutGenerationResult = {
  text: string | null;
  usedProvider: "openai" | "gemini" | "deepseek" | null;
  errors: string[];
  hasAnyKey: boolean;
};

/** Vercel `/api` → Railway rewrite katmanı genelde ~60 sn civarı keser; paralel + kısa süre ile 502’den kaçınılır. */
const PROVIDER_TIMEOUT_MS = 22_000;

function cleanGeneratedAboutText(raw: string): string {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^google\s+haritalar\s*:/i.test(l))
    .filter((l) => !/^https?:\/\/maps\.google\./i.test(l))
    .filter((l) => !/maps\.google\./i.test(l));
  return lines.join("\n").trim();
}

export async function generateTurkishVendorAboutDetailed(
  site: SiteAiKeys,
  ctx: {
    name: string;
    city?: string | null;
    district?: string | null;
    address?: string | null;
    vendorType?: string | null;
    providerType?: string | null;
  },
): Promise<VendorAboutGenerationResult> {
  const loc = [ctx.district, ctx.city].filter(Boolean).join(", ") || "—";
  const prompt = `Türkçe, kurumsal ama samimi bir "Hakkımızda" metni yaz (4–7 cümle). HTML veya markdown kullanma; düz metin olsun.
İşletme adı: ${ctx.name}
Hizmet türü: ${ctx.vendorType || ctx.providerType || "yerel işletme"}
Konum: ${loc}
Adres özeti: ${ctx.address || "—"}
Google Places’tan zengin açıklama gelmeyebilir; metni makul ve saygılı tut, abartılı veya kanıtlanmamış iddialardan kaçın.
Google Haritalar linki, URL veya harici bağlantı yazma.`;

  const okey = String(site.openaiApiKey ?? "").trim();
  const omodel = String(site.openaiModel ?? "").trim() || "gpt-4o-mini";
  const gkey = String(site.geminiApiKey ?? "").trim();
  const dkey = String(site.deepseekApiKey ?? "").trim();
  const hasAnyKey = Boolean(okey || gkey || dkey);

  const errors: string[] = [];

  async function openAiWinner(): Promise<{ text: string; usedProvider: "openai" }> {
    const rr = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: omodel,
        messages: [
          { role: "system", content: "Sen Türkçe içerik üreten yardımcı bir asistansın." },
          { role: "user", content: prompt },
        ],
        temperature: 0.55,
      },
      {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${okey}` },
        timeout: PROVIDER_TIMEOUT_MS,
        validateStatus: () => true,
      },
    );
    const text = cleanGeneratedAboutText(String(rr.data?.choices?.[0]?.message?.content ?? "").trim());
    if (rr.status === 200 && text) return { text, usedProvider: "openai" };
    throw new Error(`openai:${rr.status}`);
  }

  async function geminiWinner(): Promise<{ text: string; usedProvider: "gemini" }> {
    const rr = await callGeminiChat(
      gkey,
      "Sen Türkçe içerik üreten yardımcı bir asistansın.",
      prompt,
      0.55,
    );
    const text = cleanGeneratedAboutText(rr.text ?? "");
    if (text) return { text, usedProvider: "gemini" };
    throw new Error(rr.detail || `gemini:${rr.httpStatus}`);
  }

  async function deepseekWinner(): Promise<{ text: string; usedProvider: "deepseek" }> {
    const rr = await axios.post(
      "https://api.deepseek.com/chat/completions",
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "Sen Türkçe içerik üreten yardımcı bir asistansın." },
          { role: "user", content: prompt },
        ],
        temperature: 0.55,
      },
      {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${dkey}` },
        timeout: PROVIDER_TIMEOUT_MS,
        validateStatus: () => true,
      },
    );
    const text = cleanGeneratedAboutText(String(rr.data?.choices?.[0]?.message?.content ?? "").trim());
    if (rr.status === 200 && text) return { text, usedProvider: "deepseek" };
    throw new Error(`deepseek:${rr.status}`);
  }

  const runners: Promise<{ text: string; usedProvider: "openai" | "gemini" | "deepseek" }>[] = [];
  if (okey) runners.push(openAiWinner());
  if (gkey) runners.push(geminiWinner());
  if (dkey) runners.push(deepseekWinner());

  if (!runners.length) {
    return { text: null, usedProvider: null, errors, hasAnyKey: false };
  }

  try {
    const winner = await Promise.any(runners);
    return { text: winner.text, usedProvider: winner.usedProvider, errors, hasAnyKey };
  } catch (e) {
    if (e instanceof AggregateError && Array.isArray(e.errors)) {
      for (const err of e.errors) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    } else {
      errors.push(e instanceof Error ? e.message : String(e));
    }
    return { text: null, usedProvider: null, errors, hasAnyKey };
  }
}

export async function generateTurkishVendorAbout(
  site: SiteAiKeys,
  ctx: {
    name: string;
    city?: string | null;
    district?: string | null;
    address?: string | null;
    vendorType?: string | null;
    providerType?: string | null;
  },
): Promise<string | null> {
  const out = await generateTurkishVendorAboutDetailed(site, ctx);
  return out.text;
}
