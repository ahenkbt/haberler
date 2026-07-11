<?php
/**
 * Template Name: Atatürk
 * Template Post Type: page
 */
 get_header();  

?>
<div style="font-family:'Open Sans',system-ui,sans-serif;color:#1e293b;background:#f0f9fb">
<!-- HERO -->
<div class="tp-hero">
  <div class="tp-hero-w">
    <div>
      <div class="tp-eyebrow"><i class="fa fa-star" style="color:var(--altin2)"></i> Atatürk Köşesi</div>
      <h1 class="tp-h1">Mustafa Kemal <em>Atatürk</em></h1>
      <p class="tp-hdesc">Türkiye Cumhuriyeti'nin kurucusu, büyük asker ve devlet adamı. Mustafa Kemal Atatürk (1881–1938), çökmekte olan bir imparatorluğu modern, laik ve demokratik bir cumhuriyete dönüştürerek dünya tarihine geçmiştir.</p>
      <blockquote style="border-left:3px solid var(--altin2);padding-left:14px;margin:18px 0;font-style:italic;color:rgba(255,255,255,.75);font-size:13px;font-family:'Georgia',serif">"Yurtta sulh, cihanda sulh." — Mustafa Kemal Atatürk</blockquote>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
        <a href="<?php echo esc_url(home_url('/ataturk-hayati')); ?>" class="tp-btn tq"><i class="fa fa-user"></i> Hayatı</a>
        <a href="<?php echo esc_url(home_url('/ataturk-kronoloji')); ?>" class="tp-btn beyaz"><i class="fa fa-calendar-alt"></i> Kronoloji</a>
        <a href="<?php echo esc_url(home_url('/ataturk-ilkeler')); ?>" class="tp-btn saydam"><i class="fa fa-balance-scale"></i> İlkeleri</a>
        <a href="<?php echo esc_url(home_url('/ataturk-sozleri')); ?>" class="tp-btn saydam"><i class="fa fa-quote-left"></i> Sözleri</a>
      </div>
    </div>
    <div>
      <div class="tp-hero-stats">
        <div class="tp-stat"><div class="tp-stat-n">1881</div><div class="tp-stat-l">Doğum Yılı</div></div>
        <div class="tp-stat"><div class="tp-stat-n">1938</div><div class="tp-stat-l">Vefat Yılı</div></div>
        <div class="tp-stat"><div class="tp-stat-n">15 Yıl</div><div class="tp-stat-l">Cumhurbaşkanlığı</div></div>
        <div class="tp-stat"><div class="tp-stat-n">40+</div><div class="tp-stat-l">İnkılâp</div></div>
      </div>
    </div>
  </div>
</div>
<!-- BREADCRUMB -->
<div class="tp-bc"><div class="tp-bc-w"><a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a><span class="sep">›</span><span>Atatürk</span></div></div>
<!-- ALT MENÜ -->
<div class="tp-subnav"><div class="tp-subnav-w">
  <a href="<?php echo esc_url(home_url('/ataturk')); ?>" class="aktif"><i class="fa fa-star"></i> Genel Bakış</a>
  <a href="<?php echo esc_url(home_url('/ataturk-hayati')); ?>"><i class="fa fa-user"></i> Hayatı</a>
  <a href="<?php echo esc_url(home_url('/ataturk-ilkeler')); ?>"><i class="fa fa-balance-scale"></i> İlkeleri</a>
  <a href="<?php echo esc_url(home_url('/ataturk-kronoloji')); ?>"><i class="fa fa-calendar-alt"></i> Kronoloji</a>
  <a href="<?php echo esc_url(home_url('/ataturk-sozleri')); ?>"><i class="fa fa-quote-left"></i> Sözleri</a>
</div></div>
<!-- KISA BİLGİLER -->
<div class="tp-sec">
  <div class="tp-sec-w">
    <div class="tp-sec-hd"><div class="tp-badge tq">Kısa Bilgiler</div><h2 class="tp-sec-title">Atatürk Hakkında Temel Bilgiler</h2></div>
    <div class="tp-grid tp-g4">
      <div class="tp-stat" style="background:#fff;border:1px solid var(--sin2);padding:20px;text-align:center"><div class="tp-stat-n" style="color:var(--tq)">1881</div><div class="tp-stat-l" style="color:var(--yz3)">Selanik'te Doğdu</div></div>
      <div class="tp-stat" style="background:#fff;border:1px solid var(--sin2);padding:20px;text-align:center"><div class="tp-stat-n" style="color:var(--tq)">1923</div><div class="tp-stat-l" style="color:var(--yz3)">Cumhuriyeti Kurdu</div></div>
      <div class="tp-stat" style="background:#fff;border:1px solid var(--sin2);padding:20px;text-align:center"><div class="tp-stat-n" style="color:var(--tq)">1938</div><div class="tp-stat-l" style="color:var(--yz3)">İstanbul'da Vefat</div></div>
      <div class="tp-stat" style="background:#fff;border:1px solid var(--sin2);padding:20px;text-align:center"><div class="tp-stat-n" style="color:var(--tq)">Gazi</div><div class="tp-stat-l" style="color:var(--yz3)">Ebedi Başkomutan</div></div>
    </div>
  </div>
