<?php
/**
 * Video TV Modülü — Ahenk Ai İçerik Robotu içine gömülmüş bootstrap.
 * Orijinal eklenti "Video TV - Ahenk Haber" v1.1.0'dan uyarlanmıştır.
 * Standalone admin menüsü kaldırıldı, tüm sayfalar ana eklentinin "Ahenk Ai İçerik Robotu"
 * menüsü altına alt-sayfa olarak eklenir.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

if ( ! defined( 'VTV_VER' ) ) define( 'VTV_VER', '1.2.0' );
if ( ! defined( 'VTV_DIR' ) ) define( 'VTV_DIR', plugin_dir_path( __FILE__ ) );
if ( ! defined( 'VTV_URL' ) ) define( 'VTV_URL', plugin_dir_url( __FILE__ ) );

require_once VTV_DIR . 'includes/db.php';
require_once VTV_DIR . 'includes/fetch.php';
require_once VTV_DIR . 'includes/ajax.php';
require_once VTV_DIR . 'includes/shortcode.php';
require_once VTV_DIR . 'includes/channels_preset.php';
require_once VTV_DIR . 'includes/bloklar.php';
require_once VTV_DIR . 'admin/admin.php';

add_action( 'plugins_loaded', 'ahenk_vtv_boot', 20 );
function ahenk_vtv_boot() {
    if ( class_exists( 'VTV_DB' ) )        { VTV_DB::init(); VTV_DB::ensure_video_flag_columns(); }
    if ( class_exists( 'VTV_Ajax' ) )      VTV_Ajax::init();
    if ( class_exists( 'VTV_Shortcode' ) ) VTV_Shortcode::init();
    if ( class_exists( 'VTV_Bloklar' ) )   VTV_Bloklar::init();
    if ( class_exists( 'VTV_Admin' ) )     VTV_Admin::init();
}

/* Tablo kurulumu — ana eklentinin activation hook'u içinden tetiklenir */
function ahenk_vtv_activate() {
    if ( class_exists( 'VTV_DB' ) ) {
        VTV_DB::create_tables();
    }
}

/* ── Tema entegrasyon CSS'i ─────────────────────── */
add_action( 'wp_head', function() {
    $ana_renk = get_theme_mod( 'ahenk_renk_ana', '#CC0000' );
    $ikincil  = get_theme_mod( 'ahenk_renk_ikincil', '#1A4A8A' );
    echo '<style id="vtv-tema-uyum">
    .vtv-app {
        --acc:  ' . esc_attr( $ana_renk ) . ';
        --acc2: ' . esc_attr( $ana_renk ) . 'CC;
        --blu:  ' . esc_attr( $ikincil ) . ';
        border-radius: 12px;
        font-family: "Segoe UI",Tahoma,Arial,sans-serif;
    }
    .vtv-search-btn { background: ' . esc_attr( $ana_renk ) . '; }
    .vtv-search-btn:hover { background: ' . esc_attr( $ana_renk ) . 'CC; }
    .vtv-sb-link.vtv-sb-active { border-left-color: ' . esc_attr( $ana_renk ) . '; background: ' . esc_attr( $ana_renk ) . '14; }
    .vtv-logo { color: ' . esc_attr( $ana_renk ) . '; }
    .vtv-badge-hot { background: ' . esc_attr( $ana_renk ) . '; }
    .vtv-play-btn-big { background: ' . esc_attr( $ana_renk ) . '; }
    .vtv-play-btn-big:hover { background: ' . esc_attr( $ana_renk ) . 'CC; }
    .vtv-tag { background: ' . esc_attr( $ana_renk ) . '22; color: ' . esc_attr( $ana_renk ) . '; border: 1px solid ' . esc_attr( $ana_renk ) . '44; }
    </style>' . "\n";
});
