<?php
/**
 * AhenkPress Admin — Layout Şablonu (AI Robot + Tema menüleri eklenmiş)
 */
defined('ROOT') or die();

function ap_admin_layout(string $title, callable $content, array $opts = []): void {
    $user      = Auth::user();
    $siteName  = DB::setting('site_name', 'AhenkPress');
    $page      = $_GET['page'] ?? 'dashboard';
    $csrf      = Security::csrf();
    ob_start();
    $content();
    $contentHtml = ob_get_clean();

    $nav = [
        'İçerik' => [
            ['page' => 'dashboard',  'label' => 'Kontrol Paneli',  'icon' => 'home'],
            ['page' => 'news',       'label' => 'Haberler',        'icon' => 'newspaper'],
            ['page' => 'posts',      'label' => 'Blog Yazıları',   'icon' => 'edit'],
            ['page' => 'pages',      'label' => 'Sayfalar',        'icon' => 'file-text'],
            ['page' => 'columnists', 'label' => 'Köşe Yazarları',  'icon' => 'pen-tool'],
            ['page' => 'media',      'label' => 'Medya',           'icon' => 'image'],
        ],
        'AI Robot' => [
            ['page' => 'ai-icerik',     'label' => 'AI İçerik Robotu', 'icon' => 'cpu'],
            ['page' => 'ai-kampanyalar','label' => 'RSS Kampanyaları', 'icon' => 'rss'],
            ['page' => 'video-tv',      'label' => 'Video TV',         'icon' => 'play'],
        ],
        'Tema' => [
            ['page' => 'tema-ayarlar',     'label' => 'Tema Ayarları',      'icon' => 'sliders'],
            ['page' => 'anasayfa-moduller','label' => 'Anasayfa Modülleri', 'icon' => 'layout'],
            ['page' => 'bant-yonetim',     'label' => 'Bant Yönetimi',      'icon' => 'sidebar'],
            ['page' => 'reklam',           'label' => 'Reklam Alanları',    'icon' => 'dollar'],
            ['page' => 'tema-kur',         'label' => 'Hızlı Kurulum',      'icon' => 'zap'],
        ],
        'E-Ticaret' => [
            ['page' => 'products',          'label' => 'Ürünler',           'icon' => 'package'],
            ['page' => 'product-categories','label' => 'Ürün Kategorileri', 'icon' => 'tag'],
            ['page' => 'product-import',    'label' => 'Toplu İçe Aktar',   'icon' => 'upload'],
            ['page' => 'orders',            'label' => 'Siparişler',        'icon' => 'file-text'],
            ['page' => 'payment-settings',  'label' => 'Ödeme Ayarları',    'icon' => 'dollar'],
        ],
        'Düzenle' => [
            ['page' => 'categories',    'label' => 'Kategoriler',     'icon' => 'tag'],
            ['page' => 'menus',         'label' => 'Menüler',         'icon' => 'menu'],
            ['page' => 'themes',        'label' => 'Temalar',         'icon' => 'monitor'],
        ],
        'Araçlar' => [
            ['page' => 'modules',       'label' => 'Modüller',        'icon' => 'package'],
            ['page' => 'users',         'label' => 'Kullanıcılar',    'icon' => 'users'],
            ['page' => 'import',        'label' => 'İçe Aktar',       'icon' => 'upload'],
            ['page' => 'settings',      'label' => 'Ayarlar',         'icon' => 'settings'],
        ],
    ];

    $moduleNav = Hook::applyFilters('ap_admin_nav', []);
?>
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="csrf" content="<?= e($csrf) ?>">
<title><?= e($title) ?> — <?= e($siteName) ?> Admin</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<link rel="stylesheet" href="/admin/assets/css/admin.css">
<style><?php if (!empty($opts['extra_css'])) echo $opts['extra_css']; ?></style>
</head>
<body>
<div class="ap-layout">

  <aside class="ap-sidebar">
    <a href="/admin/" class="ap-sidebar-brand">
      <div class="ap-brand-logo">A</div>
      <div>
        <div class="ap-brand-name">AhenkPress</div>
        <div class="ap-brand-ver">v<?= AP_VERSION ?></div>
      </div>
    </a>

    <div class="ap-site-switcher" title="<?= e($siteName) ?>">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      <span class="ap-site-name"><?= e($siteName) ?></span>
    </div>

    <nav class="ap-nav">
      <?php foreach ($nav as $section => $items): ?>
      <div class="ap-nav-section">
        <div class="ap-nav-label"><?= e($section) ?></div>
        <?php foreach ($items as $item): ?>
        <?php $isActive = ($page === $item['page']); ?>
        <a href="/admin/?page=<?= e($item['page']) ?>" class="ap-nav-item <?= $isActive ? 'active' : '' ?>">
          <?= ap_admin_icon($item['icon']) ?>
          <span><?= e($item['label']) ?></span>
        </a>
        <?php endforeach; ?>
      </div>
      <?php endforeach; ?>

      <?php if (!empty($moduleNav)): ?>
      <div class="ap-nav-section">
        <div class="ap-nav-label">Modüller</div>
        <?php foreach ($moduleNav as $item): ?>
        <a href="<?= e($item['url'] ?? '#') ?>" class="ap-nav-item <?= ($page === ($item['page']??'')) ? 'active' : '' ?>">
          <?= ap_admin_icon($item['icon'] ?? 'package') ?>
          <span><?= e($item['label']) ?></span>
        </a>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>
    </nav>

    <div class="ap-sidebar-footer">
      <div class="ap-sidebar-user">
        <div class="ap-user-avatar"><?= mb_strtoupper(mb_substr($user['display_name']??'A',0,1)) ?></div>
        <div class="ap-user-info">
          <div class="ap-user-name"><?= e($user['display_name']??'') ?></div>
          <div class="ap-user-role"><?= e($user['role']??'') ?></div>
        </div>
      </div>
      <div style="display:flex;gap:4px;margin-top:6px;padding:0 4px">
        <a href="/admin/?page=profile" class="ap-icon-btn" title="Profil">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </a>
        <a href="/" target="_blank" class="ap-icon-btn" title="Siteyi Gör">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
        <a href="/admin/?action=logout" class="ap-icon-btn" title="Çıkış" style="color:var(--ap-red)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </a>
      </div>
    </div>
  </aside>

  <div class="ap-main">
    <header class="ap-header">
      <div class="ap-breadcrumb">
        <a href="/admin/">Yönetim</a>
        <span class="ap-breadcrumb-sep">/</span>
        <span><?= e($title) ?></span>
      </div>
      <div style="flex:1"></div>
      <div class="ap-header-actions">
        <a href="/" target="_blank" class="ap-view-site-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Siteyi Gör
        </a>
      </div>
    </header>

    <main class="ap-content">
      <?php if (!empty($_SESSION['ap_notice'])): ?>
      <div class="ap-alert ap-alert-<?= $_SESSION['ap_notice']['type']??'info' ?>">
        <?= e($_SESSION['ap_notice']['msg']) ?>
      </div>
      <?php unset($_SESSION['ap_notice']); ?>
      <?php endif; ?>
      <?= $contentHtml ?>
    </main>
  </div>
</div>

<div class="ap-toasts"></div>
<script src="/admin/assets/js/admin.js"></script>
<?php if (!empty($opts['extra_js'])) echo $opts['extra_js']; ?>
</body>
</html>
<?php
}

