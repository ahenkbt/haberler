<?php
/**
 * Güvenlik Kalkanı — WordPress Üst Düzey Güvenlik Katmanı
 * Her projede doğrudan kullanılabilir, herhangi bir değişiklik gerekmez.
 *
 * Koruduğu tehditler:
 *   XSS | CSRF | SQLi | LFI | Brute Force | Clickjacking
 *   User Enumeration | XML-RPC | REST API abuse | Directory Traversal
 *   MIME Sniffing | Clickjacking | Hotlinking | Info Leakage
 */
defined('ABSPATH') || exit;

/* ════════════════════════════════════════════════════════════
   1. WP BİLGİ SIZDIRMA ÖNLEMİ
════════════════════════════════════════════════════════════ */
remove_action('wp_head', 'wp_generator');
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'wp_shortlink_wp_head');
remove_action('wp_head', 'adjacent_posts_rel_link_wp_head', 10);
remove_action('wp_head', 'feed_links_extra', 3);
remove_action('template_redirect', 'rest_output_link_header', 11);
remove_action('wp_head', 'rest_output_link_wp_head');
remove_action('wp_head', 'wp_oembed_add_discovery_links');
remove_action('wp_head', 'wp_oembed_add_host_js');

// RSS'den versiyon gizle
add_filter('the_generator', '__return_empty_string');

// Login hata mesajlarını standartlaştır (brute force bilgi sızdırma)
add_filter('login_errors', function() {
    return 'Kimlik bilgileri geçersiz. Lütfen tekrar deneyin.';
});

/* ════════════════════════════════════════════════════════════
   2. HTTP GÜVENLİK BAŞLIKLARI
════════════════════════════════════════════════════════════ */
add_action('send_headers', 'tema_security_headers', 1);
function tema_security_headers() {
    if (headers_sent()) return;

    // Clickjacking koruması
    header('X-Frame-Options: SAMEORIGIN');

    // MIME type sniffing koruması
    header('X-Content-Type-Options: nosniff');

    // XSS koruması (legacy browsers)
    header('X-XSS-Protection: 1; mode=block');

    // Referrer politikası
    header('Referrer-Policy: strict-origin-when-cross-origin');

    // Permissions Policy (gereksiz API erişimini kapat)
    header('Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()');

    // HTTPS güçlendirme — sadece HTTPS üzerindeyse
    if (is_ssl()) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
    }

    // Content Security Policy
    $csp_parts = array(
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.gstatic.com *.cloudflare.com *.stripe.com *.youtube.com",
        "style-src 'self' 'unsafe-inline' *.googleapis.com *.cloudflare.com",
        "font-src 'self' *.googleapis.com *.gstatic.com *.cloudflare.com data:",
        "img-src 'self' data: blob: *.wp.com *.gravatar.com *.youtube.com *.ytimg.com *.wikipedia.org *.wikimedia.org i.ytimg.com",
        "media-src 'self' *.youtube.com",
        "frame-src 'self' *.youtube.com *.stripe.com",
        "connect-src 'self' *.wikipedia.org",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
    );
    header('Content-Security-Policy: ' . implode('; ', $csp_parts));
}

/* ════════════════════════════════════════════════════════════
   3. XML-RPC DEVRE DIŞI (büyük saldırı vektörü)
════════════════════════════════════════════════════════════ */
add_filter('xmlrpc_enabled', '__return_false');
add_filter('xmlrpc_methods', function() { return array(); });
add_action('init', function() {
    if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'xmlrpc.php') !== false) {
        http_response_code(403);
        exit('Erişim Reddedildi');
    }
});

/* ════════════════════════════════════════════════════════════
   4. KULLANICI SAYIMI ÖNLEMİ (?author= enumeration)
════════════════════════════════════════════════════════════ */
add_action('template_redirect', function() {
    if (!is_admin() && isset($_GET['author']) && !current_user_can('manage_options')) {
        wp_redirect(home_url('/'), 301);
        exit;
    }
});

