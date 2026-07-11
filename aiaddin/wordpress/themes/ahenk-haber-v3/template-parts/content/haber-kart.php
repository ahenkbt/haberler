<?php
/**
 * Ahenk Haber - Haber Kart Partial
 * Kullanım: get_template_part('template-parts/content/haber-kart')
 */
$post_id = get_the_ID();
$kats    = get_the_terms($post_id, 'haber-kategorisi');
if (!$kats || is_wp_error($kats)) $kats = get_the_category();
$kat     = $kats ? $kats[0] : null;
$renk    = $kat ? ahenk_kategori_rengi($kat->term_id) : '#CC0000';
$thumb   = ahenk_thumb_url($post_id, 'ahenk-kart');
?>
<article class="haber-kart" id="haber-<?php echo $post_id; ?>">
    <a href="<?php the_permalink(); ?>" class="haber-kart-link">
        <div class="haber-kart-resim" style="height:160px;">
            <img src="<?php echo esc_url($thumb); ?>" alt="<?php echo esc_attr(get_the_title()); ?>" loading="lazy">
            <?php if ($kat) : ?>
                <span class="haber-kategori-etiket-mini" style="background:<?php echo esc_attr($renk); ?>">
                    <?php echo esc_html($kat->name); ?>
                </span>
            <?php endif; ?>
        </div>
        <div class="haber-kart-icerik">
            <h3 class="haber-kart-baslik"><?php echo esc_html(ahenk_kirp(get_the_title(), 80)); ?></h3>
            <div class="haber-kart-meta">
                <span><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(null,'short'); ?></span>
                <span><i class="fa fa-book-open"></i> <?php echo ahenk_okuma_suresi(); ?> dk</span>
            </div>
        </div>
    </a>
</article>
