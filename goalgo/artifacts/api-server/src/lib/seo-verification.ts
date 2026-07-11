export type SeoVerification = {
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  yandexVerification?: string;
  customMetaTags?: { name: string; content: string }[];
};

export type SeoVerificationStore = SeoVerification & {
  byHost?: Record<string, SeoVerification>;
};

function cleanVerificationContent(raw: unknown, max = 500): string {
  return String(raw ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** HTML meta etiketi, content değeri veya google*.html dosya adını ayıklar. */
export function parseVerificationFieldInput(raw: unknown, metaName: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  const escaped = metaName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const metaRe1 = new RegExp(`<meta\\s+[^>]*name=["']${escaped}["'][^>]*content=["']([^"']+)["']`, "i");
  const metaRe2 = new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*name=["']${escaped}["']`, "i");
  const match = s.match(metaRe1) || s.match(metaRe2);
  if (match?.[1]) return cleanVerificationContent(match[1]);

  if (metaName === "google-site-verification") {
    const fileLine = s.match(/google-site-verification:\s*(google[a-z0-9]+\.html)/i);
    if (fileLine?.[1]) return fileLine[1];
    if (/^google[a-z0-9]+\.html$/i.test(s)) return s;
  }

  return cleanVerificationContent(s);
}

export function normalizeHostKey(host: string | null | undefined): string {
  return String(host ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0]
    ?.trim() ?? "";
}

function normalizeSeoVerificationCore(raw: unknown): SeoVerification | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: SeoVerification = {};
  const google = parseVerificationFieldInput(o.googleSiteVerification, "google-site-verification");
  const bing = parseVerificationFieldInput(o.bingSiteVerification, "msvalidate.01");
  const yandex = parseVerificationFieldInput(o.yandexVerification, "yandex-verification");
  if (google) out.googleSiteVerification = google;
  if (bing) out.bingSiteVerification = bing;
  if (yandex) out.yandexVerification = yandex;

  const rawCustom = Array.isArray(o.customMetaTags) ? o.customMetaTags : [];
  const customMetaTags = rawCustom
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const r = item as Record<string, unknown>;
      const name = String(r.name ?? "").trim();
      const content = cleanVerificationContent(r.content);
      if (!/^[a-zA-Z0-9._:-]{1,80}$/.test(name) || !content) return null;
      return { name, content };
    })
    .filter(Boolean) as { name: string; content: string }[];
  if (customMetaTags.length) out.customMetaTags = customMetaTags;

  return Object.keys(out).length ? out : null;
}

export function normalizeSeoVerification(raw: unknown): SeoVerificationStore | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const core = normalizeSeoVerificationCore(o);
  const rawByHost = o.byHost;
  const byHost: Record<string, SeoVerification> = {};

  if (rawByHost && typeof rawByHost === "object" && !Array.isArray(rawByHost)) {
    for (const [k, v] of Object.entries(rawByHost)) {
      const hk = normalizeHostKey(k);
      if (!hk) continue;
      const entry = normalizeSeoVerificationCore(v);
      if (entry) byHost[hk] = entry;
    }
  }

  if (!core && !Object.keys(byHost).length) return null;
  const out: SeoVerificationStore = { ...(core ?? {}) };
  if (Object.keys(byHost).length) out.byHost = byHost;
  return out;
}

/** İstek host'una göre portal doğrulama kodu (varsayılan + byHost). */
export function resolveSeoVerificationForHost(
  store: SeoVerificationStore | SeoVerification | null | undefined,
  host: string | null | undefined,
): SeoVerification | null {
  if (!store) return null;
  const key = normalizeHostKey(host);
  const byHost =
    store && typeof store === "object" && "byHost" in store && store.byHost && typeof store.byHost === "object"
      ? store.byHost
      : undefined;

  if (key && byHost) {
    const hostEntry = byHost[key] ?? byHost[`www.${key}`];
    if (hostEntry) {
      const merged = normalizeSeoVerificationCore({ ...store, ...hostEntry });
      if (merged) return merged;
    }
  }

  return normalizeSeoVerificationCore(store);
}

export function parseSeoVerificationJson(raw: string | null | undefined): SeoVerificationStore | null {
  if (!raw?.trim()) return null;
  try {
    return normalizeSeoVerification(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function serializeSeoVerificationJson(v: SeoVerificationStore | SeoVerification | null): string | null {
  if (!v) return null;
  const normalized = normalizeSeoVerification(v);
  return normalized ? JSON.stringify(normalized) : null;
}
