/**
 * Konum adı normalize — Türkçe duyarlı (leaf module).
 *
 * `hmMapCityNews` ↔ `haberHaritasiLocations` döngüsel bağımlılığını kırmak için ayrı dosyada
 * tutulur: `haberHaritasiLocations` bu yaprağı içe aktarır, `hmMapCityNews` da yeniden dışa aktarır.
 * Böylece modül üst-seviye başlatımında (TR_PROVINCE_SET) döngü kaynaklı `undefined` fonksiyon hatası oluşmaz.
 */
export function normalizeHmMapCityKey(name: string): string {
  return String(name ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i");
}
