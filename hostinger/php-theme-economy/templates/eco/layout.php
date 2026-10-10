<?php
/* eco 2026-10-10: Ekonomi Gündemi kabuğu (App::html "eco 2026-10-10" bloğu bunu templates/layout.php yerine require eder). */

declare(strict_types=1);

use Yenisafak\Eco;
use Yenisafak\Html;

/** @var Yenisafak\Site $site */
/** @var string $title */
/** @var string $description */
/** @var string $body */
/** @var string $canonical */
/** @var string $imageAbs */
/** @var array<string, mixed>|null $jsonLd */
/** @var int $status */
$ogX = isset($ogX) && is_array($ogX) ? $ogX : [];
$og = isset($og) && is_array($og) ? $og : [];
$ogTitle = (string) (($ogX['title'] ?? '') !== '' ? $ogX['title'] : $title);
$current = rtrim((string) parse_url($canonical, PHP_URL_PATH), '/');
$current = $current === '' ? '/' : $current;
if ($imageAbs === '' || str_contains($imageAbs, '/og/site/')) {
    $imageAbs = $site->canonical('/brand/eco/eco-og.png');
    $og = ['type' => 'image/png', 'w' => 1200, 'h' => 630, 'alt' => 'Ekonomi Gündemi'];
}
$isArticle = str_contains($canonical, '/haber/');
$mail = (string) ($site->contact['email'] ?? 'ekonomi@gundemi.org');
$strip = Eco::strip();
$main = ['eko-gundem', 'eko-borsa', 'eko-doviz', 'eko-altin', 'eko-kripto', 'eko-banka-finans', 'eko-makro', 'eko-sirketler', 'eko-enerji'];
$isCur = static fn (string $href): bool => $href === $current || ($href !== '/' && str_starts_with($current, $href . '/'));
?>
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0a1f33">
  <title><?= Html::e($title) ?></title>
  <meta name="description" content="<?= Html::e($description) ?>">
  <link rel="canonical" href="<?= Html::e($canonical) ?>">
  <link rel="alternate" type="application/rss+xml" title="<?= Html::e($site->name) ?>" href="<?= Html::e($site->canonical('/rss.xml')) ?>">
  <meta property="og:type" content="<?= $isArticle ? 'article' : 'website' ?>">
  <meta property="og:title" content="<?= Html::e($ogTitle) ?>">
  <meta property="og:description" content="<?= Html::e($description) ?>">
  <meta property="og:url" content="<?= Html::e($canonical) ?>">
  <meta property="og:locale" content="tr_TR">
  <meta property="og:site_name" content="<?= Html::e($site->name) ?>">
  <meta property="og:image" content="<?= Html::e($imageAbs) ?>">
  <meta property="og:image:secure_url" content="<?= Html::e($imageAbs) ?>">
  <?php if (!empty($og['type'])): ?><meta property="og:image:type" content="<?= Html::e((string) $og['type']) ?>"><?php endif; ?>
  <?php if (!empty($og['w']) && !empty($og['h'])): ?><meta property="og:image:width" content="<?= (int) $og['w'] ?>"><meta property="og:image:height" content="<?= (int) $og['h'] ?>"><?php endif; ?>
  <meta property="og:image:alt" content="<?= Html::e((string) (($og['alt'] ?? '') !== '' ? $og['alt'] : $title)) ?>">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<?= Html::e($ogTitle) ?>">
  <meta name="twitter:description" content="<?= Html::e($description) ?>">
  <meta name="twitter:image" content="<?= Html::e($imageAbs) ?>">
  <?php if (($ogX['published'] ?? '') !== ''): ?><meta property="article:published_time" content="<?= Html::e((string) $ogX['published']) ?>"><?php endif; ?>
  <?php if ((int) ($status ?? 200) === 200 && class_exists(\Yenisafak\SeoGeo::class)): ?><?= \Yenisafak\SeoGeo::head($site, $canonical, false, $jsonLd ?? null) ?><?php endif; ?>
  <link rel="icon" href="<?= Html::e(Eco::asset('eco-icon.svg')) ?>" type="image/svg+xml">
  <link rel="stylesheet" href="<?= Html::e(Eco::asset('eco.css')) ?>">
  <?php if ($jsonLd !== null): ?><script type="application/ld+json"><?= Html::json($jsonLd) ?></script><?php endif; ?>
  <?php $gaId = (string) ($site->layout['hmNewsGaMeasurementId'] ?? ''); if (preg_match('/^G-[A-Z0-9]{4,16}$/', $gaId) === 1): ?>
  <script async src="https://www.googletagmanager.com/gtag/js?id=<?= Html::e($gaId) ?>"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","<?= Html::e($gaId) ?>");</script>
  <?php endif; ?>
