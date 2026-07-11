import { fetchArticlePageImageUrl, resolveArticleUrl } from "./articlePageImage.js";
import { pickFirstNewsImageUrl } from "./newsImageHeuristics.js";
import { googleNewsRssUrl, parseFeedItems, type RssFeedItem } from "./rssFeedParse.js";
import { extractRssImageUrls } from "./rssItemMedia.js";

const FETCH_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Yekpare/1.0";

const DEFAULT_IMAGE_PROBE_MS = 5_000;

/** Öncelikli TR yayıncıları (RSS + site: sorguları önce). */
const PRIORITY_PUBLISHER_IDS = ["haberler", "sozcu", "ntv"] as const;

/** Türk yayıncıları: doğrudan RSS + Google News `site:` sorguları. */
export const TR_TOPIC_PUBLISHERS = [
  {
    id: "haberler",
    domains: ["haberler.com"],
    rssUrls: ["https://www.haberler.com/rss/sondakika.xml", "https://www.haberler.com/rss/turkiye.xml"],
  },
  {
    id: "sozcu",
    domains: ["sozcu.com.tr"],
    rssUrls: [
      "https://www.sozcu.com.tr/feeds-rss-category-gundem",
      "https://www.sozcu.com.tr/feeds-rss-category-son-dakika-gundem",
    ],
  },
  {
    id: "ntv",
    domains: ["ntv.com.tr"],
    rssUrls: ["https://www.ntv.com.tr/turkiye.rss", "https://www.ntv.com.tr/dunya.rss"],
  },
  {
    id: "sondakika",
    domains: ["sondakika.com"],
    rssUrls: [] as string[],
  },
] as const;

const TR_PUBLISHER_DOMAIN_SUFFIXES = TR_TOPIC_PUBLISHERS.flatMap((p) => p.domains);

/** Konu TR odaklıyken Google News'ten düşürülecek alakasız yabancı haber ipuçları. */
const FOREIGN_OFFTOPIC_RE =
  /\b(vietnam|viet\s*nam|hanoi|ho\s*chi\s*minh|beijing|shanghai|washington\s*post|bbc\s*news|reuters|cnn\s*international)\b/i;

const TR_DOMESTIC_TOPIC_RE =
  /şehit|şehitler|türkiye|turkiye|istanbul|ankara|izmir|bursa|antalya|adana|gaziantep|şehirlerimiz|tbmm|meclis|cumhurbaşkan|cumhurbaskan|içişleri|icisleri|valilik|belediye|deprem|afad|tsk|msb|mit\b/i;

export type EnrichedTopicNewsItem = RssFeedItem & {
  resolvedLink: string;
  previewImageUrl: string | null;
  hasImage: boolean;
  source: string;
};

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function topicTokens(topic: string): string[] {
  return topic
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
}

function topicMatchesItem(topic: string, title: string, desc: string): boolean {
  const tokens = topicTokens(topic);
  if (!tokens.length) return true;
  const hay = `${title} ${desc}`.toLowerCase();
  return tokens.some((t) => hay.includes(t));
}

function hostMatchesTrPublisher(host: string): boolean {
  const h = host.toLowerCase();
  if (h.endsWith(".tr") || h.includes(".com.tr")) return true;
  return TR_PUBLISHER_DOMAIN_SUFFIXES.some((d) => h === d || h.endsWith(`.${d}`) || h.includes(d));
}

