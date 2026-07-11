/** ISO 3166-1 alpha-2 → Unicode bölgesel bayrak emoji (🇹🇷 🇺🇸 …). */
export function countryCodeToFlagEmoji(code: string | null | undefined): string {
  const cc = String(code ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (cc.length !== 2) return "🌍";
  const base = 0x1f1e6;
  return String.fromCodePoint(
    ...([...cc] as string[]).map((char) => base + char.charCodeAt(0) - 65),
  );
}
