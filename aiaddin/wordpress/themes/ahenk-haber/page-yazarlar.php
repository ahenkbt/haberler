<?php
/**
 * Template Name: Tüm Yazarlar
 *
 * Eklentiden (ky_yazarlar_al) gelen tüm aktif yazarları,
 * tema panelindeki sıralamaya göre, ULTRA PREMIUM bir tasarımla
 * gösterir. Her karta tıklayınca yazarın profil sayfasına
 * (/yazar/<slug>/) gidilir.
 */
get_header();

$ahenk_renk = get_theme_mod('ahenk_renk_ana', '#D4AF37');

// Tema panelindeki sıralamaya göre yazarları al; yoksa eklentiden
$yazarlar = function_exists('ahenk_yazarlar_sirali')
    ? ahenk_yazarlar_sirali(0)
    : ( function_exists('ky_yazarlar_al') ? ky_yazarlar_al(true) : array() );

// İstatistik
$toplam_yazar = is_array($yazarlar) ? count($yazarlar) : 0;
$toplam_yazi  = 0;
if ( $toplam_yazar > 0 ) {
    foreach ( $yazarlar as $_yz ) {
        if ( empty($_yz->id) ) continue;
        $toplam_yazi += (int) ( new WP_Query(array(
            'post_type'      => 'ky-makale',
            'post_status'    => 'publish',
            'posts_per_page' => 1,
            'fields'         => 'ids',
            'no_found_rows'  => false,
            'meta_query'     => array(array('key'=>'_ky_yazar_id','value'=>(int)$_yz->id)),
        )) )->found_posts;
    }
}
?>

