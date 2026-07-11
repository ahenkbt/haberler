<?php
/**
 * VKV Sayfa Temel Fonksiyonları
 * TUKAV sayfa şablonlarıyla TAM UYUMLU
 * --tq / --tq2 / --tq3 değişkenleri VKV kırmızısına eşlenir
 */
defined('ABSPATH') || exit;

/* ── Sayfa başlatıcı ── */
function tukav_init_page() {
    add_filter('the_content','__return_empty_string');
    add_filter('get_the_excerpt','__return_empty_string');
    if (have_posts()) { while (have_posts()) { the_post(); } }
}

/* ── WP içeriği override ── */
function tukav_override() { ?>
<script>(function(){
    var sel=['.page-hero','.page-content','.page-title','.page__heading','.entry-header',
             '.page-header','h1.title','.template-page>h1','article.page>.entry-header'];
    sel.forEach(function(s){document.querySelectorAll(s).forEach(function(e){e.style.display='none';});});
    ['#content','#MainContent','main#content'].forEach(function(s){
        var e=document.querySelector(s);
        if(e)e.style.cssText='max-width:100%!important;padding:0!important;width:100%!important;margin:0!important;';
    });
})();</script>
<style>
#content,#MainContent,main#content{max-width:100%!important;padding:0!important;width:100%!important;margin:0!important}
.page-hero,.page-content,.page__heading,.page__header,.page-header,.page-title,.entry-header,.page__title{display:none!important}
#page,.site,.site-content,main#main,.hentry,.wp-site-blocks,.entry-content{max-width:100%!important;padding:0!important;margin:0!important;width:100%!important}
</style>
<?php }

