import { Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/apiBase";

type SuperligMatchResultRow = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  week: number | null;
  date?: string | null;
  time?: string | null;
  played?: boolean;
};

type SuperligRecentMatchesResponse = {
  ok: true;
  hafta: number | null;
  updatedAt: string | null;
  matches: SuperligMatchResultRow[];
};

function abbreviateTeamName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "—";
  const known: Record<string, string> = {
    "galatasaray": "GS",
    "fenerbahçe": "FB",
    "fenerbahce": "FB",
    "beşiktaş": "BJK",
    "besiktas": "BJK",
    "trabzonspor": "TS",
  };
  const lower = trimmed.toLowerCase().replace(/\s+a\.ş\.?$/i, "").replace(/\s+sk$/i, "").trim();
  for (const [key, abbr] of Object.entries(known)) {
    if (lower.includes(key)) return abbr;
  }
  const words = trimmed.replace(/\s+A\.Ş\.?$/i, "").split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w.charAt(0).toUpperCase())
      .join("");
  }
  return trimmed.slice(0, 4).toUpperCase();
}

async function fetchRecentMatches(signal?: AbortSignal): Promise<SuperligRecentMatchesResponse | null> {
  const res = await fetch(apiUrl("/api/public/superlig/fikstur?limit=6"), { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as SuperligRecentMatchesResponse;
  if (!data?.ok || !Array.isArray(data.matches)) return null;
  return data;
}

export function MatchResultsWidget({ accent }: { accent: string }) {
  const query = useQuery({
    queryKey: ["/api/public/superlig/fikstur", "sidebar"],
    queryFn: ({ signal }) => fetchRecentMatches(signal),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const matches = query.data?.matches ?? [];

  return (
    <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
        <Trophy className="w-4 h-4" style={{ color: accent }} />
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Son maç sonuçları</h3>
      </div>
      {query.isLoading ? (
        <p className="text-xs text-gray-500 py-2">Maç sonuçları yükleniyor…</p>
      ) : matches.length > 0 ? (
        <ul className="space-y-2">
          {matches.map((m, i) => (
            <li
              key={`${m.homeTeam}-${m.awayTeam}-${m.week ?? i}`}
              className="flex items-center justify-between text-xs rounded-lg px-2 py-2 bg-gray-50"
            >
              <span className="font-bold text-gray-800">
                {abbreviateTeamName(m.homeTeam)}{" "}
                <span className="text-gray-400 font-black mx-1">
                  {m.homeScore ?? 0} — {m.awayScore ?? 0}
                </span>{" "}
                {abbreviateTeamName(m.awayTeam)}
              </span>
              <span className="text-[10px] text-gray-500 shrink-0 ml-2">Süper Lig</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500 py-2">Maç sonuçları şu an kullanılamıyor.</p>
      )}
    </div>
  );
}
