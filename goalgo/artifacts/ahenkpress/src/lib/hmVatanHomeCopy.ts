/**
 * Editable Vatan homepage copy/images — stored in layout_json.hmVatanHomeCopy.
 * Editor can override every surface; site-slug defaults fill gaps (VKD vs TGD).
 */
import type { VatanMosaicTile, VatanMissionPillar, VatanLinkRow } from "@/lib/hmVatanHomeContent";
import {
  VATAN_HOME_HERO_V2,
  VATAN_MISSION_PILLARS,
  VATAN_MOSAIC_TILES,
  VATAN_RIGHTS_ROWS,
} from "@/lib/hmVatanHomeContent";
import { VATAN_ASSETS } from "@/lib/hmVatanTheme";

export type HmVatanHomeSectionCopy = {
  eyebrow?: string | null;
  title?: string | null;
  accent?: string | null;
  lead?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  primaryHref?: string | null;
  primaryLabel?: string | null;
  secondaryHref?: string | null;
  secondaryLabel?: string | null;
  scrollCueLabel?: string | null;
  ctaHref?: string | null;
  ctaLabel?: string | null;
  pillars?: Array<{ id?: string | null; title?: string | null; text?: string | null }> | null;
  rows?: Array<{ href?: string | null; title?: string | null; text?: string | null }> | null;
  tiles?: Array<{
    slug?: string | null;
    href?: string | null;
    title?: string | null;
    kicker?: string | null;
    excerpt?: string | null;
    image?: string | null;
    imageAlt?: string | null;
    size?: "xl" | "sm" | string | null;
  }> | null;
};

export type HmVatanHomeCopy = {
  hero?: HmVatanHomeSectionCopy | null;
  dernek?: HmVatanHomeSectionCopy | null;
  rights?: HmVatanHomeSectionCopy | null;
  mosaic?: HmVatanHomeSectionCopy | null;
  nationalDays?: HmVatanHomeSectionCopy | null;
  ataturk?: HmVatanHomeSectionCopy | null;
  wars?: HmVatanHomeSectionCopy | null;
  donation?: HmVatanHomeSectionCopy | null;
  sehitSearch?: HmVatanHomeSectionCopy | null;
};

function trimOrNull(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return t || null;
}

function normalizePillars(raw: unknown): HmVatanHomeSectionCopy["pillars"] {
  if (!Array.isArray(raw)) return null;
  const out = raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const title = trimOrNull(o.title);
      const text = trimOrNull(o.text);
      if (!title && !text) return null;
      return {
        id: trimOrNull(o.id),
        title,
        text,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .slice(0, 6);
  return out.length ? out : null;
}

function normalizeRows(raw: unknown): HmVatanHomeSectionCopy["rows"] {
  if (!Array.isArray(raw)) return null;
  const out = raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const title = trimOrNull(o.title);
      const href = trimOrNull(o.href);
      if (!title) return null;
      return { href, title, text: trimOrNull(o.text) };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .slice(0, 12);
  return out.length ? out : null;
}

function normalizeTiles(raw: unknown): HmVatanHomeSectionCopy["tiles"] {
  if (!Array.isArray(raw)) return null;
  const out = raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const title = trimOrNull(o.title);
      const image = trimOrNull(o.image) ?? trimOrNull(o.imageUrl);
      if (!title && !image) return null;
      const sizeRaw = trimOrNull(o.size);
      return {
        slug: trimOrNull(o.slug),
        href: trimOrNull(o.href),
        title,
        kicker: trimOrNull(o.kicker),
        excerpt: trimOrNull(o.excerpt),
        image,
        imageAlt: trimOrNull(o.imageAlt),
        size: sizeRaw === "xl" || sizeRaw === "sm" ? sizeRaw : null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .slice(0, 8);
  return out.length ? out : null;
}

function normalizeSection(raw: unknown): HmVatanHomeSectionCopy | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const section: HmVatanHomeSectionCopy = {
    eyebrow: trimOrNull(o.eyebrow),
    title: trimOrNull(o.title),
    accent: trimOrNull(o.accent),
    lead: trimOrNull(o.lead),
    imageUrl: trimOrNull(o.imageUrl) ?? trimOrNull(o.image),
    imageAlt: trimOrNull(o.imageAlt),
    primaryHref: trimOrNull(o.primaryHref),
    primaryLabel: trimOrNull(o.primaryLabel),
    secondaryHref: trimOrNull(o.secondaryHref),
    secondaryLabel: trimOrNull(o.secondaryLabel),
    scrollCueLabel: trimOrNull(o.scrollCueLabel),
    ctaHref: trimOrNull(o.ctaHref),
    ctaLabel: trimOrNull(o.ctaLabel),
    pillars: normalizePillars(o.pillars),
    rows: normalizeRows(o.rows),
    tiles: normalizeTiles(o.tiles),
  };
  const hasValue = Object.values(section).some((v) => {
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    return String(v).trim().length > 0;
  });
  return hasValue ? section : null;
}

export function normalizeHmVatanHomeCopy(raw: unknown): HmVatanHomeCopy | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const copy: HmVatanHomeCopy = {
    hero: normalizeSection(o.hero),
    dernek: normalizeSection(o.dernek),
    rights: normalizeSection(o.rights),
    mosaic: normalizeSection(o.mosaic),
    nationalDays: normalizeSection(o.nationalDays),
    ataturk: normalizeSection(o.ataturk),
    wars: normalizeSection(o.wars),
    donation: normalizeSection(o.donation),
    sehitSearch: normalizeSection(o.sehitSearch),
  };
  const hasAny = Object.values(copy).some((v) => v != null);
  return hasAny ? copy : null;
}

