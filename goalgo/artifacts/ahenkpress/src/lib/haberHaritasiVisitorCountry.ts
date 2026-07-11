const VISITOR_COUNTRY_CACHE_KEY = "yekpare_visitor_country_v1";
const VISITOR_COUNTRY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** IANA timezone → ISO ülke kodu (yaygın bölgeler). */
const TIMEZONE_COUNTRY_HINTS: Record<string, string> = {
  "Europe/Istanbul": "TR",
  "Asia/Nicosia": "CY",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Europe/London": "GB",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Vienna": "AT",
  "Europe/Warsaw": "PL",
  "Europe/Athens": "GR",
  "Europe/Moscow": "RU",
  "Europe/Kyiv": "UA",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI",
  "Europe/Zurich": "CH",
  "Europe/Lisbon": "PT",
  "Europe/Bucharest": "RO",
  "Europe/Budapest": "HU",
  "Europe/Prague": "CZ",
  "Europe/Belgrade": "RS",
  "Europe/Sofia": "BG",
  "America/New_York": "US",
  "America/Los_Angeles": "US",
  "America/Chicago": "US",
  "America/Toronto": "CA",
  "America/Mexico_City": "MX",
  "America/Sao_Paulo": "BR",
  "America/Buenos_Aires": "AR",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Hong_Kong": "HK",
  "Asia/Singapore": "SG",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Tehran": "IR",
  "Asia/Kolkata": "IN",
  "Asia/Karachi": "PK",
  "Australia/Sydney": "AU",
  "Africa/Cairo": "EG",
  "Africa/Johannesburg": "ZA",
  "Asia/Baku": "AZ",
  "Asia/Tbilisi": "GE",
  "Asia/Almaty": "KZ",
};

type CachedVisitorCountry = {
  countryCode: string;
  source: string;
  cachedAt: number;
};

function normalizeCountryCode(raw: unknown): string | null {
  const code = String(raw ?? "").trim().toUpperCase();
  if (!code || code === "XX" || code === "T1") return null;
  if (/^[A-Z]{2}$/.test(code)) return code;
  return null;
}

function readCachedVisitorCountry(): CachedVisitorCountry | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(VISITOR_COUNTRY_CACHE_KEY) || "null") as CachedVisitorCountry;
    if (!parsed?.countryCode || !parsed.cachedAt) return null;
    if (Date.now() - parsed.cachedAt > VISITOR_COUNTRY_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedVisitorCountry(countryCode: string, source: string): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedVisitorCountry = { countryCode, source, cachedAt: Date.now() };
    localStorage.setItem(VISITOR_COUNTRY_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function detectCountryFromNavigatorLocale(): string | null {
  if (typeof navigator === "undefined") return null;
  const langs = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean);
  for (const lang of langs) {
    const region = String(lang).split(/[-_]/)[1];
    const code = normalizeCountryCode(region);
    if (code) return code;
  }
  return null;
}

function detectCountryFromTimezone(): string | null {
  if (typeof Intl === "undefined") return null;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_COUNTRY_HINTS[tz] ?? null;
  } catch {
    return null;
  }
}

async function fetchVisitorCountryFromApi(): Promise<{ countryCode: string | null; source: string }> {
  try {
    const r = await fetch("/api/map/visitor-country", { credentials: "same-origin" });
    const d = (await r.json().catch(() => ({}))) as {
      success?: boolean;
      countryCode?: string | null;
      source?: string;
    };
    if (!r.ok || d.success !== true) return { countryCode: null, source: "api_unavailable" };
    return {
      countryCode: normalizeCountryCode(d.countryCode),
      source: String(d.source ?? "geo_ip"),
    };
  } catch {
    return { countryCode: null, source: "api_error" };
  }
}

/** Ziyaretçi ülke kodu — önce geo-IP API, sonra tarayıcı locale/timezone; bilinmiyorsa TR. */
export async function resolveVisitorCountryCode(): Promise<{ countryCode: string; source: string }> {
  const cached = readCachedVisitorCountry();
  if (cached) return { countryCode: cached.countryCode, source: `cache:${cached.source}` };

  const api = await fetchVisitorCountryFromApi();
  if (api.countryCode) {
    writeCachedVisitorCountry(api.countryCode, api.source);
    return { countryCode: api.countryCode, source: api.source };
  }

  const localeCode = detectCountryFromNavigatorLocale();
  if (localeCode) {
    writeCachedVisitorCountry(localeCode, "navigator_locale");
    return { countryCode: localeCode, source: "navigator_locale" };
  }

  const tzCode = detectCountryFromTimezone();
  if (tzCode) {
    writeCachedVisitorCountry(tzCode, "timezone");
    return { countryCode: tzCode, source: "timezone" };
  }

  return { countryCode: "TR", source: "fallback_tr" };
}
