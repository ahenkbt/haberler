# Netlify + Render kurulum raporu (Temmuz 2026)

> **Hedef mimari:** Railway ve Vercel **kullanılmayacak**.  
> - **Netlify** → yekpare.net (ön yüz + `/api` vekili)  
> - **Render** → Goalgo API + AI Call Center + PostgreSQL  

Mevcut kod zaten Render API varsayılanını kullanıyor: `https://goalgo-y7ze.onrender.com`

---

## 1. Mimari özet

```
                    ┌─────────────────────────────────────┐
                    │  Netlify (yekpare.net)               │
                    │  - SPA build (ahenkpress)            │
                    │  - _redirects: /api/* → Render API     │
                    │  - AGENTLABS_URL → call.yekpare.net   │
                    └──────────────┬──────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Render:         │    │ Render:         │    │ Render Postgres │
│ goalgo-api      │    │ goalgo-call     │    │ × 4             │
│ (goalgo/)       │    │ (ai-call-center)│    │ main/yektube/   │
│ + 10GB disk     │    │ call.yekpare.net│    │ news/ai-call    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

| Katman | Platform | URL |
|--------|----------|-----|
| Ön yüz | **Netlify** | https://yekpare.net |
| API | **Render Web Service** | `https://goalgo-api.onrender.com` (veya mevcut `goalgo-y7ze`) |
| AI Call | **Render Web Service** | https://call.yekpare.net (custom domain) |
| Veritabanları | **Render PostgreSQL** | Internal connection strings |

---

## 2. Railway'den alınacak veritabanları

Railway **goalgo** projesindeki PG'leri Render'a taşıyın (pg_dump → pg_restore).

| Railway (eski) | Render (yeni) | Env | İçerik |
|------------------|---------------|-----|--------|
| **Postgres** | `goalgo-main` | `DATABASE_URL` | Site, admin, sipariş, harita, PBX, native AI call |
| **postgres-yektube** | `goalgo-yektube` | `YEKTUBE_DATABASE_URL` | Yektube videoları |
| **Postgres-ZfoJ** | `goalgo-news` | `NEWS_DATABASE_URL` | Haber cluster |
| **postgres-ai-call** | `goalgo-ai-call` | AgentLabs `DATABASE_URL` | Call center kampanya/ekip |

**Medya dosyaları:** Railway `goalgo-volume` → Render **Persistent Disk** (`/app/data/media-uploads`, 10 GB — `render.yaml` içinde tanımlı).

---

## 3. Render kurulumu (Blueprint — önerilen)

### Adım 1 — Blueprint

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. GitHub repo: `Ahenk-BT/goalgo`
3. `render.yaml` (repo kökü) otomatik okunur
4. Oluşturulacaklar: 2 web servis + 4 Postgres

### Adım 2 — Railway yedek → Render restore

```bash
# Railway'den dump (Connect → Public URL)
pg_dump "$RAILWAY_DATABASE_URL" --format=custom --no-owner -f backup-main.dump
pg_dump "$RAILWAY_YEKTUBE_URL" --format=custom --no-owner -f backup-yektube.dump
pg_dump "$RAILWAY_NEWS_URL" --format=custom --no-owner -f backup-news.dump
pg_dump "$RAILWAY_AICALL_URL" --format=custom --no-owner -f backup-aicall.dump

# Render'a restore (her DB için ayrı Internal/External URL)
pg_restore --clean --if-exists --no-owner -d "$RENDER_DATABASE_URL" backup-main.dump
```

Staging'de önce test edin. Dump dosyalarını repoya commit etmeyin.

### Adım 3 — goalgo-api env (Blueprint sonrası elle eklenebilir)

| Değişken | Değer |
|----------|--------|
| `SESSION_SECRET` | Blueprint otomatik üretir (veya `openssl rand -base64 48`) |
| `DATABASE_URL` | `goalgo-main` connectionString |
| `YEKTUBE_DATABASE_URL` | `goalgo-yektube` |
| `YEKTUBE_DB_READ` / `WRITE` | `yektube` |
| `NEWS_DATABASE_URL` | `goalgo-news` |
| `NEWS_DB_READ` / `WRITE` | `main` (şimdilik) |
| `AGENTLABS_URL` | `goalgo-call` public URL veya `https://call.yekpare.net` |
| `USE_NATIVE_AI_CALL` | `true` |

Google Maps, Twilio, S3/R2 vb. opsiyonel anahtarları Railway panelinden kopyalayıp Render'a taşıyın.

### Adım 4 — goalgo-call (Call Center)

| Değişken | Değer |
|----------|--------|
| `DATABASE_URL` | `goalgo-ai-call` |
| `APP_URL` | `https://call.yekpare.net` |
| `SESSION_SECRET`, `JWT_SECRET` | Güçlü rastgele |
| `VITE_DEFAULT_LOCALE` | `tr` |

Deploy sonrası: `https://<call-url>/api/health` → 200  
İlk kurulum: Setup Wizard veya **postgres-ai-call dump restore**

**Custom domain:** Render → goalgo-call → Settings → Custom Domains → `call.yekpare.net`

### Adım 5 — Sağlık kontrolü

```bash
curl https://<goalgo-api>/api/healthz
curl https://call.yekpare.net/api/health
```

---

## 4. Netlify kurulumu (yekpare.net)

GitHub ↔ Netlify doğrudan bağlantı **gerekmez**; GitHub Actions deploy eder.

### GitHub Secrets

