# PHP theme: show cover when `image_url` empty but body has `<img>`

Live Yenişafak article template only renders `ys-media-hero` when `$story['image']` (DB `image_url`) is set. Some RSS rows have images inside `content` but a null `image_url` (NTV-style feeds without enclosure).

Apply on VPS `php-theme-yenisafak` `templates/article.php` (after meta, before spot):

```php
<?php
$cover = (string) ($story['image'] ?? '');
if ($cover === '' && !empty($story['body'])) {
  if (preg_match('/<img[^>]+src=["\'](https?:\/\/[^"\']+)["\']/i', (string) $story['body'], $m)) {
    $cover = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
  }
}
?>
<?php if ($cover !== ''): ?>
  <p class="ys-media ys-media-hero">
    <img src="<?= Html::e(Html::src($site->basePath, $cover)) ?>" alt="" width="960" height="540" fetchpriority="high" decoding="async" onerror="this.closest('.ys-media-hero').remove()">
  </p>
<?php endif; ?>
```

Prefer fixing `image_url` via `backfill-turkata-rss-covers` / Worker `POST /api/hm/admin/repair-turkata-rss-covers` so listings and OG also get the cover.
