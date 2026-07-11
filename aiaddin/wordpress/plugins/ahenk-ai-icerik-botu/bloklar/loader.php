<?php
/**
 * Ahenk Haber Blokları — Entegre modül
 * "Ahenk Haber Blokları" eklentisinin tamamı bu modüle gömüldü.
 * Standalone eklenti aktifse function_exists guard'ları çakışmayı önler.
 *
 * Aynı option key'leri kullanır → standalone eklentiyi kaldırırsan veriler korunur:
 *   - ahenk_blok_post_type
 *   - ahenk_blok_taxonomy
 *   - ahenk_blok_hikaye_ids
 *   - ahenk_blok_manset_ids
 *   - ahenk_blok_manset_mini_ids
 *   - ahenk_blok_tab_kategoriler
 */

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! defined( 'AHENK_BLOK_VER' ) )  define( 'AHENK_BLOK_VER', '1.1.1' );
if ( ! defined( 'AHENK_BLOK_URL' ) )  define( 'AHENK_BLOK_URL', plugin_dir_url( __FILE__ ) );

/* ============================================================
   Asset enqueue
   ============================================================ */
if ( ! function_exists( 'ahenk_blok_assets' ) ) {
    function ahenk_blok_assets() {
        wp_register_style( 'ahenk-bloklar', AHENK_BLOK_URL . 'assets/ahenk-bloklar.css', array(), AHENK_BLOK_VER );
        wp_register_script( 'ahenk-bloklar', AHENK_BLOK_URL . 'assets/ahenk-bloklar.js', array(), AHENK_BLOK_VER, true );
    }
    add_action( 'wp_enqueue_scripts', 'ahenk_blok_assets' );
}
if ( ! function_exists( 'ahenk_blok_enqueue' ) ) {
    function ahenk_blok_enqueue() {
        wp_enqueue_style( 'ahenk-bloklar' );
        wp_enqueue_script( 'ahenk-bloklar' );
    }
}

/* ============================================================
   Yardımcılar
   ============================================================ */
if ( ! function_exists( 'ahenk_blok_post_type' ) ) {
    function ahenk_blok_post_type() {
        $kayitli = get_option( 'ahenk_blok_post_type', '' );
        if ( $kayitli ) return $kayitli;
        if ( post_type_exists( 'haber' ) ) return 'haber';
        return 'post';
    }
}
if ( ! function_exists( 'ahenk_blok_taxonomy' ) ) {
    function ahenk_blok_taxonomy() {
        $kayitli = get_option( 'ahenk_blok_taxonomy', '' );
        if ( $kayitli ) return $kayitli;
        $pt = ahenk_blok_post_type();
        if ( $pt === 'post' ) return 'category';
        foreach ( array( 'haber-kategorisi','haber_kategori','haber_kategorileri','haberler_kategori','kategori' ) as $t ) {
            if ( taxonomy_exists( $t ) ) return $t;
        }
        $taxs = get_object_taxonomies( $pt );
        return ! empty( $taxs ) ? $taxs[0] : 'category';
    }
}
if ( ! function_exists( 'ahenk_blok_terimler' ) ) {
    function ahenk_blok_terimler( $args = array() ) {
        $args = wp_parse_args( $args, array( 'hide_empty'=>1, 'orderby'=>'count', 'order'=>'DESC', 'number'=>0 ) );
        $args['taxonomy'] = ahenk_blok_taxonomy();
        return get_terms( $args );
    }
}
if ( ! function_exists( 'ahenk_blok_post_terim_adi' ) ) {
    function ahenk_blok_post_terim_adi( $post_id ) {
        $tax = ahenk_blok_taxonomy();
        $terms = get_the_terms( $post_id, $tax );
        if ( ! $terms || is_wp_error( $terms ) ) return '';
        return $terms[0]->name;
    }
}
if ( ! function_exists( 'ahenk_blok_tax_query' ) ) {
    function ahenk_blok_tax_query( $slug_csv ) {
        $slugs = array_filter( array_map( 'trim', explode( ',', $slug_csv ) ) );
        if ( empty( $slugs ) ) return null;
        return array( array(
            'taxonomy' => ahenk_blok_taxonomy(),
            'field'    => 'slug',
            'terms'    => $slugs,
        ) );
    }
}
if ( ! function_exists( 'ahenk_blok_secili_idler' ) ) {
    function ahenk_blok_secili_idler( $option_key ) {
        $v = get_option( $option_key, '' );
        if ( is_array( $v ) ) return array_map( 'intval', $v );
        $v = trim( (string) $v );
        if ( $v === '' ) return array();
        return array_filter( array_map( 'intval', preg_split( '/[\s,]+/', $v ) ) );
    }
}

/* ============================================================
   1) HİKAYE BALONCUKLARI  —  [ahenk_hikayeler]
   ============================================================ */