export function isTgdHmSiteSlug(siteSlug: string | null | undefined): boolean {
  const slug = String(siteSlug ?? "")
    .trim()
    .toLowerCase();
  return slug === "trafik" || slug.includes("trafikdernegi") || slug === "tgd";
}

/** Built-in TGD defaults (also mirrored in data/trafik/home-copy.json for sync). */
export const TGD_VATAN_HOME_COPY: HmVatanHomeCopy = {
  hero: {
    eyebrow: "Trafik Güvenliği Derneği",
    title: "Yolumuz hayat,",
    accent: "önceliğimiz güvenlik.",
    lead: "Trafik kazaları kader değildir. Bilinç, eğitim ve profesyonel denetimle sıfır kaza hedefine birlikte yürüyoruz.",
    primaryHref: "/tgu-nedir",
    primaryLabel: "TGU Nedir?",
    secondaryHref: "/hakkimizda",
    secondaryLabel: "Derneği Tanıyın",
    scrollCueLabel: "Keşfet",
  },
  dernek: {
    eyebrow: "Dernek",
    title: "Güvenli ulaşım kültürü",
    accent: "için buradayız.",
    lead: "Toplumsal farkındalık, bilimsel projeler ve paydaş işbirliğiyle yollarımızı daha güvenli hale getiriyoruz.",
    imageUrl: "https://trthaberstatic.cdn.wp.trt.com.tr/resimler/1050000/1051520.jpg",
    imageAlt: "Trafik güvenliği eğitimi ve saha çalışması",
    pillars: [
      {
        id: "egitim",
        title: "Eğitim",
        text: "Okullarda, sürücü kurslarında ve kamuya açık alanlarda emniyet kemeri, hız ve yaya önceliği bilincini yaygınlaştırırız.",
      },
      {
        id: "denetim",
        title: "Denetim",
        text: "Tesis içi trafik güvenliği uzmanlığı ve bağımsız denetimle özel alanlardaki kaza riskini azaltırız.",
      },
      {
        id: "isbirligi",
        title: "İşbirliği",
        text: "Emniyet, jandarma, belediyeler ve özel sektörle köprü kurarak uygulanabilir çözümler üretiriz.",
      },
    ],
    ctaHref: "/hakkimizda",
    ctaLabel: "Derneği tanıyın",
  },
  rights: {
    eyebrow: "Uzmanlık ve Destek",
    title: "Trafik güvenliği bir meslektir.",
    accent: "Yanınızdayız.",
    lead: "AVM'den şantiyeye, hastaneden otogara — tesisiniz için doğru TGU seviyesini ve denetim modelini birlikte belirleyelim.",
    imageUrl: "https://www.mapfre.com.tr/blog/wp-content/uploads/2021/10/bilinmesi_gereken_tr_icjbq.jpg",
    imageAlt: "Trafik güvenliği uzmanlığı",
    rows: [
      {
        href: "/seviye-1-trafik-guvenligi-uzmani-uygulayici",
        title: "Seviye 1 Uygulayıcı",
        text: "Sahada trafik planını uygulayan uzman kadro.",
      },
      {
        href: "/seviye-2-trafik-guvenligi-ic-denetcisi",
        title: "Seviye 2 İç Denetçi",
        text: "Ekip yönetimi, prosedür denetimi ve olay inceleme.",
      },
      {
        href: "/trafik-guvenligi-bas-denetcisi",
        title: "Seviye 3 Baş Denetçi",
        text: "Risk analizi, sistem kurulumu ve baş denetçi raporu.",
      },
      {
        href: "/bagimsiz-denetci",
        title: "Bağımsız Denetçi",
        text: "KOBİ'ler için periyodik, tarafsız denetim modeli.",
      },
    ],
  },
  mosaic: {
    tiles: [
      {
        slug: "trafik-yasam-projeler",
        href: "/trafik-yasam-projeler",
        title: "Projeler",
        kicker: "Saha & inovasyon",
        excerpt: "Kütüphane, akademi, yapay zeka ve güvenli adım seferberlikleri.",
        image:
          "https://web.archive.org/web/20260422120158im_/https://trafikdernegi.com/uploads/images/202511/image_430x256_690f4f38e77a7.jpg",
        imageAlt: "TGD projeleri",
        size: "xl",
      },
      {
        slug: "trafik-yasam-calismalar",
        href: "/trafik-yasam-calismalar",
        title: "Çalışmalar",
        kicker: "Eğitim & istihdam",
        image:
          "https://web.archive.org/web/20260422120158im_/https://trafikdernegi.com/uploads/images/202511/image_430x256_690f8d7b483df.jpg",
        imageAlt: "TGD çalışmaları",
        size: "sm",
      },
      {
        slug: "tgu-nedir",
        href: "/tgu-nedir",
        title: "TGU Nedir?",
        kicker: "Meslek",
        image:
          "https://web.archive.org/web/20260422120158im_/https://trafikdernegi.com/uploads/images/202511/image_430x256_690f4dbaa9330.jpg",
        imageAlt: "Trafik Güvenliği Uzmanlığı",
        size: "sm",
      },
      {
        slug: "iktisadi-isletme",
        href: "/iktisadi-isletme",
        title: "İktisadi İşletme",
        kicker: "Hizmetler Ltd. Şti.",
        image:
          "https://web.archive.org/web/20260422120158im_/https://trafikdernegi.com/uploads/images/202511/image_430x256_690f4e4f17d8d.jpg",
        imageAlt: "Trafik Güvenliği Hizmetleri",
        size: "sm",
      },
      {
        slug: "trafik-guvenligi-dernegi-tuzugu",
        href: "/trafik-guvenligi-dernegi-tuzugu",
        title: "Tüzük",
        kicker: "Kurumsal",
        image:
          "https://web.archive.org/web/20260422120158im_/https://trafikdernegi.com/uploads/images/202511/image_430x256_690f4bc9e684f.jpg",
        imageAlt: "Dernek tüzüğü",
        size: "sm",
      },
    ],
  },
  nationalDays: {
    eyebrow: "Farkındalık",
    title: "Trafikte unutmadığımız günler.",
    lead: "Dünya Trafik Haftası, yaya önceliği ve okul yolu güvenliği için farkındalık çalışmalarımızı sürdürüyoruz.",
    imageUrl: VATAN_ASSETS.milliGunler,
  },
};

