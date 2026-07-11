<?php
/**
 * Template Name: Genel Başkan
 * Template Post Type: page
 */
 get_header();  

?>
<div style="font-family:'Open Sans',system-ui,sans-serif;color:#1e293b">
<div class="tp-hero">
  <div class="tp-hero-w">
    <div>
      <div class="tp-eyebrow"><i class="fa fa-user-tie" style="color:var(--altin2)"></i> TUKAV</div>
      <h1 class="tp-h1">Genel Başkan <em>Gazi İsmail Temiz</em></h1>
      <p class="tp-hdesc">Türk Kültürünü Araştırma ve Tanıtma Vakfı Genel Başkanı Gazi İsmail Temiz'in mesajları, konuşmaları ve faaliyetleri.</p>
    </div>
    <div class="tp-hero-stats">
      <div class="tp-stat"><div class="tp-stat-n">Gazi</div><div class="tp-stat-l">Unvan</div></div>
      <div class="tp-stat"><div class="tp-stat-n">1998</div><div class="tp-stat-l">Kuruluş</div></div>
      <div class="tp-stat"><div class="tp-stat-n">TUKAV</div><div class="tp-stat-l">Vakıf</div></div>
      <div class="tp-stat"><div class="tp-stat-n">Ankara</div><div class="tp-stat-l">Merkez</div></div>
    </div>
  </div>
</div>
<div class="tp-bc"><div class="tp-bc-w"><a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a><span class="sep">›</span><span>Genel Başkan</span></div></div>
<div class="tp-sec">
  <div class="tp-sec-w">
    <div class="tp-sec-hd"><div class="tp-badge tq">👤 Genel Başkan</div><h2 class="tp-sec-title">Genel Başkan</h2><p class="tp-sec-sub">Türk Kültürünü Araştırma ve Tanıtma Vakfı Genel Başkanı Gazi İsmail Temiz'in mesajları, konuşmaları ve faaliyetleri.</p></div>
    <div class="tp-grid tp-g4">
      <a href="<?php echo esc_url(home_url('/genel-baskan')); ?>" class="tp-card">
        <div class="tp-card-top altin"></div>
        <div class="tp-card-body"><div class="tp-card-icon altin"><i class="fa fa-microphone"></i></div><div class="tp-card-title">Konuşmalar</div><div class="tp-card-desc">Genel Başkan'ın panel, sempozyum ve etkinliklerdeki konuşma metinleri.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Konuşmalar</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/genel-baskan')); ?>" class="tp-card">
        <div class="tp-card-top tq"></div>
        <div class="tp-card-body"><div class="tp-card-icon tq"><i class="fa fa-newspaper"></i></div><div class="tp-card-title">Basın Açıklamaları</div><div class="tp-card-desc">Vakıf adına yapılan resmi basın açıklamaları ve kamuoyu duyuruları.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Basın</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/genel-baskan')); ?>" class="tp-card">
        <div class="tp-card-top yesil"></div>
        <div class="tp-card-body"><div class="tp-card-icon yesil"><i class="fa fa-award"></i></div><div class="tp-card-title">Ödüller ve Unvanlar</div><div class="tp-card-desc">Genel Başkan'ın kültürel çalışmalarına ilişkin ödüller ve tanınırlıklar.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Ödül</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/video-galerisi')); ?>" class="tp-card">
        <div class="tp-card-top mor"></div>
        <div class="tp-card-body"><div class="tp-card-icon mor"><i class="fa fa-images"></i></div><div class="tp-card-title">Fotoğraf Galerisi</div><div class="tp-card-desc">Genel Başkan'ın katıldığı etkinlik ve toplantılardan fotoğraflar.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Galeri</span><span class="tp-card-arrow">→</span></div>
      </a>
    </div>
  </div>
</div>
<div class="tp-quote-band">
  <div class="tp-quote-band-w">
    <div class="tp-q-text">"Türk kültürünü araştırmak ve tanıtmak en büyük görevimizdir."</div>
    <div class="tp-q-src">— Gazi İsmail Temiz, Vakfımız Genel Başkanı</div>
  </div>
</div>
<?php if(!empty($posts)): ?>
<div class="tp-blog-sec"><div class="tp-blog-sec-w">
  <div class="tp-blog-hd"><div class="tp-blog-hd-bar"></div><h3>Genel Başkan Yazıları</h3></div>
  <?php  ?>
</div></div>
<?php endif; ?>
<div class="tp-cta"><div class="tp-cta-w">
  <div class="tp-cta-txt"><h3>Kültürel Mirasa Destek Olun</h3><p>Vakfımızın çalışmalarına katkıda bulunun.</p></div>
  <div class="tp-cta-btns"><a href="<?php echo esc_url(home_url('/bagis')); ?>" class="tp-btn beyaz">💝 Bağış Yapın</a><a href="<?php echo esc_url(home_url('/vakif')); ?>" class="tp-btn saydam">Vakfı Tanıyın</a></div>
</div></div>
</div>
<?php get_footer(); ?>
