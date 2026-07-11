<?php
/* VKV Sidebar */
$cats_sb = get_categories(array('orderby'=>'count','order'=>'DESC','number'=>15,'hide_empty'=>true));
$recent  = new WP_Query(array('post_type'=>'post','post_status'=>'publish','posts_per_page'=>5));
?>
<style>
.sb-k{border:1px solid var(--sin);margin-bottom:16px;overflow:hidden}
.sb-h{background:var(--cr2);color:#fff;font-family:var(--fh);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:8px 14px;border-left:4px solid var(--altin)}
.sb-c{padding:10px}
</style>
<!-- Kategoriler -->
<?php if (!empty($cats_sb)): ?>
<div class="sb-k">
  <div class="sb-h"><i class="fa fa-folder"></i> Kategoriler</div>
  <div class="sb-c">
    <?php foreach ($cats_sb as $cat_sb): ?>
    <a href="<?php echo esc_url(get_category_link($cat_sb->term_id)); ?>" style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--sin);text-decoration:none;font-size:12px;color:var(--yz2);transition:color .18s" onmouseover="this.style.color='var(--cr)'" onmouseout="this.style.color='var(--yz2)'">
      <span><?php echo esc_html($cat_sb->name); ?></span>
      <span style="font-size:10px;background:var(--bg);border:1px solid var(--sin);padding:1px 7px;color:var(--cr);font-family:var(--fh);font-weight:700"><?php echo $cat_sb->count; ?></span>
    </a>
    <?php endforeach; ?>
  </div>
</div>
<?php endif; ?>
<!-- Son Yazılar -->
<div class="sb-k">
  <div class="sb-h"><i class="fa fa-newspaper"></i> Son Yazılar</div>
  <div style="padding:4px 0">
    <?php while ($recent->have_posts()): $recent->the_post();
      $sb_t = tukav_get_thumb(get_the_ID(),'thumbnail'); ?>
    <a href="<?php the_permalink(); ?>" style="display:flex;gap:9px;padding:7px 10px;border-bottom:1px solid var(--bg);text-decoration:none;align-items:center" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
      <?php if ($sb_t): ?>
      <div style="width:48px;height:48px;overflow:hidden;flex-shrink:0;background:var(--dk2)"><img src="<?php echo $sb_t; ?>" alt="" style="width:100%;height:100%;object-fit:cover"></div>
      <?php endif; ?>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:600;color:var(--dk);line-height:1.35;margin-bottom:2px"><?php echo esc_html(wp_trim_words(get_the_title(), 7)); ?></div>
        <div style="font-size:9.5px;color:var(--cr);font-weight:700"><?php echo get_the_date('d M Y'); ?></div>
      </div>
    </a>
    <?php endwhile; wp_reset_postdata(); ?>
  </div>
</div>
<!-- Bağış -->
<div style="background:var(--cr2);padding:18px 16px">
  <div style="font-family:var(--fh);font-size:.95rem;font-weight:700;color:#fff;margin-bottom:8px">Vatana Destek Ol</div>
  <p style="font-size:11.5px;color:rgba(255,255,255,.55);margin-bottom:14px;line-height:1.6">Kahramanlarımız için çalışmalarımıza katkıda bulunun.</p>
  <a href="<?php echo esc_url(get_theme_mod('vkv_bagis_url','https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07')); ?>" target="_blank" rel="noopener" style="display:block;background:var(--altin);color:var(--dk);font-family:var(--fh);font-size:12px;font-weight:700;text-align:center;padding:10px;text-decoration:none;text-transform:uppercase;letter-spacing:.8px">🛡️ Destek Ol</a>
</div>
