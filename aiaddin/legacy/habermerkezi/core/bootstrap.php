<?php
/**
 * AhenkPress v5 — Bootstrap / Sistem Başlatıcı
 *
 * Akış:
 *  1. config.php yoksa → /install.php'ye yönlendir
 *  2. config.php placeholder değerler içeriyorsa → /install.php'ye yönlendir
 *  3. DB bağlantısı kurulamazsa → /install.php?db_error=1'e yönlendir
 *  4. Her şey yolundaysa → normal çalışma
 */
if (!defined('ROOT')) define('ROOT', dirname(__DIR__));

define('AP_VERSION',  '5.3.0');
define('UPLOADS_DIR', ROOT . '/uploads');
define('UPLOADS_URL', rtrim(
    ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http')
    . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'), '/'
) . '/uploads');
define('THEMES_DIR',  ROOT . '/themes');
define('MODULES_DIR', ROOT . '/modules');
define('ADMIN_DIR',   ROOT . '/admin');

// ─── 1. config.php kontrolü ────────────────────────────────────────────────
$cfgFile = ROOT . '/config.php';
if (!file_exists($cfgFile)) {
    // Kurulum henüz yapılmamış — sihirbaza yönlendir
    $installUrl = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http')
                . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '/install.php';
    header('Location: ' . $installUrl);
    exit;
}
require_once $cfgFile;

// ─── 2. Placeholder / boş credential kontrolü ──────────────────────────────
// Kurulum tamamlanmadan config.php elle kopyalanmışsa install'a geri dön
$placeholders = ['veritabani_adi', 'kullanici_adi', 'guclu_sifre', '', 'YOUR_DB_NAME', 'YOUR_DB_USER'];
if (in_array(DB_NAME ?? '', $placeholders, true) || in_array(DB_USER ?? '', $placeholders, true)) {
    $installUrl = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http')
                . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '/install.php?reason=placeholder';
    header('Location: ' . $installUrl);
    exit;
}

// ─── 3. Oturum ─────────────────────────────────────────────────────────────
if (session_status() === PHP_SESSION_NONE) {
    session_name('ahenkpress_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// ─── 4. Core Sınıflar ──────────────────────────────────────────────────────
require_once ROOT . '/core/DB.php';
require_once ROOT . '/core/Auth.php';
require_once ROOT . '/core/Hook.php';
require_once ROOT . '/core/Security.php';
require_once ROOT . '/core/Widget.php';
require_once ROOT . '/core/PostType.php';
require_once ROOT . '/core/Theme.php';
require_once ROOT . '/core/Module.php';
require_once ROOT . '/core/Cart.php';
require_once ROOT . '/core/Payment.php';
require_once ROOT . '/core/helpers.php';

// ─── 5. DB Bağlantısı (hata → install.php'ye yönlendir) ───────────────────
try {
    DB::connect();
} catch (\Throwable $e) {
    // DB bağlantısı kurulamadı — kurulum sihirbazına gönder
    $proto      = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $installUrl = $proto . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '/install.php?db_error=1';
    // Hata mesajını session'a yaz (install.php okuyacak)
    if (session_status() === PHP_SESSION_ACTIVE) {
        $_SESSION['ap_bootstrap_db_error'] = $e->getMessage();
    }
    header('Location: ' . $installUrl);
    exit;
}

// ─── 6. Tablolar mevcut mu? İlk kurulum kontrolü ───────────────────────────
// (users tablosu yoksa kurulum henüz tamamlanmamış demektir)
if (!DB::tableExists('users')) {
    $proto      = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $installUrl = $proto . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '/install.php?reason=notinstalled';
    header('Location: ' . $installUrl);
    exit;
}

// ─── 7. Modül Sistemi ───────────────────────────────────────────────────────
Module::boot();

// ─── 8. AI / RSS Sınıfları (varsa) ─────────────────────────────────────────
foreach (['ai-client', 'rss-fetcher', 'news-processor'] as $cls) {
    $f = ROOT . '/core/' . $cls . '.php';
    if (file_exists($f)) require_once $f;
}
