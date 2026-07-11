# Railway yeniden kurulum raporu (Temmuz 2026)

> **⚠️ Güncel hedef mimari: Netlify + Render (Railway/Vercel yok).**  
> Bkz. **`NETLIFY-RENDER-KURULUM-RAPORU.md`** — bu belge yalnızca Railway'den **veri taşıma** envanteri için arşivlenmiştir.

> **Durum:** GitHub ↔ Vercel ve GitHub ↔ Railway doğrudan bağlantısı kesildi.  
> **Hedef:** yekpare.net altyapısını yeni Railway servislerinde kurmak; call center’ı (`call.yekpare.net`) taşımak; veritabanlarını yedekleyip doğru servislere bağlamak.

---

## 1. Mevcut Railway envanteri (panel görüntüsüne göre)

### Proje: **goalgo** (üretim — 8/8 servis)

| Railway servis adı | Rol | Alan adı / bağlantı | Env değişkeni | Taşınacak mı? |
|--------------------|-----|---------------------|---------------|---------------|
| **goalgo** | Goalgo API (Node/Docker) | `yekpare.net` → `/api` vekili | — | ✅ Evet (Servis A) |
| **Postgres** | Ana uygulama DB | goalgo API’ye link | `DATABASE_URL` | ✅ **Kritik yedek + taşı** |
| **postgres-yektube** | Yektube video DB | goalgo API’ye link | `YEKTUBE_DATABASE_URL` | ✅ **Kritik yedek + taşı** |
| **Postgres-ZfoJ** | Haber cluster DB (hazır / yedek) | goalgo API’ye link | `NEWS_DATABASE_URL` | ✅ Yedek + taşı (şu an `NEWS_DB_READ=main`) |
| **desirable-cooperation** | AgentLabs AI Call | **call.yekpare.net** | `APP_URL`, `DATABASE_URL` | ✅ **Yeni servise kur** (Servis B) |
| **postgres-ai-call** | Call center DB | desirable-cooperation’a link | AgentLabs `DATABASE_URL` | ✅ **Kritik yedek + taşı** (panelde ⚠️ uyarı var) |
| **goalgo-volume** | Medya yüklemeleri (`/api/media/uploads`) | Volume mount | `RAILWAY_VOLUME_MOUNT_PATH` | ✅ Dosyaları kopyala |
| **goalgo-2026-05-12 …** | Eski yedek / snapshot volume | — | — | 📦 İncele; gerekirse arşivle |

### Diğer Railway projeleri (doğrulama gerekir)

| Proje | Servis sayısı | Tahmin | Aksiyon |
|-------|---------------|--------|---------|
| amusing-charisma | 2/2 (PG + Redis?) | Staging / Haber Merkezi / yan proje | Panelden servis adlarına bak; yekpare ile ilişkiliyse listeye ekle |
| zooming-sparkle | 2/2 | Dokümanda **minimal API** staging | Prod değilse birleştirmeyin; env kopyası referans |
| respectful-playfulness | 1/1 (PG) | Bilinmiyor | Connect → hangi uygulama kullanıyor? |
| devoted-possibility | 1/2 | Kısmen offline | Offline servisi silmeden önce yedek |
| illustrious-vibrancy | 2/2 | Bilinmiyor | Doğrula |
| divine-insight | 0/1 | Offline | Arşiv veya sil |
| empathetic-liberation, upbeat-spontaneity, … | 0 servis | Boş projeler | Temizlik adayı |

---

## 2. yekpare.net’te kullanılan ancak Railway’de kalan veritabanları

Bunların **hepsi Railway Postgres** üzerinde; frontend (Netlify/Vercel) kesilse bile **veri burada kalır**. Taşımadan önce **pg_dump** zorunlu.

