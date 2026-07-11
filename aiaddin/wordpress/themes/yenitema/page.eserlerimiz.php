<?php
/**
 * Template Name: Eserlerimiz
 * Template Post Type: page
 */
 get_header();  

?>
<div style="font-family:'Open Sans',system-ui,sans-serif;color:#1e293b">
<div class="tp-hero">
  <div class="tp-hero-w">
    <div>
      <div class="tp-eyebrow"><i class="fa fa-book" style="color:var(--altin2)"></i> Yayınlar</div>
      <h1 class="tp-h1">Eserlerimiz <em>Yayınlar ve Araştırmalar</em></h1>
      <p class="tp-hdesc">Türk kültürü, tarihi ve medeniyetine dair Vakfımız tarafından hazırlanan kitaplar, dergiler, akademik araştırmalar ve dijital yayınlar.</p>
    </div>
    <div class="tp-hero-stats">
      <div class="tp-stat"><div class="tp-stat-n">100+</div><div class="tp-stat-l">Yayın</div></div>
      <div class="tp-stat"><div class="tp-stat-n">27+</div><div class="tp-stat-l">Yıl</div></div>
      <div class="tp-stat"><div class="tp-stat-n">Kitap</div><div class="tp-stat-l">Dergi & Makale</div></div>
      <div class="tp-stat"><div class="tp-stat-n">Dijital</div><div class="tp-stat-l">Arşiv</div></div>
    </div>
  </div>
</div>
<div class="tp-bc"><div class="tp-bc-w"><a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a><span class="sep">›</span><a href="<?php echo esc_url(home_url('/vakif')); ?>">Vakıf</a><span class="sep">›</span><span>Eserlerimiz</span></div></div>
<div class="tp-sec">
  <div class="tp-sec-w">
    <div class="tp-sec-hd"><div class="tp-badge altin">📚 Yayın Kategorileri</div><h2 class="tp-sec-title">Yayın ve Eserlerimiz</h2><p class="tp-sec-sub">1998'den bu yana Türk kültürü alanında üretilen akademik ve kültürel eserler.</p></div>
    <div class="tp-grid tp-g4">
      <a href="<?php echo esc_url(home_url('/eserlerimiz')); ?>" class="tp-card"><div class="tp-card-top altin"></div><div class="tp-card-body"><div class="tp-card-icon altin"><i class="fa fa-book"></i></div><div class="tp-card-title">Kitaplar</div><div class="tp-card-desc">Türk tarihi, kültürü ve medeniyetine dair akademik ve popüler kitap serisi.</div></div><div class="tp-card-foot"><span class="tp-card-lbl">Yayın</span><span class="tp-card-arrow">→</span></div></a>
      <a href="<?php echo esc_url(home_url('/eserlerimiz')); ?>" class="tp-card"><div class="tp-card-top tq"></div><div class="tp-card-body"><div class="tp-card-icon tq"><i class="fa fa-newspaper"></i></div><div class="tp-card-title">Dergiler</div><div class="tp-card-desc">Türk kültürü araştırma dergileri ve periyodik yayınlar.</div></div><div class="tp-card-foot"><span class="tp-card-lbl">Dergi</span><span class="tp-card-arrow">→</span></div></a>
      <a href="<?php echo esc_url(home_url('/makaleler')); ?>" class="tp-card"><div class="tp-card-top yesil"></div><div class="tp-card-body"><div class="tp-card-icon yesil"><i class="fa fa-feather-alt"></i></div><div class="tp-card-title">Makaleler</div><div class="tp-card-desc">Akademisyenler tarafından kaleme alınan araştırma makaleleri.</div></div><div class="tp-card-foot"><span class="tp-card-lbl">Akademik</span><span class="tp-card-arrow">→</span></div></a>
      <a href="<?php echo esc_url(home_url('/video-galerisi')); ?>" class="tp-card"><div class="tp-card-top mor"></div><div class="tp-card-body"><div class="tp-card-icon mor"><i class="fa fa-film"></i></div><div class="tp-card-title">Dijital Arşiv</div><div class="tp-card-desc">Video belgeseller, dijital yayınlar ve çevrimiçi arşiv koleksiyonu.</div></div><div class="tp-card-foot"><span class="tp-card-lbl">Dijital</span><span class="tp-card-arrow">→</span></div></a>
    </div>
  </div>
</div>
<div class="tp-quote-band"><div class="tp-quote-band-w"><div class="tp-q-text">"Kültürel miras, korunmadığı takdirde yok olur."</div><div class="tp-q-src">— Vakıf</div></div></div>
<?php if(!empty($posts)): ?>
<div class="tp-blog-sec"><div class="tp-blog-sec-w">
  <div class="tp-blog-hd"><div class="tp-blog-hd-bar"></div><h3>Son Yayınlar</h3></div>
  <?php  ?>
</div></div>
<?php endif; ?>
<div class="tp-cta"><div class="tp-cta-w"><div class="tp-cta-txt"><h3>Araştırmalarımıza Destek Olun</h3><p>Vakfımız yayın ve araştırma faaliyetlerine katkıda bulunun.</p></div><div class="tp-cta-btns"><a href="<?php echo esc_url(home_url('/bagis')); ?>" class="tp-btn beyaz">💝 Bağış Yapın</a><a href="<?php echo esc_url(home_url('/vakif')); ?>" class="tp-btn saydam">Vakıf</a></div></div></div>
</div>
<?php get_footer(); ?>