if ( ! function_exists( 'ahenk_sc_hikayeler' ) ) {
    function ahenk_sc_hikayeler( $atts ) {
        $a = shortcode_atts( array(
            'sayi'     => 15,
            'kategori' => '',
            'baslik'   => '',
            'kaynak'   => 'panel',
        ), $atts, 'ahenk_hikayeler' );

        ahenk_blok_enqueue();

        $args = array(
            'post_type'           => ahenk_blok_post_type(),
            'posts_per_page'      => intval( $a['sayi'] ),
            'ignore_sticky_posts' => 1,
        );

        $secili = ahenk_blok_secili_idler( 'ahenk_blok_hikaye_ids' );
        if ( $a['kaynak'] === 'panel' && ! empty( $secili ) ) {
            $args['post__in']       = $secili;
            $args['orderby']        = 'post__in';
            $args['posts_per_page'] = count( $secili );
        } elseif ( ! empty( $a['kategori'] ) ) {
            $args['category_name'] = sanitize_title( $a['kategori'] );
        }

        $q = new WP_Query( $args );
        if ( ! $q->have_posts() ) return '';

        ob_start(); ?>
        <div class="ahk-hikaye-wrap">
            <?php if ( $a['baslik'] ) : ?><div class="ahk-hikaye-baslik"><?php echo esc_html( $a['baslik'] ); ?></div><?php endif; ?>
            <button class="ahk-hk-nav ahk-hk-prev" aria-label="Önceki">&#10094;</button>
            <div class="ahk-hikaye-scroll">
                <?php while ( $q->have_posts() ) : $q->the_post();
                    $img = get_the_post_thumbnail_url( get_the_ID(), 'thumbnail' );
                    if ( ! $img ) $img = AHENK_BLOK_URL . 'assets/placeholder.svg';
                    $title = get_the_title();
                ?>
                <a href="<?php the_permalink(); ?>" class="ahk-hikaye-item" title="<?php echo esc_attr( $title ); ?>">
                    <span class="ahk-hk-ring"><span class="ahk-hk-img" style="background-image:url('<?php echo esc_url( $img ); ?>')"></span></span>
                    <span class="ahk-hk-text"><?php echo esc_html( wp_trim_words( $title, 4, '…' ) ); ?></span>
                </a>
                <?php endwhile; wp_reset_postdata(); ?>
            </div>
            <button class="ahk-hk-nav ahk-hk-next" aria-label="Sonraki">&#10095;</button>
        </div>
        <?php
        return ob_get_clean();
    }
    if ( ! shortcode_exists( 'ahenk_hikayeler' ) ) add_shortcode( 'ahenk_hikayeler', 'ahenk_sc_hikayeler' );
}

/* ============================================================
   2) KATEGORİ TABLARI  —  [ahenk_kategori_tab]
   ============================================================ */
