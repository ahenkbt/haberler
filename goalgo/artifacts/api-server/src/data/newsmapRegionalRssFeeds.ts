import { TURKEY_CITIES as RAW_TURKEY_CITIES } from "../lib/seed-popular-locations.js";

type TurkeyCitySeed = { name: string; nameTr?: string; lat: number; lng: number };
const TURKEY_CITIES = RAW_TURKEY_CITIES as readonly TurkeyCitySeed[];

export type NewsmapRegionalRssFeedSeedRow = {
  name: string;
  url: string;
  continent: string;
  countryCode?: string | null;
  countryName?: string | null;
  category?: "news" | "video" | "both";
  scope?: "global" | "continent" | "country";
  enabled?: boolean;
  priority?: number;
  lat: number;
  lng: number;
  regionKey: string;
  regionLabel: string;
};

function normalizeRegionKey(label: string): string {
  return String(label ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function googleNewsRssUrl(query: string, opts?: { hl?: string; gl?: string; ceid?: string }): string {
  const hl = opts?.hl ?? "tr";
  const gl = opts?.gl ?? "TR";
  const ceid = opts?.ceid ?? "TR:tr";
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${encodeURIComponent(ceid)}`;
}

/** CUMHA il / ulusal lokasyon RSS — https://cumha.com.tr/rss/lokasyon/{slug} */
function cumhaLocationRssUrl(slug: string): string {
  return `https://cumha.com.tr/rss/lokasyon/${slug}`;
}

function cumhaProvinceSlug(name: string): string {
  return normalizeRegionKey(name);
}

type RegionalSeedRow = NewsmapRegionalRssFeedSeedRow;

function regionalFeed(partial: RegionalSeedRow): NewsmapRegionalRssFeedSeedRow {
  return {
    category: "news",
    scope: "country",
    enabled: true,
    priority: 40,
    ...partial,
  };
}

/** 81 il + KKTC + komşu bölgeler — feed geo ile harita callout yerleşimi. */
export function buildNewsmapRegionalRssFeedRows(): NewsmapRegionalRssFeedSeedRow[] {
  const rows: NewsmapRegionalRssFeedSeedRow[] = [];

  for (const city of TURKEY_CITIES) {
    const name = String(city.nameTr ?? city.name).trim();
    const slug = cumhaProvinceSlug(name);
    const regionKey = `tr-${slug}`;
    rows.push(
      regionalFeed({
        name: `Cumha ${name}`,
        url: cumhaLocationRssUrl(slug),
        continent: "europe",
        countryCode: "TR",
        countryName: "Türkiye",
        priority: 45,
        lat: city.lat,
        lng: city.lng,
        regionKey,
        regionLabel: name,
      }),
    );
  }

  rows.push(
    regionalFeed({
      name: "Cumha Türkiye",
      url: cumhaLocationRssUrl("turkiye"),
      continent: "europe",
      countryCode: "TR",
      countryName: "Türkiye",
      priority: 48,
      lat: 39.0,
      lng: 35.0,
      regionKey: "tr-turkiye",
      regionLabel: "Türkiye",
    }),
    {
      name: "Cumha Dünya",
      url: cumhaLocationRssUrl("dunya"),
      continent: "global",
      countryCode: null,
      countryName: null,
      category: "news",
      scope: "global",
      enabled: true,
      priority: 44,
      lat: 20,
      lng: 0,
      regionKey: "global-dunya",
      regionLabel: "Dünya",
    },
  );

  const kktc: Array<{ label: string; lat: number; lng: number; query: string }> = [
    { label: "Lefkoşa", lat: 35.1856, lng: 33.3823, query: "Lefkoşa KKTC haber" },
    { label: "Girne", lat: 35.3369, lng: 33.3175, query: "Girne KKTC haber" },
    { label: "Gazimağusa", lat: 35.1264, lng: 33.9425, query: "Gazimağusa KKTC haber" },
    { label: "Güzelyurt", lat: 35.195, lng: 32.991, query: "Güzelyurt KKTC haber" },
    { label: "İskele", lat: 35.287, lng: 33.887, query: "İskele KKTC haber" },
    { label: "Lefke", lat: 35.126, lng: 32.851, query: "Lefke KKTC haber" },
  ];
  for (const row of kktc) {
    const regionKey = `cy-${normalizeRegionKey(row.label)}`;
    rows.push(
      regionalFeed({
        name: `KKTC ${row.label}`,
        url: googleNewsRssUrl(row.query),
        continent: "middle-east",
        countryCode: "CY",
        countryName: "KKTC",
        priority: 41,
        lat: row.lat,
        lng: row.lng,
        regionKey,
        regionLabel: row.label,
      }),
    );
  }

  rows.push(
    regionalFeed({
      name: "KKTC Rum Kesimi",
      url: googleNewsRssUrl("Rum kesimi Kıbrıs haber", { hl: "tr", gl: "CY", ceid: "CY:tr" }),
      continent: "middle-east",
      countryCode: "CY",
      countryName: "KKTC",
      priority: 40,
      lat: 35.18,
      lng: 33.38,
      regionKey: "cy-rum-kesimi",
      regionLabel: "Rum Kesimi",
    }),
  );

  const kktcDirectRss: Array<{ name: string; url: string; regionLabel: string; regionKey: string }> = [
    { name: "Kıbrıs Gazetesi", url: "https://kibrisgazetesi.com/kibris/feed/", regionLabel: "KKTC", regionKey: "cy-kktc" },
    { name: "Kıbrıs Manşet Güncel", url: "https://www.kibrismanset.com/rss/guncel", regionLabel: "KKTC", regionKey: "cy-kktc" },
    { name: "Kıbrıs Manşet Polisiye", url: "https://www.kibrismanset.com/rss/polisiye-olaylar", regionLabel: "KKTC", regionKey: "cy-kktc" },
    { name: "Diyalog Gazetesi", url: "https://www.diyaloggazetesi.com/rss", regionLabel: "KKTC", regionKey: "cy-kktc" },
    { name: "Gündem Kıbrıs", url: "https://www.gundemkibris.com/rss/kibris", regionLabel: "KKTC", regionKey: "cy-kktc" },
    { name: "Kıbrıs Gerçek", url: "https://www.kibrisgercek.com/rss/kibris", regionLabel: "KKTC", regionKey: "cy-kktc" },
    { name: "Kıbrıs Gazetesi Rum Basını", url: "https://kibrisgazetesi.com/rum-basini/rss", regionLabel: "Rum Kesimi", regionKey: "cy-rum-kesimi" },
  ];
  for (const feed of kktcDirectRss) {
    rows.push(
      regionalFeed({
        name: feed.name,
        url: feed.url,
        continent: "middle-east",
        countryCode: "CY",
        countryName: "KKTC",
        priority: 43,
        lat: 35.1856,
        lng: 33.3823,
        regionKey: feed.regionKey,
        regionLabel: feed.regionLabel,
      }),
    );
  }

  const azerbaijan: Array<{ label: string; lat: number; lng: number; query: string }> = [
    { label: "Bakü", lat: 40.4093, lng: 49.8671, query: "Baku Azerbaijan news" },
    { label: "Gence", lat: 40.6828, lng: 46.3606, query: "Ganja Azerbaijan news" },
    { label: "Sumgayıt", lat: 40.5897, lng: 49.6686, query: "Sumqayit Azerbaijan news" },
    { label: "Lankaran", lat: 38.7536, lng: 48.851, query: "Lankaran Azerbaijan news" },
    { label: "Nahçıvan", lat: 39.2089, lng: 45.4122, query: "Nakhchivan Azerbaijan news" },
  ];
  for (const row of azerbaijan) {
    rows.push(
      regionalFeed({
        name: `Azerbaycan ${row.label}`,
        url: googleNewsRssUrl(row.query, { hl: "en", gl: "AZ", ceid: "AZ:en" }),
        continent: "asia",
        countryCode: "AZ",
        countryName: "Azerbaycan",
        priority: 38,
        lat: row.lat,
        lng: row.lng,
        regionKey: `az-${normalizeRegionKey(row.label)}`,
        regionLabel: row.label,
      }),
    );
  }

  const georgia: Array<{ label: string; lat: number; lng: number; query: string }> = [
    { label: "Tiflis", lat: 41.7151, lng: 44.8271, query: "Tbilisi Georgia news" },
    { label: "Batumi", lat: 41.6168, lng: 41.6367, query: "Batumi Georgia news" },
    { label: "Kutaisi", lat: 42.2679, lng: 42.6946, query: "Kutaisi Georgia news" },
  ];
  for (const row of georgia) {
    rows.push(
      regionalFeed({
        name: `Gürcistan ${row.label}`,
        url: googleNewsRssUrl(row.query, { hl: "en", gl: "GE", ceid: "GE:en" }),
        continent: "asia",
        countryCode: "GE",
        countryName: "Gürcistan",
        priority: 38,
        lat: row.lat,
        lng: row.lng,
        regionKey: `ge-${normalizeRegionKey(row.label)}`,
        regionLabel: row.label,
      }),
    );
  }

  const balkans: Array<{ label: string; lat: number; lng: number; countryCode: string; countryName: string; query: string }> = [
    { label: "Atina", lat: 37.9838, lng: 23.7275, countryCode: "GR", countryName: "Yunanistan", query: "Athens Greece news" },
    { label: "Selanik", lat: 40.6401, lng: 22.9444, countryCode: "GR", countryName: "Yunanistan", query: "Thessaloniki Greece news" },
    { label: "Sofya", lat: 42.6977, lng: 23.3219, countryCode: "BG", countryName: "Bulgaristan", query: "Sofia Bulgaria news" },
    { label: "Bükreş", lat: 44.4268, lng: 26.1025, countryCode: "RO", countryName: "Romanya", query: "Bucharest Romania news" },
    { label: "Belgrad", lat: 44.7866, lng: 20.4489, countryCode: "RS", countryName: "Sırbistan", query: "Belgrade Serbia news" },
    { label: "Tiran", lat: 41.3275, lng: 19.8187, countryCode: "AL", countryName: "Arnavutluk", query: "Tirana Albania news" },
    { label: "Üsküp", lat: 41.9981, lng: 21.4254, countryCode: "MK", countryName: "Kuzey Makedonya", query: "Skopje North Macedonia news" },
    { label: "Saraybosna", lat: 43.8563, lng: 18.4131, countryCode: "BA", countryName: "Bosna Hersek", query: "Sarajevo Bosnia news" },
    { label: "Zagreb", lat: 45.815, lng: 15.9819, countryCode: "HR", countryName: "Hırvatistan", query: "Zagreb Croatia news" },
    { label: "Podgorica", lat: 42.4304, lng: 19.2594, countryCode: "ME", countryName: "Karadağ", query: "Podgorica Montenegro news" },
  ];
  for (const row of balkans) {
    rows.push(
      regionalFeed({
        name: `${row.countryName} ${row.label}`,
        url: googleNewsRssUrl(row.query, { hl: "en", gl: row.countryCode, ceid: `${row.countryCode}:en` }),
        continent: "europe",
        countryCode: row.countryCode,
        countryName: row.countryName,
        priority: 36,
        lat: row.lat,
        lng: row.lng,
        regionKey: `${row.countryCode.toLowerCase()}-${normalizeRegionKey(row.label)}`,
        regionLabel: row.label,
      }),
    );
  }

  const adjacent: Array<{ label: string; lat: number; lng: number; countryCode: string; countryName: string; continent: string; query: string }> = [
    { label: "Halep", lat: 36.2021, lng: 37.1343, countryCode: "SY", countryName: "Suriye", continent: "middle-east", query: "Aleppo Syria news" },
    { label: "Şam", lat: 33.5138, lng: 36.2765, countryCode: "SY", countryName: "Suriye", continent: "middle-east", query: "Damascus Syria news" },
    { label: "Erbil", lat: 36.1911, lng: 44.0092, countryCode: "IQ", countryName: "Irak", continent: "middle-east", query: "Erbil Iraq news" },
    { label: "Musul", lat: 36.3566, lng: 43.164, countryCode: "IQ", countryName: "Irak", continent: "middle-east", query: "Mosul Iraq news" },
    { label: "Tebriz", lat: 38.0962, lng: 46.2738, countryCode: "IR", countryName: "İran", continent: "middle-east", query: "Tabriz Iran news" },
    { label: "Tahran", lat: 35.6892, lng: 51.389, countryCode: "IR", countryName: "İran", continent: "middle-east", query: "Tehran Iran news" },
    { label: "Erivan", lat: 40.1792, lng: 44.4991, countryCode: "AM", countryName: "Ermenistan", continent: "asia", query: "Yerevan Armenia news" },
    { label: "Kerkük", lat: 35.4681, lng: 44.3922, countryCode: "IQ", countryName: "Irak", continent: "middle-east", query: "Kirkuk Iraq news" },
  ];
  for (const row of adjacent) {
    rows.push(
      regionalFeed({
        name: `${row.countryName} ${row.label}`,
        url: googleNewsRssUrl(row.query, { hl: "en", gl: row.countryCode, ceid: `${row.countryCode}:en` }),
        continent: row.continent,
        countryCode: row.countryCode,
        countryName: row.countryName,
        priority: 35,
        lat: row.lat,
        lng: row.lng,
        regionKey: `${row.countryCode.toLowerCase()}-${normalizeRegionKey(row.label)}`,
        regionLabel: row.label,
      }),
    );
  }

  return rows;
}

export const NEWSMAP_REGIONAL_RSS_FEED_COUNT = buildNewsmapRegionalRssFeedRows().length;
