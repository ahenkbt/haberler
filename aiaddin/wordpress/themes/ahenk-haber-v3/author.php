<?php
/**
 * Ahenk Haber - Yazar Arşiv Sayfası
 */
get_header();
$yazar    = get_queried_object();
$yazar_id = $yazar->ID;
$unvan    = get_user_meta($yazar_id, 'yazar_unvani', true);
$twitter  = get_user_meta($yazar_id, 'yazar_twitter', true);
$instagram = get_user_meta($yazar_id, 'yazar_instagram', true);
$foto     = get_avatar_url($yazar_id, array('size' => 120));
?>
<main class="site-main" role="main">
    <div class="container">
        <div class="yazar-profil-kutusu">
            <img src="<?php echo esc_url($foto); ?>" alt="<?php echo esc_attr($yazar->display_name); ?>" class="yazar-profil-foto" loading="eager">
            <div class="yazar-profil-bilgi">
                <h1 class="yazar-profil-isim"><?php echo esc_html($yazar->display_name); ?></h1>
                <?php if ($unvan) echo '<p class="yazar-profil-unvan">' . esc_html($unvan) . '</p>'; ?>
                <?php if ($yazar->description) echo '<p class="yazar-profil-bio">' . esc_html($yazar->description) . '</p>'; ?>
                <div class="yazar-profil-sosyal">
                    <?php if ($twitter) echo '<a href="https://twitter.com/' . esc_attr(ltrim($twitter,'@')) . '" target="_blank" rel="noopener" class="sosyal-btn sosyal-btn--twitter"><i class="fab fa-x-twitter"></i></a>'; ?>
                    <?php if ($instagram) echo '<a href="https://instagram.com/' . esc_attr(ltrim($instagram,'@')) . '" target="_blank" rel="noopener" class="sosyal-btn sosyal-btn--instagram"><i class="fab fa-instagram"></i></a>'; ?>
                </div>
            </div>
        </div>
        <div class="icerik-sidebar-sarici">
            <div class="ana-icerik">
                <h2 class="arsiv-baslik-metin" style="font-size:17px; margin-bottom:16px;">
                    <?php echo esc_html($yazar->display_name); ?> tarafından yazılan haberler
                </h2>
                <?php if (have_posts()) :
                    while (have_posts()) : the_post(); ?>
                        <article class="arsiv-haber-item">
                            <a href="<?php the_permalink(); ?>" class="arsiv-haber-link">
                                <div class="arsiv-resim" style="height:120px;">
                                    <img src="<?php echo esc_url(ahenk_thumb_url(null,'ahenk-kart')); ?>" alt="<?php echo esc_attr(get_the_title()); ?>" loading="lazy">
                                </div>
                                <div class="arsiv-icerik">
                                    <h2 class="arsiv-baslik-h2"><?php the_title(); ?></h2>
                                    <div class="arsiv-meta">
                                        <span><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(null,'short'); ?></span>
                                    </div>
                                </div>
                            </a>
                        </article>
                    <?php endwhile;
                    the_posts_pagination();
                else : ?>
                    <p>Bu yazara ait haber bulunamadı.</p>
                <?php endif; ?>
            </div>
            <aside class="sidebar"><?php dynamic_sidebar('sidebar-main'); ?></aside>
        </div>
    </div>
</main>
<?php get_footer(); ?>