<style>
    .ahyzs-wrap{background:#f4f5f8;padding:0 0 80px;min-height:60vh}
    .ahyzs-hero{position:relative;background:
        radial-gradient(1200px 400px at 100% -20%, rgba(255,255,255,.18), transparent 60%),
        radial-gradient(800px 300px at 0% 120%, rgba(0,0,0,.45), transparent 55%),
        linear-gradient(135deg,#1a0000 0%, <?php echo esc_attr($ahenk_renk); ?> 60%, #ff4d4d 100%);
        color:#fff;padding:70px 0 90px;overflow:hidden;text-align:center}
    .ahyzs-hero::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:60px;
        background:linear-gradient(180deg,transparent,#f4f5f8);pointer-events:none}
    .ahyzs-pill{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.14);
        border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(6px);
        padding:7px 18px;border-radius:999px;font-size:11px;font-weight:800;
        letter-spacing:1.6px;text-transform:uppercase;margin-bottom:18px}
    .ahyzs-hero h1{font-size:46px;font-weight:900;margin:0 0 12px;line-height:1.1;color:#fff;
        text-shadow:0 2px 30px rgba(0,0,0,.3);letter-spacing:-.5px}
    .ahyzs-hero h1 span{background:linear-gradient(180deg,#fff 50%,#ffd9d9);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
    .ahyzs-hero p{font-size:16px;opacity:.92;max-width:620px;margin:0 auto;line-height:1.55}
    .ahyzs-stats{display:flex;justify-content:center;gap:40px;margin-top:28px;flex-wrap:wrap;position:relative;z-index:2}
    .ahyzs-stat{text-align:center}
    .ahyzs-stat-num{font-size:32px;font-weight:900;line-height:1;display:block}
    .ahyzs-stat-lbl{font-size:11px;opacity:.85;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-top:6px;display:block}
    .ahyzs-stat-sep{width:1px;background:rgba(255,255,255,.25);height:42px;align-self:center}

    .ahyzs-container{max-width:1240px;margin:0 auto;padding:0 20px;position:relative;z-index:3;margin-top:-40px}

    .ahyzs-bread{background:#fff;border-radius:12px;padding:10px 16px;font-size:12px;color:#777;
        box-shadow:0 4px 14px rgba(0,0,0,.06);margin-bottom:24px;display:inline-flex;align-items:center;gap:6px}
    .ahyzs-bread a{color:#777;text-decoration:none}
    .ahyzs-bread a:hover{color:<?php echo esc_attr($ahenk_renk); ?>}
    .ahyzs-bread .sep{color:#ccc}
    .ahyzs-bread .cur{color:<?php echo esc_attr($ahenk_renk); ?>;font-weight:700}

    .ahyzs-toolbar{display:flex;align-items:center;gap:14px;margin-bottom:24px;flex-wrap:wrap;background:#fff;
        padding:14px 16px;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.05)}
    .ahyzs-search{flex:1;min-width:240px;position:relative}
    .ahyzs-search input{width:100%;padding:11px 16px 11px 42px;border:1px solid #e5e5e5;border-radius:10px;
        font-size:14px;background:#fafafa;transition:all .2s;box-sizing:border-box}
    .ahyzs-search input:focus{background:#fff;border-color:<?php echo esc_attr($ahenk_renk); ?>;outline:none;
        box-shadow:0 0 0 3px rgba(212,175,55,.1)}
    .ahyzs-search-ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#bbb}
    .ahyzs-counter{font-size:12px;color:#777;font-weight:600;display:flex;align-items:center;gap:6px}
    .ahyzs-counter b{color:<?php echo esc_attr($ahenk_renk); ?>;font-size:15px}

    .ahyzs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:22px}
    .ahyzs-card{position:relative;background:#fff;border-radius:18px;overflow:hidden;
        box-shadow:0 4px 16px rgba(0,0,0,.06);
        transition:transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s, border-color .2s;
        display:flex;flex-direction:column;border:1px solid transparent}
    .ahyzs-card:hover{transform:translateY(-8px);box-shadow:0 24px 48px -16px rgba(0,0,0,.18);border-color:<?php echo esc_attr($ahenk_renk); ?>20}
    .ahyzs-card .ahyzs-cover{position:relative;height:130px;background:
        linear-gradient(135deg,<?php echo esc_attr($ahenk_renk); ?>,#1a1a1a);overflow:hidden}
    .ahyzs-card .ahyzs-cover::before{content:"";position:absolute;inset:0;
        background:radial-gradient(circle at 30% 40%, rgba(255,255,255,.2), transparent 60%),
        radial-gradient(circle at 80% 80%, rgba(0,0,0,.25), transparent 50%);}
    .ahyzs-card .ahyzs-cover::after{content:"\f303";font-family:"Font Awesome 5 Free","Font Awesome 6 Free",FontAwesome;
        font-weight:900;position:absolute;right:14px;top:14px;color:rgba(255,255,255,.25);font-size:36px}

    .ahyzs-foto-wrap{position:absolute;left:50%;bottom:-46px;transform:translateX(-50%);width:104px;height:104px;
        border-radius:50%;background:#fff;padding:5px;box-shadow:0 10px 24px rgba(0,0,0,.18);z-index:2}
    .ahyzs-foto-wrap img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
    .ahyzs-foto-wrap .ahyzs-harf{width:100%;height:100%;border-radius:50%;
        background:linear-gradient(135deg,<?php echo esc_attr($ahenk_renk); ?>,#222);
        color:#fff;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:900}

    .ahyzs-body{padding:60px 22px 18px;text-align:center;flex:1;display:flex;flex-direction:column}
    .ahyzs-rozet{display:inline-block;background:#fff8e1;color:<?php echo esc_attr($ahenk_renk); ?>;
        font-size:9.5px;font-weight:800;padding:4px 11px;border-radius:999px;
        text-transform:uppercase;letter-spacing:.8px;border:1px solid #e8cf7a;margin:0 auto 8px}
    .ahyzs-ad{font-size:19px;font-weight:900;color:#1a1a1a;margin:0 0 4px;line-height:1.25}
    .ahyzs-unvan{font-size:12px;color:#888;font-style:italic;margin-bottom:14px}

    .ahyzs-son{background:#fafafa;border-radius:12px;padding:12px;margin:6px 0 14px;text-align:left}
    .ahyzs-son-lbl{font-size:9px;font-weight:800;color:#aaa;text-transform:uppercase;
        letter-spacing:.8px;display:flex;align-items:center;gap:5px;margin-bottom:6px}
    .ahyzs-son-lbl i{color:<?php echo esc_attr($ahenk_renk); ?>}
    .ahyzs-son-baslik{font-size:13px;font-weight:700;color:#333;line-height:1.4;
        display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .ahyzs-son-yok{font-size:12px;color:#bbb;font-style:italic;text-align:center;padding:6px 0}

    .ahyzs-meta{display:flex;justify-content:center;gap:14px;margin-bottom:14px;font-size:11px;color:#888}
    .ahyzs-meta span{display:inline-flex;align-items:center;gap:4px}
    .ahyzs-meta b{color:#333;font-weight:800;font-size:13px}

    .ahyzs-btn{margin-top:auto;display:flex;align-items:center;justify-content:center;gap:8px;
        background:linear-gradient(135deg,<?php echo esc_attr($ahenk_renk); ?>,#f0d36b);
        color:#fff;padding:11px 14px;border-radius:10px;text-decoration:none;
        font-size:12.5px;font-weight:800;letter-spacing:.4px;
        box-shadow:0 6px 16px -6px rgba(212,175,55,.55);transition:transform .2s, box-shadow .2s}
    .ahyzs-btn:hover{transform:translateY(-2px);box-shadow:0 12px 22px -8px rgba(212,175,55,.6);color:#fff}

    .ahyzs-empty{background:#fff;border:2px dashed #e2e2e2;border-radius:18px;padding:80px 24px;
        text-align:center;color:#888;margin-top:24px}
    .ahyzs-empty i{font-size:54px;color:#ccc;margin-bottom:14px;display:block}
    .ahyzs-empty h2{margin:0 0 8px;color:#444;font-size:20px}

    @media (max-width:640px){
        .ahyzs-hero{padding:50px 0 80px}
        .ahyzs-hero h1{font-size:32px}
        .ahyzs-stats{gap:22px}
        .ahyzs-stat-num{font-size:24px}
        .ahyzs-grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
    }
</style>

<main id="main-content" class="site-main ahyzs-wrap" role="main">

    <section class="ahyzs-hero">
        <div class="ahyzs-pill"><i class="fa fa-pen-nib"></i> Köşe Yazarları</div>
        <h1>Kalemleriyle <span>Gündemi Yazanlar</span></h1>
        <p>Gazetemizde kalemini konuşturan değerli yazarlarımızın köşe yazılarını keşfedin, ufkunuzu birlikte genişletelim.</p>

        <?php if ( $toplam_yazar > 0 ) : ?>
        <div class="ahyzs-stats">
            <div class="ahyzs-stat">
                <span class="ahyzs-stat-num"><?php echo (int) $toplam_yazar; ?></span>
                <span class="ahyzs-stat-lbl">Aktif Yazar</span>
            </div>
            <div class="ahyzs-stat-sep"></div>
            <div class="ahyzs-stat">
                <span class="ahyzs-stat-num"><?php echo (int) $toplam_yazi; ?></span>
                <span class="ahyzs-stat-lbl">Köşe Yazısı</span>
            </div>
            <div class="ahyzs-stat-sep"></div>
            <div class="ahyzs-stat">
                <span class="ahyzs-stat-num">7/24</span>
                <span class="ahyzs-stat-lbl">Güncel İçerik</span>
            </div>
        </div>
        <?php endif; ?>
    </section>

    <div class="ahyzs-container">
        <nav class="ahyzs-bread" aria-label="Sayfa Yolu">
            <i class="fa fa-home"></i>
            <a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a>
            <span class="sep">/</span>
            <span class="cur">Yazarlar</span>
        </nav>

        <?php if ( empty($yazarlar) ) : ?>
            <div class="ahyzs-empty">
                <i class="fa fa-user-edit"></i>
                <h2>Henüz Yazar Eklenmemiş</h2>
                <p style="margin:0">Yönetim panelindeki <strong>✍ Yazarlar</strong> menüsünden yazar ekleyebilirsiniz.</p>
            </div>
        <?php else : ?>

            <div class="ahyzs-toolbar">
                <div class="ahyzs-search">
                    <span class="ahyzs-search-ico"><i class="fa fa-search"></i></span>
                    <input type="text" id="ahyzs-arama" placeholder="Yazar veya köşe ara…" aria-label="Yazar ara">
                </div>
                <div class="ahyzs-counter">
                    <i class="fa fa-users" style="color:<?php echo esc_attr($ahenk_renk); ?>"></i>
                    <b id="ahyzs-sayac"><?php echo count($yazarlar); ?></b> aktif yazar listeleniyor
                </div>
            </div>

            <div class="ahyzs-grid" id="ahyzs-grid">
                <?php foreach ( $yazarlar as $yz ) :
                    if ( empty($yz->id) ) continue;
                    $link = esc_url( home_url('/yazar/' . $yz->slug . '/') );

                    $son_q = new WP_Query(array(
                        'post_type'      => 'ky-makale',
                        'post_status'    => 'publish',
                        'posts_per_page' => 1,
                        'orderby'        => 'date',
                        'order'          => 'DESC',
                        'no_found_rows'  => false,
                        'meta_query'     => array(
                            array('key' => '_ky_yazar_id', 'value' => (int)$yz->id),
                        ),
                    ));
                    $yazi_sayisi = (int) $son_q->found_posts;
                    $son_baslik  = '';
                    $son_link    = '';
                    $son_tarih   = '';
                    if ( $son_q->have_posts() ) {
                        $son_q->the_post();
                        $son_baslik = get_the_title();
                        $son_link   = get_permalink();
                        $son_tarih  = get_the_date('d M Y');
                        wp_reset_postdata();
                    }

                    $arama_txt = strtolower( ($yz->ad ?? '') . ' ' . ($yz->slug ?? '') . ' ' . ($yz->kose_adi ?? '') . ' ' . ($yz->unvan ?? '') );
                ?>
                <article class="ahyzs-card" data-arama="<?php echo esc_attr($arama_txt); ?>">

                    <div class="ahyzs-cover"></div>

                    <div class="ahyzs-foto-wrap">
                        <?php if ( ! empty($yz->foto) ) : ?>
                            <img src="<?php echo esc_url($yz->foto); ?>" alt="<?php echo esc_attr($yz->ad ?? ''); ?>" loading="lazy">
                        <?php else : ?>
                            <div class="ahyzs-harf"><?php echo esc_html( mb_strtoupper( mb_substr($yz->ad ?? '?', 0, 1) ) ); ?></div>
                        <?php endif; ?>
                    </div>

                    <div class="ahyzs-body">
                        <?php if ( ! empty($yz->kose_adi) ) : ?>
                            <span class="ahyzs-rozet"><?php echo esc_html($yz->kose_adi); ?></span>
                        <?php endif; ?>

                        <h2 class="ahyzs-ad"><a href="<?php echo $link; ?>" style="color:inherit;text-decoration:none"><?php echo esc_html($yz->ad ?? ''); ?></a></h2>

                        <?php if ( ! empty($yz->unvan) ) : ?>
                            <div class="ahyzs-unvan"><?php echo esc_html($yz->unvan); ?></div>
                        <?php endif; ?>

                        <div class="ahyzs-meta">
                            <span><b><?php echo (int) $yazi_sayisi; ?></b> yazı</span>
                            <?php if ( $son_tarih ) : ?>
                                <span style="color:#ddd">•</span>
                                <span>Son: <b><?php echo esc_html($son_tarih); ?></b></span>
                            <?php endif; ?>
                        </div>

                        <?php if ( $son_baslik ) : ?>
                            <a href="<?php echo esc_url($son_link); ?>" class="ahyzs-son" style="text-decoration:none;color:inherit;display:block">
                                <div class="ahyzs-son-lbl"><i class="fa fa-feather-alt"></i> Son Yazısı</div>
                                <div class="ahyzs-son-baslik"><?php echo esc_html($son_baslik); ?></div>
                            </a>
                        <?php else : ?>
                            <div class="ahyzs-son">
                                <div class="ahyzs-son-yok">Henüz yazısı yok</div>
                            </div>
                        <?php endif; ?>

                        <a href="<?php echo $link; ?>" class="ahyzs-btn">
                            Tüm Yazıları Oku <i class="fa fa-arrow-right"></i>
                        </a>
                    </div>
                </article>
                <?php endforeach; ?>
            </div>

            <div id="ahyzs-bos" class="ahyzs-empty" style="display:none">
                <i class="fa fa-search-minus"></i>
                <h2>Sonuç Bulunamadı</h2>
                <p style="margin:0">Aramanıza uygun yazar bulunamadı.</p>
            </div>

        <?php endif; ?>
    </div>
</main>

<script>
(function(){
    var arama = document.getElementById('ahyzs-arama');
    if (!arama) return;
    var kartlar = document.querySelectorAll('.ahyzs-card');
    var sayac   = document.getElementById('ahyzs-sayac');
    var bos     = document.getElementById('ahyzs-bos');
    var grid    = document.getElementById('ahyzs-grid');
    arama.addEventListener('input', function(){
        var q = this.value.toLowerCase().trim();
        var gorulen = 0;
        kartlar.forEach(function(k){
            var ok = !q || k.dataset.arama.indexOf(q) !== -1;
            k.style.display = ok ? '' : 'none';
            if (ok) gorulen++;
        });
        if (sayac) sayac.textContent = gorulen;
        if (bos)   bos.style.display = gorulen === 0 ? '' : 'none';
        if (grid)  grid.style.display = gorulen === 0 ? 'none' : '';
    });
})();
</script>

<?php get_footer(); ?>