export function defaultVatanHomeCopyForSlug(siteSlug?: string | null): HmVatanHomeCopy | null {
  return isTgdHmSiteSlug(siteSlug) ? TGD_VATAN_HOME_COPY : null;
}

function pickSection(
  prefsCopy: HmVatanHomeCopy | null | undefined,
  slugDefaults: HmVatanHomeCopy | null,
  key: keyof HmVatanHomeCopy,
): HmVatanHomeSectionCopy | null {
  return prefsCopy?.[key] ?? slugDefaults?.[key] ?? null;
}

export type ResolvedVatanDernek = {
  eyebrow: string;
  title: string;
  accent: string;
  lead?: string;
  imageUrl: string;
  imageAlt: string;
  pillars: VatanMissionPillar[];
  ctaHref: string;
  ctaLabel: string;
};

export type ResolvedVatanRights = {
  eyebrow: string;
  title: string;
  accent: string;
  lead: string;
  imageUrl: string;
  imageAlt: string;
  rows: VatanLinkRow[];
};

export function resolveVatanHomeCopyBundle(
  prefsCopy: HmVatanHomeCopy | null | undefined,
  siteSlug?: string | null,
): HmVatanHomeCopy {
  const slugDefaults = defaultVatanHomeCopyForSlug(siteSlug);
  return {
    hero: pickSection(prefsCopy, slugDefaults, "hero"),
    dernek: pickSection(prefsCopy, slugDefaults, "dernek"),
    rights: pickSection(prefsCopy, slugDefaults, "rights"),
    mosaic: pickSection(prefsCopy, slugDefaults, "mosaic"),
    nationalDays: pickSection(prefsCopy, slugDefaults, "nationalDays"),
    ataturk: pickSection(prefsCopy, slugDefaults, "ataturk"),
    wars: pickSection(prefsCopy, slugDefaults, "wars"),
    donation: pickSection(prefsCopy, slugDefaults, "donation"),
    sehitSearch: pickSection(prefsCopy, slugDefaults, "sehitSearch"),
  };
}

