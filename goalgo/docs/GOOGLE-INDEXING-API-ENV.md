# Haber SEO — Google Indexing, Site Haritası Ping, Webmaster Doğrulama

Yekpare haber yayınlandığında (`news` tablosu, `status=published`) sistem:

1. **Google Indexing API** ile URL bildirimi (kimlik bilgisi varsa)
2. **Site haritası ping** — Google, Bing, Yandex (haber + site index URL'leri)
3. Zengin **haber site haritası** (`news:news`, `hreflang=tr-TR`, görsel geo, otomatik anahtar kelimeler)

---

## Ortam değişkenleri (Render / `.env`)

### Google Indexing API (tercih edilen — tekil URL)

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `GOOGLE_INDEXING_CLIENT_EMAIL` | Evet* | Google Cloud servis hesabı e-postası |
| `GOOGLE_INDEXING_PRIVATE_KEY` | Evet* | PEM private key (`\n` kaçışlı tek satır) |
| `GOOGLE_INDEXING_CREDENTIALS_JSON` | Alternatif | Tam servis hesabı JSON |
| `GOOGLE_INDEXING_DISABLED` | Hayır | `1` ise Indexing API kapalı |

\* İkisi veya JSON — en az biri gerekli.

### Site haritası ping (Google + Bing + Yandex)

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `SITEMAP_PING_DISABLED` | Hayır | `1` ise tüm pingler kapalı |
| `SITEMAP_PING_COOLDOWN_MS` | Hayır | Aynı URL için minimum aralık (varsayılan 300000 = 5 dk) |
| `SITE_PUBLIC_ORIGIN` | Hayır | yekpare.net kök (ör. `https://yekpare.net`) |

Ping hedefleri (her güncellemede):

- Google: `https://www.google.com/ping?sitemap=...`
- Bing: `https://www.bing.com/ping?sitemap=...`
- Yandex: `https://webmaster.yandex.com/ping?sitemap=...`

---

## Google Cloud kurulumu (Indexing API)

1. [Google Cloud Console](https://console.cloud.google.com/) → **Web Search Indexing API** etkinleştirin.
2. Servis hesabı oluşturun → JSON anahtarı indirin.
3. [Google Search Console](https://search.google.com/search-console) → her mülk için servis hesabını **Sahip** veya **Tam** yetki ile ekleyin.
4. Render ortamına kimlik bilgilerini ekleyin.

---

## Webmaster doğrulama (GSC / Bing / Yandex)

Doğrulama meta etiketleri **admin panelden** girilir; kod değişikliği gerekmez.

| Site | Panel yolu | Alan |
|------|------------|------|
| Yekpare portal | Admin → Genel Ayarlar → SEO | `googleSiteVerification`, `bingSiteVerification`, `yandexVerification` |
| HM editör sitesi | Admin → Haber Siteleri → site düzenle → SEO | Aynı alanlar (`seoVerification` JSON) |

Meta etiketler otomatik olarak:

- SPA `index.html` içine enjekte edilir
- Doğrulama botları için minimal HTML sayfası sunulur

---

## Site haritası URL'leri

### Yekpare (yekpare.net)

| URL | İçerik |
|-----|--------|
| `/sitemap.xml` | Ana dizin |
| `/news-yekpare.xml` | Merkez haber havuzu + `/haberler` hub |
| `/news-yekpare-cat-{slug}.xml` | Kategori başına haberler |

### HM editör siteleri (özel alan adı)

| URL | İçerik |
|-----|--------|
| `https://{alan-adı}/sitemap.xml` | Siteye özel dizin |
| `https://{alan-adı}/news-hm-{slug}.xml` | Site haberleri (mutlak URL) |
| `https://{alan-adi}/news-hm/{slug}/{kategori}.xml` | Kategori site haritası |

Tüm haber URL'leri site haritasında:

- `news:publication` + `news:language` (tr)
- `news:keywords` — otomatik Türkçe etiketler (≥10)
- `news:genres` — kategoriye göre
- `xhtml:link hreflang="tr-TR"`
- `image:geo_location` — Türkiye
- `lastmod`, `priority`, `changefreq`

Site haritası listesi: `/api/sitemap/list.json` veya admin **Site Haritaları** sayfası.

---

## Etiket geri doldurma (≥10 Türkçe anahtar kelime)

```bash
cd goalgo
pnpm exec tsx artifacts/api-server/scripts/backfill-news-keywords.ts --dry-run
pnpm exec tsx artifacts/api-server/scripts/backfill-news-keywords.ts --limit=2000
```

---

## RSS otomasyonu ile entegrasyon

- RSS kategori batch (20 benzersiz haber/kategori) sonrası **tüm portal + HM** site haritaları pinglenir.
- `portal_rss_items` havuzu **180 gün** saklanır; `news` tablosu kalıcıdır.
- Silinen haber slug'ları `news_slug_redirects` → 301 arama yönlendirmesi.
