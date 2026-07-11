import { fetchArticlePageImageUrl, resolveArticleUrl } from "./articlePageImage.js";
import { downloadExternalImageToMedia } from "./mediaUploadService.js";
import { firstMagnificPhotoPreview } from "./magnific-stock.js";
import { getMagnificApiKey } from "./magnificApiKey.js";
import { normalizeAiNewsHtml } from "./normalizeAiNewsHtml.js";
import { isLikelyPublisherLogoUrl, pickFirstNewsImageUrl } from "./newsImageHeuristics.js";
import { extractRssImageUrls } from "./rssItemMedia.js";

/** Alt başlıklardan sonra (veya ilk paragraftan sonra) gömülü haber görseli. */
export function insertImagesAfterHeadings(html: string, localUrls: string[], maxInline = 2): string {
  const imgs = localUrls.filter(Boolean).slice(0, maxInline);
  if (!imgs.length || !html.trim()) return html;

  const figure = (url: string) =>
    `<figure class="news-inline-figure"><img src="${url}" alt="" loading="lazy" decoding="async" /></figure>`;

  let idx = 0;
  let out = html.replace(/<\/h[23]>/gi, (close) => {
    if (idx >= imgs.length) return close;
    return `${close}\n${figure(imgs[idx++]!)}`;
  });

  if (idx === 0) {
    out = out.replace(/<\/p>/i, (close) => `${close}\n${figure(imgs[0]!)}`);
    idx = 1;
  }

  return out;
}

async function downloadRssImages(externalUrls: string[], title: string, max = 3): Promise<string[]> {
  const local: string[] = [];
  for (const url of externalUrls.slice(0, max)) {
    try {
      const saved = await downloadExternalImageToMedia(url, { title, hashSeed: url });
      if (saved && !local.includes(saved)) local.push(saved);
    } catch {
      /* skip broken image */
    }
  }
  return local;
}

async function resolveSourceImageUrl(
  imageUrl: string | null | undefined,
  title: string,
): Promise<string | null> {
  const raw = String(imageUrl ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("/api/media/uploads/")) return raw;
  if (/^https?:\/\//i.test(raw)) {
    return (await downloadExternalImageToMedia(raw, { title, hashSeed: raw })) ?? null;
  }
  return null;
}

async function pushUniqueExternal(
  out: string[],
  url: string | null | undefined,
  pageUrl?: string,
): Promise<void> {
  const u = String(url ?? "").trim();
  if (!u || !/^https?:\/\//i.test(u)) return;
  if (isLikelyPublisherLogoUrl(u, pageUrl)) return;
  if (!out.includes(u)) out.push(u);
}

/** RSS / sayfa og:image / Magnific ile harici görsel adayları. */
async function collectExternalImageUrls(opts: FinalizeAiNewsOpts): Promise<string[]> {
  const external: string[] = [];

  let articleLink = String(opts.link ?? "").trim();
  if (articleLink && /news\.google\.com/i.test(articleLink)) {
    articleLink = await resolveArticleUrl(articleLink);
  }

  const pageContext = articleLink || opts.link || "";

  if (opts.sourceImageUrl) {
    await pushUniqueExternal(external, opts.sourceImageUrl, pageContext);
  }

  if (opts.rssItemRaw) {
    const rssCandidates = extractRssImageUrls(
      opts.rssItemRaw,
      opts.descriptionHtml ?? "",
      pageContext,
      6,
    );
    const rssPick = pickFirstNewsImageUrl(rssCandidates, pageContext);
    if (rssPick) await pushUniqueExternal(external, rssPick, pageContext);
  }

  if (!external.length && articleLink) {
    await pushUniqueExternal(external, await fetchArticlePageImageUrl(articleLink, 8_000), pageContext);
  }

  const topic = String(opts.topicKeyword ?? "").trim();
  if (!external.length && topic) {
    const magnificKey = await getMagnificApiKey();
    if (magnificKey) {
      try {
        await pushUniqueExternal(external, await firstMagnificPhotoPreview(magnificKey, topic));
      } catch {
        /* stock API optional */
      }
    }
  }

  return external;
}

export type FinalizeAiNewsOpts = {
  icerikRaw: string;
  /** RSS `<item>` iç XML */
  rssItemRaw?: string;
  descriptionHtml?: string;
  link?: string;
  /** Haber başlığı — kapak dosya adı için */
  title?: string;
  /** Havuz / özgünleştirme: kaynak haber kapak görseli */
  sourceImageUrl?: string | null;
  /** Magnific / og yedek araması için konu anahtar kelimesi */
  topicKeyword?: string;
};

/**
 * AI `icerik` → normalize HTML, RSS/kaynak görselleri indir, kapak + gövdeye 1–2 `<img>`.
 */
export async function finalizeAiNewsArticle(opts: FinalizeAiNewsOpts): Promise<{
  content: string;
  imageUrl: string | null;
}> {
  let content = normalizeAiNewsHtml(opts.icerikRaw);

  let external = await collectExternalImageUrls(opts);

  const imageTitle = String(opts.title ?? opts.topicKeyword ?? "").trim() || "haber";

  let downloaded = await downloadRssImages(external, imageTitle, 3);

  if (!downloaded.length && opts.sourceImageUrl) {
    const local = await resolveSourceImageUrl(opts.sourceImageUrl, imageTitle);
    if (local) downloaded = [local];
  }

  const imageUrl = downloaded[0] ?? null;
  const inline = downloaded.length > 1 ? downloaded.slice(0, 2) : downloaded.slice(0, 1);
  if (inline.length) {
    content = insertImagesAfterHeadings(content, inline, 2);
  }

  return { content, imageUrl };
}