if ( ! function_exists( 'ahenk_sc_kategori_tab' ) ) {
    function ahenk_sc_kategori_tab( $atts ) {
        $a = shortcode_atts( array(
            'kategoriler' => '',
            'sayi'        => 6,
            'baslik'      => '',
        ), $atts, 'ahenk_kategori_tab' );

        ahenk_blok_enqueue();

        if ( empty( $a['kategoriler'] ) ) {
            $kayitli = trim( (string) get_option( 'ahenk_blok_tab_kategoriler', '' ) );
            if ( $kayitli !== '' ) $a['kategoriler'] = $kayitli;
        }

        if ( empty( $a['kategoriler'] ) ) {
            $cats = ahenk_blok_terimler( array( 'number' => 5 ) );
        } else {
            $slugs = array_map( 'trim', explode( ',', $a['kategoriler'] ) );
            $cats = array();
            $tax = ahenk_blok_taxonomy();
            foreach ( $slugs as $s ) { $c = get_term_by( 'slug', $s, $tax ); if ( $c ) $cats[] = $c; }
        }
        if ( empty( $cats ) ) return '';

        $uid = 'ahk-tab-' . wp_rand( 1000, 9999 );
        ob_start(); ?>
        <div class="ahk-tab-wrap" id="<?php echo esc_attr( $uid ); ?>">
            <?php if ( $a['baslik'] ) : ?><div class="ahk-tab-anabaslik"><?php echo esc_html( $a['baslik'] ); ?></div><?php endif; ?>
            <div class="ahk-tab-bar" role="tablist">
                <?php foreach ( $cats as $i => $c ) : ?>
                    <button class="ahk-tab-btn<?php echo $i === 0 ? ' aktif' : ''; ?>" data-tab="<?php echo esc_attr( $c->slug ); ?>" role="tab"><?php echo esc_html( $c->name ); ?></button>
                <?php endforeach; ?>
            </div>
            <div class="ahk-tab-icerik">
                <?php foreach ( $cats as $i => $c ) :
                    $tq = new WP_Query( array(
                        'post_type'           => ahenk_blok_post_type(),
                        'posts_per_page'      => intval( $a['sayi'] ),
                        'tax_query'           => ahenk_blok_tax_query( $c->slug ),
                        'ignore_sticky_posts' => 1,
                    ) );
                ?>
                <div class="ahk-tab-panel<?php echo $i === 0 ? ' aktif' : ''; ?>" data-panel="<?php echo esc_attr( $c->slug ); ?>">
                    <?php if ( $tq->have_posts() ) : ?>
                    <div class="ahk-tab-grid">
                        <?php while ( $tq->have_posts() ) : $tq->the_post();
                            $img = get_the_post_thumbnail_url( get_the_ID(), 'medium' );
                        ?>
                        <a href="<?php the_permalink(); ?>" class="ahk-tab-card">
                            <span class="ahk-tab-img" <?php if ( $img ) : ?>style="background-image:url('<?php echo esc_url( $img ); ?>')"<?php endif; ?>></span>
                            <span class="ahk-tab-meta">
                                <span class="ahk-tab-kat"><?php echo esc_html( $c->name ); ?></span>
                                <h4 class="ahk-tab-baslik"><?php echo esc_html( get_the_title() ); ?></h4>
                                <span class="ahk-tab-tarih"><?php echo esc_html( get_the_date() ); ?></span>
                            </span>
                        </a>
                        <?php endwhile; wp_reset_postdata(); ?>
                    </div>
                    <?php else : ?><div class="ahk-tab-bos">Bu kategoride henüz haber yok.</div><?php endif; ?>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    if ( ! shortcode_exists( 'ahenk_kategori_tab' ) ) add_shortcode( 'ahenk_kategori_tab', 'ahenk_sc_kategori_tab' );
}

/* ============================================================
   3) MANŞET SLIDER  —  [ahenk_manset]
   ============================================================ */
if ( ! function_exists( 'ahenk_sc_manset' ) ) {
    function ahenk_sc_manset( $atts ) {
        $a = shortcode_atts( array(
            'sayi'     => 5,
            'kategori' => '',
            'otomatik' => 1,
            'sure'     => 5000,
            'kucuk'    => 4,
            'kaynak'   => 'panel',
        ), $atts, 'ahenk_manset' );

        ahenk_blok_enqueue();

        $manset_ids = ahenk_blok_secili_idler( 'ahenk_blok_manset_ids' );
        $mini_ids   = ahenk_blok_secili_idler( 'ahenk_blok_manset_mini_ids' );

        if ( $a['kaynak'] === 'panel' && ! empty( $manset_ids ) ) {
            $bq = new WP_Query( array( 'post_type'=>ahenk_blok_post_type(), 'post__in'=>$manset_ids, 'orderby'=>'post__in', 'posts_per_page'=>count( $manset_ids ) ) );
            $buyuk = $bq->posts;
            if ( ! empty( $mini_ids ) ) {
                $mq = new WP_Query( array( 'post_type'=>ahenk_blok_post_type(), 'post__in'=>$mini_ids, 'orderby'=>'post__in', 'posts_per_page'=>count( $mini_ids ) ) );
                $kucuk = $mq->posts;
            } else {
                $eq = new WP_Query( array( 'post_type'=>ahenk_blok_post_type(), 'post__not_in'=>$manset_ids, 'posts_per_page'=>intval( $a['kucuk'] ) ) );
                $kucuk = $eq->posts;
            }
        } else {
            $args = array( 'post_type'=>ahenk_blok_post_type(), 'posts_per_page'=>intval( $a['sayi'] ) + intval( $a['kucuk'] ), 'ignore_sticky_posts'=>0 );
            if ( ! empty( $a['kategori'] ) ) $args['category_name'] = sanitize_title( $a['kategori'] );
            $q = new WP_Query( $args );
            if ( ! $q->have_posts() ) return '';
            $buyuk = array_slice( $q->posts, 0, intval( $a['sayi'] ) );
            $kucuk = array_slice( $q->posts, intval( $a['sayi'] ), intval( $a['kucuk'] ) );
        }

        if ( empty( $buyuk ) ) return '';

        $uid = 'ahk-ms-' . wp_rand( 1000, 9999 );
        ob_start(); ?>
        <div class="ahk-manset-wrap" id="<?php echo esc_attr( $uid ); ?>" data-otomatik="<?php echo intval( $a['otomatik'] ); ?>" data-sure="<?php echo intval( $a['sure'] ); ?>">
            <div class="ahk-manset-buyuk">
                <div class="ahk-manset-slides">
                    <?php foreach ( $buyuk as $i => $p ) :
                        $img = get_the_post_thumbnail_url( $p->ID, 'large' );
                        $kat = ahenk_blok_post_terim_adi( $p->ID );
                    ?>
                    <a href="<?php echo esc_url( get_permalink( $p->ID ) ); ?>" class="ahk-manset-slide<?php echo $i === 0 ? ' aktif' : ''; ?>" data-i="<?php echo $i; ?>" <?php if ( $img ) : ?>style="background-image:url('<?php echo esc_url( $img ); ?>')"<?php endif; ?>>
                        <span class="ahk-manset-overlay"></span>
                        <span class="ahk-manset-icerik">
                            <?php if ( $kat ) : ?><span class="ahk-manset-kat"><?php echo esc_html( $kat ); ?></span><?php endif; ?>
                            <h2 class="ahk-manset-baslik"><?php echo esc_html( get_the_title( $p->ID ) ); ?></h2>
                            <span class="ahk-manset-ozet"><?php echo esc_html( wp_trim_words( get_the_excerpt( $p ), 22, '…' ) ); ?></span>
                        </span>
                    </a>
                    <?php endforeach; ?>
                </div>
                <button class="ahk-ms-nav ahk-ms-prev" aria-label="Önceki">&#10094;</button>
                <button class="ahk-ms-nav ahk-ms-next" aria-label="Sonraki">&#10095;</button>
                <div class="ahk-ms-dots">
                    <?php foreach ( $buyuk as $i => $p ) : ?>
                        <button class="ahk-ms-dot<?php echo $i === 0 ? ' aktif' : ''; ?>" data-i="<?php echo $i; ?>" aria-label="<?php echo $i + 1; ?>"></button>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php if ( ! empty( $kucuk ) ) : ?>
            <div class="ahk-manset-yan">
                <?php foreach ( $kucuk as $p ) :
                    $img = get_the_post_thumbnail_url( $p->ID, 'medium' );
                ?>
                <a href="<?php echo esc_url( get_permalink( $p->ID ) ); ?>" class="ahk-manset-mini">
                    <span class="ahk-mini-img" <?php if ( $img ) : ?>style="background-image:url('<?php echo esc_url( $img ); ?>')"<?php endif; ?>></span>
                    <span class="ahk-mini-baslik"><?php echo esc_html( get_the_title( $p->ID ) ); ?></span>
                </a>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
        <?php
        wp_reset_postdata();
        return ob_get_clean();
    }
    if ( ! shortcode_exists( 'ahenk_manset' ) ) add_shortcode( 'ahenk_manset', 'ahenk_sc_manset' );
}

/* ============================================================
   IFRAME ENDPOINT  —  /?ahenk_blok=manset|hikaye|tab
   ============================================================ */
if ( ! has_action( 'template_redirect', 'ahenk_blok_iframe_redirect' ) ) {
    add_action( 'init', function() {
        add_rewrite_endpoint( 'ahenk-blok', EP_ROOT );
    } );

    add_filter( 'query_vars', function( $vars ) {
        foreach ( array( 'ahenk_blok','sayi','kategori','kategoriler','baslik','kucuk','otomatik','sure','kaynak' ) as $k ) {
            if ( ! in_array( $k, $vars, true ) ) $vars[] = $k;
        }
        return $vars;
    } );

    function ahenk_blok_iframe_redirect() {
        $tip = isset( $_GET['ahenk_blok'] ) ? sanitize_key( $_GET['ahenk_blok'] ) : '';
        if ( ! $tip ) return;

        $map = array(
            'manset'           => 'ahenk_manset',
            'hikaye'           => 'ahenk_hikayeler',
            'hikayeler'        => 'ahenk_hikayeler',
            'tab'              => 'ahenk_kategori_tab',
            'kategori'         => 'ahenk_kategori_tab',
            // Video blokları (video-tv eklentisi)
            'video_manset'     => 'ahenk_video_manset',
            'video_hikaye'     => 'ahenk_video_hikayeler',
            'video_hikayeler'  => 'ahenk_video_hikayeler',
            'video_grid'       => 'ahenk_video_grid',
        );
        if ( ! isset( $map[ $tip ] ) ) return;

        $sc = $map[ $tip ];
        $allowed = array( 'sayi','kategori','kategoriler','baslik','kucuk','sutun','otomatik','sure','kaynak' );
        $attrs = '';
        foreach ( $allowed as $k ) {
            if ( isset( $_GET[ $k ] ) && $_GET[ $k ] !== '' ) {
                $attrs .= ' ' . $k . '="' . esc_attr( sanitize_text_field( $_GET[ $k ] ) ) . '"';
            }
        }

        while ( ob_get_level() ) { ob_end_clean(); }

        // === AGRESİF CACHE-BYPASS ===
        // 1) WP cache eklentileri (WP Rocket, W3TC, LiteSpeed, WP Super Cache)
        if ( ! defined( 'DONOTCACHEPAGE' )    ) define( 'DONOTCACHEPAGE',    true );
        if ( ! defined( 'DONOTCACHEDB' )      ) define( 'DONOTCACHEDB',      true );
        if ( ! defined( 'DONOTCACHEOBJECT' )  ) define( 'DONOTCACHEOBJECT',  true );
        if ( ! defined( 'DONOTMINIFY' )       ) define( 'DONOTMINIFY',       true );
        // 2) Cloudflare / Varnish / nginx fastcgi
        nocache_headers();
        header_remove( 'Last-Modified' );
        header_remove( 'ETag' );
        header( 'Cache-Control: no-store, no-cache, must-revalidate, max-age=0, private' );
        header( 'CDN-Cache-Control: no-store' );
        header( 'Cloudflare-CDN-Cache-Control: no-store' );
        header( 'Surrogate-Control: no-store' );
        header( 'X-Accel-Expires: 0' );
        header( 'Pragma: no-cache' );
        header( 'Expires: Wed, 11 Jan 1984 05:00:00 GMT' );
        header( 'Vary: *' );
        // 3) Standart başlıklar
        header( 'Content-Type: text/html; charset=utf-8' );
        header_remove( 'X-Frame-Options' );
        header( 'Content-Security-Policy: frame-ancestors *;' );

        $css_dosya = plugin_dir_path( __FILE__ ) . 'assets/ahenk-bloklar.css';
        $js_dosya  = plugin_dir_path( __FILE__ ) . 'assets/ahenk-bloklar.js';
        $css = file_exists( $css_dosya ) ? file_get_contents( $css_dosya ) : '';
        $js  = file_exists( $js_dosya )  ? file_get_contents( $js_dosya )  : '';

        $icerik = do_shortcode( '[' . $sc . $attrs . ']' );

        echo '<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">';
        echo '<meta name="viewport" content="width=device-width,initial-scale=1">';
        echo '<base target="_top">';
        echo '<title>Ahenk Blok</title>';
        echo '<style>html,body{margin:0;padding:0;background:transparent;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a1a}body{padding:8px;overflow-x:hidden}*{box-sizing:border-box}a{text-decoration:none}</style>';
        echo '<style id="ahk-inline-css">' . $css . '</style>';
        echo '</head><body>';
        echo $icerik;
        echo '<script>' . $js . '</script>';
        echo '<script>(function(){function s(){var h=document.documentElement.scrollHeight;if(window.parent)try{window.parent.postMessage({ahenkHeight:h,id:location.search},"*")}catch(e){}}window.addEventListener("load",s);setTimeout(s,400);setInterval(s,1500);
        /* OTOMATİK İÇERİK TAZELEME — 5 dakikada bir iframe kendini yeniler.
           Eski iframe kodu (cache-busting parametresi olmayan) kullanıldığında bile içerik güncel kalır. */
        setTimeout(function(){
          try{
            var u=new URL(location.href);
            u.searchParams.set("v", Math.floor(Date.now()/60000));
            location.replace(u.toString());
          }catch(e){ location.reload(); }
        }, 300000);
        })();</script>';
        echo '</body></html>';
        exit;
    }
    add_action( 'template_redirect', 'ahenk_blok_iframe_redirect' );
}

