# Story dedupe across sources and sites (2026-10-08)

User rule: the same story must never repeat on one site; when several sources carry it, each general site
shows a different source's version. Nothing is deleted or unpublished; story pages stay reachable.

* `storyclust.py`: Turkish-aware title normalisation, prefix-5 stems, TF-IDF cosine on title (+spot), key numbers and
  proper names must agree, 48 h window, leader check against chaining. Borderline pairs go to Evren (deepseek-v4-flash,
  then nvidia/gemini/openai) in batches of 20; verdicts cached in `hm_story_dup_verdicts`.
* `storydup_job.py` (cron every 10 min, `/etc/cron.d/php-theme-storydup`, code `/docker/php-theme/storydup`): last 14 days
  of `portal_rss_items` + `news` + `hm_ai_editor_articles` -> `hm_story_dup_clusters`; per site, all but one visible item
  of each cluster -> `hm_story_dup_hidden(site_id, public_slug)`. Choice: editor/manual news (never hidden) > site's own
  latest AI article > site-own RSS > pool variant `(rank(site) + cluster_id) % n` over variants ordered by image,
  source reputation, newest. Respects Pasif rows, switched-off categories and blocked terms. Corporate sites 7/11/61
  untouched. Bumps `hm_site_override_rev` (max every 30 min per site) when a site's set changed.
* Theme (`repo-storydup.diff`, marked "story dedupe 2026-10-08"): `storySql` + `aiManset` exclude hidden slugs in SQL,
  `mapList` drops them (APCu 60 s). `STORY_DUP_DISABLED=1` env = off.
* AI Haber Editörü (`ai_editor-storydup.diff`, image php-theme-ai-editor:1, backup tag 1-pre-storydup-20261008): only the
  variant assigned to the site is a candidate.
* Off switch: comment the cron line and `TRUNCATE hm_story_dup_hidden` (effective within 60 s + page cache).