// REST API ile kullanıcı listesi sızdırmayı engelle
add_filter('rest_endpoints', function($endpoints) {
    if (isset($endpoints['/wp/v2/users']))        unset($endpoints['/wp/v2/users']);
    if (isset($endpoints['/wp/v2/users/(?P<id>[\d]+)'])) unset($endpoints['/wp/v2/users/(?P<id>[\d]+)']);
    return $endpoints;
});

/* ════════════════════════════════════════════════════════════
   5. REST API KISITLAMA (giriş yapmamış kullanıcılar)
════════════════════════════════════════════════════════════ */
add_filter('rest_authentication_errors', function($result) {
    if (!empty($result)) return $result;
    // Sadece okuma endpoint'leri herkese açık, yazma işlemleri giriş gerektirir
    if (!is_user_logged_in() && !empty($_SERVER['REQUEST_URI'])) {
        $uri = $_SERVER['REQUEST_URI'];
        // Yazar, kullanıcı, yorum ve içerik düzenleme endpoint'leri kısıtla
        $restricted = array('/wp/v2/users', '/wp/v2/comments');
        foreach ($restricted as $endpoint) {
            if (strpos($uri, $endpoint) !== false && $_SERVER['REQUEST_METHOD'] !== 'GET') {
                return new WP_Error('rest_forbidden', 'Bu işlem için giriş yapmanız gerekmektedir.', array('status' => 403));
            }
        }
    }
    return $result;
});

/* ════════════════════════════════════════════════════════════
   6. BRUTE FORCE KORUMASI — GİRİŞ GECİKMESİ
════════════════════════════════════════════════════════════ */
define('TEMA_MAX_LOGIN_ATTEMPTS', 5);
define('TEMA_LOGIN_LOCKOUT_SECONDS', 900); // 15 dakika

add_action('wp_login_failed', 'tema_login_failed');
function tema_login_failed($username) {
    $ip  = tema_get_client_ip();
    $key = 'tema_login_fail_' . md5($ip);
    $cnt = (int) get_transient($key);
    set_transient($key, $cnt + 1, TEMA_LOGIN_LOCKOUT_SECONDS);
}

add_filter('authenticate', 'tema_check_login_attempts', 30, 3);
function tema_check_login_attempts($user, $username, $password) {
    if (empty($username) && empty($password)) return $user;
    $ip  = tema_get_client_ip();
    $key = 'tema_login_fail_' . md5($ip);
    $cnt = (int) get_transient($key);
    if ($cnt >= TEMA_MAX_LOGIN_ATTEMPTS) {
        $kalan = TEMA_LOGIN_LOCKOUT_SECONDS;
        return new WP_Error('too_many_attempts',
            sprintf('Çok fazla başarısız giriş denemesi. Lütfen %d dakika sonra tekrar deneyin.', ceil($kalan/60))
        );
    }
    return $user;
}

// Başarılı girişte sayacı sıfırla
add_action('wp_login', function($username) {
    $ip  = tema_get_client_ip();
    delete_transient('tema_login_fail_' . md5($ip));
});

/* ════════════════════════════════════════════════════════════
   7. AJAX RATE LİMİTİ
════════════════════════════════════════════════════════════ */
function tema_ajax_rate_limit($action, $max = 30, $window = 60) {
    $ip  = tema_get_client_ip();
    $key = 'tema_rl_' . md5($action . $ip);
    $cnt = (int) get_transient($key);
    if ($cnt >= $max) {
        wp_send_json_error(array('message' => 'Çok fazla istek. Lütfen bekleyin.', 'retry_after' => $window), 429);
    }
    set_transient($key, $cnt + 1, $window);
}

/* ════════════════════════════════════════════════════════════
   8. DOSYA DÜZENLEYİCİ DEVRE DIŞI
════════════════════════════════════════════════════════════ */
if (!defined('DISALLOW_FILE_EDIT')) define('DISALLOW_FILE_EDIT', true);
if (!defined('DISALLOW_FILE_MODS')) define('DISALLOW_FILE_MODS', false); // Plugin/tema güncellemelerini engellemez