/* ============================================================
   ADMIN — Submenu (ana eklenti menüsü altına)
   ============================================================ */
if ( ! function_exists( 'ahenk_blok_admin_menu_integrated' ) ) {
    function ahenk_blok_admin_menu_integrated() {
        // Standalone eklenti zaten kendi ana menüsünü ekliyorsa, çakışmayı önle
        // ama biz ana eklenti (ai-haber-botu) menüsü ALTINA koyduğumuz için sorun olmaz.
        add_submenu_page( 'ai-haber-botu', '📦 Hikaye Yönetimi',  '— Bloklar: Hikayeler',   'edit_posts',   'ahb-bloklar-hikaye',  'ahenk_blok_admin_hikaye' );
        add_submenu_page( 'ai-haber-botu', '📦 Manşet Yönetimi',  '— Bloklar: Manşetler',   'edit_posts',   'ahb-bloklar-manset',  'ahenk_blok_admin_manset' );
        add_submenu_page( 'ai-haber-botu', '📦 Tab Kategorileri', '— Bloklar: Tab Kat.',    'edit_posts',   'ahb-bloklar-tab',     'ahenk_blok_admin_tab' );
        add_submenu_page( 'ai-haber-botu', '📦 Bloklar Ayarları', '— Bloklar: Ayarlar',     'manage_options','ahb-bloklar-ayar',   'ahenk_blok_admin_ayar' );
    }
    add_action( 'admin_menu', 'ahenk_blok_admin_menu_integrated', 30 );
}

