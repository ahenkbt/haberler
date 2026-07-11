import { logger } from "./logger";

const TFF_API_BASE = "https://tff.kkerem.com/";
const TTL_MS = 20 * 60 * 1000;

export type TffLeagueId = "superlig" | "1lig";

export type SuperligStandingRow = {
  rank: number;
  team: string;
  played: number;
  points: number;
};

export type SuperligStandingsPayload = {
  ok: true;
  league: TffLeagueId;
  hafta: number | null;
  updatedAt: string | null;
  standings: SuperligStandingRow[];
};

export type SuperligMatchResultRow = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  week: number | null;
  date: string | null;
  time: string | null;
  played: boolean;
};

export type SuperligRecentMatchesPayload = {
  ok: true;
  league: TffLeagueId;
  hafta: number | null;
  updatedAt: string | null;
  matches: SuperligMatchResultRow[];
};

type TffPuanResponse = {
  durum?: string;
  hafta?: number;
  guncellendi?: string;
  puan_cetveli?: Array<{
    sira?: number;
    takim?: string;
    oynan?: number;
    puan?: number;
  }>;
};

type TffFiksturRow = {
  hafta?: number;
  ev_takim?: string;
  dep_takim?: string;
  ev_sahibi?: string;
  deplasman?: string;
  ev_skor?: number | string | null;
  dep_skor?: number | string | null;
  skor_ev?: number | string | null;
  skor_dep?: number | string | null;
  tarih?: string | null;
  saat?: string | null;
  mac_tarihi?: string | null;
  mac_saati?: string | null;
  durum?: string;
  oynandi?: boolean | string | number | null;
};

type TffFiksturResponse = {
  durum?: string;
  hafta?: number;
  guncellendi?: string;
  fikstur?: TffFiksturRow[];
  maclar?: TffFiksturRow[];
};

type StandingsCacheEntry = {
  payload: SuperligStandingsPayload;
  fetchedAt: number;
};

type FiksturCacheEntry = {
  recent: SuperligRecentMatchesPayload;
  week: SuperligRecentMatchesPayload;
  fetchedAt: number;
};

const standingsCache = new Map<TffLeagueId, StandingsCacheEntry>();
const fiksturCache = new Map<TffLeagueId, FiksturCacheEntry>();

/** TFF kkerem.com lig parametresi — 1. Lig: `lig=1lig`, Süper Lig: varsayılan (param yok). */
export function normalizeTffLeagueId(raw: unknown): TffLeagueId {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (value === "1lig" || value === "1-lig" || value === "birincilig" || value === "1") return "1lig";
  return "superlig";
}

function resolveSuperligApiKey(): string | null {
  const key =
    process.env.TFF_SUPERLIG_API_KEY?.trim() ||
    process.env.SUPERLIG_API_KEY?.trim() ||
    "";
  return key || null;
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Yekpare/1.0", Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function buildTffApiUrl(tip: "puan" | "fiktur", league: TffLeagueId, apiKey: string): string {
  const params = new URLSearchParams({
    apikey: apiKey,
    tip,
  });
  if (league === "1lig") params.set("lig", "1lig");
  return `${TFF_API_BASE}?${params.toString()}`;
}

