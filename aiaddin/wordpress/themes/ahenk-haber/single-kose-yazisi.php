<?php
/**
 * Ahenk Haber - Köşe Yazısı Detay
 */
get_header();
while (have_posts()) : the_post();
    $yazar_id  = get_the_author_meta('ID');
    $unvan     = get_user_meta($yazar_id, 'yazar_unvani', true);
    $kose_bas  = get_user_meta($yazar_id, 'kose_baslik', true);
    $foto      = get_avatar_url($yazar_id, array('size' => 100));
?>
<main class="site-main haber-detay-main" role="main">
    <div class="container">
        <div class="icerik-sidebar-sarici">
            <article class="haber-detay-icerik">
                <div class="kose-yazar-kutu">
                    <img src="<?php echo esc_url($foto); ?>" alt="<?php the_author(); ?>" class="kose-yazar-foto" loading="eager">
                    <div>
                        <a href="<?php echo esc_url(get_author_posts_url($yazar_id)); ?>" class="kose-yazar-isim"><?php the_author(); ?></a>
                        <?php if ($unvan) echo '<span class="kose-yazar-unvan">' . esc_html($unvan) . '</span>'; ?>
                        <?php if ($kose_bas) echo '<span class="kose-yazar-kosebaslik">' . esc_html($kose_bas) . '</span>'; ?>
                    </div>
                </div>
                <h1 class="haber-detay-baslik"><?php the_title(); ?></h1>
                <div class="haber-detay-meta">
                    <span><i class="fa fa-calendar"></i> <?php echo ahenk_turkce_tarih(); ?></span>
                </div>
                <?php if (has_post_thumbnail()) : ?>
                    <figure class="haber-detay-resim-sarici"><?php the_post_thumbnail('ahenk-genis', array('class' => 'haber-detay-resim', 'loading' => 'eager')); ?></figure>
                <?php endif; ?>
                <div class="haber-icerik"><?php the_content(); ?></div>
                <?php if (comments_open() || get_comments_number()) comments_template(); ?>
            </article>
            <aside class="sidebar"><?php dynamic_sidebar('sidebar-main'); ?></aside>
        </div>
    </div>
</main>
<?php endwhile; get_footer(); ?>
