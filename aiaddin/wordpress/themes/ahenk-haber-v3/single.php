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
    $renk        = ( $kat && isset($kat->term_id) ) ? ahenk_kategori_rengi($kat->term_id) : '#CC0000';

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
</main>

<?php
endwhile;
get_footer();
