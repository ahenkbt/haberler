<?php
/**
 * Tema functions.php — Evrensel Vakıf / Kurum Teması
 * Yeni projeye uyarlamak için: inc/theme-config.php dosyasını düzenleyin.
 * Güvenlik katmanı: inc/security.php
 * Premium UI: inc/premium.php
 */
defined('ABSPATH') || exit;
/* sanitize_hex_color() WP 6.1 öncesinde sadece Customizer'da tanımlıdır.
   Eklenti ve tema wp_head'dan önce bu fonksiyona ihtiyaç duyduğundan burada tanımlıyoruz. */
if (!function_exists('sanitize_hex_color')) {
    function sanitize_hex_color($color) {
        if ('' === $color) return '';
        if (preg_match('/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/', $color)) return $color;
        return '';
    }
}
/* ══════════════════════════════════════════════
   0. YÜKLEMELERİN SIRASI KRİTİKTİR
══════════════════════════════════════════════ */
// 1. Güvenlik KESİNLİKLE ilk yüklenir
require_once get_template_directory() . '/inc/security.php';
// 2. Konfigürasyon (sabitler ve customizer kayıtları)
require_once get_template_directory() . '/inc/theme-config.php';
// 3. Sayfa bileşenleri
require_once get_template_directory() . '/inc/nav-walkers.php';
require_once get_template_directory() . '/inc/vkv-page-base.php';
require_once get_template_directory() . '/inc/vkv-kurulum.php';
// 4. Premium UI efektleri
require_once get_template_directory() . '/inc/premium.php';
// 5. SEO Modülü (Yoast/RankMath kuruluysa otomatik devre dışı)
require_once get_template_directory() . '/inc/seo.php';
// 6. Web Push Bildirimleri
require_once get_template_directory() . '/inc/web-push.php';
// 7. Admin arayüzü (sadece admin panelinde)
if (is_admin()) {
    require_once get_template_directory() . '/inc/admin-settings.php';
}
// 8. Ansiklopedi + Wikipedia AJAX (hem ön hem arka yüz için gerekli)
require_once get_template_directory() . '/inc/vkv-ansiklopedi.php';
// 9. Resim Proxy — Harici hotlink korumalı resimleri önbelleğe alır
require_once get_template_directory() . '/inc/vkv-img-proxy.php';
/* ══════════════════════════════════════════════
   1. TEMA KURULUMU
══════════════════════════════════════════════ */
function tema_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo');
    add_theme_support('html5', array('search-form','comment-form','comment-list','gallery','caption','script','style'));
    add_theme_support('align-wide');
    add_theme_support('responsive-embeds');
    add_theme_support('editor-styles');
    add_theme_support('wp-block-styles');
    // Menüler
    register_nav_menus(tema_menu_tanimlari());
    // Resim boyutları
    foreach (tema_resim_boyutlari() as $boy) {
        add_image_size($boy[0], $boy[1], $boy[2], $boy[3]);
    }
    // Dil desteği
    load_theme_textdomain('tema', get_template_directory() . '/languages');
}
add_action('after_setup_theme', 'tema_setup');
// VKV uyumu için alias
add_action('after_setup_theme', function() {
    // VKV eski eylem adları için alias
});
/* Gutenberg renk paleti — konfigürasyondan */
add_action('after_setup_theme', function() {
    add_theme_support('editor-color-palette', array(
        array('name' => 'Ana Renk',    'slug' => 'tema-primary',   'color' => TEMA_RENK_BIRINCIL),
        array('name' => 'İkincil',     'slug' => 'tema-secondary',  'color' => TEMA_RENK_IKINCIL),
        array('name' => 'Altın',       'slug' => 'tema-gold',       'color' => TEMA_RENK_ALTIN),
        array('name' => 'Koyu',        'slug' => 'tema-dark',       'color' => TEMA_RENK_KOYU),
        array('name' => 'Açık',        'slug' => 'tema-light',      'color' => TEMA_RENK_ARKA),
    ));
});
/* ── Breadcrumb (tüm sayfa şablonlarında kullanılır) ── */
if (!function_exists('vkv_breadcrumb')) {
function vkv_breadcrumb($sep = '›') {
    echo '<nav class="vkv-bc" aria-label="Breadcrumb">';
    echo '<div class="vkv-bc-w">';
    echo '<a href="' . esc_url(home_url('/')) . '">Ana Sayfa</a>';
    if (is_page()) {
        global $post;
        // Üst sayfalar
        if ($post->post_parent) {
            $ancestors = get_post_ancestors($post->ID);
            $ancestors = array_reverse($ancestors);
            foreach ($ancestors as $anc_id) {
                echo ' <span class="vkv-bc-sep">' . esc_html($sep) . '</span> ';
                echo '<a href="' . esc_url(get_permalink($anc_id)) . '">' . esc_html(get_the_title($anc_id)) . '</a>';
            }
        }
        echo ' <span class="vkv-bc-sep">' . esc_html($sep) . '</span> ';
        echo '<span class="vkv-bc-cur">' . esc_html(get_the_title()) . '</span>';
    } elseif (is_singular('post')) {
        $cats = get_the_category();
        if (!empty($cats)) {
            echo ' <span class="vkv-bc-sep">' . esc_html($sep) . '</span> ';
            echo '<a href="' . esc_url(get_category_link($cats[0]->term_id)) . '">' . esc_html($cats[0]->name) . '</a>';
        }
        echo ' <span class="vkv-bc-sep">' . esc_html($sep) . '</span> ';
        echo '<span class="vkv-bc-cur">' . esc_html(get_the_title()) . '</span>';
    } elseif (is_category()) {
        echo ' <span class="vkv-bc-sep">' . esc_html($sep) . '</span> ';
        echo '<span class="vkv-bc-cur">' . esc_html(single_cat_title('', false)) . '</span>';
    }
    echo '</div></nav>';
    echo '<style>.vkv-bc{background:var(--dk2,#1A1210);padding:8px 0;border-bottom:1px solid rgba(255,255,255,.07)}.vkv-bc-w{max-width:1440px;margin:0 auto;padding:0 20px;font-family:var(--fm);font-size:12px;color:rgba(255,255,255,.4);display:flex;align-items:center;flex-wrap:wrap;gap:4px}.vkv-bc a{color:rgba(255,255,255,.5);text-decoration:none}.vkv-bc a:hover{color:rgba(255,255,255,.9)}.vkv-bc-sep{color:rgba(255,255,255,.25)}.vkv-bc-cur{color:rgba(255,255,255,.75)}</style>';
}
}
/* ── Özel sayfa içeriği (Modül İçerikleri panelinden) ── */
if (!function_exists('vkv_get_custom_page_content')) {
function vkv_get_custom_page_content($slug) {
    $icerikler = get_option('vkv_sayfa_icerikleri', array());
    if (!empty($icerikler[$slug])) return $icerikler[$slug];
    return '';
}
}
/* ── Header nav fallback ── */
function vkv_header_nav_fallback() {
    $pages = get_pages(array('sort_column'=>'menu_order','sort_order'=>'ASC','number'=>25));
    $home_active = is_front_page() ? ' active' : '';
    echo '<div class="hdr-nav-item' . $home_active . '"><a href="' . esc_url(home_url('/')) . '">ANASAYFA</a></div>';
    foreach ($pages as $p) {
        $active = is_page($p->ID) ? ' active' : '';
        echo '<div class="hdr-nav-item' . $active . '">'
           . '<a href="' . esc_url(get_permalink($p->ID)) . '">'
           . esc_html(mb_strtoupper($p->post_title, 'UTF-8'))
           . '</a></div>';
    }
}
/* ══════════════════════════════════════════════
   2. CSS / JS YÜKLEME
══════════════════════════════════════════════ */
function tema_enqueue() {
    // Google Fonts — konfigürasyondan
    wp_enqueue_style('tema-fonts', TEMA_FONTS_URL, array(), null);
    // Font Awesome
    wp_enqueue_style('font-awesome',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
        array(), '6.5.0'
    );
    // Tema stili (versiyonlama güvenliği — random nonce değil, dosya mtime)
    $style_ver = filemtime(get_template_directory() . '/style.css');
    wp_enqueue_style('tema-style', get_stylesheet_uri(), array(), $style_ver);
    // jQuery — footer'da yükle (performans + güvenlik)
    wp_scripts()->add_data('jquery', 'group', 1);
    // AJAX konfigürasyonu
    wp_localize_script('jquery', 'vkvAjax', array(
        'url'   => esc_url(admin_url('admin-ajax.php')),
        'nonce' => wp_create_nonce('vkv_ajax'),
    ));
}
add_action('wp_enqueue_scripts', 'tema_enqueue');
/* ══════════════════════════════════════════════
   3. WİDGET ALANLARI
══════════════════════════════════════════════ */
add_action('widgets_init', function() {
    $ortak = array(
        'before_widget' => '<div class="sb-k" id="%1$s">',
        'after_widget'  => '</div>',
        'before_title'  => '<div class="sb-h"><h3>',
        'after_title'   => '</h3></div>',
    );
    register_sidebar(array_merge($ortak, array(
        'name' => 'Ana Sidebar',
        'id'   => 'sidebar-1',
        'description' => 'Blog, haber ve sayfa şablonlarında görünen genel sidebar.',
    )));
    register_sidebar(array_merge($ortak, array(
        'name' => 'Atatürk Sidebar',
        'id'   => 'sidebar-ataturk',
        'description' => 'Atatürk sayfası yan çubuğu.',
    )));
    register_sidebar(array_merge($ortak, array(
        'name' => 'Haberler Sidebar',
        'id'   => 'sidebar-haberler',
        'description' => 'Haberler / makale sayfası yan çubuğu.',
    )));
    register_sidebar(array_merge($ortak, array(
        'name' => 'Footer Sol',
        'id'   => 'footer-1',
        'description' => 'Alt bilgi — sol sütun.',
    )));
    register_sidebar(array_merge($ortak, array(
        'name' => 'Footer Orta',
        'id'   => 'footer-2',
        'description' => 'Alt bilgi — orta sütun.',
    )));
    register_sidebar(array_merge($ortak, array(
        'name' => 'Footer Sağ',
        'id'   => 'footer-3',
        'description' => 'Alt bilgi — sağ sütun.',
    )));
});
/* ══════════════════════════════════════════════
   3b. AJAX — Manşet Kategori Yükleme
══════════════════════════════════════════════ */
add_action('wp_ajax_vkv_manseta_yukle',        'tema_ajax_manseta_yukle');
add_action('wp_ajax_nopriv_vkv_manseta_yukle', 'tema_ajax_manseta_yukle');
function tema_ajax_manseta_yukle() {
    check_ajax_referer('vkv_ajax', 'nonce');
    tema_ajax_rate_limit('manseta_yukle', 60, 60);
    $cat_id = tema_safe_int($_POST['cat_id'] ?? 0, 0);
    if (function_exists('vkv_manseta_posts_cek') && function_exists('vkv_manseta_grid_html')) {
        $posts = vkv_manseta_posts_cek($cat_id, 5);
        $html  = vkv_manseta_grid_html($posts);
        wp_send_json_success(array('html' => $html));
        return;
    }
    // Fallback: front-page fonksiyonları yüklenemezse doğrudan çek
    $args = array('post_type'=>'post','post_status'=>'publish','posts_per_page'=>5,'orderby'=>'date','order'=>'DESC','ignore_sticky_posts'=>1);
    if ($cat_id > 0) $args['cat'] = $cat_id;
    $q  = new WP_Query($args);
    $all = array();
    while ($q->have_posts()) {
        $q->the_post();
        $hcats = get_the_category();
        $all[] = array(
            'url'    => esc_url(get_permalink()),
            'title'  => esc_html(get_the_title()),
            'exc'    => esc_html(wp_trim_words(get_the_excerpt(), 16, '…')),
            'thumb'  => esc_url(tukav_get_thumb(get_the_ID(), 'large')),
            'date'   => esc_html(get_the_date('d M Y')),
            'cat'    => esc_html(!empty($hcats) ? $hcats[0]->name : ''),
            'pinned' => false,
        );
    }
    wp_reset_postdata();
    if (empty($all)) { wp_send_json_success(array('html'=>'<p style="color:var(--yz3);padding:20px 0;font-size:13px">Bu kategoride henüz haber yok.</p>')); return; }
    $main = $all[0]; $side = array_slice($all, 1, 4);
    ob_start();
    echo '<div class="vkv-news-grid">';
    echo '<a href="'.esc_url($main['url']).'" class="vkv-news-main-card">';
    if ($main['thumb']) echo '<img src="'.esc_url($main['thumb']).'" alt="'.esc_attr($main['title']).'" loading="lazy">';
    else echo '<div class="vkv-no-img-ph"><i class="fa fa-newspaper"></i></div>';
    echo '<div class="vkv-news-main-overlay"></div>';
    echo '<div class="vkv-news-main-body">';
    echo '<div class="vkv-nmb-top">'.($main['cat']?'<span class="vkv-news-main-cat">'.esc_html($main['cat']).'</span>':'').'</div>';
    echo '<h3 class="vkv-news-main-title">'.esc_html($main['title']).'</h3>';
    echo '<p class="vkv-news-main-exc">'.esc_html($main['exc']).'</p>';
    echo '<div class="vkv-news-main-date"><i class="fa fa-calendar-alt" style="opacity:.6;margin-right:5px"></i>'.esc_html($main['date']).'</div>';
    echo '</div></a>';
    echo '<div class="vkv-news-side">';
    foreach ($side as $sh) {
        echo '<a href="'.esc_url($sh['url']).'" class="vkv-news-side-card">';
        echo '<div class="vkv-nsc-img">'.($sh['thumb']?'<img src="'.esc_url($sh['thumb']).'" alt="'.esc_attr($sh['title']).'" loading="lazy">':'<div class="vkv-nsc-no-img"><i class="fa fa-image"></i></div>').'</div>';
        echo '<div class="vkv-nsc-body">';
        echo ($sh['cat'] ? '<div class="vkv-nsc-cat">'.esc_html($sh['cat']).'</div>' : '');
        echo '<div class="vkv-nsc-title">'.esc_html($sh['title']).'</div>';
        echo '<div class="vkv-nsc-date">'.esc_html($sh['date']).'</div>';
        echo '</div></a>';
    }
    echo '</div></div>';
    wp_send_json_success(array('html' => ob_get_clean()));
}
/* ══════════════════════════════════════════════
   4. AJAX — Sonsuz Kaydırma (Haberler)
══════════════════════════════════════════════ */
add_action('wp_ajax_tukav_infinite_posts',        'tema_ajax_infinite');
add_action('wp_ajax_nopriv_tukav_infinite_posts', 'tema_ajax_infinite');
function tema_ajax_infinite() {
    // Güvenlik
    check_ajax_referer('tukav_infinite', 'nonce');
    tema_ajax_rate_limit('infinite_posts', 60, 60); // 60/dk
    $page   = tema_safe_int($_POST['page']   ?? 1, 1, 9999);
    $cat_id = tema_safe_int($_POST['cat_id'] ?? 0, 0);
    $s      = tema_safe_text($_POST['s']     ?? '');
    $ppp    = 12;
    $args = array(
        'post_type'      => 'post',
        'post_status'    => 'publish',
        'posts_per_page' => $ppp,
        'paged'          => $page,
        'orderby'        => 'date',
        'order'          => 'DESC',
        'no_found_rows'  => false,
    );
    if ($cat_id > 0) $args['cat'] = $cat_id;
    if ($s)          $args['s']   = $s;
    $q = new WP_Query($args);
    $posts = array();
    while ($q->have_posts()) {
        $q->the_post();
        $cats = get_the_category();
        $posts[] = array(
            'id'       => get_the_ID(),
            'url'      => esc_url(get_permalink()),
            'title'    => esc_html(get_the_title()),
            'excerpt'  => esc_html(wp_trim_words(get_the_excerpt(), 18, '...')),
            'thumb'    => esc_url(tukav_get_thumb(get_the_ID(), 'medium')),
            'date'     => esc_html(get_the_date('d M Y')),
            'cat_name' => esc_html(!empty($cats) ? $cats[0]->name : ''),
        );
    }
    wp_reset_postdata();
    wp_send_json_success(array(
        'posts'    => $posts,
        'has_more' => $q->max_num_pages > $page,
    ));
}
/* ══════════════════════════════════════════════
   5. AJAX — Makale İçeriği (Makaleler sayfası)
══════════════════════════════════════════════ */
add_action('wp_ajax_tukav_mak_article',        'tema_ajax_mak_article');
add_action('wp_ajax_nopriv_tukav_mak_article', 'tema_ajax_mak_article');
function tema_ajax_mak_article() {
    check_ajax_referer('tukav_mak_nonce', 'nonce');
    tema_ajax_rate_limit('mak_article', 40, 60);
    $source = tema_safe_text($_POST['source'] ?? 'wp');
    if ($source === 'wp') {
        $post_id = tema_safe_int($_POST['post_id'] ?? 0, 1);
        $post    = get_post($post_id);
        if (!$post || $post->post_status !== 'publish') {
            wp_send_json_error('Yazı bulunamadı');
            return;
        }
        $cats  = get_the_category($post_id);
        $thumb = tukav_get_thumb($post_id, 'large');
        wp_send_json_success(array(
            'extract' => esc_html(get_the_excerpt($post_id) ?: wp_trim_words(strip_shortcodes(strip_tags($post->post_content)), 150, '...')),
            'thumb'   => esc_url($thumb),
            'url'     => esc_url(get_permalink($post_id)),
            'cat'     => esc_html(!empty($cats) ? $cats[0]->name : ''),
        ));
    } elseif ($source === 'wiki') {
        $title = tema_safe_text($_POST['title'] ?? '');
        if (!$title || strlen($title) > 200) {
            wp_send_json_error('Geçersiz başlık');
            return;
        }
        // Wikipedia API — sadece tr subdomain'e izin ver
        $api  = 'https://tr.wikipedia.org/api/rest_v1/page/summary/' . rawurlencode($title);
        $resp = wp_remote_get($api, array(
            'timeout'    => 8,
            'sslverify'  => true,
            'user-agent' => 'WordPress/' . get_bloginfo('version') . '; ' . home_url('/'),
        ));
        if (is_wp_error($resp)) {
            wp_send_json_error('Wikipedia erişilemedi');
            return;
        }
        $code = wp_remote_retrieve_response_code($resp);
        if ($code !== 200) {
            wp_send_json_error('İçerik bulunamadı');
            return;
        }
        $body = json_decode(wp_remote_retrieve_body($resp), true);
        if (empty($body['extract'])) {
            wp_send_json_error('İçerik bulunamadı');
            return;
        }
        wp_send_json_success(array(
            'extract'    => wp_kses($body['extract'], array()),
            'thumb'      => esc_url($body['thumbnail']['source'] ?? ''),
            'url'        => esc_url($body['content_urls']['desktop']['page'] ?? ''),
            'wiki_title' => esc_html($title),
        ));
    } else {
        wp_send_json_error('Geçersiz kaynak', 400);
    }
}
/* ══════════════════════════════════════════════
   6. TITLE TAG
══════════════════════════════════════════════ */
add_filter('wp_title', function($title, $sep) {
    global $page, $paged;
    if (is_feed()) return $title;
    $title .= get_bloginfo('name', 'display');
    $desc   = get_bloginfo('description', 'display');
    if ($desc && (is_home() || is_front_page())) $title .= " $sep $desc";
    if ($paged >= 2 || $page >= 2) $title .= " $sep " . sprintf('Sayfa %s', max($paged, $page));
    return $title;
}, 10, 2);
/* ══════════════════════════════════════════════
   7. YORUM FORMU
══════════════════════════════════════════════ */
if (defined('TEMA_YORUMLAR_AKTIF') && TEMA_YORUMLAR_AKTIF) {
    add_filter('comment_form_default_fields', function($fields) {
        $fields['author'] = str_replace('class="comment-form-author"', 'class="comment-form-author tema-cf"', $fields['author'] ?? '');
        return $fields;
    });
}
/* ══════════════════════════════════════════════
   8. EXCERPT
══════════════════════════════════════════════ */
add_filter('excerpt_length', function() { return 25; });
add_filter('excerpt_more',   function() { return '...'; });
/* ══════════════════════════════════════════════
   9. ARAMA — XSS KORUMASI
══════════════════════════════════════════════ */
add_filter('the_search_query', function($q) {
    return esc_attr(wp_strip_all_tags($q));
});
/* ══════════════════════════════════════════════
   10. EMBED & IFRAME GÜVENLİĞİ
══════════════════════════════════════════════ */
add_filter('embed_oembed_html', function($html) {
    // tüm iframe'lere sandbox ekle
    $html = preg_replace('/<iframe/i', '<iframe sandbox="allow-scripts allow-same-origin allow-presentation" referrerpolicy="strict-origin-when-cross-origin"', $html);
    return $html;
});
/* ══════════════════════════════════════════════
   11. PERFORMANS — GEREKSIZ SCRIPTS KALDIR
══════════════════════════════════════════════ */
add_action('wp_enqueue_scripts', function() {
    // Emojiler — gerek yoksa kaldır
    if (!is_admin()) {
        remove_action('wp_head', 'print_emoji_detection_script', 7);
        remove_action('wp_print_styles', 'print_emoji_styles');
        remove_filter('the_content_feed', 'wp_staticize_emoji');
        remove_filter('comment_text_rss', 'wp_staticize_emoji');
        remove_filter('wp_mail', 'wp_staticize_emoji_for_email');
    }
}, 100);
/* ══════════════════════════════════════════════
   12. VKV UYUM ALIASLAR (geri uyumluluk)
══════════════════════════════════════════════ */
// VKV eski customizer key'leri → tema_ yeni keylerle eşle
add_action('customize_register', function($wpc) {
    // Eski VKV key'ler için alias (varsa)
}, 99);
/* ══════════════════════════════════════════════
   13. YARDIMCI FONKSİYONLAR
══════════════════════════════════════════════ */
/**
 * tukav_get_thumb() — Yazı için thumbnail URL döner.
 * TUKAV/VKV temalarından gelen AJAX handler'lar bu fonksiyonu kullanır.
 * Eğer öne çıkan görseli yoksa placeholder döner.
 */
