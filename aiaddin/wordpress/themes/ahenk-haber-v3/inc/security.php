<?php
/**
 * Ahenk Haber - Güvenlik Katmanı
 * Tüm güvenlik önlemleri bu dosyada merkezi olarak yönetilir.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/* ============================================================
   1. XML-RPC DEVRE DIŞI
   ============================================================ */
add_filter( 'xmlrpc_enabled', '__return_false' );
add_filter( 'wp_xmlrpc_server_class', '__return_false' );
remove_action( 'wp_head', 'rsd_link' );
remove_action( 'wp_head', 'wlwmanifest_link' );

/* ============================================================
   2. WordPress SÜRÜMÜ GİZLE
   ============================================================ */
remove_action( 'wp_head', 'wp_generator' );
add_filter( 'the_generator', '__return_empty_string' );

/* ============================================================
   3. GEREKSIZ HEAD TEMIZLEME
   ============================================================ */
remove_action( 'wp_head', 'wp_shortlink_wp_head' );
remove_action( 'wp_head', 'feed_links_extra', 3 );
remove_action( 'template_redirect', 'wp_redirect_admin_locations', 1000 );

/* ============================================================
   4. GÜVENLİK BAŞLIKLARI
   ============================================================ */
function ahenk_security_headers() {
    if ( ! headers_sent() ) {
        header( 'X-Content-Type-Options: nosniff' );
        header( 'X-Frame-Options: SAMEORIGIN' );
        header( 'X-XSS-Protection: 1; mode=block' );
        header( 'Referrer-Policy: strict-origin-when-cross-origin' );
        header( 'Permissions-Policy: geolocation=(self), microphone=(), camera=()' );
    }
}
add_action( 'send_headers', 'ahenk_security_headers' );

/* ============================================================
   5. DOSYA DÜZENLEYİCİYİ ENGELLE
   ============================================================ */
if ( ! defined( 'DISALLOW_FILE_EDIT' ) ) {
    define( 'DISALLOW_FILE_EDIT', true );
}

/* ============================================================
   6. LOGİN DENEME LİMİTİ (Wordfence yoksa bu devreye girer)
   ============================================================ */
function ahenk_limit_login_attempts() {
    $ip          = sanitize_text_field( $_SERVER['REMOTE_ADDR'] ?? '' );
    $transient   = 'ahenk_login_fail_' . md5( $ip );
    $fail_count  = (int) get_transient( $transient );

    if ( $fail_count >= 5 ) {
        wp_die(
            '<h1>Erişim Engellendi</h1><p>Çok fazla başarısız giriş denemesi. 30 dakika sonra tekrar deneyin.</p>',
            'Erişim Engellendi',
            array( 'response' => 403 )
        );
    }
}
add_action( 'wp_login_failed', function( $username ) {
    $ip         = sanitize_text_field( $_SERVER['REMOTE_ADDR'] ?? '' );
    $transient  = 'ahenk_login_fail_' . md5( $ip );
    $fail_count = (int) get_transient( $transient );
    set_transient( $transient, $fail_count + 1, 30 * MINUTE_IN_SECONDS );
});
add_action( 'login_init', 'ahenk_limit_login_attempts' );

/* ============================================================
   7. UPLOADS KLASÖRÜNDE PHP ÇALIŞMAYI ENGELLE
   Bunu .htaccess ile de yapın ama çift güvenlik için burada da.
   ============================================================ */
function ahenk_block_php_uploads() {
    $upload_dir = wp_upload_dir();
    $htaccess   = $upload_dir['basedir'] . '/.htaccess';
    if ( ! file_exists( $htaccess ) ) {
        $content = "# Ahenk Haber Güvenlik Kuralı\n";
        $content .= "<FilesMatch '\.(php|php3|php4|php5|phtml|pl|py|jsp|asp|sh|cgi)$'>\n";
        $content .= "    Order Allow,Deny\n";
        $content .= "    Deny from all\n";
        $content .= "</FilesMatch>\n";
        file_put_contents( $htaccess, $content );
    }
}
add_action( 'after_setup_theme', 'ahenk_block_php_uploads' );

/* ============================================================
   8. REST API KISITLAMA (Giriş yapmamış kullanıcılar için kullanıcı listesi gizleme)
   ============================================================ */
add_filter( 'rest_endpoints', function( $endpoints ) {
    if ( ! is_user_logged_in() ) {
        if ( isset( $endpoints['/wp/v2/users'] ) ) {
            unset( $endpoints['/wp/v2/users'] );
        }
        if ( isset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] ) ) {
            unset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] );
        }
    }
    return $endpoints;
});

/* ============================================================
   9. YORUM SPAM KORUMASI
   ============================================================ */
function ahenk_yorum_honeypot_check( $commentdata ) {
    // Honeypot alanı doluysa bot olarak işaretle
    if ( ! empty( $_POST['website_url_field'] ) ) {
        wp_die( 'Spam tespit edildi.', 'Hata', array( 'response' => 403 ) );
    }
    return $commentdata;
}
add_filter( 'preprocess_comment', 'ahenk_yorum_honeypot_check' );

/* ============================================================
   10. ENUMARASYON ENGELİ (yazar slug'ı üzerinden kullanıcı adı tespiti)
   ============================================================ */
add_action( 'template_redirect', function() {
    if ( is_author() ) {
        $author = get_queried_object();
        if ( $author && isset( $author->user_login ) ) {
            // URL'de user_login yerine display_name kullan
            if ( isset( $_GET['author'] ) && is_numeric( $_GET['author'] ) ) {
                wp_redirect( home_url(), 301 );
                exit;
            }
        }
    }
});
