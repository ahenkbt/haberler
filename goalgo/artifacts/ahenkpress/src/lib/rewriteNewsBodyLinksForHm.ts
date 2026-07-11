import { hmPublicHref } from "@/lib/hmPublicLinks";
import { isLikelyHmExtraPagePublicPath } from "@/lib/hmExtraPageLookup";

const YEKPARE_HOSTS = /^(?:www\.)?yekpare\.net$/i;

function pathOnly(p: string): string {
  const t = p.trim().split("#")[0] ?? "";
  const q = t.indexOf("?");
  return q === -1 ? t : t.slice(0, q);
}

/** HM vitrininde site içinde tutulacak portal yolları (tam yol + sorgu). */
function isHmScopedPortalPath(pathnameWithQuery: string): boolean {
  const base = pathOnly(pathnameWithQuery);
  if (!base.startsWith("/")) return false;
  if (base.startsWith("/haber/")) {
    const idPart = base.slice("/haber/".length);
    return !!idPart && !idPart.includes("/");
  }
  if (base.startsWith("/kategori/")) {
    const rest = base.slice("/kategori/".length);
    return !!rest && !rest.includes("/");
  }
  if (base === "/tum-haberler" || base.startsWith("/tum-haberler?") || base.startsWith("/tum-haberler/")) return true;
  if (base === "/yazarlar" || base.startsWith("/yazarlar?") || base.startsWith("/yazarlar/")) return true;
  if (base === "/sitene-ekle" || base.startsWith("/sitene-ekle?") || base.startsWith("/sitene-ekle/")) return true;
  if (base === "/foto-galeri" || base.startsWith("/foto-galeri?")) return true;
  if (base.startsWith("/foto-galeri/")) {
    const rest = base.slice("/foto-galeri/".length).split("?")[0] ?? "";
    return !!rest && !rest.includes("/");
  }
  if (base === "/kunye" || base.startsWith("/kunye?")) return true;
  if (base === "/reklam" || base.startsWith("/reklam?")) return true;
  if (base === "/abonelik" || base.startsWith("/abonelik?")) return true;
  if (base === "/telif-kullanim" || base.startsWith("/telif-kullanim?")) return true;
  if (base === "/iletisim" || base.startsWith("/iletisim?")) return true;
  if (base === "/rss-baglantilari" || base.startsWith("/rss-baglantilari?")) return true;
  if (
    base === "/bilgiagaci" ||
    base.startsWith("/bilgiagaci?") ||
    base.startsWith("/bilgiagaci/") ||
    base === "/ansiklopedi" ||
    base.startsWith("/ansiklopedi?") ||
    base.startsWith("/ansiklopedi/")
  ) return true;
  if (base === "/ataturk" || base.startsWith("/ataturk?") || base.startsWith("/ataturk/")) return true;
  if (base === "/video-tv" || base.startsWith("/video-tv?") || base.startsWith("/video-tv/")) return true;
  if (base === "/savaslar" || base.startsWith("/savaslar?") || base.startsWith("/savaslar/")) return true;
  if (base === "/milli-gunler" || base.startsWith("/milli-gunler?") || base.startsWith("/milli-gunler/")) return true;
  if (base === "/kultur-portali" || base.startsWith("/kultur-portali?") || base.startsWith("/kultur-portali/")) return true;
  if (base.startsWith("/sayfa/")) {
    const rest = base.slice("/sayfa/".length).split("?")[0] ?? "";
    return !!rest && !rest.includes("/");
  }
  if (isLikelyHmExtraPagePublicPath(base)) return true;
  return false;
}

/**
 * Haber gövdesi ve özel sayfa HTML’indeki portal yollarını
 * HM vitrin yoluna (`/tr/{slug}/...` veya özel alan) çevirir.
 */
export function rewriteHmSiteAnchorsInHtml(
  html: string,
  opts: { slug: string; siteId: number; domain?: string | null },
): string {
  const raw = String(html ?? "");
  if (!raw || !opts.slug) return raw;

  const applyHref = (url: string): string | null => {
    const u = url.trim();
    if (!u || u.startsWith("#") || /^(javascript|mailto|tel|data):/i.test(u)) return null;
    try {
      if (/^https?:\/\//i.test(u)) {
        const parsed = new URL(u);
        if (!YEKPARE_HOSTS.test(parsed.hostname)) return null;
        const inner = parsed.pathname + (parsed.search || "");
        if (!isHmScopedPortalPath(inner)) return null;
        return hmPublicHref(inner, { domain: opts.domain ?? null, slug: opts.slug, siteId: opts.siteId });
      }
      if (u.startsWith("/")) {
        if (!isHmScopedPortalPath(u)) return null;
        return hmPublicHref(u, { domain: opts.domain ?? null, slug: opts.slug, siteId: opts.siteId });
      }
    } catch {
      return null;
    }
    return null;
  };

  return raw.replace(/\bhref\s*=\s*(["'])([^"']*)\1/gi, (full, quote: string, hrefVal: string) => {
    const next = applyHref(hrefVal);
    if (!next) return full;
    const q = quote === "'" || quote === '"' ? quote : '"';
    return `href=${q}${next}${q}`;
  });
}

/** @deprecated Aynı işlev — geriye dönük isim. */
export function rewriteNewsBodyLinksForHm(
  html: string,
  opts: { slug: string; siteId: number; domain?: string | null },
): string {
  return rewriteHmSiteAnchorsInHtml(html, opts);
}
