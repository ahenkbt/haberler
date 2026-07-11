import { seoPlainSnippet } from "@/lib/pageSeo";
import {
  getTurkeyDateKey,
  pickDailyItem,
  pickDailyItems,
  turkeyMonthDayKey,
} from "@/lib/wikiDailyRotation";

export type WikiDailyItem = { text: string; wikiTitle?: string };

export type WikiHomepageFeed = {
  date: string;
  fetchedAt: string;
  featuredArticle?: { title: string; extract: string; thumbnail?: string | null };
  onThisDay?: { label: string; items: WikiDailyItem[] };
  didYouKnow?: { items: WikiDailyItem[] };
  featuredPicture?: { title: string; caption: string; imageUrl: string; wikiTitle?: string };
  goodArticle?: { title: string; extract: string; thumbnail?: string | null };
};

const FALLBACK_FEATURED_POOL: Array<{ title: string; extract: string }> = [
  {
    title: "Türkiye",
    extract:
      "Resmî adıyla Türkiye Cumhuriyeti, Anadolu ve Doğu Trakya'yı kapsayan, Avrupa ve Asya'da toprakları bulunan ülkedir.",
  },
  {
    title: "Ankara",
    extract: "Türkiye Cumhuriyeti'nin başkenti ve ikinci en kalabalık şehridir.",
  },
  {
    title: "İstanbul",
    extract: "Türkiye'nin en kalabalık şehri ve kültürel merkezlerinden biridir.",
  },
  {
    title: "Osmanlı İmparatorluğu",
    extract: "1299-1922 yılları arasında hüküm sürmüş çok uluslu imparatorluktur.",
  },
  {
    title: "Mustafa Kemal Atatürk",
    extract: "Türkiye Cumhuriyeti'nin kurucusu ve ilk cumhurbaşkanıdır.",
  },
  {
    title: "Kapadokya",
    extract: "Peri bacaları ve yeraltı şehirleriyle ünlü Anadolu bölgesidir.",
  },
];

const FALLBACK_GOOD_POOL: Array<{ title: string; extract: string }> = [
  { title: "İzmir", extract: "Ege'nin en büyük metropolü ve önemli liman kentidir." },
  { title: "Antalya", extract: "Akdeniz'in başlıca turizm merkezlerinden biridir." },
  { title: "Bursa", extract: "Osmanlı'nın ilk başkenti ve sanayi kentidir." },
  { title: "Trabzon", extract: "Karadeniz'in tarihî ve coğrafi merkezlerinden biridir." },
  { title: "Konya", extract: "Mevlana ile tanınan İç Anadolu'nun önemli şehridir." },
];

