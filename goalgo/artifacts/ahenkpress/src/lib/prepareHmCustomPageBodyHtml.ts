import { rewriteInlineHtmlImgSrc } from "@/lib/apiBase";
import { cleanHmImportedTemplateHtml } from "@/lib/hmImportedPageCleanup";
import { sanitizeHmImportedTemplateHtml } from "@/lib/hmImportedTemplateHtml";
import { rewriteHmSiteAnchorsInHtml } from "@/lib/rewriteNewsBodyLinksForHm";

export function looksLikeHmRichPageHtml(html: string): boolean {
  const h = String(html ?? "");
  if (!h.trim()) return false;
  return (
    /<(style|link)\b/i.test(h) ||
    /<(html|head|body)\b/i.test(h) ||
    /\b(tp-|hm-vkd|ms-portal|vkv-|vkv_|ib-|kurum-hero|dsg-hero|td-hero|sh-hero|hero-)\b/i.test(h) ||
    /\bclass="[^"]*\bfa[\s-]/i.test(h)
  );
}

export function shouldUseHmTemplatePageBody(opts: {
  corporate: boolean;
  importSource?: string | null;
  bodyHtml: string;
}): boolean {
  if (opts.corporate) return true;
  if (opts.importSource === "wordpress-template") return true;
  return looksLikeHmRichPageHtml(opts.bodyHtml);
}

/**
 * Editör önizlemesi ve vitrinde aynı HTML işleme: head içi CSS’i gövdeye taşır, görselleri düzeltir.
 */
export function prepareHmCustomPageBodyHtml(
  raw: string,
  opts: {
    corporate: boolean;
    importSource?: string | null;
    site?: { slug: string; siteId: number; domain?: string | null };
  },
): string {
  let html = String(raw ?? "");
  if (!html.trim()) return "";

  if (opts.site) {
    html = rewriteHmSiteAnchorsInHtml(html, {
      slug: opts.site.slug,
      siteId: opts.site.siteId,
      domain: opts.site.domain ?? null,
    });
  }

  if (typeof window !== "undefined") {
    html = rewriteInlineHtmlImgSrc(html);
  }

  const usePipeline =
    opts.corporate || opts.importSource === "wordpress-template" || looksLikeHmRichPageHtml(html);

  if (!usePipeline) return html;

  try {
    return sanitizeHmImportedTemplateHtml(cleanHmImportedTemplateHtml(html));
  } catch {
    return cleanHmImportedTemplateHtml(html);
  }
}
