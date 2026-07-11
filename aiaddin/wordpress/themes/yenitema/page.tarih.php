<?php
/**
 * Template Name: Tarih
 * Template Post Type: page
 */
 get_header();  

?>
<div style="font-family:'Open Sans',system-ui,sans-serif;color:#1e293b">
<div class="tp-hero">
  <div class="tp-hero-w">
    <div>
      <div class="tp-eyebrow"><i class="fa fa-book" style="color:var(--altin2)"></i> TUKAV</div>
      <h1 class="tp-h1">Tarih <em>Türk Tarihinin Derinlikleri</em></h1>
      <p class="tp-hdesc">Askeri tarih, tarihi olaylar, Türk büyükleri, makaleler ve daha fazlası. Türk tarihini akademik ve popüler düzeyde inceleyin.</p>
    </div>
    <div class="tp-hero-stats">
      <div class="tp-stat"><div class="tp-stat-n">Türk Tarihi</div><div class="tp-stat-l">Binlerce Yıl</div></div>
      <div class="tp-stat"><div class="tp-stat-n">Askeri Tarih</div><div class="tp-stat-l">Destanlar</div></div>
      <div class="tp-stat"><div class="tp-stat-n">Makaleler</div><div class="tp-stat-l">Akademik</div></div>
      <div class="tp-stat"><div class="tp-stat-n">Videolar</div><div class="tp-stat-l">Arşiv</div></div>
    </div>
  </div>
</div>
<div class="tp-bc"><div class="tp-bc-w"><a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a><span class="sep">›</span><span>Tarih</span></div></div>
<div class="tp-subnav"><div class="tp-subnav-w">
  <a href="<?php echo esc_url(home_url('/turk-tarihi')); ?>" class="aktif"><i class="fa fa-book-open"></i> Türk Tarihi</a>
  <a href="<?php echo esc_url(home_url('/askeri-tarih')); ?>"><i class="fa fa-shield-alt"></i> Askeri Tarih</a>
  <a href="<?php echo esc_url(home_url('/tarihi-olaylar')); ?>"><i class="fa fa-calendar-alt"></i> Tarihi Olaylar</a>
  <a href="<?php echo esc_url(home_url('/turk-buyukleri')); ?>"><i class="fa fa-star"></i> Türk Büyükleri</a>
  <a href="<?php echo esc_url(home_url('/kahramanlar')); ?>"><i class="fa fa-award"></i> Kahramanlar</a>
  <a href="<?php echo esc_url(home_url('/turk-kulturu')); ?>"><i class="fa fa-university"></i> Türk Kültürü</a>
  <a href="<?php echo esc_url(home_url('/makaleler')); ?>"><i class="fa fa-feather-alt"></i> Makaleler</a>
  <a href="<?php echo esc_url(home_url('/populer-tarih')); ?>"><i class="fa fa-fire"></i> Popüler Tarih</a>
  <a href="<?php echo esc_url(home_url('/videolar')); ?>"><i class="fa fa-film"></i> Videolar</a>
