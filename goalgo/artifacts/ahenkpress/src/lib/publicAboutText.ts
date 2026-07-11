/**
 * Mağaza / Keşfet Hakkımızda metninden Places içe aktarım kalıntılarını ayıklar.
 */
export function cleanAboutForPublic(raw: string): string {
  let s = String(raw || "").replace(/\r\n/g, "\n").trim();
  if (!s) return "";

  const stripNoiseLine = (line: string): string | null => {
    const t = line.trim();
    if (!t) return null;
    if (/^google\s+türleri\s*:/i.test(t)) return null;
    if (/^erişilebilirlik\s*:/i.test(t)) return null;
    if (/^işletme\s+durumu\s*\(\s*google\s*\)\s*:/i.test(t)) return null;
    if (/^google\s+haritalar\s*:/i.test(t)) return null;
    if (/maps\.google\./i.test(t)) return null;
    if (/google_places_api/i.test(t)) return null;
    return t;
  };

  const fromLines = s
    .split("\n")
    .map(stripNoiseLine)
    .filter((x): x is string => Boolean(x))
    .join("\n")
    .trim();

  s = fromLines;
  s = s
    .replace(/\s*Google\s+türleri\s*:[^.。\n]+/gi, "")
    .replace(/\s*Erişilebilirlik\s*:[^.。\n]+/gi, "")
    .replace(/\s*İşletme\s+durumu\s*\(\s*Google\s*\)\s*:[^.。\n]+/gi, "")
    .replace(/\s*Google\s+Haritalar\s*:\s*\S+/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return s;
}
