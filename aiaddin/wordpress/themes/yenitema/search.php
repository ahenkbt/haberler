<?php get_header(); ?>
<?php  ?>
<div style="max-width:1180px;margin:32px auto;padding:0 20px">
  <div style="margin-bottom:24px">
    <h1 style="font-family:var(--fh);font-size:1.5rem;color:var(--dk)">
      "<?php echo esc_html(get_search_query()); ?>" için arama sonuçları
    </h1>
    <?php get_search_form(); ?>
  </div>
  <?php if (have_posts()): ?>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
    <?php while (have_posts()): the_post();
      $cats = get_the_category(); $cat = !empty($cats)?$cats[0]:null;
      $thumb = tukav_get_thumb(get_the_ID(),'medium'); ?>
    <a href="<?php the_permalink(); ?>" style="background:#fff;border:1px solid var(--sin);text-decoration:none;display:block;transition:all .2s" onmouseover="this.style.borderColor='var(--cr3)'" onmouseout="this.style.borderColor='var(--sin)'">
      <?php if($thumb): ?>
      <div style="aspect-ratio:16/9;overflow:hidden;background:var(--dk2)"><img src="<?php echo $thumb; ?>" alt="<?php echo esc_attr(get_the_title()); ?>" style="width:100%;height:100%;object-fit:cover"></div>
      <?php endif; ?>
      <div style="padding:12px 14px">
        <?php if($cat): ?><div style="font-family:var(--fh);font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--cr);margin-bottom:4px"><?php echo esc_html($cat->name); ?></div><?php endif; ?>
        <div style="font-family:var(--fh);font-size:13.5px;font-weight:600;color:var(--dk);line-height:1.3;margin-bottom:6px"><?php the_title(); ?></div>
        <div style="font-size:11.5px;color:var(--yz2);line-height:1.6"><?php echo wp_trim_words(get_the_excerpt(),16,'...'); ?></div>
      </div>
    </a>
    <?php endwhile; ?>
  </div>
  <div style="margin-top:32px;display:flex;justify-content:center"><?php the_posts_pagination(); ?></div>
  <?php else: ?>
  <div style="text-align:center;padding:60px 0">
    <div style="font-size:3rem;margin-bottom:16px">🔍</div>
    <h2 style="font-family:var(--fh);color:var(--dk)">Sonuç bulunamadı</h2>
    <p style="color:var(--yz3)">Farklı anahtar kelimeler deneyin.</p>
  </div>
  <?php endif; ?>
</div>
<?php get_footer(); ?>
