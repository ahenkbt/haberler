<?php
/* sector 2026-10-10: sektör platformu kabuğu (App::html hunk "sector 2026-10-10"). yeni.tc kabuğunun (templates/yeni/layout.php) aynı kalıbı. */

declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var Yenisafak\Site $site */
/** @var string $title */
/** @var string $description */
/** @var string $body */
/** @var string $canonical */
/** @var string $imageAbs */
/** @var array<string, mixed>|null $jsonLd */
/** @var int $status */
$def = Sector::$def;
$ogX = isset($ogX) && is_array($ogX) ? $ogX : [];
$og = isset($og) && is_array($og) ? $og : [];
$ogTitle = (string) (($ogX['title'] ?? '') !== '' ? $ogX['title'] : $title);
$current = rtrim((string) parse_url($canonical, PHP_URL_PATH), '/');
$current = $current === '' ? '/' : $current;
if ($imageAbs === '' || str_contains($imageAbs, '/og/site/')) {
    $imageAbs = $site->canonical('/brand/sector/' . Sector::key() . '/og.png');
    $og = ['type' => 'image/png', 'w' => 1200, 'h' => 630, 'alt' => $site->name];
}
$isArticle = str_contains($canonical, '/haber/');
$mail = (string) ($site->contact['email'] ?? $def['email'] ?? '');
$nav = $def['nav'] ?? [];
$secs = Sector::sections();
$isCur = static fn (string $href): bool => $href === $current || ($href !== '/' && str_starts_with($current, rtrim((string) strtok($href, '?'), '/') . '/')) || $href === $current;
$noindex = Sector::$noindex;
Sector::$noindex = false;
$primary = $def['hero']['cta'][0] ?? ['Rehber', '/rehber', 'hot'];
$c = Sector::colors();
?>
<!DOCTYPE html>
<html lang="tr" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <script>(function(){var t=null;try{t=localStorage.getItem("yn-theme")}catch(e){}if(t!=="dark"&&t!=="light"){t=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)})();</script>
  <meta name="color-scheme" content="light dark">
  <?php $tc = ['okul' => ['#FFF8EC', '#0B1530'], 'muhtar' => ['#F4EDE1', '#101722'], 'sendika' => ['#111111', '#0B0B0B']][Sector::key()] ?? ['#F6F3EE', '#0C0C10']; ?>
  <meta name="theme-color" content="<?= $tc[0] ?>" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="<?= $tc[1] ?>" media="(prefers-color-scheme: dark)">
  <title><?= Html::e($title) ?></title>
  <meta name="description" content="<?= Html::e($description) ?>">
<?php if ($noindex): ?>  <meta name="robots" content="noindex, nofollow">
<?php endif; ?>
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
  <?php if ((int) ($status ?? 200) === 200 && !$noindex && class_exists(\Yenisafak\SeoGeo::class)): ?><?= \Yenisafak\SeoGeo::head($site, $canonical, false, $jsonLd ?? null) ?><?php endif; ?>
  <link rel="icon" href="<?= Html::e(Sector::asset('icon.svg')) ?>" type="image/svg+xml">
  <link rel="icon" href="<?= Html::e(Sector::asset('icon-32.png')) ?>" type="image/png" sizes="32x32">
  <link rel="icon" href="<?= Html::e(Sector::asset('icon-192.png')) ?>" type="image/png" sizes="192x192">
  <link rel="apple-touch-icon" href="<?= Html::e(Sector::asset('icon-180.png')) ?>">
  <link rel="preload" href="/brand/yenitc/fonts/bricolage-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/brand/yenitc/fonts/bricolage-normal-latin-ext.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="<?= Html::e(Html::versioned('/brand/yenitc/yenitc.css')) ?>">
  <link rel="stylesheet" href="<?= Html::e(Sector::css()) ?>">
  <?php if (($sk = Sector::skin()) !== ''): ?><link rel="stylesheet" href="<?= Html::e($sk) ?>"><?php endif; ?>
  <style><?= Sector::rootCss() ?></style>
  <?php if ($jsonLd !== null): ?><script type="application/ld+json"><?= Html::json($jsonLd) ?></script><?php endif; ?>
  <?php $gaId = (string) ($site->layout['hmNewsGaMeasurementId'] ?? ''); if (preg_match('/^G-[A-Z0-9]{4,16}$/', $gaId) === 1): ?>
  <script async src="https://www.googletagmanager.com/gtag/js?id=<?= Html::e($gaId) ?>"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","<?= Html::e($gaId) ?>");</script>
  <?php endif; ?>