</head>
<body class="eco<?= $isArticle ? ' eco-is-article' : '' ?>">
  <a class="eco-skip" href="#icerik">İçeriğe geç</a>
  <div class="eco-top">
    <div class="eco-wrap eco-top-in">
      <span class="eco-date"><?= Html::e(Eco::dateTr()) ?></span>
      <span class="eco-top-links"><a href="/piyasalar">Canlı Piyasalar</a><a href="/bolumler">Bölümler</a><a href="/rss.xml">RSS</a><a href="/editor">Editör Girişi</a></span>
    </div>
  </div>
  <header class="eco-head">
    <div class="eco-wrap eco-head-in">
      <a class="eco-logo" href="/" aria-label="Ekonomi Gündemi ana sayfa">
        <svg class="eco-logo-mark" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="10" fill="#0f3d2e"/><path d="M9 34l9-10 7 6 14-17" fill="none" stroke="#e0b13a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 13h8v8" fill="none" stroke="#e0b13a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="eco-logo-t"><b>EKONOMİ</b><i>GÜNDEMİ</i></span>
      </a>
      <p class="eco-slogan">Piyasanın nabzı, ekonominin gündemi.</p>
      <button class="eco-burger" type="button" aria-label="Menü" aria-expanded="false" data-eco-burger><span></span><span></span><span></span></button>
    </div>
    <?php if ($strip !== []): ?>
    <div class="eco-strip" role="region" aria-label="Piyasa şeridi">
      <div class="eco-wrap eco-strip-in">
        <ul class="eco-strip-ul">
          <?php foreach ($strip as $m): $d = Eco::dir($m['change'] ?? null); ?>
          <li class="is-<?= $d ?>"><a href="/piyasalar"><span class="l"><?= Html::e((string) $m['label']) ?></span> <span class="v"><?= Html::e(Eco::fmt($m)) ?><?= $m['unit'] !== '' ? ' ' . Html::e((string) $m['unit']) : '' ?></span><?php if (($m['change'] ?? null) !== null): ?> <span class="c"><?= $d === 'up' ? '▲' : ($d === 'down' ? '▼' : '•') ?> <?= Html::e(Eco::fmtChange((float) $m['change'])) ?></span><?php endif; ?></a></li>
          <?php endforeach; ?>
        </ul>
      </div>
    </div>
    <?php endif; ?>
    <nav class="eco-nav" aria-label="Bölümler" data-eco-nav>
      <div class="eco-wrap eco-nav-in">
        <a href="/"<?= $current === '/' ? ' aria-current="page"' : '' ?>>Ana Sayfa</a>
        <?php foreach ($main as $slug): $s = Eco::section($slug); if ($s === null) { continue; } ?>
          <a href="/kategori/<?= Html::e($slug) ?>" style="--c:<?= Html::e($s['color']) ?>"<?= $isCur('/kategori/' . $slug) ? ' aria-current="page"' : '' ?>><?= Html::e($s['short']) ?></a>
        <?php endforeach; ?>
        <a class="eco-more" href="/bolumler">Tüm Bölümler ▾</a>
      </div>
    </nav>
  </header>
  <main id="icerik" class="eco-main">
    <?= $body ?>
  </main>
  <footer class="eco-foot">
    <div class="eco-wrap eco-foot-in">
      <div class="eco-foot-brand">
        <p class="eco-foot-logo"><b>EKONOMİ</b> <i>GÜNDEMİ</i></p>
        <p>Borsa, döviz, altın, kripto para, şirket ve makro ekonomi haberleri. Piyasa verileri bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.</p>
        <p class="eco-foot-src">Veri kaynakları: Yahoo Finance, Truncgil Finans, T.C. Merkez Bankası. Veriler gecikmeli olabilir.</p>
      </div>
      <nav class="eco-foot-col" aria-label="Piyasa"><p>Piyasa</p>
        <?php foreach (['eko-borsa', 'eko-doviz', 'eko-altin', 'eko-kripto', 'eko-enerji'] as $slug): $s = Eco::section($slug); ?><a href="/kategori/<?= Html::e($slug) ?>"><?= Html::e($s['name']) ?></a><?php endforeach; ?>
        <a href="/piyasalar">Canlı Piyasalar</a>
      </nav>
      <nav class="eco-foot-col" aria-label="Haber"><p>Haber</p>
        <?php foreach (['eko-gundem', 'eko-banka-finans', 'eko-makro', 'eko-sirketler', 'eko-sanayi-ihracat', 'eko-emlak', 'eko-dunya'] as $slug): $s = Eco::section($slug); ?><a href="/kategori/<?= Html::e($slug) ?>"><?= Html::e($s['name']) ?></a><?php endforeach; ?>
      </nav>
      <nav class="eco-foot-col" aria-label="Kurumsal"><p>Kurumsal</p>
        <a href="/kunye">Künye</a><a href="/hakkimizda">Hakkımızda</a><a href="/iletisim">İletişim</a><a href="/tanitim">Tanıtım</a>
        <a href="/hizmet-sartlari">Hizmet Şartları</a><a href="/gizlilik-politikasi">Gizlilik Politikası</a><a href="/rss.xml">RSS</a>
      </nav>
    </div>
    <div class="eco-foot-bottom"><div class="eco-wrap">
      <span>© <?= date('Y') ?> <?= Html::e($site->name) ?> — <a href="mailto:<?= Html::e($mail) ?>"><?= Html::e($mail) ?></a></span>
      <span class="ys-footer-credits"><span><a href="https://goalgo.com.tr/" target="_blank" rel="noopener">Goalgo Haber Yazılımı</a></span><?php if (!$site->whiteLabel()): ?> <span>·</span> <span>Haber Merkezi: <a href="https://turkatahaber.com/" target="_blank" rel="noopener">TurkAta</a></span><?php endif; ?> <span>·</span> <span>Altyapı: <a href="https://ahenk.net.tr/" target="_blank" rel="noopener">Ahenk BT</a></span></span>
    </div></div>
  </footer>
  <script src="<?= Html::e(Eco::asset('eco.js')) ?>" defer></script>
</body>
</html>
