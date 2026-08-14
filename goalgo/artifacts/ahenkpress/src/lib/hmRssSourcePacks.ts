export type HmRssSourcePackId = "ntv" | "dirilis" | "birgun" | "yerel";

export type HmRssSourcePackFlags = {
  ntv?: boolean;
  dirilis?: boolean;
  birgun?: boolean;
  yerel?: boolean;
  karmaCek?: boolean;
};

export const HM_RSS_SOURCE_PACK_OPTIONS: Array<{ id: HmRssSourcePackId; label: string; hint: string }> = [
  { id: "ntv", label: "NTV RSS", hint: "NTV kategori beslemeleri (gündem, dünya, spor…)" },
  { id: "dirilis", label: "Diriliş RSS", hint: "Diriliş Postası — benzer başlıklar aynı kategoride" },
  { id: "birgun", label: "Birgün RSS", hint: "Birgün kategori beslemeleri" },
  { id: "yerel", label: "Yerel RSS", hint: "Ankara haberleri Ankara’da, diğerleri Yerel’de" },
];

export const DEFAULT_HM_NEWS_RSS_SOURCE_PACK_FLAGS: HmRssSourcePackFlags = {
  ntv: true,
  dirilis: true,
  birgun: true,
  yerel: true,
  karmaCek: true,
};

export const HM_RSS_SOURCE_PACKS_ALL_OFF: HmRssSourcePackFlags = {
  ntv: false,
  dirilis: false,
  birgun: false,
  yerel: false,
  karmaCek: false,
};

/** Haber sitelerinde RSS karma varsayılanını bir kez aç; editör kapattıktan sonra tekrar zorlanmaz. */
export const HM_RSS_KARMA_DEFAULTS_REV = "rss-karma-default-v1";

export function isHmRssKarmaDefaultsRevCurrent(raw: unknown): boolean {
  return String(raw ?? "").trim() === HM_RSS_KARMA_DEFAULTS_REV;
}

function packObjectHasAnyFlag(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  return "ntv" in o || "dirilis" in o || "birgun" in o || "yerel" in o || "karmaCek" in o;
}

export function parseHmRssSourcePackFlags(
  raw: unknown,
  opts?: { corporate?: boolean; karmaDefaultsRev?: unknown },
): HmRssSourcePackFlags {
  if (opts?.corporate) {
    return { ...HM_RSS_SOURCE_PACKS_ALL_OFF };
  }
  if (!isHmRssKarmaDefaultsRevCurrent(opts?.karmaDefaultsRev)) {
    return { ...DEFAULT_HM_NEWS_RSS_SOURCE_PACK_FLAGS };
  }
  if (!packObjectHasAnyFlag(raw)) {
    return { ...DEFAULT_HM_NEWS_RSS_SOURCE_PACK_FLAGS };
  }
  const o = raw as Record<string, unknown>;
  return {
    ntv: o.ntv === true,
    dirilis: o.dirilis === true,
    birgun: o.birgun === true,
    yerel: o.yerel === true,
    karmaCek: o.karmaCek === true,
  };
}

export function cleanHmRssSourcePackFlags(flags: HmRssSourcePackFlags): HmRssSourcePackFlags {
  return {
    ntv: flags.ntv === true,
    dirilis: flags.dirilis === true,
    birgun: flags.birgun === true,
    yerel: flags.yerel === true,
    karmaCek: flags.karmaCek === true,
  };
}
