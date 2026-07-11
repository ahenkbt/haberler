# Aiaddin.net — genişletilmiş yol haritası (STK + haber, PHP + MySQL, WHM)

Bu belge **Aiaddin** ürününü **Yekpare’den ve Goalgo Postgres hattından tamamen bağımsız**; **yalnızca PHP + MySQL** ile çoklu site (haber merkezi + STK / kurumsal) operasyonu için faz sırasını ve riskleri netleştirir.

**Kısa anayasa:** [`AIADDIN_YOL_HARITASI.md`](./AIADDIN_YOL_HARITASI.md) — Yekpare bağlantısı yok; **PostgreSQL kullanılmaz**; veritabanı Aiaddin’e özel MySQL’dir.

---

## 0) Önemli çerçeve

| Konu | Karar |
|------|--------|
| **Amaç** | Haber ajansı ve STK / belediye / vakıf tarzı çoklu siteleri **tek kontrol planında** yönetmek; patlama riskini Yekpare’ye yüklememek. |
| **Omurga** | **PHP + MySQL** (tercihen MySQL 8). İkinci bir “resmi” backend (ör. Node + Postgres) **Aiaddin ürünü için tanımlanmaz**. |
| **Yekpare** | **Bağlantı yok:** ortak DB, paylaşılan API anahtarı, `api-server` proxy veya ortak deploy pipeline hedeflenmez. |
| **Haber Merkezi (ileride)** | İstenirse **ayrı bir REST API** ile sınırlı entegrasyon tasarlanabilir; bu **Yekpare üzerinden değil**, ayrı sözleşme ve güvenlik modeliyle yapılır. |
| **Hazır zip (Businesso, WordPress temaları)** | Repoda `aiaddin/` altında **referans / POC / tema ilhamı**; üretimde **lisanslı** ürün veya sıfırdan kod. “Nulled” paketler **önerilmez**. |

---

## 1) Faz A — Temel canlılık (Git + kendi sunucunuz / WHM)

**Süre:** iş paketine göre haftalar.

1. **Git**  
   - Aiaddin uygulaması için **ayrı deploy birimi** (ayrı repo kökü veya monorepoda yalnızca `aiaddin/` ve seçtiğiniz PHP uygulama kökü).  
   - `main` → staging / production dalları ve etiketli sürümler net olsun.

2. **MySQL**  
   - Aiaddin’e **özel** veritabanı kullanıcısı; minimum yetki.  
   - Şema: migrasyon aracı (Laravel migration, Phinx, düz SQL sürümleri) — **PostgreSQL yok**.

3. **PHP çalışma ortamı**  
   - PHP-FPM, uyumlu sürüm, `open_basedir` / dizin izinleri, TLS (Let’s Encrypt veya ticari).  
   - Ortam dosyalarında **yalnızca Aiaddin MySQL** ve kendi domain’leri.

4. **Domain**  
   - Örn. `aiaddin.net` vitrin veya yönetim girişi; müşteri siteleri alt alan veya ayrı domain — hepsi **Aiaddin altyapısına** bağlı, Yekpare DNS zincirine değil.

**Çıktı:** Staging’de çalışan PHP uygulaması + MySQL + yedekleme iskeleti; Yekpare’den bağımsız release döngüsü.

---

## 2) Faz B — Ürün çekirdeği (PHP + MySQL üzerinde)

| Alt faz | İçerik |
|---------|--------|
| **B1** | Çoklu site modeli (`site_id` / tenant), kullanıcı rolleri, oturum, denetim günlüğü. |
| **B2** | Haber: kategori, yazar, içerik, yayın durumu, medya meta (dosyalar disk veya nesne depolama — politikaya göre). |
| **B3** | STK / kurumsal: sayfa, menü, iletişim formları, şablon seçimi; haber modülü site bazında açık/kapalı. |
| **B4** | Yönetim paneli (PHP render veya API + ince istemci); gizli anahtarlar **sunucuda**. |
| **B5** | İçe aktarma: eski zip / WordPress örnekleri **salt okuma** kaynak; üretim verisi MySQL’e kontrollü aktarım scriptleri. |

**Çıktı:** Aiaddin “ürün” olarak tek MySQL şemasında (veya kontrollü çok şema) büyür; **Yekpare proxy veya senkron maddesi yoktur**.

---

## 3) Faz C — STK + haber birlikte (aynı PHP uygulamasında)

**Hedef:** Tek panelden hem haber sitelerini hem kurumsal/STK vitrinlerini yönetmek.

**Önerilen model:**

- Site tablosunda `site_kind`: `news | stk | corporate` (veya eşdeğeri).  
- Şablon / tema alanları site bazında.  
- Ortak kimlik ve faturalama ihtiyacı varsa **Aiaddin içinde** çözülür; Yekpare hesapları ile birleştirilmez.

**Risk:** İki ayrı PHP projesi (ör. ayrı Laravel + ayrı WordPress) aynı işi yaparsa çift güvenlik yüzeyi oluşur; mümkünse **tek uygulama + modüller**.

---

## 4) Faz D — Operasyon olgunluğu (WHM / panel)

- Yedekleme (JetBackup vb.), staging → prod promosyon, SSL yenileme.  
- Rate limit, CAPTCHA, dosya yükleme taraması.  
- Gözlem: PHP slow log, MySQL yavaş sorgu günlüğü.

---

## 5) Hazır yazılım (`aiaddin/` zip ve temalar)

- **Laravel Businesso tarzı paket** (`aiaddin/laravel-businesso/`): kiracılı site fikrine POC; **lisans** ve güvenlik taraması şart.  
- **WordPress temaları / eklentiler:** UI ve iş akışı ilhamı; doğrudan “tek motor” yerine **parça fikir** veya içe aktarma kaynağı.

**Öneri:** Sandbox’ta 1 haftalık POC → sonra **Aiaddin MySQL şemasına** ne taşınır kararı.

---

## 6) Özet zaman çizelgesi (öneri)

1. **0–4 hafta:** Faz A (Git + MySQL + staging PHP).  
2. **1–3 ay:** Faz B1–B3 (çoklu site + haber veya STK önceliği).  
3. **3–6 ay:** Faz B4–C (panel + birleşik tenant türleri).  
4. **İhtiyaç halinde:** Haber Merkezi ile **ayrı API** tasarımı (Yekpare dışı, isteğe bağlı).

---

## 7) Bu belgeyi kim güncelleyecek?

Her faz sonunda: **domain listesi**, **MySQL migrasyon sürümü**, **yedek doğrulama tarihi**, **dış API var / yok** tek sayfalık özet.

[`AIADDIN_YOL_HARITASI.md`](./AIADDIN_YOL_HARITASI.md) ile çelişirse **anayasa maddeleri** önceliklidir.

---

*Son güncelleme: 2026 — repo içi planlama; lisans ve hukuk kararları sizin sorumluluğunuzdadır.*
