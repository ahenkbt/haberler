import type { CSSProperties } from "react";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";

/** Yekpare Sade public palette — gök mavisi, turkuaz, mor (§6 chrome + vitrin). */
export const YEKPARE_SADE_ACCENT = "#38BDF8";
export const YEKPARE_SADE_ACCENT_DARK = "#0284C7";
/** @deprecated Use YEKPARE_SADE_ACCENT_DARK — kept for Kesfet/harita inline styles */
export const YEKPARE_SADE_TEAL = "#0EA5E9";
export const YEKPARE_SADE_TEAL_DARK = "#0284C7";
export const YEKPARE_SADE_ACCENT_SOFT = "#e0f2fe";
export const YEKPARE_SADE_PAGE_TINT = "#f0f9ff";
export const YEKPARE_SADE_PURPLE = "#8B5CF6";
export const YEKPARE_SADE_PURPLE_SOFT = "#ede9fe";
export const YEKPARE_LEGACY_RED = "#e61e25";

const LEGACY_RED_ALIASES = new Set([
  YEKPARE_LEGACY_RED.toLowerCase(),
  "#c9181e",
  "#c91920",
  "#dc2626",
  "#b91c1c",
  "#7f1d1d",
]);

/** Portal varsayılanı: eski HM kırmızısı → Sade gök mavisi. */
export function resolveSadeAccent(primaryColor?: string | null): string {
  const c = primaryColor?.trim();
  if (!c) return YEKPARE_SADE_ACCENT;
  if (LEGACY_RED_ALIASES.has(c.toLowerCase())) return YEKPARE_SADE_ACCENT;
  return c;
}

/** Anasayfa hero ile aynı — açık gök mavisi → turkuaz → mor linear gradient */
export const SADE_PUBLIC_HERO_GRADIENT =
  "linear-gradient(115deg, #f0f9ff 0%, #e0f2fe 42%, #ede9fe 100%)";

/** Radial blur katmanları — anasayfa Hero bileşeni ile birebir */
export const SADE_PUBLIC_HERO_BLUR =
  "radial-gradient(circle at 82% 8%, rgba(56, 189, 248, 0.18), transparent 28%), radial-gradient(circle at 8% 24%, rgba(167, 139, 250, 0.16), transparent 24%)";

/** Portal gövde rengi — hero alt fade (`index.css` ::after) hedefi */
export const SADE_PUBLIC_PAGE_BG = "#ffffff";

/** Beyaz gövde / vitrin bandı hemen altında — fade hedefi */
export const SADE_PUBLIC_PAGE_BG_WHITE = "#ffffff";

/** Sipariş vitrin sayfa zemini */
export const SADE_PUBLIC_PAGE_BG_SIPARIS = "#FCFCFD";

/** Hero alt fade hedef rengi — `--sade-public-page-bg` CSS değişkeni */
export function sadePublicHeroFadeStyle(pageBg: string = SADE_PUBLIC_PAGE_BG): CSSProperties {
  return { "--sade-public-page-bg": pageBg } as CSSProperties;
}

/** Alt menü sonrası tam genişlik hero bandı — `index.css` `.sade-public-hero-stage` */
export const SADE_PUBLIC_HERO_STAGE_CLASS = "sade-public-hero-stage";

/** index.css `.sade-public-hero-surface` — gradient + ::before blur + ::after alt fade */
export const SADE_PUBLIC_HERO_SURFACE_CLASS = "sade-public-hero-surface";

/** Tam genişlik hero yüzeyi — üst container içinde kalsa bile viewport kadar yayılır */
export const SADE_PUBLIC_HERO_FULL_BLEED_CLASS = "sade-public-hero-full-bleed";

/** Standart hero içerik kabuğu — max 1440px + tutarlı min-height/padding (`index.css`) */
export const SADE_PUBLIC_HERO_INNER_CLASS = "sade-public-hero-inner";

/** Cam alt menü only — kısa gradient band (`index.css`) */
export const SADE_PUBLIC_HERO_SUBNAV_ONLY_CLASS = "sade-public-hero-surface--subnav-only";

/** YekTube anasayfa — hoşgeldin bloğu yok; standart Sade hero bandı + cam alt nav */
export const SADE_PUBLIC_HERO_YEKTUBE_BAND_CLASS = "sade-public-hero-surface--yektube-band";

/** YekTube hoşgeldin hero — standart band yüksekliği */
export const SADE_PUBLIC_HERO_YEKTUBE_INNER_CLASS = "sade-public-hero-inner--yektube";