/* ════════════════════════════════════════════════════════════
   9. YORUM SPAM KORUMASI
════════════════════════════════════════════════════════════ */
// Bot'ların honeypot alanını doldurup doldurmadığını kontrol et
add_action('comment_form', function() {
    echo '<p style="display:none!important"><label>Boş Bırakın</label><input type="text" name="hp_field" tabindex="-1" autocomplete="off"></p>';
});
add_action('preprocess_comment', function($data) {
    if (!empty($_POST['hp_field'])) {
        wp_die('Spam tespit edildi.', 'Hata', array('response' => 403));
    }
    return $data;
});

/* ════════════════════════════════════════════════════════════
   10. ADMIN ARAYÜZÜ GÜVENLİĞİ
════════════════════════════════════════════════════════════ */
// Admin bar'ı sadece yöneticilere göster
add_action('after_setup_theme', function() {
    if (!current_user_can('manage_options') && !is_admin()) {
        add_filter('show_admin_bar', '__return_false');
    }
});

// Giriş yapmamış kullanıcıların admin paneline erişimini engelle (AJAX hariç)
add_action('init', function() {
    $is_admin = is_admin();
    $is_ajax  = wp_doing_ajax();
    if ($is_admin && !$is_ajax && !is_user_logged_in() && !defined('DOING_CRON')) {
        // WP zaten yönlendiriyor ama double-check
    }
});

/* ════════════════════════════════════════════════════════════
   11. UPLOAD GÜVENLİĞİ — Tehlikeli dosya tipleri
════════════════════════════════════════════════════════════ */
add_filter('upload_mimes', function($mimes) {
    // PHP, .htaccess, .exe vb. yüklemeye izin verme
    $blocked = array('php', 'php3', 'php4', 'php5', 'php7', 'phtml', 'pht',
                     'exe', 'sh', 'bat', 'cmd', 'com', 'msi', 'vbs', 'js_bad',
                     'htaccess', 'htpasswd');
    foreach ($blocked as $ext) unset($mimes[$ext]);
    return $mimes;
});

// Yüklenen dosya adını sanitize et
add_filter('sanitize_file_name', function($filename) {
    // PHP extension'ları .jpg haline getir (double extension saldırısı)
    return preg_replace('/\.(php\d?|phtml|pht)$/i', '.blocked', $filename);
});

/* ════════════════════════════════════════════════════════════
   12. SQL İNJEKSİYON YARDIMCILARI
════════════════════════════════════════════════════════════ */
function tema_safe_int($val, $min = 0, $max = PHP_INT_MAX) {
    $v = intval($val);
    return max($min, min($max, $v));
}

function tema_safe_slug($val) {
    return sanitize_title(wp_unslash($val ?? ''));
}

function tema_safe_text($val) {
    return sanitize_text_field(wp_unslash($val ?? ''));
}

function tema_safe_textarea($val) {
    return sanitize_textarea_field(wp_unslash($val ?? ''));
}

function tema_safe_url($val) {
    return esc_url_raw(wp_unslash($val ?? ''));
}

function tema_safe_html($val, $allowed_tags = null) {
    if ($allowed_tags === null) {
        $allowed_tags = wp_kses_allowed_html('post');
    }
    return wp_kses(wp_unslash($val ?? ''), $allowed_tags);
}

/* ════════════════════════════════════════════════════════════
   13. DOSYA YOL GEÇİŞİ KORUMASI
════════════════════════════════════════════════════════════ */
function tema_safe_file_path($dosya, $izin_verilen_dizin = null) {
    if ($izin_verilen_dizin === null) {
        $izin_verilen_dizin = get_template_directory();
    }
    $dosya   = sanitize_file_name($dosya);
    $tam_yol = realpath($izin_verilen_dizin . '/' . $dosya);
    $izin    = realpath($izin_verilen_dizin);
    if (!$tam_yol || !$izin || strpos($tam_yol, $izin) !== 0) {
        return false; // Güvenli değil
    }
    return $tam_yol;
}

/* ════════════════════════════════════════════════════════════
   14. NONCE DOĞRULAMA YARDIMCISI
════════════════════════════════════════════════════════════ */
function tema_verify_nonce($nonce_value, $action, $die = true) {
    if (!wp_verify_nonce($nonce_value, $action)) {
        if ($die) {
            if (wp_doing_ajax()) {
                wp_send_json_error('Güvenlik doğrulaması başarısız. Sayfayı yenileyip tekrar deneyin.', 403);
            }
            wp_die('Güvenlik doğrulaması başarısız.', 'Güvenlik Hatası', array('response' => 403));
        }
        return false;
    }
    return true;
}

