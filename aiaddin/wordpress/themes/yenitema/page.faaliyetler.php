<?php
/**
 * Template Name: Faaliyetler
 * Template Post Type: page
 */
 get_header();  

?>
<div style="font-family:'Open Sans',system-ui,sans-serif;color:#1e293b">
<div class="tp-hero">
  <div class="tp-hero-w">
    <div>
      <div class="tp-eyebrow"><i class="fa fa-calendar-check" style="color:var(--altin2)"></i> TUKAV</div>
      <h1 class="tp-h1">Faaliyetler <em>Etkinlikler ve Projeler</em></h1>
      <p class="tp-hdesc">Vakfımızın Türk kültürünü araştırma, tanıtma ve yaşatma amacıyla yürüttüğü tüm faaliyetler, etkinlikler ve projeler.</p>
    </div>
    <div class="tp-hero-stats">
      <div class="tp-stat"><div class="tp-stat-n">Panel</div><div class="tp-stat-l">Sempozyum</div></div>
      <div class="tp-stat"><div class="tp-stat-n">Sergi</div><div class="tp-stat-l">Etkinlik</div></div>
      <div class="tp-stat"><div class="tp-stat-n">Yayın</div><div class="tp-stat-l">Araştırma</div></div>
      <div class="tp-stat"><div class="tp-stat-n">2025</div><div class="tp-stat-l">Aktif</div></div>
    </div>
  </div>
</div>
<div class="tp-bc"><div class="tp-bc-w"><a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a><span class="sep">›</span><span>Faaliyetler</span></div></div>
<div class="tp-sec">
  <div class="tp-sec-w">
    <div class="tp-sec-hd"><div class="tp-badge tq">📅 Faaliyetler</div><h2 class="tp-sec-title">Faaliyetler</h2><p class="tp-sec-sub">Vakfımızın Türk kültürünü araştırma, tanıtma ve yaşatma amacıyla yürüttüğü tüm faaliyetler, etkinlikler ve projeler.</p></div>
    <div class="tp-grid tp-g4">
      <a href="<?php echo esc_url(home_url('/faaliyetler')); ?>" class="tp-card">
        <div class="tp-card-top tq"></div>
        <div class="tp-card-body"><div class="tp-card-icon tq"><i class="fa fa-calendar-check"></i></div><div class="tp-card-title">Kültürel Etkinlikler</div><div class="tp-card-desc">Panel, sempozyum, sergi ve kültürel buluşmalar. Türk kültürünü canlı tutuyoruz.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Etkinlik</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/eserlerimiz')); ?>" class="tp-card">
        <div class="tp-card-top altin"></div>
        <div class="tp-card-body"><div class="tp-card-icon altin"><i class="fa fa-book"></i></div><div class="tp-card-title">Araştırma ve Yayın</div><div class="tp-card-desc">Türk kültürü ve tarihine dair akademik araştırmalar ve bilimsel yayınlar.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Araştırma</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/faaliyetler')); ?>" class="tp-card">
        <div class="tp-card-top yesil"></div>
        <div class="tp-card-body"><div class="tp-card-icon yesil"><i class="fa fa-chalkboard-teacher"></i></div><div class="tp-card-title">Eğitim Programları</div><div class="tp-card-desc">Gençlere yönelik kültürel eğitim, burs ve bilinçlendirme programları.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Eğitim</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/vakif')); ?>" class="tp-card">
        <div class="tp-card-top mor"></div>
        <div class="tp-card-body"><div class="tp-card-icon mor"><i class="fa fa-handshake"></i></div><div class="tp-card-title">İşbirlikleri</div><div class="tp-card-desc">Üniversiteler, kurumlar ve STK'larla kurulan kültürel işbirlikleri.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Ortaklık</span><span class="tp-card-arrow">→</span></div>
      </a>
    </div>
  </div>
</div>
<div class="tp-quote-band">
  <div class="tp-quote-band-w">
    <div class="tp-q-text">"Kültür, bir milletin ruhudur. O ruh yaşadıkça millet yaşar."</div>
    <div class="tp-q-src">— Vakıf</div>
  </div>
</div>
<?php if(!empty($posts)): ?>
<div class="tp-blog-sec"><div class="tp-blog-sec-w">
  <div class="tp-blog-hd"><div class="tp-blog-hd-bar"></div><h3>Faaliyetler Yazıları</h3></div>
  <?php  ?>
</div></div>
<?php endif; ?>
<div class="tp-cta"><div class="tp-cta-w">
  <div class="tp-cta-txt"><h3>Kültürel Mirasa Destek Olun</h3><p>Vakfımızın çalışmalarına katkıda bulunun.</p></div>
  <div class="tp-cta-btns"><a href="<?php echo esc_url(home_url('/bagis')); ?>" class="tp-btn beyaz">💝 Bağış Yapın</a><a href="<?php echo esc_url(home_url('/bagis')); ?>" class="tp-btn saydam">Bağış Yapın</a></div>
</div></div>
</div>
<?php get_footer(); ?>
