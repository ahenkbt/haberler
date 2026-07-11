<?php
/**
 * Ahenk Haber - Arşiv (category, taxonomy, archive)
 */
get_header();

$queried = get_queried_object();
$kat_renk = '#CC0000';
$kat_sayi = 0;

if ( isset($queried->term_id) ) {
    $kat_renk = ahenk_kategori_rengi($queried->term_id);
    $kat_sayi = (int) $queried->count;
}

$archive_title = '';
if ( is_category() || is_tax() ) {
    $archive_title = single_term_title('', false);
} elseif ( is_tag() ) {
    $archive_title = single_tag_title('', false);
} elseif ( is_author() ) {
    $archive_title = get_the_author();
} elseif ( is_year() ) {
    $archive_title = get_the_date('Y');
} elseif ( is_month() ) {
    $archive_title = get_the_date('F Y');
} elseif ( is_post_type_archive() ) {
    $archive_title = post_type_archive_title('', false);
} else {
    $archive_title = __('Arşiv');
}
?>
<main style="padding:20px 0 40px">
<div class="container">

    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:3px solid <?php echo esc_attr($kat_renk); ?>;margin-bottom:20px;flex-wrap:wrap;gap:8px">
        <h1 style="margin:0;font-size:22px;font-weight:900;color:<?php echo esc_attr($kat_renk); ?>;display:flex;align-items:center;gap:10px">
            <span style="display:block;width:5px;height:26px;background:<?php echo esc_attr($kat_renk); ?>;border-radius:3px;flex-shrink:0"></span>
            <?php echo esc_html($archive_title); ?>
        </h1>
        <?php if ($kat_sayi > 0) : ?>
        <span style="font-size:12px;color:#999;background:#f0f0f0;padding:4px 12px;border-radius:20px;white-space:nowrap"><?php echo $kat_sayi; ?> haber</span>
        <?php endif; ?>
    </div>

    <div class="icerik-sidebar-sarici">
        <div class="ana-icerik">
            <?php if ( have_posts() ) : ?>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
                <?php while ( have_posts() ) : the_post();
                    $thumb_url = ahenk_thumb_url(null, 'ahenk-kart');
                    $kats_p = get_the_terms(get_the_ID(), 'haber-kategorisi');
                    if (!$kats_p || is_wp_error($kats_p)) $kats_p = get_the_category();
                    $kp = !empty($kats_p) ? $kats_p[0] : null;
                    $kp_renk = $kp ? ahenk_kategori_rengi($kp->term_id) : $kat_renk;
                ?>
                <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);display:flex;flex-direction:column">
                    <a href="<?php the_permalink(); ?>" style="display:flex;flex-direction:column;height:100%;text-decoration:none;color:inherit">
                        <div style="width:100%;height:195px;overflow:hidden;background:#e8e8e8;flex-shrink:0;position:relative">
                            <img src="<?php echo esc_url($thumb_url); ?>"
                                 alt="<?php echo esc_attr(get_the_title()); ?>"
                                 style="width:100%;height:100%;object-fit:cover;display:block"
                                 loading="lazy">
                            <?php if ($kp) : ?>
                            <span style="position:absolute;bottom:8px;left:8px;background:<?php echo esc_attr($kp_renk); ?>;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;text-transform:uppercase"><?php echo esc_html($kp->name); ?></span>
                            <?php endif; ?>
                        </div>
                        <div style="padding:14px 16px;flex:1;display:flex;flex-direction:column">
                            <h2 style="font-size:15px;font-weight:700;color:#1a1a1a;line-height:1.45;margin:0 0 8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden"><?php echo esc_html(ahenk_kirp(get_the_title(), 80)); ?></h2>
                            <p style="font-size:13px;color:#666;line-height:1.55;flex:1;margin:0 0 10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><?php echo esc_html(ahenk_kirp(get_the_excerpt(), 110)); ?></p>
                            <div style="display:flex;gap:10px;font-size:11px;color:#aaa;margin-top:auto">
                                <span><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(null, 'short'); ?></span>
                                <span><i class="fa fa-book-open"></i> <?php echo ahenk_okuma_suresi(); ?> dk</span>
                            </div>
                        </div>
                    </a>
                </div>
                <?php endwhile; ?>
            </div>
            <nav class="sayfalama"><?php the_posts_pagination(array('mid_size'=>3,'prev_text'=>'← Önceki','next_text'=>'Sonraki →')); ?></nav>
            <?php else : ?>
            <p style="padding:40px;text-align:center;color:#999;background:#fff;border-radius:8px">Bu arşivde içerik bulunamadı.</p>
            <?php endif; ?>
        </div>
        <aside class="sidebar" role="complementary"><?php get_sidebar(); ?></aside>
    </div>

</div>
</main>
<?php get_footer(); ?>