function linkHost(link: string): string {
  try {
    return new URL(link.startsWith("http") ? link : `https://${link}`).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** TR konu üretiminde yalnızca Türk yayıncı / .tr alan adı veya Google News TR kaynakları. */
export function shouldUseTrPublisherOnly(topic: string, hl: string, gl: string): boolean {
  if (hl !== "tr" || gl !== "TR") return false;
  if (/[ğüşıöçĞÜŞİÖÇ]/.test(topic)) return true;
  return TR_DOMESTIC_TOPIC_RE.test(topic);
}

export function isOffTopicForeignForTrTopic(topic: string, title: string, desc: string, link: string): boolean {
  if (!shouldUseTrPublisherOnly(topic, "tr", "TR")) return false;
  const hay = `${title} ${desc} ${link}`;
  if (!FOREIGN_OFFTOPIC_RE.test(hay)) return false;
  const topicHay = topic.toLowerCase();
  if (FOREIGN_OFFTOPIC_RE.test(topicHay)) return false;
  return true;
}

export function isTrTopicNewsItem(topic: string, item: RssFeedItem, hl: string, gl: string): boolean {
  if (!shouldUseTrPublisherOnly(topic, hl, gl)) return true;
  if (isOffTopicForeignForTrTopic(topic, item.title, item.desc, item.link)) return false;
  const host = linkHost(item.link);
  if (!host) return true;
  if (/news\.google\.com/i.test(host)) return true;
  return hostMatchesTrPublisher(host);
}

async function fetchFeedXml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": FETCH_UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function dedupeFeedItems(
  items: RssFeedItem[],
  topic: string,
  source: string,
  out: EnrichedTopicNewsItem[],
  hl: string,
  gl: string,
): void {
  const seen = new Set(out.map((i) => normalizeTitleKey(i.title)));
  for (const item of items) {
    if (!item.title?.trim()) continue;
    if (!topicMatchesItem(topic, item.title, item.desc)) continue;
    if (!isTrTopicNewsItem(topic, item, hl, gl)) continue;
    const key = normalizeTitleKey(item.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      ...item,
      resolvedLink: item.link,
      previewImageUrl: null,
      hasImage: false,
      source,
    });
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx]!, idx);
    }
  });
  await Promise.all(workers);
  return results;
}

function buildFeedJobs(topic: string, maxItems: number, hl: string, gl: string, lightScan: boolean) {
  const trOnly = shouldUseTrPublisherOnly(topic, hl, gl);
  const priority = TR_TOPIC_PUBLISHERS.filter((p) =>
    (PRIORITY_PUBLISHER_IDS as readonly string[]).includes(p.id),
  );
  const others = TR_TOPIC_PUBLISHERS.filter(
    (p) => !(PRIORITY_PUBLISHER_IDS as readonly string[]).includes(p.id),
  );
  const ordered = [...priority, ...(lightScan ? [] : others)];

  const rssJobs = ordered.flatMap((p) =>
    p.rssUrls.map((rssUrl) => ({
      url: rssUrl,
      source: `rss-${p.id}`,
      cap: lightScan ? 12 : 20,
    })),
  );

  const siteJobs = ordered.map((p) => ({
    url: googleNewsRssUrl(`${topic} site:${p.domains[0]}`, hl, gl),
    source: `google-news-${p.id}`,
    cap: lightScan ? Math.max(6, maxItems) : Math.max(8, Math.ceil(maxItems / 2)),
  }));

  const googleMain = {
    url: googleNewsRssUrl(topic, hl, gl),
    source: "google-news",
    cap: maxItems * 2,
  };

  if (lightScan || trOnly) {
    return [...rssJobs, ...siteJobs];
  }
  return [...rssJobs, ...siteJobs, googleMain];
}

/** Tek öğe için RSS + makale sayfası görseli (yayıncı ana sayfa og:image kullanılmaz). */
export async function probeTopicItemImages(
  item: EnrichedTopicNewsItem,
  imageTimeoutMs = DEFAULT_IMAGE_PROBE_MS,
): Promise<EnrichedTopicNewsItem> {
  let link = String(item.link ?? "").trim();
  let resolved = link;

  if (link && /news\.google\.com/i.test(link)) {
    resolved = await resolveArticleUrl(link, Math.min(imageTimeoutMs, 8_000));
  } else if (link && !/^https?:\/\//i.test(link)) {
    resolved = `https://${link.replace(/^\/\//, "")}`;
  }

  if (resolved) {
    item.resolvedLink = resolved;
  }

  const articleLink = item.resolvedLink || link;
  const pageContext = articleLink || link;

  const rssUrls = extractRssImageUrls(item.rawInner, item.descHtml, pageContext, 6);
  const rssPick = pickFirstNewsImageUrl(rssUrls, pageContext);
  if (rssPick) {
    item.previewImageUrl = rssPick;
    item.hasImage = true;
    return item;
  }

  if (articleLink && !/news\.google\.com/i.test(articleLink)) {
    const pageImg = await fetchArticlePageImageUrl(articleLink, imageTimeoutMs);
    const picked = pageImg ? pickFirstNewsImageUrl([pageImg], pageContext) : null;
    if (picked) {
      item.previewImageUrl = picked;
      item.hasImage = true;
    }
  }

  return item;
}