export function resolveVatanDernekSection(
  prefsCopy: HmVatanHomeCopy | null | undefined,
  siteSlug?: string | null,
): ResolvedVatanDernek {
  const section = resolveVatanHomeCopyBundle(prefsCopy, siteSlug).dernek;
  const pillarsRaw = section?.pillars?.length ? section.pillars : VATAN_MISSION_PILLARS;
  const pillars: VatanMissionPillar[] = pillarsRaw.slice(0, 3).map((p, i) => {
    const fallback = VATAN_MISSION_PILLARS[i] ?? VATAN_MISSION_PILLARS[0]!;
    const idRaw = String(p.id ?? fallback.id).trim();
    const id =
      idRaw === "hatira" || idRaw === "hak" || idRaw === "vefa" || idRaw === "egitim" || idRaw === "denetim" || idRaw === "isbirligi"
        ? (idRaw as VatanMissionPillar["id"])
        : fallback.id;
    return {
      id,
      title: String(p.title ?? fallback.title).trim() || fallback.title,
      text: String(p.text ?? fallback.text).trim() || fallback.text,
    };
  });
  return {
    eyebrow: section?.eyebrow?.trim() || "Dernek",
    title: section?.title?.trim() || "Biz kimiz,",
    accent: section?.accent?.trim() || "ne için buradayız.",
    lead: section?.lead?.trim() || undefined,
    imageUrl: section?.imageUrl?.trim() || VATAN_ASSETS.memorialPillars,
    imageAlt: section?.imageAlt?.trim() || "Dernek bandı görseli",
    pillars,
    ctaHref: section?.ctaHref?.trim() || "/hakkimizda",
    ctaLabel: section?.ctaLabel?.trim() || "Derneği tanıyın",
  };
}