</div>
<!-- 4 KONU KARTI -->
<div class="tp-sec">
  <div class="tp-sec-w">
    <div class="tp-sec-hd"><div class="tp-badge altin">Atatürk Köşesi</div><h2 class="tp-sec-title">Tüm Konular</h2></div>
    <div class="tp-grid tp-g4">
      <a href="<?php echo esc_url(home_url('/ataturk-hayati')); ?>" class="tp-card">
        <div class="tp-card-top altin"></div>
        <div class="tp-card-body"><div class="tp-card-icon altin"><i class="fa fa-user"></i></div><div class="tp-card-title">Atatürk'ün Hayatı</div><div class="tp-card-desc">1881–1938 yılları arasındaki yaşamı: Selanik'ten Ankara'ya, askeri kariyerinden Cumhuriyet'i kuruşuna.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Biyografi</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/ataturk-ilkeler')); ?>" class="tp-card">
        <div class="tp-card-top tq"></div>
        <div class="tp-card-body"><div class="tp-card-icon tq"><i class="fa fa-balance-scale"></i></div><div class="tp-card-title">İlkeleri ve İnkılapları</div><div class="tp-card-desc">Cumhuriyetçilik, Milliyetçilik, Halkçılık, Devletçilik, Laiklik ve Devrimcilik — Atatürk'ün 6 temel ilkesi.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">6 İlke</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/ataturk-kronoloji')); ?>" class="tp-card">
        <div class="tp-card-top kirmizi"></div>
        <div class="tp-card-body"><div class="tp-card-icon kirmizi"><i class="fa fa-calendar-alt"></i></div><div class="tp-card-title">Kronoloji 1881–1938</div><div class="tp-card-desc">Doğumdan vefatına tüm önemli dönüm noktaları, savaşlar, kararlar ve cumhurbaşkanlığı dönemi.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Tarih Şeridi</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/ataturk-sozleri')); ?>" class="tp-card">
        <div class="tp-card-top yesil"></div>
        <div class="tp-card-body"><div class="tp-card-icon yesil"><i class="fa fa-quote-left"></i></div><div class="tp-card-title">Atatürk'ün Sözleri</div><div class="tp-card-desc">Büyük Önder'in Türk milletine ve tüm insanlığa bıraktığı kalıcı vecizeler ve özdeyişler.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Alıntılar</span><span class="tp-card-arrow">→</span></div>
      </a>
    </div>
  </div>
</div>
<!-- ALINTI -->
<div class="tp-quote-band">
  <div class="tp-quote-band-w">
    <div class="tp-q-text">"Ne mutlu Türküm diyene!"</div>
    <div class="tp-q-src">— Mustafa Kemal Atatürk</div>
  </div>
</div>
<!-- BLOG YAZILARI -->
<?php if(!empty($posts)): ?>
<div class="tp-blog-sec">
  <div class="tp-blog-sec-w">
    <div class="tp-blog-hd"><div class="tp-blog-hd-bar"></div><h3>Atatürk Yazıları</h3></div>
    <?php  ?>
  </div>
</div>
<?php endif; ?>
<!-- CTA -->
<div class="tp-cta"><div class="tp-cta-w">
  <div class="tp-cta-txt"><h3>Kültürel Mirasa Destek Olun</h3><p>Vakfımızın Atatürk araştırma ve tanıtım çalışmalarına katkıda bulunun.</p></div>
  <div class="tp-cta-btns">
    <a href="<?php echo esc_url(home_url('/bagis')); ?>" class="tp-btn beyaz">💝 Bağış Yapın</a>
    <a href="<?php echo esc_url(home_url('/faaliyetler')); ?>" class="tp-btn saydam">Faaliyetlerimiz</a>
  </div>
</div></div>
</div>
<?php get_footer(); ?>