const FALLBACK_ON_THIS_DAY_POOL: WikiDailyItem[] = [
  { text: "19 Mayıs — Atatürk'ü Anma, Gençlik ve Spor Bayramı", wikiTitle: "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
  { text: "23 Nisan — Ulusal Egemenlik ve Çocuk Bayramı", wikiTitle: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı" },
  { text: "29 Ekim — Cumhuriyet Bayramı", wikiTitle: "29 Ekim Cumhuriyet Bayramı" },
  { text: "30 Ağustos — Zafer Bayramı", wikiTitle: "30 Ağustos Zafer Bayramı" },
  { text: "10 Kasım — Atatürk'ü Anma Günü", wikiTitle: "10 Kasım" },
  { text: "18 Mart — Çanakkale Zaferi ve Şehitleri Anma Günü", wikiTitle: "18 Mart Çanakkale Zaferi ve Şehitleri Anma Günü" },
];

const FALLBACK_DYK_POOL: WikiDailyItem[] = [
  { text: "Mustafa Kemal Atatürk, Türkiye Cumhuriyeti'nin kurucusudur.", wikiTitle: "Mustafa Kemal Atatürk" },
  { text: "Osmanlı İmparatorluğu 1299-1922 yılları arasında hüküm sürmüştür.", wikiTitle: "Osmanlı İmparatorluğu" },
  { text: "Ankara, Türkiye Cumhuriyeti'nin başkentidir.", wikiTitle: "Ankara" },
  { text: "İstanbul Boğazı, Avrupa ile Asya'yı birbirine bağlar.", wikiTitle: "İstanbul Boğazı" },
  { text: "Anadolu, tarih boyunca birçok medeniyete ev sahipliği yapmıştır.", wikiTitle: "Anadolu" },
];

const FALLBACK_PICTURE_POOL: Array<{
  title: string;
  caption: string;
  imageUrl: string;
  wikiTitle: string;
}> = [
  {
    title: "Ayasofya",
    caption: "İstanbul'un simge yapılarından biri",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Hagia_Sophia_Mars_2013.jpg/330px-Hagia_Sophia_Mars_2013.jpg",
    wikiTitle: "Ayasofya",
  },
  {
    title: "Anıtkabir",
    caption: "Ankara'da Mustafa Kemal Atatürk'ün anıt mezarı",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/An%C4%B1tkabir_%28cropped%29.jpg/330px-An%C4%B1tkabir_%28cropped%29.jpg",
    wikiTitle: "Anıtkabir",
  },
  {
    title: "Kapadokya",
    caption: "Peri bacaları ve balon turlarıyla ünlü bölge",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Hot_air_ballooning_in_Cappadocia.jpg/330px-Hot_air_ballooning_in_Cappadocia.jpg",
    wikiTitle: "Kapadokya",
  },
];

/** Vikipedi anasayfası alınamazsa günlük tohumla dönen yedek akış. */
export function buildRotatedFallbackDaily(dateKey = getTurkeyDateKey()): WikiHomepageFeed {
  const monthDay = turkeyMonthDayKey();
  const todayItems = FALLBACK_ON_THIS_DAY_POOL.filter((item) => {
    const md = item.text.match(/^(\d{1,2})\s+(\S+)/);
    if (!md) return false;
    const day = md[1].padStart(2, "0");
    const monthNames: Record<string, string> = {
      Ocak: "01", Şubat: "02", Mart: "03", Nisan: "04", Mayıs: "05", Haziran: "06",
      Temmuz: "07", Ağustos: "08", Eylül: "09", Ekim: "10", Kasım: "11", Aralık: "12",
    };
    const month = monthNames[md[2]] ?? "";
    return month && `${month}-${day}` === monthDay;
  });
  const onThisDayItems = todayItems.length > 0
    ? todayItems
    : pickDailyItems(FALLBACK_ON_THIS_DAY_POOL, 2, dateKey);
  const picture = pickDailyItem(FALLBACK_PICTURE_POOL, dateKey);

  return {
    date: dateKey,
    fetchedAt: new Date().toISOString(),
    featuredArticle: { ...pickDailyItem(FALLBACK_FEATURED_POOL, dateKey), thumbnail: null },
    goodArticle: { ...pickDailyItem(FALLBACK_GOOD_POOL, dateKey), thumbnail: null },
    onThisDay: {
      label: "Tarihte bugün",
      items: onThisDayItems,
    },
    didYouKnow: {
      items: pickDailyItems(FALLBACK_DYK_POOL, 3, `${dateKey}:dyk`),
    },
    featuredPicture: picture,
  };
}

export const CLIENT_FALLBACK_DAILY: WikiHomepageFeed = buildRotatedFallbackDaily();

export function hasWikiDailyBlocks(feed: WikiHomepageFeed | null | undefined): boolean {
  if (!feed) return false;
  return Boolean(
    feed.featuredArticle?.title ||
      feed.goodArticle?.title ||
      (feed.onThisDay?.items?.length ?? 0) > 0 ||
      (feed.didYouKnow?.items?.length ?? 0) > 0 ||
      feed.featuredPicture?.imageUrl,
  );
}

export const DAILY_EXCERPT_MAX = 260;

export function plainDailyExcerpt(text: string | null | undefined, max = DAILY_EXCERPT_MAX): string {
  return seoPlainSnippet(text, max);
}

export async function fetchWikiHomepageFeed(): Promise<WikiHomepageFeed> {
  try {
    const r = await fetch("/api/wiki/homepage");
    if (r.ok) {
      const d = (await r.json()) as { success?: boolean; data?: WikiHomepageFeed };
      if (d.success && hasWikiDailyBlocks(d.data)) {
        return d.data!;
      }
    }
  } catch {
    /* fallback below */
  }
  return buildRotatedFallbackDaily();
}
