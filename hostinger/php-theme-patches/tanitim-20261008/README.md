# Tanıtım page + /iletisim form + main-menu link (PHP Yenişafak theme, 2026-10-08/09)

Live in `php-theme-yenisafak:/app` (docker cp, php -l, no restart). Host tree `/docker/php-theme` synced.

- `src/Tanitim.php` — verbatim tanıtım text, site mailbox (Site::conventionEmail), logo grid source
  (`/api/hm/public/news-sites`, APCu 600 s + /tmp stale copy), `mainNav()` rule.
- `templates/tanitim.php` — `/tanitim` page; `templates/_contact_form.php` — form on `/iletisim`
  (posts to the Worker `POST /api/hm/public/contact`, cloudflare/hm-site-contact-edge.js).
- `patch-tanitim.py` — App.php route + sitemap, page.php form include, layout.php drawer/footer links
  (marker `tanitim 2026-10-08`).
- `patch-mainnav.py` — layout.php: "Tanıtım" at the end of the MAIN MENU (nav.ys-nav) on every news site,
  render-time so new sites (81 il sites included) get it automatically. Not on vatanhaber.net
  (user rule 2026-10-09 00:06 TRT: footer link only), or when layout_json `hmTanitimMainNav` = false.
  Marker `tanitim mainnav 2026-10-09`.
- `patch-mainnav-drawer.py` — the same rule for the mobile main menu (hamburger "Menü" list). Marker
  `tanitim mainnav-drawer 2026-10-09`.

Backups on the VPS: `/docker/php-theme/backups/tanitim-20261008/`, `/docker/php-theme/backups/tanitim-mainnav-20261009/`.
