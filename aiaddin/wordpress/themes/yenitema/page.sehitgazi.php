<?php
/**
 * Template Name: Şehit Gazi
 * Template Post Type: page
 */
 get_header();  

?>
<div style="font-family:'Open Sans',system-ui,sans-serif;color:#1e293b">
<div class="tp-hero">
  <div class="tp-hero-w">
    <div>
      <div class="tp-eyebrow"><i class="fa fa-shield-alt" style="color:var(--altin2)"></i> TUKAV</div>
      <h1 class="tp-h1">Şehit & Gazi <em>Vatanın Kahramanları</em></h1>
      <p class="tp-hdesc">Türk milletinin bağımsızlığı ve vatanı için canını feda eden şehitlerimizi ve kahraman gazilerimizi saygı ve minnetle anıyoruz.</p>
    </div>
    <div class="tp-hero-stats">
      <div class="tp-stat"><div class="tp-stat-n">Şehitler</div><div class="tp-stat-l">Aziz Ruhlar</div></div>
      <div class="tp-stat"><div class="tp-stat-n">Gaziler</div><div class="tp-stat-l">Kahramanlar</div></div>
      <div class="tp-stat"><div class="tp-stat-n">Anıtlar</div><div class="tp-stat-l">Türkiye Geneli</div></div>
      <div class="tp-stat"><div class="tp-stat-n">Destanlar</div><div class="tp-stat-l">Edebiyat</div></div>
    </div>
  </div>
</div>
<div class="tp-bc"><div class="tp-bc-w"><a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a><span class="sep">›</span><span>Şehit & Gazi</span></div></div>
<div class="tp-sec">
  <div class="tp-sec-w">
    <div class="tp-sec-hd"><div class="tp-badge kirmizi">⚔️ Şehit Gazi</div><h2 class="tp-sec-title">Şehit & Gazi</h2><p class="tp-sec-sub">Türk milletinin bağımsızlığı ve vatanı için canını feda eden şehitlerimizi ve kahraman gazilerimizi saygı ve minnetle anıyoruz.</p></div>
    <div class="tp-grid tp-g4">
      <a href="<?php echo esc_url(home_url('/sehitgazi')); ?>" class="tp-card">
        <div class="tp-card-top kirmizi"></div>
        <div class="tp-card-body"><div class="tp-card-icon kirmizi"><i class="fa fa-star"></i></div><div class="tp-card-title">Şehitlerimiz</div><div class="tp-card-desc">Vatanı için canını veren yüce şehitlerimizin aziz hatıraları.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Şehitlik</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/sehitgazi')); ?>" class="tp-card">
        <div class="tp-card-top altin"></div>
        <div class="tp-card-body"><div class="tp-card-icon altin"><i class="fa fa-shield-alt"></i></div><div class="tp-card-title">Gazilerimiz</div><div class="tp-card-desc">Türk milleti için savaşan kahraman gazilerimizin destanı.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Gazi</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/sehitgazi')); ?>" class="tp-card">
        <div class="tp-card-top tq"></div>
        <div class="tp-card-body"><div class="tp-card-icon tq"><i class="fa fa-monument"></i></div><div class="tp-card-title">Anıtlar ve Mezarlıklar</div><div class="tp-card-desc">Türkiye genelindeki şehit anıtları ve tarihi şehitlikler rehberi.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Anıtlar</span><span class="tp-card-arrow">→</span></div>
      </a>
      <a href="<?php echo esc_url(home_url('/kahramanlar')); ?>" class="tp-card">
        <div class="tp-card-top yesil"></div>
        <div class="tp-card-body"><div class="tp-card-icon yesil"><i class="fa fa-feather-alt"></i></div><div class="tp-card-title">Destanlar ve Şiirler</div><div class="tp-card-desc">Şehit ve gazilerimiz için yazılmış destanlar, marşlar ve şiirler.</div></div>
        <div class="tp-card-foot"><span class="tp-card-lbl">Edebiyat</span><span class="tp-card-arrow">→</span></div>
      </a>
    </div>
  </div>
</div>
<div class="tp-quote-band">
  <div class="tp-quote-band-w">
    <div class="tp-q-text">"Şehit kanıyla yazılan satırlar hiçbir zaman silinmez."</div>
    <div class="tp-q-src">— TUKAV</div>
  </div>
</div>
<?php if(!empty($posts)): ?>
<div class="tp-blog-sec"><div class="tp-blog-sec-w">
  <div class="tp-blog-hd"><div class="tp-blog-hd-bar"></div><h3>Şehit Gazi Yazıları</h3></div>
  <?php  ?>
</div></div>
<?php endif; ?>
<div class="tp-cta"><div class="tp-cta-w">
  <div class="tp-cta-txt"><h3>Kültürel Mirasa Destek Olun</h3><p>TUKAV'ın çalışmalarına katkıda bulunun.</p></div>
  <div class="tp-cta-btns"><a href="<?php echo esc_url(home_url('/bagis')); ?>" class="tp-btn beyaz">💝 Bağış Yapın</a><a href="<?php echo esc_url(home_url('/faaliyetler')); ?>" class="tp-btn saydam">Faaliyetlerimiz</a></div>
</div></div>
</div>
<?php get_footer(); ?>
