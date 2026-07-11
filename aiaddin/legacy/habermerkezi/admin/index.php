<?php
/**
 * AhenkPress Admin — Ana Giriş Noktası
 */
if (!defined('ROOT'))       define('ROOT', dirname(__DIR__));
if (!defined('ADMIN_DIR'))  define('ADMIN_DIR', __DIR__);
if (!defined('AP_VERSION')) require_once ROOT . '/core/bootstrap.php';

try {
    if (!Auth::check()) {
        header('Location: /admin/login.php');
        exit;
    }

    if (($_GET['action'] ?? '') === 'logout' || ($_GET['page'] ?? '') === 'logout') {
        Auth::logout();
        header('Location: /admin/login.php');
        exit;
    }

    require_once ADMIN_DIR . '/layout.php';

    $page = preg_replace('/[^a-z0-9\-]/', '', $_GET['page'] ?? 'dashboard');

    $allowed = [
        'dashboard','posts','news','pages','columnists','media',
        'categories','menus','widgets','themes','modules',
        'users','settings','import','profile','post-edit','page-edit',
        'ai-icerik','ai-kampanyalar','video-tv',
        'anasayfa-moduller',
        'tema-ayarlar','tema-kur','reklam','bant-yonetim',
        'products','product-categories','product-import','orders','payment-settings',
    ];

    $modulePages = Hook::applyFilters('ap_admin_pages', []);
    $allowed = array_merge($allowed, array_keys($modulePages));

    $pageFile = ADMIN_DIR . '/pages/' . $page . '.php';
    if (!file_exists($pageFile) && isset($modulePages[$page])) {
        $pageFile = $modulePages[$page];
    }
    if (!in_array($page, $allowed, true) || !file_exists($pageFile)) {
        $pageFile = ADMIN_DIR . '/pages/dashboard.php';
    }

    require $pageFile;

} catch (Throwable $e) {
    http_response_code(500);
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hata</title></head>';
    echo '<body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#e94560">';
    echo '<h1>500 — Admin Hatası</h1>';
    echo '<p><strong>' . htmlspecialchars($e->getMessage()) . '</strong></p>';
    echo '<p>' . htmlspecialchars($e->getFile()) . ':' . $e->getLine() . '</p>';
    echo '</body></html>';
}