</head>
<body class="yn sc sc-<?= Html::e(Sector::key()) ?><?= $isArticle ? ' yn-is-article' : '' ?>">
  <a class="yn-skip" href="#icerik">İçeriğe geç</a>
  <?php if ($isArticle): ?><div class="yn-progress" aria-hidden="true"><i></i></div><?php endif; ?>
  <div class="sc-topbar"><div class="sc-topbar-in"><span class="sc-tb-date"><?= Html::e(Sector::today()) ?></span><span class="sc-tb-msg"><?= Html::e((string) $def['slogan']) ?></span><nav class="sc-tb-nav" aria-label="Hızlı bağlantılar"><?php foreach (array_slice($nav, 0, 3) as [$label, $href]): ?><a href="<?= Html::e($href) ?>"><?= Html::e($label) ?></a><?php endforeach; ?></nav></div></div>
  <header class="yn-head" data-yn-head>
    <div class="yn-head-in">
      <a class="yn-logo" href="/" aria-label="<?= Html::e($site->name) ?> ana sayfa">
        <img class="yn-logo-l" src="<?= Html::e(Sector::asset('logo.svg')) ?>" alt="<?= Html::e($site->name) ?>" width="150" height="44">
        <img class="yn-logo-d" src="<?= Html::e(Sector::asset('logo-dark.svg')) ?>" alt="" width="150" height="44">
      </a>
      <nav class="yn-nav" aria-label="Ana menü">
        <?php foreach ($nav as [$label, $href]): ?>
          <a href="<?= Html::e($href) ?>"<?= $isCur($href) ? ' aria-current="page"' : '' ?>><?= Html::e($label) ?></a>
        <?php endforeach; ?>
      </nav>
      <div class="yn-head-act">
        <a class="yn-btn yn-btn-ghost yn-hide-s" href="/uye-ol"<?= $isCur('/uye-ol') ? ' aria-current="page"' : '' ?>>Üye ol</a>
        <a class="yn-btn yn-btn-hot" href="<?= Html::e((string) $primary[1]) ?>"><?= Html::e((string) $primary[0]) ?></a>
        <button class="yn-theme" type="button" data-yn-theme aria-label="Karanlık modu aç/kapat" title="Karanlık mod">
          <svg class="yn-i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
          <svg class="yn-i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></svg>
        </button>
        <button class="yn-burger" type="button" data-yn-menu aria-expanded="false" aria-controls="yn-sheet" aria-label="Menü"><i></i><i></i></button>
      </div>
    </div>
    <nav class="yn-chips" aria-label="Ana menü (mobil)">
      <?php foreach ($nav as [$label, $href]): ?><a href="<?= Html::e($href) ?>" style="--c:<?= Html::e($c['hot']) ?>"<?= $isCur($href) ? ' aria-current="page"' : '' ?>><?= Html::e($label) ?></a><?php endforeach; ?>
    </nav>
  </header>
  <div class="yn-sheet" id="yn-sheet" hidden>
    <div class="yn-sheet-in">
      <p class="yn-eyebrow">Bölümler</p>
      <?php foreach ($secs as $s): ?>
        <a class="yn-sheet-l" href="/kategori/<?= Html::e($s['slug']) ?>" style="--c:<?= Html::e($s['color']) ?>"><span><?= Html::e($s['name']) ?></span><small><?= Html::e($s['blurb']) ?></small></a>
      <?php endforeach; ?>
      <div class="yn-sheet-row">
        <a class="yn-btn yn-btn-hot" href="/uye-ol">Üye ol / Rehbere başvur</a>
        <a class="yn-btn yn-btn-ghost" href="/rehber">Rehber</a>
        <a class="yn-btn yn-btn-ghost" href="/yardim">Yardım</a>
        <a class="yn-btn yn-btn-ghost" href="/talep"><?= Html::e((string) ($def['request']['title'] ?? 'Talep')) ?></a>
      </div>
    </div>
  </div>
  <main id="icerik" class="yn-main">
    <?= $body ?>
  </main>
  <footer class="yn-foot">
    <div class="yn-foot-in">
      <div class="yn-foot-brand">
        <img class="yn-foot-logo" src="<?= Html::e(Sector::asset('logo-dark.svg')) ?>" alt="<?= Html::e($site->name) ?>" width="220" height="64">
        <p class="yn-foot-slogan"><?= Html::e((string) $def['slogan']) ?></p>
        <p class="yn-foot-lead"><?= Html::e((string) $def['about']) ?></p>
        <a class="yn-btn yn-btn-lime" href="/uye-ol">Üye ol / Başvur →</a>
      </div>
      <nav class="yn-foot-col" aria-label="Bölümler"><p>Bölümler</p>
        <?php foreach ($secs as $s): ?><a href="/kategori/<?= Html::e($s['slug']) ?>"><?= Html::e($s['name']) ?></a><?php endforeach; ?>
      </nav>
      <nav class="yn-foot-col" aria-label="Platform"><p>Platform</p>
        <?php foreach ($nav as [$label, $href]): ?><a href="<?= Html::e($href) ?>"><?= Html::e($label) ?></a><?php endforeach; ?>
        <a href="/uye-ol">Üye ol / Başvur</a>
        <a href="/yardim">Nasıl Kullanılır / Yardım</a>
        <a href="/rss.xml">RSS</a>
      </nav>
      <nav class="yn-foot-col" aria-label="Kurumsal"><p>Kurumsal</p>
        <a href="/kunye">Künye</a><a href="/hakkimizda">Hakkımızda</a><a href="/iletisim">İletişim</a><a href="/tanitim">Tanıtım</a>
        <a href="/hizmet-sartlari">Hizmet Şartları</a><a href="/gizlilik-politikasi">Gizlilik Politikası</a><a href="/kvkk-aydinlatma">KVKK Aydınlatma</a>
        <a href="/editor">Editör Girişi</a>
      </nav>
    </div>
    <div class="yn-foot-bottom">
      <span>© <?= date('Y') ?> <?= Html::e($site->name) ?> · Bilgi ve iletişim: <a href="mailto:<?= Html::e($mail) ?>"><?= Html::e($mail) ?></a></span>
      <span class="ys-footer-credits"><span>Yazılım: <a href="https://goalgo.com.tr/" target="_blank" rel="noopener">Goalgo Haber Yazılımı</a></span> <span>·</span> <span>Haber Merkezi: <a href="https://turkatahaber.com/" target="_blank" rel="noopener">TurkAta</a></span> <span>·</span> <span>Altyapı: <a href="https://ahenk.net.tr/" target="_blank" rel="noopener">Ahenk BT</a></span></span>
    </div>
  </footer>
  <script src="<?= Html::e(Html::versioned('/brand/yenitc/yenitc.js')) ?>" defer></script>
  <script src="<?= Html::e(Sector::js()) ?>" defer></script>
</body>
</html>
