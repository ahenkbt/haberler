/**
 * Haber siteleri (PHP Yenişafak teması) — menü çubuğu geçişli renkleri.
 * Editör > Vitrin ayarları > Renkler. Kayıt `layout_json.hmThemeGradient` = { id, from, to };
 * PHP `src/Theme.php` menü çubuğunu `from → to` geçişiyle boyar, başlık tonunu `to`dan alır.
 * Kutular (anasayfa kategori blokları) konu rengini `Theme::TOPICS` / `hmCategoryColors`dan alır.
 */
export type HmThemeGradient = { id: string; from: string; to: string };

export type HmGradientPreset = HmThemeGradient & { label: string };

export type HmGradientFamily = {
  id: string;
  label: string;
  /** Renk kutusu örneği */
  swatch: string;
  /** Bu aileyle uyumlu vurgu (aktif menü, rozet, başlık çizgisi) */
  accent: string;
  presets: HmGradientPreset[];
};

const p = (family: string, n: number, label: string, from: string, to: string): HmGradientPreset => ({
  id: `${family}-${n}`,
  label,
  from,
  to,
});

export const HM_GRADIENT_FAMILIES: HmGradientFamily[] = [
  {
    id: "mavi",
    label: "Mavi",
    swatch: "#1d5fbf",
    accent: "#c8102e",
    presets: [
      p("mavi", 1, "Mavi → Lacivert", "#1d5fbf", "#0a1f44"),
      p("mavi", 2, "Gök mavisi → Mavi", "#2b8be0", "#0f4c9c"),
      p("mavi", 3, "Lacivert → Gece mavisi", "#143d7a", "#050f24"),
      p("mavi", 4, "Mavi → Mor", "#1d5fbf", "#3b1f7a"),
    ],
  },
  {
    id: "lacivert",
    label: "Lacivert",
    swatch: "#0b3362",
    accent: "#c8102e",
    presets: [
      p("lacivert", 1, "Lacivert → Koyu lacivert", "#0b3362", "#03152b"),
      p("lacivert", 2, "Açık lacivert → Lacivert", "#12407f", "#0b2a5b"),
      p("lacivert", 3, "Çelik → Lacivert", "#2c4a73", "#0b182b"),
      p("lacivert", 4, "Lacivert → Siyah", "#0b2a5b", "#000814"),
    ],
  },
  {
    id: "kirmizi",
    label: "Kırmızı",
    swatch: "#d10f1b",
    accent: "#0b3362",
    presets: [
      p("kirmizi", 1, "Kırmızı → Bordo", "#d10f1b", "#7a0a10"),
      p("kirmizi", 2, "Al → Kırmızı", "#e53935", "#b71c1c"),
      p("kirmizi", 3, "Kırmızı → Koyu bordo", "#c8102e", "#4a0410"),
      p("kirmizi", 4, "Kırmızı → Lacivert", "#b3261e", "#0b2a5b"),
    ],
  },
  {
    id: "bordo",
    label: "Bordo",
    swatch: "#8b1a1a",
    accent: "#c9a227",
    presets: [
      p("bordo", 1, "Bordo → Koyu bordo", "#8b1a1a", "#3d0a0a"),
      p("bordo", 2, "Şehit kırmızısı → Bordo", "#a50e1e", "#5c0710"),
      p("bordo", 3, "Vişne → Mürdüm", "#6d1b3b", "#2a0a17"),
      p("bordo", 4, "Bordo → Siyah", "#7a0b16", "#1a0306"),
    ],
  },
  {
    id: "yesil",
    label: "Yeşil",
    swatch: "#2e7d32",
    accent: "#c45c00",
    presets: [
      p("yesil", 1, "Yeşil → Orman yeşili", "#2e7d32", "#0f3d14"),
      p("yesil", 2, "Zümrüt → Koyu zümrüt", "#0b6e4f", "#023022"),
      p("yesil", 3, "Çimen → Yeşil", "#43a047", "#1b5e20"),
      p("yesil", 4, "Deniz yeşili → Petrol", "#00796b", "#003d33"),
    ],
  },
  {
    id: "turkuaz",
    label: "Turkuaz",
    swatch: "#0a7ea4",
    accent: "#e85d04",
    presets: [
      p("turkuaz", 1, "Turkuaz → Petrol", "#0a7ea4", "#013344"),
      p("turkuaz", 2, "Camgöbeği → Koyu turkuaz", "#00838f", "#003c42"),
      p("turkuaz", 3, "Açık mavi → Okyanus", "#0288d1", "#014a7a"),
      p("turkuaz", 4, "Yeşilimsi turkuaz → Koyu", "#009688", "#004d40"),
    ],
  },
  {
    id: "mor",
    label: "Mor",
    swatch: "#6a1b9a",
    accent: "#f59e0b",
    presets: [
      p("mor", 1, "Mor → Patlıcan", "#6a1b9a", "#2a0a40"),
      p("mor", 2, "Lavanta moru → Gece moru", "#5e35b1", "#1f1052"),
      p("mor", 3, "Eflatun → Koyu mor", "#7b1fa2", "#3c0a52"),
      p("mor", 4, "Çivit → Gece", "#4527a0", "#120a3a"),
    ],
  },
  {
    id: "turuncu",
    label: "Turuncu",
    swatch: "#e65100",
    accent: "#0b2a5b",
    presets: [
      p("turuncu", 1, "Turuncu → Kiremit", "#e65100", "#8a2f00"),
      p("turuncu", 2, "Mandalina → Turuncu", "#f57c00", "#b33f00"),
      p("turuncu", 3, "Kiremit → Koyu kiremit", "#d84315", "#6d1f07"),
      p("turuncu", 4, "Turuncu → Kahve", "#ef6c00", "#5d2a00"),
    ],
  },
  {
    id: "altin",
    label: "Altın",
    swatch: "#b7791f",
    accent: "#0b2a5b",
    presets: [
      p("altin", 1, "Altın → Bronz", "#b7791f", "#5a3a0a"),
      p("altin", 2, "Hardal → Koyu altın", "#a16207", "#422705"),
      p("altin", 3, "Eski altın → Siyah", "#8a6d1d", "#2a210a"),
      p("altin", 4, "Parlak altın → Altın", "#c9a227", "#6b520c"),
    ],
  },
  {
    id: "antrasit",
    label: "Antrasit",
    swatch: "#37474f",
    accent: "#c8102e",
    presets: [
      p("antrasit", 1, "Antrasit → Kömür", "#37474f", "#11181c"),
      p("antrasit", 2, "Grafit → Siyah", "#263238", "#0a0f12"),
      p("antrasit", 3, "Gri → Antrasit", "#546e7a", "#1c2529"),
      p("antrasit", 4, "Gece grisi → Siyah", "#1f2937", "#030712"),
    ],
  },
  {
    id: "kahve",
    label: "Kahverengi",
    swatch: "#6d4c41",
    accent: "#c45c00",
    presets: [
      p("kahve", 1, "Kahve → Koyu kahve", "#6d4c41", "#2b1a14"),
      p("kahve", 2, "Toprak → Kahve", "#8b5a2b", "#3d2610"),
      p("kahve", 3, "Ceviz → Koyu ceviz", "#5d4037", "#1e1210"),
      p("kahve", 4, "Taba → Kahve", "#a1662f", "#4e2c10"),
    ],
  },
];

