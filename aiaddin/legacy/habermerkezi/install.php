<?php
/**
 * AhenkPress v5.3 — Kurulum Sihirbazı
 * Adım 1: Hoş geldin + DB kontrol
 * Adım 2: Site tipi seçimi
 * Adım 3: Admin hesabı
 * Adım 4: Kurulum + Demo içerik
 */
define('ROOT', __DIR__);
define('AP_VERSION', '5.3.0');

if (session_status() === PHP_SESSION_NONE) {
    session_name('ap_install');
    session_start();
}

// ─── Güvenlik: Zaten kurulu ise engelle ────────────────────────────
$configFile = ROOT . '/config.php';
if (file_exists($configFile)) {
    @require_once $configFile;
    // DB bağlantısı deneyerek kurulumun yapılıp yapılmadığını kontrol et
    try {
        $pdo2 = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $hasUsers = $pdo2->query("SHOW TABLES LIKE '" . DB_PREFIX . "users'")->rowCount() > 0;
        $hasData  = $hasUsers && $pdo2->query("SELECT COUNT(*) FROM `" . DB_PREFIX . "users`")->fetchColumn() > 0;
        if ($hasData) {
            die('<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>AhenkPress — Kurulu</title><style>body{font-family:sans-serif;background:#0f1117;color:#e6edf3;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.box{text-align:center;background:#1c2128;border:1px solid #30363d;border-radius:12px;padding:40px;max-width:440px}.logo{font-size:48px;margin-bottom:12px}.h1{font-size:24px;font-weight:900}.p{color:#7d8590;margin:12px 0}.a{display:inline-block;padding:10px 24px;background:#238636;color:#fff;border-radius:6px;text-decoration:none;font-weight:700}</style></head><body><div class="box"><div class="logo">🔒</div><div class="h1">AhenkPress Zaten Kurulu</div><p class="p">Bu dosyayı sunucudan silmenizi öneririz.</p><a class="a" href="/admin/">Admin Panele Git</a></div></body></html>');
        }
    } catch (\Throwable) {}
}

$step  = (int)($_SESSION['ap_install_step'] ?? 1);
$data  = $_SESSION['ap_install_data']  ?? [];
$error = '';

// Bootstrap'ten yönlendirilme sebeplerini notice olarak göster
$bootstrapNotice = '';
if (isset($_GET['db_error'])) {
    $dbErr = $_SESSION['ap_bootstrap_db_error'] ?? 'Veritabanı bağlantısı kurulamadı.';
    unset($_SESSION['ap_bootstrap_db_error']);
    $bootstrapNotice = '⚠ Veritabanı bağlantısı başarısız: ' . htmlspecialchars($dbErr) . ' — Lütfen DB bilgilerini kontrol ederek kurulumu tamamlayın.';
} elseif (isset($_GET['reason'])) {
    $bootstrapNotice = match($_GET['reason']) {
        'placeholder'  => '⚠ config.php örnek değerler içeriyor. Lütfen aşağıdaki formu doldurarak kurulumu tamamlayın.',
        'notinstalled' => '⚠ Veritabanı tabloları bulunamadı. Kurulum sihirbazını kullanarak kurulumu tamamlayın.',
        default        => '⚠ Kurulum tamamlanmamış. Lütfen devam edin.',
    };
}