/** Header ile hizalı hero içerik sarmalayıcısı */
export const SADE_PUBLIC_HERO_CONTENT_CLASS = `${YEKPARE_PAGE_CONTAINER_CLASS} ${SADE_PUBLIC_HERO_INNER_CLASS}`;

/** Kategori nav altı hero uzantısı — piyasa/manşet; üst boşluk yok (`index.css` --compact) */
export const SADE_PUBLIC_HERO_INNER_COMPACT_CLASS = "sade-public-hero-inner--compact";
export const SADE_PUBLIC_HERO_CONTENT_COMPACT_CLASS = `${YEKPARE_PAGE_CONTAINER_CLASS} ${SADE_PUBLIC_HERO_INNER_COMPACT_CLASS}`;

export const SADE_PUBLIC_HERO_BLUR_CLASS =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_8%_24%,rgba(167,139,250,0.16),transparent_24%)]";

export const sadePublicHeroSurfaceStyle = { background: SADE_PUBLIC_HERO_GRADIENT } as const;

export const SADE_HERO_SHELL_CLASS =
  `${SADE_PUBLIC_HERO_SURFACE_CLASS} relative overflow-hidden rounded-b-[2rem] text-slate-950`;
export const SADE_HERO_GLOW_CLASS =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.14),transparent_55%),radial-gradient(ellipse_at_85%_20%,rgba(139,92,246,0.12),transparent_40%)]";
export const SADE_HERO_EYEBROW_CLASS =
  "text-xs font-black uppercase tracking-[0.22em] text-[#0284C7]";
export const SADE_HERO_ICON_CLASS =
  "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0EA5E9] text-2xl font-black text-white shadow-lg shadow-sky-900/15";
export const SADE_BTN_PRIMARY_CLASS =
  "sade-btn-primary inline-flex items-center justify-center gap-2 rounded-xl bg-[#0EA5E9] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0284C7]";
export const SADE_BTN_SECONDARY_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-5 py-2.5 text-sm font-bold text-[#0284C7] transition hover:border-[#0EA5E9] hover:bg-sky-50";
export const SADE_BTN_ON_TEAL_CLASS =
  "services-cta-on-teal inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-[#0284C7] shadow-sm transition hover:bg-sky-50";
export const SADE_BTN_GHOST_ON_TEAL_CLASS =
  "services-cta-ghost-on-teal inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 px-5 py-2.5 text-sm font-black text-white transition hover:bg-white/10";
export const SADE_CARD_TOP_BORDER_CLASS = "h-1.5 w-full shrink-0 bg-[#38BDF8]";
export const SADE_CARD_INLINE_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-6 shadow-sm md:p-8";
export const SADE_HERITAGE_GOLD = "#C9A84C";
export const SADE_EDITORIAL_PAGE_BG = "#FAFAF8";
/** Kurumsal / Atatürk / şehit sayfaları — açık hero kabuğu */
export const SADE_EDITORIAL_HERO_SECTION_CLASS =
  "relative overflow-hidden rounded-b-[2rem] border-b border-sky-100 bg-[#f0f9ff] py-14 text-slate-950 md:py-18";
export const SADE_EDITORIAL_EYEBROW_CLASS =
  "inline-flex items-center rounded-full border border-sky-200/80 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#0284C7]";
export const SADE_EDITORIAL_NAV_ACTIVE_CLASS =
  "rounded-full border border-[#C9A84C] bg-[#C9A84C]/25 px-4 py-2 text-xs font-bold text-slate-950";
export const SADE_EDITORIAL_NAV_IDLE_CLASS =
  "rounded-full border border-sky-100 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-[#0EA5E9] hover:text-[#0284C7]";
export const SADE_PUBLIC_HERO_LIGHT_GRADIENT = SADE_PUBLIC_HERO_GRADIENT;

/** Hero hemen altı gövde — anasayfa stats/promo ritmi; hero yüksekliği/gradient dokunulmaz. */
export const SADE_PUBLIC_POST_HERO_BODY_CLASS = "sade-public-post-hero-body pt-3 md:pt-4 lg:pt-5";
export const SADE_PUBLIC_POST_HERO_STACK_CLASS = "space-y-6 md:space-y-7";
export const SADE_PUBLIC_POST_HERO_MAIN_CLASS = `${SADE_PUBLIC_POST_HERO_BODY_CLASS} ${SADE_PUBLIC_POST_HERO_STACK_CLASS}`;
