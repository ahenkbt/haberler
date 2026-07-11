<?php
/**
 * Ahenk Haber - Ana Functions Dosyası
 * Tüm modüller buradan yüklenir.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'AHENK_VERSION', '3.0.0' );
define( 'AHENK_DIR',     get_template_directory() );
define( 'AHENK_URI',     get_template_directory_uri() );

/* ============================================================
   MODÜLLER
   ============================================================ */
require_once AHENK_DIR . '/inc/custom-post-types.php';
require_once AHENK_DIR . '/inc/security.php';
require_once AHENK_DIR . '/inc/widgets.php';
require_once AHENK_DIR . '/inc/helpers.php';
require_once AHENK_DIR . '/inc/admin-settings.php';

/* ============================================================
   TEMA DESTEKLERİ
   ============================================================ */
function ahenk_tema_destekleri() {
    // Temel destekler
    add_theme_support( 'title-tag' );
    add_theme_support( 'post-thumbnails' );
    add_theme_support( 'html5', array(
        'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script'
    ));
    add_theme_support( 'automatic-feed-links' );
    add_theme_support( 'customize-selective-refresh-widgets' );
    add_theme_support( 'responsive-embeds' );
    add_theme_support( 'wp-block-styles' );

    // Özel logo
    add_theme_support( 'custom-logo', array(
        'height'      => 60,
        'width'       => 200,
        'flex-height' => true,
        'flex-width'  => true,
    ));

    // Özel arka plan
    add_theme_support( 'custom-background', array(
        'default-color' => 'f5f5f5',
    ));

    // Resim boyutları
    add_image_size( 'ahenk-manset',    900, 500, true );
    add_image_size( 'ahenk-kart',      400, 260, true );
    add_image_size( 'ahenk-kucuk',     150, 100, true );
    add_image_size( 'ahenk-genis',    1200, 600, true );
    add_image_size( 'ahenk-yazar',     200, 200, true );
    add_image_size( 'ahenk-galeri',    800, 600, true );

    // Menüler
    register_nav_menus( array(
        'ust-menu'   => 'Üst Utility Menü',
        'ana-menu'   => 'Ana Navigasyon Menü',
        'footer-menu' => 'Footer Menü',
    ));
}
add_action( 'after_setup_theme', 'ahenk_tema_destekleri' );

/* ============================================================
   DİL DESTEĞİ
   ============================================================ */
function ahenk_dil_yukle() {
    load_theme_textdomain( 'ahenk-haber', AHENK_DIR . '/languages' );
}
add_action( 'after_setup_theme', 'ahenk_dil_yukle' );

/* ============================================================
   CSS / JS YÜKLEME
   ============================================================ */
function ahenk_scripts_styles() {

    // --- STİLLER ---
    wp_enqueue_style(
        'ahenk-main',
        AHENK_URI . '/assets/css/main.css',
        array(),
        AHENK_VERSION
    );

    // Swiper.js (Manşet Slider)
    wp_enqueue_style(
        'swiper',
        'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
        array(),
        '11'
    );

    // Font Awesome ikonlar
    wp_enqueue_style(
        'font-awesome',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
        array(),
        '6.5.0'
    );

    // --- SCRİPTLER ---
    // jQuery (WordPress varsayılanı)
    wp_enqueue_script( 'jquery' );

    // Swiper.js
    wp_enqueue_script(
        'swiper',
        'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
        array(),
        '11',
        true
    );

    // Ana tema scripti
    wp_enqueue_script(
        'ahenk-main',
        AHENK_URI . '/assets/js/main.js',
        array( 'jquery', 'swiper' ),
        AHENK_VERSION,
        true
    );

    // AJAX URL ve güvenlik nonce
    wp_localize_script( 'ahenk-main', 'ahenkAjax', array(
        'ajaxurl'   => admin_url( 'admin-ajax.php' ),
        'nonce'     => wp_create_nonce( 'ahenk_ajax_nonce' ),
        'siteurl'   => home_url(),
        'whatsapp'  => esc_attr( get_option( 'ahenk_whatsapp', '' ) ),
    ));

    // Tekil haber sayfasında paylaşım scripti
    if ( is_singular() ) {
        wp_enqueue_script(
            'ahenk-share',
            AHENK_URI . '/assets/js/share.js',
            array( 'jquery' ),
            AHENK_VERSION,
            true
        );
    }
}
add_action( 'wp_enqueue_scripts', 'ahenk_scripts_styles' );

