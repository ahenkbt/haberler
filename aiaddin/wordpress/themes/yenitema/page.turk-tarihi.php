<?php
/**
 * Template Name: Türk Tarihi
 * Template Post Type: page
 */
tukav_page_init();
get_header();
tukav_page_css_override();
echo tukav_css();
$posts = tukav_blog_by_cat('turk-tarihi', 9);
?>
<div class="pw">
<div class="ph">
  <div class="ph-w">
    <div class="ph-ew">📚 TUKAV — Tarih</div>
    <h1 class="ph-h1">Türk Tarihi <em>Binlerce Yıllık Miras</em></h1>
    <p class="ph-desc">Orta Asya bozkırlarından Anadolu'ya, Osmanlı'dan Cumhuriyet'e Türk medeniyetinin kapsamlı tarihi.</p>
  </div>
</div>
<div class="pbc"><div class="pbc-w"><a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a><span class="sep">›</span><a href="<?php echo esc_url(home_url('/tarih')); ?>">Tarih</a><span class="sep">›</span><span>Türk Tarihi</span></div></div>
<?php if (!empty($posts)): ?>
<div class="sec">
  <div class="sec-w">
    <div class="sec-hd"><div class="badge gld">📰 Yazılar</div><div><div class="sec-title">Türk Tarihi</div><div class="sec-sub">Orta Asya bozkırlarından Anadolu'ya, Osmanlı'dan Cumhuriyet'e Türk medeniyetinin kapsamlı tarihi.</div></div></div>
    <?php echo tukav_render_blog_grid($posts, 'Türk Tarihi'); ?>
    <div style="text-align:center;margin-top:24px">
      <a href="<?php echo esc_url(get_category_link(get_category_by_slug('turk-tarihi') ? get_category_by_slug('turk-tarihi')->term_id : 0)); ?>" class="pbtn" style="background:var(--r);color:#fff;border-radius:4px;padding:12px 24px;font-size:12px;font-weight:700">Tüm Yazıları Gör →</a>
    </div>
  </div>
</div>
<?php else: ?>
<div class="sec"><div class="sec-w"><p style="color:var(--t3);padding:40px 0;text-align:center">Bu kategoride henüz içerik bulunmamaktadır. Yakında yeni yazılar eklenecektir.</p></div></div>
<?php endif; ?>
<div class="qband"><div class="qband-w"><div class="qband-text">"Türk'ün tarihi insanlığın tarihidir."</div><div class="qband-src">— TUKAV</div></div></div>
<div class="ctaband"><div class="ctaband-w"><div class="ctaband-text"><h3>Tarih Araştırmalarına Destek Olun</h3><p>TUKAV'ın çalışmalarına katkıda bulunun.</p></div><div class="ctabtns"><a href="<?php echo esc_url(home_url('/bagis')); ?>" class="pbtn wh">💝 Bağış Yapın</a><a href="<?php echo esc_url(home_url('/tarih')); ?>" class="pbtn ol">← Tarih</a></div></div></div>
</div>
<?php get_footer(); ?>