| # | Railway PG servisi | Kod / env | İçerik | yekpare.net’te ne etkiler |
|---|-------------------|-----------|--------|---------------------------|
| 1 | **Postgres** | `DATABASE_URL` | Site, HM, admin, sipariş, harita, PBX `pbx_*`, abonelik, `ai_call_*` (native mod) | Tüm portal — **en kritik** |
| 2 | **postgres-yektube** | `YEKTUBE_DATABASE_URL` | `video_sources`, `videos`, izleme geçmişi, playlist | yektube.com / `/yp` |
| 3 | **Postgres-ZfoJ** | `NEWS_DATABASE_URL` | Haber cluster şeması (Faz 2 hazır; okuma hâlâ main olabilir) | `/api/news/hybrid`, haber haritası havuzu |
| 4 | **postgres-ai-call** | AgentLabs `DATABASE_URL` | Kampanya, asistan, Twilio, ekip, SIP trunk (AgentLabs) | **call.yekpare.net**, `/admin/yekpare-ai-call` (legacy AgentLabs modu) |

**Not:** `USE_NATIVE_AI_CALL=true` (varsayılan) iken AI çağrı ayarları **ana Postgres**’te (`ai_call_*`). AgentLabs UI ve Twilio kampanyaları için **postgres-ai-call** hâlâ gerekli.

**Ana DB’de kalması gereken (ayrı PG’ye taşınmaz):** `site_settings`, `site_members`, `panel_admin_users`, medya meta, PBX state (`pbx_*`).

---

## 3. Hedef mimari (yeni kurulum)

GitHub repo bağlantısı olmadan deploy için iki yol:

| Yol | Ne zaman |
|-----|----------|
| **A — GitHub Actions** (önerilen) | Repo’da `.github/workflows/railway-production.yml` var; `RAILWAY_TOKEN` + `RAILWAY_SERVICE_ID` secret’ları yeterli |
| **B — Railway CLI** | `railway link` + `railway up` (manuel) |

### Tek Railway projesi: `goalgo-production`

```
┌─────────────────────────────────────────────────────────────────┐
│  Railway proje: goalgo-production                                  │
├─────────────────────────────────────────────────────────────────┤
│  [goalgo-api]          Root: goalgo/           → yekpare.net/api │
│  [goalgo-call]         Root: goalgo/ai-call-center → call.yekpare.net │
│  [db-main]             PostgreSQL                                 │
│  [db-yektube]          PostgreSQL                                 │
│  [db-news]             PostgreSQL                                 │
│  [db-ai-call]          PostgreSQL                                 │
│  [goalgo-api-volume]   Mount: /app/data/media-uploads             │
└─────────────────────────────────────────────────────────────────┘
         ▲                              ▲
         │                              │
   Netlify / Vercel              DNS CNAME
   yekpare.net                   call.yekpare.net
   RAILWAY_API_ORIGIN             (Railway public URL)
   AGENTLABS_URL
```

---

## 4. Call center — yeni servis kurulumu (Servis B)

Eski servis: **desirable-cooperation** → Yeni ad önerisi: **goalgo-call**

| Adım | İşlem |
|------|--------|
| 1 | Railway → **goalgo** projesi → **+ New → GitHub Repo** *veya* Empty Service + CLI deploy |
| 2 | **Root Directory:** `goalgo/ai-call-center` |
| 3 | **+ PostgreSQL** → ad: `db-ai-call` → yalnızca **goalgo-call** ile link |
| 4 | **Variables** (Servis B): |

```env
DATABASE_URL=${{db-ai-call.DATABASE_URL}}
SESSION_SECRET=<openssl rand -base64 48>
JWT_SECRET=<openssl rand -base64 48>
APP_URL=https://call.yekpare.net
NODE_ENV=production
VITE_DEFAULT_LOCALE=tr
VITE_APP_NAME=Yekpare AI Call
# Twilio / ElevenLabs — panelden veya env’den
```

| 5 | Deploy → `https://…/api/health` → 200 |
| 6 | Tarayıcıda `/` → Setup Wizard (ilk kurulum) veya **eski DB restore** (aşağıda) |
| 7 | **DNS:** `call.yekpare.net` CNAME → yeni Railway public hostname |
| 8 | **goalgo-api** Variables: `AGENTLABS_URL=https://call.yekpare.net` (+ API key veya service email) |
| 9 | **Netlify/Vercel** env: `AGENTLABS_URL=https://call.yekpare.net`, `RAILWAY_API_ORIGIN=https://<goalgo-api>.up.railway.app` |

