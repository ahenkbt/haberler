# Deploy Sonrası Kontrol

Netlify (frontend) ve Render (API) deploy tamamlandıktan sonra şu komutu çalıştırın:

```bash
cd goalgo
WEB_ORIGIN=https://yekpare.net \
API_ORIGIN=https://goalgo-y7ze.onrender.com \
CALL_ORIGIN=https://call.yekpare.net \
pnpm run deploy:smoke
```

Kontrol edilenler:

- `WEB_ORIGIN/` HTML dönüyor mu?
- `WEB_ORIGIN/admin/giris` yönetim giriş sayfasını döndürüyor mu?
- `WEB_ORIGIN/api/healthz` Netlify `/api` vekili üzerinden Render API'ye ulaşabiliyor mu?
- `API_ORIGIN/api/healthz` Render API'ye doğrudan ulaşabiliyor mu?
- `CALL_ORIGIN/api/health` Yekpare AI Call / AgentLabs servisine doğrudan ulaşabiliyor mu?

Başarılı çıktı tüm satırlarda `PASS` ve sonda `[deploy-smoke] OK` gösterir.

## Hızlı hata yorumu

- `web /api/healthz proxy` fail: Netlify `RENDER_API_ORIGIN` / `_redirects` yanlış veya Render API kapalı/soğuk.
- `api /api/healthz direct` fail: Render tarafında `DATABASE_URL`, `SESSION_SECRET`, medya storage veya migration hatası olabilir.
- `call center /api/health direct` fail: `call.yekpare.net` DNS/Render goalgo-call, `APP_URL`, `DATABASE_URL`, `SESSION_SECRET` veya AgentLabs deploy ayarı hatalı olabilir.
- `/admin/giris` fail: Netlify frontend build/output veya SPA rewrite sorunu olabilir.

## Prod redeploy özeti

| Katman | Tetikleyici | Not |
|--------|-------------|-----|
| **Netlify** (yekpare.net, editor siteleri) | `main` push + frontend path değişimi → `netlify-production.yml` | Secret: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` |
| **Render API** | GitHub repo hook (otomatik) **veya** Render dashboard → Manual Deploy | GitHub Actions'ta Render deploy workflow **yok**; `railway-production.yml` prod değildir (secret yoksa atlanır) |

Detay: [NETLIFY-RENDER-KURULUM-RAPORU.md](./NETLIFY-RENDER-KURULUM-RAPORU.md)
