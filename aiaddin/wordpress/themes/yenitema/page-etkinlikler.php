<?php
/**
 * Template Name: Etkinlikler
 * Template Post Type: page
 */
get_header();
vkv_breadcrumb();
// VKV Sayfa İçerik Sistemi:
// 1. VKV Admin Paneli'nden içerik girilmişse göster
// 2. WordPress/Elementor içeriği varsa göster  
// 3. Hiçbiri yoksa Shopify HTML'ini göster
if (have_posts()) { the_post(); }
$vkv_slug = 'etkinlikler';
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
.ph{background:linear-gradient(150deg,#1a1200 0%,#2a1e00 55%,#18060a 100%) !important}
.cal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.cal-item{background:#fff;border:1px solid var(--bd);border-radius:8px;overflow:hidden;transition:all .22s;display:flex;gap:0}
.cal-item:hover{box-shadow:0 6px 20px rgba(0,0,0,.08);border-color:var(--g)}
.cal-date{background:linear-gradient(135deg,var(--r),var(--rd));padding:16px 18px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;min-width:72px}
.cal-day{font-size:1.8rem;font-weight:800;color:#fff;line-height:1}
.cal-mon{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-top:3px}
.cal-info{padding:14px 16px;flex:1}
.cal-title{font-size:12.5px;font-weight:700;color:var(--t1);margin-bottom:4px;line-height:1.3}
.cal-loc{font-size:10.5px;color:var(--t3);display:flex;align-items:center;gap:5px}
.diaspora-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.dias-card{background:#fff;border:1px solid var(--bd);border-radius:8px;padding:20px 14px;text-align:center;transition:all .22s}
.dias-card:hover{border-color:var(--g);box-shadow:0 4px 18px rgba(0,0,0,.07)}
.dias-flag{font-size:2rem;margin-bottom:10px}
.dias-kita{font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--g);margin-bottom:4px}
.dias-name{font-size:12px;font-weight:700;color:var(--t1);margin-bottom:5px}
.dias-desc{font-size:10.5px;color:var(--t3);line-height:1.5}
.pw{font-family:var(--fn);background:var(--wh);color:var(--t1)}
@media(max-width:1100px){.cal-grid{grid-template-columns:repeat(2,1fr)}.diaspora-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:540px){.cal-grid,.diaspora-grid{grid-template-columns:1fr}}
</style>
<div class="pw">
<!-- HERO -->
<div class="ph">
  <div class="ph-w">
    <div>
      <div class="ph-ew">🟡 Etkinlikler &amp; Kültürel Köprüler</div>
      <h1 class="ph-h1">Vefa Köprüleri<em>İnşa Ediyoruz</em></h1>
      <p class="ph-desc">Vatan kahramanlarımız arasında kalıcı dostluk köprüleri kuruyoruz. Ziyaret programları, kültürel geziler ve misafirperverlik temelli organizasyonlarla <strong>kahramanlarımızın mirasını kardeş coğrafyalarımızın yarınlarına nakşediyoruz.</strong></p>
      <div class="ph-quote">
        <div class="ph-qt">"Vefa, sadece bir söz değil; <span style="color:var(--g)">bir sorumluluktur.</span>"</div>
        <div class="ph-qs">— Vatan Kahramanları Vakfı</div>
      </div>
    </div>
    <div>
      <div class="ph-stats">
        <div class="ph-si"><div class="ph-sn">5</div><div class="ph-sl">Kıta</div></div>
        <div class="ph-si"><div class="ph-sn">13</div><div class="ph-sl">Ülke</div></div>
        <div class="ph-si"><div class="ph-sn">3</div><div class="ph-sl">Program Türü</div></div>
        <div class="ph-si"><div class="ph-sn">🌍</div><div class="ph-sl">Diaspora Ağı</div></div>
        <div class="ph-si"><div class="ph-sn">🤝</div><div class="ph-sl">STK İşbirliği</div></div>
        <div class="ph-si"><div class="ph-sn">🎭</div><div class="ph-sl">Kültür Turu</div></div>
      </div>
    </div>
  </div>
</div>
<!-- NAV -->
<div class="pnav"><div class="pnav-in">
  <a href="<?php echo esc_url(home_url('/etkinlikler')); ?>" class="on">🟡 Etkinlikler</a>
  <a href="<?php echo esc_url(home_url('/insani-yardim')); ?>">🔴 İnsani Yardım</a>
  <a href="<?php echo esc_url(home_url('/burs')); ?>">🔵 Burs &amp; Eğitim</a>
  <a href="<?php echo esc_url(home_url('/uluslararasi-stk')); ?>">🟢 Uluslararası STK</a>
  <a href="<?php echo esc_url(home_url('/isbirligi')); ?>">📋 Tüm Programlar</a>
  <a href="<?php echo esc_url(home_url('/iletisim')); ?>">📩 Katıl</a>
</div></div>
<div class="pbc"><a href="/">Ana Sayfa</a> › <a href="<?php echo esc_url(home_url('/isbirligi')); ?>">İşbirliği</a> › <span>Etkinlikler &amp; Kültürel Buluşmalar</span></div>
<!-- PROGRAMLAR -->
<div class="sec">
  <div class="sec-w">
    <div class="sec-hd">
      <div class="badge g">🌍 Program Türleri</div>
      <div class="sec-title">Etkinlik &amp; Kültür Programlarımız</div>
      <div class="sec-sub">Ziyaret programları, gençlik kampları ve diaspora ağıyla kahramanlarımız arasında köprüler kuruyoruz.</div>
    </div>
    <div class="grid g3">
      <div class="card">
        <div class="card-st gold"></div>
        <div class="card-body">
          <div class="card-icon gold"><i class="fa fa-users"></i></div>
          <div class="card-title">Tanışma &amp; Kültürel Buluşmalar</div>
          <div class="card-desc">Vatan kahramanlarımız arasında köprüler kuruyoruz. Ziyaret programları, kültürel geziler ve misafirperverlik temelli organizasyonlarla kalıcı dostluk köprüleri inşa ediyoruz.</div>
          <ul class="card-list">
            <li>Yıllık gazi ailesi buluşması — Ankara</li>
            <li>Türk dünyası gazi dayanışma günleri</li>
            <li>Kardeş şehir ziyaret programları</li>
            <li>Osmanlı mirası kültür gezileri</li>
          </ul>
        </div>
        <div class="card-foot"><span class="card-lbl">Yıllık Etkinlik</span><a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="card-lnk">Katıl →</a></div>
      </div>
      <div class="card">
        <div class="card-st gold"></div>
        <div class="card-body">
          <div class="card-icon gold"><i class="fa fa-globe"></i></div>
          <div class="card-title">Diaspora &amp; Lobi Faaliyetleri</div>
          <div class="card-desc">Avrupa, Amerika, Asya, Okyanusya ve Afrika'daki Türk diasporası dernekleriyle koordineli lobi faaliyetleri. Beş kıtada Türk dünyasının sesini duyuruyoruz.</div>
          <ul class="card-list">
            <li>UETD Avrupa Türk Dernekleri koordinasyonu</li>
            <li>Amerikan-Türk Konseyi (ATC) iş birliği</li>
            <li>BM platformlarında savunuculuk</li>
            <li>Şehit ve gazi haklarının lobiciliği</li>
          </ul>
        </div>
        <div class="card-foot"><span class="card-lbl">5 Kıta · Diaspora</span><a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="card-lnk">İletişim →</a></div>
      </div>
      <div class="card">
        <div class="card-st gold"></div>
        <div class="card-body">
          <div class="card-icon gold"><i class="fa fa-calendar"></i></div>
          <div class="card-title">Gençlik Kampları &amp; Kültür Turları</div>
          <div class="card-desc">TDT Uluslararası Gençlik Kampları ve Modern İpek Yolu kültür turlarıyla gazi çocuklarına vefa kültürünü aktarıyor, Türk dünyasına ait oldukları hissini yaşatıyoruz.</div>
          <ul class="card-list">
            <li>TDT Gençlik Kampı — kontenjan desteği</li>
            <li>Modern İpek Yolu Ortak Tur Paketi</li>
            <li>Tabarruk Ziyarat programı</li>
            <li>Türk Devletleri Gençlik Festivalleri</li>
          </ul>
        </div>
        <div class="card-foot"><span class="card-lbl">TDT Ortaklığı</span><a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="card-lnk">Kayıt →</a></div>
      </div>
    </div>
  </div>
</div>
<!-- YAKLAŞAN ETKİNLİKLER -->
<div class="sec">
  <div class="sec-w">
    <div class="sec-hd">
      <div class="badge r">📅 Yaklaşan Etkinlikler</div>
      <div class="sec-title">2026 Etkinlik Takvimi</div>
      <div class="sec-sub">Katılım için önceden kayıt yaptırmanız gerekmektedir. İletişim formundan başvurabilirsiniz.</div>
    </div>
    <div class="cal-grid">
      <div class="cal-item"><div class="cal-date"><div class="cal-day">18</div><div class="cal-mon">Nis</div></div><div class="cal-info"><div class="cal-title">Çanakkale Şehitler Günü Anma Töreni</div><div class="cal-loc"><i class="fa fa-map-marker" style="color:var(--r)"></i>Çanakkale, Türkiye</div></div></div>
      <div class="cal-item"><div class="cal-date"><div class="cal-day">19</div><div class="cal-mon">May</div></div><div class="cal-info"><div class="cal-title">19 Mayıs Gençlik Yürüyüşü — Tüm İller</div><div class="cal-loc"><i class="fa fa-map-marker" style="color:var(--r)"></i>Türkiye Geneli</div></div></div>
      <div class="cal-item"><div class="cal-date"><div class="cal-day">15</div><div class="cal-mon">Haz</div></div><div class="cal-info"><div class="cal-title">Gazi Ailesi Buluşması — İstanbul Zirvesi</div><div class="cal-loc"><i class="fa fa-map-marker" style="color:var(--r)"></i>İstanbul, Türkiye</div></div></div>
      <div class="cal-item"><div class="cal-date"><div class="cal-day">20</div><div class="cal-mon">Tem</div></div><div class="cal-info"><div class="cal-title">Kıbrıs Barış Harekâtı Anma Töreni</div><div class="cal-loc"><i class="fa fa-map-marker" style="color:var(--r)"></i>Lefkoşa, KKTC</div></div></div>
      <div class="cal-item"><div class="cal-date"><div class="cal-day">3</div><div class="cal-mon">Eki</div></div><div class="cal-info"><div class="cal-title">Türk Dünyası Kültür Günleri</div><div class="cal-loc"><i class="fa fa-map-marker" style="color:var(--r)"></i>Bakü, Azerbaycan</div></div></div>
      <div class="cal-item"><div class="cal-date"><div class="cal-day">10</div><div class="cal-mon">Kas</div></div><div class="cal-info"><div class="cal-title">Atatürk'ü Anma — Vakıf Töreni</div><div class="cal-loc"><i class="fa fa-map-marker" style="color:var(--r)"></i>Ankara, Türkiye</div></div></div>
    </div>
  </div>
</div>
<!-- DİASPORA AĞI -->
<div class="sec">
  <div class="sec-w">
    <div class="sec-hd">
      <div class="badge b">🌍 Beş Kıta Ağı</div>
      <div class="sec-title">Diaspora Temsilcilikleri</div>
      <div class="sec-sub">Türk lobisi faaliyetlerimizin yürütüldüğü kıta bazlı ağımız.</div>
    </div>
    <div class="diaspora-grid">
      <div class="dias-card"><div class="dias-flag">🌍</div><div class="dias-kita">Avrupa</div><div class="dias-name">Almanya · Fransa · Hollanda</div><div class="dias-desc">UETD Avrupa Türk Dernekleri koordinasyonu ile AB parlamentosunda Türk lobisi</div></div>
      <div class="dias-card"><div class="dias-flag">🌎</div><div class="dias-kita">Amerika</div><div class="dias-name">ABD · Kanada</div><div class="dias-desc">Amerikan-Türk Konseyi ve Wyoming vakıf ofisi üzerinden Kuzey Amerika faaliyetleri</div></div>
      <div class="dias-card"><div class="dias-flag">🌏</div><div class="dias-kita">Asya</div><div class="dias-name">Azerbaycan · Kazakistan · Pakistan</div><div class="dias-desc">Bakü ofisi koordinasyonuyla Orta Asya ve Güney Asya diaspora programları</div></div>
      <div class="dias-card"><div class="dias-flag">🌐</div><div class="dias-kita">Okyanusya</div><div class="dias-name">Avustralya · Yeni Zelanda</div><div class="dias-desc">Anzak savaşları Türk-Avustralya köprüsü ve Çanakkale anma programları</div></div>
      <div class="dias-card"><div class="dias-flag">🌍</div><div class="dias-kita">Afrika</div><div class="dias-name">Kuzey Afrika · Doğu Afrika</div><div class="dias-desc">Osmanlı mirası coğrafyalarda Türk kültür ve gazi destek faaliyetleri</div></div>
    </div>
  </div>
</div>
<div class="ctaband">
  <div class="ctaband-w">
    <div class="ctaband-text"><h3>Etkinliklerimize Katılın</h3><p>Gönüllü, katılımcı veya sponsor olarak programlarımıza destek olabilirsiniz</p></div>
    <div class="ctabtns">
      <a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="pbtn wh">📩 Kayıt &amp; Başvuru</a>
      <a href="<?php echo esc_url(home_url('/bagis')); ?>" class="pbtn ol">💝 Sponsor Ol</a>
    </div>
  </div>
</div>
</div>
<?php endif; ?>
<?php get_footer(); ?>
