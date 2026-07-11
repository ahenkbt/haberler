<?php
/**
 * AnkaraHaber — Header Partial
 */
defined('ROOT') or die();

$siteName   = DB::setting('site_name', 'Ankara Haber');
$logoText1  = DB::setting('logo_text1', 'ANKARA');
$logoText2  = DB::setting('logo_text2', 'HABER');
$logoImg    = DB::setting('logo_img', '');
$themeUrl   = Theme::url();
$gaCode     = DB::setting('ga_code', '');
$headCode   = DB::setting('head_code', '');
$siteUrl    = ap_url();
$siteDesc   = DB::setting('site_desc', '');

// Son dakika / breaking haberleri
$breakingPosts = [];
try {
    $all = PostType::getPosts(['post_type'=>'news','status'=>'published','order_by'=>'published_at','limit'=>20]);
    $breakingPosts = array_filter($all, fn($p) => $p['is_breaking']);
    if (empty($breakingPosts)) {
        $breakingPosts = PostType::getPosts(['post_type'=>'news','status'=>'published','limit'=>10]);
    }
    $breakingPosts = array_values($breakingPosts);
} catch (\Throwable) {}

// Ana navigasyon menüsü
$navItems = [];
try {
    $navMenu = DB::queryRow("SELECT items FROM `{p}menus` WHERE location='main-nav' OR slug='ana-menu' LIMIT 1");
    $navItems = $navMenu ? (json_decode($navMenu['items'], true) ?? []) : [];
    if (empty($navItems)) {
        $navCats = DB::query("SELECT id,name,slug FROM `{p}categories` WHERE active=1 ORDER BY sort_order LIMIT 10");
        foreach ($navCats as $c) {
            $navItems[] = ['label'=>$c['name'], 'url'=>ap_url($c['slug']), 'type'=>'category'];
        }
    }
} catch (\Throwable) { $navItems = []; }

$postTitle   = isset($post) ? $post['title'] : $siteName;
$postDesc    = isset($post) ? ($post['excerpt'] ?? $siteDesc) : $siteDesc;
$canonicalUrl = isset($post) ? ap_url($post['slug']) : $siteUrl;
?>
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= e($postTitle !== $siteName ? $postTitle . ' — ' . $siteName : $siteName) ?></title>
<meta name="description" content="<?= e(mb_substr($postDesc, 0, 160)) ?>">
<link rel="canonical" href="<?= e($canonicalUrl) ?>">
<meta property="og:title" content="<?= e($postTitle) ?>">
<meta property="og:description" content="<?= e(mb_substr($postDesc,0,160)) ?>">
<?php if (isset($post['cover_image']) && $post['cover_image']): ?>
<meta property="og:image" content="<?= e(ap_thumb_url($post['cover_image'])) ?>">
<?php endif; ?>
<meta property="og:type" content="<?= isset($post) ? 'article' : 'website' ?>">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="<?= $themeUrl ?>/assets/css/main.css">
<?php if ($gaCode): ?>
<script async src="https://www.googletagmanager.com/gtag/js?id=<?= e($gaCode) ?>"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','<?= e($gaCode) ?>');</script>
<?php endif; ?>
<?= $headCode ?>
</head>
<body>

<?php /* SON DAKİKA TICKER */ ?>
<?php if (!empty($breakingPosts)): ?>
<div class="son-dakika-bar">
  <div class="container">
    <div class="son-dakika-ic">
      <span class="sd-etiket">⚡ SON DAKİKA</span>
      <div class="sd-sarici">
        <div class="sd-icerik" id="sdIcerik">
          <?php foreach (array_merge($breakingPosts, $breakingPosts) as $bp): ?>
          <a href="<?= e(ap_url($bp['slug'])) ?>" class="sd-item"><?= e($bp['title']) ?></a>
          <span class="sd-ay">•</span>
          <?php endforeach; ?>
        </div>
      </div>
    </div>
  </div>
</div>
<?php endif; ?>

<?php /* ÜST BAR */ ?>
<div class="ust-bar">
  <div class="container">
    <div class="ust-bar-sol">
      <a href="<?= e(ap_url('kunye')) ?>" class="ust-bar-link"><i class="fa fa-id-card"></i> Künye</a>
      <a href="<?= e(ap_url('iletisim')) ?>" class="ust-bar-link"><i class="fa fa-envelope"></i> İletişim</a>
    </div>
    <div class="ust-bar-sag ust-bar-sag--desktop">
      <a href="<?= e(ap_url('yazarlar')) ?>" class="ust-bar-link"><i class="fa fa-pen-nib"></i> Yazarlar</a>
      <a href="<?= e($siteUrl) ?>" class="ust-bar-link ust-bar-link--vurgulu"><i class="fa fa-home"></i> Ana Sayfa</a>
    </div>
  </div>
</div>

<?php /* HEADER (LOGO + REKLAM) */ ?>
<header class="site-header">
  <div class="container">
    <div class="header-ic">
      <div class="site-logo">
        <a href="<?= $siteUrl ?>">
          <?php if ($logoImg): ?>
            <img src="<?= e(ap_thumb_url($logoImg)) ?>" alt="<?= e($siteName) ?>" style="max-height:60px;width:auto">
          <?php else: ?>
            <div class="metin-logo">
              <span class="logo-ana"><?= e($logoText1) ?></span>
              <span class="logo-aksan"><?= e($logoText2) ?></span>
            </div>
          <?php endif; ?>
        </a>
      </div>
      <?php $hr = DB::setting('theme_reklam_ustbant',''); if ($hr): ?>
      <div class="header-reklam" style="display:flex;align-items:center;justify-content:center;flex:1;max-width:728px;margin:0 auto;overflow:hidden">
        <?= $hr ?>
      </div>
      <?php else: ?>
      <div style="flex:1;display:flex;align-items:center;justify-content:center">
        <div class="reklam-placeholder" style="width:728px;height:90px;max-width:100%"><span>728×90</span></div>
      </div>
      <?php endif; ?>
    </div>
  </div>
