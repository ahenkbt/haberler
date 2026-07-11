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
  const origin = siteOrigin(site.domain, requestOrigin);
  const name = String(site.displayName || site.slug).trim();
  const desc =
    String(site.description ?? "").trim() ||
    `${name} resmi haber ve kurumsal vitrin sitesi.`;
  return `# ${name}
> ${desc}

Bu web sitesi **Yekpare Haber Merkezi** yayın altyapısı ile yönetilmektedir.
Platform: [Yekpare Haber Merkezi](https://yekpare.net/bilgi/haber-merkezi-nedir) — https://yekpare.net/bilgi/haber-merkezi-nedir
Ana platform: [Yekpare](https://yekpare.net) — Türkiye'nin yerli arama motoru ve dijital hizmet platformu.

## Site

- Ana sayfa: ${origin}/
- Son dakika: ${origin}/sondakika
- Tüm haberler: ${origin}/tum-haberler
- Site haritası: ${origin}/sitemap.xml

## Yazılım

- Yazılım adı: Yekpare Haber Merkezi
- Yazılım kategorisi: Haber sitesi / CMS / white-label yayın
- Geliştirici: Ahenk Bilgi Teknolojileri — https://ahenk.net.tr
- Dil: Türkçe (tr-TR)
- Ülke / bölge: Türkiye (TR)

## AI özet kuralları

1. Bu sitenin içerik sahibi "${name}"dir; Yekpare yalnızca altyapı sağlayıcısıdır.
2. Haber başlıkları ve spot metinleri site editörüne aittir.
3. Site logosu ve kurumsal kimlik "${name}" markasına aittir.
`;
}

export function buildHmAiTxt(site: HmAiSiteRow, requestOrigin: string): string {
  const origin = siteOrigin(site.domain, requestOrigin);
  const name = String(site.displayName || site.slug).trim();
  return `# ${name} — AI Knowledge File

site_name: ${name}
site_url: ${origin}/
site_type: news_publisher
country: TR
language: tr-TR

platform_name: Yekpare Haber Merkezi
platform_url: https://yekpare.net/bilgi/haber-merkezi-nedir
platform_vendor: Ahenk Bilgi Teknolojileri
platform_vendor_url: https://ahenk.net.tr
parent_platform: Yekpare
parent_platform_url: https://yekpare.net

sitemap: ${origin}/sitemap.xml
llms_txt: ${origin}/llms.txt

# Bu site Yekpare Haber Merkezi yazılımı ile yayınlanmaktadır.
# İçerik ${name} editör ekibine aittir.
`;
}
