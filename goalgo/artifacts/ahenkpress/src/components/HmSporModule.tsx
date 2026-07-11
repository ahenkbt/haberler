import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { HmNewsImage, resolveNewsItemImageFallbackUrl, resolveNewsItemImageUrl } from "@/components/HmNewsImage";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";
import { apiUrl } from "@/lib/apiBase";
import "@/styles/hmSporModule.css";

type SporNewsItem = {
  id?: string | number | null;
  slug?: string | null;
  title?: string | null;
  imageUrl?: string | null;
  image?: string | null;
  thumbnailUrl?: string | null;
  thumbnail?: string | null;
  enclosure?: string | { url?: string | null } | null;
};

type LeagueId = "superlig" | "1lig";
type PanelView = "standings" | "fixtures";

type StandingRow = {
  rank: number;
  team: string;
  played: number;
  points: number;
};

type FixtureRow = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  week: number | null;
  date: string | null;
  time: string | null;
  played: boolean;
};

type StandingsResponse = {
  ok: true;
  league?: LeagueId;
  hafta: number | null;
  updatedAt: string | null;
  standings: StandingRow[];
};

type FixturesResponse = {
  ok: true;
  league?: LeagueId;
  hafta: number | null;
  updatedAt: string | null;
  matches: FixtureRow[];
};

const LEAGUE_OPTIONS: Array<{ id: LeagueId; label: string }> = [
  { id: "superlig", label: "Süper Lig" },
  { id: "1lig", label: "1. Lig" },
];

function newsTitle(raw: unknown): string {
  return decodeHtmlEntities(String(raw ?? "").trim()) || "Haber";
}

function shortTeamName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "—";
  const words = trimmed.replace(/\s+A\.Ş\.?$/i, "").split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("");
  }
  return trimmed.slice(0, 10);
}

function formatFixtureDateTime(date: string | null, time: string | null): string {
  const parts = [date, time].filter((part) => String(part ?? "").trim());
  return parts.join(" ").trim();
}

function leagueQueryParam(league: LeagueId): string {
  return league === "1lig" ? "lig=1lig" : "";
}

