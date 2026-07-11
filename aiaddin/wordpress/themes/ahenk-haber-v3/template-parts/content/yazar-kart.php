<?php
/**
 * Ahenk Haber - Yazar Kart Partial
 * Kullanım: global $yazar; get_template_part(...)
 */
if (!isset($yazar)) return;
$foto   = get_avatar_url($yazar->ID, array('size' => 80));
$unvan  = get_user_meta($yazar->ID, 'yazar_unvani', true);
$kose   = get_user_meta($yazar->ID, 'kose_baslik', true);
?>
<div class="yazar-kart">
    <a href="<?php echo esc_url(get_author_posts_url($yazar->ID)); ?>" class="yazar-kart-link">
        <img src="<?php echo esc_url($foto); ?>" alt="<?php echo esc_attr($yazar->display_name); ?>" class="yazar-kart-foto" loading="lazy">
        <div class="yazar-kart-bilgi">
            <span class="yazar-kart-isim"><?php echo esc_html($yazar->display_name); ?></span>
            <?php if ($unvan) echo '<span class="yazar-kart-unvan">' . esc_html($unvan) . '</span>'; ?>
        </div>
    </a>
</div>