function ap_admin_icon(string $name): string {
    static $icons = null;
    if ($icons === null) {
        $icons = [
            'home'      => 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
            'edit'      => 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7|M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
            'newspaper' => 'M4 3h16v2H4z|M6 7h12M6 11h12M6 15h8',
            'file-text' => 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M16 13H8|M16 17H8',
            'pen-tool'  => 'M12 19l7-7 3 3-7 7-3-3z|M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z',
            'image'     => 'M21 15l-5-5L5 21|M3 3h18v18H3z',
            'cpu'       => 'M9 3H5a2 2 0 0 0-2 2v4|M9 3h6|M15 3h4a2 2 0 0 1 2 2v4|M21 9v6|M21 15v4a2 2 0 0 1-2 2h-4|M15 21H9|M9 21H5a2 2 0 0 1-2-2v-4|M3 15V9|M9 9h6v6H9z',
            'rss'       => 'M4 11a9 9 0 0 1 9 9|M4 4a16 16 0 0 1 16 16|M5 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
            'play'      => 'M5 3l14 9-14 9V3z',
            'sliders'   => 'M4 21v-7|M4 10V3|M12 21v-9|M12 8V3|M20 21v-5|M20 12V3|M1 14h6|M9 8h6|M17 16h6',
            'dollar'    => 'M12 1v22|M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
            'zap'       => 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
            'tag'       => 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z',
            'menu'      => 'M3 12h18|M3 6h18|M3 18h18',
            'monitor'   => 'M2 3h20v14H2z|M8 21h8|M12 17v4',
            'users'     => 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M23 21v-2a4 4 0 0 0-3-3.87',
            'upload'    => 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M17 8l-5-5-5 5|M12 3v12',
            'settings'  => 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
            'package'   => 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
            'layout'    => 'M3 3h18v18H3z|M3 9h18|M9 21V9',
        ];
    }
    $d     = $icons[$name] ?? 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z';
    $paths = array_map(fn($p) => "<path d=\"{$p}\"/>", explode('|', $d));
    return '<svg class="ap-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' . implode('', $paths) . '</svg>';
}

function ap_flash(string $msg, string $type = 'success'): void {
    $_SESSION['ap_notice'] = ['msg' => $msg, 'type' => $type];
}

function ap_draft_count(string $postType): int {
    try {
        return (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE post_type=? AND status='draft'", [$postType]);
    } catch (\Throwable) { return 0; }
}
