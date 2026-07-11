<?php
/**
 * Ahenk Haber - Ana Functions Dosyası
 * Tüm modüller buradan yüklenir.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'AHENK_VERSION', '1.0.0' );
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
require_once AHENK_DIR . '/inc/admin-cms.php';
require_once AHENK_DIR . '/inc/customizer.php';

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
   MANŞETTEN KALDIR - Post Yönetimi
   Manşet meta key: _manset_haberi = '1'
══════════════════════════════════════════════════════ */

// 1) Post listesinde "Manşetten Kaldır" / "Manşete Ekle" hızlı linki
add_filter('post_row_actions', 'ahenk_manset_row_actions', 10, 2);
add_filter('page_row_actions', 'ahenk_manset_row_actions', 10, 2);
function ahenk_manset_row_actions($actions, $post) {
    if (!current_user_can('edit_post', $post->ID)) return $actions;
    $is_manset = get_post_meta($post->ID, '_manset_haberi', true) === '1';
    $nonce     = wp_create_nonce('ahenk_manset_toggle_' . $post->ID);
    if ($is_manset) {
        $url = admin_url('admin-post.php?action=ahenk_manset_kaldir&post_id=' . $post->ID . '&_wpnonce=' . $nonce);
        $actions['ahenk_manset'] = '<a href="' . esc_url($url) . '" style="color:#d4af37;font-weight:700">🗑 Manşetten Kaldır</a>';
    } else {
        $url = admin_url('admin-post.php?action=ahenk_manset_ekle&post_id=' . $post->ID . '&_wpnonce=' . $nonce);
        $actions['ahenk_manset'] = '<a href="' . esc_url($url) . '" style="color:#2E7D32;font-weight:700">⭐ Manşete Ekle</a>';
    }
    return $actions;
}

// 2) Post edit sayfasında Manşet Meta Box
add_action('add_meta_boxes', function() {
    $types = array('haber','post');
    foreach ($types as $t) {
        add_meta_box('ahenk_manset_box','🗞 Manşet Durumu','ahenk_manset_metabox_html',$t,'side','high');
    }
});
function ahenk_manset_metabox_html($post) {
    $is_manset = get_post_meta($post->ID, '_manset_haberi', true) === '1';
    $nonce     = wp_create_nonce('ahenk_manset_toggle_' . $post->ID);
    if ($is_manset) {
        $url = admin_url('admin-post.php?action=ahenk_manset_kaldir&post_id=' . $post->ID . '&_wpnonce=' . $nonce);
        echo '<p style="margin:0 0 8px;color:#2E7D32;font-weight:700">✅ Bu yazı şu an manşette görünüyor.</p>';
        echo '<a href="' . esc_url($url) . '" class="button" style="color:#d4af37;border-color:#d4af37">🗑 Manşetten Kaldır</a>';
    } else {
        $url = admin_url('admin-post.php?action=ahenk_manset_ekle&post_id=' . $post->ID . '&_wpnonce=' . $nonce);
        echo '<p style="margin:0 0 8px;color:#888">Bu yazı manşette görünmüyor.</p>';
        echo '<a href="' . esc_url($url) . '" class="button button-primary">⭐ Manşete Ekle</a>';
    }
}

// 3) Action: Manşetten Kaldır
add_action('admin_post_ahenk_manset_kaldir', function() {
    $post_id = (int) ($_GET['post_id'] ?? 0);
    if (!$post_id || !current_user_can('edit_post', $post_id)) wp_die('Yetkisiz erişim.');
    if (!wp_verify_nonce($_GET['_wpnonce'] ?? '', 'ahenk_manset_toggle_' . $post_id)) wp_die('Geçersiz güvenlik kodu.');
    delete_post_meta($post_id, '_manset_haberi');
    wp_redirect(admin_url('edit.php?post_type=' . get_post_type($post_id) . '&ahenk_msg=manset_kaldirildi'));
    exit;
});

// 4) Action: Manşete Ekle
add_action('admin_post_ahenk_manset_ekle', function() {
    $post_id = (int) ($_GET['post_id'] ?? 0);
    if (!$post_id || !current_user_can('edit_post', $post_id)) wp_die('Yetkisiz erişim.');
    if (!wp_verify_nonce($_GET['_wpnonce'] ?? '', 'ahenk_manset_toggle_' . $post_id)) wp_die('Geçersiz güvenlik kodu.');
    update_post_meta($post_id, '_manset_haberi', '1');
    wp_redirect(admin_url('edit.php?post_type=' . get_post_type($post_id) . '&ahenk_msg=manset_eklendi'));
    exit;
});

