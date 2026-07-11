# Haberler için ayrı veritabanı kurulumu

Bu rehber, Yekpare haberlerinin ana siteden ayrı bir veritabanında çalışması içindir. Böylece büyük güncellemeler haber sayfasını yavaşlatmaz.

---

## Kararlı mod (şimdilik)

Haberler tekrar düzgün çalışıyorsa **akşam oturumuna kadar** Railway'de şu ayarları **olduğu gibi bırakın**. Faz 2 (dual write / okuma geçişi) **şimdi yapılmaz**.

| Değişken | Değer | Not |
|----------|--------|-----|
| `NEWS_DB_READ` | `main` | Ana DB'den okuma — **değiştirmeyin** |
| `NEWS_DB_WRITE` | `main` | Ana DB'ye yazma — **değiştirmeyin** |
| `DATABASE_URL` | Ana Postgres referansı | Site + haberler (şu an) |
| `NEWS_DATABASE_URL` | `${{Postgres-ZfoJ.DATABASE_URL}}` | Kalabilir; `main/main` iken runtime'da kullanılmaz |

**Akşamda devam:** Faz 2 — Aşama 1 (`NEWS_DB_WRITE=dual`, `NEWS_DB_READ=main` kalır) → sonra okuma/yazma geçişi.

**Railway'de dokunmayın (şimdilik):**

