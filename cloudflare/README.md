# Cloudflare Worker (turk.eco)

- SPA: Workers Static Assets
- API: Cloudflare Containers → **Neon** Postgres
- Medya: Cloudflare R2 (`yekpare-media`)
- CI: GitHub Actions `cloudflare-production.yml`

Şema: [docs/TURK-ECO-GITHUB-NEON-CLOUDFLARE.md](../docs/TURK-ECO-GITHUB-NEON-CLOUDFLARE.md)  
Kurulum: [goalgo/docs/CLOUDFLARE-NEON-KURULUM.md](../goalgo/docs/CLOUDFLARE-NEON-KURULUM.md)

Secrets (asla commit etme): `DATABASE_URL`, `SESSION_SECRET`, `S3_*`