</header>

<?php /* STICKY ANA NAV */ ?>
<nav class="ana-nav" role="navigation">
  <div class="container">
    <div class="nav-ic">
      <ul class="ana-menu">
        <li class="menu-item <?= (($_GET['page']??'')==='' && !isset($_GET['q'])) ? 'menu-aktif' : '' ?>">
          <a href="<?= $siteUrl ?>">🏠 Ana Sayfa</a>
        </li>
        <?php foreach ($navItems as $item): ?>
        <li class="menu-item">
          <a href="<?= e($item['url'] ?? '#') ?>"><?= e($item['label']) ?></a>
        </li>
        <?php endforeach; ?>
        <li class="menu-item">
          <a href="<?= e(ap_url('yazarlar')) ?>"><i class="fa fa-pen-nib"></i> Yazarlar</a>
        </li>
      </ul>
      <div class="nav-aksiyonlar">
        <button class="nav-btn" id="aramaBtn2" aria-label="Ara"><i class="fa fa-search"></i> <span class="hamburger-txt">Ara</span></button>
        <button class="nav-btn" id="darkModeBtn" title="Gece modu"><i class="fa fa-moon"></i></button>
        <button class="nav-btn" id="hamburgerBtn" aria-label="Menü" style="display:none"><i class="fa fa-bars"></i></button>
      </div>
    </div>
  </div>
</nav>

<?php /* ARAMA OVERLAY */ ?>
<div class="arama-overlay" id="aramaOverlay" role="search">
  <div class="container" style="position:relative">
    <button class="arama-kapat" id="aramaKapat" aria-label="Kapat">✕</button>
    <form class="ahenk-search-form" action="<?= e(ap_url('arama')) ?>" method="GET">
      <input class="search-input" type="text" name="q" placeholder="Haber ara..." autocomplete="off" id="searchInput">
      <button type="submit" class="search-btn" aria-label="Ara"><i class="fa fa-search"></i></button>
    </form>
  </div>
</div>

<?php /* MOBİL DRAWER */ ?>
<div class="mobil-drawer" id="mobilDrawer" role="dialog" aria-label="Menü">
  <div class="mobil-drawer-ic">
    <div class="mobil-drawer-header">
      <div class="metin-logo">
        <span class="logo-ana"><?= e($logoText1) ?></span>
        <span class="logo-aksan"><?= e($logoText2) ?></span>
      </div>
      <button id="mobilDrawerKapat" aria-label="Kapat">✕</button>
    </div>
    <ul class="mobil-drawer-liste">
      <li><a href="<?= $siteUrl ?>"><i class="fa fa-home"></i> Ana Sayfa</a></li>
      <?php foreach ($navItems as $item): ?>
      <li><a href="<?= e($item['url'] ?? '#') ?>"><i class="fa fa-chevron-right"></i> <?= e($item['label']) ?></a></li>
      <?php endforeach; ?>
      <li><a href="<?= e(ap_url('yazarlar')) ?>"><i class="fa fa-pen-nib"></i> Yazarlar</a></li>
      <li><a href="<?= e(ap_url('iletisim')) ?>"><i class="fa fa-envelope"></i> İletişim</a></li>
      <?php if (Auth::check()): ?>
      <li><a href="/admin"><i class="fa fa-cog"></i> Yönetim</a></li>
      <?php endif; ?>
    </ul>
    <div class="mobil-drawer-footer-linkler">
      <a href="<?= e(ap_url('kunye')) ?>"><i class="fa fa-id-card"></i> Künye</a>
      <a href="<?= e(ap_url('iletisim')) ?>"><i class="fa fa-envelope"></i> İletişim</a>
    </div>
  </div>
</div>
<div class="overlay-perde" id="overlayPerde"></div>

<?php /* MOBİL ALT NAV */ ?>
<nav class="mobil-alt-nav" aria-label="Mobil navigasyon">
  <a href="<?= $siteUrl ?>" class="mobil-nav-item aktif"><i class="fa fa-home"></i><span>Ana Sayfa</span></a>
  <button class="mobil-nav-item" onclick="document.getElementById('aramaOverlay').classList.add('aktif')"><i class="fa fa-search"></i><span>Ara</span></button>
  <?php if (!empty($navItems[0])): ?>
  <a href="<?= e($navItems[0]['url'] ?? '#') ?>" class="mobil-nav-item"><i class="fa fa-newspaper"></i><span><?= e(mb_substr($navItems[0]['label'],0,6)) ?></span></a>
  <?php endif; ?>
  <?php if (!empty($navItems[1])): ?>
  <a href="<?= e($navItems[1]['url'] ?? '#') ?>" class="mobil-nav-item"><i class="fa fa-chart-line"></i><span><?= e(mb_substr($navItems[1]['label'],0,6)) ?></span></a>
  <?php endif; ?>
  <button class="mobil-nav-item" id="mobilMenuBtn"><i class="fa fa-bars"></i><span>Menü</span></button>
</nav>
