<?php
/**
 * Template Name: Hukuk ve Savunuculuk
 * Template Post Type: page
 */
get_header();
vkv_breadcrumb();
// VKV Sayfa İçerik Sistemi:
// 1. VKV Admin Paneli'nden içerik girilmişse göster
// 2. WordPress/Elementor içeriği varsa göster  
// 3. Hiçbiri yoksa Shopify HTML'ini göster
if (have_posts()) { the_post(); }
$vkv_slug = 'hukuk-savunuculuk';
$vkv_custom = function_exists('vkv_get_custom_page_content') ? vkv_get_custom_page_content($vkv_slug) : '';
$vkv_wp_content = get_the_content();
$vkv_has_custom = !empty(trim($vkv_custom));
$vkv_has_wp     = !empty(trim(strip_tags($vkv_wp_content)));
if ($vkv_has_custom):
    // VKV Panel içeriği
    ?>
    <div style="max-width:100%;width:100%;padding:0;margin:0">
    <?php echo apply_filters('the_content', $vkv_custom); ?>
    </div>
    <?php
elseif ($vkv_has_wp):
    // WordPress / Elementor içeriği
    ?>
    <div style="max-width:100%;width:100%;padding:0;margin:0">
    <?php the_content(); ?>
    </div>
    <?php
else:
    // Shopify'dan dönüştürülmüş orijinal içerik
