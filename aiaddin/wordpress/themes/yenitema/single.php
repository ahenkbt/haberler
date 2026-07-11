<?php get_header(); ?>
<?php  ?>
<style>
.sng-nav{background:#fff;border-bottom:1px solid var(--sin);padding:10px 0;position:sticky;top:64px;z-index:90}
.sng-nav-w{max-width:1200px;margin:0 auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.sng-breadcrumb{display:flex;align-items:center;gap:6px;font-family:var(--fh);font-size:11px;color:var(--yz3)}
.sng-breadcrumb a{color:var(--cr);text-decoration:none}.sng-breadcrumb a:hover{text-decoration:underline}
.sng-breadcrumb .sep{color:var(--yz3)}.sng-breadcrumb .cur{color:var(--dk);font-weight:600}
.sng-geri{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;background:var(--bg);border:1.5px solid var(--sin);color:var(--cr2);font-family:var(--fh);font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;text-decoration:none;transition:all .18s;cursor:pointer}
.sng-geri:hover{background:var(--cr);border-color:var(--cr);color:#fff}
.sng-wrap{max-width:1200px;margin:0 auto;padding:0 24px 56px}
.sng-eyebrow{font-family:var(--fh);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--cr);margin:32px 0 10px}
.sng-title{font-family:var(--fh);font-size:clamp(1.7rem,4vw,2.6rem);font-weight:700;color:var(--dk);line-height:1.15;margin-bottom:10px}
.sng-subtitle{font-size:14px;font-style:italic;color:var(--yz2);line-height:1.7;margin-bottom:16px;max-width:700px}
.sng-divider{height:3px;background:linear-gradient(to right,var(--cr),transparent);border:none;margin:0 0 28px}
.sng-body{display:flex;gap:36px;align-items:flex-start}
.sng-makale{flex:1;min-width:0}
.sng-content{font-size:14.5px;line-height:1.95;color:var(--yz2)}
.sng-content p{margin-bottom:18px}
.sng-content h2{font-family:var(--fh);font-size:1.3rem;font-weight:700;color:var(--dk);margin:28px 0 10px;border-left:3px solid var(--cr);padding-left:12px}
.sng-content h3{font-family:var(--fh);font-size:1.1rem;color:var(--dk);margin:20px 0 8px}
.sng-content a{color:var(--cr);text-decoration:underline}
.sng-content blockquote{border-left:3px solid var(--altin);background:var(--bg);padding:16px 20px;margin:20px 0;font-style:italic;color:var(--yz);font-size:13.5px;line-height:1.8}
.sng-content img{max-width:100%;border:1px solid var(--sin);margin:14px 0}
.sng-infobox{width:230px;flex-shrink:0;background:var(--dk);border-top:4px solid var(--altin);position:sticky;top:110px}
.sng-ib-photo{width:100%;aspect-ratio:4/3;overflow:hidden;background:var(--dk2)}
.sng-ib-photo img{width:100%;height:100%;object-fit:cover}
.sng-ib-photo-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem;opacity:.2}
.sng-ib-inner{padding:14px}
.sng-ib-heading{font-family:var(--fh);font-size:13px;font-weight:700;color:#fff;margin-bottom:4px;line-height:1.3}
.sng-ib-sub{font-size:10.5px;color:rgba(255,255,255,.4);line-height:1.5;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,.07);padding-bottom:10px}
.sng-ib-row{display:flex;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.sng-ib-row:last-child{border-bottom:none}
.sng-ib-key{font-family:var(--fh);font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--altin2);flex-shrink:0;width:60px;padding-top:2px}
.sng-ib-val{font-size:11px;color:rgba(255,255,255,.6);line-height:1.5}
.sng-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:24px;padding-top:16px;border-top:1px solid var(--sin)}
.sng-tag{display:inline-block;background:var(--bg);border:1px solid var(--sin);color:var(--cr);font-family:var(--fh);font-size:10px;font-weight:700;padding:3px 10px;text-decoration:none;letter-spacing:.3px;text-transform:uppercase}
.sng-tag:hover{background:var(--cr);color:#fff;border-color:var(--cr)}
.sng-share{display:flex;align-items:center;flex-wrap:wrap;gap:7px;padding:16px 0;border-top:1.5px solid var(--sin);margin-top:16px}
.sng-share-label{font-family:var(--fh);font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--yz3);width:100%}
.sng-sh-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:1.5px solid var(--sin);background:#fff;color:var(--yz2);font-family:var(--fh);font-size:11px;font-weight:600;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:all .2s;letter-spacing:.3px}
.sng-sh-btn:hover{color:#fff}
.sng-sh-tw:hover{background:#000;border-color:#000}.sng-sh-fb:hover{background:#1877f2;border-color:#1877f2}
.sng-sh-wa:hover{background:#25d366;border-color:#25d366}.sng-sh-li:hover{background:#0a66c2;border-color:#0a66c2}
.sng-sh-cp:hover{background:var(--cr);border-color:var(--cr)}
.sng-prev-next{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:28px}
.sng-pn-link{display:block;background:#fff;border:1px solid var(--sin);padding:14px 16px;text-decoration:none;transition:all .18s}
.sng-pn-link:hover{border-color:var(--cr);box-shadow:0 4px 12px rgba(139,26,26,.08)}
.sng-pn-dir{font-family:var(--fh);font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--yz3);margin-bottom:5px}
.sng-pn-t{font-family:var(--fh);font-size:12.5px;font-weight:600;color:var(--dk)}
.sng-pn-link.next{text-align:right}
@media(max-width:860px){.sng-body{flex-direction:column}.sng-infobox{width:100%;position:static}}
</style>
<?php
if (have_posts()) :
  the_post();
  $cats    = get_the_category();
  $cat     = !empty($cats) ? $cats[0] : null;
  $thumb   = tukav_get_thumb(get_the_ID(),'large');
  $excerpt = get_the_excerpt() ?: wp_trim_words(get_the_content(), 30, '…');
  $_sh_url  = get_permalink();
  $_sh_enc  = rawurlencode($_sh_url);
  $_sh_tenc = rawurlencode(get_the_title());
?>
<!-- NAVİGASYON BAR -->
<div class="sng-nav">
  <div class="sng-nav-w">
    <div class="sng-breadcrumb">
      <a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a>
      <span class="sep">›</span>
      <a href="<?php echo esc_url(home_url('/haberler')); ?>">Haberler</a>
      <?php if ($cat): ?>
      <span class="sep">›</span>
      <a href="<?php echo esc_url(get_category_link($cat->term_id)); ?>"><?php echo esc_html($cat->name); ?></a>
      <?php endif; ?>
      <span class="sep">›</span>
      <span class="cur"><?php echo esc_html(wp_trim_words(get_the_title(), 6)); ?></span>
    </div>
    <a href="javascript:history.back()" class="sng-geri">← Geri Dön</a>
  </div>
</div>
<!-- DETAY SAYFA -->
<div class="sng-wrap">
  <div class="sng-eyebrow">— <?php echo $cat ? esc_html(strtoupper($cat->name)) : 'HABER'; ?></div>
  <h1 class="sng-title"><?php the_title(); ?></h1>
  <p class="sng-subtitle"><?php echo esc_html($excerpt); ?></p>
  <hr class="sng-divider">
  <div class="sng-body">
    <div class="sng-makale">
      <div class="sng-content"><?php the_content(); ?></div>
      <?php $tags = get_the_tags(); if ($tags): ?>
      <div class="sng-tags">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--yz3);margin-right:4px;font-family:var(--fh)">Etiketler:</span>
        <?php foreach ($tags as $tag): ?>
        <a href="<?php echo esc_url(get_tag_link($tag->term_id)); ?>" class="sng-tag"><?php echo esc_html($tag->name); ?></a>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>
      <div class="sng-share">
        <span class="sng-share-label"><i class="fa fa-share-alt"></i> Bu yazıyı paylaş</span>
        <a class="sng-sh-btn sng-sh-tw" href="https://twitter.com/intent/tweet?url=<?php echo $_sh_enc; ?>&text=<?php echo $_sh_tenc; ?>" target="_blank" rel="noopener"><i class="fa-brands fa-x-twitter"></i> Twitter</a>
        <a class="sng-sh-btn sng-sh-fb" href="https://www.facebook.com/sharer/sharer.php?u=<?php echo $_sh_enc; ?>" target="_blank" rel="noopener"><i class="fa-brands fa-facebook-f"></i> Facebook</a>
        <a class="sng-sh-btn sng-sh-wa" href="https://wa.me/?text=<?php echo $_sh_tenc; ?>%20<?php echo $_sh_enc; ?>" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
        <a class="sng-sh-btn sng-sh-li" href="https://linkedin.com/sharing/share-offsite/?url=<?php echo $_sh_enc; ?>" target="_blank" rel="noopener"><i class="fa-brands fa-linkedin-in"></i> LinkedIn</a>
        <button class="sng-sh-btn sng-sh-cp" onclick="sngCopy(this,'<?php echo esc_js($_sh_url); ?>')"><i class="fa fa-link"></i> Kopyala</button>
      </div>
      <div class="sng-prev-next">
        <?php $prev = get_previous_post(); if ($prev): ?>
        <a href="<?php echo esc_url(get_permalink($prev->ID)); ?>" class="sng-pn-link prev" style="border-left:3px solid var(--cr)">
          <div class="sng-pn-dir"><i class="fa fa-arrow-left"></i> Önceki Yazı</div>
          <div class="sng-pn-t"><?php echo esc_html(wp_trim_words($prev->post_title, 8)); ?></div>
        </a>
        <?php else: ?><div></div><?php endif; ?>
        <?php $next = get_next_post(); if ($next): ?>
        <a href="<?php echo esc_url(get_permalink($next->ID)); ?>" class="sng-pn-link next" style="border-right:3px solid var(--cr)">
          <div class="sng-pn-dir">Sonraki Yazı <i class="fa fa-arrow-right"></i></div>
          <div class="sng-pn-t"><?php echo esc_html(wp_trim_words($next->post_title, 8)); ?></div>
        </a>
        <?php endif; ?>
      </div>
    </div><!-- /.sng-makale -->
    <!-- INFOBOX -->
    <aside class="sng-infobox">
      <div class="sng-ib-photo">
        <?php if ($thumb): ?><img src="<?php echo esc_url($thumb); ?>" alt="<?php echo esc_attr(get_the_title()); ?>">
        <?php else: ?><div class="sng-ib-photo-ph">📰</div><?php endif; ?>
      </div>
      <div class="sng-ib-inner">
        <div class="sng-ib-heading"><?php echo esc_html(get_the_title()); ?></div>
        <div class="sng-ib-sub"><?php echo esc_html(wp_trim_words($excerpt, 18, '…')); ?></div>
        <?php if ($cat): ?>
        <div class="sng-ib-row"><div class="sng-ib-key">Kategori</div><div class="sng-ib-val"><?php echo esc_html($cat->name); ?></div></div>
        <?php endif; ?>
        <div class="sng-ib-row"><div class="sng-ib-key">Tarih</div><div class="sng-ib-val"><?php echo get_the_date('d M Y'); ?></div></div>
        <div class="sng-ib-row"><div class="sng-ib-key">Yazar</div><div class="sng-ib-val"><?php the_author(); ?></div></div>
        <div class="sng-ib-row"><div class="sng-ib-key">Kaynak</div><div class="sng-ib-val"><?php echo esc_html(get_theme_mod('vkv_logo_name', get_bloginfo('name'))); ?></div></div>
        <?php $read_time = max(1, round(str_word_count(strip_tags(get_the_content())) / 200)); ?>
        <div class="sng-ib-row"><div class="sng-ib-key">Okuma</div><div class="sng-ib-val"><?php echo $read_time; ?> dk</div></div>
      </div>
      <?php
      $_sng_site    = get_option('vkv_site_tipi', 'vakif');
      $_sng_is_dsv  = ($_sng_site === 'dsv');
      $_sng_b_url   = $_sng_is_dsv ? home_url('/dsv-bagis') : get_theme_mod('vkv_bagis_url','https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07');
      $_sng_b_txt   = $_sng_is_dsv ? '💙 Bağış Yapın' : '🛡️ Destek Ol';
      $_sng_sb_h    = $_sng_is_dsv ? 'Sağlık İçin Destek Olun' : 'Vatana Destek Ol';
      $_sng_sb_p    = $_sng_is_dsv
          ? 'WHO programlarını ve sağlık projelerini desteklemek için bağış yapın.'
          : 'Kahramanlarımız için çalışmalarımızı sürdürmemize katkıda bulunun.';
      $_sng_b_target = $_sng_is_dsv ? '' : 'target="_blank" rel="noopener"';
      ?>
      <div style="background:var(--cr2);padding:16px 14px">
        <div style="font-family:var(--fh);font-size:.85rem;font-weight:700;color:#fff;margin-bottom:6px"><?php echo esc_html($_sng_sb_h); ?></div>
        <p style="font-size:10.5px;color:rgba(255,255,255,.5);margin-bottom:12px;line-height:1.6"><?php echo esc_html($_sng_sb_p); ?></p>
        <a href="<?php echo esc_url($_sng_b_url); ?>" <?php echo $_sng_b_target; ?> style="display:block;background:var(--altin);color:var(--dk);font-family:var(--fh);font-size:11px;font-weight:700;text-align:center;padding:9px;text-decoration:none;text-transform:uppercase;letter-spacing:.8px"><?php echo esc_html($_sng_b_txt); ?></a>
      </div>
      <?php if ($cat):
        $related = new WP_Query(array('category__in'=>array($cat->term_id),'post__not_in'=>array(get_the_ID()),'posts_per_page'=>4,'ignore_sticky_posts'=>1));
        if ($related->have_posts()):
      ?>
      <div style="padding:14px;border-top:1px solid rgba(255,255,255,.06)">
        <div style="font-family:var(--fh);font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--altin2);margin-bottom:10px">İlgili Yazılar</div>
        <?php while ($related->have_posts()): $related->the_post();
          $rc_t = tukav_get_thumb(get_the_ID(),'thumbnail'); ?>
        <a href="<?php the_permalink(); ?>" style="display:flex;gap:9px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);text-decoration:none;align-items:center">
          <?php if ($rc_t): ?><div style="width:40px;height:40px;overflow:hidden;flex-shrink:0;background:var(--dk2)"><img src="<?php echo $rc_t; ?>" alt="" style="width:100%;height:100%;object-fit:cover"></div><?php endif; ?>
          <div style="flex:1;min-width:0;font-size:10.5px;font-weight:600;color:rgba(255,255,255,.6);line-height:1.35"><?php echo esc_html(wp_trim_words(get_the_title(), 7)); ?></div>
        </a>
        <?php endwhile; wp_reset_postdata(); ?>
      </div>
      <?php endif; endif; ?>
    </aside>
  </div>
</div>
<?php endif; ?>
<script>
function sngCopy(btn, url) {
    navigator.clipboard.writeText(url).then(function(){
        var orig = btn.innerHTML;
        btn.innerHTML = '<i class="fa fa-check"></i> Kopyalandı';
        btn.style.background = '#15803d';btn.style.borderColor = '#15803d';btn.style.color = '#fff';
        setTimeout(function(){btn.innerHTML=orig;btn.style.background='';btn.style.borderColor='';btn.style.color='';},2500);
    });
}
</script>
<?php get_footer(); ?>
