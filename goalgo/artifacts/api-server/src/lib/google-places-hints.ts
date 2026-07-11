/** Tek kaynak: Haritalar Veri Kazıyıcı + vendor Google import hata metinleri. */
export const GOOGLE_PLACES_SERVER_KEY_HINT_TR =
  " Sunucu istekleri için ortam değişkeni GOOGLE_PLACES_API_KEY veya referrer kısıtlaması olmayan / IP kısıtlı Places anahtarı kullanın; tarayıcı (HTTP referrer) anahtarı sunucuda Find Place / Text Search ile çalışmaz.";

export const GOOGLE_PLACES_BILLING_HINT_TR =
  " Bu API anahtarının bağlı olduğu Google Cloud projesinde faturalandırma açık olmalıdır (Places Text Search ücretlidir). Console → Faturalandırma → projeyi ücretli hesaba bağlayın.";

export const GOOGLE_PLACES_INVALID_REQUEST_HINT_TR =
  " Google Cloud Console'da «Places API (New)» ve/veya «Places API» etkin olmalı; koordinat aramasında kategori değeri geçerli Google türü olmalı (örn. restaurant, cafe). Sunucu anahtarı IP kısıtlı veya referrer'sız olmalıdır.";

export function appendPlacesReferrerHint(message: string): string {
  const m = String(message ?? "").trim();
  if (!m) return m;
  if (m.includes("GOOGLE_PLACES_API_KEY")) return m;
  let out = m;
  if (/referrer|API keys with|REQUEST_DENIED/i.test(out)) {
    out = `${out}${GOOGLE_PLACES_SERVER_KEY_HINT_TR}`;
  }
  if (/INVALID_REQUEST/i.test(out) && !out.includes("Places API (New)")) {
    out = `${out}${GOOGLE_PLACES_INVALID_REQUEST_HINT_TR}`;
  }
  if (/billing|BILLING|enable\s+billing|pay\s+as\s+you\s+go/i.test(m)) {
    out = `${out}${GOOGLE_PLACES_BILLING_HINT_TR}`;
  }
  return out;
}