Dosyalar: `goalgo/ai-call-center/Dockerfile`, `goalgo/ai-call-center/railway.toml`, `goalgo/ai-call-center/scripts/railway-start.sh`

Eklenti deploy öncesi (yerelde, repoya push):

```powershell
cd goalgo
.\scripts\sync-plugins.ps1
.\scripts\git-add-ai-call-center.ps1
git commit -m "chore(ai-call): AgentLabs eklentileri Railway icin"
git push
```

---

## 5. Goalgo API — yeni servis kurulumu (Servis A)

| Adım | İşlem |
|------|--------|
| 1 | **+ New Service** → Root: `goalgo/` |
| 2 | **3× PostgreSQL** (veya mevcutları taşı): `db-main`, `db-yektube`, `db-news` |
| 3 | **Volume** → mount: `/app/data/media-uploads` |
| 4 | **Variables (minimum):** |

```env
DATABASE_URL=${{db-main.DATABASE_URL}}
SESSION_SECRET=<güçlü rastgele, min 16 karakter>
YEKTUBE_DATABASE_URL=${{db-yektube.DATABASE_URL}}
YEKTUBE_DB_READ=yektube
YEKTUBE_DB_WRITE=yektube
NEWS_DATABASE_URL=${{db-news.DATABASE_URL}}
NEWS_DB_READ=main
NEWS_DB_WRITE=main
USE_NATIVE_AI_CALL=true
AGENTLABS_URL=https://call.yekpare.net
# Netlify/Vercel tarafında (Railway’de DEĞİL):
# RAILWAY_API_ORIGIN=https://<goalgo-api-public-url>
```

| 5 | **Custom Start Command:** boş ( `railway.toml` → `start:with-migrate` ) |
| 6 | Sağlık: `/api/healthz` → 200 |
| 7 | Log: `[yektube-db-migrate] tamam`, `[news-db-migrate]` (varsa) |

Detay: `docs/BULUT_KURULUM.md`, `docs/YEKTUBE_AYRI_DB_KURULUM.md`, `docs/HABER_AYRI_DB_KURULUM.md`

---

## 6. Veritabanı yedekleme ve taşıma sırası

**Sıra önemli:** önce yedek, sonra yeni PG, sonra restore, en son DNS.

```bash
# Her DB için (Railway → Postgres → Connect → Public URL)
pg_dump "$DATABASE_URL" --format=custom --no-owner --file=backup-<ad>-$(date +%Y%m%d).dump
```

| Sıra | Kaynak (eski) | Hedef (yeni) | Restore |
|------|---------------|--------------|---------|
| 1 | Postgres (main) | db-main | `pg_restore --clean --if-exists --no-owner -d "$TARGET" backup-main.dump` |
| 2 | postgres-yektube | db-yektube | aynı |
| 3 | Postgres-ZfoJ | db-news | aynı |
| 4 | postgres-ai-call | db-ai-call | aynı — **call center downtime** |

Dump dosyalarını repoya **commit etmeyin**; şifreli S3/R2 veya yerel disk.

Detay: `docs/RAILWAY-POSTGRES-BACKUP.md`

---

## 7. Medya volume taşıması

Yüklenen haber görselleri `/api/media/uploads/…` konteyner diskinde/volume’da:

1. Eski **goalgo-volume** dosya sayısı: Railway shell veya `recover-media-volume.ps1`
2. Yeni serviste aynı mount path: **`/app/data/media-uploads`**
3. Eski yedek volume (`goalgo-2026-05-12`) varsa tar ile yeni volume’a kopyala
4. `MEDIA_UPLOAD_ROOT` **tanımlamayın** (Railway volume path otomatik)

Volume boş + DB’de path varsa görseller 404 olur — DB restore tek başına yetmez.

---

## 8. Frontend (yekpare.net) — GitHub bağlantısı kesildikten sonra

| Bileşen | Önerilen deploy | Gerekli env |
|---------|-------------------|-------------|
| Ön yüz | **Netlify** (workflow: `netlify-production.yml`) veya Vercel | `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` |
| API vekili | Netlify Edge / `netlify.toml` redirects | `RAILWAY_API_ORIGIN` |
| Call vekili | Aynı | `AGENTLABS_URL` |