// ─── POST işleme ───────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $postStep = (int)($_POST['step'] ?? 1);

    if ($postStep === 1) {
        // Adım 1 → 2: DB bilgileri
        $data['db_host']   = trim($_POST['db_host']   ?? 'localhost');
        $data['db_name']   = trim($_POST['db_name']   ?? '');
        $data['db_user']   = trim($_POST['db_user']   ?? '');
        $data['db_pass']   = trim($_POST['db_pass']   ?? '');
        $data['db_prefix'] = preg_replace('/[^a-z0-9_]/', '', strtolower(trim($_POST['db_prefix'] ?? 'ap_')));
        if (!$data['db_prefix']) $data['db_prefix'] = 'ap_';

        if (!$data['db_name'] || !$data['db_user']) { $error = 'Veritabanı adı ve kullanıcı zorunludur.'; }
        else {
            try {
                $test = new PDO('mysql:host=' . $data['db_host'] . ';charset=utf8mb4', $data['db_user'], $data['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
                $test->exec("CREATE DATABASE IF NOT EXISTS `" . $data['db_name'] . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $_SESSION['ap_install_data'] = $data;
                $_SESSION['ap_install_step'] = 2;
                header('Location: ' . $_SERVER['PHP_SELF']); exit;
            } catch (\Throwable $e) {
                $error = 'Bağlantı hatası: ' . $e->getMessage();
            }
        }
    } elseif ($postStep === 2) {
        // Adım 2 → 3: Site tipi
        $data['site_type'] = in_array($_POST['site_type']??'', ['news','store','corporate','blog']) ? $_POST['site_type'] : 'news';
        $data['site_name'] = trim($_POST['site_name'] ?? 'Benim Sitem');
        $_SESSION['ap_install_data'] = $data;
        $_SESSION['ap_install_step'] = 3;
        header('Location: ' . $_SERVER['PHP_SELF']); exit;

    } elseif ($postStep === 3) {
        // Adım 3 → 4: Admin hesabı
        $data['admin_user']  = preg_replace('/[^a-z0-9_]/', '', strtolower(trim($_POST['admin_user'] ?? 'admin')));
        $data['admin_email'] = trim($_POST['admin_email'] ?? 'admin@localhost.com');
        $data['admin_pass']  = $_POST['admin_pass'] ?? '';
        $data['admin_pass2'] = $_POST['admin_pass2'] ?? '';
        if (strlen($data['admin_pass']) < 6) { $error = 'Şifre en az 6 karakter olmalıdır.'; }
        elseif ($data['admin_pass'] !== $data['admin_pass2']) { $error = 'Şifreler eşleşmiyor.'; }
        else {
            $_SESSION['ap_install_data'] = $data;
            $_SESSION['ap_install_step'] = 4;
            header('Location: ' . $_SERVER['PHP_SELF']); exit;
        }

    } elseif ($postStep === 4) {
        // Adım 4: Gerçek kurulum
        runInstall($data);
        exit;
    }
}

function runInstall(array $data): void {
    $p   = $data['db_prefix'];
    $pdo = new PDO(
        'mysql:host=' . $data['db_host'] . ';dbname=' . $data['db_name'] . ';charset=utf8mb4',
        $data['db_user'], $data['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    $log  = [];
    $type = $data['site_type'];

    header('Content-Type: text/html; charset=utf-8');
    echo ap_install_head('AhenkPress — Kurulum Yapılıyor');
    echo '<div class="install-wrap"><div class="install-logo"><div class="logo-mark">A</div><h2>AhenkPress v5.3</h2></div>';
    echo '<div class="ap-install-log">';
    ob_start();

    function ol(string $m, string $t='ok'): void {
        echo '<div class="log-' . $t . '">' . $m . '</div>';
        ob_flush(); flush();
    }

    ol('⚙️ Kurulum başlıyor...','info');

    // ─── TABLOLAR ────────────────────────────────────────────────
    $tables = [];

    $tables['users'] = "CREATE TABLE IF NOT EXISTS `{$p}users` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `username` VARCHAR(60) NOT NULL UNIQUE,
        `email` VARCHAR(120) NOT NULL UNIQUE, `password` VARCHAR(255) NOT NULL,
        `display_name` VARCHAR(100) NOT NULL DEFAULT '', `role` ENUM('admin','editor','author','contributor') NOT NULL DEFAULT 'author',
        `bio` TEXT, `avatar` VARCHAR(255) DEFAULT '', `active` TINYINT(1) NOT NULL DEFAULT 1,
        `last_login` DATETIME, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['categories'] = "CREATE TABLE IF NOT EXISTS `{$p}categories` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) NOT NULL,
        `slug` VARCHAR(110) NOT NULL UNIQUE, `description` TEXT,
        `color` VARCHAR(20) DEFAULT '#CC0000', `icon` VARCHAR(50) DEFAULT '',
        `cover_image` VARCHAR(255) DEFAULT '', `parent_id` INT UNSIGNED DEFAULT 0,
        `sort_order` INT UNSIGNED DEFAULT 0, `active` TINYINT(1) DEFAULT 1,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['posts'] = "CREATE TABLE IF NOT EXISTS `{$p}posts` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `post_type` ENUM('news','blog','page','columnist','product') NOT NULL DEFAULT 'news',
        `title` VARCHAR(500) NOT NULL DEFAULT '', `slug` VARCHAR(510) NOT NULL,
        `content` LONGTEXT, `excerpt` TEXT, `cover_image` VARCHAR(255) DEFAULT '',
        `category_id` INT UNSIGNED DEFAULT 0, `author_id` INT UNSIGNED DEFAULT 0,
        `columnist_id` INT UNSIGNED DEFAULT 0,
        `status` ENUM('draft','published','private','trash') NOT NULL DEFAULT 'draft',
        `is_breaking` TINYINT(1) DEFAULT 0, `featured` TINYINT(1) DEFAULT 0,
        `view_count` INT UNSIGNED DEFAULT 0, `meta_title` VARCHAR(255) DEFAULT '',
        `meta_desc` TEXT, `tags` TEXT, `source_url` VARCHAR(500) DEFAULT '',
        `source_name` VARCHAR(100) DEFAULT '', `ai_generated` TINYINT(1) DEFAULT 0,
        `published_at` DATETIME, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY `slug_type` (`slug`, `post_type`),
        KEY `idx_type_status` (`post_type`,`status`,`published_at`),
        KEY `idx_category` (`category_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['post_meta'] = "CREATE TABLE IF NOT EXISTS `{$p}post_meta` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `post_id` INT UNSIGNED NOT NULL, `meta_key` VARCHAR(100) NOT NULL,
        `meta_val` LONGTEXT,
        UNIQUE KEY `post_meta` (`post_id`,`meta_key`),
        KEY `idx_post` (`post_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['columnists'] = "CREATE TABLE IF NOT EXISTS `{$p}columnists` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(150) NOT NULL,
        `slug` VARCHAR(160) NOT NULL UNIQUE, `title` VARCHAR(150) DEFAULT '',
        `bio` TEXT, `avatar` VARCHAR(255) DEFAULT '', `email` VARCHAR(120) DEFAULT '',
        `facebook` VARCHAR(255) DEFAULT '', `twitter` VARCHAR(255) DEFAULT '',
        `sort_order` INT UNSIGNED DEFAULT 0, `active` TINYINT(1) DEFAULT 1,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['settings'] = "CREATE TABLE IF NOT EXISTS `{$p}settings` (
        `key` VARCHAR(120) NOT NULL PRIMARY KEY, `val` LONGTEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['menus'] = "CREATE TABLE IF NOT EXISTS `{$p}menus` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) NOT NULL,
        `slug` VARCHAR(110) NOT NULL UNIQUE, `location` VARCHAR(60) DEFAULT '',
        `items` LONGTEXT, `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['media'] = "CREATE TABLE IF NOT EXISTS `{$p}media` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `filename` VARCHAR(255) NOT NULL,
        `path` VARCHAR(500) NOT NULL, `url` VARCHAR(500) NOT NULL,
        `type` VARCHAR(60) DEFAULT 'image', `size` INT UNSIGNED DEFAULT 0,
        `width` SMALLINT UNSIGNED DEFAULT 0, `height` SMALLINT UNSIGNED DEFAULT 0,
        `alt` VARCHAR(255) DEFAULT '', `author_id` INT UNSIGNED DEFAULT 0,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['product_categories'] = "CREATE TABLE IF NOT EXISTS `{$p}product_categories` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) NOT NULL,
        `slug` VARCHAR(110) NOT NULL UNIQUE, `description` TEXT,
        `image` VARCHAR(255) DEFAULT '', `parent_id` INT UNSIGNED DEFAULT 0,
        `sort_order` INT UNSIGNED DEFAULT 0,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['orders'] = "CREATE TABLE IF NOT EXISTS `{$p}orders` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `order_number` VARCHAR(40) NOT NULL UNIQUE,
        `buyer_name` VARCHAR(150) NOT NULL, `buyer_email` VARCHAR(120) NOT NULL,
        `buyer_phone` VARCHAR(30) DEFAULT '', `buyer_address` TEXT,
        `total` DECIMAL(12,2) NOT NULL DEFAULT 0,
        `currency` VARCHAR(5) DEFAULT 'TRY',
        `payment_method` VARCHAR(30) NOT NULL DEFAULT 'havale',
        `status` ENUM('pending','processing','shipped','completed','cancelled','refunded') NOT NULL DEFAULT 'pending',
        `notes` TEXT, `payment_ref` VARCHAR(200) DEFAULT '',
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY `idx_status` (`status`), KEY `idx_email` (`buyer_email`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['order_items'] = "CREATE TABLE IF NOT EXISTS `{$p}order_items` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `order_id` INT UNSIGNED NOT NULL, `product_id` INT UNSIGNED DEFAULT 0,
        `title` VARCHAR(500) NOT NULL, `price` DECIMAL(10,2) NOT NULL,
        `qty` INT UNSIGNED NOT NULL DEFAULT 1, `subtotal` DECIMAL(12,2) NOT NULL,
        KEY `idx_order` (`order_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['rss_campaigns'] = "CREATE TABLE IF NOT EXISTS `{$p}rss_campaigns` (
        `id`               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `name`             VARCHAR(255) NOT NULL DEFAULT '',
        `slug`             VARCHAR(255) NOT NULL DEFAULT '',
        `feeds`            LONGTEXT,
        `active`           TINYINT(1) DEFAULT 1,
        `source_type`      VARCHAR(30) DEFAULT 'rss',
        `post_type`        VARCHAR(50) DEFAULT 'news',
        `category_id`      INT UNSIGNED DEFAULT 0,
        `category_slug`    VARCHAR(100) DEFAULT '',
        `tags`             VARCHAR(500) DEFAULT '',
        `is_breaking`      TINYINT(1) DEFAULT 0,
        `breaking_words`   VARCHAR(500) DEFAULT 'son dakika,acil,flas,breaking',
        `use_ai`           TINYINT(1) DEFAULT 0,
        `translate`        TINYINT(1) DEFAULT 0,
        `translate_from`   VARCHAR(10) DEFAULT 'en',
        `translate_to`     VARCHAR(10) DEFAULT 'tr',
        `translate_engine` VARCHAR(20) DEFAULT 'google',
        `download_images`  TINYINT(1) DEFAULT 1,
        `min_words`        SMALLINT UNSIGNED DEFAULT 20,
        `max_days`         TINYINT UNSIGNED DEFAULT 7,
        `interval_minutes` INT UNSIGNED DEFAULT 30,
        `max_per_run`      INT UNSIGNED DEFAULT 5,
        `max_per_day`      INT UNSIGNED DEFAULT 0,
        `last_run`         INT UNSIGNED DEFAULT 0,
        `total_added`      INT UNSIGNED DEFAULT 0,
        `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['rss_logs'] = "CREATE TABLE IF NOT EXISTS `{$p}rss_logs` (
        `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `campaign_id`   INT UNSIGNED NOT NULL DEFAULT 0,
        `campaign_name` VARCHAR(255) DEFAULT '',
        `level`         VARCHAR(10) DEFAULT 'info',
        `action`        VARCHAR(100) DEFAULT '',
        `message`       TEXT,
        `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY `campaign_id` (`campaign_id`),
        KEY `created_at` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['rss_processed'] = "CREATE TABLE IF NOT EXISTS `{$p}rss_processed` (
        `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `source_hash`   VARCHAR(64) NOT NULL,
        `source_guid`   VARCHAR(500) DEFAULT '',
        `source_url`    VARCHAR(500) DEFAULT '',
        `post_id`       INT UNSIGNED DEFAULT 0,
        `campaign_slug` VARCHAR(200) DEFAULT '',
        `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `uidx_hash` (`source_hash`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['video_channels'] = "CREATE TABLE IF NOT EXISTS `{$p}video_channels` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(200) NOT NULL, `slug` VARCHAR(220) NOT NULL DEFAULT '',
        `channel_id` VARCHAR(150) DEFAULT '',
        `platform` ENUM('youtube','dailymotion','m3u8','iframe') DEFAULT 'youtube',
        `stream_url` VARCHAR(500) DEFAULT '',
        `logo_url` VARCHAR(500) DEFAULT '',
        `category` VARCHAR(100) DEFAULT '',
        `active` TINYINT(1) DEFAULT 1,
        `sort_order` INT UNSIGNED DEFAULT 0,
        `is_live` TINYINT(1) DEFAULT 0,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['video_cats'] = "CREATE TABLE IF NOT EXISTS `{$p}video_cats` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL,
        `slug` VARCHAR(120) NOT NULL UNIQUE,
        `color` VARCHAR(20) DEFAULT '#3b82f6',
        `sort_order` INT UNSIGNED DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $tables['videos'] = "CREATE TABLE IF NOT EXISTS `{$p}videos` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `title` VARCHAR(500) NOT NULL DEFAULT '',
        `video_id` VARCHAR(200) DEFAULT '',
        `platform` ENUM('youtube','dailymotion','vimeo','direct') DEFAULT 'youtube',
        `category` VARCHAR(100) DEFAULT '',
        `thumbnail` VARCHAR(500) DEFAULT '',
        `description` TEXT,
        `published` TINYINT(1) DEFAULT 1,
        `view_count` INT UNSIGNED DEFAULT 0,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY `idx_cat` (`category`), KEY `idx_pub` (`published`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    foreach ($tables as $tname => $sql) {
        $pdo->exec($sql);
        ol("✅ Tablo: {$p}{$tname}");
    }

    ol('<hr>📦 Demo veriler yükleniyor...', 'info');

    // ─── ADMIN KULLANICI ──────────────────────────────────────────
    $exists = $pdo->prepare("SELECT id FROM `{$p}users` WHERE role='admin' LIMIT 1");
    $exists->execute();
    if (!$exists->fetch()) {
        $hash = password_hash($data['admin_pass'], PASSWORD_DEFAULT);
        $pdo->prepare("INSERT INTO `{$p}users` (username,email,password,display_name,role) VALUES (?,?,?,?,?)")
            ->execute([$data['admin_user'], $data['admin_email'], $hash, 'Yönetici', 'admin']);
        ol("✅ Admin kullanıcı oluşturuldu: <strong>{$data['admin_user']}</strong>");
    }

    // ─── KATEGORİLER (Site tipine göre) ──────────────────────────
    $catCount = (int)$pdo->query("SELECT COUNT(*) FROM `{$p}categories`")->fetchColumn();
    if ($catCount === 0) {
        $cats = match($type) {
            'news' => [
                ['Gündem','gundem','#CC0000'],['Ekonomi','ekonomi','#0066CC'],
                ['Dünya','dunya','#006633'],['Spor','spor','#FF6600'],
                ['Magazin','magazin','#CC0099'],['Teknoloji','teknoloji','#6600CC'],
                ['Sağlık','saglik','#009966'],['Eğitim','egitim','#996633'],
                ['Kültür','kultur','#CC6600'],['Siyaset','siyaset','#003399'],
            ],
            'store' => [
                ['Genel','genel','#CC0000'],['Kampanyalar','kampanyalar','#FF6600'],
            ],
            'corporate' => [
                ['Haberler','haberler','#003399'],['Blog','blog','#006633'],
                ['Duyurular','duyurular','#CC0000'],
            ],
            'blog' => [
                ['Yaşam','yasam','#CC0000'],['Teknoloji','teknoloji','#0066CC'],
                ['Seyahat','seyahat','#006633'],['Yemek','yemek','#FF6600'],
                ['Kişisel','kisisel','#CC0099'],
            ],
            default => [['Genel','genel','#CC0000']],
        };
        $stmt = $pdo->prepare("INSERT INTO `{$p}categories` (name,slug,color,sort_order) VALUES (?,?,?,?)");
        foreach ($cats as $i => [$n,$s,$c]) $stmt->execute([$n,$s,$c,$i]);
        ol("✅ " . count($cats) . " kategori oluşturuldu");
    }

    // ─── ÜRÜN KATEGORİLERİ (e-ticaret tipinde veya hepsinde) ─────
    $pcCount = (int)$pdo->query("SELECT COUNT(*) FROM `{$p}product_categories`")->fetchColumn();
    if ($pcCount === 0) {
        $pcats = $type === 'store' ? [
            ['Elektronik','elektronik'],['Giyim & Moda','giyim-moda'],
            ['Ev & Yaşam','ev-yasam'],['Kitap & Hobi','kitap-hobi'],
            ['Spor & Outdoor','spor-outdoor'],['Kozmetik','kozmetik'],
        ] : [
            ['Ürünler','urunler'],['Hizmetler','hizmetler'],
        ];
        $stmt = $pdo->prepare("INSERT INTO `{$p}product_categories` (name,slug,sort_order) VALUES (?,?,?)");
        foreach ($pcats as $i=>[$n,$s]) $stmt->execute([$n,$s,$i]);
        ol("✅ " . count($pcats) . " ürün kategorisi oluşturuldu");
    }

    // ─── AYARLAR ─────────────────────────────────────────────────
    $siteName = $data['site_name'] ?: match($type) {
        'news'      => 'Haber Portalım',
        'store'     => 'Online Mağazam',
        'corporate' => 'Şirketim',
        'blog'      => 'Blog\'um',
    };

    $defaultSettings = [
        'site_name'              => $siteName,
        'site_desc'              => match($type) {
            'news'      => 'Güncel haberler ve son dakika gelişmeleri',
            'store'     => 'Güvenli alışveriş adresi',
            'corporate' => 'Kurumsal web sitesi',
            'blog'      => 'Kişisel blog',
        },
        'site_type'              => $type,
        'active_theme'           => 'ankara-haber',
        'admin_email'            => $data['admin_email'],
        'posts_per_page'         => '10',
        'logo_text1'             => strtoupper(explode(' ', $siteName)[0] ?? 'SİTE'),
        'logo_text2'             => strtoupper(implode(' ', array_slice(explode(' ', $siteName), 1)) ?: 'ADI'),
        'theme_ana_kategoriler'  => match($type) {
            'news'      => 'gundem,ekonomi,dunya,spor',
            'corporate' => 'haberler,blog,duyurular',
            'blog'      => 'yasam,teknoloji,seyahat,yemek',
            default     => 'genel',
        },
        'theme_manset_count'     => '5',
        'theme_surmanset_count'  => '4',
        'theme_manset_height'    => '460',
        'theme_ikon_bant'        => '1',
        'theme_finans_bant'      => $type === 'news' ? '1' : '0',
        'payment_methods'        => '["havale","kapida_odeme"]',
        'currency'               => 'TRY',
        'kapida_odeme_fee'       => '0',
        'active_modules'         => '[]',
        'bant_items'             => '[{"icon":"fa-fire","url":"son-haberler","label":"SON HABERLER","sub":"G\u00fcncel haberler","enabled":true},{"icon":"fa-city","url":"gundem","label":"G\u00dcNDEM","sub":"G\u00fcndem haberleri","enabled":true},{"icon":"fa-chart-line","url":"ekonomi","label":"EKONOM\u0130","sub":"Ekonomi haberleri","enabled":true},{"icon":"fa-globe","url":"dunya","label":"D\u00dcNYA","sub":"D\u00fcnya haberleri","enabled":true},{"icon":"fa-futbol","url":"spor","label":"SPOR","sub":"Spor haberleri","enabled":true},{"icon":"fa-pen-nib","url":"yazarlar","label":"YAZARLAR","sub":"K\u00f6\u015fe yaz\u0131lar\u0131","enabled":true},{"icon":"fa-play-circle","url":"video-tv","label":"V\u0130DEO TV","sub":"Canl\u0131 yay\u0131n","enabled":true},{"icon":"fa-list","url":"tum-haberler","label":"T\u00dcM HABERLER","sub":"Haberler ar\u015fivi","enabled":true}]',
        'installation_done'      => '1',
        'installation_type'      => $type,
        'installed_at'           => date('Y-m-d H:i:s'),
    ];
    $stmt = $pdo->prepare("INSERT IGNORE INTO `{$p}settings` (`key`,`val`) VALUES (?,?)");
    foreach ($defaultSettings as $k => $v) $stmt->execute([$k, $v]);
    ol("✅ Site ayarları kaydedildi");

    // ─── DEMO İÇERİK ─────────────────────────────────────────────
    $postCount = (int)$pdo->query("SELECT COUNT(*) FROM `{$p}posts`")->fetchColumn();
    if ($postCount === 0) {
        $firstCat = $pdo->query("SELECT id FROM `{$p}categories` LIMIT 1")->fetchColumn();
        $adminId  = $pdo->query("SELECT id FROM `{$p}users` WHERE role='admin' LIMIT 1")->fetchColumn();

        if ($type === 'news') {
            $demoPosts = [
                ['news','Hoş Geldiniz: AhenkPress Haber Siteniz Kuruldu','hos-geldiniz-ahenkpress','<p>AhenkPress v5 başarıyla kuruldu! Artık haberlerinizi yayınlayabilirsiniz.</p><p>Admin paneline giriş yaparak haberler, kategoriler ve temayı özelleştirebilirsiniz.</p>','AhenkPress v5 haber siteniz başarıyla kuruldu.',1],
                ['news','Demo Haber: Manşet Haberi Örneği','demo-haber-manset','<p>Bu bir demo haberdir. Admin panelinden kendi haberlerinizi ekleyebilirsiniz.</p>','Manşet haberi örneği.',1],
                ['news','Teknoloji: Yapay Zeka Haberleri','yapay-zeka-demo','<p>AI destekli içerik oluşturma özelliğimizle haberlerinizi otomatik üretebilirsiniz.</p>','Yapay zeka ile haber üretimi.',0],
            ];
        } elseif ($type === 'store') {
            $demoPosts = [
                ['page','Hakkımızda','hakkimizda','<p>Mağazamıza hoş geldiniz! Kaliteli ürünleri uygun fiyatlarla sunuyoruz.</p>','Mağazamız hakkında bilgi.',0],
            ];
            // Demo ürün
            $prdId = $pdo->prepare("INSERT INTO `{$p}posts` (post_type,title,slug,content,excerpt,status,featured,published_at) VALUES ('product','Örnek Ürün','ornek-urun','<p>Bu bir örnek üründür. Admin panelinden kendi ürünlerinizi ekleyebilirsiniz.</p>','Örnek ürün açıklaması.','published',1,NOW())")->execute();
            $prdId = $pdo->lastInsertId();
            $pdo->prepare("INSERT IGNORE INTO `{$p}post_meta` (post_id,meta_key,meta_val) VALUES (?,?,?)")->execute([$prdId,'price','299.90']);
            $pdo->prepare("INSERT IGNORE INTO `{$p}post_meta` (post_id,meta_key,meta_val) VALUES (?,?,?)")->execute([$prdId,'old_price','499.90']);
            $pdo->prepare("INSERT IGNORE INTO `{$p}post_meta` (post_id,meta_key,meta_val) VALUES (?,?,?)")->execute([$prdId,'stock','Stokta var']);
            ol("✅ Demo ürün oluşturuldu");
        } elseif ($type === 'corporate') {
            $demoPosts = [
                ['page','Hakkımızda','hakkimizda','<p>Şirketimize hoş geldiniz. Müşteri odaklı çözümler sunuyoruz.</p>','Şirketimiz hakkında.',0],
                ['page','Hizmetlerimiz','hizmetlerimiz','<p>Sunduğumuz hizmetler hakkında detaylı bilgi burada yer alacak.</p>','Hizmetlerimiz.',0],
                ['page','İletişim','iletisim','<p>Bize ulaşmak için aşağıdaki bilgileri kullanabilirsiniz.</p>','İletişim bilgileri.',0],
                ['news','Şirket Haberi: AhenkPress ile Web Siteniz Hazır','sirket-haber-1','<p>Kurumsal web siteniz AhenkPress ile hayata geçirildi.</p>','İlk kurumsal haberimiz.',0],
            ];
        } else { // blog
            $demoPosts = [
                ['blog','Bloğuma Hoş Geldiniz','bloguma-hos-geldiniz','<p>Bu benim kişisel bloğum. Burada hayatımdan, düşüncelerimden ve ilgi alanlarımdan yazılar paylaşacağım.</p>','Kişisel bloguma hoş geldiniz!',0],
                ['blog','İlk Blog Yazısı','ilk-blog-yazisi','<p>Bu benim ilk blog yazım. AhenkPress ile blog yazmak çok kolay!</p>','İlk blog yazım.',0],
            ];
        }

        if (!empty($demoPosts)) {
            $stmt = $pdo->prepare("INSERT INTO `{$p}posts` (post_type,title,slug,content,excerpt,category_id,author_id,status,featured,is_breaking,published_at) VALUES (?,?,?,?,?,?,?,'published',?,?,NOW())");
            foreach ($demoPosts as [$pt,$ti,$sl,$co,$ex,$fe]) {
                $stmt->execute([$pt,$ti,$sl,$co,$ex,$firstCat,$adminId,$fe,0]);
            }
            ol("✅ " . count($demoPosts) . " demo içerik oluşturuldu");
        }
    }

    // ─── MENÜLER ─────────────────────────────────────────────────
    $menuCount = (int)$pdo->query("SELECT COUNT(*) FROM `{$p}menus`")->fetchColumn();
    if ($menuCount === 0) {
        $menuItems = match($type) {
            'news' => [
                ['label'=>'Gündem','url'=>'/gundem','type'=>'category'],
                ['label'=>'Ekonomi','url'=>'/ekonomi','type'=>'category'],
                ['label'=>'Dünya','url'=>'/dunya','type'=>'category'],
                ['label'=>'Spor','url'=>'/spor','type'=>'category'],
                ['label'=>'Teknoloji','url'=>'/teknoloji','type'=>'category'],
                ['label'=>'Video TV','url'=>'/video-tv','type'=>'custom'],
            ],
            'store' => [
                ['label'=>'Mağaza','url'=>'/magaza','type'=>'custom'],
                ['label'=>'Sepet','url'=>'/sepet','type'=>'custom'],
                ['label'=>'Hakkımızda','url'=>'/hakkimizda','type'=>'page'],
            ],
            'corporate' => [
                ['label'=>'Ana Sayfa','url'=>'/','type'=>'custom'],
                ['label'=>'Hakkımızda','url'=>'/hakkimizda','type'=>'page'],
                ['label'=>'Hizmetler','url'=>'/hizmetlerimiz','type'=>'page'],
                ['label'=>'Blog','url'=>'/blog','type'=>'custom'],
                ['label'=>'İletişim','url'=>'/iletisim','type'=>'page'],
            ],
            'blog' => [
                ['label'=>'Ana Sayfa','url'=>'/','type'=>'custom'],
                ['label'=>'Yazılar','url'=>'/blog','type'=>'custom'],
                ['label'=>'Hakkımda','url'=>'/hakkimda','type'=>'page'],
            ],
            default => [['label'=>'Ana Sayfa','url'=>'/','type'=>'custom']],
        };
        $pdo->prepare("INSERT INTO `{$p}menus` (name,slug,location,items) VALUES (?,?,?,?)")
            ->execute(['Ana Menü','main-nav','main-nav',json_encode($menuItems, JSON_UNESCAPED_UNICODE)]);
        ol("✅ Ana menü oluşturuldu");
    }

    // ─── config.php yaz ──────────────────────────────────────────
    $configContent = '<?php' . "\n" .
        '// AhenkPress v5 — Konfigürasyon (Otomatik Oluşturuldu: ' . date('Y-m-d H:i:s') . ')' . "\n" .
        'define(\'DB_HOST\',   \'' . addslashes($data['db_host']) . '\');' . "\n" .
        'define(\'DB_NAME\',   \'' . addslashes($data['db_name']) . '\');' . "\n" .
        'define(\'DB_USER\',   \'' . addslashes($data['db_user']) . '\');' . "\n" .
        'define(\'DB_PASS\',   \'' . addslashes($data['db_pass']) . '\');' . "\n" .
        'define(\'DB_PREFIX\', \'' . $p . '\');' . "\n" .
        'define(\'SECRET_KEY\', \'' . bin2hex(random_bytes(24)) . '\');' . "\n";

    file_put_contents(ROOT . '/config.php', $configContent);
    ol("✅ config.php oluşturuldu");

    // ─── Klasörler ────────────────────────────────────────────────
    foreach (['uploads', 'modules', 'uploads/' . date('Y') . '/' . date('m')] as $d) {
        $path = ROOT . '/' . $d;
        if (!is_dir($path)) { mkdir($path, 0755, true); ol("✅ Klasör: /$d"); }
    }

    ob_flush(); flush();
    ob_end_flush();

    // Oturumu temizle
    unset($_SESSION['ap_install_step'], $_SESSION['ap_install_data']);

    $typeLabel = match($type) { 'news'=>'Haber Sitesi','store'=>'Alışveriş Sitesi','corporate'=>'Kurumsal Site','blog'=>'Blog Sitesi',default=>$type };
    echo '</div>'; // log div kapat

    echo '<div class="install-success">
        <div style="font-size:56px;margin-bottom:12px">🎉</div>
        <h2>Kurulum Tamamlandı!</h2>
        <p><strong>' . htmlspecialchars($siteName) . '</strong> — ' . $typeLabel . ' başarıyla kuruldu!</p>
        <div class="success-actions">
          <a href="/admin/" class="btn-primary">Admin Panele Gir →</a>
          <a href="/" class="btn-secondary">Siteyi Gör</a>
        </div>
        <div class="success-info">
          <strong>Kullanıcı:</strong> ' . htmlspecialchars($data['admin_user']) . '<br>
          <strong>E-posta:</strong> ' . htmlspecialchars($data['admin_email']) . '<br>
          <div style="margin-top:12px;color:#e3b341;font-size:14px">⚠️ Güvenlik için <strong>install.php</strong> dosyasını sunucudan silin!</div>
        </div>
    </div></div></body></html>';
}

// ─── Sayfa render ──────────────────────────────────────────────────────
function ap_install_head(string $title): string {
    return '<!DOCTYPE html><html lang="tr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>' . htmlspecialchars($title) . '</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0f1117;color:#e6edf3;min-height:100vh}
.install-hero{background:linear-gradient(135deg,#0f1117 0%,#1c2128 100%);padding:60px 20px;text-align:center;border-bottom:1px solid #30363d}
.install-logo-mark{width:72px;height:72px;background:linear-gradient(135deg,#238636,#1a7f37);border-radius:18px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:#fff;box-shadow:0 8px 32px rgba(35,134,54,.3)}
.install-hero h1{font-size:32px;font-weight:900;margin-bottom:8px}
.install-hero p{color:#7d8590;font-size:16px}
.install-wrap{max-width:640px;margin:0 auto;padding:32px 16px}
.install-step{background:#1c2128;border:1px solid #30363d;border-radius:12px;padding:28px;margin-bottom:20px}
.install-step h2{font-size:20px;font-weight:800;margin-bottom:6px}
.install-step p{color:#7d8590;font-size:14px;margin-bottom:20px}
.step-indicator{display:flex;gap:0;margin-bottom:32px;border-radius:8px;overflow:hidden;border:1px solid #30363d}
.step-item{flex:1;padding:10px;text-align:center;font-size:13px;background:#1c2128;color:#7d8590;border-right:1px solid #30363d}
.step-item:last-child{border-right:none}
.step-item.active{background:#238636;color:#fff;font-weight:700}
.step-item.done{background:#0d4429;color:#56d364}
.form-group{margin-bottom:16px}
label{display:block;font-size:12px;font-weight:600;color:#7d8590;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
input,select,textarea{width:100%;padding:10px 14px;background:#0f1117;border:1px solid #30363d;border-radius:8px;color:#e6edf3;font-size:14px;outline:none;transition:border .2s}
input:focus,select:focus,textarea:focus{border-color:#388bfd;box-shadow:0 0 0 3px rgba(56,139,253,.15)}
.btn{display:block;width:100%;padding:12px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;border:none;text-align:center;text-decoration:none;transition:all .2s}
.btn-primary{background:#238636;color:#fff;margin-bottom:0}.btn-primary:hover{background:#1a7f37}
.btn-secondary{background:transparent;color:#7d8590;border:1px solid #30363d;margin-top:10px}.btn-secondary:hover{border-color:#7d8590;color:#e6edf3}
.error{background:rgba(218,54,51,.12);border:1px solid rgba(218,54,51,.3);color:#f85149;padding:12px;border-radius:8px;margin-bottom:16px;font-size:14px}
.site-types{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.site-type-card{border:2px solid #30363d;border-radius:10px;padding:16px;cursor:pointer;transition:all .2s;background:#0f1117}
.site-type-card:hover{border-color:#388bfd}
.site-type-card input{display:none}
.site-type-card.selected{border-color:#238636;background:#0d4429}
.site-type-icon{font-size:32px;margin-bottom:8px;display:block}
.site-type-name{font-weight:700;font-size:15px;margin-bottom:4px}
.site-type-desc{font-size:12px;color:#7d8590}
.install-logo{text-align:center;margin-bottom:24px}
.install-logo .logo-mark{width:52px;height:52px;background:#238636;border-radius:12px;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:#fff}
.install-logo h2{font-size:20px;font-weight:800}
.ap-install-log{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:16px;font-family:monospace;font-size:13px;line-height:2;max-height:320px;overflow-y:auto;margin-bottom:16px}
.log-ok{color:#56d364}.log-info{color:#79c0ff}.log-warn{color:#e3b341}.log-error{color:#f85149}
.install-success{background:#1c2128;border:1px solid #238636;border-radius:12px;padding:28px;text-align:center}
.install-success h2{font-size:22px;font-weight:900;margin-bottom:8px}
.install-success p{color:#7d8590;margin-bottom:20px}
.success-actions{display:flex;gap:10px;justify-content:center;margin-bottom:16px;flex-wrap:wrap}
.success-actions a{padding:10px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px}
.success-actions .btn-primary{background:#238636;color:#fff}
.success-actions .btn-secondary{border:1px solid #30363d;color:#7d8590}
.success-info{background:#0f1117;border:1px solid #30363d;border-radius:8px;padding:14px;font-size:13px;text-align:left;line-height:2}
hr{border:none;border-top:1px solid #30363d;margin:12px 0}
</style></head><body>';
}

// ─── HERO ──────────────────────────────────────────────────────────────
echo ap_install_head('AhenkPress v5 — Kurulum Sihirbazı');

// Adım göstergesi
$stepLabels = ['1'=>'Veritabanı','2'=>'Site Tipi','3'=>'Hesap','4'=>'Kurulum'];
echo '<div class="install-hero">
  <div class="install-logo-mark">A</div>
  <h1>AhenkPress v5.3</h1>
  <p>WordPress benzeri güçlü PHP CMS — Kurulum Sihirbazı</p>
</div>';

echo '<div class="install-wrap">';
echo '<div class="step-indicator">';
foreach ($stepLabels as $n => $l) {
    $cls = $n < $step ? 'done' : ($n == $step ? 'active' : '');
    echo '<div class="step-item ' . $cls . '">' . ($n < $step ? '✓ ' : '') . $l . '</div>';
}
echo '</div>';

if ($error): echo '<div class="error">' . htmlspecialchars($error) . '</div>'; endif;

if ($bootstrapNotice): ?>
<div style="background:rgba(227,179,65,.12);border:1px solid rgba(227,179,65,.4);color:#e3b341;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;line-height:1.5">
  <?= $bootstrapNotice ?>
</div>
<?php endif; ?>
<?php if ($step === 1): ?>
<div class="install-step">
  <h2>🗄️ Veritabanı Bağlantısı</h2>
  <p>cPanel → MySQL Veritabanları bölümünden oluşturduğunuz veritabanı bilgilerini girin.</p>
  <form method="POST">
  <input type="hidden" name="step" value="1">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div class="form-group" style="grid-column:1/-1">
      <label>Veritabanı Sunucusu</label>
      <input name="db_host" value="<?= htmlspecialchars($data['db_host'] ?? 'localhost') ?>" required>
    </div>
    <div class="form-group">
      <label>Veritabanı Adı *</label>
      <input name="db_name" value="<?= htmlspecialchars($data['db_name'] ?? '') ?>" required placeholder="ornekkullanici_ahenkdb">
    </div>
    <div class="form-group">
      <label>Kullanıcı Adı *</label>
      <input name="db_user" value="<?= htmlspecialchars($data['db_user'] ?? '') ?>" required placeholder="ornekkullanici_user">
    </div>
    <div class="form-group">
      <label>Şifre</label>
      <input name="db_pass" type="password" value="<?= htmlspecialchars($data['db_pass'] ?? '') ?>" placeholder="••••••••">
    </div>
    <div class="form-group">
      <label>Tablo Öneki</label>
      <input name="db_prefix" value="<?= htmlspecialchars($data['db_prefix'] ?? 'ap_') ?>" placeholder="ap_">
    </div>
  </div>
  <button class="btn btn-primary" type="submit">Bağlantıyı Test Et ve Devam →</button>
  </form>
</div>
<?php elseif ($step === 2): ?>
<div class="install-step">
  <h2>🌐 Site Tipi Seçin</h2>
  <p>Sitenizi nasıl kullanacaksınız? Her tip için farklı demo içerik ve kategoriler yüklenir.</p>
  <form method="POST">
  <input type="hidden" name="step" value="2">
  <div class="form-group">
    <label>Site Adı *</label>
    <input name="site_name" value="<?= htmlspecialchars($data['site_name'] ?? '') ?>" required placeholder="Örn: AnkaraHaber, Mağaza Adı...">
  </div>
  <label style="margin-bottom:10px">Site Tipi</label>
  <div class="site-types" style="margin-bottom:20px">
    <?php foreach ([
      ['news','📰','Haber Sitesi','Güncel haberler, son dakika, manşet slider, köşe yazarları'],
      ['store','🛒','Alışveriş Sitesi','Ürün kataloğu, sepet, Stripe kart ödemesi, siparişler'],
      ['corporate','🏢','Kurumsal Site','Şirket web sitesi, hizmetler, blog, iletişim'],
      ['blog','✍️','Blog Sitesi','Kişisel veya kategori bazlı blog, çoklu yazar'],
    ] as [$val,$icon,$name,$desc]):
      $sel = ($data['site_type'] ?? 'news') === $val ? 'selected' : ''; ?>
    <label class="site-type-card <?= $sel ?>" onclick="selectType(this,'<?= $val ?>')">
      <input type="radio" name="site_type" value="<?= $val ?>" <?= $sel?'checked':'' ?>>
      <span class="site-type-icon"><?= $icon ?></span>
      <div class="site-type-name"><?= $name ?></div>
      <div class="site-type-desc"><?= $desc ?></div>
    </label>
    <?php endforeach; ?>
  </div>
  <button class="btn btn-primary" type="submit">Devam Et →</button>
  </form>
</div>
<script>
function selectType(el, val) {
  document.querySelectorAll('.site-type-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  el.querySelector('input').checked = true;
}
</script>
<?php elseif ($step === 3): ?>
<div class="install-step">
  <h2>👤 Admin Hesabı</h2>
  <p>Yönetim paneline giriş için kullanacağınız hesabı oluşturun.</p>
  <form method="POST">
  <input type="hidden" name="step" value="3">
  <div class="form-group">
    <label>Kullanıcı Adı *</label>
    <input name="admin_user" value="<?= htmlspecialchars($data['admin_user'] ?? 'admin') ?>" required pattern="[a-z0-9_]+" placeholder="admin">
    <small style="color:#7d8590;font-size:12px">Sadece küçük harf, rakam ve _ kullanın</small>
  </div>
  <div class="form-group">
    <label>E-posta *</label>
    <input name="admin_email" type="email" value="<?= htmlspecialchars($data['admin_email'] ?? '') ?>" required placeholder="admin@siteniz.com">
  </div>
  <div class="form-group">
    <label>Şifre * (min 6 karakter)</label>
    <input name="admin_pass" type="password" required minlength="6" placeholder="••••••••">
  </div>
  <div class="form-group">
    <label>Şifre Tekrar *</label>
    <input name="admin_pass2" type="password" required minlength="6" placeholder="••••••••">
  </div>
  <button class="btn btn-primary" type="submit">Hesabı Oluştur ve Kur →</button>
  </form>
</div>
<?php elseif ($step === 4): ?>
<div class="install-step">
  <h2>⚙️ Kurulum Yapılıyor...</h2>
  <p>Lütfen bekleyin, veritabanı tabloları ve demo içerik oluşturuluyor.</p>
  <form id="install-form" method="POST">
    <input type="hidden" name="step" value="4">
    <button class="btn btn-primary" type="submit" id="install-btn">🚀 Kurulumu Başlat</button>
  </form>
</div>
<?php endif; ?>
</div>
</body></html>
<?php
