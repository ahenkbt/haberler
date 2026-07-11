<?php
/**
 * Ahenk Haber - Tekil Haber Detay Sayfasi
 *
 * DUZELTME NOTLARI (v1.1):
 * - Turkce karakter iceren PHP degisken adi ($populer) duzeltildi
 * - apply_filters('the_content') eklendi
 * - Tum degisken erisimlerinde null guard eklendi
 * - Icerik bolme mantigi basitlestirildi
 */

get_header();

while ( have_posts() ) : the_post();

    $post_id     = get_the_ID();

    // Kategori bilgisi
    $kats        = get_the_terms( $post_id, 'haber-kategorisi' );
    if ( ! $kats || is_wp_error($kats) ) {
        $kats = get_the_category();
    }
    $kat         = ( ! empty($kats) && is_array($kats) ) ? $kats[0] : null;
    $renk        = ( $kat && isset($kat->term_id) ) ? ahenk_kategori_rengi($kat->term_id) : '#D4AF37';

    // Meta alanlar
    $son_dakika  = get_post_meta( $post_id, '_son_dakika', true );
    $video_url   = get_post_meta( $post_id, '_video_url', true );
    $spot        = get_post_meta( $post_id, '_haber_spot', true );
    $okuma       = ahenk_okuma_suresi( $post_id );
    $paylasim    = ahenk_paylasim_linkleri( $post_id );

    // Yazar bilgisi
    $yazar_id    = (int) get_the_author_meta('ID');
    $yazar_unvan = $yazar_id ? get_user_meta( $yazar_id, 'yazar_unvani', true ) : '';
    $yazar_foto  = $yazar_id ? get_avatar_url( $yazar_id, array('size' => 80) ) : '';
    $yazar_bio   = $yazar_id ? get_the_author_meta('description') : '';

    // Resim URL
    $thumb_url   = ahenk_thumb_url( $post_id, 'ahenk-genis' );

    // Icerik (filtreli)
    $icerik_ham  = get_the_content();
    $icerik_tam  = apply_filters( 'the_content', $icerik_ham );

?>