?>
<script>
(function(){
  var s=['.page-hero','.page-content','.page-title','.page__heading','.page__header','.page-header','h1.title','.template-page > h1'];
  s.forEach(function(sel){document.querySelectorAll(sel).forEach(function(el){el.style.display='none';});});
  var c=document.getElementById('content');
  if(c){c.style.cssText='max-width:100%!important;padding:0!important;width:100%!important;margin:0!important';}
})();
</script>
<style>
#content,#MainContent,main#content{max-width:100%!important;padding:0!important;width:100%!important;margin:0!important}
.page-hero,.page-content,.page__heading,.page__header,.page-header,.page-title{display:none!important}
</style>
<style>
:root{--r:#8C1A2E;--rd:#6E1222;--rl:rgba(140,26,46,.09);--g:#C9A84C;--gl:rgba(201,168,76,.1);--dk:#0D1117;--dk2:#1C2330;--wh:#FAFAF8;--gr:#F5F2ED;--bd:#E4E0D8;--t1:#1A1F28;--t2:#4A5568;--t3:#718096;--fn:'Nunito Sans',system-ui,sans-serif;--fs:'Merriweather',Georgia,serif;--w:1440px}
*,*::before,*::after{box-sizing:border-box}
a{text-decoration:none;color:inherit}img{max-width:100%;display:block}ul{list-style:none;padding:0;margin:0}
.ph{width:100%;background:linear-gradient(150deg,var(--dk) 0%,var(--dk2) 55%,#18060a 100%);padding:72px 40px 60px;position:relative;overflow:hidden}
.ph::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 70% at 80% 50%,rgba(140,26,46,.22) 0%,transparent 65%)}
.ph-w{max-width:var(--w);margin:0 auto;display:grid;grid-template-columns:1.3fr 1fr;gap:60px;align-items:center;position:relative;z-index:1}
.ph-ew{display:inline-flex;align-items:center;gap:7px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:var(--g);font-size:9.5px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:18px}
.ph-h1{font-family:var(--fs);font-size:clamp(1.8rem,3vw,2.8rem);font-weight:700;color:#fff;line-height:1.15;margin-bottom:14px}
.ph-h1 em{color:var(--g);font-style:italic;display:block}
.ph-desc{font-size:13.5px;color:rgba(255,255,255,.5);line-height:1.85;max-width:500px}
.ph-desc strong{color:rgba(255,255,255,.75)}
.ph-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.07);border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,.07)}
.ph-si{background:rgba(255,255,255,.04);padding:20px 22px;transition:background .2s}
.ph-si:hover{background:rgba(255,255,255,.07)}
.ph-sn{font-size:2rem;font-weight:800;color:var(--g);line-height:1;margin-bottom:4px}
.ph-sl{font-size:9px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:rgba(255,255,255,.3)}
.pnav{background:var(--dk2);width:100%}.pnav-in{max-width:var(--w);margin:0 auto;display:flex;overflow-x:auto;scrollbar-width:none}
.pnav-in::-webkit-scrollbar{display:none}
.pnav a{display:flex;align-items:center;gap:7px;padding:13px 20px;font-size:10.5px;font-weight:600;color:rgba(255,255,255,.4);text-decoration:none;border-right:1px solid rgba(255,255,255,.06);transition:all .2s;white-space:nowrap;font-family:var(--fn)}
.pnav a:hover,.pnav a.on{color:var(--g);background:rgba(201,168,76,.06)}
.pbc{max-width:var(--w);margin:0 auto;padding:13px 40px;display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t3);border-bottom:1px solid var(--bd)}
.pbc a{color:var(--r);text-decoration:none;font-weight:600}
.sec{width:100%;padding:48px 40px}.sec:nth-child(even){background:var(--gr)}
.sec-w{max-width:var(--w);margin:0 auto}
.sec-hd{margin-bottom:26px;padding-bottom:16px;border-bottom:2px solid var(--bd)}
.badge{display:inline-flex;align-items:center;gap:5px;font-size:8.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:3px 9px;border-radius:20px;margin-bottom:9px;border:1px solid}
.badge.r{background:var(--rl);color:var(--r);border-color:rgba(140,26,46,.2)}.badge.g{background:var(--gl);color:#7a5a00;border-color:rgba(201,168,76,.3)}.badge.b{background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE}.badge.gr{background:#F0FDF4;color:#15803D;border-color:#BBF7D0}.badge.p{background:#F5F3FF;color:#6D28D9;border-color:#DDD6FE}
.sec-title{font-family:var(--fs);font-size:1.5rem;font-weight:700;color:var(--t1);margin-bottom:6px}
.sec-sub{font-size:13px;color:var(--t3);line-height:1.7;max-width:680px}
.grid{display:grid;gap:14px}.g4{grid-template-columns:repeat(4,1fr)}.g3{grid-template-columns:repeat(3,1fr)}.g2{grid-template-columns:repeat(2,1fr)}
.card{background:#fff;border:1px solid var(--bd);border-radius:8px;overflow:hidden;display:flex;flex-direction:column;transition:all .22s}
.card:hover{box-shadow:0 8px 32px rgba(0,0,0,.09);transform:translateY(-2px)}
.card-st{height:4px}.card-st.r{background:linear-gradient(90deg,var(--r),#c0392b)}.card-st.g{background:linear-gradient(90deg,#15803D,#22c55e)}.card-st.b{background:linear-gradient(90deg,#1D4ED8,#60a5fa)}.card-st.p{background:linear-gradient(90deg,#6D28D9,#8b5cf6)}.card-st.gold{background:linear-gradient(90deg,var(--g),#e0a030)}.card-st.t{background:linear-gradient(90deg,#0a5c6e,#0e9aa0)}.card-st.dk{background:linear-gradient(90deg,#0f2c5c,#1d4ed8)}
.card-body{padding:22px 22px 16px;flex:1;display:flex;flex-direction:column;gap:10px}
.card-icon{width:52px;height:52px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;margin-bottom:6px}
.card-icon.r{background:var(--rl);color:var(--r)}.card-icon.g{background:#F0FDF4;color:#15803D}.card-icon.b{background:#EFF6FF;color:#1D4ED8}.card-icon.p{background:#F5F3FF;color:#6D28D9}.card-icon.gold{background:var(--gl);color:#7a5a00}.card-icon.t{background:#ECFEFF;color:#0a5c6e}.card-icon.dk{background:#EFF6FF;color:#0f2c5c}
.card-title{font-family:var(--fs);font-size:1rem;font-weight:700;color:var(--t1);line-height:1.3}
.card-desc{font-size:12px;color:var(--t2);line-height:1.75;flex:1}
.card-list{list-style:none;padding:0;margin:6px 0 0;display:flex;flex-direction:column;gap:4px}
.card-list li{font-size:11px;color:var(--t2);display:flex;gap:7px;line-height:1.5}
.card-list li::before{content:"✓";color:var(--r);font-weight:700;flex-shrink:0}
.card-foot{padding:10px 20px;border-top:1px solid var(--bd);background:var(--gr);display:flex;align-items:center;justify-content:space-between}
.card-lbl{font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--t3)}
.card-lnk{font-size:10.5px;font-weight:700;color:var(--r);text-decoration:none}
.ctaband{background:var(--r);padding:40px;width:100%}
.ctaband-w{max-width:var(--w);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap}
.ctaband-text h3{font-family:var(--fs);font-size:1.3rem;font-weight:700;color:#fff;margin-bottom:6px}
.ctaband-text p{font-size:13px;color:rgba(255,255,255,.65);line-height:1.6}
.ctabtns{display:flex;gap:10px;flex-wrap:wrap}
.pbtn{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;border-radius:4px;font-size:12px;font-weight:700;text-decoration:none;font-family:var(--fn);transition:all .2s}
.pbtn.wh{background:#fff;color:var(--r)}.pbtn.wh:hover{background:#f5e8e8}
.pbtn.ol{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.45)}.pbtn.ol:hover{background:rgba(255,255,255,.1)}
.qband{background:linear-gradient(135deg,var(--dk),var(--dk2));border-top:3px solid var(--g);padding:52px 40px;text-align:center;width:100%}
.qband-w{max-width:var(--w);margin:0 auto}
.qband-text{font-family:var(--fs);font-size:clamp(1.2rem,2vw,1.8rem);font-style:italic;color:#fff;max-width:760px;margin:0 auto 14px;line-height:1.5}
.qband-text em{color:var(--g)}
.qband-src{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.35)}
@media(max-width:1200px){.g4{grid-template-columns:repeat(2,1fr)}}
@media(max-width:860px){.g3,.g2{grid-template-columns:repeat(2,1fr)}.ph-w{grid-template-columns:1fr;gap:32px}.sec,.ph,.ctaband,.qband{padding:40px 24px}.pbc{padding:12px 24px}}
@media(max-width:540px){.g4,.g3,.g2{grid-template-columns:1fr}}
.haklar-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.hak-card{background:#fff;border:1px solid var(--bd);border-radius:8px;padding:20px 16px;text-align:center;text-decoration:none;transition:all .22s;display:flex;flex-direction:column;align-items:center;gap:8px}
.hak-card:hover{border-color:var(--r);box-shadow:0 4px 18px rgba(0,0,0,.08);transform:translateY(-2px)}
.hak-icon{width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;background:var(--rl);color:var(--r)}
.hak-title{font-size:11.5px;font-weight:700;color:var(--t1);line-height:1.3}
.hak-desc{font-size:10.5px;color:var(--t3);line-height:1.4}
.hak-link{font-size:10px;font-weight:700;color:var(--r)}
.faq-list{display:flex;flex-direction:column;gap:12px}
.faq-item{background:#fff;border:1px solid var(--bd);border-radius:8px;overflow:hidden}
.faq-q{padding:16px 20px;font-size:13px;font-weight:700;color:var(--t1);cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px}
.faq-q:hover{background:var(--gr)}
.faq-q::after{content:"+";font-size:1.3rem;color:var(--r);flex-shrink:0}
.faq-a{padding:0 20px 16px;font-size:12.5px;color:var(--t2);line-height:1.8}
.pw{font-family:var(--fn);background:var(--wh);color:var(--t1)}
@media(max-width:1100px){.haklar-grid{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="pw">
<div class="ph">
  <div class="ph-w">
    <div>
      <div class="ph-ew">⚖️ Hukuk &amp; Savunuculuk</div>
      <h1 class="ph-h1">Haklarınız İçin<em>Yanınızdayız</em></h1>
      <p class="ph-desc">Şehit yakınları ve gazilerin ulusal ve uluslararası hukuki haklarının korunması için <strong>aktif savunuculuk faaliyetleri, ücretsiz danışmanlık ve 26 ülke haklar rehberi</strong> sunuyoruz.</p>
    </div>
    <div>
      <div class="ph-stats">
        <div class="ph-si"><div class="ph-sn">26</div><div class="ph-sl">Ülke Rehberi</div></div>
        <div class="ph-si"><div class="ph-sn">6</div><div class="ph-sl">Hak Kategorisi</div></div>
        <div class="ph-si"><div class="ph-sn">7/24</div><div class="ph-sl">Danışma Hattı</div></div>
        <div class="ph-si"><div class="ph-sn">0312</div><div class="ph-sl">963 07 95</div></div>
        <div class="ph-si"><div class="ph-sn">Ücretsiz</div><div class="ph-sl">Hukuki Danışmanlık</div></div>
        <div class="ph-si"><div class="ph-sn">⚖️</div><div class="ph-sl">Hukuki Savunuculuk</div></div>
      </div>
    </div>
  </div>
</div>
<div class="pnav"><div class="pnav-in">
  <a href="<?php echo esc_url(home_url('/hukuk-savunuculuk')); ?>" class="on">⚖️ Hukuk &amp; Savunuculuk</a>
  <a href="<?php echo esc_url(home_url('/sehit-gazi-haklari')); ?>">📋 Şehit &amp; Gazi Hakları</a>
  <a href="<?php echo esc_url(home_url('/uluslararasi-sehit-gazi-haklari')); ?>">🌍 Uluslararası Haklar</a>
  <a href="<?php echo esc_url(home_url('/insani-yardim')); ?>">🔴 İnsani Yardım</a>
  <a href="<?php echo esc_url(home_url('/isbirligi')); ?>">📋 Tüm Programlar</a>
  <a href="<?php echo esc_url(home_url('/iletisim')); ?>">📞 Danışma</a>
</div></div>
<div class="pbc"><a href="/">Ana Sayfa</a> › <a href="<?php echo esc_url(home_url('/isbirligi')); ?>">İşbirliği</a> › <span>Hukuk &amp; Savunuculuk</span></div>
<!-- HAKLAR QUICK LINKS -->
<div class="sec">
  <div class="sec-w">
    <div class="sec-hd">
      <div class="badge p">⚡ Hızlı Erişim</div>
      <div class="sec-title">Hak Kategorileri</div>
      <div class="sec-sub">Şehit ailesi ve gazilere yönelik temel hak alanlarına hızla ulaşın.</div>
    </div>
    <div class="haklar-grid">
      <a href="<?php echo esc_url(home_url('/sehit-gazi-haklari')); ?>" class="hak-card"><div class="hak-icon"><i class="fa fa-money"></i></div><div class="hak-title">Maaş &amp; Tazminat</div><div class="hak-desc">Şehit ve gazi maaşları, tazminat hakları</div><div class="hak-link">Detay →</div></a>
      <a href="<?php echo esc_url(home_url('/sehit-gazi-haklari')); ?>" class="hak-card"><div class="hak-icon"><i class="fa fa-home"></i></div><div class="hak-title">Konut Hakları</div><div class="hak-desc">TOKİ ve konut destekleri</div><div class="hak-link">Detay →</div></a>
      <a href="<?php echo esc_url(home_url('/sehit-gazi-haklari')); ?>" class="hak-card"><div class="hak-icon"><i class="fa fa-heartbeat"></i></div><div class="hak-title">Sağlık Hakları</div><div class="hak-desc">SGK ve ücretsiz sağlık hizmetleri</div><div class="hak-link">Detay →</div></a>
      <a href="<?php echo esc_url(home_url('/sehit-gazi-haklari')); ?>" class="hak-card"><div class="hak-icon"><i class="fa fa-graduation-cap"></i></div><div class="hak-title">Eğitim Hakları</div><div class="hak-desc">KYK ve burs öncelikleri</div><div class="hak-link">Detay →</div></a>
      <a href="<?php echo esc_url(home_url('/uluslararasi-sehit-gazi-haklari')); ?>" class="hak-card"><div class="hak-icon"><i class="fa fa-globe"></i></div><div class="hak-title">Uluslararası Haklar</div><div class="hak-desc">26 ülke karşılaştırmalı rehber</div><div class="hak-link">Detay →</div></a>
      <a href="<?php echo esc_url(home_url('/sosyal-hizmetler')); ?>" class="hak-card"><div class="hak-icon"><i class="fa fa-hospital-o"></i></div><div class="hak-title">Sosyal Hizmetler</div><div class="hak-desc">e-Devlet başvuru rehberi</div><div class="hak-link">Detay →</div></a>
      <a href="<?php echo esc_url(home_url('/turkiye-sehit-gazi-dernekleri')); ?>" class="hak-card"><div class="hak-icon"><i class="fa fa-map-marker"></i></div><div class="hak-title">Türkiye Dernekleri</div><div class="hak-desc">401 dernek — il il rehber</div><div class="hak-link">Detay →</div></a>
      <a href="<?php echo esc_url(home_url('/dunya-sehit-gazi-kuruluslari')); ?>" class="hak-card"><div class="hak-icon"><i class="fa fa-building-o"></i></div><div class="hak-title">Dünya Kuruluşları</div><div class="hak-desc">330+ dünya gazi kuruluşu</div><div class="hak-link">Detay →</div></a>
    </div>
  </div>
</div>
<!-- SAVUNUCULUK PROGRAMLARI -->
<div class="sec">
  <div class="sec-w">
    <div class="sec-hd">
      <div class="badge p">⚖️ Savunuculuk Programları</div>
      <div class="sec-title">Nasıl Savunuculuk Yapıyoruz?</div>
      <div class="sec-sub">Ulusal ve uluslararası platformlarda şehit ailesi ve gazi haklarının korunması için çok katmanlı savunuculuk.</div>
    </div>
    <div class="grid g3">
      <div class="card"><div class="card-st p"></div><div class="card-body"><div class="card-icon p"><i class="fa fa-balance-scale"></i></div><div class="card-title">Ulusal Hak Danışmanlığı</div><div class="card-desc">Türkiye'deki şehit ailesi ve gazi haklarının eksiksiz kullanılması için ücretsiz danışmanlık. ASHB, SGK ve ilgili bakanlıklarla koordineli süreç takibi.</div><ul class="card-list"><li>Maaş bağlama başvuru rehberliği</li><li>Tazminat hakkı tespit ve takibi</li><li>Konut başvurusu koordinasyonu</li><li>Ücretsiz hukuki danışmanlık</li></ul></div><div class="card-foot"><span class="card-lbl">0312 963 07 95</span><a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="card-lnk">Danış →</a></div></div>
      <div class="card"><div class="card-st p"></div><div class="card-body"><div class="card-icon p"><i class="fa fa-flag"></i></div><div class="card-title">Uluslararası Haklar Rehberi</div><div class="card-desc">26 ülkedeki gazi ve şehit ailesi haklarının karşılaştırmalı belgesi. En iyi uygulamaların Türk dünyasına aktarılması için savunuculuk.</div><ul class="card-list"><li>26 ülke hukuki çerçeve analizi</li><li>Karşılaştırmalı tablo ve rehber</li><li>Uluslararası iyi uygulama önerileri</li><li>OIC ve OSCE platformlarında lobi</li></ul></div><div class="card-foot"><span class="card-lbl">26 Ülke Rehberi</span><a href="<?php echo esc_url(home_url('/uluslararasi-sehit-gazi-haklari')); ?>" class="card-lnk">Rehber →</a></div></div>
      <div class="card"><div class="card-st b"></div><div class="card-body"><div class="card-icon b"><i class="fa fa-bullhorn"></i></div><div class="card-title">Lobi &amp; Farkındalık Çalışmaları</div><div class="card-desc">TBMM komisyonları, uluslararası parlamentolar ve sivil toplum platformlarında şehit ve gazi haklarının savunuculuğu ve kamuoyu farkındalığı.</div><ul class="card-list"><li>TBMM milletvekili brifingleri</li><li>BM insan hakları mekanizmaları</li><li>Avrupa Parlamentosu lobiciliği</li><li>Medya ve dijital farkındalık</li></ul></div><div class="card-foot"><span class="card-lbl">Lobi Ağı</span><a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="card-lnk">İletişim →</a></div></div>
    </div>
  </div>
</div>
<!-- SSS -->
<div class="sec">
  <div class="sec-w">
    <div class="sec-hd">
      <div class="badge r">❓ Sık Sorulanlar</div>
      <div class="sec-title">Hukuki Danışmanlık SSS</div>
    </div>
    <div class="faq-list">
      <div class="faq-item"><div class="faq-q">Şehit yakını olarak hangi haklara sahibim?</div><div class="faq-a">Şehit eş ve çocukları SGK'dan aylık maaş, sağlık yardımı, KYK burs önceliği, TOKİ konut önceliği ve çeşitli tazminatlardan yararlanma hakkına sahiptir. Detaylı bilgi için Şehit &amp; Gazi Hakları sayfamızı inceleyebilir ya da danışma hattımızı arayabilirsiniz.</div></div>
      <div class="faq-item"><div class="faq-q">Gazi olarak protez hakkından nasıl yararlanabilirim?</div><div class="faq-a">SGK kapsamındaki protez haklarınız için SGK'ya başvurabilirsiniz. SGK kapsam dışı kalan protez ve yardımcı cihazlar için vakfımızın protez destek programından ücretsiz yararlanabilirsiniz. Başvuru için iletişim formunuzu doldurun.</div></div>
      <div class="faq-item"><div class="faq-q">Yurt dışında yaşıyorum, haklarımı nasıl kullanabilirim?</div><div class="faq-a">26 ülkedeki gazi ve şehit ailesi hakları rehberimizi inceleyebilirsiniz. Türkiye'deki haklarınız için e-Devlet üzerinden veya vakfımızın danışmanlık hizmetiyle uzaktan destek alabilirsiniz. Bulunduğunuz ülkedeki Türk konsolosluğu aracılığıyla da işlemlerinizi yürütebilirsiniz.</div></div>
      <div class="faq-item"><div class="faq-q">Vakfınızın danışmanlık hizmetleri ücretli mi?</div><div class="faq-a">Hayır. Şehit ailelerine ve gazilere yönelik tüm danışmanlık hizmetlerimiz tamamen ücretsizdir. Vakfımız 501(c)(3) statüsünde kâr amacı gütmeyen uluslararası bir kuruluştur; yöneticilerimiz gönüllülük esasıyla hizmet vermektedir.</div></div>
    </div>
  </div>
</div>
<div class="ctaband">
  <div class="ctaband-w">
    <div class="ctaband-text"><h3>Ücretsiz Hukuki Danışmanlık</h3><p>7/24 gazi danışma hattı: +90 312 963 07 95 · E-posta: vakif@vatankahramanlari.org</p></div>
    <div class="ctabtns">
      <a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="pbtn wh">📞 Hemen Ara</a>
      <a href="<?php echo esc_url(home_url('/sehit-gazi-haklari')); ?>" class="pbtn ol">📋 Haklar Rehberi</a>
    </div>
  </div>
</div>
</div>
<?php endif; ?>
<?php get_footer(); ?>
