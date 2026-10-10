<?php

declare(strict_types=1);

use Yenisafak\Html;

/** @var Yenisafak\Site $site */
/** @var Yenisafak\Ads $ads */
/** @var string $title */
/** @var string $description */
/** @var string $body */
/** @var string $canonical */
/** @var string $imageAbs */
/** @var array<string, mixed>|null $jsonLd */
/** @var Yenisafak\Seo\TurkataSeo|null $seo */
/** @var array<string, mixed> $seoCtx */
$logoSrc = $site->logo;
$logoLocal = $logoSrc !== '' && str_starts_with($logoSrc, '/');
$brandLogo = $logoSrc === '/brand/turkata/logo-h128.png';
$brandSrc = static fn (string $f): string => $site->path(Html::versioned('/brand/turkata/' . $f));
$gdmBase = preg_match('#^/gundemi/logos/([a-z0-9-]+)\.png$#', $logoSrc, $gdmM) === 1 && is_file(dirname(__DIR__) . '/public/gundemi/marka/' . $gdmM[1] . '-icon-512.png') ? '/gundemi/logos/' . $gdmM[1] : ''; $gdmSrc = static fn (string $suffix): string => $site->path(Html::versioned(str_replace('/gundemi/logos/', '/gundemi/marka/', $gdmBase) . $suffix)); /* /gundemi/logos/* is a Worker route (old assets): serve from origin-only /gundemi/marka/ */ /* gundemi logos 2026-10-08: header/footer/favicon from the logo family (light, -dark, -icon-*) */
$headerAd = $ads->render('header');
$leaderboard = $ads->render('leaderboard');
$current = rtrim((string) parse_url($canonical, PHP_URL_PATH), '/');
/** @var string $current */
$headerMenuItems = \Yenisafak\Menu::items($site, 'hmCorporateMenuItems');
$headerMenuRoots = \Yenisafak\Menu::roots($site, 'hmCorporateMenuItems');
$headerMenuRoots = array_values(array_filter($headerMenuRoots, static fn ($r): bool => !in_array(rtrim((string) (parse_url((string) ($r['href'] ?? ''), PHP_URL_PATH) ?: ''), '/'), ['/iller', '/81-il'], true))); /* menu-tanitim 2026-10-09: 81 İl page only in the footer (alt menü), never in the top/mobile main menu */
$headerMenuOn = $headerMenuRoots !== [];
// Category tree (general sites): main categories always in the menu, with dropdowns (CategoryTree).
$treeMode = \Yenisafak\CategoryTree::mode($site);
$treeOn = $treeMode !== 'off';
if ($treeMode === 'full' && $headerMenuOn) {
    $presentTree = [];
    $homeIdx = -1;
    foreach ($headerMenuRoots as $ri => $root) {
        $rh = \Yenisafak\Menu::href($site, $root['href']);
        $rp = rtrim((string) (parse_url($rh, PHP_URL_PATH) ?: ''), '/');
        if ($rp === '' || $rp === rtrim($site->path('/'), '/')) {
            $homeIdx = $homeIdx < 0 ? $ri : $homeIdx;
        }
        if (preg_match('#/kategori/([a-z0-9-]+)$#', $rp, $rm) === 1) {
            $presentTree[$rm[1]] = true;
        }
    }
    $missing = [];
    foreach (\Yenisafak\CategoryTree::mains($site) as $mainSlug) {
        if (!isset($presentTree[$mainSlug])) {
            $missing[] = ['id' => 'ys-tree-' . $mainSlug, 'label' => \Yenisafak\CategoryTree::name($mainSlug, $site), 'href' => '/kategori/' . $mainSlug, 'parentId' => '', 'enabled' => true, 'icon' => ''];
        }
    }
    if ($missing !== []) {
        array_splice($headerMenuRoots, $homeIdx + 1, 0, $missing);
    }
    // Özel Haber (2026-10-08): always in the header menu of general sites, even when a panel menu save lacks it
    // (render-time merge, the saved menu is not touched). layout_json hmOzelHaberMenu=false opts out.
    $ozelSeen = false;
    foreach ($headerMenuItems as $mi) {
        if (preg_match('#/kategori/ozel-haber/?$#', strtolower((string) ($mi['href'] ?? ''))) === 1) {
            $ozelSeen = true;
            break;
        }
    }
    if (!$ozelSeen && ($site->layout['hmOzelHaberMenu'] ?? true) !== false && !\Yenisafak\CategoryTree::isOff('ozel-haber')) {
        $ozelAt = count($headerMenuRoots);
        foreach ($headerMenuRoots as $ri => $root) {
            if (mb_strtolower(trim((string) $root['label']), 'UTF-8') === 'daha') {
                $ozelAt = $ri;
                break;
            }
        }
        array_splice($headerMenuRoots, $ozelAt, 0, [['id' => 'ys-ozel-haber', 'label' => 'Özel Haber', 'href' => '/kategori/ozel-haber', 'parentId' => '', 'enabled' => true, 'icon' => '']]);
    }
}
/** Dropdown panel (desktop) for a tree node: children, and their children as sub-links. */
$treePanel = static function (string $slug) use ($site): string {
    $h = '<div class="ys-dd-panel" role="menu">';
    foreach (\Yenisafak\CategoryTree::children($slug) as $kid) {
        $h .= '<div class="ys-dd-col"><a class="ys-dd-h" role="menuitem" href="' . Html::e($site->path('/kategori/' . $kid)) . '">' . Html::e(\Yenisafak\CategoryTree::name($kid, $site)) . '</a>';
        $grand = \Yenisafak\CategoryTree::children($kid);
        if ($grand !== []) {
            $h .= '<div class="ys-dd-sub">';
            foreach ($grand as $g) {
                $h .= '<a role="menuitem" href="' . Html::e($site->path('/kategori/' . $g)) . '">' . Html::e(\Yenisafak\CategoryTree::name($g, $site)) . '</a>';
            }
            $h .= '</div>';
        }
        $h .= '</div>';
    }
    return $h . '</div>';
};
/** Drawer (mobile) list for a tree node. */
$treeDrawer = static function (string $slug, string $label, string $href) use ($site): string {
    $h = '<details class="ys-tdraw"><summary><a href="' . Html::e($href) . '">' . Html::e($label) . '</a></summary>';
    foreach (\Yenisafak\CategoryTree::children($slug) as $kid) {
        $grand = \Yenisafak\CategoryTree::children($kid);
        $kh = Html::e($site->path('/kategori/' . $kid));
        $kn = Html::e(\Yenisafak\CategoryTree::name($kid, $site));
        if ($grand === []) {
            $h .= '<a class="ys-tdraw-l1" href="' . $kh . '">' . $kn . '</a>';
            continue;
        }
        $h .= '<details class="ys-tdraw ys-tdraw-l1"><summary><a href="' . $kh . '">' . $kn . '</a></summary><div class="ys-tdraw-g">';
        foreach ($grand as $g) {
            $h .= '<a href="' . Html::e($site->path('/kategori/' . $g)) . '">' . Html::e(\Yenisafak\CategoryTree::name($g, $site)) . '</a>';
        }
        $h .= '</div></details>';
    }
    return $h . '</details>';
};
$footerMenuItems = \Yenisafak\Menu::items($site, 'hmNewsFooterMenuItems');
$footerMenuOn = $footerMenuItems !== [];
$stripMenuItems = \Yenisafak\Menu::items($site, 'hmNewsStripMenuItems');
$stripMenuOn = \Yenisafak\Menu::stripEnabled($site);
$navBarBg = is_string($site->layout['hmNavBarBackground'] ?? null) ? trim($site->layout['hmNavBarBackground']) : '';
$navBarBg = preg_match('/^#[0-9a-fA-F]{6}$/', $navBarBg) === 1 ? $navBarBg : '';
$logoBarBg = is_string($site->layout['hmLogoBarBackground'] ?? null) ? trim($site->layout['hmLogoBarBackground']) : '';
$logoBarBg = preg_match('/^#[0-9a-fA-F]{6}$/', $logoBarBg) === 1 ? $logoBarBg : '';
/** @var list<array<string, mixed>> $ticker */
/** @var list<array<string, mixed>>|null $markets */
/** @var array<string, mixed>|null $stripWeather */
/** @var string $liveUrl */
/** @var string $preset */
?>
<!DOCTYPE html>
<html lang="<?= Html::e($site->lang()) ?>" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="ys-base" content="<?= Html::e(rtrim($site->path('/'), '/')) ?>">
  <?php $ysFb = ($logoSrc !== '' && !str_starts_with($logoSrc, 'data:')) ? ($logoLocal ? $site->path($logoSrc) : $logoSrc) : ''; /* img-fallback 2026-10-08: broken card images show the site logo / placeholder instead of hiding the card */ ?><script>var YS_FB=<?= json_encode($ysFb, JSON_UNESCAPED_SLASHES) ?>,YS_PH="data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%23e9edf2'/%3E%3Cpath d='M6.2 3.2h3.6l.5.7h1v3h-6.6v-3h1z' fill='%23b9c2cd'/%3E%3Ccircle cx='8' cy='5.3' r='1' fill='%23e9edf2'/%3E%3C/svg%3E";function ysImgFail(i){var c=i.closest("[data-card]");if(c&&c.classList.contains("ys-slide")){c.classList.add("is-broken");var s=c.parentNode,k=Array.prototype.indexOf.call(s.querySelectorAll(".ys-slide"),c),r=c.closest("[data-ys-slider]"),p=r&&r.querySelector('.ys-pager [data-go="'+k+'"]');if(p)p.hidden=true;if(c.classList.contains("is-on")&&r&&r.ysNext)r.ysNext();return;}if(c&&location.pathname==="/"){c.style.display="none";c.setAttribute("data-noimg-home","1");return;}/* noimg-home 2026-10-09: home never shows a logo/placeholder card */var n=+(i.getAttribute("data-fb")||0);i.setAttribute("data-fb",n+1);i.classList.add("is-noimg");if(c)c.classList.add("is-noimg-card");i.removeAttribute("srcset");var pp=i.parentNode;if(pp&&pp.tagName==="PICTURE"){var ss=pp.querySelectorAll("source");for(var j=0;j<ss.length;j++)ss[j].parentNode.removeChild(ss[j]);}if(n===0&&YS_FB){i.src=YS_FB;}else{i.onerror=null;i.src=YS_PH;}}</script>
  <style>img.is-noimg{object-fit:contain!important;background:#eef1f5;padding:6%;box-sizing:border-box}</style>
  <script>(function(){var t="light";try{t=localStorage.getItem("ys-theme")==="dark"?"dark":"light";}catch(e){}document.documentElement.setAttribute("data-theme",t);})();</script>
  <meta name="color-scheme" content="light dark">
  <title><?= Html::e($title) ?></title>
  <meta name="description" content="<?= Html::e($description) ?>">
  <link rel="canonical" href="<?= Html::e($canonical) ?>">
  <link rel="alternate" type="application/rss+xml" title="<?= Html::e($site->name) ?>" href="<?= Html::e($site->canonical('/rss.xml')) ?>">
  <meta property="og:type" content="<?= str_contains($canonical, '/haber/') ? 'article' : 'website' ?>">
  <?php $ogX = isset($ogX) && is_array($ogX) ? $ogX : []; $ogTitle = (string) (($ogX['title'] ?? '') !== '' ? $ogX['title'] : $title); /* og-preview 2026-10-08: columns "<Başlık> | <Yazar Adı>" */ ?>
  <meta property="og:title" content="<?= Html::e($ogTitle) ?>">
  <meta property="og:description" content="<?= Html::e($description) ?>">
  <meta property="og:url" content="<?= Html::e($canonical) ?>">
  <meta property="og:locale" content="<?= $site->lang() === 'en' ? 'en_US' : 'tr_TR' ?>">
  <meta property="og:site_name" content="<?= Html::e($site->name) ?>">
  <?php if ($imageAbs !== ''): /* share image: OgImage (1200x630 JPEG < 300 KB) */ ?>
    <?php $ogAlt = (string) (($og['alt'] ?? '') !== '' ? $og['alt'] : $title); ?>
    <meta property="og:image" content="<?= Html::e($imageAbs) ?>">
    <?php if (str_starts_with($imageAbs, 'https://')): ?><meta property="og:image:secure_url" content="<?= Html::e($imageAbs) ?>"><?php endif; ?>
    <?php if (!empty($og['type'])): ?><meta property="og:image:type" content="<?= Html::e((string) $og['type']) ?>"><?php endif; ?>
    <?php if (!empty($og['w']) && !empty($og['h'])): ?>
    <meta property="og:image:width" content="<?= (int) $og['w'] ?>">
    <meta property="og:image:height" content="<?= (int) $og['h'] ?>">
    <?php endif; ?>
    <meta property="og:image:alt" content="<?= Html::e($ogAlt) ?>">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="<?= Html::e($imageAbs) ?>">
    <meta name="twitter:image:alt" content="<?= Html::e($ogAlt) ?>">
  <?php else: ?>
    <meta name="twitter:card" content="summary">
  <?php endif; ?>
  <meta name="twitter:title" content="<?= Html::e($ogTitle) ?>">
  <?php if (($ogX['author'] ?? '') !== ''): ?><meta property="article:author" content="<?= Html::e((string) $ogX['author']) ?>"><meta name="author" content="<?= Html::e((string) $ogX['author']) ?>"><meta name="twitter:label1" content="Yazar"><meta name="twitter:data1" content="<?= Html::e((string) $ogX['author']) ?>"><?php endif; ?>
  <?php if (($ogX['published'] ?? '') !== '' && ($seo ?? null) === null): ?><meta property="article:published_time" content="<?= Html::e((string) $ogX['published']) ?>"><?php endif; ?>
  <meta name="twitter:description" content="<?= Html::e($description) ?>">
  <?php if ((int) ($status ?? 200) === 200 && class_exists(\Yenisafak\SeoGeo::class)): /* seo-geo 2026-10-09: verification, robots, hreflang, geo meta, org graph, llms link */ ?><?= \Yenisafak\SeoGeo::head($site, $canonical, ($seo ?? null) !== null, $jsonLd ?? null) ?><?php endif; ?>
  <?php if (($seo ?? null) !== null): /* turkatahaber GEO/SEO module (ai-editor/seo), site 230 only */ ?>
    <?php $art = $seoCtx['article'] ?? null; if (is_array($art)): ?>
      <?php if (($art['published'] ?? '') !== ''): ?><meta property="article:published_time" content="<?= Html::e((string) $art['published']) ?>"><?php endif; ?>
      <?php if (($art['modified'] ?? '') !== ''): ?><meta property="article:modified_time" content="<?= Html::e((string) $art['modified']) ?>"><?php endif; ?>
      <?php if (($art['section'] ?? '') !== ''): ?><meta property="article:section" content="<?= Html::e((string) $art['section']) ?>"><?php endif; ?>
    <?php endif; ?>
  <?= $seo->headTags($canonical, (string) ($seoCtx['lcp'] ?? '')) ?>
  <?= $seo->jsonLdScript($seo->siteGraph()) ?>
    <?php if (!empty($seoCtx['breadcrumbs'])): ?>
  <?= $seo->jsonLdScript($seo->breadcrumbs($seoCtx['breadcrumbs'])) ?>
    <?php endif; ?>
  <?php endif; ?>
  <?php if ($site->isTurkata()): ?>
    <link rel="icon" href="<?= Html::e($brandSrc('favicon.ico')) ?>" sizes="any">
    <link rel="icon" href="<?= Html::e($brandSrc('favicon-32.png')) ?>" type="image/png" sizes="32x32">
    <link rel="apple-touch-icon" href="<?= Html::e($brandSrc('apple-touch-icon.png')) ?>">
    <meta name="theme-color" content="#0b2a5b">
  <?php else: ?>
    <?php $favUrl = is_string($site->layout['faviconUrl'] ?? null) ? trim($site->layout['faviconUrl']) : ''; /* per-site favicon (layout_json.faviconUrl): /public path or https URL */ ?>
    <?php if ($gdmBase !== '' && ($favUrl === '' || $favUrl === $logoSrc)): /* gundemi logos 2026-10-08 */ ?>
    <link rel="icon" href="<?= Html::e($gdmSrc('-favicon.ico')) ?>" sizes="any">
    <link rel="icon" href="<?= Html::e($gdmSrc('-icon.svg')) ?>" type="image/svg+xml">
    <link rel="icon" href="<?= Html::e($gdmSrc('-icon-32.png')) ?>" type="image/png" sizes="32x32">
    <link rel="icon" href="<?= Html::e($gdmSrc('-icon-192.png')) ?>" type="image/png" sizes="192x192">
    <link rel="apple-touch-icon" href="<?= Html::e($gdmSrc('-apple-touch-icon.png')) ?>">
    <?php elseif ($favUrl !== '' && (str_starts_with($favUrl, '/') || str_starts_with($favUrl, 'https://'))): ?>
      <?php $favHref = str_starts_with($favUrl, '/') ? $site->path($favUrl) : $favUrl; ?>
    <link rel="icon" href="<?= Html::e($favHref) ?>" type="image/png" sizes="512x512">
    <link rel="apple-touch-icon" href="<?= Html::e($favHref) ?>">
    <?php else: ?>
    <link rel="icon" href="<?= Html::e($site->path('/favicon.svg')) ?>" type="image/svg+xml">
    <?php endif; ?>
  <?php endif; ?>
  <link rel="stylesheet" href="<?= Html::e($site->path('/assets/theme.css')) ?>?v=<?= Html::e(Html::assetVersion('theme.css')) ?>">
<?php $portalSkin = (string) ($site->layout['hmPortalTheme'] ?? ''); /* tema 2026-10-10: panel "Tema" seçimi (okul|muhtar|sendika); yeni/portal = değişiklik yok */ if (!in_array($portalSkin, ['okul', 'muhtar', 'sendika'], true) || !is_file(dirname(__DIR__) . '/public/brand/sector/news-' . $portalSkin . '.css')) { $portalSkin = ''; } ?>
<?php if ($portalSkin !== ''): ?>  <link rel="stylesheet" href="<?= Html::e(Html::versioned('/brand/sector/news-' . $portalSkin . '.css')) ?>">
<?php endif; ?>
  <?php if ($jsonLd !== null): ?>
    <script type="application/ld+json"><?= Html::json($jsonLd) ?></script>
  <?php endif; ?>
  <?php $gaId = (string) ($site->layout['hmNewsGaMeasurementId'] ?? (getenv('GA_MEASUREMENT_ID') ?: '')); ?>
  <?php if (preg_match('/^G-[A-Z0-9]{4,16}$/', $gaId) === 1): ?>
  <script async src="https://www.googletagmanager.com/gtag/js?id=<?= Html::e($gaId) ?>"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","<?= Html::e($gaId) ?>");</script>
  <?php endif; ?>
  <noscript><style>.ys-next-spin,.ys-next-label{display:none}</style></noscript>
</head>
<?php $ysSecondary = $site->secondaryColor(); /* editor hmSecondaryColor */ ?>
<body class="ys ys-preset-<?= Html::e($preset) ?><?= $portalSkin !== '' ? ' ys-skin-' . $portalSkin : '' ?>" style="--ys-accent: <?= Html::e($site->accent) ?><?= $ysSecondary !== '' ? '; --ys-secondary: ' . Html::e($ysSecondary) : '' ?><?= $navBarBg !== '' ? '; --ys-nav: ' . Html::e($navBarBg) : '' ?><?= $logoBarBg !== '' ? '; --ys-head: ' . Html::e($logoBarBg) : '' ?><?= Html::e(\Yenisafak\Theme::bodyVars($site)) /* site colors 2026-10-08 [body-vars] */ ?>">
  <a class="ys-skip" href="#icerik">İçeriğe geç</a>
  <?php
    $tickerHtml = '';
    if ($ticker !== []) {
        ob_start(); ?>
        <div class="ys-sd" aria-label="Son dakika">
          <span class="ys-sd-label">SON DAKİKA</span>
          <div class="ys-sd-track" data-ys-ticker>
            <?php foreach ($ticker as $i => $item): ?>
              <a href="<?= Html::e($site->path('/haber/' . rawurlencode((string) $item['slug']))) ?>"<?= $i === 0 ? ' class="is-on"' : '' ?>><?= Html::e((string) $item['title']) ?></a>
            <?php endforeach; ?>
          </div>
        </div>
        <?php $tickerHtml = (string) ob_get_clean();
    }
    $social = [];
    foreach (['facebook' => 'Facebook', 'x' => 'X', 'twitter' => 'X', 'instagram' => 'Instagram', 'youtube' => 'YouTube'] as $key => $label) {
        $url = (string) ($site->contact[$key] ?? ($site->contact['social'][$key] ?? ''));
        if (preg_match('#^https://#', $url) === 1 && !isset($social[$label])) {
            $social[$label] = $url;
        }
    }
  ?>
  <div class="ys-chrome">
  <header class="ys-header">
    <div class="ys-bar<?= $headerAd !== '' ? ' has-ad' : ' has-ticker' ?>">
      <?php $logoSub = is_string($site->layout['logo_subtitle'] ?? null) ? trim($site->layout['logo_subtitle']) : ''; /* per-site line under the header logo (layout_json.logo_subtitle) */ ?>
      <?php $logoSubStyle = $logoSub !== '' && is_string($site->layout['logo_subtitle_style'] ?? null) && preg_match('/^(accent|on-dark)$/', $site->layout['logo_subtitle_style']) === 1 ? ' sub-' . $site->layout['logo_subtitle_style'] : ''; /* accent first letter | logo drawn for a dark header */ ?>
      <a class="ys-logo<?= $logoSub !== '' ? ' has-sub' : '' ?><?= $logoSubStyle ?>" href="<?= Html::e($site->path('/')) ?>" aria-label="<?= Html::e($site->name) ?> ana sayfa">
        <?php if ($brandLogo): ?>
          <picture>
            <source type="image/webp" srcset="<?= Html::e($brandSrc('logo-h64.webp')) ?> 1x, <?= Html::e($brandSrc('logo-h128.webp')) ?> 2x, <?= Html::e($brandSrc('logo-h192.webp')) ?> 3x">
            <img class="ys-logo-img" src="<?= Html::e($brandSrc('logo-h128.png')) ?>" srcset="<?= Html::e($brandSrc('logo-h64.png')) ?> 1x, <?= Html::e($brandSrc('logo-h128.png')) ?> 2x, <?= Html::e($brandSrc('logo-h192.png')) ?> 3x" alt="<?= Html::e($site->name) ?>" width="233" height="64" fetchpriority="high">
          </picture>
        <?php elseif ($gdmBase !== ''): /* gundemi logos 2026-10-08 */ ?>
          <img src="<?= Html::e($gdmSrc('.png')) ?>" alt="<?= Html::e($site->name) ?>" height="64" fetchpriority="high">
        <?php elseif ($logoSrc !== ''): ?>
          <img src="<?= Html::e($logoLocal ? $site->path($logoSrc) : $logoSrc) ?>" alt="<?= Html::e($site->name) ?>" height="64">
        <?php else: ?>
          <strong><?= Html::e($site->name) ?></strong>
        <?php endif; ?>
        <?php if ($logoSub !== ''): ?><span class="ys-logo-sub"><?= Html::e($logoSub) ?></span><?php endif; ?>
      </a>
      <div class="ys-bar-mid"><?= $headerAd !== '' ? $headerAd : $tickerHtml ?></div>
      <div class="ys-actions">
        <?php if ($liveUrl !== ''): ?>
          <a class="ys-live" href="<?= Html::e($liveUrl) ?>"><span aria-hidden="true"></span>Canlı yayın</a>
        <?php endif; ?>
        <button class="ys-theme-toggle ys-theme-m" type="button" data-ys-theme aria-label="Koyu temaya geç" title="Açık / koyu tema">
        <svg class="ys-ico-moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M20.7 14.3A8.5 8.5 0 0 1 9.7 3.3a8.5 8.5 0 1 0 11 11z"/></svg>
        <svg class="ys-ico-sun" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></g></svg>
      </button>
        <details class="ys-pop ys-search">
          <summary aria-label="Arama"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></summary>
          <form class="ys-pop-body" action="<?= Html::e($site->path('/arama')) ?>" method="get" role="search">
            <input type="search" name="q" placeholder="Haberlerde ara" aria-label="Arama" minlength="2" required>
            <button type="submit">Ara</button>
          </form>
        </details>
        <details class="ys-pop ys-menu">
          <summary aria-label="Menü"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></summary>
          <div class="ys-pop-body ys-drawer ys-mdr" role="dialog" aria-modal="true" aria-label="Menü"><?php /* mdr-menu 2026-10-09 (user, dmchaber ref): MENÜ drawer. Rollback: backups/mdr-menu-20261009/layout.php.pre */
            $mdrSoc = $site->socialLinks();
            foreach (['whatsapp' => 'WhatsApp', 'tiktok' => 'TikTok', 'threads' => 'Threads'] as $mk => $ml) {
                $mu = trim((string) ($site->contact[$mk] ?? ($site->contact['social'][$mk] ?? ($site->layout['hmFooterSocial'][$mk . 'Url'] ?? ''))));
                if ($mk === 'whatsapp' && $mu !== '' && preg_match('/^\+?[0-9 ()-]{10,}$/', $mu) === 1) { $mu = 'https://wa.me/' . preg_replace('/\D/', '', $mu); }
                if (preg_match('#^https://#i', $mu) === 1) { $mdrSoc[$ml] = $mu; }
            }
            $mdrSocC = ['Facebook' => '#1877f2', 'X' => '#111', 'Instagram' => '#e1306c', 'YouTube' => '#ff0000', 'WhatsApp' => '#25d366', 'TikTok' => '#010101', 'Threads' => '#000'];
            $mdrSocI = ['Facebook' => 'M14 8h3V4h-3c-2.8 0-4 1.8-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6z', 'X' => 'M4 4l7 9-7 7h2l6-6 4.5 6H20l-7.4-9.8L19 4h-2l-5.3 5.4L7.6 4z', 'Instagram' => 'M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zm4 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5.2-1.8a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z', 'YouTube' => 'M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3z', 'WhatsApp' => 'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.6-.1 1.1z', 'TikTok' => 'M16.5 3c.4 2.2 1.8 3.6 4 3.8v3.1a7.4 7.4 0 0 1-4-1.3V15a6 6 0 1 1-6-6h.6v3.2h-.6a2.8 2.8 0 1 0 2.8 2.8V3z', 'Threads' => 'M12 2a10 10 0 1 0 6 18l-1.2-1.6A8 8 0 1 1 20 12v1a2 2 0 0 1-4 0V8h-2v.8A4.5 4.5 0 1 0 15 15.2 4 4 0 0 0 22 13v-1A10 10 0 0 0 12 2zm0 12.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z'];
            $mdrCatSlugs = array_column($site->categories, 'slug');
            $mdrIco = static fn (string $d): string => '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="' . $d . '"/></svg>';
            $mdrRow = static function (string $href, string $label, string $d) use ($mdrIco, $current): string {
                return '<a class="mdr-row" href="' . Html::e($href) . '"' . (\Yenisafak\Menu::isCurrent($current, $href) ? ' aria-current="page"' : '') . '><span class="mdr-ic">' . $mdrIco($d) . '</span><b>' . Html::e($label) . '</b></a>';
            };
            $mdrChev = '<svg class="mdr-chev" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            $I = ['home' => 'M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3z', 'cat' => 'M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z', 'foto' => 'M4 6h3l2-2h6l2 2h3v14H4zm8 3.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'video' => 'M3 5h13v14H3zm14 4.5 4-2.5v10l-4-2.5z', 'yazar' => 'M15.5 3.5l5 5L9 20H4v-5zM13.5 5.5l5 5', 'rop' => 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0h-2a4 4 0 0 1-8 0zm5 7h2v4h-2z', 'kunye' => 'M5 3h14v18H5zm3 4v2h8V7zm0 4v2h8v-2zm0 4v2h5v-2z', 'ilet' => 'M3 5h18v14H3zm2 2v.5l7 4.5 7-4.5V7l-7 4.5z', 'serv' => 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM10.5 2h3l.5 2.6 2.1 1 2.3-1.4 2.1 2.1-1.4 2.3 1 2.1 2.6.5v3l-2.6.5-1 2.1 1.4 2.3-2.1 2.1-2.3-1.4-2.1 1-.5 2.6h-3l-.5-2.6-2.1-1-2.3 1.4-2.1-2.1 1.4-2.3-1-2.1L2 13.5v-3l2.6-.5 1-2.1-1.4-2.3 2.1-2.1 2.3 1.4 2.1-1z', 'tan' => 'M12 2 2 7l10 5 10-5zm-8 8v6l8 4 8-4v-6l-8 4z'];
          ?>
            <div class="mdr-head"><span class="mdr-sp" aria-hidden="true"></span><h3 class="mdr-title">MENÜ</h3><button type="button" class="mdr-x" aria-label="Menüyü kapat" onclick="this.closest('details').open=false"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></div>
            <?php if ($mdrSoc !== []): ?><div class="mdr-soc"><?php foreach ($mdrSoc as $ml => $mu): ?><a href="<?= Html::e($mu) ?>" target="_blank" rel="noopener" aria-label="<?= Html::e($site->name . ' ' . $ml) ?>" style="--c:<?= Html::e($mdrSocC[$ml] ?? '#333') ?>"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="<?= $mdrSocI[$ml] ?? '' ?>"/></svg></a><?php endforeach; ?></div><?php endif; ?>
            <nav class="mdr-list" aria-label="Mobil menü">
              <?= $mdrRow($site->path('/'), 'Ana Sayfa', $I['home']) ?>
              <details class="mdr-exp"><summary class="mdr-row"><span class="mdr-ic"><?= $mdrIco($I['cat']) ?></span><b>Kategoriler</b><?= $mdrChev ?></summary><div class="mdr-sub">
              <?php if ($headerMenuOn):
                foreach ($headerMenuRoots as $root):
                  $rootHref = \Yenisafak\Menu::href($site, $root['href']);
                  if (rtrim((string) (parse_url($rootHref, PHP_URL_PATH) ?: '/'), '/') === '') { continue; }
                  $kids = \Yenisafak\Menu::childrenOf($headerMenuItems, $root['id']);
                  $ddSlug = $treeOn ? \Yenisafak\CategoryTree::dropdownSlug($site, $rootHref) : '';
                  if ($ddSlug !== '') { echo $treeDrawer($ddSlug, (string) $root['label'], $rootHref); continue; }
                ?><a href="<?= Html::e($rootHref) ?>"<?= \Yenisafak\Menu::isCurrent($current, $rootHref) ? ' aria-current="page"' : '' ?>><?= Html::e($root['label']) ?></a><?php
                  foreach ($kids as $kid): $kidHref = \Yenisafak\Menu::href($site, $kid['href']); ?><a class="mdr-l2" href="<?= Html::e($kidHref) ?>"><?= Html::e($kid['label']) ?></a><?php endforeach;
                endforeach;
              else:
                if ($treeOn): foreach (\Yenisafak\CategoryTree::mains($site) as $mainSlug) { echo $treeDrawer($mainSlug, \Yenisafak\CategoryTree::name($mainSlug, $site), $site->path('/kategori/' . $mainSlug)); } endif;
                foreach ($site->categories as $cat): if ($treeOn && \Yenisafak\CategoryTree::has($site, $cat['slug'])) { continue; } ?><a href="<?= Html::e($site->path('/kategori/' . $cat['slug'])) ?>"><?= Html::e($cat['name']) ?></a><?php endforeach;
              endif; ?>
              </div></details>
              <?php foreach (['foto-galeri' => 'Foto Galeri', 'galeri' => 'Foto Galeri'] as $gs => $gl): if (in_array($gs, $mdrCatSlugs, true)) { echo $mdrRow($site->path('/kategori/' . $gs), $gl, $I['foto']); break; } endforeach; ?>
              <?= $mdrRow($site->path('/videolar'), 'Video', $I['video']) ?>
              <?= $mdrRow($site->path('/yazarlar'), 'Yazarlar', $I['yazar']) ?>
              <?php foreach (['roportaj', 'roportajlar'] as $rs): if (in_array($rs, $mdrCatSlugs, true)) { echo $mdrRow($site->path('/kategori/' . $rs), 'Röportaj', $I['rop']); break; } endforeach; ?>
              <?php if (\Yenisafak\Tanitim::mainNav($site)) { echo $mdrRow($site->path('/tanitim'), 'Tanıtım', $I['tan']); } ?>
              <?= $mdrRow($site->path('/kunye'), 'Künye', $I['kunye']) ?>
              <?= $mdrRow($site->path('/iletisim'), 'İletişim', $I['ilet']) ?>
              <details class="mdr-exp"><summary class="mdr-row"><span class="mdr-ic"><?= $mdrIco($I['serv']) ?></span><b>Servisler</b><?= $mdrChev ?></summary><div class="mdr-sub">
                <a href="<?= Html::e($site->path('/hava-durumu')) ?>">Hava Durumu</a>
                <a href="<?= Html::e($site->path('/namaz-vakitleri')) ?>">Namaz Vakitleri</a>
                <a href="<?= Html::e($site->path('/nobetci-eczane')) ?>">Nöbetçi Eczane</a>
                <?php if (\Yenisafak\Widgets::on($site, 'standings')): ?><a href="<?= Html::e($site->path('/puan-durumu')) ?>">Puan Durumu</a><?php endif; ?>
                <?php if (\Yenisafak\Widgets::on($site, 'horoscope')): ?><a href="<?= Html::e($site->path('/burclar')) ?>">Burçlar</a><?php endif; ?>
              </div></details>
            </nav>
            <style>
