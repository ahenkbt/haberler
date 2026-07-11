import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";

const SLUG_EMOJI: Record<string, string> = {
  gundem: "📰",
  turkiye: "🇹🇷",
  ankara: "🏛️",
  istanbul: "🌉",
  izmir: "🌊",
  ekonomi: "💹",
  para: "💰",
  finans: "📈",
  spor: "⚽",
  futbol: "⚽",
  basketbol: "🏀",
  dunya: "🌍",
  global: "🌐",
  teknoloji: "💻",
  bilim: "🔬",
  saglik: "🏥",
  yasam: "🏡",
  kultur: "🎭",
  sanat: "🎨",
  magazin: "✨",
  egitim: "🎓",
  savunma: "🛡️",
  "savunma-sanayi": "🛡️",
  otomobil: "🚗",
  seyahat: "✈️",
  turizm: "🏖️",
  yemek: "🍽️",
  tarim: "🌾",
  enerji: "⚡",
  cevre: "🌿",
  hava: "🌤️",
  politika: "🏛️",
  siyaset: "🗳️",
  adliye: "⚖️",
  emniyet: "🚔",
  blog: "📝",
  video: "📺",
  galeri: "📷",
  foto: "📸",
  kose: "✍️",
  yazar: "✍️",
  iletisim: "📞",
  kunye: "📋",
  reklam: "📢",
  abonelik: "📬",
};

export function resolveHmCategoryEmoji(slugRaw: unknown, nameRaw?: unknown): string {
  const slug = normalizeNewsCategorySlug(slugRaw) || normalizeNewsCategorySlug(nameRaw);
  if (!slug) return "📰";
  if (SLUG_EMOJI[slug]) return SLUG_EMOJI[slug]!;
  for (const [key, emoji] of Object.entries(SLUG_EMOJI)) {
    if (slug.includes(key) || key.includes(slug)) return emoji;
  }
  const name = String(nameRaw ?? slugRaw ?? "").trim().toLocaleLowerCase("tr-TR");
  for (const [key, emoji] of Object.entries(SLUG_EMOJI)) {
    if (name.includes(key.replace(/-/g, " ")) || name.includes(key)) return emoji;
  }
  return "📰";
}