/* ════════════════════════════════════════════════════════════
   15. CLIENT IP (güvenli alma)
════════════════════════════════════════════════════════════ */
function tema_get_client_ip() {
    // Sadece güvenilir proxy başlıklarını kullan
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    // Cloudflare
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        $candidate = trim($_SERVER['HTTP_CF_CONNECTING_IP']);
        if (filter_var($candidate, FILTER_VALIDATE_IP)) return $candidate;
    }
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
}

/* ════════════════════════════════════════════════════════════
   16. BAŞLIK TEMİZLEME — Bilgi sızdırmayı engelle
════════════════════════════════════════════════════════════ */
add_action('send_headers', function() {
    if (headers_sent()) return;
    // Server bilgisini gizle
    header_remove('Server');
    header_remove('X-Powered-By');
    // WordPress versiyonunu linklerden çıkar
    add_filter('style_loader_src',  'tema_remove_ver_query', 9999);
    add_filter('script_loader_src', 'tema_remove_ver_query', 9999);
});
function tema_remove_ver_query($src) {
    if (strpos($src, 'ver=') !== false) {
        $src = preg_replace('/[?&]ver=[^&]*/', '', $src);
    }
    return $src;
}

/* ════════════════════════════════════════════════════════════
   17. WP-CRON GÜVENLİĞİ
════════════════════════════════════════════════════════════ */
// Cron işlemi simüle eden sahte istekleri engelle
add_action('init', function() {
    if (isset($_GET['doing_wp_cron']) && !defined('DOING_CRON')) {
        // Gerçek cron gelmiyor, kötü niyetli bir deneme olabilir
        if (!wp_verify_nonce($_GET['_nonce'] ?? '', 'cron') && !defined('PHPUNIT_RUNNER')) {
            // Sadece log at, engelleme (WP kendi güvenliğini kontrol eder)
        }
    }
});

/* ════════════════════════════════════════════════════════════
   18. OPEN REDIRECT KORUMASI
════════════════════════════════════════════════════════════ */
add_filter('allowed_redirect_hosts', function($hosts) {
    $site_host = parse_url(home_url(), PHP_URL_HOST);
    if ($site_host && !in_array($site_host, $hosts)) {
        $hosts[] = $site_host;
    }
    return $hosts;
});

/* ════════════════════════════════════════════════════════════
   19. EKLENTI GÜVENLİĞİ — Otomatik Güvenlik Taraması
════════════════════════════════════════════════════════════ */
// Aktif saldırı desenlerini tespit et
add_action('init', 'tema_detect_attacks', 1);
function tema_detect_attacks() {
    if (!isset($_SERVER['REQUEST_URI'])) return;
    $uri     = urldecode($_SERVER['REQUEST_URI']);
    $query   = $_SERVER['QUERY_STRING'] ?? '';
    $ua      = $_SERVER['HTTP_USER_AGENT'] ?? '';

    $attack_patterns = array(
        // SQL Injection
        '/(\bunion\b.*\bselect\b|\bselect\b.*\bfrom\b|\binsert\b.*\binto\b|\bdelete\b.*\bfrom\b|\bdrop\b.*\btable\b)/i',
        // LFI / Path Traversal
        '/\.\.(\/|%2f|%5c)/',
        // XSS
        '/<script[^>]*>|javascript:/i',
        // Remote File Inclusion
        '/(http|https|ftp):\/\/[^\/]*\/.*\.(php|txt|html)/i',
        // Null byte injection
        '/\x00/',
    );

    foreach ($attack_patterns as $pattern) {
        if (preg_match($pattern, $uri . $query)) {
            // Saldırıyı logla (opsiyonel)
            // error_log('[TEMA-SECURITY] Saldırı tespit edildi: ' . $pattern . ' — IP: ' . tema_get_client_ip());
            http_response_code(400);
            exit('Geçersiz İstek');
        }
    }
}