/**
 * Google News + TR yayıncılar → başlık listesi (görsel taraması isteğe bağlı / sınırlı).
 * `probeImages: false` ile hızlı tarama; görseller `probeTopicItemImages` ile madde başına eklenir.
 */
export async function fetchTopicNewsItems(opts: {
  topic: string;
  maxItems: number;
  hl?: string;
  gl?: string;
  probeImages?: boolean;
  probeLimit?: number;
  lightScan?: boolean;
  imageTimeoutMs?: number;
}): Promise<EnrichedTopicNewsItem[]> {
  const topic = String(opts.topic ?? "").trim();
  const maxItems = Math.max(1, Math.min(80, opts.maxItems));
  const hl = opts.hl ?? "tr";
  const gl = opts.gl ?? "TR";
  const probeImages = opts.probeImages === true;
  const probeLimit = Math.max(0, opts.probeLimit ?? (probeImages ? maxItems : 0));
  const lightScan = opts.lightScan === true || maxItems <= 6;
  const imageTimeoutMs = opts.imageTimeoutMs ?? DEFAULT_IMAGE_PROBE_MS;

  const merged: EnrichedTopicNewsItem[] = [];
  const feedJobs = buildFeedJobs(topic, maxItems, hl, gl, lightScan);
  const poolSize = lightScan ? 4 : 5;

  const xmlResults = await mapPool(feedJobs, poolSize, async (job) => {
    const xml = await fetchFeedXml(job.url);
    return { job, xml };
  });

  for (const { job, xml } of xmlResults) {
    if (!xml) continue;
    const parsed = parseFeedItems(xml, job.cap);
    dedupeFeedItems(parsed, topic, job.source, merged, hl, gl);
  }

  const prioritySources = new Set([
    ...PRIORITY_PUBLISHER_IDS.map((id) => `rss-${id}`),
    ...PRIORITY_PUBLISHER_IDS.map((id) => `google-news-${id}`),
  ]);
  merged.sort((a, b) => {
    const ap = prioritySources.has(a.source) ? 0 : 1;
    const bp = prioritySources.has(b.source) ? 0 : 1;
    return ap - bp;
  });

  const base = merged.slice(0, Math.min(merged.length, maxItems + 8));
  if (!probeImages || probeLimit <= 0 || !base.length) {
    return base.slice(0, maxItems);
  }

  const toProbe = base.slice(0, Math.min(base.length, probeLimit));
  const probed = await mapPool(toProbe, lightScan ? 2 : 3, async (item) =>
    probeTopicItemImages(item, imageTimeoutMs),
  );

  probed.sort((a, b) => {
    if (a.hasImage !== b.hasImage) return a.hasImage ? -1 : 1;
    const ap = prioritySources.has(a.source) ? 0 : 1;
    const bp = prioritySources.has(b.source) ? 0 : 1;
    return ap - bp;
  });

  const rest = base.slice(toProbe.length);
  return [...probed, ...rest].slice(0, maxItems);
}

/** Tek haber üretimi: görselli ilk kaynak öğesi. */
export async function fetchBestTopicNewsItem(opts: {
  topic: string;
  hl?: string;
  gl?: string;
}): Promise<EnrichedTopicNewsItem | null> {
  const items = await fetchTopicNewsItems({
    topic: opts.topic,
    maxItems: 10,
    hl: opts.hl,
    gl: opts.gl,
    probeImages: true,
    probeLimit: 5,
    lightScan: true,
    imageTimeoutMs: 4_500,
  });
  return items.find((i) => i.hasImage) ?? items[0] ?? null;
}