if (!function_exists('tukav_get_thumb')) {
    function tukav_get_thumb($post_id, $size = 'medium') {
        if (has_post_thumbnail($post_id)) {
            $src = wp_get_attachment_image_src(get_post_thumbnail_id($post_id), $size);
            return $src ? $src[0] : '';
        }
        /* İçerikten ilk img'yi bul */
        $post = get_post($post_id);
        if ($post && preg_match('/<img[^>]+src=["\']([^"\']+)["\']/', $post->post_content, $m)) {
            return esc_url($m[1]);
        }
        return '';
    }
}
/**
 * tema_safe_int() — POST verisinden güvenli integer okur.
 */
if (!function_exists('tema_safe_int')) {
    function tema_safe_int($val, $min = 0, $max = PHP_INT_MAX) {
        $v = (int) $val;
        if ($v < $min) return $min;
        if ($v > $max) return $max;
        return $v;
    }
}
/**
 * tema_safe_text() — POST verisinden güvenli text okur.
 */
if (!function_exists('tema_safe_text')) {
    function tema_safe_text($val, $max_len = 200) {
        return substr(sanitize_text_field(wp_unslash($val)), 0, $max_len);
    }
}
/**
 * tema_ajax_rate_limit() — AJAX istek sınırlayıcı.
 */
