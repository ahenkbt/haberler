<?php
/**
 * Ahenk Haber v3 — Trendler Sayfası (Birportal trendler.php uyumlu)
 * URL: /trendler
 */
get_header();
$trend_q = new WP_Query(array(
    'post_type'      => array('haber','post'),
    'posts_per_page' => 20,
    'orderby'        => 'comment_count',
    'order'          => 'DESC',
    'no_found_rows'  => true,
));
?>
<main id="main-content" class="site-main">
  <div class="container" style="padding-top:24px;padding-bottom:40px">
    <div class="icerik-sidebar-sarici">
      <div class="ana-icerik">
        <div class="blok-header" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:var(--grad-header);border-radius:8px 8px 0 0;margin-bottom:0">
          <h1 style="margin:0;font-size:18px;font-weight:900;color:#fff"><i class="fa fa-fire"></i> Trend Haberler</h1>
        </div>
        <div style="background:#fff;border-radius:0 0 8px 8px;padding:0 0 16px;box-shadow:0 2px 8px rgba(0,0,0,.07)">
          <?php $ti=1; while ($trend_q->have_posts()) : $trend_q->the_post();
            $kats = get_the_terms(get_the_ID(),'haber-kategorisi');
            if (!$kats||is_wp_error($kats)) $kats = get_the_category();
            $kat  = !empty($kats)?$kats[0]:null;
            $renk = $kat ? ahenk_kategori_rengi($kat->term_id) : '#CC0000';
            $pct  = max(20, 100 - ($ti-1)*4);
          ?>
          <div class="trend-item" style="padding:14px 20px">
            <span class="trend-sayi" style="color:var(--renk-ana);font-size:24px;font-weight:900;width:32px;flex-shrink:0"><?php echo $ti; ?></span>
            <div class="trend-icerik" style="flex:1;min-width:0">
              <div class="trend-progress" style="height:3px;background:#f0f0f0;border-radius:2px;margin-bottom:7px;overflow:hidden">
                <div class="trend-progress-bar" style="width:<?php echo $pct; ?>%;height:100%;background-image:var(--grad-header);border-radius:2px"></div>
              </div>
              <?php if($kat):?><span style="font-size:10px;font-weight:700;color:<?php echo esc_attr($renk);?>;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px"><?php echo esc_html($kat->name);?></span><?php endif;?>
              <a href="<?php the_permalink(); ?>" style="font-size:14px;font-weight:800;color:#1a1a1a;text-decoration:none;display:block;line-height:1.45"><?php the_title(); ?></a>
              <span style="font-size:11px;color:#aaa;margin-top:5px;display:block"><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(null,'full'); ?> &nbsp;|&nbsp; <i class="fa fa-comment"></i> <?php echo (int)get_comments_number(); ?> yorum</span>
            </div>
            <div style="width:80px;height:58px;border-radius:5px;overflow:hidden;flex-shrink:0;background:#eee">
              <img src="<?php echo esc_url(ahenk_thumb_url(null,'ahenk-kucuk')); ?>" alt="<?php echo esc_attr(get_the_title()); ?>" style="width:100%;height:100%;object-fit:cover" loading="lazy">
            </div>
          </div>
          <?php $ti++; endwhile; wp_reset_postdata(); ?>
        </div>
      </div>
      <aside class="sidebar" role="complementary"><?php get_sidebar(); ?></aside>
    </div>
  </div>
</main>
<?php get_footer(); ?>