/* ============================================================
   ADMİN CSS
   ============================================================ */
function ahenk_admin_styles() {
    wp_enqueue_style(
        'ahenk-admin',
        AHENK_URI . '/assets/css/admin.css',
        array(),
        AHENK_VERSION
    );
}
add_action( 'admin_enqueue_scripts', 'ahenk_admin_styles' );

/* ============================================================
   ARAMA FORMU ÖZEL TASARIM
   ============================================================ */
function ahenk_search_form( $form ) {
    $form = '<form role="search" method="get" class="ahenk-search-form" action="' . esc_url( home_url('/') ) . '">
        <input type="search" class="search-input" placeholder="' . esc_attr__('Haberlerde ara...', 'ahenk-haber') . '" value="' . esc_attr( get_search_query() ) . '" name="s" />
        <button type="submit" class="search-btn" aria-label="Ara">
            <i class="fa fa-search"></i>
        </button>
    </form>';
    return $form;
}
add_filter( 'get_search_form', 'ahenk_search_form' );

/* ============================================================
   EXCERPT UZUNLUĞU
   ============================================================ */
add_filter( 'excerpt_length', function() { return 25; }, 999 );
add_filter( 'excerpt_more', function() { return '...'; } );

/* ============================================================
   BODY CLASS EKLEMELERİ
   ============================================================ */
add_filter( 'body_class', function( $classes ) {
    if ( is_singular( 'haber' ) ) $classes[] = 'haber-detay';
    if ( is_tax( 'haber-kategorisi' ) ) $classes[] = 'kategori-arsiv';
    if ( is_front_page() ) $classes[] = 'ana-sayfa';
    return $classes;
});

/* ============================================================
   AJAX: SON DAKİKA HABERLERI YENILE
   ============================================================ */
function ahenk_ajax_son_dakika() {
    check_ajax_referer( 'ahenk_ajax_nonce', 'nonce' );
    $haberler = ahenk_son_dakika_haberleri( 20 );
    $items = array();
    if ( $haberler->have_posts() ) {
        while ( $haberler->have_posts() ) {
            $haberler->the_post();
            $items[] = array(
                'baslik' => esc_html( get_the_title() ),
                'url'    => esc_url( get_permalink() ),
            );
        }
        wp_reset_postdata();
    }
    wp_send_json_success( $items );
}
add_action( 'wp_ajax_nopriv_ahenk_son_dakika', 'ahenk_ajax_son_dakika' );
add_action( 'wp_ajax_ahenk_son_dakika', 'ahenk_ajax_son_dakika' );

/* ============================================================
   TEMA AYARLARI (wp_options)
   ============================================================ */
function ahenk_get_option( $key, $default = '' ) {
    return get_option( 'ahenk_' . $key, $default );
}

/* ============================================================
   REWRITE RULES FLUSH - Tema aktifleştirildiğinde
   ============================================================ */
function ahenk_aktivasyon() {
    ahenk_register_cpt_haber();
    ahenk_register_cpt_kose();
    ahenk_register_cpt_foto();
    ahenk_register_cpt_video();
    ahenk_register_cpt_resmi_ilan();
    ahenk_register_cpt_seri_ilan();
    ahenk_register_taxonomies();
    flush_rewrite_rules();
}
add_action( 'after_switch_theme', 'ahenk_aktivasyon' );

/* ══════════════════════════════════════════════════════
   NAVBAR SLUG'LARI - Çoklu kaynak desteği
══════════════════════════════════════════════════════ */
if ( ! function_exists('ahenk_navbar_sluglari_al') ) {
    function ahenk_navbar_sluglari_al() {
        // 1. Önce ahenk-yonetici eklentisinin kaydettiği option'ı dene
        $sluglar = get_option('ahenk_navbar_sluglar_option', '');
        // 2. Sonra customizer theme_mod'u dene
        if ( empty($sluglar) ) {
            $sluglar = get_theme_mod('ahenk_navbar_sluglar', '');
        }
        // 3. Varsayılan
        if ( empty($sluglar) ) {
            $sluglar = 'gundem,ankara,dunya,spor';
        }
        return $sluglar;
    }
}

