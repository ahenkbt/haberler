# Cloudflare + Neon + GitHub (Render yok)

> **Prod stack**  
> - **Neon** → PostgreSQL (`DATABASE_URL`)  
> - **Cloudflare** → SPA (Assets) + API (Containers / Express)  
> - **GitHub Actions** → build + `wrangler deploy`  

Render / Railway / Netlify kredisi **gerekmez**.

---

## Mimari

```
GitHub (main)
   │  cloudflare-production.yml
   ▼
Cloudflare Worker "haberler"
   ├─ ASSETS  → artifacts/ahenkpress/dist/public  (SPA)
   └─ API_CONTAINER → goalgo/Dockerfile.cloudflare
           │
           ▼
     Neon Postgres (tek DB: neondb)
```

Tarayıcı aynı origin kullanır: `https://<host>/api/*` → Container → Neon.

---

## 1. Neon

1. [console.neon.tech](https://console.neon.tech) → connection string (pooled, `sslmode=require`)
2. Tek veritabanı yeterli: `YEKTUBE_DB_READ=main`, `NEWS_DB_READ=main` (Container env)
3. Mevcut dump varsa: `pg_restore` / `psql` ile Neon’a yükleyin

**Güvenlik:** Connection string’i sohbete/issue’ya yapıştırmayın. Rotate edin; yalnızca GitHub Secret + `wrangler secret` kullanın.

---

## 2. GitHub Secrets

Repo → Settings → Secrets and variables → Actions:

| Secret | Zorunlu | Açıklama |
|--------|---------|----------|
| `CLOUDFLARE_API_TOKEN` | evet | Workers/Containers edit |
| `CLOUDFLARE_ACCOUNT_ID` | evet | CF Account ID |
| `DATABASE_URL` | evet | Neon URL |
| `SESSION_SECRET` | evet | ≥16 karakter rastgele |
| `AGENTLABS_URL` | hayır | Call center |

Örnek:

```bash
# Yerelde (token ile) — değeri shell history’ye yazmayın tercih edilir
gh secret set DATABASE_URL -b"$DATABASE_URL"
gh secret set SESSION_SECRET -b"$(openssl rand -base64 32)"
gh secret set CLOUDFLARE_API_TOKEN -b"$CLOUDFLARE_API_TOKEN"
gh secret set CLOUDFLARE_ACCOUNT_ID -b"$CLOUDFLARE_ACCOUNT_ID"
```

---

## 3. Cloudflare Dashboard (Workers Builds)

| Alan | Değer |
|------|--------|
| Build command | `corepack enable && corepack prepare pnpm@9.15.5 --activate && pnpm install && pnpm run build:cloudflare` |
| Deploy command | `npx wrangler deploy` |
| Node | `20` |

İlk deploy’dan önce secrets:

```bash
printf '%s' "$DATABASE_URL" | npx wrangler secret put DATABASE_URL
printf '%s' "$SESSION_SECRET" | npx wrangler secret put SESSION_SECRET
```

**Not:** Container image için Docker gerekir (GHA `ubuntu-latest` sağlar). Yerelde `docker info` çalışmalı.

Workers Paid / Containers planı gerekir.

---

## 4. Yerel komutlar

```bash
pnpm install
pnpm run build:cloudflare
# secrets bir kez:
printf '%s' "$DATABASE_URL" | pnpm exec wrangler secret put DATABASE_URL
printf '%s' "$SESSION_SECRET" | pnpm exec wrangler secret put SESSION_SECRET
pnpm exec wrangler deploy
```

Smoke:

```bash
curl -sS "https://haberler.<account>.workers.dev/api/healthz"
```

---

## 5. DNS

Custom domain’i Cloudflare Worker’a bağlayın (`yekpare.net`, HM siteleri).  
`call.yekpare.net` hâlâ ayrı call-center ise oraya yönlendirin (opsiyonel `AGENTLABS_URL`).

---

## 6. Dosyalar

| Dosya | Rol |
|-------|-----|
| `wrangler.toml` | Assets + ApiContainer |
| `cloudflare/worker.js` | SPA + `/api` → container |
| `goalgo/Dockerfile.cloudflare` | Express API image |
| `.github/workflows/cloudflare-production.yml` | CI deploy |
| `render.yaml` | **legacy** — kullanma |

---

## 7. Checklist

- [ ] Neon `DATABASE_URL` GitHub secret
- [ ] `SESSION_SECRET` GitHub secret
- [ ] Cloudflare token + account id
- [ ] `main` push veya workflow_dispatch → deploy yeşil
- [ ] `/api/healthz` 200
- [ ] SPA açılıyor
- [ ] Eski Render servislerini kapat