if ( ! function_exists( 'ahenk_blok_admin_ayar' ) ) {
    function ahenk_blok_admin_ayar() {
        if ( ! current_user_can( 'manage_options' ) ) return;
        if ( isset( $_POST['ahenk_blok_ayar_nonce'] ) && wp_verify_nonce( $_POST['ahenk_blok_ayar_nonce'], 'ahenk_blok_ayar' ) ) {
            update_option( 'ahenk_blok_post_type', sanitize_key( $_POST['ahk_pt'] ) );
            update_option( 'ahenk_blok_taxonomy',  sanitize_key( $_POST['ahk_tax'] ) );
            echo '<div class="notice notice-success is-dismissible"><p><strong>Ayarlar kaydedildi!</strong></p></div>';
        }
        $cur_pt  = ahenk_blok_post_type();
        $cur_tax = ahenk_blok_taxonomy();
        $pts = get_post_types( array( 'public'=>true ), 'objects' );
        $taxs = get_taxonomies( array( 'public'=>true ), 'objects' );
        ?>
        <div class="wrap">
            <h1>📦 Ahenk Blokları — Genel Ayarlar</h1>
            <p>Site senin haberlerini farklı bir bölümde tutuyorsa (örn. <code>haber</code> özel post türü), buradan eklentiye hangi içerik türünü ve kategori türünü kullanacağını söyle.</p>
            <form method="post">
                <?php wp_nonce_field( 'ahenk_blok_ayar', 'ahenk_blok_ayar_nonce' ); ?>
                <table class="form-table">
                    <tr>
                        <th><label>Haber içerik türü (post type)</label></th>
                        <td>
                            <select name="ahk_pt" style="min-width:280px">
                                <?php foreach ( $pts as $pt ) : ?>
                                    <option value="<?php echo esc_attr( $pt->name ); ?>" <?php selected( $cur_pt, $pt->name ); ?>>
                                        <?php echo esc_html( $pt->labels->singular_name . ' (' . $pt->name . ')' ); ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                            <p class="description">Senin sitende muhtemelen <code>haber</code> seçilmeli.</p>
                        </td>
                    </tr>
                    <tr>
                        <th><label>Kategori türü (taxonomy)</label></th>
                        <td>
                            <select name="ahk_tax" style="min-width:280px">
                                <?php foreach ( $taxs as $tx ) : ?>
                                    <option value="<?php echo esc_attr( $tx->name ); ?>" <?php selected( $cur_tax, $tx->name ); ?>>
                                        <?php echo esc_html( $tx->labels->singular_name . ' (' . $tx->name . ')' ); ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                            <p class="description">Haber Kategorileri için doğru taxonomy'i seç (örn. <code>haber_kategori</code>).</p>
                        </td>
                    </tr>
                </table>
                <p><button class="button button-primary button-large">Kaydet</button></p>
            </form>
            <h2 style="margin-top:30px">Tespit edilen değerler</h2>
            <ul>
                <li>Aktif post type: <code><?php echo esc_html( $cur_pt ); ?></code></li>
                <li>Aktif taxonomy: <code><?php echo esc_html( $cur_tax ); ?></code></li>
            </ul>
        </div>
        <?php
    }
}

/* --- Ortak: post seçici arayüz --- */
/* Kayıt işlemi admin_init aşamasında yapılır — POST/Redirect/GET pattern.
   Böylece F5 ile çift submit olmaz, sayfa taze yüklenir, browser cache sorunu olmaz. */
if ( ! function_exists( 'ahenk_blok_admin_kaydet' ) ) {
    function ahenk_blok_admin_kaydet() {
        if ( ! is_admin() ) return;
        if ( ! current_user_can( 'edit_posts' ) ) return;
        if ( empty( $_POST['ahenk_blok_nonce'] ) || empty( $_POST['ahk_option_key'] ) ) return;

        $option_key = sanitize_key( $_POST['ahk_option_key'] );
        $izinli = array(
            'ahenk_blok_manset_ids', 'ahenk_blok_manset_mini_ids',
            'ahenk_blok_hikaye_ids', 'ahenk_blok_tab_kategoriler',
        );
        if ( ! in_array( $option_key, $izinli, true ) ) return;
        if ( ! wp_verify_nonce( $_POST['ahenk_blok_nonce'], 'ahenk_blok_save_' . $option_key ) ) return;

        // Tab kategorileri ayrı işlenir (string), diğerleri ID array
        if ( $option_key === 'ahenk_blok_tab_kategoriler' ) {
            update_option( $option_key, sanitize_text_field( isset( $_POST['ahk_tab_kats'] ) ? $_POST['ahk_tab_kats'] : '' ) );
        } else {
            $secilenler = isset( $_POST['ahk_secilen'] ) && is_array( $_POST['ahk_secilen'] )
                ? array_map( 'intval', $_POST['ahk_secilen'] )
                : array();
            $manuel = isset( $_POST['ahk_manuel'] ) ? sanitize_text_field( $_POST['ahk_manuel'] ) : '';
            if ( $manuel !== '' ) {
                $ek = array_filter( array_map( 'intval', preg_split( '/[\s,]+/', $manuel ) ) );
                $secilenler = array_values( array_unique( array_merge( $secilenler, $ek ) ) );
            }
            // Boş array bile zorla yazılsın (tüm tikleri kaldırma senaryosu)
            delete_option( $option_key );
            update_option( $option_key, $secilenler, false );
            wp_cache_delete( $option_key, 'options' );
            $sayi = count( $secilenler );

            // Tema uyumu: _manset_haberi meta senkronizasyonu
            if ( $option_key === 'ahenk_blok_manset_ids' && ! empty( $secilenler ) ) {
                foreach ( $secilenler as $_msync_pid ) {
                    update_post_meta( (int) $_msync_pid, '_manset_haberi', '1' );
                }
            }
        }

        $page = isset( $_POST['ahk_page'] ) ? sanitize_key( $_POST['ahk_page'] ) : ( isset( $_GET['page'] ) ? sanitize_key( $_GET['page'] ) : '' );
        $url  = admin_url( 'admin.php?page=' . $page . '&saved=1&key=' . $option_key . '&n=' . ( isset( $sayi ) ? $sayi : 0 ) );
        wp_safe_redirect( $url );
        exit;
    }
    add_action( 'admin_init', 'ahenk_blok_admin_kaydet', 5 );
}

