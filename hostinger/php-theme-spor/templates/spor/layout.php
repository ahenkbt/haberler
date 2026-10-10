<?php
/* spor 2026-10-10: Spor Gündemi kabuğu. App::html "spor 2026-10-10" bloğu bunu templates/layout.php yerine require eder.
   hmSpor yoksa bu dosya hiç yüklenmez. */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Spor;
use Yenisafak\SporLive;

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
    $imageAbs = $site->canonical('/brand/spor/spor-og.png');
    $og = ['type' => 'image/png', 'w' => 1200, 'h' => 630, 'alt' => 'Spor Gündemi'];
}
$isArticle = str_contains($canonical, '/haber/');
$mail = (string) ($site->contact['email'] ?? 'spor@gundemi.org');
$live = SporLive::bundle();
$hasTable = SporLive::hasTable($live);
$hasFx = SporLive::hasFixtures($live);
$isCur = static fn (string $href): bool => $href === $current || ($href !== '/' && str_starts_with($current, $href));
$more = array_values(array_filter(Spor::otherSlugs(), static fn (string $slug): bool => !in_array($slug, Spor::NAV, true)));
?>
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#12161a">
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
  <link rel="icon" href="<?= Html::e(Spor::asset('spor-icon.svg')) ?>" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="<?= Html::e(Spor::asset('spor.css')) ?>">
  <?php if ($jsonLd !== null): ?><script type="application/ld+json"><?= Html::json($jsonLd) ?></script><?php endif; ?>
  <?php $gaId = (string) ($site->layout['hmNewsGaMeasurementId'] ?? ''); if (preg_match('/^G-[A-Z0-9]{4,16}$/', $gaId) === 1): ?>
  <script async src="https://www.googletagmanager.com/gtag/js?id=<?= Html::e($gaId) ?>"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","<?= Html::e($gaId) ?>");</script>
  <?php endif; ?>
