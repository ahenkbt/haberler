# Deploy Sonrası Kontrol

Cloudflare (SPA + API Container) + Neon deploy tamamlandıktan sonra:

```bash
cd goalgo
WEB_ORIGIN=https://turk.eco \
API_ORIGIN=https://turk.eco \
pnpm run deploy:smoke
```

Kontrol edilenler:

- `WEB_ORIGIN/` HTML dönüyor mu?
- `WEB_ORIGIN/admin/giris` yönetim giriş sayfasını döndürüyor mu?
- `WEB_ORIGIN/api/healthz` Worker → Container üzerinden Neon’a ulaşabiliyor mu?
- `API_ORIGIN/api/healthz` aynı origin (Render yok)

Başarılı çıktı tüm satırlarda `PASS` ve sonda `[deploy-smoke] OK` gösterir.

## Hızlı hata yorumu

- `web /api/healthz proxy` fail: Worker Container bağlanamadı, Neon `DATABASE_URL` veya `SESSION_SECRET` eksik.
- `api /api/healthz direct` fail: Container’da `DATABASE_URL`, `SESSION_SECRET`, R2 (`S3_*`) veya migration hatası olabilir.
- `/admin/giris` fail: SPA Assets veya Worker rewrite sorunu olabilir.

## Prod redeploy özeti

`main` push → `.github/workflows/cloudflare-production.yml`
