/** Google Places / panel bazen çalışma saatlerini JSON olarak saklar; vitrinde düz metin göster. */
export function formatVendorWorkingHours(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      const o = JSON.parse(s) as Record<string, unknown>;
      const wt = o.weekdayText;
      if (Array.isArray(wt) && wt.length) {
        return wt.map((x) => String(x).trim()).filter(Boolean).join("\n");
      }
      const wd = o.weekdayDescriptions;
      if (Array.isArray(wd) && wd.length) {
        return wd.map((x) => String(x).trim()).filter(Boolean).join("\n");
      }
    } catch {
      /* ignore */
    }
  }
  return s;
}