if (!function_exists('tema_ajax_rate_limit')) {
    function tema_ajax_rate_limit($key, $limit = 30, $window = 60) {
        $ip       = $_SERVER['REMOTE_ADDR'] ?? '';
        $opt_key  = 'vkv_rl_' . md5($key . $ip);
        $data     = get_transient($opt_key);
        if (!$data) $data = array('count'=>0,'start'=>time());
        $data['count']++;
        if ($data['count'] > $limit) {
            wp_send_json_error('İstek sınırı aşıldı.', 429);
            exit;
        }
        set_transient($opt_key, $data, $window);
    }
}

/* ════════════════════════════════════════════════════════
   DSV İÇERİK YÜKLEYİCİ — Tek seferlik admin init
   Sadece DSV site tipinde çalışır
════════════════════════════════════════════════════════ */
add_action('after_setup_theme', function() {
    if (get_option('vkv_site_tipi') === 'dsv') {
        $icerik_dosya = get_template_directory() . '/inc/dsv-icerik.php';
        if (file_exists($icerik_dosya) && is_admin()) {
            require_once $icerik_dosya;
        }
    }
});

/* ════════════════════════════════════════════════════════
   /ansiklopedi kategori arşivi → /makaleler sayfasına yönlendir
   (ansiklopedi kategorisindeki yazılar makaleler şablonunda görünür)
════════════════════════════════════════════════════════ */
add_action('template_redirect', function() {
    /* /ansiklopedi category archive → makaleler sayfası */
    if (is_category('ansiklopedi')) {
        $mak_page = get_page_by_path('makaleler');
        if ($mak_page) {
            wp_redirect(get_permalink($mak_page->ID), 301);
            exit;
        }
    }
});

/* /makaleler sayfasında ansiklopedi yazılarını da göster */
add_action('pre_get_posts', function($q) {
    if (!$q->is_main_query() || is_admin()) return;
    $page_obj = $q->get_queried_object();
    if ($page_obj && isset($page_obj->post_name) && $page_obj->post_name === 'makaleler') {
        /* Sayfa şablonu bu işi zaten yapıyor, burada sadece canonical URL için */
    }
});