async function fetchStandings(league: LeagueId, signal?: AbortSignal): Promise<StandingsResponse | null> {
  const qs = leagueQueryParam(league);
  const res = await fetch(apiUrl(`/api/public/superlig/puan${qs ? `?${qs}` : ""}`), { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as StandingsResponse;
  if (!data?.ok || !Array.isArray(data.standings)) return null;
  return data;
}

async function fetchFixtures(league: LeagueId, signal?: AbortSignal): Promise<FixturesResponse | null> {
  const params = new URLSearchParams({ scope: "week", limit: "10" });
  if (league === "1lig") params.set("lig", "1lig");
  const res = await fetch(apiUrl(`/api/public/superlig/fikstur?${params.toString()}`), { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as FixturesResponse;
  if (!data?.ok || !Array.isArray(data.matches)) return null;
  return data;
}

function StandingsTable({ rows, hafta }: { rows: StandingRow[]; hafta: number | null }) {
  return (
    <>
      <div className="hm-spor-module-standings-table-wrap">
        <table className="hm-spor-module-standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Takım</th>
              <th>O</th>
              <th>Puan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.rank}-${row.team}`}>
                <td>{row.rank}</td>
                <td>{row.team}</td>
                <td>{row.played}</td>
                <td>{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hafta != null ? <div className="hm-spor-module-standings-meta">{hafta}. hafta</div> : null}
    </>
  );
}

function FixturesList({ rows, hafta }: { rows: FixtureRow[]; hafta: number | null }) {
  return (
    <>
      <ul className="hm-spor-module-fixtures">
        {rows.map((match, index) => {
          const dateTime = formatFixtureDateTime(match.date, match.time);
          const scoreLabel =
            match.played && match.homeScore != null && match.awayScore != null
              ? `${match.homeScore} - ${match.awayScore}`
              : null;
          return (
            <li
              key={`${match.homeTeam}-${match.awayTeam}-${match.week ?? index}`}
              className="hm-spor-module-fixture"
            >
              <div className="hm-spor-module-fixture-teams">
                <span>{shortTeamName(match.homeTeam)}</span>
                <span className="hm-spor-module-fixture-vs">{scoreLabel ?? "vs"}</span>
                <span>{shortTeamName(match.awayTeam)}</span>
              </div>
              <div className="hm-spor-module-fixture-meta">
                {dateTime ? <span>{dateTime}</span> : null}
                {!dateTime && match.week != null ? <span>{match.week}. hafta</span> : null}
              </div>
            </li>
          );
        })}
      </ul>
      {hafta != null ? <div className="hm-spor-module-standings-meta">{hafta}. hafta</div> : null}
    </>
  );
}

export type HmSporModuleProps = {
  items: SporNewsItem[];
  newsHref: (n: SporNewsItem) => string;
  kategoriHref?: string;
  categoryTitle?: string;
  className?: string;
};

/** SPOR haber grid + Süper Lig / 1. Lig puan durumu ve fikstür — tüm HM vitrin temaları. */
export function HmSporModule({
  items,
  newsHref,
  kategoriHref,
  categoryTitle = "SPOR",
  className = "",
}: HmSporModuleProps) {
  const [activeLeague, setActiveLeague] = useState<LeagueId>("superlig");
  const [activeView, setActiveView] = useState<PanelView>("standings");
  const newsItems = items.slice(0, 4);

  const birLigStandingsQuery = useQuery({
    queryKey: ["/api/public/superlig/puan", "hm-spor-module", "1lig", "probe"],
    queryFn: ({ signal }) => fetchStandings("1lig", signal),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const birLigFixturesQuery = useQuery({
    queryKey: ["/api/public/superlig/fikstur", "hm-spor-module", "1lig", "probe", "week"],
    queryFn: ({ signal }) => fetchFixtures("1lig", signal),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const birLigAvailable = useMemo(() => {
    if (birLigStandingsQuery.isLoading || birLigFixturesQuery.isLoading) return false;
    const standingsCount = birLigStandingsQuery.data?.standings?.length ?? 0;
    const fixturesCount = birLigFixturesQuery.data?.matches?.length ?? 0;
    return standingsCount > 0 || fixturesCount > 0;
  }, [
    birLigFixturesQuery.data?.matches?.length,
    birLigFixturesQuery.isLoading,
    birLigStandingsQuery.data?.standings?.length,
    birLigStandingsQuery.isLoading,
  ]);

  const leagueOptions = useMemo(
    () => (birLigAvailable ? LEAGUE_OPTIONS : LEAGUE_OPTIONS.filter((row) => row.id !== "1lig")),
    [birLigAvailable],
  );

  useEffect(() => {
    if (activeLeague === "1lig" && !birLigAvailable && !birLigStandingsQuery.isLoading && !birLigFixturesQuery.isLoading) {
      setActiveLeague("superlig");
    }
  }, [activeLeague, birLigAvailable, birLigFixturesQuery.isLoading, birLigStandingsQuery.isLoading]);

  const standingsQuery = useQuery({
    queryKey: ["/api/public/superlig/puan", "hm-spor-module", activeLeague],
    queryFn: ({ signal }) => fetchStandings(activeLeague, signal),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const fixturesQuery = useQuery({
    queryKey: ["/api/public/superlig/fikstur", "hm-spor-module", activeLeague, "week"],
    queryFn: ({ signal }) => fetchFixtures(activeLeague, signal),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const standings = standingsQuery.data?.standings ?? [];
  const standingsHafta = standingsQuery.data?.hafta ?? null;
  const fixtures = fixturesQuery.data?.matches ?? [];
  const fixturesHafta = fixturesQuery.data?.hafta ?? null;
  const hasPanelData =
    standings.length > 0 ||
    fixtures.length > 0 ||
    standingsQuery.isLoading ||
    fixturesQuery.isLoading;

  if (newsItems.length === 0 && !hasPanelData) {
    return null;
  }

  const leagueLabel = leagueOptions.find((row) => row.id === activeLeague)?.label ?? "Lig";

  return (
    <section
      className={`hm-spor-module ${className}`.trim()}
      data-hm-home-module="sporModule"
      data-hm-cat-slug="spor"
    >
      <div className="hm-spor-module-inner">
        <div className="hm-spor-module-news">
          {kategoriHref ? (
            <Link href={kategoriHref} className="hm-spor-module-tab">
              {categoryTitle}
            </Link>
          ) : (
            <span className="hm-spor-module-tab">{categoryTitle}</span>
          )}
          <div className="hm-spor-module-news-panel">
            {newsItems.length > 0 ? (
              <div className="hm-spor-module-grid">
                {newsItems.map((n) => (
                  <Link key={n.id ?? n.slug} href={newsHref(n)} className="hm-spor-module-card group">
                    <div className="hm-spor-module-thumb">
                      <HmNewsImage
                        src={resolveNewsItemImageUrl(n)}
                        fallbackSrc={resolveNewsItemImageFallbackUrl(n)}
                        alt={newsTitle(n.title)}
                        loading="lazy"
                      />
                    </div>
                    <h3>{newsTitle(n.title)}</h3>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="hm-spor-module-empty">Spor haberi bulunamadı.</div>
            )}
          </div>
        </div>

        <aside className="hm-spor-module-standings">
          <div className="hm-spor-module-standings-leagues" role="tablist" aria-label="Futbol ligleri">
            {leagueOptions.map((league) => (
              <button
                key={league.id}
                type="button"
                role="tab"
                className={`hm-spor-module-standings-league ${activeLeague === league.id ? "is-active" : ""}`.trim()}
                aria-selected={activeLeague === league.id}
                onClick={() => setActiveLeague(league.id)}
              >
                {league.label}
              </button>
            ))}
          </div>
          <div className="hm-spor-module-standings-head" role="tablist" aria-label={`${leagueLabel} verileri`}>
            <button
              type="button"
              role="tab"
              className={`hm-spor-module-standings-tab ${activeView === "standings" ? "is-active" : ""}`.trim()}
              aria-selected={activeView === "standings"}
              onClick={() => setActiveView("standings")}
            >
              Puan Durumu
            </button>
            <button
              type="button"
              role="tab"
              className={`hm-spor-module-standings-tab ${activeView === "fixtures" ? "is-active" : ""}`.trim()}
              aria-selected={activeView === "fixtures"}
              onClick={() => setActiveView("fixtures")}
            >
              Fikstür
            </button>
          </div>
          <div className="hm-spor-module-standings-body">
            {activeView === "standings" ? (
              standingsQuery.isLoading ? (
                <div className="hm-spor-module-empty hm-spor-module-empty--compact">Puan durumu yükleniyor…</div>
              ) : standings.length > 0 ? (
                <StandingsTable rows={standings} hafta={standingsHafta} />
              ) : (
                <div className="hm-spor-module-empty hm-spor-module-empty--compact">
                  {leagueLabel} puan durumu şu an kullanılamıyor.
                </div>
              )
            ) : fixturesQuery.isLoading ? (
              <div className="hm-spor-module-empty hm-spor-module-empty--compact">Fikstür yükleniyor…</div>
            ) : fixtures.length > 0 ? (
              <FixturesList rows={fixtures} hafta={fixturesHafta} />
            ) : (
              <div className="hm-spor-module-empty hm-spor-module-empty--compact">
                {leagueLabel} fikstürü şu an kullanılamıyor.
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