// 5) Başarı/bilgi mesajı
add_action('admin_notices', function() {
    $msg = $_GET['ahenk_msg'] ?? '';
    if ($msg === 'manset_kaldirildi') echo '<div class="notice notice-success is-dismissible"><p>✅ Yazı manşetten kaldırıldı.</p></div>';
    if ($msg === 'manset_eklendi')    echo '<div class="notice notice-success is-dismissible"><p>⭐ Yazı manşete eklendi.</p></div>';
});

/* ══════════════════════════════════════════════════════
   NAVBAR ÖZEL LİNKLER - wp_nav_menu desteği
   Görünüm → Özelleştir → Ahenk Haber → Navbar Özel Linkler
══════════════════════════════════════════════════════ */
// Özel linkler artık WordPress menüsünden yönetiliyor (Görünüm → Menüler).
// wp_nav_menu_items filtresi kaldırıldı; menü dışı link enjeksiyonu yok.
function ahenk_navbar_ozel_link_ekle( $items, $args ) { return $items; }

/* ============================================================
   AHENK INFINITE SCROLL - Anasayfa "Tüm Haberler" AJAX
   ============================================================ */
add_action( 'wp_ajax_ahenk_inf_haberler',        'ahenk_ajax_inf_haberler' );
add_action( 'wp_ajax_nopriv_ahenk_inf_haberler', 'ahenk_ajax_inf_haberler' );

function ahenk_ajax_inf_haberler() {
    check_ajax_referer( 'ahenk_inf_nonce', 'nonce' );

    $page     = max( 1, (int) ( $_POST['page']     ?? 1 ) );
    $per_page = (int) ( $_POST['per_page'] ?? 9 );
    if ( $per_page < 1 || $per_page > 30 ) $per_page = 9;

    $q = new WP_Query( array(
        'post_type'           => array( 'haber', 'post' ),
        'post_status'         => 'publish',
        'posts_per_page'      => $per_page,
        'paged'               => $page,
        'orderby'             => 'date',
        'order'               => 'DESC',
        'ignore_sticky_posts' => true,
    ) );

    if ( ! $q->have_posts() ) {
        wp_send_json_success( array( 'html' => '', 'done' => true ) );
    }

    ob_start();
    while ( $q->have_posts() ) :
        $q->the_post();
        $ihid   = get_the_ID();
        $ihkats = get_the_terms( $ihid, 'haber-kategorisi' );
        if ( ! $ihkats || is_wp_error( $ihkats ) ) $ihkats = get_the_category();
        $ihkat  = ! empty( $ihkats ) ? $ihkats[0] : null;
        $ihrenk = $ihkat && function_exists('ahenk_kategori_rengi') ? ahenk_kategori_rengi( $ihkat->term_id ) : '#D4AF37';
        $thumb  = function_exists('ahenk_thumb_url') ? ahenk_thumb_url( $ihid, 'ahenk-kart' ) : ( get_the_post_thumbnail_url( $ihid, 'medium' ) ?: '' );
        $tarih  = function_exists('ahenk_turkce_tarih') ? ahenk_turkce_tarih( null, 'short' ) : get_the_date();
    ?>
    <article class="ahenk-inf-kart" style="background:#fff;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;display:flex;flex-direction:column">
        <a href="<?php the_permalink(); ?>" style="display:block;text-decoration:none;color:inherit">
            <div style="height:150px;background:#f0f0f0;overflow:hidden">
                <img src="<?php echo esc_url( $thumb ); ?>" alt="<?php echo esc_attr( get_the_title() ); ?>" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy">
            </div>
            <div style="padding:10px 12px 12px">
                <?php if ( $ihkat ) : ?>
                    <span style="display:block;font-size:10px;font-weight:800;color:<?php echo esc_attr( $ihrenk ); ?>;text-transform:uppercase;margin-bottom:4px"><?php echo esc_html( $ihkat->name ); ?></span>
                <?php endif; ?>
                <h3 style="font-size:14px;font-weight:700;line-height:1.4;color:#1a1a1a;margin:0 0 6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><?php the_title(); ?></h3>
                <div style="font-size:11px;color:#999"><i class="fa fa-clock"></i> <?php echo esc_html( $tarih ); ?></div>
            </div>
        </a>
    </article>
    <?php
    endwhile;
    wp_reset_postdata();

    $html = ob_get_clean();
    $done = ( $page >= (int) $q->max_num_pages );

    wp_send_json_success( array(
        'html' => $html,
        'done' => $done,
        'page' => $page,
        'max'  => (int) $q->max_num_pages,
    ) );
}

