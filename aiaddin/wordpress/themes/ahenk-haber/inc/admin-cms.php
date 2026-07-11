<?php
/**
 * AHENK CMS — WP-Admin Premium Haber Paneli Dönüşümü
 * Tüm yönetim arayüzünü modern, marka uyumlu bir haber CMS'i gibi gösterir.
 */
if ( ! defined('ABSPATH') ) exit;

/* =============================================================
   1) LOGİN EKRANI — markalı, gradient, premium
   ============================================================= */
add_action('login_enqueue_scripts', function(){
    $renk = get_theme_mod('ahenk_renk_ana', '#D4AF37');
    ?>
    <style>
        body.login{background:
            radial-gradient(1000px 500px at 100% -10%, rgba(255,255,255,.08), transparent 60%),
            radial-gradient(700px 400px at 0% 110%, rgba(255,255,255,.04), transparent 50%),
            linear-gradient(135deg,#0e0e10 0%,#1a0000 60%,<?php echo esc_attr($renk); ?> 140%) !important;
            font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif !important}
        #login{padding-top:6vh !important;width:380px}
        .login h1 a{
            background-image:none !important;
            width:100% !important;height:auto !important;text-indent:0 !important;
            color:#fff !important;font-size:0 !important;
            display:flex;align-items:center;justify-content:center;gap:10px;
            margin-bottom:18px}
        .login h1 a::before{content:"AHENK";font-size:36px;font-weight:900;
            color:#fff;letter-spacing:-1px;
            text-shadow:0 4px 22px rgba(212,175,55,.6)}
        .login h1 a::after{content:"CMS";font-size:11px;font-weight:800;
            background:rgba(255,255,255,.15);color:#fff;
            padding:4px 9px;border-radius:6px;letter-spacing:1.5px;
            border:1px solid rgba(255,255,255,.2)}
        .login form{
            background:rgba(255,255,255,.97) !important;
            border-radius:18px !important;
            padding:30px 28px !important;
            box-shadow:0 24px 60px -16px rgba(0,0,0,.55), 0 1px 0 rgba(255,255,255,.4) inset !important;
            border:0 !important;backdrop-filter:blur(14px)}
        .login label{font-weight:700 !important;color:#222 !important;font-size:13px !important}
        .login input[type=text], .login input[type=password]{
            border-radius:10px !important;border:1px solid #e2e2e2 !important;
            background:#fafafa !important;font-size:15px !important;padding:12px 14px !important;
            box-shadow:none !important;transition:all .2s}
        .login input[type=text]:focus, .login input[type=password]:focus{
            background:#fff !important;border-color:<?php echo esc_attr($renk); ?> !important;
            box-shadow:0 0 0 3px rgba(212,175,55,.12) !important}
        .wp-core-ui .button-primary{
            background:linear-gradient(135deg,<?php echo esc_attr($renk); ?>,#f0d36b) !important;
            border:0 !important;border-radius:10px !important;
            padding:11px 22px !important;height:auto !important;font-size:14px !important;
            font-weight:800 !important;text-shadow:none !important;
            box-shadow:0 8px 22px -8px rgba(212,175,55,.55) !important;
            transition:transform .15s,box-shadow .15s !important;width:100% !important}
        .wp-core-ui .button-primary:hover{transform:translateY(-1px);
            box-shadow:0 12px 28px -8px rgba(212,175,55,.6) !important}
        .login #nav, .login #backtoblog{text-align:center !important;width:100%}
        .login #nav a, .login #backtoblog a{color:rgba(255,255,255,.85) !important;
            text-shadow:none !important;font-size:12px !important;font-weight:600}
        .login #nav a:hover, .login #backtoblog a:hover{color:#fff !important}
        .login .privacy-policy-page-link{display:none}
        .language-switcher{display:none !important}
    </style>
    <?php
});
add_filter('login_headerurl', function(){ return home_url('/'); });
add_filter('login_headertext', function(){ return get_bloginfo('name') . ' — CMS'; });

/* =============================================================
   2) ADMIN HEAD — global premium tema (renk, tipografi, shadow)
   ============================================================= */
add_action('admin_enqueue_scripts', function(){
    wp_enqueue_style('dashicons');
});

add_action('admin_head', function(){
    $renk = get_theme_mod('ahenk_renk_ana', '#D4AF37');
    $kullanici = wp_get_current_user();
    ?>
    <style id="ahenk-cms-tema">
        :root{
            --ahk:<?php echo esc_attr($renk); ?>;
            --ahk-d:#990000;
            --ahk-l:#e9c75a;
            --ink:#1a1a1a;
            --muted:#7a8190;
            --bg:#f3f5f9;
            --card:#ffffff;
            --line:#e7eaf0;
            --radius:14px;
            --shadow:0 2px 8px rgba(15,23,42,.06);
            --shadow-lg:0 18px 40px -16px rgba(15,23,42,.18);
        }

        /* Genel arka plan & font */
        html, body, #wpwrap, #wpbody, #wpcontent{background:var(--bg) !important;
            font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,sans-serif !important}
        #wpcontent{padding-left:24px}
        #wpbody-content{padding-bottom:60px}
        .wp-admin{color:var(--ink)}

        /* ================== ÜST ADMIN BAR ================== */
        #wpadminbar{
            background:linear-gradient(180deg,#161618,#0e0e10) !important;
            height:48px !important;
            box-shadow:0 4px 14px rgba(0,0,0,.18);
            border-bottom:1px solid rgba(255,255,255,.06)}
        #wpadminbar *{font-family:inherit !important;font-size:13px}
        #wpadminbar .ab-item, #wpadminbar a.ab-item, #wpadminbar > #wp-toolbar span.ab-label{
            color:#dcdce0 !important;line-height:48px !important;height:48px !important}
        #wpadminbar .ab-top-menu > li:hover > .ab-item, #wpadminbar .ab-top-menu > li.hover > .ab-item{
            background:rgba(255,255,255,.06) !important;color:#fff !important}
        #wpadminbar #wp-admin-bar-wp-logo > .ab-item .ab-icon::before{
            content:"\f120";font-family:dashicons;color:var(--ahk) !important;
            font-size:20px !important;top:5px;position:relative}
        #wpadminbar #wp-admin-bar-site-name > .ab-item::before{
            content:"\f102";font-family:dashicons;color:var(--ahk) !important;
            margin-right:6px;font-size:18px;top:3px;position:relative}
        html.wp-toolbar{padding-top:48px !important}

        /* ================== SOL MENÜ ================== */
        #adminmenuback, #adminmenuwrap, #adminmenu{
            background:linear-gradient(180deg,#16171c 0%,#0e0e10 100%) !important;
            box-shadow:2px 0 16px rgba(0,0,0,.18)}
        #adminmenu{padding-top:14px}
        #adminmenu li.menu-top{margin:1px 8px;border-radius:10px;overflow:hidden;
            transition:background .2s}
        #adminmenu li.menu-top:hover{background:rgba(255,255,255,.04)}
        #adminmenu .wp-menu-name{font-weight:600 !important;font-size:13px !important;
            padding:11px 12px !important}
        #adminmenu .wp-menu-image::before{font-size:18px !important;color:#9aa0aa !important;
            opacity:1 !important;transition:color .15s}
        #adminmenu li.menu-top:hover .wp-menu-image::before,
        #adminmenu li.wp-has-current-submenu .wp-menu-image::before,
        #adminmenu li.current .wp-menu-image::before{color:var(--ahk-l) !important}
        #adminmenu li.menu-top a{color:#cfd2d8 !important}
        #adminmenu li.menu-top:hover > a{color:#fff !important}
        #adminmenu li.wp-has-current-submenu, #adminmenu li.current,
        #adminmenu li.wp-has-current-submenu > a.wp-has-current-submenu, #adminmenu .wp-menu-arrow,
        #adminmenu .wp-menu-arrow div, #adminmenu li.current a.menu-top, .folded #adminmenu li.wp-has-current-submenu{
            background:linear-gradient(135deg,var(--ahk),#a30000) !important;
            color:#fff !important;border:0 !important}
        #adminmenu li.wp-has-current-submenu > a, #adminmenu li.current a.menu-top{color:#fff !important}
        #adminmenu .wp-submenu{
            background:#1d1f25 !important;border-radius:0 0 10px 10px;padding:6px 0 !important;
            box-shadow:0 8px 18px rgba(0,0,0,.2) inset !important}
        #adminmenu .wp-submenu a{color:#aab0bc !important;font-size:12.5px !important;
            padding:7px 14px !important;transition:all .15s}
        #adminmenu .wp-submenu a:hover{color:#fff !important;background:rgba(255,255,255,.05) !important}
        #adminmenu .wp-submenu li.current a, #adminmenu .wp-submenu li.current a:hover{
            color:#fff !important;font-weight:700 !important}
        #adminmenu .wp-submenu li.current a::before{content:"▸ ";color:var(--ahk-l)}
        #adminmenu li.wp-menu-separator{background:transparent !important;height:14px !important;border:0 !important}
        #adminmenu li.wp-menu-separator::after{content:"";display:block;height:1px;
            background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);margin:7px 14px}
        #collapse-menu{background:transparent !important;color:#7a8190 !important}
        #collapse-menu:hover{color:#fff !important}

        /* ================== SAYFA BAŞLIKLARI ================== */
        .wrap > h1, .wrap > h2:first-child{
            font-size:22px !important;font-weight:800 !important;color:var(--ink);
            margin:18px 0 18px !important;display:flex;align-items:center;gap:10px}
        .wrap > h1 .page-title-action, .wrap > h2 .page-title-action{
            background:linear-gradient(135deg,var(--ahk),var(--ahk-l)) !important;
            color:#fff !important;border:0 !important;border-radius:8px !important;
            padding:7px 14px !important;font-size:12.5px !important;font-weight:700 !important;
            box-shadow:0 6px 14px -6px rgba(212,175,55,.5) !important;text-shadow:none !important}

        /* ================== KART, KUTU, TABLO ================== */
        .postbox, .meta-box-sortables .postbox, .stuffbox{
            background:var(--card) !important;border:1px solid var(--line) !important;
            border-radius:var(--radius) !important;box-shadow:var(--shadow) !important;overflow:hidden}
        .postbox > .postbox-header{
            border-bottom:1px solid var(--line) !important;
            background:linear-gradient(180deg,#fff,#fafbfd) !important;padding:4px 6px}
        .postbox > .postbox-header .hndle{font-weight:800 !important;font-size:13.5px !important;color:var(--ink) !important}

        .wp-list-table{
            background:var(--card) !important;border:1px solid var(--line) !important;
            border-radius:var(--radius) !important;overflow:hidden;box-shadow:var(--shadow)}
        .wp-list-table thead th, .wp-list-table tfoot th{
            background:linear-gradient(180deg,#fff,#f6f8fb) !important;
            border-bottom:1px solid var(--line) !important;font-weight:800 !important;color:var(--ink)}
        .wp-list-table tbody td, .wp-list-table tbody th{padding:14px 12px !important;vertical-align:middle !important}
        .wp-list-table tbody tr:hover{background:#fafbfd !important}

        /* Notice'lar */
        .notice, div.updated, div.error{
            border-radius:10px !important;border-left-width:4px !important;
            box-shadow:var(--shadow);padding:10px 14px !important}
        .notice-success{border-left-color:#16a34a !important}
        .notice-warning{border-left-color:#ea580c !important}
        .notice-error{border-left-color:var(--ahk) !important}

        /* Düğmeler */
        .wp-core-ui .button{
            border-radius:8px !important;border:1px solid #d8dde6 !important;
            background:#fff !important;color:#333 !important;
            box-shadow:0 1px 2px rgba(15,23,42,.04) !important;
            font-weight:600 !important;transition:all .15s}
        .wp-core-ui .button:hover{border-color:var(--ahk) !important;color:var(--ahk) !important}
        .wp-core-ui .button-primary, .wp-core-ui .button-primary.button-large{
            background:linear-gradient(135deg,var(--ahk),var(--ahk-l)) !important;
            color:#fff !important;border:0 !important;border-radius:8px !important;
            padding:8px 18px !important;font-weight:700 !important;
            box-shadow:0 6px 14px -6px rgba(212,175,55,.55) !important;text-shadow:none !important}
        .wp-core-ui .button-primary:hover{transform:translateY(-1px);
            box-shadow:0 10px 20px -8px rgba(212,175,55,.6) !important;color:#fff !important}

        /* Form inputları */
        input[type=text], input[type=email], input[type=url], input[type=password],
        input[type=number], input[type=search], input[type=date], select, textarea{
            border-radius:8px !important;border:1px solid var(--line) !important;
            background:#fff !important;padding:8px 12px !important;
            box-shadow:none !important;transition:all .15s}
        input[type=text]:focus, input[type=email]:focus, input[type=url]:focus,
        input[type=password]:focus, input[type=number]:focus, input[type=search]:focus,
        input[type=date]:focus, select:focus, textarea:focus{
            border-color:var(--ahk) !important;
            box-shadow:0 0 0 3px rgba(212,175,55,.12) !important}

        /* Footer */
        #wpfooter{padding:14px 24px !important;color:var(--muted) !important;font-size:12px !important}
        #footer-thankyou{font-style:normal !important}

        /* Eklentinin orantısız resimleri (AYNI ZAMANDA) */
        .wrap .wp-list-table img:not(.attachment-post-thumbnail){
            max-width:60px !important;max-height:60px !important;
            width:60px !important;height:60px !important;
            object-fit:cover !important;border-radius:50% !important;
            border:2px solid #fff !important;box-shadow:0 2px 8px rgba(0,0,0,.15) !important;
            display:inline-block !important;vertical-align:middle !important}
        .post-type-ky-yazar #postimagediv .inside img,
        .post-type-ky-makale #postimagediv .inside img,
        .post-type-kose-yazisi #postimagediv .inside img{
            max-width:240px !important;max-height:240px !important;width:auto !important;height:auto !important;
            object-fit:cover !important;border-radius:12px !important;
            border:3px solid #fff !important;box-shadow:0 8px 22px rgba(0,0,0,.18) !important;
            display:block !important;margin:0 auto 10px !important}

        /* Editör (post.php) — premium başlık alanı */
        .editor-styles-wrapper, .wp-block-post-title{font-family:inherit !important}

        /* Welcome panel gizle */
        #welcome-panel{display:none !important}

        /* Help & screen options sade */
        #screen-meta-links a{border-radius:0 0 8px 8px !important;background:#fff !important;
            box-shadow:var(--shadow);border:1px solid var(--line) !important;border-top:0 !important}

        /* Üst notification badge'i */
        #wp-admin-bar-updates .ab-icon{color:var(--ahk-l) !important}
    </style>
    <?php
});

/* =============================================================
   3) ADMIN BAR — solu temizle, sağa marka adı + hızlı eylemler
   ============================================================= */
add_action('admin_bar_menu', function($wp_admin_bar){
    // Gereksiz öğeleri kaldır
    $wp_admin_bar->remove_node('wp-logo');
    $wp_admin_bar->remove_node('comments');
    $wp_admin_bar->remove_node('customize');

    // Marka düğmesi (sol)
    $wp_admin_bar->add_node(array(
        'id'    => 'ahenk_brand',
        'title' => '<span style="display:inline-flex;align-items:center;gap:8px;font-weight:800;letter-spacing:.5px"><span style="background:linear-gradient(135deg,#D4AF37,#f0d36b);color:#fff;padding:3px 8px;border-radius:6px;font-size:11px">AHENK</span><span style="color:#fff">CMS</span></span>',
        'href'  => admin_url(),
        'meta'  => array('title' => 'Ahenk CMS Anasayfa'),
    ));

    // Hızlı: Yeni Haber
    $wp_admin_bar->add_node(array(
        'id'    => 'ahenk_yeni_haber',
        'title' => '<span class="ab-icon dashicons dashicons-plus-alt2" style="font-size:16px;top:4px;position:relative"></span> Yeni Haber',
        'href'  => admin_url('post-new.php?post_type=haber'),
    ));
    // Hızlı: Manşet
    $wp_admin_bar->add_node(array(
        'id'    => 'ahenk_manset',
        'title' => '<span class="ab-icon dashicons dashicons-megaphone" style="font-size:16px;top:4px;position:relative"></span> Manşet',
        'href'  => admin_url('admin.php?page=ahenk-manseta'),
    ));
    // Hızlı: Siteyi Görüntüle
    $wp_admin_bar->add_node(array(
        'id'    => 'ahenk_siteyi_gor',
        'title' => '<span class="ab-icon dashicons dashicons-external" style="font-size:16px;top:4px;position:relative"></span> Siteyi Görüntüle',
        'href'  => home_url('/'),
        'meta'  => array('target' => '_blank'),
    ));
}, 25);

/* =============================================================
   4) ADMIN FOOTER & İSİM
   ============================================================= */
add_filter('admin_footer_text', function(){
    return '<span style="display:inline-flex;align-items:center;gap:6px"><span style="background:linear-gradient(135deg,#D4AF37,#f0d36b);color:#fff;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:800">AHENK</span> Premium Haber CMS Paneli</span>';
});
add_filter('update_footer', function(){ return '<span style="opacity:.6">v2.0 PRO</span>'; }, 99);

/* =============================================================
   5) DASHBOARD — özel haber CMS dashboard widget'ları
   ============================================================= */
add_action('wp_dashboard_setup', function(){
    // Varsayılan widget'ları kaldır
    $kaldir = array(
        'dashboard_primary'        => 'side',
        'dashboard_secondary'      => 'side',
        'dashboard_quick_press'    => 'side',
        'dashboard_recent_drafts'  => 'side',
        'dashboard_incoming_links' => 'normal',
        'dashboard_plugins'        => 'normal',
        'dashboard_right_now'      => 'normal',
        'dashboard_activity'       => 'normal',
        'dashboard_site_health'    => 'normal',
    );
    foreach ( $kaldir as $w => $ctx ) remove_meta_box($w, 'dashboard', $ctx);

    // Premium widget'lar
    add_meta_box('ahenk_db_genel',     '📊 Haber İstatistikleri',   'ahenk_db_genel_render',     'dashboard', 'normal', 'high');
    add_meta_box('ahenk_db_son',       '📰 Son Haberler',           'ahenk_db_son_render',       'dashboard', 'normal', 'high');
    add_meta_box('ahenk_db_taslak',    '📝 Bekleyen Taslaklar',     'ahenk_db_taslak_render',    'dashboard', 'side',   'high');
    add_meta_box('ahenk_db_manset',    '🔥 Aktif Manşetler',        'ahenk_db_manset_render',    'dashboard', 'side',   'high');
    add_meta_box('ahenk_db_yazarlar',  '🖊 Aktif Yazarlar',         'ahenk_db_yazarlar_render',  'dashboard', 'normal', 'default');
});

// Dashboard hoşgeldin başlığı
add_action('admin_notices', function(){
    $screen = get_current_screen();
    if ( ! $screen || $screen->id !== 'dashboard' ) return;
    $u = wp_get_current_user();
    $saat = (int) current_time('H');
    $selam = $saat < 6 ? 'İyi geceler' : ( $saat < 12 ? 'Günaydın' : ( $saat < 18 ? 'İyi günler' : 'İyi akşamlar' ) );
    $tarih = date_i18n('l, j F Y');
    $renk  = get_theme_mod('ahenk_renk_ana', '#D4AF37');
    ?>
    <div style="position:relative;margin:14px 0 22px;padding:26px 28px;border-radius:18px;color:#fff;overflow:hidden;
        background:radial-gradient(900px 300px at 100% -10%, rgba(255,255,255,.18), transparent 60%),
        radial-gradient(600px 280px at 0% 120%, rgba(0,0,0,.4), transparent 60%),
        linear-gradient(135deg,#0e0e10 0%, <?php echo esc_attr($renk); ?> 100%);
        box-shadow:0 18px 40px -18px rgba(212,175,55,.45)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:18px;position:relative;z-index:2">
            <div>
                <div style="font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;opacity:.85;margin-bottom:6px"><?php echo esc_html($tarih); ?></div>
                <h2 style="margin:0 0 4px;color:#fff;font-size:26px;font-weight:900;letter-spacing:-.5px"><?php echo esc_html($selam); ?>, <?php echo esc_html($u->display_name); ?> 👋</h2>
                <p style="margin:0;opacity:.92;font-size:14px">Ahenk Haber CMS paneline hoş geldiniz. Bugünün gündemi sizinle.</p>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
                <a href="<?php echo esc_url(admin_url('post-new.php?post_type=haber')); ?>" style="background:#fff;color:<?php echo esc_attr($renk); ?>;padding:11px 20px;border-radius:10px;text-decoration:none;font-weight:800;font-size:13px;box-shadow:0 8px 20px rgba(0,0,0,.18);display:inline-flex;align-items:center;gap:6px">
                    <span class="dashicons dashicons-plus-alt2" style="font-size:18px;line-height:1"></span> Yeni Haber
                </a>
                <a href="<?php echo esc_url(admin_url('admin.php?page=ahenk-manseta')); ?>" style="background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.3);padding:11px 20px;border-radius:10px;text-decoration:none;font-weight:800;font-size:13px;display:inline-flex;align-items:center;gap:6px">
                    <span class="dashicons dashicons-megaphone" style="font-size:18px;line-height:1"></span> Manşet Yönet
                </a>
                <a href="<?php echo esc_url(home_url('/')); ?>" target="_blank" style="background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.25);padding:11px 20px;border-radius:10px;text-decoration:none;font-weight:800;font-size:13px;display:inline-flex;align-items:center;gap:6px">
                    <span class="dashicons dashicons-external" style="font-size:16px;line-height:1"></span> Siteyi Aç
                </a>
            </div>
        </div>
    </div>
    <?php
});

/* === Widget: Genel istatistikler === */
function ahenk_db_genel_render() {
    $haber  = wp_count_posts('haber');
    $post   = wp_count_posts('post');
    $kose   = post_type_exists('ky-makale') ? wp_count_posts('ky-makale') : (object) array('publish'=>0,'draft'=>0);
    $kose2  = post_type_exists('kose-yazisi') ? wp_count_posts('kose-yazisi') : (object) array('publish'=>0,'draft'=>0);

    $toplam_haber  = (int)($haber->publish ?? 0) + (int)($post->publish ?? 0);
    $toplam_taslak = (int)($haber->draft   ?? 0) + (int)($post->draft   ?? 0);
    $toplam_kose   = (int)($kose->publish  ?? 0) + (int)($kose2->publish ?? 0);
    $toplam_yorum  = wp_count_comments();
    $bekleyen      = (int)($toplam_yorum->moderated ?? 0);
    $tum_yorum     = (int)($toplam_yorum->total_comments ?? 0);

    // Bugünkü haberler
    $bugun_q = new WP_Query(array(
        'post_type'      => array('haber','post'),
        'post_status'    => 'publish',
        'posts_per_page' => 1,
        'date_query'     => array(array('after'=>'today midnight')),
        'no_found_rows'  => false,
        'fields'         => 'ids',
    ));
    $bugun = (int) $bekleyen_q = $bugun_q->found_posts;

    $kartlar = array(
        array('📰', 'Toplam Haber',   $toplam_haber, '#D4AF37'),
        array('📝', 'Taslak',         $toplam_taslak, '#ea580c'),
        array('🖊', 'Köşe Yazısı',    $toplam_kose,   '#2563eb'),
        array('💬', 'Bekleyen Yorum', $bekleyen,      '#9333ea'),
        array('🔥', 'Bugün Yayın',    $bugun,         '#16a34a'),
        array('💭', 'Tüm Yorumlar',   $tum_yorum,     '#0891b2'),
    );
    echo '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;padding:6px 2px">';
    foreach ( $kartlar as $k ) {
        echo '<div style="background:linear-gradient(180deg,#fff,#fafbfd);border:1px solid #e7eaf0;border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 12px 24px -10px rgba(0,0,0,.14)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">';
        echo '<div style="width:42px;height:42px;border-radius:11px;background:'.esc_attr($k[3]).'15;color:'.esc_attr($k[3]).';display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">'.$k[0].'</div>';
        echo '<div><div style="font-size:22px;font-weight:800;line-height:1;color:#1a1a1a">'.(int)$k[2].'</div><div style="font-size:11px;color:#777;text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin-top:5px">'.esc_html($k[1]).'</div></div>';
        echo '</div>';
    }
    echo '</div>';
}

/* === Widget: Son haberler === */
function ahenk_db_son_render() {
    $q = new WP_Query(array(
        'post_type'      => array('haber','post'),
        'post_status'    => array('publish','draft','pending','future'),
        'posts_per_page' => 7,
        'orderby'        => 'date',
        'order'          => 'DESC',
        'no_found_rows'  => true,
    ));
    if ( ! $q->have_posts() ) { echo '<p style="color:#888">Henüz haber yok.</p>'; return; }

    $durum_renk = array('publish'=>'#16a34a','draft'=>'#ea580c','pending'=>'#9333ea','future'=>'#2563eb','private'=>'#64748b');
    $durum_ad   = array('publish'=>'Yayında','draft'=>'Taslak','pending'=>'Onayda','future'=>'Zamanlı','private'=>'Özel');

    echo '<div style="display:flex;flex-direction:column;gap:8px;padding:6px 2px">';
    while ( $q->have_posts() ) { $q->the_post();
        $st = get_post_status();
        $thumb = get_the_post_thumbnail_url(get_the_ID(), 'thumbnail');
        $author = get_the_author();
        echo '<a href="'.esc_url(get_edit_post_link()).'" style="display:flex;align-items:center;gap:12px;padding:10px;background:#fafbfd;border:1px solid #eef0f5;border-radius:10px;text-decoration:none;color:inherit;transition:all .15s" onmouseover="this.style.background=\'#fff\';this.style.borderColor=\'#D4AF37\'" onmouseout="this.style.background=\'#fafbfd\';this.style.borderColor=\'#eef0f5\'">';
        if ($thumb) echo '<img src="'.esc_url($thumb).'" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0;border:1px solid #eee">';
        else echo '<div style="width:48px;height:48px;border-radius:8px;background:linear-gradient(135deg,#D4AF37,#e9c75a);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📰</div>';
        echo '<div style="flex:1;min-width:0">';
        echo '<div style="font-weight:700;font-size:13px;color:#1a1a1a;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">'.esc_html(get_the_title()).'</div>';
        echo '<div style="font-size:11px;color:#888;margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
        echo '<span style="background:'.esc_attr($durum_renk[$st] ?? '#888').'15;color:'.esc_attr($durum_renk[$st] ?? '#888').';padding:2px 7px;border-radius:999px;font-weight:700;font-size:10px">'.esc_html($durum_ad[$st] ?? $st).'</span>';
        echo '<span>'.esc_html($author).'</span><span>•</span><span>'.esc_html(get_the_date('d M, H:i')).'</span>';
        echo '</div></div></a>';
    }
    wp_reset_postdata();
    echo '</div>';
    echo '<div style="margin-top:10px;text-align:right"><a href="'.esc_url(admin_url('edit.php?post_type=haber')).'" style="font-size:12px;font-weight:700;color:#D4AF37;text-decoration:none">Tüm haberleri gör →</a></div>';
}

/* === Widget: Bekleyen taslaklar === */
function ahenk_db_taslak_render() {
    $q = new WP_Query(array(
        'post_type'      => array('haber','post'),
        'post_status'    => array('draft','pending'),
        'posts_per_page' => 6,
        'orderby'        => 'modified',
        'order'          => 'DESC',
        'no_found_rows'  => true,
    ));
    if ( ! $q->have_posts() ) { echo '<p style="color:#888;text-align:center;padding:20px 0">✨ Bekleyen taslak yok!</p>'; return; }
    echo '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px">';
    while ( $q->have_posts() ) { $q->the_post();
        echo '<li><a href="'.esc_url(get_edit_post_link()).'" style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 12px;background:#fafbfd;border:1px solid #eef0f5;border-radius:8px;text-decoration:none;color:#333;font-size:12.5px;transition:all .15s" onmouseover="this.style.background=\'#fff\';this.style.borderColor=\'#ea580c\'" onmouseout="this.style.background=\'#fafbfd\';this.style.borderColor=\'#eef0f5\'">';
        echo '<span style="font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'.esc_html(get_the_title() ?: '(Başlıksız)').'</span>';
        echo '<span style="font-size:10px;color:#999;flex-shrink:0">'.esc_html(get_the_modified_date('d M')).'</span>';
        echo '</a></li>';
    }
    wp_reset_postdata();
    echo '</ul>';
}

/* === Widget: Aktif Manşetler === */
function ahenk_db_manset_render() {
    $q = new WP_Query(array(
        'post_type'      => array('haber','post'),
        'post_status'    => 'publish',
        'posts_per_page' => 5,
        'meta_query'     => array(array('key'=>'_manset_haberi','value'=>'1')),
        'no_found_rows'  => true,
    ));
    if ( ! $q->have_posts() ) {
        echo '<p style="color:#888;text-align:center;padding:14px 0">Henüz manşet seçilmemiş.</p>';
        echo '<div style="text-align:center"><a href="'.esc_url(admin_url('admin.php?page=ahenk-manseta')).'" class="button button-primary" style="font-size:12px">+ Manşet Ekle</a></div>';
        return;
    }
    echo '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px">';
    while ( $q->have_posts() ) { $q->the_post();
        $thumb = get_the_post_thumbnail_url(get_the_ID(), 'thumbnail');
        echo '<li style="display:flex;align-items:center;gap:10px;padding:8px;background:#fff8e1;border:1px solid #e8cf7a;border-radius:8px">';
        if ($thumb) echo '<img src="'.esc_url($thumb).'" style="width:40px;height:40px;border-radius:6px;object-fit:cover;flex-shrink:0">';
        echo '<a href="'.esc_url(get_edit_post_link()).'" style="flex:1;font-size:12.5px;font-weight:700;color:#1a1a1a;text-decoration:none;line-height:1.35;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">🔥 '.esc_html(get_the_title()).'</a>';
        echo '</li>';
    }
    wp_reset_postdata();
    echo '</ul>';
}

/* === Widget: Aktif Yazarlar === */
function ahenk_db_yazarlar_render() {
    $yazarlar = function_exists('ky_yazarlar_al') ? ky_yazarlar_al(true) : array();
    if ( empty($yazarlar) ) {
        echo '<p style="color:#888;text-align:center;padding:14px 0">Henüz panelden yazar eklenmemiş.</p>';
        return;
    }
    $yazarlar = array_slice($yazarlar, 0, 8);
    echo '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;padding:6px 2px">';
    foreach ( $yazarlar as $yz ) {
        if ( empty($yz->id) ) continue;
        $foto = ! empty($yz->foto) ? $yz->foto : '';
        $sayi = (int) ( new WP_Query(array(
            'post_type'=>'ky-makale','post_status'=>'publish','posts_per_page'=>1,'fields'=>'ids',
            'meta_query'=>array(array('key'=>'_ky_yazar_id','value'=>(int)$yz->id))
        )) )->found_posts;
        echo '<div style="background:#fff;border:1px solid #eef0f5;border-radius:12px;padding:14px 10px;text-align:center;transition:all .2s" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 8px 18px -6px rgba(0,0,0,.12)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">';
        if ($foto) echo '<img src="'.esc_url($foto).'" style="width:54px;height:54px;border-radius:50%;object-fit:cover;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.12);margin-bottom:8px">';
        else echo '<div style="width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#D4AF37,#e9c75a);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;margin-bottom:8px;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.12)">'.esc_html(mb_strtoupper(mb_substr($yz->ad ?? '?', 0, 1))).'</div>';
        echo '<div style="font-size:12.5px;font-weight:800;color:#1a1a1a;line-height:1.3">'.esc_html($yz->ad ?? '').'</div>';
        echo '<div style="font-size:10px;color:#888;margin-top:3px"><b style="color:#D4AF37">'.$sayi.'</b> yazı</div>';
        echo '</div>';
    }
    echo '</div>';
    echo '<div style="margin-top:12px;text-align:right"><a href="'.esc_url(admin_url('admin.php?page=ahenk-yazarlar-sira')).'" style="font-size:12px;font-weight:700;color:#D4AF37;text-decoration:none">Yazarları yönet →</a></div>';
}

/* =============================================================
   6) KULLANICI PROFİL — gereksiz alanları gizle (estetik)
   ============================================================= */
add_action('admin_print_styles-profile.php', function(){
    echo '<style>.user-rich-editing-wrap,.user-syntax-highlighting-wrap,.user-comment-shortcuts-wrap,.show-admin-bar{display:none}</style>';
});

/* =============================================================
   7) "Howdy" yerine selamlama
   ============================================================= */
add_filter('admin_bar_menu', function($wp_admin_bar){
    $my = $wp_admin_bar->get_node('my-account');
    if ( ! $my ) return;
    $my->title = str_replace('Howdy,', '', $my->title);
    $my->title = str_replace('Merhaba,', '', $my->title);
    $wp_admin_bar->add_node((array)$my);
}, 1000);

/* =============================================================
   8) WORDPRESS MARKASINI TAMAMEN GİZLE — "ÖZEL YAZILIM" GÖRÜNÜMÜ
   ============================================================= */

/* Tarayıcı sekmesindeki "— WordPress" kuyruğunu sil, AHENK CMS yaz */
add_filter('admin_title', function($admin_title, $title){
    $site = get_bloginfo('name');
    return ($title ? $title . ' · ' : '') . $site . ' — Ahenk CMS';
}, 10, 2);

/* HTML <head> içinde WP versiyonunu ve generator'ı gizle */
remove_action('wp_head', 'wp_generator');
add_filter('the_generator', '__return_empty_string');

/* Admin <head> — favicon, meta, anti-WP işaretleri */
add_action('admin_head', function(){
    $renk = get_theme_mod('ahenk_renk_ana', '#D4AF37');
    $svg  = 'data:image/svg+xml;utf8,'.rawurlencode(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="'.$renk.'"/><text x="50%" y="55%" font-family="Arial,sans-serif" font-size="34" font-weight="900" fill="#fff" text-anchor="middle" dominant-baseline="middle">A</text></svg>'
    );
    ?>
    <link rel="icon" type="image/svg+xml" href="<?php echo esc_attr($svg); ?>">
    <style id="ahenk-cms-rebrand">
        /* "WordPress" yazan tüm etiketleri/üst başlıkları gizle */
        #wpfooter #footer-upgrade,
        #wp-version-message,
        .update-nag,
        #footer-thankyou + #footer-upgrade,
        .wp-version,
        a[href*="wordpress.org"],
        a[href*="wp.org"]{ display:none !important; }

        /* Sağ üst Help/Screen Options düğmelerini sade tut, WP yazılarını gizle */
        #screen-meta-links #contextual-help-link-wrap{display:none !important}
        #screen-options-link-wrap .show-settings::after{content:" "}

        /* Eklenti uyarı bantları, "WordPress sürümü güncel" mesajları */
        .notice.notice-warning a[href*="wordpress.org"],
        .updated.notice a[href*="wp-admin/update-core.php"]{display:none}

        /* WP hakkında ekranını gizle (about.php) — yine de erişilirse boş bırak */
        body.about-php .wrap .about-header,
        body.about-php .wrap .about-text,
        body.about-php .wrap .wp-badge{display:none !important}

        /* Üst bar: "Howdy / Merhaba" sözcüklerini gizle (CSS) */
        #wp-admin-bar-my-account > .ab-item .display-name::before{content:""}

        /* "WordPress'e Hoş Geldiniz" gibi kalıntıları gizle */
        #welcome-panel, .welcome-panel{display:none !important}
        body.index-php #dashboard_right_now,
        body.index-php #dashboard_primary,
        body.index-php #dashboard_quick_press,
        body.index-php #dashboard_recent_drafts,
        body.index-php #dashboard_activity,
        body.index-php #dashboard_site_health{display:none !important}

        /* Site sağlığı / WP haber widget'ları */
        #dashboard-widgets #dashboard_site_health,
        #dashboard-widgets #dashboard_primary,
        #dashboard-widgets #dashboard_secondary{display:none !important}
    </style>
    <?php
});

/* Footer "Thank you for creating with WordPress" yerine marka yazısı */
add_filter('admin_footer_text', function(){
    return '<span style="display:inline-flex;align-items:center;gap:8px"><span style="background:linear-gradient(135deg,#D4AF37,#f0d36b);color:#fff;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:1px">AHENK</span><span style="color:#666">Premium Haber Yönetim Sistemi · v2.0</span></span>';
}, 99);
add_filter('update_footer', function(){
    return '<span style="opacity:.55;font-weight:700">Ahenk CMS · Tüm sistemler aktif</span>';
}, 99);

/* Sağ üst kullanıcı menüsünden "Howdy/Merhaba" tamamen kaldır */
add_filter('gettext', function($translated, $original, $domain){
    if ( ! is_admin() && ! is_admin_bar_showing() ) return $translated;
    static $harita = null;
    if ( $harita === null ) {
        $harita = array(
            'Howdy, %1$s'        => '%1$s',
            'Merhaba, %1$s'      => '%1$s',
            'Howdy, %s'          => '%s',
            'Merhaba, %s'        => '%s',
            'WordPress'          => 'Ahenk CMS',
            'About WordPress'    => 'Ahenk CMS Hakkında',
            'WordPress Hakkında' => 'Ahenk CMS Hakkında',
            'Thank you for creating with %s.' => '',
            'WordPress.org'      => '',
            'Documentation'      => 'Belgeler',
            'Belgelendirme'      => 'Belgeler',
            'Get Involved'       => 'Topluluk',
            'Posts'              => 'Yazılar',
            'Dashboard'          => 'Kontrol Paneli',
            'Plugins'            => 'Eklentiler',
            'Tools'              => 'Araçlar',
            'Settings'           => 'Ayarlar',
            'Welcome to WordPress!' => 'Ahenk CMS\'e Hoş Geldiniz!',
        );
    }
    return isset($harita[$original]) ? $harita[$original] : $translated;
}, 999, 3);

/* Admin bar "About WordPress" / Belge / Forum / Geri bildirim öğelerini sil */
add_action('admin_bar_menu', function($wp){
    $sil = array('wp-logo','about','wporg','documentation','support-forums','feedback','view-site');
    foreach ($sil as $id) $wp->remove_node($id);
}, 999);

/* Sol menüdeki gereksiz WP ögelerini gizle (Yorumlar varsa kalsın) */
add_action('admin_menu', function(){
    // WP'nin "Updates" alt menüsü
    remove_submenu_page('index.php', 'update-core.php');
    // Tools alt menüleri (sadeleştirme)
    remove_submenu_page('tools.php', 'tools.php');
    remove_submenu_page('tools.php', 'import.php');
    remove_submenu_page('tools.php', 'export.php');
    remove_submenu_page('tools.php', 'site-health.php');
    remove_submenu_page('tools.php', 'export-personal-data.php');
    remove_submenu_page('tools.php', 'erase-personal-data.php');
}, 999);

/* Menü etiketlerini "haber sitesi" diline çevir */
add_action('admin_menu', function(){
    global $menu, $submenu;
    if ( ! is_array($menu) ) return;
    foreach ( $menu as $k => $m ) {
        if ( ! isset($m[0]) ) continue;
        // Yazılar → Haberler (varsayılan post)
        if ( strpos($m[2] ?? '', 'edit.php') === 0 && ($m[2] === 'edit.php') ) {
            $menu[$k][0] = 'Yazılar (Blog)';
        }
        // Kullanıcılar → Editörler
        if ( $m[2] === 'users.php' )      $menu[$k][0] = 'Editörler';
        if ( $m[2] === 'tools.php' )      $menu[$k][0] = 'Araç Kutusu';
        if ( $m[2] === 'options-general.php' ) $menu[$k][0] = 'Sistem Ayarları';
        if ( $m[2] === 'plugins.php' )    $menu[$k][0] = 'Modüller';
        if ( $m[2] === 'themes.php' )     $menu[$k][0] = 'Görünüm';
        if ( $m[2] === 'upload.php' )     $menu[$k][0] = 'Medya Kütüphanesi';
        if ( $m[2] === 'index.php' )      $menu[$k][0] = 'Kontrol Paneli';
    }
}, 9999);

/* Yönetici renk şemasını zorla "ahenk" yap (kişiselleştirmeyi atla) */
add_filter('get_user_option_admin_color', function(){ return 'fresh'; }, 999);

/* Login ekranından "← Site adına geri dön" yazısını yumuşat */
add_filter('login_headertext', function(){ return get_bloginfo('name'); });

/* Sol menünün dibine küçük marka rozeti */
add_action('adminmenu', function(){
    ?>
    <div style="margin:18px 10px 60px;padding:14px;border-radius:12px;background:linear-gradient(135deg,rgba(212,175,55,.18),rgba(0,0,0,.4));border:1px solid rgba(255,255,255,.08);text-align:center">
        <div style="font-size:11px;color:rgba(255,255,255,.5);font-weight:700;letter-spacing:1.5px;margin-bottom:6px">POWERED BY</div>
        <div style="font-size:14px;color:#fff;font-weight:900;letter-spacing:.5px">AHENK <span style="color:#e9c75a">CMS</span></div>
        <div style="font-size:10px;color:rgba(255,255,255,.4);margin-top:4px">v2.0 PRO · 2026</div>
    </div>
    <?php
});

/* Yeni kurulumda "WP'ye Hoş Geldiniz" panelini kapat */
update_option('show_welcome_panel', 0);
