<?php
/**
 * Template Name: Ahenk — Tam Sayfa (başlıksız, çerçevesiz)
 *
 * Kendi başına yüklenen tam sayfa şablonu. Header/footer/sidebar YOK.
 * Sadece admin bar (giriş yapmışsa) ve the_content() basılır.
 * AI Üret eklentisi bunu fullwidth modunda otomatik atar.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

// WP çekirdek kuyrukları
do_action( 'wp_enqueue_scripts' );
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?php echo esc_html( wp_get_document_title() ); ?></title>
<?php wp_head(); ?>
<style>
html, body { margin:0 !important; padding:0 !important; background:#fff; }
body { overflow-x:hidden; }
.ahenk-tamsayfa-wrap { width:100%; max-width:100%; margin:0; padding:0; }
.ahenk-tamsayfa-wrap > * { max-width:100%; }
#wpadminbar { z-index:99999; }
@media screen and (max-width: 782px) { html { margin-top:46px !important; } }
@media screen and (min-width: 783px) { html { margin-top:32px !important; } }
html:not(.admin-bar-active) { margin-top:0 !important; }
</style>
</head>
<body <?php body_class( 'ahenk-tamsayfa' ); ?>>
<?php if ( is_admin_bar_showing() ) : ?>
<script>document.documentElement.classList.add('admin-bar-active');</script>
<?php endif; ?>
<div class="ahenk-tamsayfa-wrap">
<?php
while ( have_posts() ) :
    the_post();
    the_content();
endwhile;
?>
</div>
<?php wp_footer(); ?>
</body>
</html>