<main id="main-content" class="site-main haber-detay-main" role="main">
    <div class="container">
        <div class="icerik-sidebar-sarici">

            <!-- ====================================================
                 HABER DETAY SUTUNU
                 ==================================================== -->
            <article class="haber-detay-icerik"
                     id="haber-<?php echo esc_attr($post_id); ?>"
                     itemscope itemtype="https://schema.org/NewsArticle">

                <!-- EKMEK KIRINTISI -->
                <nav class="ekmek-kirintisi" aria-label="Sayfa Yolu">
                    <a href="<?php echo esc_url( home_url('/') ); ?>"><i class="fa fa-home"></i> Ana Sayfa</a>
                    <?php if ( $kat && isset($kat->term_id) ) : ?>
                        <span aria-hidden="true"> / </span>
                        <a href="<?php echo esc_url( get_term_link($kat) ); ?>">
                            <?php echo esc_html( $kat->name ); ?>
                        </a>
                    <?php endif; ?>
                    <span aria-hidden="true"> / </span>
                    <span aria-current="page"><?php echo esc_html( ahenk_kirp(get_the_title(), 50) ); ?></span>
                </nav>

                <!-- BASLIK ALANI -->
                <header class="haber-baslik-alani">
                    <?php if ( $son_dakika === '1' ) : ?>
                        <div class="son-dakika-badge"><i class="fa fa-bolt"></i> SON DAKIKA</div>
                    <?php endif; ?>

                    <?php if ( $kat && isset($kat->term_id) ) : ?>
                        <a href="<?php echo esc_url( get_term_link($kat) ); ?>"
                           class="haber-detay-kategori"
                           style="color:<?php echo esc_attr($renk); ?>; border-color:<?php echo esc_attr($renk); ?>">
                            <?php echo esc_html( $kat->name ); ?>
                        </a>
                    <?php endif; ?>

                    <h1 class="haber-detay-baslik" itemprop="headline">
                        <?php the_title(); ?>
                    </h1>

                    <?php if ( $spot ) : ?>
                        <p class="haber-detay-spot" itemprop="description">
                            <?php echo esc_html( $spot ); ?>
                        </p>
                    <?php endif; ?>

                    <!-- Meta Bilgiler -->
                    <div class="haber-detay-meta">
                        <div class="haber-meta-sol">
                            <!-- Yazar goruntusu kapatildi -->
                        </div>
                        <div class="haber-meta-sag">
                            <span>
                                <i class="fa fa-calendar"></i>
                                <time datetime="<?php echo get_the_date('c'); ?>" itemprop="datePublished">
                                    <?php echo ahenk_turkce_tarih($post_id); ?>
                                </time>
                            </span>
                            <span>
                                <i class="fa fa-book-open"></i>
                                <?php echo (int)$okuma; ?> dk okuma
                            </span>
                            <span>
                                <i class="fa fa-comment"></i>
                                <?php echo (int) get_comments_number(); ?>
                            </span>
                        </div>
                    </div>

                    <!-- Paylasim Butonlari - Ust -->
                    <div class="paylasim-butonlari paylasim-ust">
                        <span class="paylasim-etiket">Paylas:</span>
                        <a href="<?php echo esc_url($paylasim['facebook']); ?>" class="paylasim-btn paylasim-fb"
                           target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                            <i class="fab fa-facebook-f"></i>
                        </a>
                        <a href="<?php echo esc_url($paylasim['twitter']); ?>" class="paylasim-btn paylasim-tw"
                           target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                            <i class="fab fa-x-twitter"></i>
                        </a>
                        <a href="<?php echo esc_url($paylasim['whatsapp']); ?>" class="paylasim-btn paylasim-wp"
                           target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </a>
                        <a href="<?php echo esc_url($paylasim['telegram']); ?>" class="paylasim-btn paylasim-tg"
                           target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                            <i class="fab fa-telegram"></i>
                        </a>
                        <button class="paylasim-btn paylasim-kopyala"
                                data-url="<?php echo esc_attr( get_permalink() ); ?>"
                                aria-label="Baglantıyı Kopyala">
                            <i class="fa fa-copy"></i>
                        </button>
                    </div>
                </header>

                <!-- HABER RESMI -->
                <?php if ( has_post_thumbnail() ) : ?>
                    <figure class="haber-detay-resim-sarici" itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
                        <?php the_post_thumbnail('ahenk-genis', array(
                            'class'    => 'haber-detay-resim',
                            'loading'  => 'eager',
                            'itemprop' => 'url',
                        )); ?>
                        <?php $alt_yazi = get_the_post_thumbnail_caption(); ?>
                        <?php if ( $alt_yazi ) : ?>
                            <figcaption class="resim-alt-yazi"><?php echo esc_html($alt_yazi); ?></figcaption>
                        <?php endif; ?>
                    </figure>
                <?php endif; ?>

                <!-- VIDEO EMBED -->
                <?php if ( $video_url ) :
                    $yt_id = ahenk_youtube_id($video_url);
                    if ( $yt_id ) : ?>
                        <div class="video-embed-sarici">
                            <div class="video-embed-ic">
                                <iframe src="<?php echo esc_url('https://www.youtube.com/embed/' . $yt_id . '?rel=0&modestbranding=1'); ?>"
                                        title="<?php echo esc_attr( get_the_title() ); ?>"
                                        frameborder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowfullscreen
                                        loading="lazy">
                                </iframe>
                            </div>
                        </div>
                    <?php endif;
                endif; ?>

                <!-- HABER ICERIGI -->
                <div class="haber-icerik entry-content" itemprop="articleBody">
                    <?php
                    // Icerik bolme ve icerisine reklam ekleme
                    $reklam_kodu = '';
                    if ( is_active_sidebar('ad-in-content-1') ) {
                        ob_start();
                        dynamic_sidebar('ad-in-content-1');
                        $reklam_kodu = ob_get_clean();
                    } else {
                        $reklam_kodu = get_option('ahenk_reklam_icerik_1', '');
                    }

                    if ( ! empty($reklam_kodu) ) {
                        // 4. paragraftan sonra reklam ekle
                        $paragraflar = preg_split('/(<\/p>)/i', $icerik_tam, -1, PREG_SPLIT_DELIM_CAPTURE);
                        $cikti       = '';
                        $p_sayac     = 0;
                        $reklam_eklendi = false;
                        foreach ( $paragraflar as $parca ) {
                            $cikti .= $parca;
                            if ( stripos($parca, '</p>') !== false ) {
                                $p_sayac++;
                                if ( ! $reklam_eklendi && $p_sayac >= 4 ) {
                                    $cikti .= '<div class="icerik-reklam" aria-label="Reklam">' . $reklam_kodu . '</div>';
                                    $reklam_eklendi = true;
                                }
                            }
                        }
                        echo $cikti;
                    } else {
                        echo $icerik_tam;
                    }
                    ?>
                </div>


                <!-- KAYNAK LİNKİ (Bot haberleri için) -->
                <?php $kaynak_url = get_post_meta($post_id,'_kaynak_url',true); ?>
                <?php if ($kaynak_url) : ?>
                <div class="kaynak-linki">
                    <i class="fa fa-link"></i>
                    <a href="<?php echo esc_url($kaynak_url); ?>" target="_blank" rel="noopener noreferrer nofollow">
                        Haberin Kaynağı <i class="fa fa-external-link-alt"></i>
                    </a>
                </div>
                <?php endif; ?>

                <!-- ETIKETLER -->
                <?php
                $etiketler = get_the_terms( $post_id, 'haber-etiketi' );
                if ( ! $etiketler || is_wp_error($etiketler) ) {
                    $etiketler = get_the_tags();
                }
                if ( $etiketler && ! is_wp_error($etiketler) ) : ?>
                    <div class="haber-etiketler">
                        <span class="etiket-baslik"><i class="fa fa-tags"></i> Etiketler:</span>
                        <?php foreach ( $etiketler as $etiket ) : ?>
                            <a href="<?php echo esc_url( get_term_link($etiket) ); ?>"
                               class="etiket-pill">
                                <?php echo esc_html( $etiket->name ); ?>
                            </a>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>

                <!-- PAYLASIM - ALT -->
                <div class="paylasim-butonlari paylasim-alt">
                    <span class="paylasim-etiket">Bu haberi paylas:</span>
                    <a href="<?php echo esc_url($paylasim['facebook']); ?>"
                       class="paylasim-btn paylasim-btn--genis paylasim-fb"
                       target="_blank" rel="noopener noreferrer">
                        <i class="fab fa-facebook-f"></i> Facebook
                    </a>
                    <a href="<?php echo esc_url($paylasim['twitter']); ?>"
                       class="paylasim-btn paylasim-btn--genis paylasim-tw"
                       target="_blank" rel="noopener noreferrer">
                        <i class="fab fa-x-twitter"></i> Twitter
                    </a>
                    <a href="<?php echo esc_url($paylasim['whatsapp']); ?>"
                       class="paylasim-btn paylasim-btn--genis paylasim-wp"
                       target="_blank" rel="noopener noreferrer">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </a>
                </div>

                <!-- YAZAR KUTUSU -->
                <?php if ( $yazar_id ) : ?>
                    <div class="yazar-kutusu" itemscope itemtype="https://schema.org/Person">
                        <?php if ( $yazar_foto ) : ?>
                            <img src="<?php echo esc_url($yazar_foto); ?>"
                                 alt="<?php echo esc_attr( get_the_author() ); ?>"
                                 class="yazar-kutu-foto"
                                 loading="lazy"
                                 itemprop="image">
                        <?php endif; ?>
                        <div class="yazar-kutu-bilgi">
                            <a href="<?php echo esc_url( get_author_posts_url($yazar_id) ); ?>"
                               class="yazar-kutu-isim"
                               itemprop="name">
                                <?php the_author(); ?>
                            </a>
                            <?php if ( $yazar_unvan ) : ?>
                                <span class="yazar-kutu-unvan" itemprop="jobTitle">
                                    <?php echo esc_html($yazar_unvan); ?>
                                </span>
                            <?php endif; ?>
                            <?php if ( $yazar_bio ) : ?>
                                <p class="yazar-kutu-bio" itemprop="description">
                                    <?php echo esc_html( ahenk_kirp($yazar_bio, 200) ); ?>
                                </p>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endif; ?>

                <!-- Schema.org gizli meta -->
                <meta itemprop="dateModified" content="<?php echo get_the_modified_date('c'); ?>">
                <span itemprop="publisher" itemscope itemtype="https://schema.org/Organization">
                    <meta itemprop="name" content="<?php bloginfo('name'); ?>">
                    <meta itemprop="url" content="<?php echo esc_url( home_url('/') ); ?>">
                </span>

                <!-- YORUMLAR -->
                <?php if ( comments_open() || get_comments_number() ) : ?>
                    <div class="yorumlar-alani">
                        <?php comments_template(); ?>
                    </div>
                <?php endif; ?>

            <!-- ════════════════════════════════════════════════════════════════
                 AHENK INFINITE NEWS v2 - Sıradaki Haberler (sidebar yanında kalsın)
                 ════════════════════════════════════════════════════════════════ -->
            <section id="ahenk-inf-haber-bolum" class="ahenk-inf-haber-bolum"
                     style="background:#fafafa;padding:24px 0 30px;border-top:1px solid #eee;margin-top:30px">
                <div id="ahenk-inf-haber-konteyner"
                     data-baslangic-id="<?php echo esc_attr( get_the_ID() ); ?>"
                     data-baslangic-kat="<?php
                         $_iks = get_the_terms( get_the_ID(), 'haber-kategorisi' );
                         if ( ! $_iks || is_wp_error($_iks) ) $_iks = get_the_category();
                         echo esc_attr( ! empty($_iks) ? (int) $_iks[0]->term_id : 0 );
                     ?>"
                     data-nonce="<?php echo esc_attr( wp_create_nonce('ahenk_inf_nonce') ); ?>"
                     data-ajaxurl="<?php echo esc_url( admin_url('admin-ajax.php') ); ?>"
                     style="max-width:100%;margin:0 auto"></div>

                <div id="ahenk-inf-haber-loader" style="display:none;text-align:center;padding:24px 0;color:#999;font-size:14px">
                    <i class="fa fa-spinner fa-spin"></i> Sıradaki haber yükleniyor...
                </div>

                <div id="ahenk-inf-haber-bitis" style="display:none;text-align:center;padding:24px 0;color:#999;font-size:13px">
                    <i class="fa fa-check-circle"></i> Tüm haberler okundu.
                </div>

                <div id="ahenk-inf-haber-buton-sar" style="text-align:center;padding:24px 0 6px">
                    <button type="button" id="ahenk-inf-haber-buton"
                            aria-label="Sıradaki haberi yükle"
                            style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:#D4AF37;color:#fff;border:none;border-radius:50%;font-size:28px;cursor:pointer;box-shadow:0 4px 14px rgba(212,175,55,.25)">
                        <i class="fa fa-infinity ahenk-inf-spin"></i>
                    </button>
                </div>
            </section>

            </article><!-- .haber-detay-icerik -->

            <!-- ====================================================
                 SIDEBAR
                 ==================================================== -->
            <aside class="sidebar" role="complementary" aria-label="Yan Panel">
                <?php if ( is_active_sidebar('sidebar-main') ) : ?>
                    <?php dynamic_sidebar('sidebar-main'); ?>
                <?php else : ?>

                    <!-- Sidebar Reklam -->
                    <?php $s_rek = get_option('ahenk_reklam_sidebar_top', ''); ?>
                    <?php if ( $s_rek ) : ?>
                        <div class="widget sidebar-reklam-widget">
                            <?php echo wp_kses_post($s_rek); ?>
                        </div>
                    <?php endif; ?>

                    <!-- En Cok Okunanlar -->
                    <div class="widget">
                        <h3 class="widget-title">En Cok Okunanlar</h3>
                        <?php
                        // NOT: Degisken adi Turkce karakter icermeyecek sekilde duzeltildi ($populer)
                        $populer = new WP_Query( array(
                            'post_type'      => array('haber','post'),
                            'posts_per_page' => 6,
                            'orderby'        => 'comment_count',
                            'order'          => 'DESC',
                            'no_found_rows'  => true,
                            'post__not_in'   => array($post_id),
                        ));
                        if ( $populer->have_posts() ) :
                            echo '<ol class="sidebar-haber-listesi sidebar-haber-listesi--numarali">';
                            $n = 1;
                            while ( $populer->have_posts() ) : $populer->the_post(); ?>
                                <li class="sidebar-haber-item">
                                    <span class="sidebar-numara"><?php echo $n++; ?></span>
                                    <a href="<?php the_permalink(); ?>" class="sidebar-haber-link">
                                        <span class="sidebar-haber-baslik">
                                            <?php echo esc_html( ahenk_kirp(get_the_title(), 65) ); ?>
                                        </span>
                                        <span class="sidebar-haber-tarih">
                                            <i class="fa fa-clock"></i>
                                            <?php echo ahenk_turkce_tarih(null, 'short'); ?>
                                        </span>
                                    </a>
                                </li>
                            <?php endwhile;
                            echo '</ol>';
                            wp_reset_postdata();
                        endif; ?>
                    </div>

                    <!-- Son Haberler -->
                    <div class="widget">
                        <h3 class="widget-title">Son Haberler</h3>
                        <?php
                        $son_q = new WP_Query( array(
                            'post_type'      => array('haber','post'),
                            'posts_per_page' => 6,
                            'orderby'        => 'date',
                            'order'          => 'DESC',
                            'no_found_rows'  => true,
                            'post__not_in'   => array($post_id),
                        ));
                        if ( $son_q->have_posts() ) :
                            echo '<ul class="sidebar-haber-listesi">';
                            while ( $son_q->have_posts() ) : $son_q->the_post(); ?>
                                <li class="sidebar-haber-item">
                                    <a href="<?php the_permalink(); ?>" class="sidebar-haber-link">
                                        <div class="sidebar-haber-resim">
                                            <img src="<?php echo esc_url( ahenk_thumb_url(null,'ahenk-kucuk') ); ?>"
                                                 alt="<?php echo esc_attr( get_the_title() ); ?>"
                                                 loading="lazy">
                                        </div>
                                        <div class="sidebar-haber-icerik">
                                            <span class="sidebar-haber-baslik">
                                                <?php echo esc_html( ahenk_kirp(get_the_title(), 60) ); ?>
                                            </span>
                                            <span class="sidebar-haber-tarih">
                                                <i class="fa fa-clock"></i>
                                                <?php echo ahenk_turkce_tarih(null, 'short'); ?>
                                            </span>
                                        </div>
                                    </a>
                                </li>
                            <?php endwhile;
                            echo '</ul>';
                            wp_reset_postdata();
                        endif; ?>
                    </div>

                <?php endif; ?>
            </aside>

        </div><!-- .icerik-sidebar-sarici -->
    </div><!-- .container -->