| Secret | Açıklama |
|--------|----------|
| `NETLIFY_AUTH_TOKEN` | Netlify → User settings → Applications |
| `NETLIFY_SITE_ID` | Site → Site configuration → General |
| `RENDER_API_ORIGIN` | Render goalgo-api public URL (sonda `/` yok) |
| `AGENTLABS_URL` | `https://call.yekpare.net` |

### Netlify site ayarları (UI)

| Alan | Değer |
|------|--------|
| Build command | *(GitHub Actions kullanıyorsanız boş veya devre dışı)* |
| Publish directory | `artifacts/ahenkpress/dist/public` |
| Custom domain | `yekpare.net`, `www.yekpare.net` |

Deploy workflow: `.github/workflows/netlify-production.yml`  
Build script `_redirects` dosyasını Render API URL'si ile yazar (`write-netlify-redirects.mjs`).

### Build env (Actions içinde otomatik)

```
API_ORIGIN / RENDER_API_ORIGIN → Render goalgo-api URL
AGENTLABS_URL → call.yekpare.net
```

---

## 5. Call center — Render'da yeni servis

Eski Railway **desirable-cooperation** yerine Render **goalgo-call**:

| | Railway (eski) | Render (yeni) |
|--|----------------|---------------|
| Servis | desirable-cooperation | goalgo-call |
| Root | goalgo/ai-call-center | goalgo/ai-call-center |
| DB | postgres-ai-call | goalgo-ai-call |
| Domain | call.yekpare.net | call.yekpare.net (DNS → Render) |

Kod: `goalgo/ai-call-center/Dockerfile`, `railway.toml` (Render'da Blueprint override eder)

Eklenti deploy öncesi (repoda):

```powershell
cd goalgo
.\scripts\sync-plugins.ps1
.\scripts\git-add-ai-call-center.ps1
git push
```

---

## 6. DNS tablosu

| Kayıt | Hedef |
|-------|--------|
| `yekpare.net` | Netlify (CNAME veya A) |
| `www.yekpare.net` | Netlify |
| `call.yekpare.net` | Render goalgo-call (CNAME) |

`/api` trafiği Netlify `_redirects` ile Render'a proxy edilir; ayrı `api.yekpare.net` zorunlu değil.

---

## 7. Soğuk başlangıç (Render free/starter)

Render boşta kalınca uyur. Mevcut workflow `.github/workflows/render-keepalive.yml` her 10 dk ping atar.

Upgrade: **Starter** plan veya keepalive cron açık kalsın.

---

## 8. Kontrol listesi

### Veri taşıma (Railway → Render)

- [ ] 4× pg_dump (main, yektube, news, ai-call)
- [ ] goalgo-volume medya dosyaları arşivi
- [ ] Render Blueprint deploy
- [ ] 4× pg_restore
- [ ] Medya disk kopyası

### Render

- [ ] goalgo-api `/api/healthz` 200
- [ ] goalgo-call `/api/health` 200
- [ ] `call.yekpare.net` DNS
- [ ] TWILIO / ElevenLabs env (gerekirse)

### Netlify

- [ ] GitHub secrets (NETLIFY_*, RENDER_API_ORIGIN, AGENTLABS_URL)
- [ ] `main` push → Netlify deploy
- [ ] yekpare.net `/api/healthz` (vekili) 200

### Smoke

```bash
cd goalgo
WEB_ORIGIN=https://yekpare.net \
API_ORIGIN=https://<render-api-url> \
CALL_ORIGIN=https://call.yekpare.net \
pnpm run deploy:smoke
```

### Railway kapatma (yalnızca doğrulama sonrası)

- [ ] Eski Railway servisleri durdur
- [ ] GitHub `RAILWAY_*` secret'ları kaldır (opsiyonel)

---

## 9. Dosya referansları

| Dosya | Açıklama |
|-------|----------|
| `render.yaml` | Render Blueprint (2 web + 4 PG) |
| `netlify.toml` | Netlify build/publish |
| `.github/workflows/netlify-production.yml` | Netlify CI deploy |
| `.github/workflows/render-keepalive.yml` | API sıcak tutma |
| `goalgo/scripts/write-netlify-redirects.mjs` | `/api` vekili |
| `goalgo/scripts/resolve-api-origin.mjs` | API URL çözümleme |
| `goalgo/Dockerfile` | API imajı |
| `goalgo/ai-call-center/Dockerfile` | Call center imajı |
| `goalgo/docs/RAILWAY-POSTGRES-BACKUP.md` | pg_dump/restore (platform bağımsız) |

---

## 10. Railway / Vercel notu

Bu repoda Railway/Vercel workflow'ları artık **birincil deploy yolu değildir**. Geçiş tamamlanınca:

- Railway production workflow devre dışı bırakılabilir
- Vercel `vercel.json` yedek kalır; prod Netlify kullanır

Detaylı eski Railway envanteri: `RAILWAY-YENIDEN-KURULUM-RAPORU.md` (arşiv).

---

## 11. Render API redeploy (agent notu)

Production API **Render** üzerindedir. GitHub Actions'ta `render-production.yml` **yoktur**.

| Yöntem | Ne zaman |
|--------|----------|
| **Otomatik** | Render servisi GitHub `main` branch hook ile bağlıysa, `main`'e merge yeterli |
| **Manuel** | Render Dashboard → goalgo-api → **Manual Deploy** → Deploy latest commit |

`railway-production.yml` çalışsa bile `RAILWAY_*` secret yoksa deploy **atlanır** — prod etkilenmez.

Doğrulama: `curl https://goalgo-y7ze.onrender.com/api/health` veya `/api/wiki/resolve-title?q=...`
