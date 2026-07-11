import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/apiBase";
import {
  resolveSuperligTeamMeta,
  superligTeamLogoUrl,
  type SuperligTeamMeta,
} from "@/lib/superligTeamMeta";
import "@/styles/hmSuperLigTeamStrip.css";

type SuperligStandingRow = {
  rank: number;
  team: string;
  played: number;
  points: number;
};

type SuperligStandingsResponse = {
  ok: true;
  hafta: number | null;
  updatedAt: string | null;
  standings: SuperligStandingRow[];
};

type StripTeam = SuperligTeamMeta & {
  points: number;
  rank: number;
};

async function fetchSuperligStandings(signal?: AbortSignal): Promise<SuperligStandingsResponse | null> {
  const res = await fetch(apiUrl("/api/public/superlig/puan"), { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as SuperligStandingsResponse;
  if (!data?.ok || !Array.isArray(data.standings)) return null;
  return data;
}

function teamAbbrev(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join("")
      .toUpperCase();
  }
  return label.slice(0, 3).toUpperCase();
}

function TeamLogo({ meta }: { meta: StripTeam }) {
  return (
    <div className="hm-superlig-team-logo-wrap">
      <img
        src={superligTeamLogoUrl(meta.logoId)}
        alt={meta.label}
        className="hm-superlig-team-logo"
        loading="lazy"
        decoding="async"
        onError={(event) => {
          event.currentTarget.style.display = "none";
          const fallback = event.currentTarget.nextElementSibling;
          if (fallback instanceof HTMLElement) fallback.hidden = false;
        }}
      />
      <span className="hm-superlig-team-fallback" hidden>
        {teamAbbrev(meta.label)}
      </span>
    </div>
  );
}

export type HmSuperLigTeamStripProps = {
  selectedTeamKey: string | null;
  onTeamSelect: (teamKey: string | null) => void;
  className?: string;
};

/** Süper Lig takım logoları + puan — spor kategori manşetinin üstünde. */
export function HmSuperLigTeamStrip({
  selectedTeamKey,
  onTeamSelect,
  className = "",
}: HmSuperLigTeamStripProps) {
  const standingsQuery = useQuery({
    queryKey: ["/api/public/superlig/puan", "hm-team-strip"],
    queryFn: ({ signal }) => fetchSuperligStandings(signal),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const teams = useMemo(() => {
    const rows = standingsQuery.data?.standings ?? [];
    const out: StripTeam[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const meta = resolveSuperligTeamMeta(row.team);
      if (!meta || seen.has(meta.key)) continue;
      seen.add(meta.key);
      out.push({
        ...meta,
        points: row.points,
        rank: row.rank,
      });
    }
    return out.sort((a, b) => a.rank - b.rank);
  }, [standingsQuery.data?.standings]);

  if (standingsQuery.isLoading) {
    return (
      <section className={`hm-superlig-team-strip ${className}`.trim()} aria-label="Süper Lig takımları">
        <div className="hm-superlig-team-strip-loading">Süper Lig puan durumu yükleniyor…</div>
      </section>
    );
  }

  if (teams.length === 0) return null;

  return (
    <section className={`hm-superlig-team-strip ${className}`.trim()} aria-label="Süper Lig takımları">
      <div className="hm-superlig-team-strip-inner">
        {selectedTeamKey ? (
          <button
            type="button"
            className="hm-superlig-team-chip hm-superlig-team-chip-all"
            onClick={() => onTeamSelect(null)}
            aria-pressed={false}
          >
            Tümü
          </button>
        ) : null}
        {teams.map((team) => {
          const active = selectedTeamKey === team.key;
          return (
            <button
              key={team.key}
              type="button"
              className={`hm-superlig-team-chip ${active ? "is-active" : ""}`.trim()}
              onClick={() => onTeamSelect(active ? null : team.key)}
              aria-pressed={active}
              title={`${team.label} haberleri`}
            >
              <TeamLogo meta={team} />
              <span className="hm-superlig-team-points">{team.points}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
