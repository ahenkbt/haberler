# Cloudflare Worker (turk.eco)

- SPA: Workers Static Assets
- API: Cloudflare Containers → **Neon** Postgres
- Medya: Cloudflare R2 (`yekpare-media`)
- CI: GitHub Actions `cloudflare-production.yml`

Şema: [docs/TURK-ECO-GITHUB-NEON-CLOUDFLARE.md](../docs/TURK-ECO-GITHUB-NEON-CLOUDFLARE.md)  
Kurulum: [goalgo/docs/CLOUDFLARE-NEON-KURULUM.md](../goalgo/docs/CLOUDFLARE-NEON-KURULUM.md)

Secrets (asla commit etme): `DATABASE_URL`, `SESSION_SECRET`, `S3_*`

## Yektube Worker split

| Config | Worker name | DO / Container class | Domains |
|--------|-------------|----------------------|---------|
| `wrangler.toml` | `haberler` | `GoalgoApiContainer` | portal + HM (no yektube.com) |
| `wrangler.yektube.toml` | `yektube` | `YektubeApiContainer` | yektube.com, www.yektube.com |

Entry: `cloudflare/yektube-worker.js` (shared `worker.js` fetch + `YektubeApiContainer`).
CI: `.github/workflows/cloudflare-production.yml` → `deploy` then `deploy-yektube`.