/* ============================================================
   AHENK INFINITE NEWS - Tek haber sayfasında sonsuz haber döngüsü
   Kullanıcı haber okumayı bitirince bir sonraki haberi otomatik yükler
   ============================================================ */
add_action( 'wp_ajax_ahenk_inf_haber_detay',        'ahenk_ajax_inf_haber_detay' );
add_action( 'wp_ajax_nopriv_ahenk_inf_haber_detay', 'ahenk_ajax_inf_haber_detay' );

function ahenk_ajax_inf_haber_detay() {
    check_ajax_referer( 'ahenk_inf_nonce', 'nonce' );

    // Daha önce gösterilen haber ID'leri (tekrar göstermemek için)
    $haric = isset( $_POST['haric'] ) ? array_map( 'intval', (array) $_POST['haric'] ) : array();
    $haric = array_filter( array_unique( $haric ) );

    $kat_id = isset( $_POST['kat_id'] ) ? (int) $_POST['kat_id'] : 0;

    $args = array(
        'post_type'           => array( 'haber', 'post' ),
        'post_status'         => 'publish',
        'posts_per_page'      => 1,
        'orderby'             => 'date',
        'order'               => 'DESC',
        'ignore_sticky_posts' => true,
        'post__not_in'        => $haric,
        'no_found_rows'       => true,
    );

    // Mümkünse aynı kategoriden devam et
    if ( $kat_id > 0 ) {
        $args['tax_query'] = array(
            'relation' => 'OR',
            array(
                'taxonomy' => 'haber-kategorisi',
                'field'    => 'term_id',
                'terms'    => $kat_id,
            ),
            array(
                'taxonomy' => 'category',
                'field'    => 'term_id',
                'terms'    => $kat_id,
            ),
        );
    }

    $q = new WP_Query( $args );

    // Aynı kategoride bitti — tüm sitedeki başka haberleri sırayla göster
    if ( ! $q->have_posts() && $kat_id > 0 ) {
        unset( $args['tax_query'] );
        $q = new WP_Query( $args );
    }

    // Hiç haber kalmadı — döngüyü baştan sar (haric listesini temizle)
    if ( ! $q->have_posts() ) {
        $args['post__not_in'] = array();
        $q = new WP_Query( $args );
    }

    if ( ! $q->have_posts() ) {
        wp_send_json_success( array( 'html' => '', 'done' => true ) );
    }

    $q->the_post();
    $ihid     = get_the_ID();
    $ihkats   = get_the_terms( $ihid, 'haber-kategorisi' );
    if ( ! $ihkats || is_wp_error( $ihkats ) ) $ihkats = get_the_category();
    $ihkat    = ! empty( $ihkats ) ? $ihkats[0] : null;
    $ihrenk   = $ihkat && function_exists('ahenk_kategori_rengi') ? ahenk_kategori_rengi( $ihkat->term_id ) : '#D4AF37';
    $ihthumb  = function_exists('ahenk_thumb_url') ? ahenk_thumb_url( $ihid, 'ahenk-genis' ) : ( get_the_post_thumbnail_url( $ihid, 'large' ) ?: '' );
    $ihtarih  = function_exists('ahenk_turkce_tarih') ? ahenk_turkce_tarih( $ihid ) : get_the_date( '', $ihid );
    $ihspot   = get_post_meta( $ihid, '_haber_spot', true );
    $ihicerik = apply_filters( 'the_content', get_the_content() );
    $ihlink   = get_permalink( $ihid );
    $ihbaslik = get_the_title( $ihid );

    ob_start(); ?>
    <article class="ahenk-inf-haber haber-detay-icerik"
             data-haber-id="<?php echo esc_attr( $ihid ); ?>"
             data-haber-url="<?php echo esc_url( $ihlink ); ?>"
             data-haber-baslik="<?php echo esc_attr( $ihbaslik ); ?>"
             data-kat-id="<?php echo esc_attr( $ihkat ? $ihkat->term_id : 0 ); ?>"
             style="border-top:6px double #e5e5e5;margin-top:40px;padding-top:30px">

        <div class="ahenk-inf-sonraki-etiket" style="display:inline-block;background:<?php echo esc_attr( $ihrenk ); ?>;color:#fff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;padding:4px 12px;border-radius:20px;margin-bottom:14px">
            <i class="fa fa-arrow-down"></i> Sıradaki Haber
        </div>

        <?php if ( $ihkat ) : ?>
            <a href="<?php echo esc_url( get_term_link( $ihkat ) ); ?>"
               class="haber-detay-kategori"
               style="color:<?php echo esc_attr( $ihrenk ); ?>;border-color:<?php echo esc_attr( $ihrenk ); ?>">
                <?php echo esc_html( $ihkat->name ); ?>
            </a>
        <?php endif; ?>

        <h2 class="haber-detay-baslik" style="font-size:28px;font-weight:900;line-height:1.3;margin:10px 0 14px">
            <a href="<?php echo esc_url( $ihlink ); ?>" style="color:#1a1a1a;text-decoration:none"><?php echo esc_html( $ihbaslik ); ?></a>
        </h2>

        <?php if ( $ihspot ) : ?>
            <p class="haber-detay-spot" style="font-size:16px;color:#555;line-height:1.5;margin-bottom:14px"><?php echo esc_html( $ihspot ); ?></p>
        <?php endif; ?>

        <div class="haber-detay-meta" style="font-size:12px;color:#999;margin-bottom:18px">
            <i class="fa fa-calendar"></i> <?php echo esc_html( $ihtarih ); ?>
        </div>

        <?php if ( $ihthumb ) : ?>
            <div class="haber-detay-resim" style="margin-bottom:20px">
                <img src="<?php echo esc_url( $ihthumb ); ?>" alt="<?php echo esc_attr( $ihbaslik ); ?>" style="width:100%;height:auto;display:block;border-radius:8px" loading="lazy">
            </div>
        <?php endif; ?>

        <div class="haber-icerik entry-content">
            <?php echo $ihicerik; ?>
        </div>

        <div style="text-align:center;margin-top:20px">
            <a href="<?php echo esc_url( $ihlink ); ?>" style="display:inline-block;background:<?php echo esc_attr( $ihrenk ); ?>;color:#fff;padding:8px 18px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700">
                <i class="fa fa-link"></i> Bu Haberin Sayfası
            </a>
        </div>
    </article>
    <?php
    wp_reset_postdata();
    $html = ob_get_clean();

    wp_send_json_success( array(
        'html'   => $html,
        'id'     => $ihid,
        'url'    => $ihlink,
        'baslik' => $ihbaslik,
        'kat_id' => $ihkat ? (int) $ihkat->term_id : 0,
        'done'   => false,
    ) );
}