/** Önizleme kutuları: PHP `Theme::TOPICS` ile aynı varsayılan konu renkleri. */
export const HM_TOPIC_PREVIEW = [
  { label: "Siyaset", color: "#b3261e" },
  { label: "Ekonomi", color: "#b7791f" },
  { label: "Spor", color: "#2e7d32" },
  { label: "Dünya", color: "#6a1b9a" },
  { label: "Teknoloji", color: "#00838f" },
  { label: "Sağlık", color: "#0288d1" },
  { label: "Yerel", color: "#00796b" },
  { label: "Kamu", color: "#1a237e" },
  { label: "Güvenlik", color: "#263238" },
] as const;

const HEX6 = /^#[0-9a-fA-F]{6}$/;

export function normalizeHmThemeGradient(raw: unknown): HmThemeGradient | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const from = String(r.from ?? "").trim();
  const to = String(r.to ?? "").trim();
  if (!HEX6.test(from) || !HEX6.test(to)) return null;
  const id = String(r.id ?? "").trim().slice(0, 40) || "ozel";
  return { id, from: from.toLowerCase(), to: to.toLowerCase() };
}

export function findHmGradientPreset(id: string | null | undefined): { family: HmGradientFamily; preset: HmGradientPreset } | null {
  const key = String(id ?? "").trim();
  if (!key) return null;
  for (const family of HM_GRADIENT_FAMILIES) {
    const preset = family.presets.find((item) => item.id === key);
    if (preset) return { family, preset };
  }
  return null;
}

export function hmGradientCss(g: { from: string; to: string }): string {
  return `linear-gradient(90deg, ${g.from} 0%, ${g.to} 100%)`;
}
