<?php
/**
 * Template Name: Askeri Tarih
 * Template Post Type: page
 */
 get_header();  

?>
<div style="font-family:'Open Sans',system-ui,sans-serif;color:#1e293b">
<div class="tp-hero">
  <div class="tp-hero-w">
    <div>
      <div class="tp-eyebrow"><i class="fa fa-shield-alt" style="color:var(--altin2)"></i> Tarih</div>
      <h1 class="tp-h1">Askeri Tarih <em>Savaşlar ve Stratejiler</em></h1>
      <p class="tp-hdesc">Türk ordusunun yüzyıllık tarihi, büyük savaşlar ve askeri stratejiler.</p>
    </div>
  </div>
</div>
<div class="tp-bc"><div class="tp-bc-w"><a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a><span class="sep">›</span><a href="<?php echo esc_url(home_url('/tarih')); ?>">Tarih</a><span class="sep">›</span><span>Askeri Tarih</span></div></div>
<div class="tp-subnav"><div class="tp-subnav-w">
  <a href="<?php echo esc_url(home_url('/tarih')); ?>"><i class="fa fa-arrow-left"></i> Tarih</a>
  <a href="<?php echo esc_url(home_url('/turk-tarihi')); ?>">Türk Tarihi</a>
  <a href="<?php echo esc_url(home_url('/askeri-tarih')); ?>">Askeri Tarih</a>
  <a href="<?php echo esc_url(home_url('/tarihi-olaylar')); ?>">Tarihi Olaylar</a>
  <a href="<?php echo esc_url(home_url('/turk-buyukleri')); ?>">Türk Büyükleri</a>
  <a href="<?php echo esc_url(home_url('/kahramanlar')); ?>">Kahramanlar</a>
  <a href="<?php echo esc_url(home_url('/makaleler')); ?>">Makaleler</a>
</div></div>
<?php if(!empty($posts)): ?>
<div class="tp-blog-sec"><div class="tp-blog-sec-w">
  <div class="tp-blog-hd"><div class="tp-blog-hd-bar"></div><h3>Askeri Tarih Yazilari</h3></div>
  <?php  ?>
</div></div>
<?php else: ?>
<div class="tp-sec"><div class="tp-sec-w">
  <div class="tp-sec-hd"><div class="tp-badge tq">Yazilar</div><h2 class="tp-sec-title">Askeri Tarih</h2><p class="tp-sec-sub">Türk ordusunun yüzyıllık tarihi, büyük savaşlar ve askeri stratejiler.</p></div>
  <div style="background:#fff;border:1px solid var(--sin2);padding:40px;text-align:center;color:var(--yz3)"><i class="fa fa-newspaper" style="font-size:2rem;display:block;margin-bottom:10px"></i>Bu kategoride henuz yazi eklenmemis.<br><small>WordPress Yonetim Paneli → Yazilar → Yeni Ekle</small></div>
</div></div>
<?php endif; ?>
<div class="tp-quote-band"><div class="tp-quote-band-w"><div class="tp-q-text">&quot;Ordu milletin aynasıdır.&quot;</div><div class="tp-q-src">— Vakıf</div></div></div>
<div class="tp-cta"><div class="tp-cta-w"><div class="tp-cta-txt"><h3>Tarih Arastirmalarina Destek Olun</h3></div><div class="tp-cta-btns"><a href="<?php echo esc_url(home_url('/bagis')); ?>" class="tp-btn beyaz">Bagis</a><a href="<?php echo esc_url(home_url('/tarih')); ?>" class="tp-btn saydam">Tarih</a></div></div></div>
</div>
<?php get_footer(); ?>