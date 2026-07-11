<?php get_header(); ?>
<?php  ?>
<style>
.vkv-archive{max-width:1180px;margin:0 auto;padding:32px 20px}
.vkv-arc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.vkv-arc-card{background:#fff;border:1px solid var(--sin);text-decoration:none;display:block;transition:all .2s}
.vkv-arc-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(139,26,26,.1);border-color:var(--cr3)}
.vkv-arc-img{aspect-ratio:16/9;overflow:hidden;background:var(--dk2)}
.vkv-arc-img img{width:100%;height:100%;object-fit:cover;transition:transform .3s}
.vkv-arc-card:hover .vkv-arc-img img{transform:scale(1.05)}
.vkv-arc-body{padding:14px 16px 12px}
.vkv-arc-cat{font-family:var(--fh);font-size:9.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--cr);margin-bottom:5px}
.vkv-arc-title{font-family:var(--fh);font-size:14px;font-weight:600;color:var(--dk);line-height:1.3;margin-bottom:6px}
.vkv-arc-card:hover .vkv-arc-title{color:var(--cr)}
.vkv-arc-exc{font-size:12px;color:var(--yz2);line-height:1.6}
.vkv-arc-foot{padding:8px 16px 12px;border-top:1px solid #fef2f2;font-family:var(--fh);font-size:10px;font-weight:700;letter-spacing:.8px;color:var(--cr);text-transform:uppercase}
@media(max-width:860px){.vkv-arc-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:540px){.vkv-arc-grid{grid-template-columns:1fr}}
</style>
<div class="vkv-archive">
  <div style="margin-bottom:24px">
    <h1 style="font-family:var(--fh);font-size:1.6rem;color:var(--dk);margin-bottom:4px">
      <?php if(is_category()): echo esc_html(single_cat_title('',false));
      elseif(is_tag()): echo esc_html(single_tag_title('',false));
      elseif(is_search()): echo '"'.esc_html(get_search_query()).'" için arama sonuçları';
      else: bloginfo('name'); endif; ?>
    </h1>
    <div style="width:40px;height:3px;background:var(--cr)"></div>
  </div>
  <?php if(have_posts()): ?>
  <div class="vkv-arc-grid">
    <?php while(have_posts()): the_post();
      $cats  = get_the_category();
      $cat   = !empty($cats) ? $cats[0] : null;
      $thumb = tukav_get_thumb(get_the_ID(),'medium'); ?>
    <a href="<?php the_permalink(); ?>" class="vkv-arc-card">
      <div class="vkv-arc-img">
        <?php if($thumb): ?><img src="<?php echo $thumb; ?>" alt="<?php echo esc_attr(get_the_title()); ?>" loading="lazy"><?php endif; ?>
      </div>
      <div class="vkv-arc-body">
        <?php if($cat): ?><div class="vkv-arc-cat"><?php echo esc_html($cat->name); ?></div><?php endif; ?>
        <div class="vkv-arc-title"><?php the_title(); ?></div>
        <div class="vkv-arc-exc"><?php echo wp_trim_words(get_the_excerpt(),16,'...'); ?></div>
      </div>
      <div class="vkv-arc-foot">DEVAMI →</div>
    </a>
    <?php endwhile; ?>
  </div>
  <div style="margin-top:32px;display:flex;justify-content:center;gap:8px">
    <?php the_posts_pagination(array('mid_size'=>2,'prev_text'=>'← Önceki','next_text'=>'Sonraki →')); ?>
  </div>
  <?php else: ?>
  <div style="text-align:center;padding:60px 0">
    <div style="font-size:3rem;margin-bottom:16px">🔍</div>
    <h2 style="font-family:var(--fh);color:var(--dk)">Sonuç bulunamadı</h2>
    <p style="color:var(--yz3)">Aradığınız içerik bulunamadı.</p>
  </div>
  <?php endif; ?>
</div>
<?php get_footer(); ?>