/* Anasayfa kategori slug'larını al */
if ( ! function_exists('ahenk_anasayfa_katlari_al') ) {
    function ahenk_anasayfa_katlari_al() {
        return array(
            get_theme_mod('ahenk_anasayfa_kat_1', 'gundem'),
            get_theme_mod('ahenk_anasayfa_kat_2', 'ankara'),
            get_theme_mod('ahenk_anasayfa_kat_3', 'dunya'),
            get_theme_mod('ahenk_anasayfa_kat_4', 'spor'),
        );
    }
}

/* Mobil için viewport ayarı */
add_filter('jetpack_photon_default_args', function($args){ return $args; });

/* Admin panelinde çift CPT menüsünü gizle */
add_action('admin_menu', 'ahenk_admin_menu_duzelt', 999);
function ahenk_admin_menu_duzelt() {
    // kose-yazisi CPT menüsünü gizle (eklenti varsa o halleder)
    if ( function_exists('ky_rewrite_ekle') ) {
        remove_menu_page('edit.php?post_type=kose-yazisi');
    }
}

/* ══════════════════════════════════════════════════════
   WP NAV MENU - Ana menü CSS sınıfı düzeltmesi
══════════════════════════════════════════════════════ */
add_filter('nav_menu_css_class', 'ahenk_nav_menu_css', 10, 3);
function ahenk_nav_menu_css($classes, $item, $args) {
    if (isset($args->theme_location) && $args->theme_location === 'ana-menu') {
        $classes[] = 'menu-item';
        // Alt menüsü olan öğelere has-sub ekle
        if (in_array('menu-item-has-children', $classes)) {
            $classes[] = 'has-sub';
        }
    }
    return $classes;
}

// Mobil drawer'ın WP menüsüne link class'ları ekle
add_filter('nav_menu_link_attributes', 'ahenk_drawer_menu_attrs', 10, 3);
function ahenk_drawer_menu_attrs($atts, $item, $args) {
    return $atts;
}

/* ══════════════════════════════════════════════════════
   ARAMA FORMU - Özelleştirilmiş
══════════════════════════════════════════════════════ */
add_filter('get_search_form', 'ahenk_arama_formu');
function ahenk_arama_formu($form) {
    return '<form class="ahenk-search-form" role="search" method="get" action="' . esc_url(home_url('/')) . '">
        <input type="search" class="search-input" placeholder="Haber ara..." value="' . get_search_query() . '" name="s" autocomplete="off">
        <button type="submit" class="search-btn" aria-label="Ara"><i class="fa fa-search"></i></button>
    </form>';
}

/* ══════════════════════════════════════════════════════
   AHENK HABER v3 — BİRPORTAL ÖZELLİKLERİ EKLEMELERİ
══════════════════════════════════════════════════════ */

/* Trend haberler sayfası için rewrite */
add_action('init', function(){
    add_rewrite_rule('^trendler/?$', 'index.php?pagename=trendler', 'top');
    add_rewrite_rule('^yazarlar/?$', 'index.php?pagename=yazarlar', 'top');
});

