<?php get_header(); ?>
<main class="site-main" role="main">
    <div class="container">
        <div class="icerik-sidebar-sarici">
            <div class="ana-icerik">
                <div class="arsiv-baslik">
                    <h1 class="arsiv-baslik-metin">
                        <i class="fa fa-search"></i>
                        "<?php echo esc_html( get_search_query() ); ?>" için arama sonuçları
                    </h1>
                    <?php global $wp_query; ?>
                    <span class="arsiv-sayi"><?php echo $wp_query->found_posts; ?> sonuç bulundu</span>
                </div>
                <?php if ( have_posts() ) :
                    while ( have_posts() ) : the_post(); ?>
                        <article class="arsiv-haber-item">
                            <a href="<?php the_permalink(); ?>" class="arsiv-haber-link">
                                <div class="arsiv-resim">
                                    <img src="<?php echo esc_url(ahenk_thumb_url(null,'ahenk-kart')); ?>"
                                         alt="<?php echo esc_attr(get_the_title()); ?>" loading="lazy">
                                </div>
                                <div class="arsiv-icerik">
                                    <h2 class="arsiv-baslik-h2"><?php the_title(); ?></h2>
                                    <p class="arsiv-spot"><?php echo esc_html(ahenk_kirp(get_the_excerpt(), 150)); ?></p>
                                    <div class="arsiv-meta">
                                        <span><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(null,'short'); ?></span>
                                    </div>
                                </div>
                            </a>
                        </article>
                    <?php endwhile;
                    the_posts_pagination();
                else : ?>
                    <div class="icerik-yok">
                        <p>Aramanızla eşleşen içerik bulunamadı. Farklı anahtar kelimeler deneyin.</p>
                        <?php get_search_form(); ?>
                    </div>
                <?php endif; ?>
            </div>
            <aside class="sidebar"><?php dynamic_sidebar('sidebar-main'); ?></aside>
        </div>
    </div>
</main>
<?php get_footer(); ?>