function parseScore(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isFinishedFiksturRow(row: TffFiksturRow): boolean {
  const status = String(row.durum ?? "").trim().toLowerCase();
  if (status === "oynandi" || status === "tamamlandi" || status === "completed" || status === "finished") {
    return true;
  }
  if (row.oynandi === true || row.oynandi === 1 || row.oynandi === "1") return true;
  const homeScore = parseScore(row.ev_skor ?? row.skor_ev);
  const awayScore = parseScore(row.dep_skor ?? row.skor_dep);
  return homeScore != null && awayScore != null;
}

function mapFiksturRow(row: TffFiksturRow): SuperligMatchResultRow | null {
  const homeTeam = String(row.ev_takim ?? row.ev_sahibi ?? "").trim();
  const awayTeam = String(row.dep_takim ?? row.deplasman ?? "").trim();
  if (!homeTeam || !awayTeam) return null;
  const played = isFinishedFiksturRow(row);
  const homeScore = parseScore(row.ev_skor ?? row.skor_ev);
  const awayScore = parseScore(row.dep_skor ?? row.skor_dep);
  const week = Number.isFinite(Number(row.hafta)) ? Number(row.hafta) : null;
  const date = String(row.tarih ?? row.mac_tarihi ?? "").trim() || null;
  const time = String(row.saat ?? row.mac_saati ?? "").trim() || null;
  return {
    homeTeam,
    awayTeam,
    homeScore: played ? homeScore ?? 0 : homeScore,
    awayScore: played ? awayScore ?? 0 : awayScore,
    week,
    date,
    time,
    played,
  };
}

function parseRecentMatches(data: TffFiksturResponse, league: TffLeagueId, limit = 8): SuperligRecentMatchesPayload {
  const rows = Array.isArray(data.fikstur) ? data.fikstur : Array.isArray(data.maclar) ? data.maclar : [];
  const matches: SuperligMatchResultRow[] = rows
    .map(mapFiksturRow)
    .filter((row): row is SuperligMatchResultRow => row != null && row.played)
    .slice(0, limit);

  return {
    ok: true,
    league,
    hafta: Number.isFinite(Number(data.hafta)) ? Number(data.hafta) : null,
    updatedAt: data.guncellendi ? String(data.guncellendi) : null,
    matches,
  };
}

function parseCurrentWeekFixtures(
  data: TffFiksturResponse,
  league: TffLeagueId,
  limit = 10,
): SuperligRecentMatchesPayload {
  const currentWeek = Number.isFinite(Number(data.hafta)) ? Number(data.hafta) : null;
  const rows = Array.isArray(data.fikstur) ? data.fikstur : Array.isArray(data.maclar) ? data.maclar : [];
  const matches: SuperligMatchResultRow[] = rows
    .map(mapFiksturRow)
    .filter((row): row is SuperligMatchResultRow => {
      if (!row) return false;
      if (currentWeek == null) return true;
      return row.week == null || row.week === currentWeek;
    })
    .slice(0, limit);

  return {
    ok: true,
    league,
    hafta: currentWeek,
    updatedAt: data.guncellendi ? String(data.guncellendi) : null,
    matches,
  };
}

function parseStandings(data: TffPuanResponse, league: TffLeagueId): SuperligStandingsPayload {
  const rows = Array.isArray(data.puan_cetveli) ? data.puan_cetveli : [];
  const standings: SuperligStandingRow[] = rows
    .map((row) => ({
      rank: Number(row.sira) || 0,
      team: String(row.takim ?? "").trim(),
      played: Number(row.oynan) || 0,
      points: Number(row.puan) || 0,
    }))
    .filter((row) => row.rank > 0 && row.team)
    .sort((a, b) => a.rank - b.rank);

  return {
    ok: true,
    league,
    hafta: Number.isFinite(Number(data.hafta)) ? Number(data.hafta) : null,
    updatedAt: data.guncellendi ? String(data.guncellendi) : null,
    standings,
  };
}

async function fetchTffPuan(league: TffLeagueId): Promise<TffPuanResponse> {
  const apiKey = resolveSuperligApiKey();
  if (!apiKey) throw new Error("TFF API key not configured");
  const url = buildTffApiUrl("puan", league, apiKey);
  const data = await fetchJsonWithTimeout<TffPuanResponse>(url);
  if (data.durum !== "basarili") {
    throw new Error(`TFF API durum: ${String(data.durum ?? "unknown")}`);
  }
  return data;
}

async function fetchTffFikstur(league: TffLeagueId): Promise<TffFiksturResponse> {
  const apiKey = resolveSuperligApiKey();
  if (!apiKey) throw new Error("TFF API key not configured");
  const url = buildTffApiUrl("fiktur", league, apiKey);
  const data = await fetchJsonWithTimeout<TffFiksturResponse>(url);
  if (data.durum !== "basarili") {
    throw new Error(`TFF API durum: ${String(data.durum ?? "unknown")}`);
  }
  return data;
}

export async function getSuperligStandings(league: TffLeagueId = "superlig"): Promise<SuperligStandingsPayload | null> {
  const cached = standingsCache.get(league);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.payload;
  }

  if (!resolveSuperligApiKey()) {
    logger.warn("superlig: TFF_SUPERLIG_API_KEY / SUPERLIG_API_KEY not configured");
    return cached?.payload ?? null;
  }

  try {
    const data = await fetchTffPuan(league);
    const payload = parseStandings(data, league);
    standingsCache.set(league, { payload, fetchedAt: Date.now() });
    logger.info({ league, teams: payload.standings.length, hafta: payload.hafta }, "superlig: standings cache refreshed");
    return payload;
  } catch (err) {
    logger.warn({ err, league }, "superlig: standings fetch failed — using stale cache if available");
    return cached?.payload ?? null;
  }
}

export async function getSuperligRecentMatches(
  limit = 8,
  scope: "recent" | "week" = "recent",
  league: TffLeagueId = "superlig",
): Promise<SuperligRecentMatchesPayload | null> {
  const cached = fiksturCache.get(league);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return scope === "week" ? cached.week : cached.recent;
  }

  if (!resolveSuperligApiKey()) {
    logger.warn("superlig: TFF_SUPERLIG_API_KEY / SUPERLIG_API_KEY not configured");
    return cached?.[scope] ?? null;
  }

  try {
    const data = await fetchTffFikstur(league);
    const recent = parseRecentMatches(data, league, limit);
    const week = parseCurrentWeekFixtures(data, league, Math.max(limit, 10));
    fiksturCache.set(league, { recent, week, fetchedAt: Date.now() });
    logger.info({ league, matches: recent.matches.length, hafta: recent.hafta }, "superlig: fikstur cache refreshed");
    return scope === "week" ? week : recent;
  } catch (err) {
    logger.warn({ err, league }, "superlig: fikstur fetch failed — using stale cache if available");
    return cached?.[scope] ?? null;
  }
}