/* Yazar meta alanları (Birportal kullanıcı profil uyumu) */
add_action('show_user_profile', 'ahenk_yazar_meta_alanlari');
add_action('edit_user_profile', 'ahenk_yazar_meta_alanlari');
function ahenk_yazar_meta_alanlari($user){
    ?>
    <h3>✍ Yazar Bilgileri (Ahenk Haber)</h3>
    <table class="form-table">
        <tr><th><label for="yazar_unvani">Unvan / Pozisyon</label></th>
            <td><input type="text" name="yazar_unvani" id="yazar_unvani" value="<?php echo esc_attr(get_user_meta($user->ID,'yazar_unvani',true)); ?>" class="regular-text"></td></tr>
        <tr><th><label for="yazar_facebook">Facebook URL</label></th>
            <td><input type="url" name="yazar_facebook" id="yazar_facebook" value="<?php echo esc_url(get_user_meta($user->ID,'yazar_facebook',true)); ?>" class="regular-text"></td></tr>
        <tr><th><label for="yazar_twitter">Twitter / X URL</label></th>
            <td><input type="url" name="yazar_twitter" id="yazar_twitter" value="<?php echo esc_url(get_user_meta($user->ID,'yazar_twitter',true)); ?>" class="regular-text"></td></tr>
        <tr><th><label for="yazar_instagram">Instagram URL</label></th>
            <td><input type="url" name="yazar_instagram" id="yazar_instagram" value="<?php echo esc_url(get_user_meta($user->ID,'yazar_instagram',true)); ?>" class="regular-text"></td></tr>
    </table>
    <?php
}

add_action('personal_options_update', 'ahenk_yazar_meta_kaydet');
add_action('edit_user_profile_update', 'ahenk_yazar_meta_kaydet');
function ahenk_yazar_meta_kaydet($user_id){
    if (!current_user_can('edit_user',$user_id)) return;
    foreach(['yazar_unvani','yazar_facebook','yazar_twitter','yazar_instagram'] as $field){
        if(isset($_POST[$field])) update_user_meta($user_id, $field, sanitize_text_field($_POST[$field]));
    }
}

/* Trend haberler sayfası template yönlendirme */
add_filter('template_include', function($template){
    if (is_page('trendler')) {
        $t = locate_template('trendler.php');
        if ($t) return $t;
    }
    if (is_page('yazarlar')) {
        $t = locate_template('yazarlar.php');
        if ($t) return $t;
    }
    return $template;
});

/* Kurulum rehberi admin notu */
add_action('admin_notices', function(){
    $screen = get_current_screen();
    if ($screen && $screen->id === 'dashboard') {
        $template = get_template();
        if ($template === 'ahenk-haber') {
            echo '<div class="notice notice-info is-dismissible">';
            echo '<p>🗞 <strong>Ahenk Haber v3</strong> aktif. <a href="'.admin_url('admin.php?page=ahenk-kurulum').'">📖 Kurulum Rehberi</a>\'ni inceleyin.</p>';
            echo '</div>';
        }
    }
});

/* OpenGraph meta tags (Birportal uyumlu) */
add_action('wp_head', function(){
    if (is_singular()) {
        global $post;
        echo '<meta property="og:locale" content="tr_TR">'."\n";
        echo '<meta property="og:type" content="article">'."\n";
        echo '<meta property="og:title" content="'.esc_attr(get_the_title()).'" />'."\n";
        echo '<meta property="og:site_name" content="'.esc_attr(get_bloginfo('name')).'" />'."\n";
        echo '<meta property="og:url" content="'.esc_url(get_permalink()).'" />'."\n";
        if (has_post_thumbnail()) {
            $thumb = wp_get_attachment_image_src(get_post_thumbnail_id(), 'large');
            if ($thumb) echo '<meta property="og:image" content="'.esc_url($thumb[0]).'" />'."\n";
        }
        $spot = get_post_meta(get_the_ID(),'_haber_spot',true);
        if ($spot) echo '<meta property="og:description" content="'.esc_attr($spot).'" />'."\n";
        elseif ($desc = get_the_excerpt()) echo '<meta property="og:description" content="'.esc_attr($desc).'" />'."\n";
    }
}, 1);

/* Kategori haberleri sorgu yardımcısı */
if (!function_exists('ahenk_kategori_haberleri')) {
    function ahenk_kategori_haberleri($slug, $limit=5) {
        $tax = taxonomy_exists('haber-kategorisi') ? 'haber-kategorisi' : 'category';
        return new WP_Query(array(
            'post_type'      => array('haber','post'),
            'post_status'    => 'publish',
            'posts_per_page' => $limit,
            'tax_query'      => array(array('taxonomy'=>$tax,'field'=>'slug','terms'=>$slug)),
            'no_found_rows'  => true,
            'orderby'        => 'date',
            'order'          => 'DESC',
        ));
    }
}
