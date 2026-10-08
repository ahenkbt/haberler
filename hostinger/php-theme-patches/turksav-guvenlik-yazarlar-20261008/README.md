# turksav.org (233): defense columnists + "Güvenlik Güçleri" menu group (2026-10-08 22:15–22:40 TRT)

User request (22:11 TRT): "savunma haberde yazarların isimlerini değiştir, sadece konsept yazılar yazsın. TSK, MSB, Jandarma ve Emniyeti
Güvenlik Güçleri üst kategorisi altında birleştir."

## Theme (live in php-theme-yenisafak via docker cp, php -l, no restart; marked "turksav guvenlik 2026-10-08")
- src/CategoryTree.php: SAVUNMA_MAIN gets `guvenlik-gucleri` (children tsk, msb, jandarma, emniyet; TSK keeps its 5 forces),
  name "Güvenlik Güçleri", parent aggregates its descendants; new `foldSavunmaMenu()` folds saved TSK/MSB/Jandarma/Emniyet
  header-menu roots into one "Güvenlik Güçleri" root at render time (saved panel menu is not modified by the theme).
  Slugs /kategori/tsk|msb|jandarma|emniyet unchanged (no redirects needed). (The later "mavi vatan 2026-10-08" hunk is not part of this diff.)
- src/Menu.php: `Menu::items(..., 'hmCorporateMenuItems')` runs the fold.

## Columnists
- authors 615-624 (hm_site_id 233; former share copies of the turkatahaber AI columnists) renamed to 10 fictional defense analysts
  (personas.json), new generated portraits (data: webp), hm_ai_columnists rows site_id 233 (3 weekdays each).
- ai-editor/turksav_columns.py (+ ops/turksav-columns.sh, cron /etc/cron.d/php-theme-turksav-columns 07:25 + 16:25 TRT):
  defense-only prompt, concept gate (≥5 distinct defense terms + LLM yes/no), defense-aware moderation, publishes hm_makaleler site 233.
- ai-editor/network_columns.py: turksav.org removed from SHARE_TARGET_DOMAINS; Melek Acar excluded on 233; turksav focus note now
  "concept only"; concept gate for turksav columns.
- Hidden (status draft, reversible; nothing deleted): 28 off-concept share copies on 233 + 2 Melek Acar columns; Melek Acar's 233
  author row hidden via hm_site_author_hidden.

## Classifier
- importer-v5/classifier.py: append-only "turksav guvenlik" block (`guvenlik-gucleri` added to TURKSAV_CATS).

## Rollback
VPS /docker/php-theme/backups/turksav-authors-20261008/ (container copies + classifier + network_columns + cron),
TP tables authors_bak_20261008_turksavcol, hm_makaleler_bak_20261008_turksavcol, hm_news_sites_layout_bak_20261008_turksavcol.
