<?php
/**
 * Template Name: About Us
 * Template Post Type: page
 */
get_header();
vkv_breadcrumb();
// VKV Sayfa İçerik Sistemi:
// 1. VKV Admin Paneli'nden içerik girilmişse göster
// 2. WordPress/Elementor içeriği varsa göster  
// 3. Hiçbiri yoksa Shopify HTML'ini göster
if (have_posts()) { the_post(); }
$vkv_slug = 'about';
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
.ph-facts{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.ph-fact{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:18px 20px}
.ph-fact-num{font-size:2rem;font-weight:800;color:var(--g);line-height:1;margin-bottom:4px}
.ph-fact-lbl{font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.35)}
.timeline{display:flex;flex-direction:column;gap:0;position:relative}
.timeline::before{content:'';position:absolute;left:28px;top:0;bottom:0;width:2px;background:var(--bd)}
.tl-item{display:flex;gap:20px;align-items:flex-start;padding:0 0 32px 0;position:relative}
.tl-dot{width:56px;height:56px;border-radius:50%;background:var(--r);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;position:relative;z-index:1;box-shadow:0 0 0 4px var(--bd)}
.tl-body{padding:8px 0 0;flex:1}
.tl-year{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--r);margin-bottom:4px}
.tl-title{font-family:var(--fs);font-size:1rem;font-weight:700;color:var(--t1);margin-bottom:6px}
.tl-desc{font-size:12px;color:var(--t2);line-height:1.75}
.mission-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start}
.mission-text{font-size:13.5px;color:var(--t2);line-height:1.85}
.mission-text p{margin-bottom:16px}
.mission-quote{background:var(--dk);border-radius:8px;padding:32px;position:relative;overflow:hidden}
.mission-quote::before{content:'"';font-size:8rem;color:rgba(201,168,76,.1);position:absolute;top:-20px;left:16px;font-family:var(--fs);line-height:1}
.mq-text{font-family:var(--fs);font-size:1.1rem;font-style:italic;color:#fff;line-height:1.55;position:relative;z-index:1;margin-bottom:14px}
.mq-text em{color:var(--g)}
.mq-src{font-size:9.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.35)}
.office-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.office-card{background:#fff;border:1px solid var(--bd);border-radius:8px;padding:20px 16px;text-align:center;transition:all .22s}
.office-card:hover{border-color:var(--g);box-shadow:0 4px 18px rgba(0,0,0,.07)}
.office-flag{font-size:2.2rem;margin-bottom:12px}
.office-city{font-size:12px;font-weight:800;color:var(--r);margin-bottom:3px}
.office-name{font-size:10.5px;color:var(--t2);line-height:1.5}
.office-addr{font-size:10px;color:var(--t3);line-height:1.5;margin-top:5px}
.values-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.value-card{background:#fff;border:1px solid var(--bd);border-radius:8px;padding:28px 22px;text-align:center;transition:all .22s;position:relative;overflow:hidden}
.value-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--r),var(--g))}
.value-card:hover{box-shadow:0 6px 24px rgba(0,0,0,.09);transform:translateY(-2px)}
.value-icon{font-size:2rem;margin-bottom:12px}
.value-title{font-family:var(--fs);font-size:.95rem;font-weight:700;color:var(--t1);margin-bottom:8px}
.value-desc{font-size:11.5px;color:var(--t2);line-height:1.7}
.legal-band{background:var(--dk2);padding:32px 40px;width:100%}
.legal-w{max-width:var(--w);margin:0 auto;display:flex;gap:40px;align-items:center;flex-wrap:wrap}
.legal-item{display:flex;align-items:center;gap:12px;flex:1;min-width:200px}
.legal-icon{font-size:1.8rem;flex-shrink:0}
.legal-lbl{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--g);margin-bottom:3px}
.legal-val{font-size:12.5px;color:rgba(255,255,255,.6);line-height:1.5}
.bagis-widget,.bw{background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.bw-head{background:linear-gradient(135deg,var(--r),var(--rd));padding:22px 26px}
.bw-head h3{font-family:var(--fs);font-size:1.15rem;font-weight:700;color:#fff;margin-bottom:4px}
.bw-head p{font-size:12px;color:rgba(255,255,255,.65)}
.bw-body{padding:24px 26px}
.bw-amts,.bw-usd{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.bw-amt{padding:10px 6px;border:1.5px solid var(--bd);border-radius:6px;font-size:12.5px;font-weight:700;color:var(--t2);background:var(--gr);cursor:pointer;transition:all .2s;font-family:var(--fn);text-align:center}
.bw-amt:hover,.bw-amt.on{background:var(--r);border-color:var(--r);color:#fff}
.bw-inp{width:100%;border:1.5px solid var(--bd);border-radius:6px;padding:10px 14px;font-size:13px;font-family:var(--fn);margin-bottom:14px;outline:none;display:block}
.bw-inp:focus{border-color:var(--r)}
.bw-go{display:block;width:100%;background:var(--r);color:#fff;border:none;border-radius:6px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--fn);transition:background .2s;margin-bottom:18px}
.bw-go:hover{background:var(--rd)}
.bw-div,.bw-divider{border:none;border-top:1px solid var(--bd);margin:0 0 16px}
.bw-et,.bw-eft-title{font-size:10px;font-weight:800;color:var(--r);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px}
.bw-ei,.bw-eft-info{font-size:12px;color:var(--t2);line-height:1.9}
.bw-iban,.bw-iban-row{display:flex;align-items:center;gap:8px;background:var(--gr);border:1px solid var(--bd);border-radius:6px;padding:9px 12px;margin:8px 0}
.bw-iban-n,.bw-iban-num{font-family:monospace;font-size:11px;color:var(--t1);flex:1;letter-spacing:.5px}
.bw-cp,.bw-iban-copy{background:var(--r);color:#fff;border:none;border-radius:4px;padding:5px 12px;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--fn)}
.bw-ssl{text-align:center;font-size:10px;color:var(--t3);margin-top:12px}
.trust-tag{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:4px;padding:7px 14px;font-size:11px;font-weight:600;color:rgba(255,255,255,.6)}
.ph-trust{display:flex;flex-wrap:wrap;gap:10px}
.cur-tabs{display:flex;gap:8px;margin-bottom:14px}
.cur-tab{padding:6px 14px;border:1.5px solid var(--bd);border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;background:var(--gr);color:var(--t2);font-family:var(--fn);transition:all .2s}
.cur-tab.on{background:var(--r);border-color:var(--r);color:#fff}
.impact-grid,.trust-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.impact-card,.trust-card{background:#fff;border:1px solid var(--bd);border-radius:8px;padding:26px 18px;text-align:center;transition:all .22s;position:relative;overflow:hidden}
.impact-card::before,.trust-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--r),var(--g))}
.impact-card:hover,.trust-card:hover{box-shadow:0 6px 24px rgba(0,0,0,.09);transform:translateY(-2px);border-color:var(--g)}
.impact-icon,.trust-icon{font-size:2.2rem;margin-bottom:12px}
.impact-title,.trust-title{font-family:var(--fs);font-size:.95rem;font-weight:700;color:var(--t1);margin-bottom:7px}
.impact-desc,.trust-desc{font-size:11.5px;color:var(--t2);line-height:1.7}
.lang-sw{display:flex;gap:6px;margin-bottom:16px}
.lang-sw a{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.6);padding:5px 12px;border-radius:4px;font-size:10.5px;font-weight:600;text-decoration:none;transition:all .2s}
.lang-sw a:hover,.lang-sw a.on{background:var(--r);border-color:var(--r);color:#fff}
.pw{font-family:var(--fn);background:var(--wh);color:var(--t1)}
@media(max-width:1100px){.office-grid{grid-template-columns:repeat(3,1fr)}.impact-grid,.trust-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:860px){.mission-grid,.values-grid{grid-template-columns:1fr 1fr}.office-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:540px){.mission-grid,.values-grid,.office-grid,.impact-grid,.trust-grid{grid-template-columns:1fr}}
</style>
<div class="pw">
<div class="ph">
  <div class="ph-w">
    <div>
      <div class="ph-lang">
        <a href="<?php echo esc_url(home_url('/hakkimizda')); ?>">🇹🇷 Türkçe</a>
        <a href="<?php echo esc_url(home_url('/about')); ?>" class="on">🇬🇧 English</a>
      </div>
      <div style="height:14px"></div>
      <div class="ph-ew">🌍 International · 501(c)(3) · Public Benefit</div>
      <h1 class="ph-h1">Heroes of the Homeland Foundation<em>About Us</em></h1>
      <p class="ph-desc">We are authorized to operate globally and open representative offices worldwide. As a <strong>501(c)(3) non-profit international organization</strong>, all our financial resources are exclusively directed toward education and humanitarian aid projects. Our directors and officials serve on a voluntary basis without compensation.</p>
    </div>
    <div>
      <div class="ph-facts">
        <div class="ph-fact"><div class="ph-fact-num">5</div><div class="ph-fact-lbl">Offices · 4 Continents</div></div>
        <div class="ph-fact"><div class="ph-fact-num">13</div><div class="ph-fact-lbl">Country Network</div></div>
        <div class="ph-fact"><div class="ph-fact-num">501c3</div><div class="ph-fact-lbl">International Status</div></div>
        <div class="ph-fact"><div class="ph-fact-num">100%</div><div class="ph-fact-lbl">Volunteer Management</div></div>
      </div>
    </div>
  </div>
</div>
<div class="legal-band">
  <div class="legal-w">
    <div class="legal-item"><div class="legal-icon">🏛️</div><div><div class="legal-lbl">Status</div><div class="legal-val">501(c)(3) Non-Profit International Foundation</div></div></div>
    <div class="legal-item"><div class="legal-icon">📍</div><div><div class="legal-lbl">Headquarters</div><div class="legal-val">Ankara, Turkey — 5 Country Offices</div></div></div>
    <div class="legal-item"><div class="legal-icon">⚖️</div><div><div class="legal-lbl">Governance</div><div class="legal-val">Directors serve on a voluntary, uncompensated basis</div></div></div>
    <div class="legal-item"><div class="legal-icon">💰</div><div><div class="legal-lbl">Finance</div><div class="legal-val">100% of resources go to education &amp; humanitarian projects</div></div></div>
  </div>
</div>
<div class="sec">
  <div class="sec-w">
    <div class="sec-hd">
      <div class="badge r">🎯 Mission &amp; Vision</div>
      <div class="sec-title">Why We Exist</div>
    </div>
    <div class="mission-grid">
      <div class="mission-text">
        <p>The Heroes of the Homeland Foundation (Vatan Kahramanları Vakfı) was established to deliver <strong>humanitarian aid, education-research programs, and veteran support services</strong> in Turkey, the Turkic world, and allied nations.</p>
        <p>Our foundation is authorized to operate globally and establish representative offices worldwide. As a 501(c)(3) non-profit international organization, all financial resources are exclusively channeled to education and humanitarian projects. Directors and officials serve without any compensation on a voluntary basis.</p>
        <p>Through our institutional network spanning five continents, <strong>we represent the Turkish lobby</strong> and fulfill our responsibility toward our heroes with the principle of "vefa" (loyalty and gratitude).</p>
        <p>Medical support for war and terror victims, social protection for martyrs' families, educational opportunities for veterans' children — all these services are delivered in coordination with international NGO networks and official institutions.</p>
      </div>
      <div class="mission-quote">
        <div class="mq-text">"Vefa is not just a word; <em>it is a responsibility.</em> Passing the epic written by our heroes to the future of their children — this is the very reason our foundation exists."</div>
        <div class="mq-src">— Heroes of the Homeland Foundation Charter</div>
      </div>
    </div>
  </div>
</div>
<div class="sec">
  <div class="sec-w">
    <div class="sec-hd">
      <div class="badge b">📍 Global Network</div>
      <div class="sec-title">Our Offices</div>
      <div class="sec-sub">5 offices across 4 continents — staying close to our heroes.</div>
    </div>
    <div class="office-grid">
      <div class="office-card"><div class="office-flag">🇹🇷</div><div class="office-city">Ankara, Turkey</div><div class="office-name">Vatan Kahramanları Derneği</div><div class="office-addr">Meşrutiyet Mah. Karanfil Sokak 4/91, Çankaya</div></div>
      <div class="office-card"><div class="office-flag">🇺🇸</div><div class="office-city">Wyoming, USA</div><div class="office-name">Heroes of the Homeland Foundation Inc.</div><div class="office-addr">1621 Central Ave, Cheyenne WY 82001</div></div>
      <div class="office-card"><div class="office-flag">🇦🇿</div><div class="office-city">Baku, Azerbaijan</div><div class="office-name">International Veterans Organization MMC</div><div class="office-addr">İçerişeher, Caferov Qardaşları No: 19</div></div>
      <div class="office-card"><div class="office-flag">🇬🇧</div><div class="office-city">London, UK</div><div class="office-name">Vatan Social Services</div><div class="office-addr">71-75 Shelton Street, Covent Garden WC2H 9JQ</div></div>
      <div class="office-card"><div class="office-flag">🇬🇪</div><div class="office-city">Batumi, Georgia</div><div class="office-name">VKV Batumi Representative</div><div class="office-addr">Kutaisi Street No: 1, Old Batumi</div></div>
    </div>
  </div>
</div>
<div class="sec">
  <div class="sec-w">
    <div class="sec-hd">
      <div class="badge r">🎖️ What We Do</div>
      <div class="sec-title">Our Programs</div>
    </div>
    <div class="grid g4">
      <div class="card"><div class="card-st r"></div><div class="card-body"><div class="card-icon r"><i class="fa fa-heartbeat"></i></div><div class="card-title">Humanitarian Aid &amp; Medical Support</div><div class="card-desc">Prosthetics, physical and psychological rehabilitation, emergency medical response. International NGO coordination in 13 countries.</div></div><div class="card-foot"><span class="card-lbl">Priority Program</span><a href="<?php echo esc_url(home_url('/insani-yardim')); ?>" class="card-lnk">Details →</a></div></div>
      <div class="card"><div class="card-st b"></div><div class="card-body"><div class="card-icon b"><i class="fa fa-graduation-cap"></i></div><div class="card-title">Education &amp; Scholarships</div><div class="card-desc">Scholarships, mentoring, and international student exchange programs for children of martyrs and veterans.</div></div><div class="card-foot"><span class="card-lbl">Education Program</span><a href="<?php echo esc_url(home_url('/burs')); ?>" class="card-lnk">Details →</a></div></div>
      <div class="card"><div class="card-st gld"></div><div class="card-body"><div class="card-icon gld"><i class="fa fa-globe"></i></div><div class="card-title">Lobbying &amp; Advocacy</div><div class="card-desc">Turkish lobby presence on five continents, advocating for the rights of martyrs' families and veterans in international platforms.</div></div><div class="card-foot"><span class="card-lbl">Lobby Activity</span><a href="<?php echo esc_url(home_url('/isbirligi')); ?>" class="card-lnk">Details →</a></div></div>
      <div class="card"><div class="card-st g"></div><div class="card-body"><div class="card-icon g"><i class="fa fa-balance-scale"></i></div><div class="card-title">Rights &amp; Consultancy</div><div class="card-desc">National and international consultancy on veteran and martyr family rights. Comparative rights guide for 26 countries.</div></div><div class="card-foot"><span class="card-lbl">Legal Support</span><a href="<?php echo esc_url(home_url('/uluslararasi-sehit-gazi-haklari')); ?>" class="card-lnk">Details →</a></div></div>
    </div>
  </div>
</div>
<div class="ctaband">
  <div class="ctaband-w">
    <div class="ctaband-text"><h3>Together We Are Stronger</h3><p>Every contribution reaches the beneficiary directly · Stripe secured · 501(c)(3) approved · Transparent management</p></div>
    <div class="ctabtns">
      <a href="<?php echo esc_url(home_url('/donation')); ?>" class="pbtn wh">💝 Donate</a>
      <a href="<?php echo esc_url(home_url('/isbirligi')); ?>" class="pbtn ol">🤝 Partnership</a>
      <a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="pbtn ol">📩 Contact</a>
    </div>
  </div>
</div>
</div>
<?php endif; ?>
<?php get_footer(); ?>
