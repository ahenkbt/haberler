import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";

/** UTF-8 metnin Latin-1 gibi okunmasından kaynaklanan bozuk karakterleri onarır. */
export function repairTurkishUtf8Mojibake(raw: string): string {
  const value = String(raw ?? "");
  if (!value || !/[\u00c3\u00c4\u00c5\u00e2\u20ac]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from(value, (ch) => ch.charCodeAt(0) & 0xff);
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (repaired && repaired !== value && !repaired.includes("\uFFFD")) return repaired;
  } catch {
    /* not mojibake */
  }
  return value;
}

/** RSS / editör kaynaklı HTML entity'leri düz metne çevirir. */
export function decodeHmDisplayText(raw: unknown): string {
  return repairTurkishUtf8Mojibake(decodeHtmlEntities(String(raw ?? "")));
}

/** Nav şeridi etiketleri — Türkçe locale ile büyük harf (CSS `uppercase` İ/ı bozar). */
export function formatHmNavLabel(raw: unknown): string {
  return decodeHmDisplayText(raw).toLocaleUpperCase("tr-TR");
}

/** Kategori sekme / başlık — entity decode + tr-TR büyük harf. */
export function formatTrDisplayLabel(raw: unknown): string {
  return formatHmNavLabel(raw);
}