/* ══════════════════════════════════════════════════════
   SON DAKİKA EKLE / KALDIR - Post Yönetimi (Meta: _son_dakika)
══════════════════════════════════════════════════════ */
add_filter('post_row_actions', 'ahenk_sondakika_row_actions', 11, 2);
add_filter('page_row_actions', 'ahenk_sondakika_row_actions', 11, 2);
function ahenk_sondakika_row_actions($actions, $post) {
    if ( ! current_user_can('edit_post', $post->ID) ) return $actions;
    if ( ! in_array( $post->post_type, array('haber','post'), true ) ) return $actions;
    $is_sd = get_post_meta($post->ID, '_son_dakika', true) === '1';
    $nonce = wp_create_nonce('ahenk_sondakika_toggle_' . $post->ID);
    if ( $is_sd ) {
        $url = admin_url('admin-post.php?action=ahenk_sondakika_kaldir&post_id=' . $post->ID . '&_wpnonce=' . $nonce);
        $actions['ahenk_sondakika'] = '<a href="' . esc_url($url) . '" style="color:#d4af37;font-weight:700">⚡ Son Dakikadan Kaldır</a>';
    } else {
        $url = admin_url('admin-post.php?action=ahenk_sondakika_ekle&post_id=' . $post->ID . '&_wpnonce=' . $nonce);
        $actions['ahenk_sondakika'] = '<a href="' . esc_url($url) . '" style="color:#E65100;font-weight:700">⚡ Son Dakikaya Ekle</a>';
    }
    return $actions;
}
add_action('add_meta_boxes', function() {
    foreach ( array('haber','post') as $t ) {
        add_meta_box('ahenk_sondakika_box', '⚡ Son Dakika Durumu', 'ahenk_sondakika_metabox_html', $t, 'side', 'high');
    }
});
function ahenk_sondakika_metabox_html($post) {
    $is_sd = get_post_meta($post->ID, '_son_dakika', true) === '1';
    $nonce = wp_create_nonce('ahenk_sondakika_toggle_' . $post->ID);
    if ( $is_sd ) {
        $url = admin_url('admin-post.php?action=ahenk_sondakika_kaldir&post_id=' . $post->ID . '&_wpnonce=' . $nonce);
        echo '<p style="margin:0 0 8px;color:#E65100;font-weight:700">⚡ Bu yazı şu an SON DAKİKA olarak gösteriliyor.</p>';
        echo '<a href="' . esc_url($url) . '" class="button" style="color:#d4af37;border-color:#d4af37">⚡ Son Dakikadan Kaldır</a>';
    } else {
        $url = admin_url('admin-post.php?action=ahenk_sondakika_ekle&post_id=' . $post->ID . '&_wpnonce=' . $nonce);
        echo '<p style="margin:0 0 8px;color:#888">Bu yazı son dakika listesinde değil.</p>';
        echo '<a href="' . esc_url($url) . '" class="button button-primary" style="background:#E65100;border-color:#E65100">⚡ Son Dakikaya Ekle</a>';
    }
}
add_action('admin_post_ahenk_sondakika_kaldir', function() {
    $post_id = (int) ( $_GET['post_id'] ?? 0 );
    if ( ! $post_id || ! current_user_can('edit_post', $post_id) ) wp_die('Yetkisiz erişim.');
    if ( ! wp_verify_nonce( $_GET['_wpnonce'] ?? '', 'ahenk_sondakika_toggle_' . $post_id ) ) wp_die('Geçersiz güvenlik kodu.');
    delete_post_meta($post_id, '_son_dakika');
    wp_redirect( admin_url('edit.php?post_type=' . get_post_type($post_id) . '&ahenk_msg=sd_kaldirildi') );
    exit;
});
add_action('admin_post_ahenk_sondakika_ekle', function() {
    $post_id = (int) ( $_GET['post_id'] ?? 0 );
    if ( ! $post_id || ! current_user_can('edit_post', $post_id) ) wp_die('Yetkisiz erişim.');
    if ( ! wp_verify_nonce( $_GET['_wpnonce'] ?? '', 'ahenk_sondakika_toggle_' . $post_id ) ) wp_die('Geçersiz güvenlik kodu.');
    update_post_meta($post_id, '_son_dakika', '1');
    wp_redirect( admin_url('edit.php?post_type=' . get_post_type($post_id) . '&ahenk_msg=sd_eklendi') );
    exit;
});
add_action('admin_notices', function() {
    $msg = $_GET['ahenk_msg'] ?? '';
    if ( $msg === 'sd_kaldirildi' ) echo '<div class="notice notice-success is-dismissible"><p>✅ Yazı son dakikadan kaldırıldı.</p></div>';
    if ( $msg === 'sd_eklendi'    ) echo '<div class="notice notice-success is-dismissible"><p>⚡ Yazı son dakikaya eklendi.</p></div>';
});
add_filter('manage_posts_columns', 'ahenk_admin_durum_kolon');
add_filter('manage_haber_posts_columns', 'ahenk_admin_durum_kolon');
function ahenk_admin_durum_kolon($cols) { $cols['ahenk_durum'] = '🗞 Durum'; return $cols; }
add_action('manage_posts_custom_column', 'ahenk_admin_durum_icerik', 10, 2);
add_action('manage_haber_posts_custom_column', 'ahenk_admin_durum_icerik', 10, 2);
function ahenk_admin_durum_icerik($col, $post_id) {
    if ( $col !== 'ahenk_durum' ) return;
    $m  = get_post_meta($post_id, '_manset_haberi', true) === '1';
    $sd = get_post_meta($post_id, '_son_dakika',    true) === '1';
    $out = array();
    if ( $m  ) $out[] = '<span style="background:#fff3cd;color:#856404;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">⭐ MANŞET</span>';
    if ( $sd ) $out[] = '<span style="background:#fbecbf;color:#d4af37;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">⚡ SON DAKİKA</span>';
    echo $out ? implode('<br>', $out) : '<span style="color:#bbb">—</span>';
}