GitHub Actions ile deploy **repo bağlantısı olmadan** çalışır; sadece secret’lar gerekir.

Smoke test:

```bash
cd goalgo
WEB_ORIGIN=https://yekpare.net \
API_ORIGIN=https://<goalgo-api-url> \
CALL_ORIGIN=https://call.yekpare.net \
pnpm run deploy:smoke
```

---

## 9. Kontrol listesi (sırayla)

### Bugün (veri güvenliği)

- [ ] `Postgres` → pg_dump
- [ ] `postgres-yektube` → pg_dump
- [ ] `Postgres-ZfoJ` → pg_dump
- [ ] `postgres-ai-call` → pg_dump (**⚠️ panel uyarısını da not et**)
- [ ] goalgo-volume dosya sayısı / örnek dosya kontrolü
- [ ] Mevcut env’lerin ekran görüntüsü veya `railway variables` export

### Kurulum

- [ ] Yeni **goalgo-api** + 3 PG + volume
- [ ] pg_restore × 3 (main, yektube, news)
- [ ] `/api/healthz` + `/api/news/hybrid` smoke
- [ ] Yeni **goalgo-call** + db-ai-call
- [ ] pg_restore ai-call **veya** Setup Wizard
- [ ] `call.yekpare.net` DNS → yeni call servisi
- [ ] goalgo-api: `AGENTLABS_URL` güncelle
- [ ] Netlify: `RAILWAY_API_ORIGIN`, `AGENTLABS_URL`
- [ ] Medya volume kopyası
- [ ] `deploy:smoke` yeşil

### Temizlik (yalnızca yeni ortam doğrulandıktan sonra)

- [ ] Eski desirable-cooperation durdur
- [ ] Boş Railway projelerini arşivle
- [ ] GitHub secret’ları güncelle: `RAILWAY_SERVICE_ID`, `RAILWAY_PUBLIC_URL`

---

## 10. GitHub Actions secret’ları (repo bağlantısı olmadan deploy)

| Secret | Nereden |
|--------|---------|
| `RAILWAY_TOKEN` | Railway → Project → Settings → Tokens |
| `RAILWAY_SERVICE_ID` | goalgo-api servis UUID |
| `RAILWAY_ENVIRONMENT` | `production` |
| `RAILWAY_PUBLIC_URL` | goalgo-api public URL |
| `NETLIFY_AUTH_TOKEN` | Netlify user settings |
| `NETLIFY_SITE_ID` | Netlify site |

Call center için ikinci workflow eklenebilir (`RAILWAY_CALL_SERVICE_ID`) — şu an yalnızca API workflow var.

---

## 11. İlgili dokümanlar

| Dosya | Konu |
|-------|------|
| `docs/BULUT_KURULUM.md` | Genel mimari, Servis A + B |
| `docs/PBX_KURULUM.md` | call.yekpare.net + desirable-cooperation |
| `docs/YEKTUBE_AYRI_DB_KURULUM.md` | postgres-yektube |
| `docs/HABER_AYRI_DB_KURULUM.md` | Postgres-ZfoJ / NEWS_* |
| `docs/RAILWAY-POSTGRES-BACKUP.md` | pg_dump / restore |
| `docs/YEKPARE_CALL_CENTER.md` | Native AI call (ana DB) |
| `ai-call-center/railway.toml` | Call servis env listesi |
| `railway.toml` | API servis env listesi |

---

## 12. Özet karar

| Soru | Cevap |
|------|--------|
| Call center nereye? | Yeni Railway servisi `goalgo/ai-call-center` → **call.yekpare.net** |
| Hangi DB’ler taşınmalı? | **4 Postgres:** main, yektube, news (ZfoJ), ai-call |
| GitHub kesildi, deploy? | GitHub Actions + Railway token **veya** Railway CLI |
| İlk iş? | **4 pg_dump + volume kontrolü** — kod değişikliğinden önce |

Bu belge canlı tutulur; paneldeki servis adları farklıysa tablo 1’i güncelleyin.
