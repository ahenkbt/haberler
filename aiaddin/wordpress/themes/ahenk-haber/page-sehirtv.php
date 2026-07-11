<?php
/**
 * Template Name: Şehir TV
 * Description:   Video TV platformu için özel tam ekran sayfa şablonu.
 */
get_header();
?>
<style>
.sehirtv-wrap { max-width: 1200px; margin: 20px auto; padding: 0 16px 40px; }
.sehirtv-baslik { font-size: 22px; font-weight: 900; color: #1a1a1a; margin: 0 0 16px; display: flex; align-items: center; gap: 10px; }
.sehirtv-baslik span { background: #D4AF37; color: #fff; padding: 4px 14px; border-radius: 4px; font-size: 14px; }
</style>

<div class="sehirtv-wrap">
    <h1 class="sehirtv-baslik">
        <span>📺</span> Şehir TV
    </h1>

    <?php
    /* Video TV eklentisi aktif mi? */
    if ( function_exists('VTV_Shortcode::render') || shortcode_exists('video_tv') ) {
        echo do_shortcode('[video_tv]');
    } else {
        echo '<div style="padding:60px;text-align:center;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08)">';
        echo '<div style="font-size:60px;margin-bottom:16px">📺</div>';
        echo '<h2 style="color:#D4AF37;margin:0 0 10px">Video TV Eklentisi Aktif Değil</h2>';
        echo '<p style="color:#666">Video TV eklentisini etkinleştirerek bu sayfayı kullanmaya başlayabilirsiniz.</p>';
        if ( current_user_can('manage_options') ) {
            echo '<a href="' . admin_url('plugins.php') . '" style="display:inline-block;margin-top:12px;background:#D4AF37;color:#fff;padding:10px 24px;border-radius:6px;font-weight:700">Eklentilere Git</a>';
        }
        echo '</div>';
    }
    ?>
</div>

<?php get_footer(); ?>