if ( ! function_exists( 'ahenk_blok_post_secici' ) ) {
    function ahenk_blok_post_secici( $option_key, $baslik, $aciklama, $cok = true ) {
        if ( ! current_user_can( 'edit_posts' ) ) return;

        // Kayıt sonrası bildirim (POST/Redirect/GET'ten gelir)
        if ( isset( $_GET['saved'] ) && isset( $_GET['key'] ) && sanitize_key( $_GET['key'] ) === $option_key ) {
            $n = isset( $_GET['n'] ) ? intval( $_GET['n'] ) : 0;
            echo '<div class="notice notice-success is-dismissible"><p><strong>✓ Kaydedildi!</strong> Bu listede artık <strong>' . $n . '</strong> kayıt var. Önyüzde güncel hali görünüyor.</p></div>';
        }

        $secili = ahenk_blok_secili_idler( $option_key );
        $arama  = isset( $_GET['ahk_q'] ) ? sanitize_text_field( $_GET['ahk_q'] ) : '';
        $kat    = isset( $_GET['ahk_cat'] ) ? intval( $_GET['ahk_cat'] ) : 0;

        $args = array( 'post_type'=>ahenk_blok_post_type(), 'posts_per_page'=>50, 'orderby'=>'date', 'order'=>'DESC', 'post_status'=>'publish' );
        if ( $arama !== '' ) $args['s'] = $arama;
        if ( $kat ) {
            $args['tax_query'] = array( array( 'taxonomy'=>ahenk_blok_taxonomy(), 'field'=>'term_id', 'terms'=>$kat ) );
        }
        $q = new WP_Query( $args );

        $secili_postlar = array();
        if ( ! empty( $secili ) ) {
            $sq = new WP_Query( array( 'post_type'=>ahenk_blok_post_type(), 'post__in'=>$secili, 'orderby'=>'post__in', 'posts_per_page'=>count( $secili ) ) );
            $secili_postlar = $sq->posts;
        }
        $page_slug = isset( $_GET['page'] ) ? sanitize_text_field( $_GET['page'] ) : '';
        ?>
        <div class="wrap">
            <h1><?php echo esc_html( $baslik ); ?></h1>
            <p><?php echo esc_html( $aciklama ); ?></p>

            <form method="get" style="margin:14px 0">
                <input type="hidden" name="page" value="<?php echo esc_attr( $page_slug ); ?>">
                <input type="search" name="ahk_q" value="<?php echo esc_attr( $arama ); ?>" placeholder="Haberlerde ara..." style="min-width:240px">
                <?php
                wp_dropdown_categories( array(
                    'show_option_all' => '— Tüm Kategoriler —',
                    'name' => 'ahk_cat', 'selected' => $kat, 'hide_empty' => 1, 'orderby' => 'name',
                    'taxonomy' => ahenk_blok_taxonomy(),
                ) );
                ?>
                <button class="button">Filtrele</button>
                <?php if ( $arama || $kat ) : ?><a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=' . $page_slug ) ); ?>">Sıfırla</a><?php endif; ?>
            </form>

            <form method="post" action="<?php echo esc_url( admin_url( 'admin.php?page=' . $page_slug ) ); ?>">
                <?php wp_nonce_field( 'ahenk_blok_save_' . $option_key, 'ahenk_blok_nonce' ); ?>
                <input type="hidden" name="ahk_option_key" value="<?php echo esc_attr( $option_key ); ?>">
                <input type="hidden" name="ahk_page" value="<?php echo esc_attr( $page_slug ); ?>">

                <h2 style="margin-top:24px">Şu an seçili (<?php echo count( $secili ); ?>)</h2>
                <?php if ( empty( $secili_postlar ) ) : ?>
                    <p><em>Henüz bir haber seçmedin. Aşağıdan ekleyebilirsin.</em></p>
                <?php else : ?>
                    <table class="widefat striped" style="max-width:900px">
                        <thead><tr><th width="40">✓</th><th width="70">Görsel</th><th>Başlık</th><th width="120">Tarih</th><th width="80">ID</th></tr></thead>
                        <tbody>
                        <?php foreach ( $secili_postlar as $p ) :
                            $img = get_the_post_thumbnail_url( $p->ID, 'thumbnail' );
                        ?>
                            <tr>
                                <td><input type="checkbox" name="ahk_secilen[]" value="<?php echo $p->ID; ?>" checked></td>
                                <td><?php if ( $img ) : ?><img src="<?php echo esc_url( $img ); ?>" style="width:50px;height:50px;object-fit:cover;border-radius:6px"><?php endif; ?></td>
                                <td><strong><?php echo esc_html( get_the_title( $p->ID ) ); ?></strong><br><small><a href="<?php echo esc_url( get_edit_post_link( $p->ID ) ); ?>" target="_blank">Düzenle</a> · <a href="<?php echo esc_url( get_permalink( $p->ID ) ); ?>" target="_blank">Görüntüle</a></small></td>
                                <td><?php echo esc_html( get_the_date( '', $p->ID ) ); ?></td>
                                <td>#<?php echo $p->ID; ?></td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                    <p style="margin-top:8px"><em>İşareti kaldırıp Kaydet'e basarsan o haber listeden çıkar.</em></p>
                <?php endif; ?>

                <h2 style="margin-top:30px">Eklemek için haber seç</h2>
                <?php if ( $q->have_posts() ) : ?>
                    <table class="widefat striped" style="max-width:900px">
                        <thead><tr><th width="40">+</th><th width="70">Görsel</th><th>Başlık</th><th width="160">Kategori</th><th width="120">Tarih</th></tr></thead>
                        <tbody>
                        <?php while ( $q->have_posts() ) : $q->the_post(); $pid = get_the_ID();
                            if ( in_array( $pid, $secili ) ) continue;
                            $img = get_the_post_thumbnail_url( $pid, 'thumbnail' );
                            $kn = ahenk_blok_post_terim_adi( $pid ); if ( ! $kn ) $kn = '—';
                        ?>
                            <tr>
                                <td><input type="checkbox" name="ahk_secilen[]" value="<?php echo $pid; ?>"></td>
                                <td><?php if ( $img ) : ?><img src="<?php echo esc_url( $img ); ?>" style="width:50px;height:50px;object-fit:cover;border-radius:6px"><?php endif; ?></td>
                                <td><strong><?php the_title(); ?></strong></td>
                                <td><?php echo esc_html( $kn ); ?></td>
                                <td><?php the_date(); ?></td>
                            </tr>
                        <?php endwhile; wp_reset_postdata(); ?>
                        </tbody>
                    </table>
                <?php else : ?><p>Sonuç bulunamadı.</p><?php endif; ?>

                <h2 style="margin-top:30px">Manuel ID ekle (opsiyonel)</h2>
                <p>Virgülle ayrılmış haber ID'leri yaz: <input type="text" name="ahk_manuel" placeholder="Örn: 123, 456, 789" style="width:300px"></p>

                <p style="margin-top:20px">
                    <button class="button button-primary button-large" type="submit">Kaydet</button>
                </p>
            </form>
        </div>
        <?php
    }
}

