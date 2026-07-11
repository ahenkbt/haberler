import {
  YEKPARE_ROUTE_HINTS,
  type YekpareRouteHint,
} from "./yekpareAiKnowledge.js";
import {
  buildIntentFallbackReply,
  type YekpareAiLocationContext,
} from "./yekpareAiIntent.js";

export type YekpareAiLink = { label: string; href: string };

export type YekpareAiChatPayload = {
  reply: string;
  links: YekpareAiLink[];
  provider: "fallback" | "gemini" | "openai" | "deepseek";
  aiConfigured: boolean;
  /** Anahtar varken AI başarısız olduysa kısa tanı (gizli bilgi sızmaz). */
  diagnostic?: string;
};

const GREETING_PATTERNS = [
  /^merhaba\b/,
  /^selam\b/,
  /^slm\b/,
  /^gunaydin\b/,
  /^iyi gunler\b/,
  /^iyi aksamlar\b/,
  /^iyi geceler\b/,
  /^hey\b/,
  /^hello\b/,
  /^hi\b/,
  /^naber\b/,
  /^nasilsin\b/,
  /^naber\b/,
];

const THANKS_PATTERNS = [
  /^tesekkur/,
  /^sagol/,
  /^cok tesekkur/,
  /^eyvallah\b/,
  /^gule gule\b/,
  /^hosca kal\b/,
  /^gorusuruz\b/,
];

const OFF_TOPIC_PATTERNS = [
  /\bhava durumu\b/,
  /\bsiyaset\b/,
  /\bsecim\b/,
  /\bfutbol\b/,
  /\bmac skoru\b/,
  /\bbitcoin\b/,
  /\bborsa\b/,
  /\bkripto\b/,
  /\bilac\b/,
  /\bdoktor\b/,
  /\bsaglik\b/,
  /\bask\b/,
  /\biliski\b/,
  /\baile\b/,
  /\bodev\b/,
  /\bpython kod\b/,
  /\bprogramlama\b/,
  /\bmatematik\b/,
  /\bfizik\b/,
  /\btarih sorusu\b/,
  /\bkimdir\b/,
  /\bkim yazdi\b/,
  /\bsoz yaz\b/,
  /\bsiir yaz\b/,
  /\bflort\b/,
  /\btavsiye ver\b/,
  /\bne yemeliyim\b/,
  /\btarif\b/,
  /\byemek tarifi\b/,
  /\bdunya capinda\b/,
  /\bdunya tarihi\b/,
  /\bamerika\b/,
  /\bavrupa\b/,
];

const YEKPARE_TERMS = [
  "yekpare",
  "siparis",
  "sepet",
  "magaza",
  "market",
  "yemek",
  "restoran",
  "turizm",
  "seyahat",
  "otel",
  "ulasim",
  "kargo",
  "harita",
  "haber",
  "yektube",
  "ansiklopedi",
  "bilgi agaci",
  "isletme",
  "satici",
  "destek",
  "iletisim",
  "firma rehberi",
  "kesfet",
  "cagri merkezi",
  "ai cagri",
  "gozleme",
  "pide",
  "kebap",
  "uyelik",
  "kayit",
  "giris",
  "takip",
  "ankara",
  "istanbul",
  "izmir",
];

const DEFAULT_SCOPE_LINKS: YekpareAiLink[] = [
  { label: "Yemek", href: "/yemek" },
  { label: "Alışveriş", href: "/magaza" },
  { label: "Destek", href: "/destek" },
];

function normalizeTr(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .trim();
}

function scoreHint(hint: YekpareRouteHint, normalizedMsg: string): number {
  let score = 0;
  for (const kw of hint.keywords) {
    const nkw = normalizeTr(kw);
    if (normalizedMsg.includes(nkw)) score += nkw.length >= 6 ? 3 : 2;
  }
  if (normalizedMsg.includes(normalizeTr(hint.label))) score += 2;
  return score;
}

export function isYekpareRelatedMessage(message: string): boolean {
  const normalized = normalizeTr(message);
  if (normalized.includes("yekpare")) return true;
  if (YEKPARE_TERMS.some((t) => normalized.includes(t))) return true;
  return YEKPARE_ROUTE_HINTS.some((hint) => scoreHint(hint, normalized) > 0);
}

export function isGreetingMessage(message: string): boolean {
  const normalized = normalizeTr(message.replace(/[!?.…,]/g, " ").trim());
  if (!normalized) return false;
  return GREETING_PATTERNS.some((p) => p.test(normalized));
}

export function isThanksOrFarewellMessage(message: string): boolean {
  const normalized = normalizeTr(message.replace(/[!?.…,]/g, " ").trim());
  if (!normalized) return false;
  return THANKS_PATTERNS.some((p) => p.test(normalized));
}

export function isLikelyOffTopicMessage(message: string): boolean {
  if (isYekpareRelatedMessage(message)) return false;
  if (isGreetingMessage(message)) return false;
  if (isThanksOrFarewellMessage(message)) return false;
  const normalized = normalizeTr(message);
  if (OFF_TOPIC_PATTERNS.some((p) => p.test(normalized))) return true;
  // Uzun genel soru, Yekpare bağlamı yok
  if (normalized.length >= 28 && /(nedir|nasil|kim|nerede|ne zaman|acikla|yaz|soyle|tavsiye)/.test(normalized)) {
    return true;
  }
  return false;
}