<style>
.ahenk-inf-haber{border-top:6px double #e5e5e5;margin-top:36px;padding-top:26px}
.ahenk-inf-haber .haber-detay-baslik{font-size:24px;line-height:1.3}
@keyframes ahenkInfSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.ahenk-inf-spin{display:inline-block;animation:ahenkInfSpin 2.5s linear infinite}
@media (max-width:768px){
    #ahenk-inf-haber-bolum{padding-left:14px;padding-right:14px}
    .ahenk-inf-haber .haber-detay-baslik{font-size:20px}
    .ahenk-inf-haber img{max-width:100%;height:auto}
}
</style>

<script>
(function(){
    var konteyner = document.getElementById('ahenk-inf-haber-konteyner');
    var loader    = document.getElementById('ahenk-inf-haber-loader');
    var bitis     = document.getElementById('ahenk-inf-haber-bitis');
    var buton     = document.getElementById('ahenk-inf-haber-buton');
    var butonSar  = document.getElementById('ahenk-inf-haber-buton-sar');
    if ( ! konteyner ) return;

    var AJAXURL = konteyner.dataset.ajaxurl || (window.ahenkAjax && window.ahenkAjax.ajaxurl) || '/wp-admin/admin-ajax.php';
    var NONCE   = konteyner.dataset.nonce   || (window.ahenkAjax && window.ahenkAjax.infNonce) || '';

    var gosterilenIdler = [ parseInt(konteyner.dataset.baslangicId, 10) || 0 ];
    var sonKatId        = parseInt(konteyner.dataset.baslangicKat, 10) || 0;
    var yukleniyor      = false;
    var bitti           = false;
    var basarisizSayisi = 0;
    var isMobile        = (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);

    function sonrakiHaberiYukle() {
        if ( yukleniyor || bitti ) return;
        yukleniyor = true;
        loader.style.display = 'block';
        butonSar.style.display = 'none';

        var fd = new FormData();
        fd.append('action', 'ahenk_inf_haber_detay');
        fd.append('nonce',  NONCE);
        fd.append('kat_id', sonKatId);
        gosterilenIdler.forEach(function(id){ fd.append('haric[]', id); });

        // XHR (mobil tarayıcılarda fetch'e göre daha güvenli)
        var xhr = new XMLHttpRequest();
        xhr.open('POST', AJAXURL, true);
        xhr.withCredentials = true;
        xhr.timeout = 15000;
        xhr.onload = function(){
            yukleniyor = false;
            loader.style.display = 'none';
            try {
                var res = JSON.parse(xhr.responseText);
                if ( ! res || ! res.success ) throw new Error('bad');
                var d = res.data || {};
                if ( d.done || ! d.html ) {
                    bitti = true;
                    bitis.style.display = 'block';
                    return;
                }
                var tmp = document.createElement('div');
                tmp.innerHTML = d.html;
                var yeniHaber = tmp.firstElementChild;
                if ( yeniHaber ) {
                    konteyner.appendChild(yeniHaber);
                    if ( d.id )     gosterilenIdler.push( parseInt(d.id, 10) );
                    if ( d.kat_id ) sonKatId = parseInt(d.kat_id, 10);
                    butonSar.style.display = 'block';
                    buton.innerHTML = '↓ Sıradaki Haberi Yükle';
                }
            } catch(e){
                basarisizSayisi++;
                buton.innerHTML = '↻ Tekrar Dene';
                butonSar.style.display = 'block';
                if ( basarisizSayisi >= 3 ) { bitti = true; bitis.style.display = 'block'; }
            }
        };
        xhr.onerror = xhr.ontimeout = function(){
            yukleniyor = false;
            loader.style.display = 'none';
            basarisizSayisi++;
            buton.innerHTML = '↻ Tekrar Dene';
            butonSar.style.display = 'block';
            if ( basarisizSayisi >= 3 ) { bitti = true; bitis.style.display = 'block'; }
        };
        var body = '';
        var pairs = [];
        // FormData'yı urlencoded'a çevirme yerine direkt FormData gönder
        xhr.send(fd);
    }

    // Manuel buton (sonsuzluk simgeli) tıklamada da çalışır.
    buton.addEventListener('click', sonrakiHaberiYukle);

    // Otomatik tetikleyici: kullanıcı butona/sentinele yaklaşınca yükle.
    function otomatikKontrol(){
        if ( yukleniyor || bitti ) return;
        var rect = butonSar.getBoundingClientRect();
        var vh   = window.innerHeight || document.documentElement.clientHeight;
        var esik = isMobile ? 800 : 500;
        if ( rect.top < vh + esik ) sonrakiHaberiYukle();
    }
    var t = null;
    function tetikle(){
        if ( t ) return;
        t = setTimeout(function(){ otomatikKontrol(); t = null; }, 150);
    }
    window.addEventListener('scroll',    tetikle, { passive:true });
    window.addEventListener('touchmove', tetikle, { passive:true });
    window.addEventListener('resize',    tetikle, { passive:true });
    window.addEventListener('orientationchange', tetikle, { passive:true });

    if ( 'IntersectionObserver' in window ) {
        try {
            var io = new IntersectionObserver(function(entries){
                entries.forEach(function(e){
                    if ( e.isIntersecting && ! yukleniyor && ! bitti ) sonrakiHaberiYukle();
                });
            }, { rootMargin: (isMobile ? '800px' : '500px') + ' 0px' });
            io.observe(butonSar);
        } catch(e){ /* yoksay */ }
    }
})();
</script>

</main>

<?php
endwhile;
get_footer();
