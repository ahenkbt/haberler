<?php
declare(strict_types=1);
/** @var array<string, mixed> $site */
/** @var list<array{title:string,href:string,image:?string,excerpt:string}> $tiles */
/** @var list<array{label:string,href:string,children:list<array{label:string,href:string}>}> $nav */
ob_start();
?>
<section class="hk-hero">
  <div class="hk-hero__veil"></div>
  <div class="hk-hero__copy">
    <p class="hk-eyebrow">Kurumsal</p>
    <h1><?= hk_h((string) ($site['displayName'] ?? '')) ?></h1>
    <?php if (!empty($site['tagline'])): ?>
      <p class="hk-lead"><?= hk_h((string) $site['tagline']) ?></p>
    <?php endif; ?>
    <div class="hk-hero__actions">
      <a class="hk-btn hk-btn--primary" href="<?= hk_h($tiles[0]['href'] ?? '/hakkimizda') ?>">Keşfet</a>
      <a class="hk-btn hk-btn--ghost" href="/iletisim">İletişim</a>
    </div>
  </div>
</section>

<?php if ($tiles !== []): ?>
<section class="hk-section">
  <div class="hk-section__head">
    <h2>Öne çıkanlar</h2>
  </div>
  <div class="hk-tiles">
    <?php foreach ($tiles as $tile): ?>
      <a class="hk-tile" href="<?= hk_h($tile['href']) ?>">
        <?php if (!empty($tile['image'])): ?>
          <span class="hk-tile__media" style="background-image:url('<?= hk_h($tile['image']) ?>')"></span>
        <?php else: ?>
          <span class="hk-tile__media hk-tile__media--plain"></span>
        <?php endif; ?>
        <span class="hk-tile__body">
          <strong><?= hk_h($tile['title']) ?></strong>
          <?php if ($tile['excerpt'] !== ''): ?>
            <em><?= hk_h($tile['excerpt']) ?></em>
          <?php endif; ?>
        </span>
      </a>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; ?>

<section class="hk-section hk-section--muted">
  <div class="hk-section__head">
    <h2>Hızlı erişim</h2>
    <p>Sayfalar Hostinger PHP ile sunulur; düzenleme <a href="/editor">HM Editör</a> üzerinden devam eder.</p>
  </div>
  <ul class="hk-quick">
    <?php
    $links = [];
    foreach ($nav as $item) {
        if ($item['children'] !== []) {
            foreach ($item['children'] as $child) {
                $links[] = $child;
            }
        } elseif ($item['href'] !== '#') {
            $links[] = $item;
        }
    }
    $links = array_slice($links, 0, 12);
    foreach ($links as $link):
    ?>
      <li><a href="<?= hk_h($link['href']) ?>"><?= hk_h($link['label']) ?></a></li>
    <?php endforeach; ?>
  </ul>
</section>
<?php
$contentHtml = ob_get_clean();
$pageTitle = (string) ($site['displayName'] ?? 'Ana sayfa');
$pageDescription = (string) ($site['tagline'] ?? $pageTitle);
$canonical = 'https://' . ($site['apex'] ?? '') . '/';
$bodyClass = 'hk-page hk-page--home';
require __DIR__ . '/layout.php';
