# Cloudflare + Render kurulum (Netlify yerine ön yüz)

> **Hedef:** Netlify kredi limitine takıldığı için ön yüz **Cloudflare Workers (Static Assets)**; API + DB **Render** kalır.  
> Mevcut API: `https://goalgo-y7ze.onrender.com`

---

## 1. Cloudflare build hatası (kök neden)

Log:

```text
Executing user deploy command: npx wrangler deploy
✘ [ERROR] Could not detect a directory containing static files
```

| Yanlış | Doğru |
|--------|--------|
| Sadece `npx wrangler deploy` | Önce SPA build, sonra deploy |
| Root `bun install` (yalnızca `pg`) | `pnpm run build:cloudflare` (goalgo monorepo) |
| `wrangler.toml` yok | Repo kökünde `wrangler.toml` + `[assets]` |

Build çıktısı: `artifacts/ahenkpress/dist/public`  
Edge vekil: `cloudflare/worker.js` (`/api/*` → Render, sitemap, sosyal OG, Yektube path)

---

## 2. Cloudflare Dashboard ayarları (Workers Builds)

Proje adı örnek: **haberler**

| Alan | Değer |
|------|--------|
| **Build command** | `corepack enable && corepack prepare pnpm@9.15.5 --activate && pnpm run build:cloudflare` |
| **Deploy command** | `npx wrangler deploy` |
| **Root directory** | *(boş / repo kökü)* |
| **Node.js** | `20` |

**Deploy command’ı yalnız `npx wrangler deploy` bırakıp Build’i boş bırakmayın** — statik dosya dizini oluşmaz ve hata tekrarlanır.

### Ortam değişkenleri (Production)

| Değişken | Değer |
|----------|--------|
| `RENDER_API_ORIGIN` | `https://goalgo-y7ze.onrender.com` (sonda `/` yok) |
| `API_ORIGIN` | aynı (opsiyonel; build `VITE_PUBLIC_API_ORIGIN` için) |
| `AGENTLABS_URL` | `https://call.yekpare.net` (opsiyonel) |
| `NPM_CONFIG_PRODUCTION` | `false` |

`wrangler.toml` içindeki `[vars].RENDER_API_ORIGIN` varsayılan olarak aynı URL’yi taşır; Dashboard secret/env bunu override edebilir.

---

## 3. Mimari

```
Cloudflare (yakpare / haber siteleri)
  - SPA: ahenkpress dist/public
  - Worker: /api/* → Render goalgo-api
  - Worker: sitemap + bot OG HTML
           │
           ▼
Render: goalgo-api  (https://goalgo-y7ze.onrender.com)
Render: goalgo-call + Postgres
```

Netlify `_redirects` / edge function’ların Cloudflare karşılığı `cloudflare/worker.js` içindedir.

---

## 4. Yerel doğrulama

```bash
# Repo kökü
pnpm run build:cloudflare
npx wrangler deploy --dry-run
# veya tam deploy (CF hesabı + token):
npx wrangler deploy
```

Smoke (deploy sonrası):

```bash
cd goalgo
WEB_ORIGIN=https://<your-workers-or-pages-host> \
API_ORIGIN=https://goalgo-y7ze.onrender.com \
pnpm run deploy:smoke
```

Kontroller:

- `WEB_ORIGIN/` → SPA
- `WEB_ORIGIN/api/healthz` → Render API (Worker vekili)
- Custom HM domain / bot UA → OG HTML (opsiyonel)

---

## 5. DNS

| Kayıt | Hedef |
|-------|--------|
| `yekpare.net` / HM domainleri | Cloudflare Worker/Pages custom domain |
| `call.yekpare.net` | Render goalgo-call (değişmez) |

Netlify DNS’ten çıkarın; Cloudflare’de Custom Domain ekleyin.

---

## 6. GitHub Actions (opsiyonel)

`.github/workflows/cloudflare-production.yml`

Secrets:

| Secret | Açıklama |
|--------|----------|
| `CLOUDFLARE_API_TOKEN` | Workers:Edit + Account:Read |
| `CLOUDFLARE_ACCOUNT_ID` | CF hesap id |
| `RENDER_API_ORIGIN` | Render API URL |
| `AGENTLABS_URL` | Call center URL |

---

## 7. Dosya referansları

| Dosya | Açıklama |
|-------|----------|
| `wrangler.toml` | Worker adı `haberler`, assets dizini |
| `cloudflare/worker.js` | API / sitemap / OG / Yektube |
| `scripts/cloudflare-root-build.mjs` | Kök build → `artifacts/.../public` |
| `goalgo/scripts/cloudflare-build.mjs` | Vite + sitemap + _redirects |
| `render.yaml` | API + call + Postgres (değişmez) |

---

## 8. Netlify sonrası

1. Cloudflare deploy yeşil + `/api/healthz` 200  
2. Custom domain + SSL  
3. DNS kesimi  
4. Netlify site’ı pause/delete (kredi kesilsin)  
