<?php
/**
 * Template Name: Burs ve Eğitim
 * Template Post Type: page
 */
get_header();
vkv_breadcrumb();
// VKV Sayfa İçerik Sistemi:
// 1. VKV Admin Paneli'nden içerik girilmişse göster
// 2. WordPress/Elementor içeriği varsa göster  
// 3. Hiçbiri yoksa Shopify HTML'ini göster
if (have_posts()) { the_post(); }
$vkv_slug = 'burs';
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
.ph{background:linear-gradient(150deg,#0a1628 0%,#0f2244 55%,#1a0810 100%) !important}
.ph::before{background:radial-gradient(ellipse 60% 70% at 80% 50%,rgba(29,78,216,.2) 0%,transparent 65%) !important}
.basvuru-box{background:#fff;border:1px solid var(--bd);border-radius:8px;overflow:hidden;max-width:800px;margin:0 auto}
.basvuru-head{background:linear-gradient(135deg,#1D4ED8,#1e3a8a);padding:22px 28px}
.basvuru-head h3{font-family:var(--fs);font-size:1.1rem;font-weight:700;color:#fff;margin-bottom:4px}
.basvuru-head p{font-size:12px;color:rgba(255,255,255,.6)}
.basvuru-body{padding:28px}
.fg{display:flex;flex-direction:column;gap:5px;margin-bottom:16px}
.fg label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t2)}
.fg input,.fg select,.fg textarea{border:1.5px solid var(--bd);border-radius:6px;padding:10px 14px;font-size:13px;font-family:var(--fn);outline:none;width:100%}
.fg input:focus,.fg select:focus,.fg textarea:focus{border-color:#1D4ED8}
.fg-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fg-submit{display:block;width:100%;background:#1D4ED8;color:#fff;border:none;border-radius:6px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--fn);margin-top:8px}
.fg-submit:hover{background:#1e3a8a}
.pw{font-family:var(--fn);background:var(--wh);color:var(--t1)}
@media(max-width:860px){.fg-row{grid-template-columns:1fr}}
</style>
<div class="pw">
<!-- HERO -->
<div class="ph">
  <div class="ph-w">
    <div>
      <div class="ph-ew">🎓 Eğitim &amp; Burs Programı</div>
      <h1 class="ph-h1">Kahraman Çocuklarına<em>Eğitim Desteği</em></h1>
      <p class="ph-desc">Vatan kahramanlarımızın çocuklarına yönelik <strong>burs programları, akademik mentorluk, sosyal gelişim projeleri ve uluslararası öğrenci değişim programları</strong> sunuyoruz. Kültürel etkileşim ve küresel vizyon hedefimizin merkezindedir.</p>
    </div>
    <div>
      <div class="ph-stats">
        <div class="ph-si"><div class="ph-sn">5</div><div class="ph-sl">Türk Devleti</div></div>
        <div class="ph-si"><div class="ph-sn">13</div><div class="ph-sl">Ülke Ağı</div></div>
        <div class="ph-si"><div class="ph-sn">3</div><div class="ph-sl">Program Türü</div></div>
        <div class="ph-si"><div class="ph-sn">🎓</div><div class="ph-sl">Lisans & Lisansüstü</div></div>
        <div class="ph-si"><div class="ph-sn">🌍</div><div class="ph-sl">Yurt Dışı Burs</div></div>
        <div class="ph-si"><div class="ph-sn">100%</div><div class="ph-sl">Ücretsiz</div></div>
      </div>
    </div>
  </div>
</div>
<!-- NAV -->
<div class="pnav"><div class="pnav-in">
  <a href="<?php echo esc_url(home_url('/burs')); ?>" class="on">🎓 Burs &amp; Eğitim</a>
  <a href="<?php echo esc_url(home_url('/insani-yardim')); ?>">🔴 İnsani Yardım</a>
  <a href="<?php echo esc_url(home_url('/etkinlikler')); ?>">🟡 Etkinlikler</a>
  <a href="<?php echo esc_url(home_url('/isbirligi')); ?>">📋 Tüm Programlar</a>
  <a href="<?php echo esc_url(home_url('/bagis')); ?>">💝 Bağış</a>
  <a href="<?php echo esc_url(home_url('/iletisim')); ?>">📩 Başvur</a>
</div></div>
<div class="pbc"><a href="/">Ana Sayfa</a> › <a href="<?php echo esc_url(home_url('/isbirligi')); ?>">İşbirliği</a> › <span>Burs &amp; Eğitim Programları</span></div>
<!-- PROGRAMLAR -->
<div class="sec">
  <div class="sec-w">
    <div class="sec-hd">
      <div class="badge b">🎓 Program Türleri</div>
      <div class="sec-title">Eğitim Destek Programlarımız</div>
      <div class="sec-sub">Şehit ve gazi ailelerinin çocuklarına yönelik üç temel program alanı — lisans, lisansüstü ve öğrenci değişimi.</div>
    </div>
    <div class="grid g3">
      <div class="card">
        <div class="card-st b"></div>
        <div class="card-body">
          <div class="card-icon b"><i class="fa fa-graduation-cap"></i></div>
          <div class="card-title">Lisans &amp; Lisansüstü Burs</div>
          <div class="card-desc">Türkiye, Azerbaycan, Kazakistan, Kırgızistan, Özbekistan üniversitelerinde eğitim gören şehit ve gazi çocuklarına yönelik doğrudan burs desteği.</div>
          <ul class="card-list">
            <li>Yıllık eğitim ödemesi desteği</li>
            <li>Kırtasiye ve yaşam gideri katkısı</li>
            <li>Akademik başarı teşvik ödülleri</li>
            <li>Yurt dışı lisansüstü burs seçeneği</li>
          </ul>
        </div>
        <div class="card-foot"><span class="card-lbl">5 Türk Devleti</span><a href="#basvuru" class="card-lnk">Başvur →</a></div>
      </div>
      <div class="card">
        <div class="card-st b"></div>
        <div class="card-body">
          <div class="card-icon b"><i class="fa fa-exchange"></i></div>
          <div class="card-title">Öğrenci Değişim Programları</div>
          <div class="card-desc">Vatan kahramanlarımızın çocuklarına yönelik uluslararası öğrenci değişim projeleriyle kültürel etkileşim ve küresel vizyon destekleniyor. TDT Orhun Programı entegrasyonu.</div>
          <ul class="card-list">
            <li>Türk dünyasında öğrenci plasman</li>
            <li>Macaristan ve Balkan üniversiteleri</li>
            <li>Dil eğitimi ve kültürel oryantasyon</li>
            <li>Gazi ailesi öncelikli kontenjan</li>
          </ul>
        </div>
        <div class="card-foot"><span class="card-lbl">TDT Orhun Programı</span><a href="#basvuru" class="card-lnk">Başvur →</a></div>
      </div>
      <div class="card">
        <div class="card-st b"></div>
        <div class="card-body">
          <div class="card-icon b"><i class="fa fa-user-graduate" style="font-size:1.2rem"></i></div>
          <div class="card-title">Akademik Mentorluk Programı</div>
          <div class="card-desc">Eğitim hayatlarını güçlendirmek amacıyla akademik mentorluk ve sosyal gelişim projeleri. Kariyer danışmanlığı ve liderlik geliştirme.</div>
          <ul class="card-list">
            <li>Birebir mentor eşleştirme sistemi</li>
            <li>Kariyer planlaması ve danışmanlık</li>
            <li>Liderlik ve kişisel gelişim atölyeleri</li>
            <li>Alumni ağı — mezun öğrenci topluluğu</li>
          </ul>
        </div>
        <div class="card-foot"><span class="card-lbl">Mentorluk Ağı</span><a href="#basvuru" class="card-lnk">Başvur →</a></div>
      </div>
    </div>
  </div>
</div>
<!-- DEĞİŞİM ÜLKELERİ -->
<div class="sec">
  <div class="sec-w">
    <div class="sec-hd">
      <div class="badge g">🌍 Değişim Ağı</div>
      <div class="sec-title">Hangi Ülkelerde Program Var?</div>
      <div class="sec-sub">Türk devletleri ve dost ülkelerdeki üniversiteler ile imzalanan protokoller çerçevesinde öğrenci plasman hizmeti.</div>
    </div>
    <div class="grid g4">
      <div class="card"><div class="card-st gold"></div><div class="card-body"><div style="font-size:2rem;margin-bottom:10px">🇹🇷</div><div class="card-title">Türkiye</div><div class="card-desc">Ankara, İstanbul, İzmir başta olmak üzere 81 ilde devlet ve vakıf üniversitelerinde burs ve plasman imkânı.</div></div></div>
      <div class="card"><div class="card-st gold"></div><div class="card-body"><div style="font-size:2rem;margin-bottom:10px">🇦🇿</div><div class="card-title">Azerbaycan</div><div class="card-desc">Bakü Devlet Üniversitesi ve Azerbaycan Teknik Üniversitesi'nde öğrenci değişim kontenjanı.</div></div></div>
      <div class="card"><div class="card-st gold"></div><div class="card-body"><div style="font-size:2rem;margin-bottom:10px">🇰🇿</div><div class="card-title">Kazakistan</div><div class="card-desc">Astana ve Almatı'daki önde gelen üniversitelerde akademik değişim programı. Türk Akademisi iş birliği.</div></div></div>
      <div class="card"><div class="card-st gold"></div><div class="card-body"><div style="font-size:2rem;margin-bottom:10px">🇰🇬</div><div class="card-title">Kırgızistan</div><div class="card-desc">Bişkek Manas Üniversitesi'nde Türkçe eğitim veren bölümlerde öğrenci değişimi.</div></div></div>
      <div class="card"><div class="card-st gold"></div><div class="card-body"><div style="font-size:2rem;margin-bottom:10px">🇺🇿</div><div class="card-title">Özbekistan</div><div class="card-desc">Taşkent Türk-Özbek Eğitim Üniversitesi ve Samarkand devlet üniversitelerinde burs imkânı.</div></div></div>
      <div class="card"><div class="card-st gold"></div><div class="card-body"><div style="font-size:2rem;margin-bottom:10px">🇭🇺</div><div class="card-title">Macaristan</div><div class="card-desc">Budapeşte üniversitelerinde yüksek lisans ve doktora burs programı. AB ortamlı akademik deneyim.</div></div></div>
      <div class="card"><div class="card-st gold"></div><div class="card-body"><div style="font-size:2rem;margin-bottom:10px">🇧🇦</div><div class="card-title">Bosna Hersek</div><div class="card-desc">Saraybosna Üniversitesi'nde Balkan perspektifli sosyal bilimler alanında değişim programı.</div></div></div>
      <div class="card"><div class="card-st gold"></div><div class="card-body"><div style="font-size:2rem;margin-bottom:10px">🇵🇰</div><div class="card-title">Pakistan</div><div class="card-desc">İslamabad ve Karaçi üniversitelerinde mühendislik ve tıp alanlarında öğrenci değişim imkânı.</div></div></div>
    </div>
  </div>
</div>
<!-- BAŞVURU -->
<div class="sec" id="basvuru">
  <div class="sec-w">
    <div class="sec-hd">
      <div class="badge r">📝 Başvuru</div>
      <div class="sec-title">Burs Başvurusu Yapın</div>
      <div class="sec-sub">Şehit veya gazi ailesine mensup olduğunuzu belgeleyerek başvurunuzu iletebilirsiniz.</div>
    </div>
    <div class="basvuru-box">
      <div class="basvuru-head">
        <h3>🎓 Burs &amp; Değişim Başvuru Formu</h3>
        <p>Formunuz en kısa sürede incelenerek geri dönüş yapılacaktır</p>
      </div>
      <div class="basvuru-body">
        <div class="fg-row">
          <div class="fg"><label>Ad Soyad *</label><input type="text" placeholder="Adınız Soyadınız"></div>
          <div class="fg"><label>T.C. Kimlik No *</label><input type="text" placeholder="___________"></div>
        </div>
        <div class="fg-row">
          <div class="fg"><label>E-posta *</label><input type="email" placeholder="ornek@mail.com"></div>
          <div class="fg"><label>Telefon *</label><input type="tel" placeholder="+90 5__ ___ __ __"></div>
        </div>
        <div class="fg-row">
          <div class="fg"><label>Başvuru Türü *</label>
            <select>
              <option value="">Seçiniz...</option>
              <option>Lisans Bursu</option>
              <option>Lisansüstü Bursu</option>
              <option>Öğrenci Değişim Programı</option>
              <option>Akademik Mentorluk</option>
            </select>
          </div>
          <div class="fg"><label>Şehit/Gazi Yakınlığı *</label>
            <select>
              <option value="">Seçiniz...</option>
              <option>Şehidin Çocuğu</option>
              <option>Şehidin Eşi</option>
              <option>Gazinin Çocuğu</option>
              <option>Gazinin Kendisi</option>
            </select>
          </div>
        </div>
        <div class="fg"><label>Başvuru Notunuz</label><textarea rows="4" placeholder="Eğitim durumunuz, hedefleriniz ve destekten nasıl yararlanacağınızı kısaca açıklayın..."></textarea></div>
        <button class="fg-submit" onclick="this.textContent='✓ Başvurunuz Alındı';this.style.background='#15803D';setTimeout(()=>{this.textContent='Başvur →';this.style.background='#1D4ED8'},3000)">Başvur →</button>
      </div>
    </div>
  </div>
</div>
<!-- CTA -->
<div class="ctaband">
  <div class="ctaband-w">
    <div class="ctaband-text"><h3>Eğitim Desteklerimizi Güçlendirin</h3><p>Her burs katkısı bir kahraman çocuğunun geleceğine yatırımdır · Stripe güvenceli · 501(c)(3) onaylı</p></div>
    <div class="ctabtns">
      <a href="<?php echo esc_url(home_url('/bagis')); ?>" class="pbtn wh">💝 Bağış Yap</a>
      <a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="pbtn ol">📩 İletişim</a>
    </div>
  </div>
</div>
</div>
<?php endif; ?>
<?php get_footer(); ?>
