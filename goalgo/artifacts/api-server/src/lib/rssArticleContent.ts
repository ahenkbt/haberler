import { isHaberlerComUrl, scrapeHaberlerArticle } from "./haberlerComScraper.js";
import { stripHaberlerShareAndChrome } from "./haberlerArticleHtmlCleanup.js";

/** Haber makalesi URL'sinden tam içerik HTML'i çeker (RSS kampanya + doğrudan içe aktarma). */
export async function fetchArticleContentHtml(articleUrl: string): Promise<string> {
  if (isHaberlerComUrl(articleUrl)) {
    const scraped = await scrapeHaberlerArticle(articleUrl);
    return scraped?.contentHtml ?? "";
  }
  try {
    const r = await fetch(articleUrl, {
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
    });
    if (!r.ok) return "";
    const html = await r.text();

    const articleMatch =
      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ??
      html.match(
        /class="[^"]*(?:news-detail|article-body|article-content|post-content|entry-content|haber-detay|haber-icerik|content-body|detail-content|news-content|new3detail)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/i,
      ) ??
      html.match(
        /class="[^"]*(?:article|post|entry|content|haber|icerik|detail)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|main)>/i,
      ) ??
      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

    const rawHtml = articleMatch ? articleMatch[1] : html;

    let cleaned = stripHaberlerShareAndChrome(rawHtml)
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<aside[\s\S]*?<\/aside>/gi, "")
      .replace(/<form[\s\S]*?<\/form>/gi, "")
      .replace(
        /<div[^>]*(?:class|id)="[^"]*(?:ad[-_]|advert|banner|social[-_]share|share[-_]|related[-_]|tag[-_]cloud|newsletter|cookie|popup|modal|widget-ad)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
        "",
      );

    cleaned = cleaned.replace(/\s+on\w+="[^"]*"/gi, "");
    cleaned = cleaned.replace(/href="javascript:[^"]*"/gi, 'href="#"');

    const textOnly = cleaned.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (textOnly.length < 50) return "";

    return cleaned.trim();
  } catch {
    return "";
  }
}
