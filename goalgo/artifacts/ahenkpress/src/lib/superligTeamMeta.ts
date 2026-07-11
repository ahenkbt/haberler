export type SuperligTeamMeta = {
  key: string;
  label: string;
  logoId: number;
  filterTerms: string[];
};

const TR_LOWER = (value: string): string => value.toLocaleLowerCase("tr-TR");

/** Strip sponsor prefixes and legal suffixes from TFF puan table labels. */
export function normalizeSuperligTeamLabel(raw: string): string {
  return TR_LOWER(raw)
    .replace(/\s+a\.ş\.?$/g, "")
    .replace(/\s+sk$/g, "")
    .replace(/[^a-z0-9çğıöşü]+/g, " ")
    .trim();
}

const SUPERLIG_TEAMS: SuperligTeamMeta[] = [
  { key: "galatasaray", label: "Galatasaray", logoId: 645, filterTerms: ["galatasaray"] },
  { key: "fenerbahce", label: "Fenerbahçe", logoId: 611, filterTerms: ["fenerbahçe", "fenerbahce"] },
  { key: "besiktas", label: "Beşiktaş", logoId: 549, filterTerms: ["beşiktaş", "besiktas"] },
  { key: "trabzonspor", label: "Trabzonspor", logoId: 564, filterTerms: ["trabzonspor"] },
  { key: "antalyaspor", label: "Antalyaspor", logoId: 1005, filterTerms: ["antalyaspor", "antalya spor"] },
  { key: "kasimpasa", label: "Kasımpaşa", logoId: 3573, filterTerms: ["kasımpaşa", "kasimpasa"] },
  { key: "samsunspor", label: "Samsunspor", logoId: 3603, filterTerms: ["samsunspor"] },
  { key: "genclerbirligi", label: "Gençlerbirliği", logoId: 3570, filterTerms: ["gençlerbirliği", "genclerbirligi"] },
  { key: "rizespor", label: "Rizespor", logoId: 3588, filterTerms: ["rizespor", "çaykur", "caykur"] },
  { key: "goztepe", label: "Göztepe", logoId: 994, filterTerms: ["göztepe", "goztepe"] },
  { key: "eyupspor", label: "Eyüpspor", logoId: 998, filterTerms: ["eyüpspor", "eyupspor"] },
  { key: "konyaspor", label: "Konyaspor", logoId: 3571, filterTerms: ["konyaspor"] },
  { key: "kocaelispor", label: "Kocaelispor", logoId: 7411, filterTerms: ["kocaelispor"] },
  { key: "karagumruk", label: "Karagümrük", logoId: 3589, filterTerms: ["karagümrük", "karagumruk", "fatih karagümrük", "fatih karagumruk"] },
  { key: "basaksehir", label: "Başakşehir", logoId: 996, filterTerms: ["başakşehir", "basaksehir"] },
  { key: "alanyaspor", label: "Alanyaspor", logoId: 3576, filterTerms: ["alanyaspor", "alanya spor"] },
  { key: "kayserispor", label: "Kayserispor", logoId: 1001, filterTerms: ["kayserispor"] },
  { key: "gaziantep", label: "Gaziantep FK", logoId: 3575, filterTerms: ["gaziantep fk", "gaziantep"] },
];

const TEAM_BY_KEY = new Map(SUPERLIG_TEAMS.map((team) => [team.key, team]));

/** Longest keyword match first so sponsored TFF labels resolve reliably. */
export function resolveSuperligTeamMeta(teamName: string): SuperligTeamMeta | null {
  const norm = normalizeSuperligTeamLabel(teamName);
  if (!norm) return null;

  let best: { meta: SuperligTeamMeta; len: number } | null = null;
  for (const meta of SUPERLIG_TEAMS) {
    for (const term of meta.filterTerms) {
      const needle = normalizeSuperligTeamLabel(term);
      if (!needle || !norm.includes(needle)) continue;
      if (!best || needle.length > best.len) {
        best = { meta, len: needle.length };
      }
    }
  }
  return best?.meta ?? null;
}

export function getSuperligTeamMetaByKey(key: string | null | undefined): SuperligTeamMeta | null {
  const trimmed = String(key ?? "").trim();
  if (!trimmed) return null;
  return TEAM_BY_KEY.get(trimmed) ?? null;
}

export function superligTeamLogoUrl(logoId: number): string {
  return `https://media.api-sports.io/football/teams/${logoId}.png`;
}

export function superligTeamCategoryHref(kategoriHref: string, teamKey: string): string {
  const base = String(kategoriHref ?? "").trim() || "/kategori/spor";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}takim=${encodeURIComponent(teamKey)}`;
}

function newsSearchText(item: any): string {
  const tags = Array.isArray(item?.tags) ? item.tags.join(" ") : "";
  return TR_LOWER(
    [item?.title, item?.spot, item?.summary, item?.content, tags].filter(Boolean).join(" "),
  );
}

export function newsMatchesSuperligTeam(item: any, meta: SuperligTeamMeta): boolean {
  const haystack = newsSearchText(item);
  if (!haystack) return false;
  return meta.filterTerms.some((term) => haystack.includes(TR_LOWER(term)));
}
