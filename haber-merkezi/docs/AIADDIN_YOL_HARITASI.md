# Aiaddin — ürün anayasası ve yol haritası

Bu belge **Aiaddin** adlı yeni ürünün teknik ve operasyonel **sınırlarını** tanımlar. Okuyanın “başka sistemlere bağlanıyor muyuz?” sorusuna tek cevap: **hayır** — aksi açıkça yazılmadıkça bağlanılmaz.

---

## 1) Kesin kurallar (ihlal edilmez)

| Kural | Açıklama |
|--------|-----------|
| **Yekpare ile sıfır bağ** | Ortak veritabanı, ortak ortam değişkeni, ortak kod deposu “motoru”, Yekpare `api-server` veya Goalgo Postgres’e **doğrudan veya dolaylı bağ** hedeflenmez. Aiaddin, Yekpare’den **ayrı bir ürün** ve **ayrı yaşam döngüsüdür**. |
| **Veritabanı ayrı** | Aiaddin’in tüm kalıcı verisi **kendi MySQL** örneğindedir. Başka ürünlerin DB’si ile şema paylaşımı yoktur. |
| **PostgreSQL kullanılmaz** | Bu ürün hattında **PostgreSQL yoktur**; şema, migrasyon ve operasyon **yalnızca MySQL** (tercihen 8.x) üzerinden planlanır. |
| **İsteğe bağlı tek köprü (ileride)** | Gerekirse **yalnızca Haber Merkezi** ile, **ayrı bir HTTP API** (Aiaddin dışarıya servis verir veya HM’den veri çeker) düşünülebilir. Bu köprü **Yekpare değildir** ve zorunlu değildir. |

Bu dört madde ürünün “anayasasıdır”; mimari tartışmalarında önce buraya dönülür.

---

## 2) Hedef yığın (omurga)

- **Sunucu:** PHP (FPM), **MySQL**, TLS, yedekleme (WHM / panel / VDS — sizin barındırma tercihiniz).
- **Kod:** Repoda referans ve başlangıç için `aiaddin/` altındaki WordPress temaları/eklentileri ve `laravel-businesso` (Laravel + MySQL uyumlu) kaynakları kullanılabilir; **üretim şeması ve güvenlik politikası** sizin kararınızdır.
- **Ön yüz / yönetim:** PHP ile (monolit admin, ayrı SPA + PHP API vb.) — detay [`YOL_HARITASI_AIADDIN_STK_PHP.md`](./YOL_HARITASI_AIADDIN_STK_PHP.md).

**PostgreSQL, Redis’i zorunlu DB gibi dayatma vb. bu belge kapsamı dışındadır**; kalıcı iş verisi MySQL’dedir.

---

## 3) Domain ve dağıtım (özet)

| Kavram | Rol |
|--------|-----|
| **aiaddin.net** (veya seçeceğiniz vitrin alanı) | Ürünün kamuya açık yüzü; **Yekpare domain’lerine DNS / reverse proxy ile bağlanmaz**. |
| **Barındırma** | Kendi sunucunuz veya Aiaddin’e özel hosting; Aiaddin env dosyalarında Yekpare URL’si veya Goalgo `DATABASE_URL` **bulunmaz**. |

Eski belgelerde geçen “Vercel + Railway + Postgres” Aiaddin omurgası **bu ürün vizyonu için geçerli değildir**; Aiaddin PHP+MySQL hattı ile çelişirdi.

---

## 4) Faz planı (özet — Yekpare içermez)

| Faz | İçerik | Çıktı |
|-----|--------|--------|
| **F0** | Proje iskeleti, repo düzeni, `aiaddin/README.md`, MySQL boş şema + migrasyon aracı (ör. Laravel migration veya düz SQL) | Tek komutla kurulabilir taban |
| **F1** | Kimlik / tenant / site tabloları (haber + STK için ortak çekirdek) | MySQL şeması, yedekleme prosedürü |
| **F2** | Çekirdek PHP uygulaması (public site + admin iskeleti) | Çalışan staging |
| **F3** | Haber modülü veya STK modülü (öncelik ürün kararına göre) | İlk müşteri / pilot |
| **F4** | Medya, SEO, e-posta, günlükler | Operasyonel olgunluk |
| **F5 (isteğe bağlı)** | **Haber Merkezi** ile sınırlı, sözleşmeli **REST API** (tek yönlü veya çift yönlü — ayrı tasarım belgesi) | Entegrasyon; Yekpare yok |

---

## 5) Dikkat

- **Gizli anahtarlar** yalnız Aiaddin sunucusu ve güvenilir CI ortamında; istemci tarafına gömülmez.
- **“Haber Merkezi köprüsü”** açılırsa: ayrı güvenlik incelemesi, rate limit, audit log; yine **Yekpare proxy’si yoktur**.

---

## 6) Repodaki diğer klasörler hakkında

Monorepoda `haber-merkezi/` veya `goalgo/` gibi yollar **Aiaddin anayasasına tabi değildir**; Aiaddin ürünü bunlara **bağlanmadan** evrilir. Kod paylaşımı ihtiyacı doğarsa **kopya + lisans kontrolü** ile ayrı modül olarak ele alınır, canlı bağlantı kurulmaz.

---

## 7) Genişletilmiş plan (STK + PHP + WHM)

[`YOL_HARITASI_AIADDIN_STK_PHP.md`](./YOL_HARITASI_AIADDIN_STK_PHP.md) — Aiaddin’i **PHP + MySQL** ve çoklu site (haber + kurumsal) açısından fazlandırır; **PostgreSQL ve Yekpare** bu belgeyle hizalanmıştır.

---

*Repo içi planlama belgesidir; son güncelleme: 2026.*
