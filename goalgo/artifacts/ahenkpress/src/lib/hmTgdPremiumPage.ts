/**
 * Trafik Güvenliği Derneği arşiv sayfalarını Vatan / VKD “ultra premium”
 * kabuğuna (burs, hukuki-savunuculuk tarzı) hazırlar.
 */

export function isHmTgdPremiumBody(html: string, importSource?: string | null): boolean {
  if (String(importSource ?? "").trim().toLowerCase() === "tgd-archive") return true;
  return /\bhm-tgd-page\b/i.test(String(html ?? ""));
}

function stripTags(raw: string): string {
  return String(raw ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export type HmTgdPremiumStat = { value: string; label: string };
export type HmTgdRelatedLink = { href: string; label: string };

export type HmTgdPremiumParsed = {
  title: string;
  lead: string;
  eyebrow: string;
  heroImage: string;
  stats: HmTgdPremiumStat[];
  related: HmTgdRelatedLink[];
  /** Hero'ya taşınan başlık/lead/görsel çıkarıldıktan sonraki gövde. */
  bodyHtml: string;
};

const TGD_PAGE_META: Record<
  string,
  { eyebrow: string; stats: HmTgdPremiumStat[]; related: HmTgdRelatedLink[] }
> = {
  "trafik-guvenligi-bas-denetcisi": {
    eyebrow: "Seviye 3 · Sistem Kurucu",
    stats: [
      { value: "S3", label: "Baş Denetçi" },
      { value: "ISO", label: "39001 Odaklı" },
      { value: "Risk", label: "Analizi & Plan" },
      { value: "Eğitim", label: "S1 / S2 Kadrosu" },
    ],
    related: [
      { href: "/tgu-nedir", label: "TGU Nedir?" },
      { href: "/seviye-1-trafik-guvenligi-uzmani-uygulayici", label: "Seviye 1" },
      { href: "/seviye-2-trafik-guvenligi-ic-denetcisi", label: "Seviye 2" },
      { href: "/bagimsiz-denetci", label: "Bağımsız Denetçi" },
    ],
  },
  "seviye-1-trafik-guvenligi-uzmani-uygulayici": {
    eyebrow: "Seviye 1 · Saha Uygulayıcı",
    stats: [
      { value: "S1", label: "Uygulayıcı" },
      { value: "Saha", label: "Trafik Akışı" },
      { value: "İlk", label: "Yardım & Müdahale" },
      { value: "Rapor", label: "Amire Bildirim" },
    ],
    related: [
      { href: "/tgu-nedir", label: "TGU Nedir?" },
      { href: "/seviye-2-trafik-guvenligi-ic-denetcisi", label: "Seviye 2" },
      { href: "/trafik-guvenligi-bas-denetcisi", label: "Seviye 3" },
      { href: "/trafik-guvenligi-uzmani", label: "Meslek Tanımı" },
    ],
  },
  "seviye-2-trafik-guvenligi-ic-denetcisi": {
    eyebrow: "Seviye 2 · İç Denetçi / Amir",
    stats: [
      { value: "S2", label: "İç Denetçi" },
      { value: "Ekip", label: "Koordinasyon" },
      { value: "Denetim", label: "Prosedür Uyumu" },
      { value: "Kök", label: "Neden Analizi" },
    ],
    related: [
      { href: "/seviye-1-trafik-guvenligi-uzmani-uygulayici", label: "Seviye 1" },
      { href: "/trafik-guvenligi-bas-denetcisi", label: "Seviye 3" },
      { href: "/bagimsiz-denetci", label: "Bağımsız Denetçi" },
      { href: "/tgu-nedir", label: "TGU Nedir?" },
    ],
  },
  "tgu-nedir": {
    eyebrow: "Meslek · Trafik Güvenliği Uzmanlığı",
    stats: [
      { value: "3", label: "Seviyeli Kariyer" },
      { value: "6331", label: "İSG Kanunu" },
      { value: "2918", label: "Trafik Kanunu" },
      { value: "ISO", label: "39001" },
    ],
    related: [
      { href: "/seviye-1-trafik-guvenligi-uzmani-uygulayici", label: "Seviye 1" },
      { href: "/seviye-2-trafik-guvenligi-ic-denetcisi", label: "Seviye 2" },
      { href: "/trafik-guvenligi-bas-denetcisi", label: "Seviye 3" },
      { href: "/bagimsiz-denetci", label: "Bağımsız Denetçi" },
    ],
  },
  "bagimsiz-denetci": {
    eyebrow: "Periyodik · Tarafsız Denetim",
    stats: [
      { value: "S2+", label: "Yeterlilik" },
      { value: "KOBİ", label: "Uygun Model" },
      { value: "Rapor", label: "Yönetime Sunum" },
      { value: "DÖF", label: "Takip" },
    ],
    related: [
      { href: "/tgu-nedir", label: "TGU Nedir?" },
      { href: "/seviye-2-trafik-guvenligi-ic-denetcisi", label: "Seviye 2" },
      { href: "/trafik-guvenligi-bas-denetcisi", label: "Seviye 3" },
      { href: "/iktisadi-isletme", label: "İktisadi İşletme" },
    ],
  },
  hakkimizda: {
    eyebrow: "Dernek · Kimlik",
    stats: [
      { value: "0", label: "Kaza Hedefi" },
      { value: "Eğitim", label: "Farkındalık" },
      { value: "STK", label: "Savunuculuk" },
      { value: "Veri", label: "Analiz & Rapor" },
    ],
    related: [
      { href: "/tgu-nedir", label: "TGU Nedir?" },
      { href: "/trafik-guvenligi-dernegi-tuzugu", label: "Tüzük" },
      { href: "/trafik-yasam-projeler", label: "Projeler" },
      { href: "/trafik-yasam-calismalar", label: "Çalışmalar" },
    ],
  },
  "trafik-guvenligi-uzmani": {
    eyebrow: "Resmi Meslek Tanımı",
    stats: [
      { value: "3", label: "Seviye" },
      { value: "AVM", label: "Tesis & Saha" },
      { value: "İSG", label: "6331 Uyum" },
      { value: "ISO", label: "39001" },
    ],
    related: [
      { href: "/tgu-nedir", label: "TGU Nedir?" },
      { href: "/seviye-1-trafik-guvenligi-uzmani-uygulayici", label: "Seviye 1" },
      { href: "/seviye-2-trafik-guvenligi-ic-denetcisi", label: "Seviye 2" },
      { href: "/trafik-guvenligi-bas-denetcisi", label: "Seviye 3" },
    ],
  },
};

const DEFAULT_META = {
  eyebrow: "Trafik Güvenliği Derneği",
  stats: [
    { value: "TGU", label: "Uzmanlık" },
    { value: "Eğitim", label: "Sertifika" },
    { value: "Denetim", label: "Saha & Sistem" },
    { value: "STK", label: "Kamu Yararı" },
  ] as HmTgdPremiumStat[],
  related: [
    { href: "/tgu-nedir", label: "TGU Nedir?" },
    { href: "/hakkimizda", label: "Hakkımızda" },
    { href: "/trafik-yasam-projeler", label: "Projeler" },
    { href: "/iletisim", label: "İletişim" },
  ] as HmTgdRelatedLink[],
};

function normalizeSlugKey(slug: string): string {
  return String(slug ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase()
    .replace(/\//g, "-");
}

function countStatsFromBody(raw: string): HmTgdPremiumStat[] | null {
  const h2 = (raw.match(/<h2\b/gi) ?? []).length;
  const li = (raw.match(/<li\b/gi) ?? []).length;
  if (h2 < 1 && li < 3) return null;
  return [
    { value: String(Math.max(h2, 1)), label: "Ana Bölüm" },
    { value: String(Math.max(li, 1)), label: "Madde" },
    { value: "TGD", label: "Standart" },
    { value: "TR", label: "Uygulama" },
  ];
}

export function parseHmTgdPremiumBody(
  html: string,
  fallbackTitle: string,
  pageSlug?: string,
): HmTgdPremiumParsed {
  let raw = String(html ?? "").trim();
  const slugKey = normalizeSlugKey(pageSlug ?? "");
  const meta = TGD_PAGE_META[slugKey] ?? DEFAULT_META;

  if (!raw) {
    return {
      title: fallbackTitle,
      lead: "",
      eyebrow: meta.eyebrow,
      heroImage: "",
      stats: meta.stats,
      related: meta.related,
      bodyHtml: "",
    };
  }

  const wrap = raw.match(/^<div\b[^>]*\bhm-tgd-page\b[^>]*>([\s\S]*)<\/div>\s*$/i);
  if (wrap?.[1]) raw = wrap[1].trim();

  let heroImage = "";
  const imgBlock =
    raw.match(/^\s*<p\b[^>]*>\s*(<img\b[^>]*>)\s*<\/p>/i) ||
    raw.match(/^\s*(<img\b[^>]*>)/i) ||
    raw.match(/<p\b[^>]*>\s*(<img\b[^>]*>)\s*<\/p>/i);
  if (imgBlock?.[0]) {
    const src = imgBlock[0].match(/\bsrc=["']([^"']+)["']/i)?.[1]?.trim() ?? "";
    if (src) {
      heroImage = src;
      raw = raw.replace(imgBlock[0], "").trim();
    }
  }

  const titleMatch = raw.match(/<h[123]\b[^>]*>([\s\S]*?)<\/h[123]>/i);
  const title = stripTags(titleMatch?.[1] ?? "") || fallbackTitle;
  if (titleMatch?.[0]) raw = raw.replace(titleMatch[0], "");

  let lead = "";
  const leadMatch = raw.match(/^\s*<p\b[^>]*>([\s\S]*?)<\/p>/i);
  if (leadMatch?.[0]) {
    const candidate = stripTags(leadMatch[1] ?? "");
    if (candidate.length > 40 && !/<img\b/i.test(leadMatch[1] ?? "")) {
      if (candidate.length <= 360) {
        lead = candidate;
        raw = raw.replace(leadMatch[0], "");
      } else {
        lead = `${candidate.slice(0, 280).trim().replace(/\s+\S*$/, "")}…`;
      }
    }
  }

  raw = raw.replace(/<p>\s*<\/p>/gi, "").trim();
  const derived = countStatsFromBody(raw);
  const stats = TGD_PAGE_META[slugKey]?.stats ?? derived ?? DEFAULT_META.stats;

  return {
    title,
    lead,
    eyebrow: meta.eyebrow,
    heroImage,
    stats,
    related: meta.related,
    bodyHtml: raw ? `<div class="hm-tgd-page">${raw}</div>` : "",
  };
}