export function buildGreetingFallbackReply(): YekpareAiChatPayload {
  return {
    reply:
      "Merhaba! Ben Yekpare AI. yekpare.net üzerinde yemek siparişi, alışveriş, seyahat, haritalar, haberler ve Bilgi Ağacı gibi konularda size yardımcı olabilirim. Bugün neye ihtiyacınız var?",
    links: [],
    provider: "fallback",
    aiConfigured: false,
  };
}

export function buildThanksFallbackReply(): YekpareAiChatPayload {
  return {
    reply: "Rica ederim! yekpare.net ile ilgili başka bir konuda yardıma ihtiyacınız olursa buradayım.",
    links: [],
    provider: "fallback",
    aiConfigured: false,
  };
}

export function buildOffTopicFallbackReply(): YekpareAiChatPayload {
  return {
    reply:
      "Bu konuda yardımcı olamam; ben yalnızca yekpare.net hizmetleriyle ilgileniyorum. Sipariş, alışveriş, seyahat, haritalar, haberler, Bilgi Ağacı, işletme başvurusu veya destek konularında size yardımcı olabilirim — hangisiyle ilgileniyorsunuz?",
    links: DEFAULT_SCOPE_LINKS,
    provider: "fallback",
    aiConfigured: false,
  };
}

function buildAiPayloadFromText(
  parsed: { reply: string; links: YekpareAiLink[] },
  provider: YekpareAiChatPayload["provider"],
): YekpareAiChatPayload {
  return {
    reply: parsed.reply,
    links: parsed.links,
    provider,
    aiConfigured: true,
  };
}

/** API anahtarı yok veya model yanıt vermediğinde kural tabanlı yedek. */
export function buildKeywordFallbackReply(
  message: string,
  pagePath?: string,
  location?: YekpareAiLocationContext,
): YekpareAiChatPayload {
  if (isGreetingMessage(message)) return buildGreetingFallbackReply();
  if (isThanksOrFarewellMessage(message)) return buildThanksFallbackReply();
  if (isLikelyOffTopicMessage(message)) return buildOffTopicFallbackReply();

  const intentReply = buildIntentFallbackReply(message, pagePath, location);
  if (intentReply) {
    return {
      reply: intentReply.reply,
      links: intentReply.links,
      provider: "fallback",
      aiConfigured: false,
    };
  }

  const normalized = normalizeTr(message);
  const ranked = YEKPARE_ROUTE_HINTS.map((hint) => ({
    hint,
    score: scoreHint(hint, normalized),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length > 0) {
    const top = ranked.slice(0, 3).map((x) => x.hint);
    const primary = top[0];
    const reply =
      top.length === 1
        ? `${primary.label} için ${primary.description} ${primary.href} sayfasına gidebilirsiniz.`
        : `Aradığınız konuyla ilgili ${top.map((h) => h.label).join(", ")} bölümlerimiz var. En uygun başlangıç: ${primary.label}.`;
    return {
      reply,
      links: top.map((h) => ({ label: h.label, href: h.href })),
      provider: "fallback",
      aiConfigured: false,
    };
  }

  const pathHint = pagePath?.trim()
    ? ` Şu an ${pagePath.trim()} sayfasındasınız.`
    : "";

  return {
    reply: `Yekpare'de yemek siparişi, alışveriş, seyahat, haritalar, haberler ve bilgi ağacı gibi birçok hizmet var.${pathHint} Ne aradığınızı biraz daha açarsanız doğru sayfaya yönlendirebilirim.`,
    links: DEFAULT_SCOPE_LINKS,
    provider: "fallback",
    aiConfigured: false,
  };
}

export function parseYekpareAiJson(raw: string): { reply: string; links: YekpareAiLink[] } | null {
  const text = raw.trim();
  try {
    const parsed = JSON.parse(text) as { reply?: unknown; links?: unknown };
    if (typeof parsed.reply !== "string" || !parsed.reply.trim()) return null;
    const links: YekpareAiLink[] = [];
    if (Array.isArray(parsed.links)) {
      for (const item of parsed.links.slice(0, 3)) {
        if (!item || typeof item !== "object") continue;
        const label = String((item as { label?: unknown }).label ?? "").trim();
        const href = String((item as { href?: unknown }).href ?? "").trim();
        if (!label || !href.startsWith("/") || href.includes("://")) continue;
        links.push({ label, href });
      }
    }
    return { reply: parsed.reply.trim(), links };
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      const parsed = JSON.parse(m[0]) as { reply?: unknown; links?: unknown };
      if (typeof parsed.reply !== "string") return null;
      const links: YekpareAiLink[] = [];
      if (Array.isArray(parsed.links)) {
        for (const item of parsed.links.slice(0, 3)) {
          if (!item || typeof item !== "object") continue;
          const label = String((item as { label?: unknown }).label ?? "").trim();
          const href = String((item as { href?: unknown }).href ?? "").trim();
          if (!label || !href.startsWith("/")) continue;
          links.push({ label, href });
        }
      }
      return { reply: String(parsed.reply).trim(), links };
    } catch {
      return null;
    }
  }
}

export { buildAiPayloadFromText };
