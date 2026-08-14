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

export function parseHmRssSourcePackFlags(raw: unknown): HmRssSourcePackFlags {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  return {
    ntv: o.ntv === true,
    dirilis: o.dirilis === true,
    birgun: o.birgun === true,
    yerel: o.yerel === true,
    karmaCek: o.karmaCek === true,
  };
}

export function cleanHmRssSourcePackFlags(flags: HmRssSourcePackFlags): HmRssSourcePackFlags | undefined {
  const next: HmRssSourcePackFlags = {};
  if (flags.ntv) next.ntv = true;
  if (flags.dirilis) next.dirilis = true;
  if (flags.birgun) next.birgun = true;
  if (flags.yerel) next.yerel = true;
  if (flags.karmaCek) next.karmaCek = true;
  return Object.keys(next).length > 0 ? next : undefined;
}
