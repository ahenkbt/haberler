# php-theme importer-v5 (catfill + strict classifier)
Deployed at VPS 187.77.84.201:/docker/php-theme/importer-v5. It runs in the php-theme-importer:4 image, with --env-file /docker/php-theme/importer.env (role php_theme_rss_writer).

- `catfill.py`: INSERT-only importer into twilight-pine portal_rss_items.
  - Every row has a verified loading image and is deduped per site.
  - Never writes to corporate sites (7, 11, 61). The vatanhaber blocked terms apply to sites 1 and 230.
  - Targets: `mktargets.py` → `targets.json`. Feeds can be `url`, `{"url","match"}`, `db:<site>` (cross-distribution) or `scrape:<listing>` (haberler.com listings).
  - Env: CATFILL_MODE=fill|daily, CATFILL_ONLY, CATFILL_SOURCE=panel (HM Editör panel feeds), IMPORT_DRY_RUN=1.
- `classifier.py`: strict rules shared with the AI Haber Editörü. Order: keyword/source, then city/region, then the AI chain evren → nvidia → gemini → openai. See `site-topics.md` and `site-topics.json`.
- `recat_job.py`: hourly recategorizer. Moves rows and hides off-topic ones via hm_site_content_hidden (`cron-recat`).
- `guard_live.py`: every 20 min. Hides off-topic live HM items and editor news (`cron-guard`). Needs `-v /docker/php-theme/data/bridge:/bridge:ro`.
- `recat.py` + `recat_apply.py`: one-off backlog planner and SQL generator, used 2026-10-08 (8025 decisions, log /var/log/php-theme/recat-20261008-1730Z.tsv).
- Theme dependency: `../php-theme-patches/repository-hidden-always.diff` makes hm_site_content_hidden apply on every site.
