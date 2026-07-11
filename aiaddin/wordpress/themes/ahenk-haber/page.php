<?php
/**
 * Ahenk Haber - Sayfa Şablonu (page.php)
 * WordPress'te normal sayfalar için kullanılır.
 */

get_header();
?>

<main id="main-content" class="site-main sayfa-main" role="main">
    <div class="container">
        <div class="sayfa-icerik-sarici">

            <?php while ( have_posts() ) : the_post(); ?>

            <article id="sayfa-<?php the_ID(); ?>" <?php post_class('sayfa-icerik-kutu'); ?>>

                <!-- EKMEK KIRINTISI -->
                <nav class="ekmek-kirintisi" aria-label="Sayfa Yolu">
                    <a href="<?php echo esc_url( home_url('/') ); ?>"><i class="fa fa-home"></i> Ana Sayfa</a>
                    <span aria-hidden="true"> / </span>
                    <span aria-current="page"><?php the_title(); ?></span>
                </nav>

                <!-- SAYFA BAŞLIĞI -->
                <header class="sayfa-baslik-alani">
                    <h1 class="sayfa-baslik"><?php the_title(); ?></h1>
                </header>

                <!-- ÖZEL GÖRSEL -->
                <?php if ( has_post_thumbnail() ) : ?>
                    <figure class="sayfa-resim-sarici">
                        <?php the_post_thumbnail( 'ahenk-genis', array(
                            'class'   => 'sayfa-resim',
                            'loading' => 'eager',
                        ) ); ?>
                    </figure>
                <?php endif; ?>

                <!-- SAYFA İÇERİĞİ -->
                <div class="sayfa-icerik entry-content">
                    <?php the_content(); ?>
                </div>

                <!-- ALT SAYFALAMA (uzun sayfalarda) -->
                <?php
                wp_link_pages( array(
                    'before' => '<div class="sayfa-link-sayfalama"><span>' . __( 'Sayfa:', 'ahenk-haber' ) . '</span>',
                    'after'  => '</div>',
                ) );
                ?>

            </article>

            <?php endwhile; ?>

        </div>
    </div>
</main>

<?php get_footer(); ?>
