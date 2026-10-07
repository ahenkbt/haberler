<?php
/**
 * HM kurumsal siteler — Hostinger PHP ön yüz (VKD / TGD).
 * Neon layout_json + hmExtraPages Worker /api üzerinden okunur.
 */
declare(strict_types=1);

header('X-HM-Frontend: php-kurumsal');
header('Cache-Control: public, max-age=60, s-maxage=60, stale-while-revalidate=300');

require_once __DIR__ . '/lib/bootstrap.php';

$ctx = hk_boot();
$site = $ctx['site'];
$layout = $ctx['layout'];
$nav = $ctx['nav'];
$path = $ctx['path'];

if ($path === '/' || $path === '') {
    $tiles = hk_home_tiles($layout);
    require __DIR__ . '/templates/home.php';
    exit;
}

// /haber/:slug ve /kategori/:slug — kurumsalda nadir; meta sayfa veya 404.
$segment = ltrim($path, '/');
if (str_contains($segment, '/')) {
    // Çok segmentli yollar (eski SPA iç yolları) — tek segment slug'a indirgeme denemesi
    $parts = explode('/', $segment);
    $maybe = end($parts);
    if (is_string($maybe) && $maybe !== '') {
        $page = hk_find_page($layout, $maybe);
        if ($page !== null) {
            header('Location: /' . $page['slug'], true, 301);
            exit;
        }
    }
    require __DIR__ . '/templates/404.php';
    exit;
}

$page = hk_find_page($layout, $segment);
if ($page !== null) {
    require __DIR__ . '/templates/page.php';
    exit;
}

// Bilinen sabit slug yedekleri (API boşken)
$staticFallback = [
    'hakkimizda' => 'Hakkımızda',
    'iletisim' => 'İletişim',
    'bagis' => 'Bağış',
    'about' => 'Hakkımızda',
];
if (isset($staticFallback[$segment])) {
    $page = [
        'slug' => $segment,
        'title' => $staticFallback[$segment],
        'bodyHtml' => '<p>' . hk_h((string) ($site['displayName'] ?? ''))
            . ' — içerik API\'den yüklenemedi. Editör kaydı veya Neon senkronunu kontrol edin.</p>',
    ];
    require __DIR__ . '/templates/page.php';
    exit;
}

require __DIR__ . '/templates/404.php';
