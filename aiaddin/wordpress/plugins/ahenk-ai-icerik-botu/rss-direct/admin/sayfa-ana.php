<?php
/**
 * AHB - Admin Sayfalari Ana Dosyasi
 */
if ( ! defined( 'ABSPATH' ) ) exit;

require_once AHBRSS_DIR . 'admin/sayfa-kampanyalar.php';
require_once AHBRSS_DIR . 'admin/sayfa-duzenle.php';
require_once AHBRSS_DIR . 'admin/sayfa-loglar.php';
require_once AHBRSS_DIR . 'admin/sayfa-ayarlar.php';

/* ── Admin Menuleri ────────────────────────────────────────── */
add_action('admin_menu', function() {
    add_menu_page(
        'Ahenk Haber Botu',
        '🤖 Haber Botu',
        'manage_options',
        'ahbrss-kampanyalar',
        'ahbrss_sayfa_kampanyalar',
        'dashicons-rss',
        3
    );
    add_submenu_page('ahbrss-kampanyalar', 'Kampanyalar',       'Kampanyalar',       'manage_options', 'ahbrss-kampanyalar',    'ahbrss_sayfa_kampanyalar');
    add_submenu_page('ahbrss-kampanyalar', 'Yeni Kampanya',     'Yeni Kampanya',     'manage_options', 'ahbrss-kampanya-ekle',  'ahbrss_sayfa_kampanya_duzenle');
    add_submenu_page('ahbrss-kampanyalar', 'Islem Loglari',     'Islem Loglari',     'manage_options', 'ahbrss-loglar',         'ahbrss_sayfa_loglar');
    add_submenu_page('ahbrss-kampanyalar', 'Bot Ayarlari',      'Bot Ayarlari',      'manage_options', 'ahbrss-ayarlar',        'ahbrss_sayfa_ayarlar');
    add_submenu_page(null, 'Kampanya Duzenle', 'Kampanya Duzenle', 'manage_options', 'ahbrss-kampanya-duzenle', 'ahbrss_sayfa_kampanya_duzenle');
});

/* ── Admin CSS/JS ──────────────────────────────────────────── */
add_action('admin_enqueue_scripts', function($hook) {
    $page = isset($_GET['page']) ? sanitize_key($_GET['page']) : '';
    $is_ahbrss_page = ( strpos($page, 'ahbrss') === 0 ) || ( $page === 'ai-haber-botu' );
    if ( ! $is_ahbrss_page && strpos($hook, 'ahb-') === false && strpos($hook, 'haber-botu') === false ) return;
    wp_enqueue_style('ahbrss-admin-css', AHBRSS_URI . 'assets/css/admin.css', array(), AHBRSS_VERSION);
    wp_enqueue_script('ahbrss-admin-js', AHBRSS_URI . 'assets/js/admin.js', array('jquery'), AHBRSS_VERSION, true);
    wp_localize_script('ahbrss-admin-js', 'ahbrssData', array(
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce'   => wp_create_nonce('ahbrss_nonce'),
    ));
});

/* ── AJAX: Manuel Kampanya Calistir ───────────────────────── */
add_action('wp_ajax_ahbrss_kampanya_isle', function() {
    check_ajax_referer('ahbrss_nonce', 'nonce');
    if ( ! current_user_can('manage_options') ) wp_send_json_error('Yetki yok.');

    $kid = absint($_POST['kampanya_id'] ?? 0);
    if ( ! $kid ) wp_send_json_error('Gecersiz kampanya ID.');

    $sonuc = AHBRSS_Kampanya::kampanyayi_isle($kid);

    if ( isset($sonuc['hata']) ) {
        wp_send_json_error($sonuc['hata']);
    }

    wp_send_json_success(array(
        'mesaj'   => "Islem tamamlandi: {$sonuc['eklenen']} eklendi, {$sonuc['atlanan']} atlandi, {$sonuc['hatalar']} hata.",
        'eklenen' => $sonuc['eklenen'],
        'atlanan' => $sonuc['atlanan'],
        'hatalar' => $sonuc['hatalar'],
    ));
});

/* ── AJAX: Kampanya Durum Toggle ──────────────────────────── */
add_action('wp_ajax_ahbrss_durum_degistir', function() {
    check_ajax_referer('ahbrss_nonce', 'nonce');
    if ( ! current_user_can('manage_options') ) wp_send_json_error('Yetki yok.');

    $kid   = absint($_POST['kampanya_id'] ?? 0);
    $durum = absint($_POST['durum'] ?? 0);

    if ( ! $kid ) wp_send_json_error('Gecersiz ID.');
    AHBRSS_Veritabani::kampanya_kaydet(array('durum'=>$durum), $kid);
    wp_send_json_success(array('yeni_durum'=>$durum));
});

/* ── AJAX: Kampanya Sifirla ───────────────────────────────── */
add_action('wp_ajax_ahbrss_sifirla', function() {
    check_ajax_referer('ahbrss_nonce', 'nonce');
    if ( ! current_user_can('manage_options') ) wp_send_json_error('Yetki yok.');
    $kid = absint($_POST['kampanya_id'] ?? 0);
    AHBRSS_Kampanya::islenen_sifirla($kid);
    wp_send_json_success('Islenen linkler sifirland.');
});

/* ── AJAX: Log Temizle ────────────────────────────────────── */
add_action('wp_ajax_ahbrss_log_temizle', function() {
    check_ajax_referer('ahbrss_nonce', 'nonce');
    if ( ! current_user_can('manage_options') ) wp_send_json_error('Yetki yok.');
    $kid = absint($_POST['kampanya_id'] ?? 0);
    AHBRSS_Veritabani::log_temizle($kid);
    wp_send_json_success('Log temizlendi.');
});

/* ── AJAX: Duplicate Temizle (mukerrer haberleri sil) ─────── */
add_action('wp_ajax_ahbrss_duplicate_temizle', function() {
    check_ajax_referer('ahbrss_nonce', 'nonce');
    if ( ! current_user_can('manage_options') ) wp_send_json_error('Yetki yok.');

    @set_time_limit(0);
    $sonuc = AHBRSS_Veritabani::duplicate_temizle();
    wp_send_json_success(array(
        'mesaj' => sprintf(
            'Tamam: %d mukerrer haber silindi, %d tekrar kayit temizlendi.',
            (int)$sonuc['silinen_post'],
            (int)$sonuc['silinen_kayit']
        ),
        'silinen_post'  => (int)$sonuc['silinen_post'],
        'silinen_kayit' => (int)$sonuc['silinen_kayit'],
    ));
});