- `NEWS_DB_READ` veya `NEWS_DB_WRITE` değerini `dual` / `news` yapmayın
- `NEWS_DATABASE_URL` satırını silmeyin (zararsız; deploy'da şema/veri kontrolü idempotent)
- Postgres-ZfoJ servisini silmeyin veya referansını kaldırmayın
- Acil değilse `SKIP_NEWS_DB_MIGRATE` / `SKIP_NEWS_DATA_MIGRATE` eklemeyin

**Normal deploy güvenli:** Kod deploy'u haber okuma/yazma modunu otomatik değiştirmez. `main/main` ile haberler ana DB'den çalışmaya devam eder. Yeni deploy'da yalnızca haber DB'de idempotent şema kontrolü ve (veri yoksa) kopyalama denemesi olur; ana DB'deki canlı haberlere dokunmaz.

---

**Sizin yapmanız gereken (ilk kurulum):** Railway panelinde yaklaşık 5 dakikalık 3–4 tıklama.  
**Gerisi otomatik:** Kod güncellemesi, şema kurulumu ve mevcut haberlerin kopyalanması deploy sırasında çalışır.

> ## ⚠️ ÖNEMLİ — `NEWS_DB_READ` için `dual` KULLANMAYIN
>
> `dual` **yalnızca** `NEWS_DB_WRITE` için geçerlidir. `NEWS_DB_READ=dual` yazarsanız haberler boş görünür (`/api/news` → `"total": 0`).  
> **Doğru:** Aşama 1'de sadece `NEWS_DB_WRITE=dual` yapın; `NEWS_DB_READ=main` **olduğu gibi kalsın**.  
> Yanlışlıkla `dual` yazdıysanız: `NEWS_DB_READ=main` yapın ve deploy edin.

---

## Adım 1 — Railway'de yeni PostgreSQL oluşturun

1. [Railway](https://railway.app) hesabınıza girin.
2. Goalgo projenizi açın.
3. **+ New** (veya **Create**) düğmesine tıklayın.
4. **Database** → **PostgreSQL** seçin.
5. Servise anlamlı bir isim verin, örneğin: `postgres-yekpare-haber`

Yeni bir veritabanı kutusu projede görünür.

---

## Adım 2 — Goalgo API servisine bağlayın

1. Projede **Goalgo API** servisini açın (ana backend; `goalgo/` klasöründen deploy edilen).
2. **Variables** (Ortam değişkenleri) sekmesine gidin.
3. **+ New Variable** ile şunu ekleyin:

   | İsim | Değer |
   |------|--------|
   | `NEWS_DATABASE_URL` | Yeni PostgreSQL servisinin bağlantı adresi |

   Railway'de genelde **Add Reference** ile yeni Postgres'in `DATABASE_URL` değerini seçmek yeterlidir.  
   Örnek (sizin kurulum): `NEWS_DATABASE_URL` = `${{Postgres-ZfoJ.DATABASE_URL}}`

4. İsteğe bağlı (başlangıçta bunları **eklemeyin**; varsayılanlar yeterli):

   | İsim | Değer | Anlamı |
   |------|--------|--------|
   | `NEWS_DB_READ` | `main` | Haberleri eski DB'den oku (güvenli başlangıç) |
   | `NEWS_DB_WRITE` | `main` | Yazmalar eski DB'ye (sonra `dual` yapılır) |

5. Kaydedin. Railway otomatik **yeniden deploy** başlatır.

---

## Adım 3 — Deploy bitmesini bekleyin

Deploy sırasında sistem sırayla şunları yapar (sizin bir şey çalıştırmanız gerekmez):

1. Ana veritabanı güncellemesi (eskisi gibi)
2. **Yeni haber veritabanında tabloların oluşturulması**
3. **Mevcut haberlerin ana DB'den yeni DB'ye kopyalanması** (idempotent; gerekirse tekrar çalışır)

Loglarda şunları görebilirsiniz:

- `[news-db-migrate] tamam`
- `[news-data-migrate] tamam` veya `Haber DB'de veri var — idempotent Node upsert kopyası kullanılacak.`

---

## Adım 4 — Siteyi kontrol edin

Deploy yeşil olduktan sonra:

1. Ana sitenizi açın (ör. turknet.app).
2. **Haberler** bölümüne gidin — haberler listelenmeli.
3. **Yektube** ve **Bilgi Ağacı** sayfaları açılmalı.
4. Yönetim panelinden bir haber eklemeyi veya RSS çalıştırmayı deneyin.

Her şey normalse **Faz 1** tamamdır.

---

## Faz 2 — Onaylandı (tam geçiş, Railway paneli)

**Durum:** Faz 1 bitti (haber tabloları yeni Postgres'te, veri kopyalandı). Tam geçiş için sırayla **3 ayrı deploy** yapılır. Her adımdan sonra siteyi kontrol edin; sorun olursa bir önceki değerlere dönün.

**Hangi servis:** Goalgo projeniz → **Goalgo API** (backend) → **Variables** sekmesi.

**Değişken adları (aynen kopyalayın):**

| Değişken | Olası değerler | Ne işe yarar |
|----------|----------------|--------------|
| `NEWS_DATABASE_URL` | Postgres referansı | Yeni haber veritabanı bağlantısı (Faz 1'de eklenmiş olmalı) |
| `NEWS_DB_READ` | `main` veya `news` (**asla `dual` değil**) | Haber **okuma** kaynağı |
| `NEWS_DB_WRITE` | `main`, `dual` veya `news` | Haber **yazma** hedefi |

Kod davranışı (geliştirici notu, siz sadece değerleri değiştirirsiniz):

- `NEWS_DB_WRITE=dual`: Yeni haber/güncelleme/silme **önce ana DB'ye**, aynı kayıt **haber DB'ye de** yazılır. Okuma hâlâ `NEWS_DB_READ` ile belirlenir — bu aşamada **`NEWS_DB_READ=main` kalmalı**.
- `NEWS_DB_READ=news`: Listeleme ve detay **haber DB'den** okunur.
- `NEWS_DB_WRITE=news`: Yazmalar **yalnızca haber DB'ye** gider.
- `NEWS_DB_READ=dual`: **Geçersiz.** Kod bunu `main` sayar ve uyarı loglar; yine de değişkeni `main` yapın.

**Faz 1 sonrası tipik başlangıç (değiştirmeyin, sadece kontrol):**

```
NEWS_DATABASE_URL=${{Postgres-ZfoJ.DATABASE_URL}}
NEWS_DB_READ=main
NEWS_DB_WRITE=main
```

---

### Faz 2 — Aşama 1: Çift yazma (dual write)

> **Not:** Kararlı mod aktifken (üstteki bölüm) bu adımı **ertelenin**; akşam oturumunda yapılır.

Amaç: Yeni içerik hem ana DB'de hem haber DB'de kalsın; okuma hâlâ ana DB'den (güvenli).

**Bu aşamada yalnızca yazma değişir — okumaya dokunmayın:**

| Değişken | Bu aşamada ne olmalı |
|----------|----------------------|
| `NEWS_DB_WRITE` | `dual` (**bunu değiştirin**) |
| `NEWS_DB_READ` | `main` (**değiştirmeyin; `dual` veya `news` yapmayın**) |

1. [Railway](https://railway.app) → Goalgo projeniz.
2. **Goalgo API** servisine tıklayın.
3. Üstte **Variables** sekmesi.
4. `NEWS_DB_WRITE` satırını bulun:
   - Varsa: **kalem (Edit)** → değeri şu yapın (tırnak yok): `dual`
   - Yoksa: **+ New Variable** → **Variable name:** `NEWS_DB_WRITE` → **Value:** `dual`
5. `NEWS_DB_READ` değerinin **`main`** olduğundan emin olun. `dual` yazılıysa **`main` yapın** — `dual` okuma için geçerli değildir.
6. Kaydedin. Railway **otomatik deploy** başlatır.
7. **Deployments** sekmesinde en son deploy **Success / yeşil** olana kadar bekleyin (birkaç dakika).

**Kontrol (tarayıcı):**

1. https://turknet.app — **Haberler** açılıyor mu?
2. Adres çubuğuna yapıştırın: `https://turknet.app/api/news?page=1&limit=5`  
   Sayfa JSON göstermeli; `"total"` sıfır olmamalı.
3. `https://turknet.app/api/video/sources` ve `https://turknet.app/api/wiki/featured` veri dönmeli.

**Kontrol (isteğe bağlı):** Yönetimden test haberi ekleyin veya RSS çalıştırın; site hata vermemeli.

Sorun olursa: `NEWS_DB_WRITE` değerini tekrar `main` yapın, deploy bitsin, bize yazın.

---

### Faz 2 — Aşama 2: Okumayı haber DB'ye al

**Önkoşul:** Aşama 1 deploy'u yeşil ve haberler sitede normal.

1. **Goalgo API** → **Variables**.
2. `NEWS_DB_READ` → değer: `news` (küçük harf, tırnak yok).
3. `NEWS_DB_WRITE` → **`dual` kalsın** (bu aşamada `news` yapmayın).
4. Kaydedin, deploy bitsin.

**Kontrol:** Aynı API adresi: `https://turknet.app/api/news?page=1&limit=5` — haberler gelmeli. Ayrıca `/api/video/sources` ve `/api/wiki/featured` boş/hatalı olmamalı. Sitede Haberler, Yektube ve Bilgi Ağacı sayfalarını yenileyin.

Sorun olursa: `NEWS_DB_READ=main` yapın, deploy edin (yazma hâlâ `dual` olabilir).

---

### Faz 2 — Aşama 3: Yazmayı tamamen haber DB'ye al

**Önkoşul:** Aşama 2 yeşil; API ve site normal.

1. **Goalgo API** → **Variables**.
2. `NEWS_DB_WRITE` → değer: `news`.
3. `NEWS_DB_READ` → **`news` kalsın**.
4. Kaydedin, deploy bitsin.

**Kontrol:** Site + `https://turknet.app/api/news?page=1&limit=5` + `/api/video/sources` + `/api/wiki/featured` + bir haber ekleme/RSS testi.

**Faz 2 bitti** — haberler okuma/yazma için ayrı Postgres'i kullanır.

---

### Geri alma (acil)

Her iki değişkeni de ana DB'ye döndürün, kaydedin, deploy bekleyin:

```
NEWS_DB_READ=main
NEWS_DB_WRITE=main
```

`NEWS_DATABASE_URL` satırını **silmenize gerek yok**; sadece okuma/yazma modları geri alınır.

---

## Sorun çıkarsa

| Belirti | Ne yapın |
|---------|----------|
| Deploy kırmızı, haber migrate hatası | Variables'a `SKIP_NEWS_DB_MIGRATE=1` ekleyin, deploy edin; bize yazın |
| Haberler boş, API `"total": 0` | **Hızlı düzeltme:** `NEWS_DB_READ=main` ve `NEWS_DB_WRITE=main` yapın, deploy edin. Özellikle `NEWS_DB_READ=dual` veya `news` yanlışlıkla yazıldıysa bu sorunu çözer. |
| Haberler boş (Aşama 1, okuma ana DB'den) | `NEWS_DB_READ=main` olduğundan emin olun; `NEWS_DB_READ` asla `dual` olmamalı |
| Aşama 2'den sonra boş | `NEWS_DB_READ=main` yapın; haber DB'de veri olduğunu doğrulamak için bize yazın |
| Eski haberler yok | Bir kez daha deploy edin; logda `news-data-migrate` satırına bakın |

---

## Özet — sizin tıklamalarınız

**Faz 1 (kurulum):**

1. Railway → **New** → **PostgreSQL**
2. API servisi → **Variables** → `NEWS_DATABASE_URL` ekle (yeni DB'ye referans)
3. Deploy bitsin
4. Sitede **Haberler**'i kontrol edin

**Faz 2 (onaylı tam geçiş):**

1. `NEWS_DB_WRITE` = `dual` → deploy → kontrol  
2. `NEWS_DB_READ` = `news` → deploy → kontrol  
3. `NEWS_DB_WRITE` = `news` → deploy → kontrol  

Terminal, `pg_dump` veya teknik komut **gerekmez**.