.ys-menu .ys-mdr{position:fixed;top:0;bottom:0;left:0;right:auto;z-index:1001;width:min(90vw,400px);max-width:none;max-height:none;height:100dvh;overflow-y:auto;margin:0;padding:0 0 calc(24px + env(safe-area-inset-bottom,0));background:#f7f8fb;color:#1b2a4a;border:0;border-radius:0 14px 14px 0;box-shadow:8px 0 40px rgba(10,20,40,.28);animation:mdrIn .28s cubic-bezier(.2,.8,.2,1);display:block;grid-template-columns:none;columns:auto}
@keyframes mdrIn{from{transform:translateX(-100%)}to{transform:none}}
@media (prefers-reduced-motion:reduce){.ys-menu .ys-mdr{animation:none}}
.ys-menu[open]>summary::before{content:"";position:fixed;inset:0;z-index:1000;background:rgba(12,18,32,.5);cursor:default}
.ys-mdr .mdr-head{position:sticky;top:0;z-index:2;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;padding:12px 10px;background:#fff;border-bottom:3px solid var(--ys-accent)}
.ys-mdr .mdr-title{margin:0;text-align:center;font-size:1.15rem;font-weight:900;letter-spacing:.14em;color:#1b2a4a;border:0;padding:0}
.ys-mdr .mdr-x{width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:50%;background:#eef1f6;color:#1b2a4a;cursor:pointer}
.ys-mdr .mdr-x:hover,.ys-mdr .mdr-x:focus-visible{background:var(--ys-accent);color:#fff}
.ys-mdr .mdr-soc{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;padding:16px 14px;background:#fff;border-bottom:1px solid #e3e7ee}
.ys-mdr .mdr-soc a{width:40px;height:40px;display:grid;place-items:center;border:2px solid var(--c);border-radius:50%;color:var(--c);padding:0;transition:background .15s,color .15s}
.ys-mdr .mdr-soc a:hover,.ys-mdr .mdr-soc a:focus-visible{background:var(--c);color:#fff}
.ys-mdr .mdr-list{display:block;padding:6px 0}
.ys-mdr .mdr-row{display:flex;align-items:center;gap:14px;padding:14px 18px;color:#1b2a4a;text-decoration:none;border-bottom:1px solid #e3e7ee;font-size:1rem;cursor:pointer;list-style:none;background:none}
.ys-mdr summary.mdr-row::-webkit-details-marker{display:none}
.ys-mdr .mdr-row b{flex:1;font-weight:800}
.ys-mdr .mdr-row[aria-current="page"],.ys-mdr .mdr-row:hover,.ys-mdr .mdr-row:focus-visible{background:#fff;box-shadow:inset 4px 0 0 var(--ys-accent)}
.ys-mdr .mdr-ic{width:36px;height:36px;flex:none;display:grid;place-items:center;border-radius:10px;background:#1b2a4a;color:#fff}
.ys-mdr .mdr-chev{transition:transform .2s;color:#7a8597}
.ys-mdr .mdr-exp[open]>summary .mdr-chev{transform:rotate(180deg);color:var(--ys-accent)}
.ys-mdr .mdr-sub{display:block;padding:4px 0 8px 68px;background:#fff;border-bottom:1px solid #e3e7ee}
.ys-mdr .mdr-sub a,.ys-mdr .mdr-sub summary{display:block;padding:9px 14px 9px 0;color:#2b3a58;font-weight:600;text-decoration:none;border:0}
.ys-mdr .mdr-sub a:hover,.ys-mdr .mdr-sub a:focus-visible{color:var(--ys-accent)}
.ys-mdr .mdr-sub .mdr-l2{padding-left:14px;font-weight:500}
.ys-mdr .ys-tdraw summary a{padding:0}
html.ys-dark .ys-menu .ys-mdr,[data-theme=dark] .ys-menu .ys-mdr{background:#121826;color:#e8ecf3}
html.ys-dark .ys-mdr .mdr-head,html.ys-dark .ys-mdr .mdr-soc,html.ys-dark .ys-mdr .mdr-sub{background:#0d1320}
html.ys-dark .ys-mdr .mdr-row,html.ys-dark .ys-mdr .mdr-title,html.ys-dark .ys-mdr .mdr-sub a{color:#e8ecf3}
            </style>
            <script>(function(){var d=document.currentScript.closest('details');if(!d||d.ysMdr)return;d.ysMdr=1;var s=d.querySelector('summary'),p=d.querySelector('.ys-mdr');function f(){return Array.prototype.filter.call(p.querySelectorAll('a[href],button,summary'),function(e){return e.offsetParent!==null})}
d.addEventListener('toggle',function(){document.documentElement.style.overflow=d.open?'hidden':'';s.setAttribute('aria-expanded',d.open?'true':'false');if(d.open){var x=p.querySelector('.mdr-x');if(x)x.focus()}else{s.focus()}});
d.addEventListener('keydown',function(e){if(!d.open)return;if(e.key==='Escape'){d.open=false;e.preventDefault();return}if(e.key!=='Tab')return;var l=f();if(!l.length)return;var a=l[0],z=l[l.length-1];if(e.shiftKey&&document.activeElement===a){z.focus();e.preventDefault()}else if(!e.shiftKey&&document.activeElement===z){a.focus();e.preventDefault()}});})();</script>
          </div>
        </details>
      </div>
    </div>
  </header>
  <nav class="ys-nav" aria-label="<?= $headerMenuOn ? 'Ana menü' : 'Kategoriler' ?>">
    <div class="ys-nav-in">
      <a class="ys-nav-home" href="<?= Html::e($site->path('/')) ?>" aria-label="Ana sayfa"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3z"/></svg></a>
      <div class="ys-cats">
        <?php if ($headerMenuOn): ?>
          <?php foreach ($headerMenuRoots as $root):
            $rootHref = \Yenisafak\Menu::href($site, $root['href']);
            $ddSlug = $treeOn ? \Yenisafak\CategoryTree::dropdownSlug($site, $rootHref) : '';
          ?>
            <?php if ($ddSlug !== ''): ?><span class="ys-dd"><?php endif; ?>
            <a href="<?= Html::e($rootHref) ?>"<?= \Yenisafak\Menu::isCurrent($current, $rootHref) ? ' aria-current="page"' : '' ?><?= $ddSlug !== '' ? ' aria-haspopup="true"' : '' ?>><?= Html::e($root['label']) ?></a>
            <?php if ($ddSlug !== ''): ?><?= $treePanel($ddSlug) ?></span><?php endif; ?>
          <?php endforeach; ?>
        <?php else: ?>
          <?php if ($treeOn): foreach (\Yenisafak\CategoryTree::mains($site) as $mainSlug): $mh = $site->path('/kategori/' . $mainSlug); ?>
            <span class="ys-dd"><a href="<?= Html::e($mh) ?>"<?= $current === '/kategori/' . $mainSlug ? ' aria-current="page"' : '' ?> aria-haspopup="true"><?= Html::e(\Yenisafak\CategoryTree::name($mainSlug, $site)) ?></a><?= $treePanel($mainSlug) ?></span>
          <?php endforeach; endif; ?>
          <?php foreach ($site->categories as $cat): if ($treeOn && \Yenisafak\CategoryTree::has($site, $cat['slug'])) { continue; } ?>
            <a href="<?= Html::e($site->path('/kategori/' . $cat['slug'])) ?>"<?= $current === '/kategori/' . $cat['slug'] ? ' aria-current="page"' : '' ?>><?= Html::e($cat['name']) ?></a>
          <?php endforeach; ?>
        <?php endif; ?>
        <?php if (\Yenisafak\Tanitim::mainNav($site) && !in_array('/tanitim', array_map(static fn ($r): string => rtrim((string) (parse_url(\Yenisafak\Menu::href($site, (string) ($r['href'] ?? '')), PHP_URL_PATH) ?: ''), '/'), $headerMenuOn ? $headerMenuRoots : []), true)): /* tanitim mainnav 2026-10-09: Tanıtım in the main menu on every news site except vatanhaber */ ?><a class="ys-nav-tanitim" href="<?= Html::e($site->path('/tanitim')) ?>"<?= \Yenisafak\Menu::isCurrent($current, $site->path('/tanitim')) ? ' aria-current="page"' : '' ?>>Tanıtım</a><?php endif; ?>
      </div>
      <?php if (!$headerMenuOn): ?>
      <div class="ys-tools">
        <a href="<?= Html::e($site->path('/videolar')) ?>"<?= ($current ?? '') === '/videolar' ? ' aria-current="page"' : '' ?>>Videolar</a>
        <?php if (\Yenisafak\Widgets::on($site, 'horoscope')): /* concept sites 2026-10-08 */ ?><a href="<?= Html::e($site->path('/burclar')) ?>">Burçlar</a><?php endif; ?>
        <?php if (\Yenisafak\Widgets::on($site, 'standings')): /* concept sites 2026-10-08 */ ?><a href="<?= Html::e($site->path('/puan-durumu')) ?>">Puan durumu</a><?php endif; ?>
      </div>
      <?php endif; ?>
      <button class="ys-theme-toggle" type="button" data-ys-theme aria-label="Koyu temaya geç" title="Açık / koyu tema">
        <svg class="ys-ico-moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M20.7 14.3A8.5 8.5 0 0 1 9.7 3.3a8.5 8.5 0 1 0 11 11z"/></svg>
        <svg class="ys-ico-sun" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></g></svg>
      </button>
    </div>
  </nav>
  <?php if ($treeOn): ?>
  <style>
  .ys-dd{display:inline-flex;flex:0 0 auto;position:static}
  .ys-dd-panel{display:none;position:fixed;z-index:60;min-width:220px;max-width:min(960px,calc(100vw - 24px));max-height:72vh;overflow:auto;padding:14px 16px;gap:10px 22px;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));background:#fff;color:#14213d;border-top:3px solid var(--ys-accent);border-radius:0 0 8px 8px;box-shadow:0 18px 40px rgba(0,0,0,.22)}
  .ys-dd:hover>.ys-dd-panel,.ys-dd:focus-within>.ys-dd-panel{display:grid}
  .ys-cats .ys-dd-panel a{display:block;padding:4px 6px;font-size:13.5px;font-weight:600;border-radius:3px;white-space:normal;color:inherit;background:none}
  .ys-cats .ys-dd-panel a:hover{background:var(--ys-accent);color:#fff}
  .ys-cats .ys-dd-panel a.ys-dd-h{font-weight:800;font-size:14px}
  .ys-dd-sub{display:grid;gap:0;margin:2px 0 4px 6px;border-left:2px solid #e3e7ee;padding-left:6px}
  .ys-cats .ys-dd-sub a{font-weight:500;font-size:12.5px;padding:2px 6px}
  [data-theme="dark"] .ys-dd-panel{background:#151a23;color:#e8ecf3}
  .ys-tdraw summary{cursor:pointer;list-style:revert}
  .ys-tdraw summary a{display:inline!important;padding:0!important}
  .ys-tdraw-l1{padding-left:14px!important}
  .ys-tdraw-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding-left:24px}
  .ys-tdraw-g a{font-size:13px;padding:4px 0!important}
  </style>
  <script>
  (function(){var dds=document.querySelectorAll('.ys-dd');function place(dd){var p=dd.querySelector('.ys-dd-panel');if(!p)return;var r=dd.getBoundingClientRect();p.style.top=Math.round(r.bottom)+'px';p.style.left='12px';requestAnimationFrame(function(){var w=p.offsetWidth||320;var left=Math.min(Math.max(12,r.left),window.innerWidth-w-12);p.style.left=Math.round(Math.max(12,left))+'px';});}
  for(var i=0;i<dds.length;i++){(function(dd){dd.addEventListener('mouseenter',function(){place(dd);});dd.addEventListener('focusin',function(){place(dd);});})(dds[i]);}
  window.addEventListener('scroll',function(){var a=document.querySelector('.ys-dd:hover');if(a)place(a);},{passive:true});})();
  </script>
  <?php endif; ?>
  <?php if ($headerAd !== '' && $tickerHtml !== ''): ?>
    <div class="ys-sd-row"><div class="ys-wrap"><?= $tickerHtml ?></div></div>
  <?php endif; ?>
  <?php if ($markets || $stripWeather || $social !== []): ?>
    <div class="ys-strip">
      <div class="ys-wrap ys-strip-in">
        <?php if ($markets) { require __DIR__ . '/_markets.php'; } ?>
        <?php if ($stripWeather): ?><div class="ys-strip-wx" data-ys-wx-mini-slot><?php $weather = $stripWeather; $variant = 'mini'; require __DIR__ . '/_weather.php'; ?></div><?php endif; ?>
        <?php if ($social !== []): ?>
          <div class="ys-social"><?php foreach ($social as $label => $url): ?><a href="<?= Html::e($url) ?>" rel="noopener" target="_blank"><?= Html::e($label) ?></a><?php endforeach; ?></div>
        <?php endif; ?>
      </div>
    </div>
  <?php endif; ?>
  </div>
  <?php if ($leaderboard !== ''): ?>
    <div class="ys-wrap ys-leaderboard"><?= $leaderboard ?></div>
  <?php endif; ?>
  <main id="icerik">
    <?= $body ?>
  </main>
  <footer class="ys-footer">
    <div class="ys-wrap ys-footer-in">
      <div>
        <?php if ($brandLogo): ?>
          <picture class="ys-footer-pill">
            <source type="image/webp" srcset="<?= Html::e($brandSrc('logo-h64.webp')) ?> 1x, <?= Html::e($brandSrc('logo-h128.webp')) ?> 2x">
            <img class="ys-footer-logo" src="<?= Html::e($brandSrc('logo-h128.png')) ?>" srcset="<?= Html::e($brandSrc('logo-h64.png')) ?> 1x, <?= Html::e($brandSrc('logo-h128.png')) ?> 2x" alt="<?= Html::e($site->name) ?>" width="174" height="48" loading="lazy">
          </picture>
        <?php elseif ($gdmBase !== '' && is_file(dirname(__DIR__) . '/public' . str_replace('/gundemi/logos/', '/gundemi/marka/', $gdmBase) . '-dark.png')): /* gundemi logos 2026-10-08 */ ?>
          <img class="ys-footer-logo" src="<?= Html::e($gdmSrc('-dark.png')) ?>" alt="<?= Html::e($site->name) ?>" height="48" loading="lazy">
        <?php else: ?>
          <p class="ys-footer-name"><?= Html::e($site->name) ?></p>
        <?php endif; ?>
        <p><?= Html::e($site->slogan()) /* editor hmYsSlogan, else site description */ ?></p>
        <?php if (!in_array($site->id, [7, 11, 61, 229], true)): /* footer-bilgi 2026-10-09: "<Site> Haber Merkezi — Bilgi ve iletişim: <info mailbox>" on every news site (not corporate 7/11/61, not suspended 229); name live from site config, mailbox = Tanitim::email (same as /tanitim, /iletisim) */
          $ysInfoMail = \Yenisafak\Tanitim::email($site);
          $ysInfoName = trim((string) preg_replace('/\s+haber$/iu', '', trim($site->name)));
          if ($ysInfoMail !== '' && $ysInfoName !== ''): ?>
          <p class="ys-footer-info" style="margin-top:6px;font-size:.92em"><?= Html::e($ysInfoName) ?> Haber Merkezi — Bilgi ve iletişim: <a href="mailto:<?= Html::e($ysInfoMail) ?>" style="color:inherit;text-decoration:underline"><?= Html::e($ysInfoMail) ?></a></p>
        <?php endif; endif; /* footer-bilgi 2026-10-09 */ ?>
      </div>
    </div>
    <nav class="ys-wrap ys-footer-menu" aria-label="Alt menü">
        <?php if ($footerMenuOn): ?>
          <?php foreach ($footerMenuItems as $fItem):
            $fHref = \Yenisafak\Menu::href($site, $fItem['href']);
          ?>
            <a href="<?= Html::e($fHref) ?>"<?= \Yenisafak\Menu::isCurrent($current, $fHref) ? ' aria-current="page"' : '' ?>><?= Html::e($fItem['label']) ?></a>
          <?php endforeach; ?>
        <?php else: ?>
          <a href="<?= Html::e($site->path('/kunye')) ?>">Künye</a>
          <a href="<?= Html::e($site->path('/hakkimizda')) ?>">Hakkımızda</a>
          <a href="<?= Html::e($site->path('/iletisim')) ?>">İletişim</a>
          <a href="<?= Html::e($site->path('/sitemap.xml')) ?>">Site haritası</a>
        <?php endif; ?>
        <?php if (!\Yenisafak\Tanitim::mainNav($site) && (!$footerMenuOn || !in_array('/tanitim', array_map(static fn ($fi): string => (string) ($fi['href'] ?? ''), $footerMenuItems), true))): /* tanitim 2026-10-08 + menu-tanitim 2026-10-09: footer Tanıtım only where it is not in the main menu (vatanhaber); other news sites have it in the top menu */ ?><a href="<?= Html::e($site->path('/tanitim')) ?>"<?= \Yenisafak\Menu::isCurrent($current, $site->path('/tanitim')) ? ' aria-current="page"' : '' ?>>Tanıtım</a><?php endif; ?>
        <?php $ysIl81Path = \Yenisafak\App::il81Path($site); /* il81-link 2026-10-09: turkatahaber/yerel keep the Worker /iller il-box page -> /81-il */ ?><a class="ys-il81-link" href="<?= Html::e($site->path($ysIl81Path)) ?>"<?= \Yenisafak\Menu::isCurrent($current, $site->path($ysIl81Path)) ? ' aria-current="page"' : '' ?>>81 İl Haber Ağı</a><?php /* 81il 2026-10-09: province network page link on every news site (footer) */ ?>
        <?php if (!in_array($site->id, [7, 11, 61], true)): /* legal-pages 2026-10-09: Hizmet Şartları + Gizlilik Politikası in every news site's footer */ ?><a class="ys-legal-link" href="<?= Html::e($site->path('/hizmet-sartlari')) ?>"<?= \Yenisafak\Menu::isCurrent($current, $site->path('/hizmet-sartlari')) ? ' aria-current="page"' : '' ?>>Hizmet Şartları</a><a class="ys-legal-link" href="<?= Html::e($site->path('/gizlilik-politikasi')) ?>"<?= \Yenisafak\Menu::isCurrent($current, $site->path('/gizlilik-politikasi')) ? ' aria-current="page"' : '' ?>>Gizlilik Politikası</a><?php endif; /* legal-pages 2026-10-09 end */ ?>
        <?php $ysAuthorLoginHref = '/koseyazari/giris'; ?>
        <a class="ys-edlink" href="<?= Html::e($ysAuthorLoginHref) ?>"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Köşe yazarı girişi</a>
        <a class="ys-edlink" href="/editor"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Editör Girişi</a>
        <a class="ys-yekpare" href="https://yekpare.net/posta" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>Yekpare E-posta Servisi</a>
    </nav>
    <div class="ys-wrap ys-footer-bottom">
      <span>© <?= date('Y') ?> <?= Html::e($site->name) ?></span>
<?php /* footer-v2 2026-10-10: stage 1 = suhaber.net only; set $ysFooterStage = null for every site */ $ysFooterStage = null; $ysFooterV2 = $ysFooterStage === null || in_array(strtolower((string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? '')), $ysFooterStage, true); ?>
<?php if ($ysFooterV2): ?>
      <span class="ys-footer-credits">
        <span><a href="https://goalgo.com.tr/" target="_blank" rel="noopener">Goalgo Haber Yazılımı</a></span><?php if (!$site->whiteLabel()): ?> <span>·</span> <span>Haber Merkezi: <a href="https://turkatahaber.com/" target="_blank" rel="noopener">TurkAta</a></span><?php endif; ?> <span>·</span> <span>Altyapı: <a href="https://ahenk.net.tr/" target="_blank" rel="noopener">Ahenk BT</a></span>
      </span>
<?php else: ?>
      <span class="ys-footer-credits">
        <?php if (!$site->isTurkata() && !$site->whiteLabel()): /* member credit on every other news site; omitted on turkatahaber.com itself */ ?><span><a href="https://turkatahaber.com/" target="_blank" rel="noopener">THA – TürkAta Haber Ajansı</a> üyesidir</span><?php endif; ?>
        <span>Haber merkezi altyapısı: <a href="https://ahenk.net.tr/" target="_blank" rel="noopener">Ahenk Bilgi Teknolojileri</a></span>
      </span>
<?php endif; ?>
    </div>
  </footer>
  <?php if ($stripMenuOn): ?>
  <nav class="ys-mstrip" aria-label="Şerit menü">
    <?php foreach ($stripMenuItems as $sItem):
      $sHref = \Yenisafak\Menu::href($site, $sItem['href']);
      $icon = trim((string) ($sItem['icon'] ?? ''));
    ?>
      <a href="<?= Html::e($sHref) ?>"<?= \Yenisafak\Menu::isCurrent($current, $sHref) ? ' aria-current="page"' : '' ?>>
        <?php if ($icon !== ''): ?><span aria-hidden="true"><?= Html::e($icon) ?></span><?php endif; ?>
        <span><?= Html::e($sItem['label']) ?></span>
      </a>
    <?php endforeach; ?>
  </nav>
  <style>
    .ys-mstrip{display:none}
    @media (max-width:900px){
      .ys-mstrip{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;gap:0;background:var(--ys-nav);color:var(--ys-nav-text);border-top:2px solid var(--ys-accent);padding:env(safe-area-inset-bottom,0) 0 0;box-shadow:0 -6px 20px rgba(0,0,0,.18)}
      .ys-mstrip a{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:8px 4px;font-size:11px;font-weight:800;color:inherit;text-decoration:none;text-align:center}
      .ys-mstrip a[aria-current="page"],.ys-mstrip a:hover{background:var(--ys-accent);color:#fff}
      .ys-mstrip a span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
      body.ys{padding-bottom:64px}
    }
  </style>
  <?php endif; ?>
  <script src="<?= Html::e($site->path('/assets/theme.js')) ?>?v=<?= Html::e(Html::assetVersion('theme.js')) ?>" defer></script>
</body>
</html>
