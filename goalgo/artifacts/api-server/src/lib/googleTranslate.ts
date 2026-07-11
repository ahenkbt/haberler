import { db, siteSettingsTable } from "@workspace/db";
import { logger } from "./logger.js";

const TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2";
const TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.GOOGLE_TRANSLATE_TIMEOUT_MS ?? 12_000) || 12_000, 4_000),
  30_000,
);

type TranslateResponse = {
  data?: {
    translations?: Array<{ translatedText?: string; detectedSourceLanguage?: string }>;
  };
  error?: { message?: string; code?: number };
};

let cachedKey: { key: string | null; at: number } = { key: null, at: 0 };
const KEY_CACHE_MS = 60_000;

export async function resolveGoogleTranslateApiKey(): Promise<string | null> {
  const now = Date.now();
  if (now - cachedKey.at < KEY_CACHE_MS) return cachedKey.key;

  for (const envKey of [
    process.env.GOOGLE_TRANSLATE_API_KEY,
    process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY,
    process.env.GOOGLE_MAPS_SERVER_KEY,
    process.env.GOOGLE_MAPS_API_KEY,
    process.env.GOOGLE_PLACES_API_KEY,
  ]) {
    const v = String(envKey ?? "").trim();
    if (v) {
      cachedKey = { key: v, at: now };
      return v;
    }
  }

  try {
    const [row] = await db
      .select({
        googleMapsServerKey: siteSettingsTable.googleMapsServerKey,
        googlePlacesApiKey: siteSettingsTable.googlePlacesApiKey,
      })
      .from(siteSettingsTable)
      .limit(1);
    const key = row?.googleMapsServerKey?.trim() || row?.googlePlacesApiKey?.trim() || null;
    cachedKey = { key, at: now };
    return key;
  } catch {
    cachedKey = { key: null, at: now };
    return null;
  }
}

export async function googleTranslateConfigured(): Promise<boolean> {
  return !!(await resolveGoogleTranslateApiKey());
}

/** Google Cloud Translation API v2 — Gemini kullanılmaz */
export async function googleTranslateTexts(
  texts: string[],
  targetLang = "tr",
  sourceLang?: string,
): Promise<string[] | null> {
  const apiKey = await resolveGoogleTranslateApiKey();
  if (!apiKey) return null;

  const q = texts.map((t) => t.trim()).filter(Boolean);
  if (q.length === 0) return [];

  const url = new URL(TRANSLATE_URL);
  url.searchParams.set("key", apiKey);

  const body: Record<string, unknown> = { q, target: targetLang, format: "text" };
  if (sourceLang?.trim()) body.source = sourceLang.trim();

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => ({}))) as TranslateResponse;
    if (!res.ok) {
      logger.warn({ status: res.status, detail: json.error?.message }, "[googleTranslate] API hatası");
      return null;
    }
    const out = json.data?.translations?.map((t) => t.translatedText?.trim() ?? "") ?? [];
    return out.length === q.length ? out : null;
  } catch (err) {
    logger.warn({ err }, "[googleTranslate] istek başarısız");
    return null;
  }
}

export async function googleTranslateText(
  text: string,
  targetLang = "tr",
  sourceLang?: string,
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const batch = await googleTranslateTexts([trimmed], targetLang, sourceLang);
  return batch?.[0] ?? null;
}