</head>
<body class="spor<?= $isArticle ? ' spor-is-article' : '' ?><?= ($live['live'] ?? []) !== [] ? ' spor-has-live' : '' ?>">
  <a class="spor-skip" href="#icerik">İçeriğe geç</a>
  <header class="spor-head">
    <div class="spor-top">
      <div class="spor-wrap spor-top-in">
        <span class="spor-date"><?= Html::e(Spor::dateTr()) ?></span>
        <?php if (($live['live'] ?? []) !== []): ?><span class="spor-top-live"><span class="spor-live-dot" aria-hidden="true"></span> Canlı maç</span><?php endif; ?>
        <span class="spor-top-links">
          <?php if ($hasFx): ?><a href="/canli-skor"<?= $isCur('/canli-skor') ? ' aria-current="page"' : '' ?>>Canlı skor</a><a href="/fikstur"<?= $isCur('/fikstur') ? ' aria-current="page"' : '' ?>>Fikstür</a><?php endif; ?>
          <?php if ($hasTable): ?><a href="/puan-durumu"<?= $isCur('/puan-durumu') ? ' aria-current="page"' : '' ?>>Puan durumu</a><?php endif; ?>
          <a href="/transfer"<?= $isCur('/transfer') ? ' aria-current="page"' : '' ?>>Transfer</a>
          <a href="/rss.xml">RSS</a>
        </span>
      </div>
    </div>
    <div class="spor-wrap spor-brand">
      <a class="spor-logo" href="/" aria-label="Spor Gündemi ana sayfa">
        <svg class="spor-logo-mark" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" fill="#0e8f3d"/><circle cx="24" cy="24" r="10" fill="none" stroke="#f5c518" stroke-width="3"/><path d="M14 24h20M24 14c3 3.2 3 16.8 0 20M24 14c-3 3.2-3 16.8 0 20" fill="none" stroke="#f5c518" stroke-width="2"/></svg>
        <span class="spor-logo-t"><b>SPOR</b><i>GÜNDEMİ</i></span>
      </a>
      <p class="spor-slogan">Sporun nabzı burada atar.</p>
      <button class="spor-burger" type="button" aria-label="Menü" aria-expanded="false" data-spor-burger><span></span><span></span><span></span></button>
    </div>
    <nav class="spor-nav" aria-label="Branşlar" data-spor-nav>
      <div class="spor-wrap spor-nav-in">
        <a href="/"<?= $current === '/' ? ' aria-current="page"' : '' ?>>Ana Sayfa</a>
        <?php foreach (Spor::NAV as $slug): $s = Spor::section($slug); if ($s === null) { continue; } ?>
          <a href="/kategori/<?= Html::e($slug) ?>" style="--c:<?= Html::e($s['color']) ?>;--on:<?= Html::e($s['ink']) ?>"<?= $isCur('/kategori/' . $slug) ? ' aria-current="page"' : '' ?>><?= Html::e($s['short']) ?></a>
        <?php endforeach; ?>
        <?php if ($more !== []): ?>
        <details class="spor-more">
          <summary>Diğer</summary>
          <div class="spor-more-pop">
            <?php foreach ($more as $slug): $s = Spor::section($slug); if ($s === null) { continue; } ?>
              <a href="/kategori/<?= Html::e($slug) ?>"<?= $isCur('/kategori/' . $slug) ? ' aria-current="page"' : '' ?>><?= Html::e($s['name']) ?></a>
            <?php endforeach; ?>
          </div>
        </details>
        <?php endif; ?>
      </div>
    </nav>
    <?php require __DIR__ . '/_strip.php'; ?>
  </header>
  <main id="icerik" class="spor-main">
    <?= $body ?>
  </main>
  <footer class="spor-foot">
    <div class="spor-wrap spor-foot-in">
      <div class="spor-foot-brand">
        <p class="spor-foot-logo"><b>SPOR</b> <i>GÜNDEMİ</i></p>
        <p>Futbol, basketbol, voleybol ve diğer branşlar. Süper Lig puan durumu ile fikstür, kaynak yanıt verdiği sürece gösterilir.</p>
        <p class="spor-foot-src">Skor ve puan durumu: ESPN (soccer/tur.1, Turkish Super Lig). Veri gecikmeli olabilir. Kaynak yoksa şerit gizlenir; skor üretilmez.</p>
      </div>
      <nav class="spor-foot-col" aria-label="Branşlar"><p>Branşlar</p>
        <?php foreach (Spor::NAV as $slug): $s = Spor::section($slug); ?><a href="/kategori/<?= Html::e($slug) ?>"><?= Html::e($s['name']) ?></a><?php endforeach; ?>
      </nav>
      <nav class="spor-foot-col" aria-label="Diğer branşlar"><p>Diğer</p>
        <?php foreach ($more as $slug): $s = Spor::section($slug); ?><a href="/kategori/<?= Html::e($slug) ?>"><?= Html::e($s['name']) ?></a><?php endforeach; ?>
        <a href="/transfer">Transfer</a>
      </nav>
      <nav class="spor-foot-col" aria-label="Kurumsal"><p>Kurumsal</p>
        <?php if ($hasFx): ?><a href="/canli-skor">Canlı skor</a><a href="/fikstur">Fikstür</a><?php endif; ?>
        <?php if ($hasTable): ?><a href="/puan-durumu">Puan durumu</a><?php endif; ?>
        <a href="/kunye">Künye</a><a href="/hakkimizda">Hakkımızda</a><a href="/iletisim">İletişim</a>
        <a href="/gizlilik-politikasi">Gizlilik</a><a href="/rss.xml">RSS</a>
      </nav>
    </div>
    <div class="spor-foot-bottom"><div class="spor-wrap">
      <span>© <?= date('Y') ?> <?= Html::e($site->name) ?> — <a href="mailto:<?= Html::e($mail) ?>"><?= Html::e($mail) ?></a></span>
      <span class="ys-footer-credits"><span><a href="https://goalgo.com.tr/" target="_blank" rel="noopener">Goalgo Haber Yazılımı</a></span><?php if (!$site->whiteLabel()): ?> <span>·</span> <span>Haber Merkezi: <a href="https://turkatahaber.com/" target="_blank" rel="noopener">TurkAta</a></span><?php endif; ?> <span>·</span> <span>Altyapı: <a href="https://ahenk.net.tr/" target="_blank" rel="noopener">Ahenk BT</a></span></span>
    </div></div>
  </footer>
  <script src="<?= Html::e(Spor::asset('spor.js')) ?>" defer></script>
</body>
</html>
