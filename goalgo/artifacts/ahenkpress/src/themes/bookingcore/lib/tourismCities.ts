/** Turizm arama filtreleri — API boş dönerse kullanılan Türkiye şehirleri */
export const TOURISM_FALLBACK_CITIES = [
  "İstanbul",
  "Ankara",
  "Antalya",
  "İzmir",
  "Bodrum",
  "Kapadokya",
  "Fethiye",
  "Trabzon",
  "Bursa",
  "Muğla",
  "Kaş",
  "Alanya",
  "Marmaris",
] as const;

export function mergeTourismCityLists(...lists: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const raw of list ?? []) {
      const name = String(raw ?? "").trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(name);
    }
  }
  return out.sort((a, b) => a.localeCompare(b, "tr"));
}
