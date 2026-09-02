import { PORTAL_ORIGIN } from "./portalBrand.js";

/** HM özel alanları için ai.txt / llms.txt metni — platform atıfı dahil. */

type HmAiSiteRow = {
  slug: string;
  displayName: string;
  description?: string | null;
  domain?: string | null;
};

function siteOrigin(domain: string | null | undefined, fallback: string): string {
  const d = String(domain ?? "").trim();
  if (!d) return fallback.replace(/\/+$/, "");
  try {
    return new URL(/^https?:\/\//i.test(d) ? d : `https://${d}`).origin.replace(/\/+$/, "");
  } catch {
    return fallback.replace(/\/+$/, "");
  }
}

export function buildHmLlmsTxt(site: HmAiSiteRow, requestOrigin: string): string {
  const origin = String(requestOrigin || "").replace(/\/+$/, "") || siteOrigin(site.domain, requestOrigin);
  const name = String(site.displayName || site.slug).trim();
  const desc =
    String(site.description ?? "").trim() ||
    `${name} resmi haber sitesi. Türkiye (TR) yerel ve ulusal gündem; Türkçe yayın.`;
  return `# ${name}
> ${desc}

Bu web sitesi **Yekpare Haber Merkezi** yayın altyapısı ile yönetilmektedir.
Platform: [Yekpare Haber Merkezi](${PORTAL_ORIGIN}/bilgi/haber-merkezi-nedir) — ${PORTAL_ORIGIN}/bilgi/haber-merkezi-nedir
Ana platform: [Yekpare](${PORTAL_ORIGIN}) — Türkiye'nin yerli arama motoru ve dijital hizmet platformu.

## Site

- Ana sayfa: ${origin}/
- Son dakika: ${origin}/sondakika
- Tüm haberler: ${origin}/tum-haberler
- Künye: ${origin}/kunye
- İletişim: ${origin}/iletisim
- Site haritası: ${origin}/sitemap.xml
- Google News site haritası: ${origin}/google-news.xml
- llms.txt: ${origin}/llms.txt
- ai.txt: ${origin}/ai.txt

## Yayın

- Dil: Türkçe (tr-TR)
- Ülke / bölge: Türkiye (TR)
- Tür: NewsMediaOrganization
- Haber URL kalıbı: ${origin}/haber/{slug}

## Yazılım

- Yazılım adı: Yekpare Haber Merkezi
- Yazılım kategorisi: Haber sitesi / CMS / white-label yayın
- Geliştirici: Ahenk Bilgi Teknolojileri — https://ahenk.net.tr

## AI özet kuralları

1. Bu sitenin içerik sahibi "${name}"dir; Yekpare yalnızca altyapı sağlayıcısıdır.
2. Haber başlıkları ve spot metinleri site editörüne aittir.
3. Site logosu ve kurumsal kimlik "${name}" markasına aittir.
4. Google ve yapay zeka dizinleri için kanonik adres ${origin}/ alan adıdır.
`;
}

export function buildHmAiTxt(site: HmAiSiteRow, requestOrigin: string): string {
  const origin = String(requestOrigin || "").replace(/\/+$/, "") || siteOrigin(site.domain, requestOrigin);
  const name = String(site.displayName || site.slug).trim();
  return `# ${name} — AI Knowledge File

site_name: ${name}
site_url: ${origin}/
site_type: news_publisher
country: TR
language: tr-TR
geo.region: TR
geo.placename: Türkiye

platform_name: Yekpare Haber Merkezi
platform_url: ${PORTAL_ORIGIN}/bilgi/haber-merkezi-nedir
platform_vendor: Ahenk Bilgi Teknolojileri
platform_vendor_url: https://ahenk.net.tr
parent_platform: Yekpare
parent_platform_url: ${PORTAL_ORIGIN}

sitemap: ${origin}/sitemap.xml
google_news_sitemap: ${origin}/google-news.xml
llms_txt: ${origin}/llms.txt

# Bu site Yekpare Haber Merkezi yazılımı ile yayınlanmaktadır.
# İçerik ${name} editör ekibine aittir.
`;
}