/* ═══════════════════════════════════════════════════════════
   TEMEL CSS — VKV RENG PALETİ + TUKAV ŞABLON UYUMU
   --tq/--tq2/--tq3 → VKV kırmızısına eşlenir
   Tüm TUKAV sayfa şablonları değiştirilmeden çalışır
═══════════════════════════════════════════════════════════ */
function tukav_base_css() { ?>
<style>
/* ── TUKAV UYUM EŞLEMESİ ── */
/* NOT: --cr, --cr2, --cr3, --altin, --dk vb. ana renkler header.php tarafından
   dinamik olarak set edilir. Bu blok yalnızca ikincil değişkenler + TUKAV köprüsü. */
:root{
  --bg2:#FFF0F0;  /* arka plan tonu 2 (site tipi rengine göre uyum sağlar) */
  --sin2:#FED7D7; /* kenarlık tonu 2 */
  --fh:'Oswald',sans-serif;--fm:'Open Sans',system-ui,sans-serif;
  --tr:.22s ease;
  /* TUKAV uyum köprüsü — ana renkler header.php'nin `:root` bloğundan gelir */
  --tq:var(--cr);--tq2:var(--cr2);--tq3:var(--cr3);--tq4:var(--sin,#fecaca);
}

/* ─ HERO ─ */
.tp-hero{width:100%;background:linear-gradient(150deg,var(--dk) 0%,var(--dk2) 55%,#2D1010 100%);padding:56px 0 44px;position:relative;overflow:hidden}
.tp-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 80% at 75% 50%,rgba(139,26,26,.25) 0%,transparent 65%)}
.tp-hero::after{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,var(--altin),var(--altin2),var(--altin),transparent)}
.tp-hero-w{max-width:1180px;margin:0 auto;padding:0 20px;position:relative;z-index:2;display:grid;grid-template-columns:1fr auto;gap:40px;align-items:center}
.tp-eyebrow{display:inline-flex;align-items:center;gap:8px;background:rgba(180,83,9,.12);border:1px solid rgba(180,83,9,.3);color:var(--altin2);font-family:var(--fh);font-size:10px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;padding:5px 14px;margin-bottom:16px}
.tp-h1{font-family:var(--fh);font-size:clamp(1.9rem,3.5vw,3rem);font-weight:700;color:#fff;line-height:1.1;margin-bottom:12px;letter-spacing:.3px}
.tp-h1 em{color:var(--cr3);font-style:italic;display:block}
.tp-hdesc{font-size:13.5px;color:rgba(255,255,255,.55);line-height:1.85;max-width:560px}
.tp-hero-stats{display:grid;grid-template-columns:1fr 1fr;gap:3px}
.tp-stat{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);padding:16px 18px;text-align:center}
.tp-stat-n{font-family:var(--fh);font-size:1.7rem;font-weight:700;color:var(--altin2);line-height:1;margin-bottom:3px}
.tp-stat-l{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.3)}
/* ─ BREADCRUMB ─ */
.tp-bc{background:var(--bg);border-bottom:1px solid var(--sin);padding:9px 0}
.tp-bc-w{max-width:1180px;margin:0 auto;padding:0 20px;display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--yz3)}
.tp-bc-w a{color:var(--cr);font-weight:600;text-decoration:none;transition:color var(--tr)}
.tp-bc-w a:hover{color:var(--cr2)}
.tp-bc-w .sep{color:var(--sin)}
/* ─ ALTMENÜ ─ */
.tp-subnav{background:#fff;border-bottom:2px solid var(--sin);overflow:hidden}
.tp-subnav-w{max-width:1180px;margin:0 auto;padding:0 20px;display:flex;overflow-x:auto;scrollbar-width:none}
.tp-subnav-w::-webkit-scrollbar{display:none}
.tp-subnav-w a{display:flex;align-items:center;gap:6px;padding:11px 18px;font-family:var(--fh);font-size:12px;font-weight:600;color:var(--yz2);text-decoration:none;white-space:nowrap;border-bottom:3px solid transparent;transition:all var(--tr);text-transform:uppercase;letter-spacing:.4px}
.tp-subnav-w a:hover,.tp-subnav-w a.aktif{color:var(--cr);border-bottom-color:var(--cr)}
/* ─ SECTIONLAR ─ */
.tp-sec{padding:48px 0}
.tp-sec:nth-child(even){background:var(--bg)}
.tp-sec-w{max-width:1180px;margin:0 auto;padding:0 20px}
.tp-sec-hd{margin-bottom:28px}
.tp-badge{display:inline-flex;align-items:center;gap:5px;font-size:8.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:3px 10px;border-radius:1px;border:1px solid;margin-bottom:10px}
.tp-badge.tq{background:rgba(139,26,26,.08);color:var(--cr);border-color:rgba(139,26,26,.2)}
.tp-badge.altin{background:rgba(180,83,9,.1);color:#7a3a00;border-color:rgba(180,83,9,.3)}
.tp-badge.koyu{background:#f1f5f9;color:#334155;border-color:#cbd5e1}
.tp-badge.kirmizi{background:rgba(197,48,48,.08);color:var(--cr2);border-color:rgba(197,48,48,.2)}
.tp-sec-title{font-family:var(--fh);font-size:1.6rem;font-weight:700;color:var(--dk);line-height:1.2;margin-bottom:7px;letter-spacing:.2px}
.tp-sec-sub{font-size:13.5px;color:var(--yz2);line-height:1.8;max-width:680px}
/* ─ KARTLAR ─ */
.tp-grid{display:grid;gap:16px}
.tp-g4{grid-template-columns:repeat(4,1fr)}
.tp-g3{grid-template-columns:repeat(3,1fr)}
.tp-g2{grid-template-columns:repeat(2,1fr)}
.tp-card{background:#fff;border:1px solid var(--sin);border-radius:2px;overflow:hidden;display:flex;flex-direction:column;transition:all var(--tr);text-decoration:none}
.tp-card:hover{border-color:var(--cr);box-shadow:0 6px 24px rgba(139,26,26,.12);transform:translateY(-2px)}
.tp-card-top{height:4px}
.tp-card-top.tq{background:linear-gradient(90deg,var(--cr),var(--cr3))}
.tp-card-top.altin{background:linear-gradient(90deg,var(--altin),var(--altin2))}
.tp-card-top.kirmizi{background:linear-gradient(90deg,#b91c1c,#ef4444)}
.tp-card-top.mor{background:linear-gradient(90deg,#6d28d9,#8b5cf6)}
.tp-card-top.yesil{background:linear-gradient(90deg,#15803d,#22c55e)}
.tp-card-body{padding:20px;flex:1;display:flex;flex-direction:column;gap:8px}
.tp-card-icon{width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;margin-bottom:2px;flex-shrink:0}
.tp-card-icon.tq{background:rgba(139,26,26,.1);color:var(--cr)}
.tp-card-icon.altin{background:rgba(180,83,9,.1);color:#7a3a00}
.tp-card-icon.kirmizi{background:rgba(197,48,48,.08);color:var(--cr)}
.tp-card-icon.mor{background:#f5f3ff;color:#6d28d9}
.tp-card-icon.yesil{background:#f0fdf4;color:#15803d}
.tp-card-title{font-family:var(--fh);font-size:1rem;font-weight:700;color:var(--dk);line-height:1.25;letter-spacing:.2px}
.tp-card:hover .tp-card-title{color:var(--cr)}
.tp-card-desc{font-size:12px;color:var(--yz2);line-height:1.75;flex:1}
.tp-card-foot{padding:9px 20px;border-top:1px solid var(--sin2);background:var(--bg);display:flex;align-items:center;justify-content:space-between}
.tp-card-lbl{font-size:8.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--yz3)}
.tp-card-arrow{font-size:11px;font-weight:700;color:var(--cr);transition:transform var(--tr)}
.tp-card:hover .tp-card-arrow{transform:translateX(4px)}
/* ─ KİŞİ KARTI ─ */
.tp-kisi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.tp-kisi{background:#fff;border:1px solid var(--sin);text-align:center;padding:24px 16px;transition:all var(--tr);cursor:default}
.tp-kisi:hover{border-color:var(--cr);box-shadow:0 4px 16px rgba(139,26,26,.1)}
.tp-kisi-avatar{width:72px;height:72px;background:linear-gradient(135deg,var(--dk),var(--dk2));border:3px solid var(--altin);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.6rem;margin:0 auto 12px}
.tp-kisi-ad{font-family:var(--fh);font-size:14px;font-weight:700;color:var(--dk);margin-bottom:3px}
.tp-kisi-unv{font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--cr)}
.tp-kisi-detay{font-size:11px;color:var(--yz2);line-height:1.55;margin-top:6px}
/* ─ CTA BANT ─ */
.tp-cta{background:var(--cr2);padding:36px 0}
.tp-cta-w{max-width:1180px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;gap:28px;flex-wrap:wrap}
.tp-cta-txt h3{font-family:var(--fh);font-size:1.25rem;font-weight:700;color:#fff;margin-bottom:5px;letter-spacing:.3px}
.tp-cta-txt p{font-size:13px;color:rgba(255,255,255,.6);line-height:1.6}
.tp-cta-btns{display:flex;gap:10px;flex-wrap:wrap}
.tp-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 22px;font-family:var(--fh);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;text-decoration:none;transition:all var(--tr);border:none;cursor:pointer}
.tp-btn.beyaz{background:#fff;color:var(--cr)}
.tp-btn.beyaz:hover{background:#fff0f0}
.tp-btn.saydam{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4)}
.tp-btn.saydam:hover{background:rgba(255,255,255,.08)}
.tp-btn.tq{background:var(--cr);color:#fff}
.tp-btn.tq:hover{background:var(--dk)}
/* ─ ALINTILAR ─ */
.tp-quote-band{background:linear-gradient(135deg,var(--dk),var(--dk2));border-top:3px solid var(--altin);padding:40px 0;text-align:center}
.tp-quote-band-w{max-width:1180px;margin:0 auto;padding:0 20px}
.tp-q-text{font-family:'Georgia',serif;font-size:clamp(1.1rem,2vw,1.6rem);font-style:italic;color:#fff;line-height:1.55;max-width:760px;margin:0 auto 10px}
.tp-q-src{font-family:var(--fh);font-size:9.5px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,.3)}
/* ─ BLOG KUTUSU ─ */
.tp-blog-sec{background:var(--bg);padding:40px 0;border-top:2px solid var(--sin)}
.tp-blog-sec-w{max-width:1180px;margin:0 auto;padding:0 20px}
.tp-blog-hd{display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid var(--sin)}
.tp-blog-hd-bar{width:4px;height:20px;background:var(--cr);flex-shrink:0}
.tp-blog-hd h3{font-family:var(--fh);font-size:14px;font-weight:700;color:var(--dk);letter-spacing:.5px;text-transform:uppercase;flex:1}
.tp-blog-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px}
.tp-blog-card{background:#fff;border:1px solid var(--sin);overflow:hidden;text-decoration:none;transition:all var(--tr);display:flex;flex-direction:column}
.tp-blog-card:hover{border-color:var(--cr);box-shadow:0 4px 18px rgba(139,26,26,.12);transform:translateY(-2px)}
.tp-bc-img{height:160px;background:var(--dk2);overflow:hidden;position:relative;flex-shrink:0}
.tp-bc-img img{width:100%;height:100%;object-fit:cover;transition:transform .4s}
.tp-blog-card:hover .tp-bc-img img{transform:scale(1.04)}
.tp-bc-kat{position:absolute;bottom:0;left:0;background:var(--cr);color:#fff;font-family:var(--fh);font-size:9.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;padding:3px 10px}
.tp-bc-body{padding:14px;flex:1}
.tp-bc-date{font-size:10px;color:var(--cr);font-weight:700;margin-bottom:5px;letter-spacing:.3px}
.tp-bc-title{font-family:var(--fh);font-size:13.5px;font-weight:600;color:var(--dk);line-height:1.3;margin-bottom:6px}
.tp-blog-card:hover .tp-bc-title{color:var(--cr)}
.tp-bc-exc{font-size:11.5px;color:var(--yz2);line-height:1.6}
.tp-blog-more{text-align:center}
.tp-more-btn{display:inline-flex;align-items:center;gap:8px;background:var(--cr);color:#fff;font-family:var(--fh);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;padding:10px 24px;text-decoration:none;transition:all var(--tr)}
.tp-more-btn:hover{background:var(--cr2)}
.tp-blog-empty{background:#fff;border:1px solid var(--sin);padding:32px;text-align:center;color:var(--yz3);font-size:13px}
.tp-blog-empty i{display:block;font-size:2rem;margin-bottom:10px;color:var(--sin)}
/* ─ TİMELİNE ─ */
.tp-timeline{position:relative;display:flex;flex-direction:column;gap:0}
.tp-timeline::before{content:'';position:absolute;left:24px;top:0;bottom:0;width:2px;background:var(--sin)}
.tp-tl-item{display:flex;gap:20px;padding:0 0 28px;position:relative}
.tp-tl-dot{width:48px;height:48px;border-radius:50%;background:var(--cr);border:3px solid #fff;box-shadow:0 0 0 3px var(--sin);display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0;position:relative;z-index:1}
.tp-tl-body{padding:6px 0 0;flex:1}
.tp-tl-year{font-family:var(--fh);font-size:10.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--cr);margin-bottom:3px}
.tp-tl-title{font-family:var(--fh);font-size:1rem;font-weight:700;color:var(--dk);margin-bottom:5px}
.tp-tl-desc{font-size:12px;color:var(--yz2);line-height:1.75}
/* ─ DEĞER KARTLARI ─ */
.tp-deger-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.tp-deger{background:#fff;border:1px solid var(--sin);padding:26px 20px;text-align:center;position:relative;overflow:hidden;transition:all var(--tr)}
.tp-deger::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--cr),var(--cr3))}
.tp-deger:hover{box-shadow:0 6px 22px rgba(139,26,26,.1);transform:translateY(-2px)}
.tp-deger-em{font-size:1.8rem;margin-bottom:10px}
.tp-deger-title{font-family:var(--fh);font-size:.95rem;font-weight:700;color:var(--dk);margin-bottom:6px}
.tp-deger-desc{font-size:11.5px;color:var(--yz2);line-height:1.7}
/* ─ FLAG KART ─ */
.tp-flag-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.tp-flag-card{background:#fff;border:1px solid var(--sin);padding:18px 12px;text-align:center;transition:all var(--tr)}
.tp-flag-card:hover{border-color:var(--cr);background:var(--bg)}
.tp-flag-em{font-size:2.2rem;margin-bottom:10px}
.tp-flag-name{font-family:var(--fh);font-size:12px;font-weight:700;color:var(--cr);margin-bottom:2px;text-transform:uppercase;letter-spacing:.3px}
.tp-flag-baskent{font-size:10.5px;color:var(--yz2)}
/* ─ KİŞİ PROFİL (büyük) ─ */
.tp-profil-wrap{display:grid;grid-template-columns:260px 1fr;gap:40px;align-items:start}
.tp-profil-sol{text-align:center}
.tp-profil-foto{width:200px;height:240px;background:linear-gradient(135deg,var(--dk),var(--dk2));border:3px solid var(--altin);display:flex;align-items:center;justify-content:center;font-size:4.5rem;margin:0 auto 14px}
.tp-profil-ad{font-family:var(--fh);font-size:1rem;font-weight:700;color:var(--dk);margin-bottom:3px}
.tp-profil-unv{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--cr);margin-bottom:12px}
.tp-profil-rozet{background:var(--cr);color:#fff;font-family:var(--fh);font-size:9.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;padding:5px 14px;display:inline-block}
.tp-profil-metin p{font-size:13.5px;color:var(--yz2);line-height:1.9;margin-bottom:14px}
/* ─ BİYOGRAFİ KART ─ */
.tp-lider-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.tp-lider{background:#fff;border:1px solid var(--sin);overflow:hidden;transition:all var(--tr);cursor:default}
.tp-lider:hover{border-color:var(--cr);box-shadow:0 6px 22px rgba(139,26,26,.12);transform:translateY(-2px)}
.tp-lider-ust{background:linear-gradient(135deg,var(--dk),var(--dk2));padding:20px 16px;text-align:center;border-bottom:2px solid var(--altin)}
.tp-lider-em{font-size:2rem;margin-bottom:8px}
.tp-lider-don{font-family:var(--fh);font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--altin2);margin-bottom:6px}
.tp-lider-ad{font-family:var(--fh);font-size:1rem;font-weight:700;color:#fff;line-height:1.2}
.tp-lider-alt{font-size:10px;color:rgba(255,255,255,.5);margin-top:3px}
.tp-lider-body{padding:14px 14px 16px}
.tp-lider-devlet{font-family:var(--fh);font-size:10.5px;font-weight:700;color:var(--cr);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.tp-lider-detay{font-size:11.5px;color:var(--yz2);line-height:1.6}
/* ─ RESPONSIVE ─ */
@media(max-width:1100px){.tp-g4,.tp-kisi-grid,.tp-lider-grid{grid-template-columns:repeat(2,1fr)}.tp-flag-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:860px){.tp-g3{grid-template-columns:1fr 1fr}.tp-hero-w{grid-template-columns:1fr}.tp-hero-stats{display:none}.tp-profil-wrap{grid-template-columns:1fr}.tp-blog-grid{grid-template-columns:1fr 1fr}.tp-sec{padding:36px 0}.tp-deger-grid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.tp-g2,.tp-g3,.tp-g4,.tp-kisi-grid,.tp-lider-grid{grid-template-columns:1fr}.tp-flag-grid{grid-template-columns:repeat(2,1fr)}.tp-blog-grid{grid-template-columns:1fr}}
</style>
<?php }

/* ── İçerik kontrolü ── */
function tukav_has_text_content( $post_id, $min_chars = 60 ) {
    $post = get_post( $post_id );
    if ( ! $post ) return false;
    $text = preg_replace( '/\[[a-zA-Z_][a-zA-Z0-9_-]*[^\]]*?\]/', '', $post->post_content );
    $text = wp_strip_all_tags( $text );
    return mb_strlen( trim( $text ), 'UTF-8' ) >= $min_chars;
}

/* ── Akıllı thumbnail ── */
function tukav_get_thumb( $post_id = null, $size = 'medium' ) {
    if ( ! $post_id ) $post_id = get_the_ID();

    /* 1. WordPress öne çıkarılan görsel (featured image) */
    $thumb_id = get_post_thumbnail_id( $post_id );
    if ( $thumb_id ) {
        $src = wp_get_attachment_image_url( $thumb_id, $size );
        if ( ! $src ) $src = wp_get_attachment_image_url( $thumb_id, 'full' );
        if ( ! $src ) $src = wp_get_attachment_url( $thumb_id );
        if ( $src ) return esc_url( $src );
    }

    /* 2. RSS / İçe aktarma eklentilerinin bıraktığı meta anahtarları */
    $rss_meta_keys = array(
        '_thumbnail_url',          // Genel URL meta
        'wprss_item_thumbnail',    // WP RSS Aggregator
        'wprss_enclosure_url',     // WP RSS Aggregator enclosure
        'featuredImage',           // WP All Import / çeşitli eklentiler
        'featured_image',
        'thumbnail_url',
        'post_image',
        'image_url',
        '_wpas_og_image',          // Jetpack / JetPack publicize
        '_yoast_wpseo_opengraph-image', // Yoast SEO OG
        '_yoast_wpseo_twitter-image',
        'enclosure',               // WordPress RSS import çekirdeği
    );
    foreach ( $rss_meta_keys as $key ) {
        $val = get_post_meta( $post_id, $key, true );
        if ( ! $val ) continue;
        // `enclosure` meta birden fazla satır içerebilir
        if ( $key === 'enclosure' ) {
            $lines = explode( "\n", $val );
            $val   = trim( $lines[0] );
        }
        // URL olduğunu doğrula
        if ( filter_var( $val, FILTER_VALIDATE_URL ) ) {
            // Reklam & tracker URL'lerini atla
            if ( ! preg_match( '/doubleclick|adsystem|googlesyndication|tracking|adserver|banner|pixel\.php|beacon/i', $val ) ) {
                return esc_url( $val );
            }
        }
    }

    /* 3. `_thumbnail_id` gerçek bir ek değilse ekli medyadan dene */
    $meta_id = get_post_meta( $post_id, '_thumbnail_id', true );
    if ( $meta_id && ! get_post( $meta_id ) ) {
        $attached = get_attached_media( 'image', $post_id );
        if ( ! empty( $attached ) ) {
            $first = reset( $attached );
            $src   = wp_get_attachment_image_url( $first->ID, $size );
            if ( ! $src ) $src = wp_get_attachment_url( $first->ID );
            if ( $src ) {
                update_post_meta( $post_id, '_thumbnail_id', $first->ID );
                return esc_url( $src );
            }
        }
    }

    /* 4. İçerikteki ilk <img> etiketi */
    $raw = get_post_field( 'post_content', $post_id );
    if ( empty( $raw ) ) $raw = get_post_field( 'post_excerpt', $post_id );
    $stripped = preg_replace( '/\[[^\]]+\]/', '', $raw );
    if ( preg_match( '/<img[^>]+src=["\']([^"\']+)["\'][^>]*>/i', $stripped, $m ) ) {
        $src_c = trim( $m[1] );
        if (
            ! preg_match( '/doubleclick|adsystem|googlesyndication|tracking|adserver|banner|pixel\.php/i', $src_c ) &&
            strpos( $src_c, 'data:' ) === false &&
            strlen( $src_c ) > 20
        ) {
            return esc_url( $src_c );
        }
    }

    /* 5. Ekli medya (genişlik ≥ 300px) */
    $attached = get_attached_media( 'image', $post_id );
    if ( ! empty( $attached ) ) {
        foreach ( $attached as $att ) {
            $meta = wp_get_attachment_metadata( $att->ID );
            $w    = $meta['width'] ?? 0;
            if ( $w >= 300 ) {
                $src = wp_get_attachment_image_url( $att->ID, $size );
                if ( ! $src ) $src = wp_get_attachment_url( $att->ID );
                if ( $src ) return esc_url( $src );
            }
        }
    }

    return '';
}

/* ── Blog yazıları çek ── */
function tukav_get_posts($cat_slug='', $limit=3) {
    $args=['post_type'=>'post','post_status'=>'publish','posts_per_page'=>$limit,
           'orderby'=>'date','order'=>'DESC','ignore_sticky_posts'=>1];
    if($cat_slug) $args['category_name']=$cat_slug;
    $q=new WP_Query($args);
    $r=[];
    while($q->have_posts()){
        $q->the_post();
        $cats=get_the_category();
        $r[]=['id'=>get_the_ID(),'url'=>get_permalink(),'title'=>get_the_title(),
              'excerpt'=>wp_trim_words(get_the_excerpt(),18,'...'),
              'thumb'=>tukav_get_thumb(get_the_ID(),'medium'),
              'date'=>get_the_date('d M Y'),'cat'=>!empty($cats)?$cats[0]->name:''];
    }
    wp_reset_postdata();
    return $r;
}

/* ── Blog kutusu render ── */
function tukav_blog_box($cat_slug='',$cat_label='Tüm Yazılar',$limit=3) {
    $posts=tukav_get_posts($cat_slug,$limit);
    $cat_obj=$cat_slug?get_category_by_slug($cat_slug):null;
    $cat_url=$cat_obj?get_category_link($cat_obj->term_id):home_url('/haberler');
    ob_start();
    if(!empty($posts)): ?>
    <div class="tp-blog-grid">
        <?php foreach($posts as $p): ?>
        <a href="<?php echo esc_url($p['url']); ?>" class="tp-blog-card">
            <div class="tp-bc-img">
                <?php if($p['thumb']): ?><img src="<?php echo esc_url($p['thumb']); ?>" alt="<?php echo esc_attr($p['title']); ?>" loading="lazy"><?php endif; ?>
                <?php if($p['cat']): ?><span class="tp-bc-kat"><?php echo esc_html($p['cat']); ?></span><?php endif; ?>
            </div>
            <div class="tp-bc-body">
                <div class="tp-bc-date"><?php echo esc_html($p['date']); ?></div>
                <h3 class="tp-bc-title"><?php echo esc_html($p['title']); ?></h3>
                <p class="tp-bc-exc"><?php echo esc_html($p['excerpt']); ?></p>
            </div>
        </a>
        <?php endforeach; ?>
    </div>
    <div class="tp-blog-more">
        <a href="<?php echo esc_url($cat_url); ?>" class="tp-more-btn">
            <i class="fa fa-newspaper"></i> <?php echo esc_html($cat_label); ?> — Tüm Yazıları Gör →
        </a>
    </div>
    <?php else: ?>
    <div class="tp-blog-empty">
        <i class="fa fa-newspaper"></i>
        <p>Henüz içerik eklenmemiş.</p>
    </div>
    <?php endif;
    return ob_get_clean();
}
