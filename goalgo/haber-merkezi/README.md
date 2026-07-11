# Haber Merkezi (HM)

Yekpare’den ayrı haber / kurumsal site vitrinleri ve editör paneli.

- **Repo:** Aynı GitHub monorepo (`goalgo-yazilim`) — bu klasör proje kökü ve deploy notları.
- **Veritabanı:** Render PostgreSQL (`NEWS_DATABASE_URL`; eski Railway `Postgres-ZfoJ` taşındı)
- **Medya:** Cloudflare R2 (`yekpare-media`)
- **Prod frontend:** Netlify (yekpare.net/editor/*, ankarasehirgazetesi.com vb.) — Railway/Vercel değil
- **Başlangıç rehberi:** [docs/HABER_MERKEZI_BASLANGIC.md](../docs/HABER_MERKEZI_BASLANGIC.md)
- **Yol haritası:** [docs/HABER_MERKEZI_ROADMAP.md](../docs/HABER_MERKEZI_ROADMAP.md)

## Hedef servisler

| Servis | Platform | Durum |
|--------|----------|--------|
| `haber-merkezi-api` | Render (planlı) | Şimdilik `goalgo` api-server `/api/hm/*` |
| `haber-merkezi-web` | Netlify (planlı) | Şimdilik `yekpare.net/editor/*` |
| Postgres-HM | Render PG | `NEWS_DATABASE_URL` |

## Gelecek paket yapısı (extract sonrası)

```
goalgo/artifacts/
├── haber-merkezi-api/    ← hm.ts, haber public API
└── haber-merkezi-web/    ← editör + site vitrin SPA
```

Paylaşılan: `goalgo/lib/db` (haber şeması).

## Yekpare bağımlılığı

- **Şimdi:** Tam entegre (aynı deploy).
- **Hedef:** HM API + web ayrı deploy; Yekpare yalnızca isteğe bağlı public feed okur.
