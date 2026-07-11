const CATEGORY_EMOJI_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/elektronik|teknoloji|telefon|bilgisayar|tablet|tv\b/i, "📱"],
  [/giyim|moda|aksesuar|tekstil|ayakkab/i, "👗"],
  [/ev\b|yaşam|yasam|kırtasiye|kirtasie|ofis|mobilya|dekor/i, "🏠"],
  [/anne|bebek|oyuncak|cocuk|çocuk/i, "🍼"],
  [/kozmetik|bakım|bakim|güzellik|guzellik|parfüm|parfum|makyaj/i, "💄"],
  [/spor|outdoor|fitness|koşu|kosu/i, "⚽"],
  [/süpermarket|supermarket|gıda|gida|market|organik|içecek|icecek/i, "🛒"],
  [/oto\b|araba|yapı|yapi|bahçe|bahce|hırdavat|hirdavat/i, "🔧"],
  [/kitap|müzik|muzik|film|hobi|oyun/i, "📚"],
  [/sağlık|saglik|medikal|vitamin|ilaç|ilac|wellness/i, "💊"],
  [/pet|hayvan|kedi|köpek|kopek/i, "🐾"],
  [/takı|taki|mücevher|mucevher|saat/i, "💍"],
  [/temizlik|deterjan|ev bakım/i, "🧼"],
  [/kargo|lojistik/i, "📦"],
];

const FALLBACK_EMOJIS = ["🛍️", "✨", "🎁", "🏷️", "📦", "🌟", "💡", "🧺"] as const;

/** Deterministic emoji for marketplace categories without image/icon. */
export function getCategoryEmoji(name: string, slug?: string | null): string {
  const haystack = `${name} ${slug ?? ""}`.toLocaleLowerCase("tr-TR");
  for (const [pattern, emoji] of CATEGORY_EMOJI_RULES) {
    if (pattern.test(haystack)) return emoji;
  }
  let hash = 0;
  for (let i = 0; i < haystack.length; i++) {
    hash = (hash + haystack.charCodeAt(i) * (i + 1)) % FALLBACK_EMOJIS.length;
  }
  return FALLBACK_EMOJIS[hash] ?? "🛍️";
}
