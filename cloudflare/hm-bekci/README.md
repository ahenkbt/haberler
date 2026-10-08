# hm-bekci: AI Bekçi + AI Haber Editörü scheduler

A separate Worker (not `haberler`). The root `wrangler deploy` in CI does NOT deploy it.
Deploy: `cd cloudflare/hm-bekci && npx wrangler deploy` (Node ≥22).

## Routes (zone ahenk.net.tr → hm-bekci)
- `ahenk.net.tr/admin*`: passes through to haberler and appends a small shortcut bar plus a sidebar rename ("AI Haber Editörü"). Serves `/admin/ai-icerik-robotu` itself (AI Haber Editörü page: per-site opt-out toggles, run log, "Şimdi çalıştır").
- `ahenk.net.tr/api/hm/admin/site-watchdog*`: GET passes through to haberler for auth and the catalog, and replaces `last` with the latest hm-bekci report (the existing page `/admin/haber-siteleri-bekci` renders it). POST `/run` runs a manual bekçi pass. Other paths pass through.
- `ahenk.net.tr/api/bekci/*`: AI editor data, toggle, run, ai-test (admin session required).

Rollback: delete these 3 routes; haberler's `ahenk.net.tr/*` takes over again.

## Crons (UTC)
- `*/10 * * * *`: browser-facing probes of every site in TP `hm_news_sites` (home, category, article, /editor, /koseyazari/giris, rss age, duplicate titles, stuck manşet, images), DB freshness, importer liveness, and the panel↔PHP DB sync spot-check. Safe auto-fixes:
  - CF purge-by-URL (60 min cooldown);
  - queue an existing importer re-run (180 min cooldown);
  - hide duplicate news (status=draft, never delete; rollback SQL logged).
  Each incident gets a short Turkish AI diagnosis via Evren → NVIDIA → Gemini → OpenAI.
- `17 3,8,13,18 * * *` (with fetch) and `47 5,10,15,20 * * *` (no fetch): queue an AI Haber Editörü run.

## Secrets
PHP_DB_URL (role hm_bekci), EVREN_API_KEY, NVIDIA_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, CF_API_TOKEN (cache purge).

## VPS side (187.77.84.201)
- `vps/runner.sh` goes to `/docker/php-theme/bekci/runner.sh`, with cron `vps/php-theme-bekci.cron` at `/etc/cron.d/php-theme-bekci`. It executes queued `hm_bekci_requests` (whitelisted: existing ai-editor `ops/run.sh run [--no-fetch]` and existing importer cron lines). Fallback: it queues an AI editor run itself if there has been no run for more than 4 h (06–24 TRT).
- `vps/ai_editor-curate.patch`: ai-editor curate mode (AI_EDITOR_REWRITE=0 keeps the original title and text plus the source link; AI only picks and orders the manşet and classifies; per-site hm_site_blocked_terms filter; AI_SLOT_MODE=hourly).
