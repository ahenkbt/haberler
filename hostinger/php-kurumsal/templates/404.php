<?php
declare(strict_types=1);
/** @var array<string, mixed> $site */
/** @var list<array{label:string,href:string,children:list<array{label:string,href:string}>}> $nav */
http_response_code(404);
ob_start();
?>
<section class="hk-section">
  <div class="hk-section__head">
    <h1>Sayfa bulunamadı</h1>
    <p>İstediğiniz adres PHP ön yüzde yok. <a href="/">Ana sayfaya dönün</a> veya <a href="/editor">editörden</a> kontrol edin.</p>
  </div>
</section>
<?php
$contentHtml = ob_get_clean();
$pageTitle = '404 | ' . (string) ($site['displayName'] ?? 'Site');
$pageDescription = 'Sayfa bulunamadı';
$canonical = 'https://' . ($site['apex'] ?? '') . '/';
$bodyClass = 'hk-page hk-page--404';
require __DIR__ . '/layout.php';
