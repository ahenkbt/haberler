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

## 2026-10-08 additions
- **Schedule driver**: Cloudflare cron triggers for this Worker were not firing. The VPS calls `POST /api/bekci/tick?kind=bekci|ai_fetch|ai_nofetch` (header `x-bekci-token` = secret `BEKCI_TICK_TOKEN`) from `vps/tick.sh` via `vps/php-theme-bekci.cron`. `runOnce` skips if the last automatic pass was less than 5 min ago, so CF cron and the VPS tick never double-run.
- **Probe fetch semaphore**: Workers allow 6 open connections per invocation. Without the gate, queued probes timed out and showed false "zaman aşımı" / broken images.
- **Röportaj / Özel Haber ekle** (`/admin/ozel-haber-ekle`, `src/ozel.js`): title, spot, body, images (resized in the browser, stored in TP `hm_ozel_media`, served from `/api/bekci/media/<id>.webp`), optional YouTube/mp4 video, "Tüm sitelerde yayınla" or per-site checkboxes. It writes TP `news` rows (ids ≥ 2,000,000,000, category `ozel-haber`, `site_only`) and purges the home and category pages. "Gizle" sets status=draft.
- **Strict topics** (`vps/patch_strict.py`, env `AI_STRICT_TOPIC=1` default): topical/kamu_yerel sites need a keyword hit in the title or spot, kamu_yerel also needs a province mention, and regional sites need the place in the title, spot or feed. The AI pick gets the site's `hm_ai_editor_sites.topic_rule` as a hard rule; an empty AI selection means nothing is placed.
- **vatanhaber ban on the shared pool**: ai-editor also applies site 1 `hm_site_blocked_terms` to site 230 (turkatahaber), because vatanhaber reads the 230 pool (`vps/ai_editor-curate.patch` holds the full diff against the pre-curate file).