if ( ! function_exists( 'ahenk_blok_admin_hikaye' ) ) {
    function ahenk_blok_admin_hikaye() {
        ahenk_blok_post_secici(
            'ahenk_blok_hikaye_ids',
            '📦 Hikaye Yönetimi',
            'Hikaye baloncuklarında gösterilecek haberleri buradan seç. Sırayı değiştirmek için manuel ID alanını kullanabilirsin.'
        );
    }
}
if ( ! function_exists( 'ahenk_blok_admin_manset' ) ) {
    function ahenk_blok_admin_manset() {
        if ( ! current_user_can( 'edit_posts' ) ) return;
        ahenk_blok_post_secici(
            'ahenk_blok_manset_ids',
            '📦 Manşet Yönetimi (Büyük Slider)',
            'Ana manşet slider\'ında dönecek haberleri buradan seç.'
        );
        echo '<hr style="margin:40px 0">';
        ahenk_blok_post_secici(
            'ahenk_blok_manset_mini_ids',
            '📦 Manşet Yan Liste (Küçük Kutular)',
            'Sağ tarafta listelenecek küçük haber kutularını buradan seç. Boş bırakırsan otomatik son haberler gelir.'
        );
    }
}
if ( ! function_exists( 'ahenk_blok_admin_tab' ) ) {
    function ahenk_blok_admin_tab() {
        if ( ! current_user_can( 'edit_posts' ) ) return;
        if ( isset( $_GET['saved'] ) && isset( $_GET['key'] ) && sanitize_key( $_GET['key'] ) === 'ahenk_blok_tab_kategoriler' ) {
            echo '<div class="notice notice-success is-dismissible"><p><strong>✓ Kaydedildi!</strong></p></div>';
        }
        $val = get_option( 'ahenk_blok_tab_kategoriler', '' );
        $cats = ahenk_blok_terimler( array( 'hide_empty'=>0, 'orderby'=>'name', 'number'=>0 ) );
        $page_slug = isset( $_GET['page'] ) ? sanitize_text_field( $_GET['page'] ) : 'ahb-bloklar-tab';
        ?>
        <div class="wrap">
            <h1>📦 Kategori Tab Ayarları</h1>
            <p>Hangi kategorilerin tab olarak görüneceğini belirle. Slug'ları virgülle ayır.</p>
            <form method="post" action="<?php echo esc_url( admin_url( 'admin.php?page=' . $page_slug ) ); ?>">
                <?php wp_nonce_field( 'ahenk_blok_save_ahenk_blok_tab_kategoriler', 'ahenk_blok_nonce' ); ?>
                <input type="hidden" name="ahk_option_key" value="ahenk_blok_tab_kategoriler">
                <input type="hidden" name="ahk_page" value="<?php echo esc_attr( $page_slug ); ?>">
                <p><input type="text" name="ahk_tab_kats" value="<?php echo esc_attr( $val ); ?>" style="width:520px" placeholder="ornek: gundem,spor,ekonomi,teknoloji"></p>
                <h3>Mevcut kategori slug'ları</h3>
                <ul style="columns:3;max-width:800px">
                    <?php foreach ( $cats as $c ) : ?>
                        <li><code><?php echo esc_html( $c->slug ); ?></code> — <?php echo esc_html( $c->name ); ?> (<?php echo intval( $c->count ); ?>)</li>
                    <?php endforeach; ?>
                </ul>
                <p><button class="button button-primary">Kaydet</button></p>
            </form>
        </div>
        <?php
    }
}

/* ============================================================
   Ana eklentinin 7. sekmesi için içerik render fonksiyonu
   AHB_Admin_Page::render_bloklar_tab() bu fonksiyonu çağırır.
   ============================================================ */
