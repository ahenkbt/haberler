<?php
declare(strict_types=1);
/** @var array<string, mixed> $site */
/** @var array{slug:string,title:string,bodyHtml:string} $page */
/** @var list<array{label:string,href:string,children:list<array{label:string,href:string}>}> $nav */
ob_start();
?>
<article class="hk-article">
  <header class="hk-article__head">
    <p class="hk-eyebrow">Sayfa</p>
    <h1><?= hk_h($page['title']) ?></h1>
  </header>
  <div class="hk-prose">
    <?= $page['bodyHtml'] !== '' ? $page['bodyHtml'] : '<p>Bu sayfa henüz içerik taşımadı. Editörden kaydedin.</p>' ?>
  </div>
</article>
<?php
$contentHtml = ob_get_clean();
$pageTitle = $page['title'] . ' | ' . (string) ($site['displayName'] ?? '');
$pageDescription = $page['title'];
$canonical = 'https://' . ($site['apex'] ?? '') . '/' . ltrim($page['slug'], '/');
$bodyClass = 'hk-page hk-page--inner';
require __DIR__ . '/layout.php';