</div></div>
<div class="tp-sec">
  <div class="tp-sec-w">
    <div class="tp-sec-hd"><div class="tp-badge altin">📚 Tarih</div><h2 class="tp-sec-title">Tarih</h2><p class="tp-sec-sub">Askeri tarih, tarihi olaylar, Türk büyükleri, makaleler ve daha fazlası. Türk tarihini akademik ve popüler düzeyde inceleyin.</p></div>
    <div class="tp-grid tp-g4">
      <a href="<?php echo esc_url(home_url('/turk-tarihi')); ?>" class="tp-card">
        <div class="tp-card-top altin"></div>
        <div class="tp-card-body"><div class="tp-card-icon altin"><i class="fa fa-book-open"></i></div><div class="tp-card-title">Türk Tarihi</div><div class="tp-card-desc">Orta Asya'dan Anadolu'ya, Osmanlı'dan Cumhuriyet'e köklü Türk medeniyeti tarihi.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Tarih</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/askeri-tarih')); ?>" class="tp-card">
        <div class="tp-card-top kirmizi"></div>
        <div class="tp-card-body"><div class="tp-card-icon kirmizi"><i class="fa fa-shield-alt"></i></div><div class="tp-card-title">Askeri Tarih</div><div class="tp-card-desc">Büyük savaşlar, stratejiler ve Türk ordusunun yüzyıllık kahramanlık destanı.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Askeri</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/tarihi-olaylar')); ?>" class="tp-card">
        <div class="tp-card-top tq"></div>
        <div class="tp-card-body"><div class="tp-card-icon tq"><i class="fa fa-calendar-alt"></i></div><div class="tp-card-title">Tarihi Olaylar</div><div class="tp-card-desc">Türk tarihinin kaderini belirleyen büyük dönüm noktaları ve olaylar.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Olaylar</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/turk-buyukleri')); ?>" class="tp-card">
        <div class="tp-card-top yesil"></div>
        <div class="tp-card-body"><div class="tp-card-icon yesil"><i class="fa fa-crown"></i></div><div class="tp-card-title">Türk Büyükleri</div><div class="tp-card-desc">Mete Han'dan Atatürk'e Türk tarihini şekillendiren büyük liderler.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Liderler</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/kahramanlar')); ?>" class="tp-card">
        <div class="tp-card-top mor"></div>
        <div class="tp-card-body"><div class="tp-card-icon mor"><i class="fa fa-award"></i></div><div class="tp-card-title">Kahramanlar</div><div class="tp-card-desc">Vatan için canını feda eden kahraman Türk askerlerinin destanları.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Kahramanlık</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/makaleler')); ?>" class="tp-card">
        <div class="tp-card-top altin"></div>
        <div class="tp-card-body"><div class="tp-card-icon altin"><i class="fa fa-feather-alt"></i></div><div class="tp-card-title">Makaleler</div><div class="tp-card-desc">Akademisyenler tarafından kaleme alınan Türk tarihi araştırma makaleleri.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Akademik</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/populer-tarih')); ?>" class="tp-card">
        <div class="tp-card-top tq"></div>
        <div class="tp-card-body"><div class="tp-card-icon tq"><i class="fa fa-fire"></i></div><div class="tp-card-title">Popüler Tarih</div><div class="tp-card-desc">Herkesin anlayabileceği sade ve akıcı tarih yazımı.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Popüler</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/videolar')); ?>" class="tp-card">
        <div class="tp-card-top kirmizi"></div>
        <div class="tp-card-body"><div class="tp-card-icon kirmizi"><i class="fa fa-film"></i></div><div class="tp-card-title">Videolar</div><div class="tp-card-desc">Belgeseller, röportajlar ve arşiv görüntüleri.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Video</span><span class="tp-card-arrow">→</span></div>
      </a>
    </div>
  </div>
</div>
<div class="tp-quote-band">
  <div class="tp-quote-band-w">
    <div class="tp-q-text">"Tarih yazmak, tarih yapmak kadar mühimdir."</div>
    <div class="tp-q-src">— Mustafa Kemal Atatürk</div>
  </div>
</div>
<?php if(!empty($posts)): ?>
<div class="tp-blog-sec"><div class="tp-blog-sec-w">
  <div class="tp-blog-hd"><div class="tp-blog-hd-bar"></div><h3>Tarih Yazıları</h3></div>
  <?php  ?>
</div></div>
<?php endif; ?>
<div class="tp-cta"><div class="tp-cta-w">
  <div class="tp-cta-txt"><h3>Kültürel Mirasa Destek Olun</h3><p>Vakfımızın çalışmalarına katkıda bulunun.</p></div>
  <div class="tp-cta-btns"><a href="<?php echo esc_url(home_url('/bagis')); ?>" class="tp-btn beyaz">💝 Bağış Yapın</a><a href="<?php echo esc_url(home_url('/faaliyetler')); ?>" class="tp-btn saydam">Faaliyetlerimiz</a></div>
</div></div>
</div>
<?php get_footer(); ?>
