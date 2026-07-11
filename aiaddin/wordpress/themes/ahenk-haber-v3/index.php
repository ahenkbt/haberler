<?php
/**
 * Ahenk Haber - Varsayılan Şablon
 * Front page veya kategoriye yönlendirilmemişse bu kullanılır.
 */
if ( is_front_page() || is_home() ) {
    include get_template_directory() . '/front-page.php';
    exit;
}
get_header(); ?>
<main id="main-content" class="site-main" role="main">
    <div class="container">
        <div class="icerik-sidebar-sarici">
            <div class="ana-icerik">
                <?php if ( have_posts() ) :
                    while ( have_posts() ) : the_post();
                        get_template_part('template-parts/content/haber-kart');
                    endwhile;
                    the_posts_pagination();
                else : ?>
                    <p><?php esc_html_e('İçerik bulunamadı.', 'ahenk-haber'); ?></p>
                <?php endif; ?>
            </div>
            <aside class="sidebar"><?php dynamic_sidebar('sidebar-main'); ?></aside>
        </div>
    </div>
</main>
<?php get_footer(); ?>
