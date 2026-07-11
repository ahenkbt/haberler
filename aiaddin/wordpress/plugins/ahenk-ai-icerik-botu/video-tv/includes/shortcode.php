<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class VTV_Shortcode {

    public static function init() {
        add_shortcode('video_tv', array(__CLASS__, 'render'));
        add_action('wp_enqueue_scripts', array(__CLASS__, 'maybe_enqueue'));
    }

    public static function maybe_enqueue() {
        global $post;
        if ( ! is_a($post,'WP_Post') ) { return; }
        if ( ! has_shortcode($post->post_content,'video_tv') ) { return; }
        self::enqueue();
    }

    public static function enqueue() {
        wp_enqueue_style('vtv-style', VTV_URL . 'assets/css/videotv.css', array(), VTV_VER);
        wp_enqueue_script('vtv-script', VTV_URL . 'assets/js/videotv.js', array('jquery'), VTV_VER, true);

        $page_url = '';
        global $post;
        if ( is_a($post,'WP_Post') ) { $page_url = get_permalink($post->ID); }
        if ( ! $page_url ) {
            $page_url = ( is_ssl() ? 'https://' : 'http://' ) . $_SERVER['HTTP_HOST'] . strtok($_SERVER['REQUEST_URI'],'?');
        }

        wp_localize_script('vtv-script', 'VTV', array(
            'ajax'          => admin_url('admin-ajax.php'),
            'site_title'    => VTV_DB::get_ayar('site_basligi', 'Video TV'),
            'page_url'      => esc_url($page_url),
            'init_video'    => isset($_GET['video'])    ? sanitize_text_field($_GET['video'])    : '',
            'init_platform' => isset($_GET['platform']) ? sanitize_text_field($_GET['platform']) : 'youtube',
            'init_kaynak'   => isset($_GET['kanal'])    ? absint($_GET['kanal'])                 : 0,
        ));
    }

    public static function render( $atts ) {
        if ( ! wp_style_is('vtv-style','enqueued') ) { self::enqueue(); }
        ob_start();
        // Sayfa başlığını gizle (geniş selektör seti) ve içerik konteynerinin üst boşluğunu sıfırla
        echo '<style>'
            . '.page-header,.entry-header,header.entry-header,.page-title,.entry-title,h1.entry-title,h1.page-title,'
            . '.post-thumbnail,.entry-thumbnail,.featured-image,.post-header,.single-post-header,.single-header,'
            . '.haber-baslik,.haber-baslik-tek,.haber-header,.tek-haber-header,.tek-haber-baslik,'
            . '.archive-title,.tema-page-title,.page-cover,.page-cover-title,.page-banner,'
            . '.breadcrumb,.breadcrumbs,.yoast-breadcrumb,nav.breadcrumb{display:none !important;}'
            . '.vtv-app{margin-top:0 !important;margin-bottom:0 !important;border-radius:0 !important;}'
            . 'body .site-content,body .content-area,body .entry-content,body main.site-main,'
            . 'body .page-content,body main.content,body .single-content,body .post,body .page,'
            . 'body article.post,body article.page,body article.hentry{padding-top:0 !important;margin-top:0 !important;border-top:0 !important;}'
            . 'body .entry-content>*:first-child,body .entry-content>p:first-child{margin-top:0 !important;padding-top:0 !important;}'
            . '</style>';
        // JS güvencesi: Video TV'nin içerik konteynerinde, kendisinden önceki tüm öğeleri (sayfa başlığı, öne çıkan görsel, breadcrumb vs.) gizle
        echo '<script>(function(){function go(){var app=document.querySelector(".vtv-app");if(!app)return;'
            . 'var node=app;'
            . 'var stop=function(el){if(!el)return true;var t=el.tagName||"";if(/^(BODY|HTML|HEADER)$/.test(t))return true;'
            . 'var c=(el.className||"")+" "+(el.id||"");return /(^|\s)(site-header|main-header|header-area|navbar|header-top|top-bar)(\s|$)/i.test(c);};'
            . 'while(node && !stop(node.parentElement)){'
            . '  var p=node.parentElement; var sib=p.firstElementChild;'
            . '  while(sib && sib!==node){var nx=sib.nextElementSibling; sib.style.display="none"; sib=nx;}'
            . '  p.style.paddingTop="0"; p.style.marginTop="0"; node=p;'
            . '}}'
            . 'if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",go);}else{go();}'
            . '})();</script>';
        include VTV_DIR . 'templates/main.php';
        return ob_get_clean();
    }
}