export function resolveVatanRightsSection(
  prefsCopy: HmVatanHomeCopy | null | undefined,
  siteSlug?: string | null,
): ResolvedVatanRights {
  const section = resolveVatanHomeCopyBundle(prefsCopy, siteSlug).rights;
  const rows: VatanLinkRow[] = (section?.rows?.length ? section.rows : VATAN_RIGHTS_ROWS)
    .map((r) => ({
      href: String(r.href ?? "").trim() || "/",
      title: String(r.title ?? "").trim(),
      text: r.text ? String(r.text).trim() : undefined,
    }))
    .filter((r) => r.title);
  return {
    eyebrow: section?.eyebrow?.trim() || "Haklar ve Destek",
    title: section?.title?.trim() || "Haklarınız var.",
    accent: section?.accent?.trim() || "Yanınızdayız.",
    lead:
      section?.lead?.trim() ||
      "Aylık, eğitim, sağlık… hepsi sizin hakkınız. Gelin, dinleyelim; yolunu birlikte bulalım.",
    imageUrl: section?.imageUrl?.trim() || VATAN_ASSETS.haklar,
    imageAlt: section?.imageAlt?.trim() || "Haklar ve destek",
    rows: rows.length ? rows : [...VATAN_RIGHTS_ROWS],
  };
}

export function resolveVatanMosaicTilesFromCopy(
  prefsCopy: HmVatanHomeCopy | null | undefined,
  siteSlug?: string | null,
): VatanMosaicTile[] | null {
  const tiles = resolveVatanHomeCopyBundle(prefsCopy, siteSlug).mosaic?.tiles;
  if (!tiles?.length) return null;
  return tiles.slice(0, 5).map((tile, index): VatanMosaicTile => {
    const fallback = VATAN_MOSAIC_TILES[index] ?? VATAN_MOSAIC_TILES[0]!;
    return {
      slug: String(tile.slug ?? fallback.slug).trim() || fallback.slug,
      href: String(tile.href ?? fallback.href).trim() || fallback.href,
      title: String(tile.title ?? fallback.title).trim() || fallback.title,
      kicker: String(tile.kicker ?? fallback.kicker).trim() || fallback.kicker,
      excerpt: tile.excerpt ? String(tile.excerpt).trim() : fallback.excerpt,
      image: String(tile.image ?? fallback.image).trim() || fallback.image,
      imageAlt: String(tile.imageAlt ?? tile.title ?? fallback.imageAlt).trim() || fallback.imageAlt,
      size: tile.size === "xl" || tile.size === "sm" ? tile.size : index === 0 ? "xl" : "sm",
    };
  });
}

export function resolveVatanHeroCopyDefaults(
  prefsCopy: HmVatanHomeCopy | null | undefined,
  siteSlug?: string | null,
): {
  eyebrow: string;
  title: string;
  accent: string;
  lead: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  scrollCueLabel: string;
} {
  const hero = resolveVatanHomeCopyBundle(prefsCopy, siteSlug).hero;
  return {
    eyebrow: hero?.eyebrow?.trim() || VATAN_HOME_HERO_V2.eyebrow,
    title: hero?.title?.trim() || VATAN_HOME_HERO_V2.title,
    accent: hero?.accent?.trim() || VATAN_HOME_HERO_V2.accent,
    lead: hero?.lead?.trim() || VATAN_HOME_HERO_V2.lead,
    primaryHref: hero?.primaryHref?.trim() || VATAN_HOME_HERO_V2.primaryHref,
    primaryLabel: hero?.primaryLabel?.trim() || VATAN_HOME_HERO_V2.primaryLabel,
    secondaryHref: hero?.secondaryHref?.trim() || VATAN_HOME_HERO_V2.secondaryHref,
    secondaryLabel: hero?.secondaryLabel?.trim() || VATAN_HOME_HERO_V2.secondaryLabel,
    scrollCueLabel: hero?.scrollCueLabel?.trim() || VATAN_HOME_HERO_V2.scrollCueLabel,
  };
}