if ( ! function_exists( 'ahb_render_bloklar_tab_content' ) ) {
    function ahb_render_bloklar_tab_content() {
        $base = home_url( '/' );
        ?>
        <div class="ahb-card" data-ahb-tab="bloklar" style="border-left:4px solid #D4AF37;">
            <h2 style="margin-top:0">📦 Haber Blokları (Manşet · Hikayeler · Kategori Tabları)</h2>
            <p>Bu modül artık eklentinin içine entegre edildi — <strong>"Ahenk Haber Blokları"</strong> eklentisini kaldırabilirsiniz, ayarlarınız ve seçtiğiniz haberler korunur.</p>

            <h3 style="margin-top:20px">🛠️ Yönetim Sayfaları</h3>
            <p>Hangi haberin nerede görüneceğini buradan seçersiniz:</p>
            <p>
                <a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=ahb-bloklar-manset' ) ); ?>">📰 Manşetleri Yönet</a>
                <a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=ahb-bloklar-hikaye' ) ); ?>">⭕ Hikayeleri Yönet</a>
                <a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=ahb-bloklar-tab' ) ); ?>">🗂️ Tab Kategorileri</a>
                <a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=ahb-bloklar-ayar' ) ); ?>">⚙️ Bloklar Ayarları</a>
            </p>

            <h3 style="margin-top:30px">📋 Shortcode'lar (Sayfaya / Yazıya Yapıştır)</h3>
            <table class="widefat striped" style="max-width:900px">
                <thead><tr><th width="220">Blok</th><th>Shortcode</th></tr></thead>
                <tbody>
                    <tr><td><strong>Manşet Slider</strong> (büyük + yan)</td><td><code>[ahenk_manset]</code></td></tr>
                    <tr><td><strong>Hikaye Baloncukları</strong></td><td><code>[ahenk_hikayeler baslik="Hikayeler"]</code></td></tr>
                    <tr><td><strong>Kategori Tabları</strong></td><td><code>[ahenk_kategori_tab sayi="6"]</code></td></tr>
                </tbody>
            </table>

            <h3 style="margin-top:30px">🎬 Video TV Blokları (Video TV'deki videolarınızı manşet/hikayede gösterin)</h3>
            <p style="background:#fef2f2;border-left:4px solid #EF4444;padding:10px 14px;max-width:900px">
                <strong>Yöntem:</strong> "<em>Ai Haber Botu → Video TV → Videolar</em>" sayfasına gidin. Her video kartının altında <strong style="color:#B91C1C">📰 Manşet</strong> ve <strong style="color:#6D28D9">⭕ Hikaye</strong> butonları vardır. Tıklayarak istediğiniz videoları işaretleyin — aşağıdaki shortcode'lar otomatik olarak bu seçtiğiniz videoları gösterir.
            </p>
            <table class="widefat striped" style="max-width:900px">
                <thead><tr><th width="220">Blok</th><th>Shortcode</th></tr></thead>
                <tbody>
                    <tr><td><strong>Video Manşet</strong> (büyük slider + yan)</td><td><code>[ahenk_video_manset sayi="5" kucuk="4"]</code></td></tr>
                    <tr><td><strong>Video Hikaye Baloncukları</strong></td><td><code>[ahenk_video_hikayeler sayi="12" baslik="Videolar"]</code></td></tr>
                    <tr><td><strong>Video Grid</strong> (kartlar)</td><td><code>[ahenk_video_grid sayi="8" sutun="4"]</code></td></tr>
                </tbody>
            </table>
            <p style="font-size:12px;color:#6B7280;max-width:900px;margin-top:6px">
                Hiç video işaretlemediyseniz shortcode otomatik olarak son eklenen videoları gösterir. Belirli bir filtre için: <code>manset="1"</code> (sadece işaretliler), <code>kategori_id="3"</code>, <code>kaynak_id="5"</code>, <code>one_cikan="1"</code>.
            </p>
            <p>
                <a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=video-tv-videolar' ) ); ?>" style="background:#DC2626;border-color:#B91C1C">🎬 Video TV → Videolar (işaretle)</a>
            </p>

            <h3 style="margin-top:30px">🎯 Iframe Kodları (reklam alanı / harici siteler)</h3>
            <p>Shortcode kabul etmeyen alanlara şu iframe kodlarını yapıştır:</p>
            <p style="background:#fff8dc;border-left:4px solid #D4AF37;padding:10px 14px;max-width:900px;font-size:13px">
                <strong>⚠️ Önemli — Eski içerik mi görünüyor?</strong> Iframe'in dakikada bir tazelenmesi için aşağıdaki kodlar otomatik olarak <code>&amp;v=...</code> (zaman damgası) parametresi taşır. Eski iframe kodlarınızı bu yeni kodlarla <strong>değiştirin</strong>; ayrıca varsa Cloudflare/LiteSpeed/WP Rocket cache'inizi <strong>temizleyin</strong>. Iframe HTML'i tarayıcı cache'inde de tutulabilir — ziyaretçi <kbd>Ctrl+F5</kbd> ile yenilemelidir.
            </p>
            <?php
            // Cache-busting: dakikada bir değişen damga (CDN ve tarayıcıyı bypass eder)
            $cb = floor( time() / 60 );
            $iframes = array(
                'Manşet Slider'       => $base . '?ahenk_blok=manset&v=' . $cb,
                'Hikaye Baloncukları' => $base . '?ahenk_blok=hikaye&v=' . $cb,
                'Kategori Tabları'    => $base . '?ahenk_blok=tab&v='    . $cb,
            );
            foreach ( $iframes as $ad => $url ) :
                $code = '<iframe src="' . esc_url( $url ) . '" style="width:100%;border:0;min-height:400px" scrolling="no" loading="lazy"></iframe>';
            ?>
                <p style="margin-top:14px"><strong><?php echo esc_html( $ad ); ?></strong></p>
                <textarea readonly onclick="this.select()" rows="2" style="width:100%;max-width:900px;font-family:monospace;font-size:12px"><?php echo esc_textarea( $code ); ?></textarea>
            <?php endforeach; ?>

            <p style="margin-top:14px;background:#fff8dc;border-left:4px solid #D4AF37;padding:10px 14px;max-width:900px">
                <strong>İpucu:</strong> URL'ye parametre ekleyerek özelleştirebilirsin. Örn:<br>
                <code>?ahenk_blok=manset&amp;sayi=8&amp;kucuk=6</code><br>
                <code>?ahenk_blok=hikaye&amp;sayi=20&amp;baslik=G%C3%BCn%C3%BCn+Hikayeleri</code><br>
                <code>?ahenk_blok=tab&amp;kategoriler=gundem,spor,ekonomi&amp;sayi=8</code>
            </p>

            <h3 style="margin-top:24px">📄 PHP Şablonda Kullanım</h3>
            <pre style="background:#f5f5f5;padding:12px;border-left:4px solid #D4AF37;max-width:900px">&lt;?php echo do_shortcode('[ahenk_manset]'); ?&gt;</pre>

            <h3>Shortcode Parametreleri</h3>
            <ul style="list-style:disc;margin-left:24px;max-width:900px">
                <li><code>kaynak="panel"</code> (varsayılan) → admin panelinden seçtiklerini gösterir.</li>
                <li><code>kaynak="son"</code> veya <code>kaynak="kategori"</code> → en son / kategori haberlerini gösterir.</li>
                <li><code>kategori="spor"</code> → ilgili kategori slug'ından çeker (panel boşsa).</li>
                <li><code>sayi="10"</code> → kaç haber gösterileceği.</li>
            </ul>
        </div>
        <?php
    }
}
