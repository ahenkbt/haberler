<?php
/**
 * Template Name: İşbirliği Alanları
 * Template Post Type: page
 */
get_header();
vkv_breadcrumb();
// VKV Sayfa İçerik Sistemi:
// 1. VKV Admin Paneli'nden içerik girilmişse göster
// 2. WordPress/Elementor içeriği varsa göster  
// 3. Hiçbiri yoksa Shopify HTML'ini göster
if (have_posts()) { the_post(); }
$vkv_slug = 'isbirligi';
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
.ib-wrap{font-family:var(--fn);background:var(--wh);color:var(--t1)}
.ib-hero{width:100%;background:linear-gradient(150deg,var(--dk) 0%,var(--dk2) 55%,#1a0810 100%);padding:64px 40px 56px;position:relative;overflow:hidden}
.ib-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 70% at 80% 50%,rgba(140,26,46,.22) 0%,transparent 65%),radial-gradient(ellipse 40% 50% at 5% 10%,rgba(201,168,76,.06) 0%,transparent 60%)}
.ib-hero-inner{max-width:1440px;margin:0 auto;display:grid;grid-template-columns:1.3fr 1fr;gap:64px;align-items:center;position:relative;z-index:1}
.ib-eyebrow{display:inline-flex;align-items:center;gap:8px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:var(--g);font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:20px}
.ib-hero h1{font-family:var(--fs);font-size:clamp(1.8rem,3vw,2.9rem);font-weight:700;color:#fff;line-height:1.18;margin-bottom:16px}
.ib-hero h1 em{color:var(--g);font-style:italic;display:block}
.ib-hero-desc{font-size:14px;color:rgba(255,255,255,.5);line-height:1.85;max-width:520px}
.ib-hero-desc strong{color:rgba(255,255,255,.75)}
.ib-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.07);border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,.07)}
.ib-stat{background:rgba(255,255,255,.03);padding:20px 22px;transition:background .2s}
.ib-stat:hover{background:rgba(255,255,255,.07)}
.ib-stat-num{font-size:2.2rem;font-weight:800;color:var(--g);line-height:1;margin-bottom:4px}
.ib-stat-lbl{font-size:9.5px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:rgba(255,255,255,.3)}
.ib-values-band{width:100%;background:var(--dk2);border-top:1px solid rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.05)}
.ib-values-inner{max-width:1440px;margin:0 auto;display:flex;align-items:stretch;overflow-x:auto}
.ib-val{display:flex;align-items:center;gap:10px;padding:16px 28px;border-right:1px solid rgba(255,255,255,.06);font-size:11px;font-weight:600;color:rgba(255,255,255,.4);letter-spacing:.8px;text-transform:uppercase;white-space:nowrap;transition:color .2s;flex-shrink:0}
.ib-val:hover{color:var(--g)}
.ib-val .ico{font-size:1.1rem}
.ib-sec{width:100%;padding:52px 40px}
.ib-sec:nth-child(even){background:var(--gr)}
.ib-sec-w{max-width:1440px;margin:0 auto}
.ib-sec-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid var(--bd);gap:20px}
.ib-sec-badge{display:inline-flex;align-items:center;gap:6px;font-size:9px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-bottom:8px;border:1px solid}
.ib-sec-badge.kirmizi{background:var(--rl);color:var(--r);border-color:rgba(140,26,46,.2)}
.ib-sec-badge.altin{background:var(--gl);color:#7a5a00;border-color:rgba(201,168,76,.3)}
.ib-sec-badge.mavi{background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE}
.ib-sec-badge.yesil{background:#F0FDF4;color:#15803D;border-color:#BBF7D0}
.ib-sec-badge.mor{background:#F5F3FF;color:#6D28D9;border-color:#DDD6FE}
.ib-sec-title{font-family:var(--fs);font-size:1.65rem;font-weight:700;color:var(--t1);margin-bottom:5px}
.ib-sec-sub{font-size:12.5px;color:var(--t3);line-height:1.65;max-width:660px}
.ib-sec-cnt{font-size:2.8rem;font-weight:800;color:var(--r);line-height:1;text-align:right}
.ib-sec-cnt-lbl{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);text-align:right}
.ib-grid{display:grid;gap:14px}
.ib-g4{grid-template-columns:repeat(4,1fr)}.ib-g3{grid-template-columns:repeat(3,1fr)}.ib-g2{grid-template-columns:repeat(2,1fr)}
.ib-card{background:#fff;border:1px solid var(--bd);border-radius:8px;overflow:hidden;display:flex;flex-direction:column;transition:box-shadow .22s,transform .22s;position:relative}
.ib-card:hover{box-shadow:0 10px 36px rgba(0,0,0,.1);transform:translateY(-3px)}
.ib-card-top{height:5px}
.ib-card-top.kirmizi{background:linear-gradient(90deg,var(--r),#c0392b)}
.ib-card-top.altin{background:linear-gradient(90deg,var(--g),#f0c060)}
.ib-card-top.mavi{background:linear-gradient(90deg,#1D4ED8,#3b82f6)}
.ib-card-top.yesil{background:linear-gradient(90deg,#15803D,#22c55e)}
.ib-card-top.mor{background:linear-gradient(90deg,#6D28D9,#8b5cf6)}
.ib-card-icon-wrap{padding:22px 22px 0}
.ib-card-icon{width:54px;height:54px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:14px}
.ib-card-icon.kirmizi{background:var(--rl);color:var(--r)}
.ib-card-icon.altin{background:var(--gl);color:#7a5a00}
.ib-card-icon.mavi{background:#EFF6FF;color:#1D4ED8}
.ib-card-icon.yesil{background:#F0FDF4;color:#15803D}
.ib-card-icon.mor{background:#F5F3FF;color:#6D28D9}
.ib-card-body{padding:0 22px 20px;flex:1;display:flex;flex-direction:column}
.ib-card-title{font-family:var(--fs);font-size:1rem;font-weight:700;color:var(--t1);margin-bottom:8px;line-height:1.3}
.ib-card-desc{font-size:12px;color:var(--t2);line-height:1.75;flex:1;margin-bottom:14px}
.ib-card-tags{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px}
.ib-tag{font-size:9px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;padding:3px 8px;border-radius:20px;border:1px solid}
.ib-tag.kirmizi{background:var(--rl);color:var(--r);border-color:rgba(140,26,46,.2)}
.ib-tag.mavi{background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE}
.ib-tag.yesil{background:#F0FDF4;color:#15803D;border-color:#BBF7D0}
.ib-tag.mor{background:#F5F3FF;color:#6D28D9;border-color:#DDD6FE}
.ib-tag.altin{background:var(--gl);color:#7a5a00;border-color:rgba(201,168,76,.3)}
.ib-tag.gri{background:var(--gr);color:var(--t2);border-color:var(--bd)}
.ib-card-footer{border-top:1px solid var(--bd);padding:12px 22px;display:flex;align-items:center;justify-content:space-between}
.ib-card-ortak{font-size:10px;color:var(--t3);font-weight:600}
.ib-card-link{font-size:10.5px;font-weight:700;color:var(--r);text-decoration:none;display:inline-flex;align-items:center;gap:4px;transition:gap .2s}
.ib-card-link:hover{gap:8px}
.ib-quote-band{width:100%;background:linear-gradient(135deg,var(--dk) 0%,var(--dk2) 100%);padding:56px 40px;text-align:center;border-top:3px solid var(--g);position:relative;overflow:hidden}
.ib-quote-band::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 80% at 50% 100%,rgba(140,26,46,.2) 0%,transparent 70%)}
.ib-quote-text{font-family:var(--fs);font-size:clamp(1.3rem,2.5vw,2rem);font-style:italic;color:#fff;max-width:800px;margin:0 auto 16px;line-height:1.5;position:relative;z-index:1}
.ib-quote-text em{color:var(--g)}
.ib-quote-source{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.4);position:relative;z-index:1}
.ib-cta-band{background:var(--r);padding:40px;width:100%}
.ib-cta-inner{max-width:1440px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap}
.ib-cta-text h3{font-family:var(--fs);font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:6px}
.ib-cta-text p{font-size:13px;color:rgba(255,255,255,.7);line-height:1.6}
.ib-cta-btns{display:flex;gap:12px;flex-wrap:wrap}
.ib-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:4px;font-size:12.5px;font-weight:700;letter-spacing:.3px;text-decoration:none;transition:all .2s;font-family:var(--fn)}
.ib-btn.white{background:#fff;color:var(--r)}.ib-btn.white:hover{background:#f0e8e8}
.ib-btn.outline{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.5)}.ib-btn.outline:hover{background:rgba(255,255,255,.1);border-color:#fff}
.ib-target{width:100%;background:var(--gr);padding:52px 40px}
.ib-target-w{max-width:1440px;margin:0 auto}
.ib-target-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:28px}
.ib-target-card{background:#fff;border:1px solid var(--bd);border-radius:8px;padding:28px 24px;text-align:center;transition:all .22s}
.ib-target-card:hover{box-shadow:0 6px 24px rgba(0,0,0,.08);transform:translateY(-2px);border-color:var(--g)}
.ib-target-icon{font-size:2.8rem;margin-bottom:14px}
.ib-target-title{font-family:var(--fs);font-size:1rem;font-weight:700;color:var(--t1);margin-bottom:8px}
.ib-target-desc{font-size:11.5px;color:var(--t2);line-height:1.7}
@media(max-width:1200px){.ib-g4{grid-template-columns:repeat(2,1fr)}.ib-g3{grid-template-columns:repeat(2,1fr)}.ib-hero-inner{grid-template-columns:1fr;gap:40px}}
@media(max-width:900px){.ib-g4,.ib-g3,.ib-g2{grid-template-columns:repeat(2,1fr)}.ib-target-grid{grid-template-columns:repeat(2,1fr)}.ib-sec,.ib-hero,.ib-quote-band,.ib-cta-band,.ib-target{padding:40px 24px}}
@media(max-width:560px){.ib-g4,.ib-g3,.ib-g2,.ib-target-grid{grid-template-columns:1fr}}
</style>
<div class="ib-wrap">
<!-- ═══ HERO ═══ -->
<div class="ib-hero">
  <div class="ib-hero-inner">
    <div>
      <div class="ib-eyebrow">🤝 Uluslararası İşbirliği Platformu</div>
      <h1>Vakfımızın<em>İşbirliği Alanları</em></h1>
      <p class="ib-hero-desc">
        Vatan Kahramanları Vakfı olarak <strong>insani yardım, gazi desteği, eğitim ve rehabilitasyon</strong> alanlarında yerel ve uluslararası STK'larla köprüler kuruyoruz.
        <br><br>
        Beş kıtada yürüttüğümüz programlarla Türk dünyasının kahramanlarına <strong>somut, ölçülebilir ve sürdürülebilir</strong> katkı sağlıyoruz.
      </p>
    </div>
    <div>
      <div class="ib-stat-grid">
        <div class="ib-stat"><div class="ib-stat-num">13</div><div class="ib-stat-lbl">Ülke</div></div>
        <div class="ib-stat"><div class="ib-stat-num">5</div><div class="ib-stat-lbl">Kıta</div></div>
        <div class="ib-stat"><div class="ib-stat-num">501c3</div><div class="ib-stat-lbl">Statü</div></div>
        <div class="ib-stat"><div class="ib-stat-num">8</div><div class="ib-stat-lbl">Program</div></div>
        <div class="ib-stat"><div class="ib-stat-num">%100</div><div class="ib-stat-lbl">Şeffaf</div></div>
        <div class="ib-stat"><div class="ib-stat-num">∞</div><div class="ib-stat-lbl">Vefa</div></div>
      </div>
    </div>
  </div>
</div>
<!-- ═══ DEĞERLER BANDI ═══ -->
<div class="ib-values-band">
  <div class="ib-values-inner">
    <div class="ib-val"><span class="ico">🎖️</span>Gazi Desteği</div>
    <div class="ib-val"><span class="ico">🏥</span>Medikal Rehabilitasyon</div>
    <div class="ib-val"><span class="ico">🎓</span>Eğitim &amp; Burs</div>
    <div class="ib-val"><span class="ico">🌍</span>Diaspora Ağı</div>
    <div class="ib-val"><span class="ico">🤝</span>STK İşbirliği</div>
    <div class="ib-val"><span class="ico">❤️</span>İnsani Yardım</div>
    <div class="ib-val"><span class="ico">⚖️</span>Hukuki Savunuculuk</div>
  </div>
</div>
<!-- ═══ BÖLÜM 1: İNSANİ YARDIM & GAZİ DESTEĞİ ═══ -->
<div class="ib-sec">
  <div class="ib-sec-w">
    <div class="ib-sec-head">
      <div>
        <div class="ib-sec-badge kirmizi">🎖️ Öncelikli Program</div>
        <div class="ib-sec-title">İnsani Yardım &amp; Gazi Destek Programları</div>
        <div class="ib-sec-sub">Şehit yakınları, gaziler ve savaş mağdurlarına yönelik doğrudan destek programları. Her katkı hesap verilebilir biçimde ihtiyaç sahibine ulaşır.</div>
      </div>
      <div><div class="ib-sec-cnt">3</div><div class="ib-sec-cnt-lbl">Program</div></div>
    </div>
    <div class="ib-grid ib-g3">
      <div class="ib-card">
        <div class="ib-card-top kirmizi"></div>
        <div class="ib-card-icon-wrap">
          <div class="ib-card-icon kirmizi"><i class="fa fa-heartbeat"></i></div>
        </div>
        <div class="ib-card-body">
          <div class="ib-card-title">Protez &amp; Rehabilitasyon Desteği</div>
          <div class="ib-card-desc">Sağlanan her destek doğrudan ihtiyaç sahiplerinin protez ve rehabilitasyon hizmetlerine aktarılmaktadır. Bağımsız hareket edebilme, psikolojik ve sosyal güçlenme, hayata umutla bakış hedefimizdir.<br><br>Türk dünyası gazileri, savaş ve terör mağdurları ile engelli ihtiyaç sahipleri için kapsamlı rehabilitasyon süreçleri yönetiyoruz.</div>
          <div class="ib-card-tags">
            <span class="ib-tag kirmizi">Protez</span>
            <span class="ib-tag kirmizi">Rehabilitasyon</span>
            <span class="ib-tag mavi">Medikal</span>
            <span class="ib-tag yesil">STK İşbirliği</span>
          </div>
          <div style="background:var(--ib-gray);border-radius:6px;padding:12px 14px;font-size:11.5px;color:var(--ib-txt2);line-height:1.65;border-left:3px solid var(--ib-red)">
            <strong style="color:var(--ib-txt);display:block;margin-bottom:6px">Hedef kitlesi:</strong>
            🇹🇷 Türk dünyası kahramanlarımız · ⚔️ Savaş ve terör mağdurları · ♿ Engelli ihtiyaç sahipleri
          </div>
        </div>
        <div class="ib-card-footer">
          <span class="ib-card-ortak">Kızılay · MSF · IDA iş birliği</span>
          <a href="<?php echo esc_url(home_url('/bagis')); ?>" class="ib-card-link">Destek Ol →</a>
        </div>
      </div>
      <div class="ib-card">
        <div class="ib-card-top kirmizi"></div>
        <div class="ib-card-icon-wrap">
          <div class="ib-card-icon kirmizi"><i class="fa fa-shield"></i></div>
        </div>
        <div class="ib-card-body">
          <div class="ib-card-title">Sosyal Uyum &amp; Psikolojik Güçlenme</div>
          <div class="ib-card-desc">Gazilerimizin, savaş ve terör mağdurlarının toplumsal hayata aktif katılımını destekleyen sosyal uyum ve rehabilitasyon çalışmaları gerçekleştiriyoruz.<br><br>Bireysel danışmanlık, grup terapisi, topluluk entegrasyon programları ve aile destek süreçleriyle bütüncül bir yaklaşım benimsiyoruz.</div>
          <div class="ib-card-tags">
            <span class="ib-tag kirmizi">Psikolojik Destek</span>
            <span class="ib-tag mor">Sosyal Uyum</span>
            <span class="ib-tag yesil">Aile Desteği</span>
          </div>
          <div style="background:var(--ib-gray);border-radius:6px;padding:12px 14px;font-size:11.5px;color:var(--ib-txt2);line-height:1.65;border-left:3px solid var(--ib-red)">
            <strong style="color:var(--ib-txt);display:block;margin-bottom:6px">İşbirliği modeli:</strong>
            Üniversite klinikleri · Ruh sağlığı STK'ları · Aile danışma merkezleri
          </div>
        </div>
        <div class="ib-card-footer">
          <span class="ib-card-ortak">ASHB · Muharip Gaziler Derneği</span>
          <a href="<?php echo esc_url(home_url('/sehit-gazi-haklari')); ?>" class="ib-card-link">Detaylar →</a>
        </div>
      </div>
      <div class="ib-card">
        <div class="ib-card-top kirmizi"></div>
        <div class="ib-card-icon-wrap">
          <div class="ib-card-icon kirmizi"><i class="fa fa-medkit"></i></div>
        </div>
        <div class="ib-card-body">
          <div class="ib-card-title">Acil İnsani Yardım &amp; Medikal Destek</div>
          <div class="ib-card-desc">Savaş bölgelerindeki ve kriz ortamlarındaki Türk dünyası mensuplarına acil insani yardım ve medikal müdahale desteği sağlıyoruz.<br><br>Uluslararası STK ağımız aracılığıyla AFAD, IHH ve Kızılay ile koordineli biçimde hareket ediyoruz. Şeffaflık, hesap verebilirlik ve sorumluluk ilkelerini temel alıyoruz.</div>
          <div class="ib-card-tags">
            <span class="ib-tag kirmizi">Acil Yardım</span>
            <span class="ib-tag mavi">Medikal</span>
            <span class="ib-tag altin">Koordinasyon</span>
          </div>
          <div style="background:var(--ib-gray);border-radius:6px;padding:12px 14px;font-size:11.5px;color:var(--ib-txt2);line-height:1.65;border-left:3px solid var(--ib-red)">
            <strong style="color:var(--ib-txt);display:block;margin-bottom:6px">Ortak kuruluşlar:</strong>
            AFAD · IHH · Türk Kızılay · MSF · WHO
          </div>
        </div>
        <div class="ib-card-footer">
          <span class="ib-card-ortak">13 ülke koordinasyonu</span>
          <a href="<?php echo esc_url(home_url('/bagis')); ?>" class="ib-card-link">Bağış Yap →</a>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- ═══ BÖLÜM 2: EĞİTİM & BURS ═══ -->
<div class="ib-sec">
  <div class="ib-sec-w">
    <div class="ib-sec-head">
      <div>
        <div class="ib-sec-badge mavi">🎓 Eğitim Programları</div>
        <div class="ib-sec-title">Eğitim, Burs &amp; Öğrenci Değişim Programları</div>
        <div class="ib-sec-sub">Vatan kahramanlarımızın çocuklarına yönelik uluslararası eğitim destekleri. Kültürel etkileşim ve küresel vizyonu besleyen programlar.</div>
      </div>
      <div><div class="ib-sec-cnt" style="color:#1D4ED8">2</div><div class="ib-sec-cnt-lbl">Program</div></div>
    </div>
    <div class="ib-grid ib-g2">
      <div class="ib-card">
        <div class="ib-card-top mavi"></div>
        <div class="ib-card-icon-wrap">
          <div class="ib-card-icon mavi"><i class="fa fa-exchange"></i></div>
        </div>
        <div class="ib-card-body">
          <div class="ib-card-title">Öğrenci Değişim Programları</div>
          <div class="ib-card-desc">Vatan kahramanlarımızın çocuklarına yönelik uluslararası öğrenci değişim projeleriyle kültürel etkileşimi ve küresel vizyonu destekliyoruz.<br><br>TDT Orhun Değişim Programı çerçevesinde 5 Türk devletindeki partnerlerin yanı sıra Balkanlar ve Orta Doğu'daki müttefik ülkelerde öğrenci plasman süreçleri yürütüyoruz.</div>
          <div class="ib-card-tags">
            <span class="ib-tag mavi">Orhun Programı</span>
            <span class="ib-tag mavi">Uluslararası</span>
            <span class="ib-tag yesil">5 Türk Devleti</span>
            <span class="ib-tag altin">Balkanlar</span>
          </div>
          <ul style="margin:10px 0 14px;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:6px">
            <li style="font-size:11.5px;color:var(--ib-txt2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--ib-red);flex-shrink:0">✓</span>Türk Akademisi ve TDT ortaklığıyla akademik değişim</li>
            <li style="font-size:11.5px;color:var(--ib-txt2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--ib-red);flex-shrink:0">✓</span>Gazi ailesi öncelikli kontenjan tahsisi</li>
            <li style="font-size:11.5px;color:var(--ib-txt2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--ib-red);flex-shrink:0">✓</span>Dil eğitimi ve kültürel oryantasyon desteği</li>
            <li style="font-size:11.5px;color:var(--ib-txt2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--ib-red);flex-shrink:0">✓</span>Akıl mentörü eşleştirme sistemi</li>
          </ul>
        </div>
        <div class="ib-card-footer">
          <span class="ib-card-ortak">YÖK · Türk Akademisi · YTB · KYK</span>
          <a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="ib-card-link">Başvur →</a>
        </div>
      </div>
      <div class="ib-card">
        <div class="ib-card-top mavi"></div>
        <div class="ib-card-icon-wrap">
          <div class="ib-card-icon mavi"><i class="fa fa-graduation-cap"></i></div>
        </div>
        <div class="ib-card-body">
          <div class="ib-card-title">Burs &amp; Eğitim Destekleri</div>
          <div class="ib-card-desc">Eğitim hayatlarını güçlendirmek amacıyla burs programları, akademik mentorluk ve sosyal gelişim projeleri sunuyoruz.<br><br>Şehit ve gazi ailelerinin çocuklarına yönelik lisans, lisansüstü ve mesleki eğitim burslarını STK ağımız ve kamu kurumları ortaklığıyla sağlıyoruz.</div>
          <div class="ib-card-tags">
            <span class="ib-tag mavi">Lisans Bursu</span>
            <span class="ib-tag mavi">Lisansüstü</span>
            <span class="ib-tag mor">Mentorluk</span>
            <span class="ib-tag yesil">Mesleki Eğitim</span>
          </div>
          <ul style="margin:10px 0 14px;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:6px">
            <li style="font-size:11.5px;color:var(--ib-txt2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--ib-red);flex-shrink:0">✓</span>Türkiye, Azerbaycan, Kazakistan üniversite bursları</li>
            <li style="font-size:11.5px;color:var(--ib-txt2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--ib-red);flex-shrink:0">✓</span>Macaristan ve Balkan ülkelerinde yurt dışı bursu</li>
            <li style="font-size:11.5px;color:var(--ib-txt2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--ib-red);flex-shrink:0">✓</span>Akademik mentorluk eşleştirme</li>
            <li style="font-size:11.5px;color:var(--ib-txt2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--ib-red);flex-shrink:0">✓</span>Sosyal gelişim ve liderlik programları</li>
          </ul>
        </div>
        <div class="ib-card-footer">
          <span class="ib-card-ortak">KYK · MEB · YTB · Maarif Vakfı</span>
          <a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="ib-card-link">Başvur →</a>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- ═══ ALINTI BANDI ═══ -->
<div class="ib-quote-band">
  <div class="ib-quote-text">"Vefa, sadece bir söz değil; <em>bir sorumluluktur.</em>"</div>
  <div class="ib-quote-source">— Vatan Kahramanları Vakfı İlkeleri</div>
</div>
<!-- ═══ BÖLÜM 3: ETKİNLİKLER & KÜLTÜREL KÖPRÜLER ═══ -->
<div class="ib-sec">
  <div class="ib-sec-w">
    <div class="ib-sec-head">
      <div>
        <div class="ib-sec-badge altin">🌐 Diplomatik Köprüler</div>
        <div class="ib-sec-title">Etkinlikler &amp; Kültürel Buluşmalar</div>
        <div class="ib-sec-sub">Vatan kahramanlarımız arasında kalıcı dostluk köprüleri inşa ediyoruz. Kahramanlarımızın mirasını kardeş coğrafyalarımızın yarınlarına nakşediyoruz.</div>
      </div>
      <div><div class="ib-sec-cnt" style="color:#7a5a00">3</div><div class="ib-sec-cnt-lbl">Program</div></div>
    </div>
    <div class="ib-grid ib-g3">
      <div class="ib-card">
        <div class="ib-card-top altin"></div>
        <div class="ib-card-icon-wrap">
          <div class="ib-card-icon altin"><i class="fa fa-users"></i></div>
        </div>
        <div class="ib-card-body">
          <div class="ib-card-title">Tanışma &amp; Kültürel Buluşmalar</div>
          <div class="ib-card-desc">Ziyaret programları, kültürel geziler ve misafirperverlik temelli organizasyonlarla vatan kahramanlarımız arasında kalıcı dostluk köprüleri inşa ediyoruz.<br><br>Türk dünyasının beş ülkesindeki gazi aileleri ve STK temsilcileri arasında yıllık buluşmalar ve sempozyumlar düzenliyoruz.</div>
          <div class="ib-card-tags">
            <span class="ib-tag altin">Gazi Buluşmaları</span>
            <span class="ib-tag altin">Kültürel Ziyaret</span>
            <span class="ib-tag yesil">STK Sempozyumu</span>
          </div>
        </div>
        <div class="ib-card-footer">
          <span class="ib-card-ortak">TÜRKSOY · Yunus Emre · Maarif</span>
          <a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="ib-card-link">Katıl →</a>
        </div>
      </div>
      <div class="ib-card">
        <div class="ib-card-top altin"></div>
        <div class="ib-card-icon-wrap">
          <div class="ib-card-icon altin"><i class="fa fa-globe"></i></div>
        </div>
        <div class="ib-card-body">
          <div class="ib-card-title">Diaspora &amp; Lobi Ağı</div>
          <div class="ib-card-desc">Avrupa, Amerika, Asya, Okyanusya ve Afrika'daki Türk diasporası dernekleriyle koordineli lobi faaliyetleri yürütüyoruz. Türk dünyasının sesini beş kıtada duyuruyoruz.<br><br>Şehit ve gazi haklarının uluslararası gündemde yer bulması için savunuculuk çalışmaları gerçekleştiriyoruz.</div>
          <div class="ib-card-tags">
            <span class="ib-tag altin">Diaspora</span>
            <span class="ib-tag mavi">Lobicilik</span>
            <span class="ib-tag kirmizi">Savunuculuk</span>
          </div>
        </div>
        <div class="ib-card-footer">
          <span class="ib-card-ortak">UETD · ATC · YTB diaspora ağı</span>
          <a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="ib-card-link">İletişim →</a>
        </div>
      </div>
      <div class="ib-card">
        <div class="ib-card-top altin"></div>
        <div class="ib-card-icon-wrap">
          <div class="ib-card-icon altin"><i class="fa fa-calendar"></i></div>
        </div>
        <div class="ib-card-body">
          <div class="ib-card-title">Gençlik Kampları &amp; Festivaller</div>
          <div class="ib-card-desc">TDT Uluslararası Gençlik Kampları ve Festivalleri çerçevesinde şehit ve gazi çocuklarına yönelik katılım programları koordine ediyoruz.<br><br>Modern İpek Yolu kültür turları, Tabarruk ziyaret programları ve kardeş ülke keşif turlarıyla genç nesle vefa kültürünü aktarıyoruz.</div>
          <div class="ib-card-tags">
            <span class="ib-tag altin">Gençlik Kampı</span>
            <span class="ib-tag altin">Kültür Turu</span>
            <span class="ib-tag mavi">TDT Programı</span>
          </div>
        </div>
        <div class="ib-card-footer">
          <span class="ib-card-ortak">TDT · TÜRKSOY · Türk Akademisi</span>
          <a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="ib-card-link">Kayıt →</a>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- ═══ BÖLÜM 4: ULUSLARARASI STK İŞBİRLİĞİ ═══ -->
<div class="ib-sec">
  <div class="ib-sec-w">
    <div class="ib-sec-head">
      <div>
        <div class="ib-sec-badge yesil">🌍 Uluslararası Ağ</div>
        <div class="ib-sec-title">Uluslararası STK &amp; Kuruluş İşbirlikleri</div>
        <div class="ib-sec-sub">BM sistemi, İslam işbirliği örgütleri ve sivil toplum ağlarıyla imzalanan protokoller aracılığıyla hizmet kapasitemizi genişletiyoruz.</div>
      </div>
      <div><div class="ib-sec-cnt" style="color:#15803D">2</div><div class="ib-sec-cnt-lbl">Program</div></div>
    </div>
    <div class="ib-grid ib-g2">
      <div class="ib-card">
        <div class="ib-card-top yesil"></div>
        <div class="ib-card-icon-wrap">
          <div class="ib-card-icon yesil"><i class="fa fa-building-o"></i></div>
        </div>
        <div class="ib-card-body">
          <div class="ib-card-title">BM Sistemi ile İşbirliği</div>
          <div class="ib-card-desc">WHO, UNDP, UNOSSC, UNAOC ve UNIDO gibi BM kuruluşlarıyla sağlık, kalkınma ve insani konular alanında proje ortaklıkları geliştiriyoruz.<br><br>Türk Devletleri Teşkilatı'nın 16. İnsani Konular ve Kalkınma ile 12. Sağlık İşbirliği mekanizmaları üzerinden BM sistemine entegrasyon sağlıyoruz.</div>
          <div class="ib-card-tags">
            <span class="ib-tag yesil">WHO</span>
            <span class="ib-tag yesil">UNDP</span>
            <span class="ib-tag yesil">UNOSSC</span>
            <span class="ib-tag yesil">UNAOC</span>
            <span class="ib-tag yesil">UNIDO</span>
          </div>
        </div>
        <div class="ib-card-footer">
          <span class="ib-card-ortak">BM Sistemi · TDT ortaklığı</span>
          <a href="<?php echo esc_url(home_url('/kurumlar')); ?>" class="ib-card-link">Tüm Kurumlar →</a>
        </div>
      </div>
      <div class="ib-card">
        <div class="ib-card-top yesil"></div>
        <div class="ib-card-icon-wrap">
          <div class="ib-card-icon yesil"><i class="fa fa-handshake-o"></i></div>
        </div>
        <div class="ib-card-body">
          <div class="ib-card-title">Yerel &amp; Bölgesel STK Ortaklıkları</div>
          <div class="ib-card-desc">Türkiye'deki Harp Malulü Gaziler Derneği, Muharip Gaziler Derneği ve Türk Kızılay ile koordineli alan çalışmaları; Balkanlar ve Orta Asya'daki kardeş STK'larla hizmet ortaklıkları kuruyoruz.<br><br>Bosna, Kosova, Arnavutluk, Makedonya ve Pakistan'daki yerel STK'larla protokol bazlı işbirliği modeli.</div>
          <div class="ib-card-tags">
            <span class="ib-tag kirmizi">Harp Malulü Gaziler</span>
            <span class="ib-tag kirmizi">Muharip Gaziler</span>
            <span class="ib-tag kirmizi">Türk Kızılay</span>
            <span class="ib-tag altin">Balkan STK'ları</span>
          </div>
        </div>
        <div class="ib-card-footer">
          <span class="ib-card-ortak">13 ülke · Yerel STK ağı</span>
          <a href="<?php echo esc_url(home_url('/kurumlar')); ?>" class="ib-card-link">Tüm Ortaklar →</a>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- ═══ BÖLÜM 5: HUKUK & SAVUNUCULUK ═══ -->
<div class="ib-sec">
  <div class="ib-sec-w">
    <div class="ib-sec-head">
      <div>
        <div class="ib-sec-badge mor">⚖️ Hukuki Destek</div>
        <div class="ib-sec-title">Hukuki Savunuculuk &amp; Haklar</div>
        <div class="ib-sec-sub">Şehit yakınları ve gazilerin ulusal ve uluslararası hukuki haklarının korunması için aktif savunuculuk faaliyetleri yürütüyoruz.</div>
      </div>
      <div><div class="ib-sec-cnt" style="color:#6D28D9">2</div><div class="ib-sec-cnt-lbl">Program</div></div>
    </div>
    <div class="ib-grid ib-g2">
      <div class="ib-card">
        <div class="ib-card-top mor"></div>
        <div class="ib-card-icon-wrap">
          <div class="ib-card-icon mor"><i class="fa fa-balance-scale"></i></div>
        </div>
        <div class="ib-card-body">
          <div class="ib-card-title">Ulusal Haklar Rehberi &amp; Danışmanlık</div>
          <div class="ib-card-desc">Türkiye'deki şehit ve gazi haklarının eksiksiz kullanılması için danışmanlık hizmetleri sunuyoruz. Maaş bağlama, tazminat, konut, eğitim ve sağlık haklarında bürokratik süreç desteği sağlıyoruz.</div>
          <div class="ib-card-tags">
            <span class="ib-tag mor">Maaş Bağlama</span>
            <span class="ib-tag mor">Tazminat</span>
            <span class="ib-tag mor">Konut</span>
            <span class="ib-tag mor">Sağlık</span>
          </div>
        </div>
        <div class="ib-card-footer">
          <span class="ib-card-ortak">ASHB · SGK · Türk Barolar Birliği</span>
          <a href="<?php echo esc_url(home_url('/sehit-gazi-haklari')); ?>" class="ib-card-link">Haklar Rehberi →</a>
        </div>
      </div>
      <div class="ib-card">
        <div class="ib-card-top mor"></div>
        <div class="ib-card-icon-wrap">
          <div class="ib-card-icon mor"><i class="fa fa-flag"></i></div>
        </div>
        <div class="ib-card-body">
          <div class="ib-card-title">Uluslararası Haklar &amp; 26 Ülke Karşılaştırması</div>
          <div class="ib-card-desc">26 ülkedeki gazi ve şehit aile haklarını karşılaştırmalı biçimde belgeleyip yayınlıyoruz. Uluslararası hukuk çerçevesinde en iyi uygulamaların Türkiye ve Türk dünyasına aktarılması için savunuculuk çalışmaları yürütüyoruz.</div>
          <div class="ib-card-tags">
            <span class="ib-tag mor">26 Ülke</span>
            <span class="ib-tag mor">Karşılaştırmalı</span>
            <span class="ib-tag mavi">Uluslararası Hukuk</span>
          </div>
        </div>
        <div class="ib-card-footer">
          <span class="ib-card-ortak">OIC İnsan Hakları · OSCE</span>
          <a href="<?php echo esc_url(home_url('/uluslararasi-sehit-gazi-haklari')); ?>" class="ib-card-link">Uluslararası Haklar →</a>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- ═══ HEDEF KİTLE ═══ -->
<div class="ib-target">
  <div class="ib-target-w">
    <div style="text-align:center;margin-bottom:8px">
      <div class="ib-sec-badge kirmizi" style="display:inline-flex">🎯 Hizmet Hedefimiz</div>
    </div>
    <div style="text-align:center">
      <div class="ib-sec-title" style="text-align:center">Kime Hizmet Ediyoruz?</div>
      <div class="ib-sec-sub" style="text-align:center;margin:8px auto 0">Vakfımız tüm kaynaklarını başta Türkiye ve Türk dünyasına yönelik hizmete adamıştır.</div>
    </div>
    <div class="ib-target-grid">
      <div class="ib-target-card">
        <div class="ib-target-icon">⚔️</div>
        <div class="ib-target-title">Şehit Aileleri</div>
        <div class="ib-target-desc">Vatanı için hayatını kaybeden kahramanlarımızın eşleri, çocukları ve ana-babası. Tüm haklarına kavuşmaları için yanlarındayız.</div>
      </div>
      <div class="ib-target-card">
        <div class="ib-target-icon">🦾</div>
        <div class="ib-target-title">Gaziler</div>
        <div class="ib-target-desc">Yaralı ve engelli gazilerimizin protez, rehabilitasyon, istihdam ve sosyal uyum süreçlerini destekliyoruz.</div>
      </div>
      <div class="ib-target-card">
        <div class="ib-target-icon">🌍</div>
        <div class="ib-target-title">Türk Dünyası Mağdurları</div>
        <div class="ib-target-desc">Azerbaycan'dan Kazakistan'a, Bosna'dan Pakistan'a uzanan coğrafyada savaş ve terörden etkilenen Türk dünyası mensupları.</div>
      </div>
      <div class="ib-target-card">
        <div class="ib-target-icon">🎓</div>
        <div class="ib-target-title">Kahraman Çocukları</div>
        <div class="ib-target-desc">Şehit ve gazi ailelerinin çocuklarının eğitim hayatlarını güçlendiriyor, küresel vizyonlarını besleyen fırsatlar sunuyoruz.</div>
      </div>
    </div>
  </div>
</div>
<!-- ═══ CTA BANDI ═══ -->
<div class="ib-cta-band">
  <div class="ib-cta-inner">
    <div class="ib-cta-text">
      <h3>Birlikte Daha Güçlüyüz</h3>
      <p>Bağış ve destek süreçlerimizi şeffaflık, hesap verebilirlik ve sorumluluk ilkeleri doğrultusunda yürütmekteyiz.<br>Her katkı doğrudan ihtiyaç sahibine ulaşır · Stripe güvenceli · 501(c)(3) onaylı</p>
    </div>
    <div class="ib-cta-btns">
      <a href="<?php echo esc_url(home_url('/bagis')); ?>" class="ib-btn white">💝 Bağış Yap</a>
      <a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="ib-btn outline">📩 İşbirliği Teklifi</a>
      <a href="<?php echo esc_url(home_url('/hizmet-bolgelerimiz')); ?>" class="ib-btn outline">🗺️ Hizmet Bölgelerimiz</a>
    </div>
  </div>
</div>
</div><!-- /ib-wrap -->
<?php endif; ?>
<?php get_footer(); ?>
