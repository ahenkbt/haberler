<?php
/**
 * Template Name: Hizmet Bölgelerimiz
 * Template Post Type: page
 */
get_header();
vkv_breadcrumb();
// VKV Sayfa İçerik Sistemi:
// 1. VKV Admin Paneli'nden içerik girilmişse göster
// 2. WordPress/Elementor içeriği varsa göster  
// 3. Hiçbiri yoksa Shopify HTML'ini göster
if (have_posts()) { the_post(); }
$vkv_slug = 'hizmet-bolgesi';
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
/* HERO */
.hero{width:100%;background:linear-gradient(150deg,var(--dk) 0%,var(--dk2) 55%,#18060a 100%);padding:64px 40px 56px;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 70% at 80% 50%,rgba(140,26,46,.22) 0%,transparent 65%)}
.hero-inner{max-width:var(--w);margin:0 auto;display:grid;grid-template-columns:1.4fr 1fr;gap:60px;align-items:center;position:relative;z-index:1}
.hero-eyebrow{display:inline-flex;align-items:center;gap:7px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:var(--g);font-size:9.5px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:18px}
.hero h1{font-family:var(--fs);font-size:clamp(1.8rem,3vw,2.8rem);font-weight:700;color:#fff;line-height:1.15;margin-bottom:14px}
.hero h1 em{color:var(--g);font-style:italic;display:block}
.hero-desc{font-size:13.5px;color:rgba(255,255,255,.5);line-height:1.85;max-width:500px}
.hero-desc strong{color:rgba(255,255,255,.75)}
/* STAT GRID */
.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.07);border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,.07)}
.stat-item{background:rgba(255,255,255,.04);padding:18px 20px;text-align:center;transition:background .2s}
.stat-item:hover{background:rgba(255,255,255,.07)}
.stat-num{font-size:1.8rem;font-weight:800;color:var(--g);line-height:1;margin-bottom:3px}
.stat-lbl{font-size:8.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.35)}
.stat-note{font-size:10px;color:rgba(255,255,255,.25);margin-top:3px}
/* KITA BANDI */
.kita-band{background:var(--dk2);border-top:1px solid rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.05);padding:0 40px}
.kita-inner{max-width:var(--w);margin:0 auto;display:flex;align-items:center;overflow-x:auto;scrollbar-width:none}
.kita-inner::-webkit-scrollbar{display:none}
.kita-item{padding:14px 22px;font-size:10.5px;font-weight:700;color:rgba(255,255,255,.35);white-space:nowrap;border-right:1px solid rgba(255,255,255,.06);letter-spacing:.8px;text-transform:uppercase;transition:color .2s;cursor:default;flex-shrink:0}
.kita-item:hover{color:var(--g)}
/* SECTION */
.sec{width:100%;padding:52px 40px}
.sec:nth-child(even){background:var(--gr)}
.sec-w{max-width:var(--w);margin:0 auto}
.sec-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:32px;padding-bottom:18px;border-bottom:2px solid var(--bd);gap:20px;flex-wrap:wrap}
.sh-left{flex:1}
.sh-right{text-align:right}
.sh-title{font-family:var(--fs);font-size:1.5rem;font-weight:700;color:var(--t1);margin-bottom:6px}
.sh-sub{font-size:13px;color:var(--t3);line-height:1.7;max-width:600px}
.sh-cnt{font-size:2.6rem;font-weight:800;color:var(--r);line-height:1}
.sh-cnt.goz{color:#1D4ED8}
.sh-cnt.dost{color:#15803D}
.sh-label{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3)}
/* ÜLKE GRID */
.ugrid{display:grid;gap:20px}
.g3{grid-template-columns:repeat(3,1fr)}
.g5{grid-template-columns:repeat(5,1fr)}
/* ÜLKE KARTI */
.uc{background:#fff;border:1px solid var(--bd);border-radius:8px;overflow:hidden;transition:all .22s}
.uc:hover{box-shadow:0 8px 32px rgba(0,0,0,.1);transform:translateY(-2px)}
.uc-strip{height:5px}
.uc-strip.uye{background:linear-gradient(90deg,var(--r),#c0392b)}
.uc-strip.goz{background:linear-gradient(90deg,#1D4ED8,#60a5fa)}
.uc-strip.mil{background:linear-gradient(90deg,#15803D,#22c55e)}
.uc-strip.nato{background:linear-gradient(90deg,#1D4ED8,#003580)}
.uc-strip.turk{background:linear-gradient(90deg,var(--r),var(--g))}
.uc-strip.dost{background:linear-gradient(90deg,#15803D,#22c55e)}
.uc-head{padding:18px 18px 12px;display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--bd)}
.uc-flag{font-size:2.2rem;flex-shrink:0}
.uc-name{font-family:var(--fs);font-size:1rem;font-weight:700;color:var(--t1);margin-bottom:3px;line-height:1.3}
.uc-official{font-size:10px;color:var(--t3)}
.uc-tags{display:flex;flex-wrap:wrap;gap:5px;padding:10px 18px 0}
.tag{display:inline-flex;align-items:center;gap:4px;font-size:8.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:3px 8px;border-radius:20px;border:1px solid}
.tag.uye{background:var(--rl);color:var(--r);border-color:rgba(140,26,46,.2)}
.tag.goz{background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE}
.tag.mil{background:#F0FDF4;color:#15803D;border-color:#BBF7D0}
.tag.nato{background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE}
.tag.dost{background:#F0FDF4;color:#15803D;border-color:#BBF7D0}
.uc-meta{display:grid;grid-template-columns:1fr 1fr;gap:0;padding:12px 18px;border-bottom:1px solid var(--bd);background:var(--gr)}
.mi{display:flex;flex-direction:column;gap:2px;padding:6px 0;border-right:1px solid var(--bd)}
.mi:nth-child(even){padding-left:12px;border-right:none}
.mi:nth-child(odd){border-right:1px solid var(--bd)}
.mi-l{font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--t3)}
.mi-v{font-size:11px;font-weight:600;color:var(--t1)}
.uc-desc{padding:12px 18px;font-size:11.5px;color:var(--t2);line-height:1.7;border-bottom:1px solid var(--bd)}
.uc-links{padding:10px 18px;display:flex;flex-wrap:wrap;gap:6px}
.ll{display:inline-flex;align-items:center;gap:4px;font-size:9.5px;font-weight:700;color:var(--r);border:1px solid rgba(140,26,46,.2);background:rgba(140,26,46,.05);border-radius:4px;padding:4px 8px;text-decoration:none;transition:all .2s}
.ll:hover{background:var(--r);color:#fff;border-color:var(--r)}
.ico{font-size:.85rem}
.lrow{display:flex;flex-wrap:wrap;gap:5px;padding:0 18px 12px}
.lnk{display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:600;color:var(--t2);border:1px solid var(--bd);border-radius:3px;padding:3px 7px;text-decoration:none;background:#fff;transition:all .2s}
.lnk:hover{border-color:var(--r);color:var(--r)}
/* RESPONSIVE */
@media(max-width:1200px){.g3,.g5{grid-template-columns:repeat(2,1fr)}}
@media(max-width:860px){
  .hero-inner{grid-template-columns:1fr;gap:32px}
  .stat-grid{grid-template-columns:repeat(3,1fr)}
  .g3,.g5{grid-template-columns:repeat(2,1fr)}
  .sec,.hero,.kita-band{padding:40px 24px}
}
@media(max-width:540px){.g3,.g5{grid-template-columns:1fr}.stat-grid{grid-template-columns:repeat(2,1fr)}}
</style>
<!-- ═══ HERO ═══ -->
<div class="hero">
  <div class="hero-inner">
    <div>
      <div class="hero-eyebrow">🗺️ Küresel Hizmet Ağı</div>
      <h1>Vatan Kahramanları Vakfı<em>Hizmet Bölgesi</em></h1>
      <p class="hero-desc">
        Vakfımız; Türk dünyası ve müttefik coğrafyalarda insani yardım, eğitim ve gazi destek hizmetlerinin yanı sıra, savaş ve terör mağdurlarına medikal destek sunan, <strong>uluslararası kamu yararına</strong> çalışan bir kuruluştur.
        <br><br>
        <strong>Beş kıtada faaliyet gösteren kurumsal ağımızla</strong> Türk lobisini temsil ediyor; kahramanlarımıza sahip çıkma sorumluluğumuzu <strong>"vefa"</strong> ilkesiyle yerine getiriyoruz.
      </p>
    </div>
    <div>
      <div class="stat-grid">
        <div class="stat-item"><div class="stat-num">13</div><div class="stat-lbl">Ülke</div><div class="stat-note">Aktif faaliyet</div></div>
        <div class="stat-item"><div class="stat-num">5</div><div class="stat-lbl">Kıta</div><div class="stat-note">Türk lobisi</div></div>
        <div class="stat-item"><div class="stat-item"><div class="stat-num">501<small style="font-size:1.2rem">c3</small></div><div class="stat-lbl">Statü</div><div class="stat-note">Uluslararası vakıf</div></div></div>
        <div class="stat-item"><div class="stat-num">5</div><div class="stat-lbl">TDT Üyesi</div><div class="stat-note">Türk dünyası</div></div>
        <div class="stat-item"><div class="stat-num">3</div><div class="stat-lbl">Gözlemci</div><div class="stat-note">TDT ortağı</div></div>
        <div class="stat-item"><div class="stat-num">5</div><div class="stat-lbl">Dost Ülke</div><div class="stat-note">Müttefik ağ</div></div>
      </div>
    </div>
  </div>
</div>
<!-- ═══ KITA BANDI ═══ -->
<div class="kita-band">
  <div class="kita-inner">
    <div class="kita-item"><span class="ico">🌍</span>Avrupa</div>
    <div class="kita-item"><span class="ico">🌏</span>Asya</div>
    <div class="kita-item"><span class="ico">🌎</span>Amerika</div>
    <div class="kita-item"><span class="ico">🌐</span>Okyanusya</div>
    <div class="kita-item"><span class="ico">🌍</span>Afrika</div>
    <div class="kita-item" style="margin-left:auto;font-size:10px;letter-spacing:.5px;opacity:.4">Kaynak: turkicstates.org</div>
  </div>
</div>
<!-- ═══ BÖLÜM 1: TDT TAM ÜYELERİ ═══ -->
<div class="sec">
  <div class="sec-w">
    <div class="sec-head">
      <div class="sh-left">
        <div class="sh-title">Türk Devletleri Teşkilatı — Üye Devletler</div>
        <div class="sh-sub">Ortak Türk dili, tarihi ve kültürüyle bağlı beş devlet — Vakfımızın birincil hizmet coğrafyası.</div>
      </div>
      <div class="sh-right"><div class="sh-cnt uye">5</div><div class="sh-label">Tam Üye</div></div>
    </div>
    <div class="ugrid g5">
      <!-- TÜRKİYE -->
      <div class="uc uye">
        <div class="uc-strip"></div>
        <div class="uc-head">
          <div class="uc-flag">🇹🇷</div>
          <div>
            <div class="uc-name">Türkiye</div>
            <div class="uc-official">Türkiye Cumhuriyeti</div>
            <div class="uc-tags"><span class="tag turk">Türk Devleti</span></div>
          </div>
        </div>
        <div class="uc-meta">
          <div class="mi"><div class="mi-l">Başkent</div><div class="mi-v">Ankara</div></div>
          <div class="mi"><div class="mi-l">Nüfus</div><div class="mi-v">~85,3 M</div></div>
          <div class="mi"><div class="mi-l">Yüzölçümü</div><div class="mi-v">783.356 km²</div></div>
          <div class="mi"><div class="mi-l">Para Birimi</div><div class="mi-v">₺ Türk Lirası</div></div>
        </div>
        <div class="uc-desc">Vakfımız Türkiye genelinde aktif işbirliği yaptığı sivil toplum kuruluşları ağıyla şehit yakınları ve gazilere maaş, konut, eğitim, sağlık ve sosyal destek hizmetleri alanında destek sunmaktadır. Vakfımız tüm kaynaklarını başta Türkiye ve Türk dünyasına yönelik hizmete adamıştır.</div>
        <div class="uc-links">
          <div><div class="ll">🏛️ Yürütme &amp; Yasama</div>
          <div class="lrow">
            <a href="https://www.tccb.gov.tr" target="_blank" class="lnk">🇹🇷 Cumhurbaşkanlığı</a>
            <a href="https://www.tbmm.gov.tr" target="_blank" class="lnk">📜 TBMM</a>
            <a href="https://www.aile.gov.tr" target="_blank" class="lnk">👨‍👩‍👧 ASHB</a>
            <a href="https://www.sgk.gov.tr" target="_blank" class="lnk">📋 SGK</a>
            <a href="https://www.icisleri.gov.tr" target="_blank" class="lnk">🔏 İçişleri</a>
          </div></div>
          <div><div class="ll">⚔️ Silahlı Kuvvetler &amp; Emniyet</div>
          <div class="lrow">
            <a href="https://www.msb.gov.tr" target="_blank" class="lnk mil">⭐ MSB/Genelkurmay</a>
            <a href="https://www.kkk.tsk.tr" target="_blank" class="lnk mil">🛡️ Kara Kuvvetleri</a>
            <a href="https://www.hvkk.tsk.tr" target="_blank" class="lnk mil">✈️ Hava Kuvvetleri</a>
            <a href="https://www.dzkk.tsk.tr" target="_blank" class="lnk mil">⚓ Deniz Kuvvetleri</a>
            <a href="https://www.jandarma.gov.tr" target="_blank" class="lnk mil">🦅 Jandarma</a>
            <a href="https://www.egm.gov.tr" target="_blank" class="lnk mil">👮 Emniyet</a>
          </div></div>
        </div>
      </div>
      <!-- AZERBAYCAN -->
      <div class="uc uye">
        <div class="uc-strip"></div>
        <div class="uc-head">
          <div class="uc-flag">🇦🇿</div>
          <div>
            <div class="uc-name">Azerbaycan</div>
            <div class="uc-official">Azerbaycan Cumhuriyeti</div>
            <div class="uc-tags"><span class="tag turk">Türk Devleti</span></div>
          </div>
        </div>
        <div class="uc-meta">
          <div class="mi"><div class="mi-l">Başkent</div><div class="mi-v">Bakü</div></div>
          <div class="mi"><div class="mi-l">Nüfus</div><div class="mi-v">~10,2 M</div></div>
          <div class="mi"><div class="mi-l">Yüzölçümü</div><div class="mi-v">86.600 km²</div></div>
          <div class="mi"><div class="mi-l">Para Birimi</div><div class="mi-v">₼ Manat</div></div>
        </div>
        <div class="uc-desc">Kafkasya'nın kapısı, Hazar kıyısı enerji devleti. 2020'de Karabağ'ı yeniden kazandı. Türkiye ile "tek millet iki devlet" anlayışı. TÜRKPA ve Türk Kültür ve Miras Vakfı Bakü'de konuşlanmıştır. Bakü'de uluslararası gazi kuruluşuyla aktif iş birliğimiz mevcuttur.</div>
        <div class="uc-links">
          <div><div class="ll">🏛️ Yürütme &amp; Yasama</div>
          <div class="lrow">
            <a href="https://president.az/az" target="_blank" class="lnk">🇦🇿 Cumhurbaşkanlığı</a>
            <a href="https://www.cabmin.gov.az" target="_blank" class="lnk">🏛️ Bakanlar Kurulu</a>
            <a href="https://www.meclis.gov.az" target="_blank" class="lnk">📜 Milli Meclis</a>
          </div></div>
          <div><div class="ll">⚔️ Silahlı Kuvvetler &amp; Emniyet</div>
          <div class="lrow">
            <a href="https://mod.gov.az" target="_blank" class="lnk mil">⭐ Savunma Bak.</a>
            <a href="https://mia.gov.az" target="_blank" class="lnk mil">👮 İçişleri Bak.</a>
            <a href="https://scns.gov.az" target="_blank" class="lnk mil">🔐 Güvenlik Servisi</a>
          </div></div>
        </div>
      </div>
      <!-- KAZAKİSTAN -->
      <div class="uc uye">
        <div class="uc-strip"></div>
        <div class="uc-head">
          <div class="uc-flag">🇰🇿</div>
          <div>
            <div class="uc-name">Kazakistan</div>
            <div class="uc-official">Kazakistan Cumhuriyeti</div>
            <div class="uc-tags"><span class="tag turk">Türk Devleti</span></div>
          </div>
        </div>
        <div class="uc-meta">
          <div class="mi"><div class="mi-l">Başkent</div><div class="mi-v">Astana</div></div>
          <div class="mi"><div class="mi-l">Nüfus</div><div class="mi-v">~20,5 M</div></div>
          <div class="mi"><div class="mi-l">Yüzölçümü</div><div class="mi-v">2.724.900 km²</div></div>
          <div class="mi"><div class="mi-l">Para Birimi</div><div class="mi-v">₸ Tenge</div></div>
        </div>
        <div class="uc-desc">Dünyanın 9. büyük ülkesi; Türk ve Müslüman devletlerin en büyüğü. Zengin doğal kaynakları ve büyüyen ekonomisiyle Orta Asya'nın lokomotifi. Türk Akademisi başkent Astana'da faaliyet göstermektedir.</div>
        <div class="uc-links">
          <div><div class="ll">🏛️ Yürütme &amp; Yasama</div>
          <div class="lrow">
            <a href="https://www.akorda.kz" target="_blank" class="lnk">🇰🇿 Cumhurbaşkanlığı</a>
            <a href="https://www.gov.kz" target="_blank" class="lnk">🏛️ Hükümet</a>
            <a href="https://www.parlam.kz" target="_blank" class="lnk">📜 Parlamento</a>
          </div></div>
          <div><div class="ll">⚔️ Silahlı Kuvvetler &amp; Emniyet</div>
          <div class="lrow">
            <a href="https://www.mod.gov.kz" target="_blank" class="lnk mil">⭐ Savunma Bak.</a>
            <a href="https://www.mia.gov.kz" target="_blank" class="lnk mil">👮 İçişleri Bak.</a>
            <a href="https://www.knb.gov.kz" target="_blank" class="lnk mil">🔐 Güvenlik Komitesi</a>
          </div></div>
        </div>
      </div>
      <!-- KIRGIZİSTAN -->
      <div class="uc uye">
        <div class="uc-strip"></div>
        <div class="uc-head">
          <div class="uc-flag">🇰🇬</div>
          <div>
            <div class="uc-name">Kırgızistan</div>
            <div class="uc-official">Kırgız Cumhuriyeti</div>
            <div class="uc-tags"><span class="tag turk">Türk Devleti</span></div>
          </div>
        </div>
        <div class="uc-meta">
          <div class="mi"><div class="mi-l">Başkent</div><div class="mi-v">Bişkek</div></div>
          <div class="mi"><div class="mi-l">Nüfus</div><div class="mi-v">~7,2 M</div></div>
          <div class="mi"><div class="mi-l">Yüzölçümü</div><div class="mi-v">199.951 km²</div></div>
          <div class="mi"><div class="mi-l">Para Birimi</div><div class="mi-v">Kırgız Somu</div></div>
        </div>
        <div class="uc-desc">Tian Shan dağlarının ülkesi, İpek Yolu kavşağı. UNESCO listesindeki Manas Destanı anavatanı. Bişkek'te düzenlenen TDT 2. Zirvesi'nde Türk Akademisi uluslararası statü kazandı.</div>
        <div class="uc-links">
          <div><div class="ll">🏛️ Yürütme &amp; Yasama</div>
          <div class="lrow">
            <a href="https://www.president.kg" target="_blank" class="lnk">🇰🇬 Cumhurbaşkanlığı</a>
            <a href="https://www.gov.kg" target="_blank" class="lnk">🏛️ Kabine</a>
            <a href="https://www.kenesh.kg" target="_blank" class="lnk">📜 Jogorku Keneş</a>
          </div></div>
          <div><div class="ll">⚔️ Silahlı Kuvvetler &amp; Emniyet</div>
          <div class="lrow">
            <a href="https://www.mil.kg" target="_blank" class="lnk mil">⭐ Savunma Bak.</a>
            <a href="https://www.mvd.gov.kg" target="_blank" class="lnk mil">👮 İçişleri Bak.</a>
            <a href="https://www.gknb.gov.kg" target="_blank" class="lnk mil">🔐 Güvenlik Komitesi</a>
          </div></div>
        </div>
      </div>
      <!-- ÖZBEKİSTAN -->
      <div class="uc uye">
        <div class="uc-strip"></div>
        <div class="uc-head">
          <div class="uc-flag">🇺🇿</div>
          <div>
            <div class="uc-name">Özbekistan</div>
            <div class="uc-official">Özbekistan Cumhuriyeti</div>
            <div class="uc-tags"><span class="tag turk">Türk Devleti</span></div>
          </div>
        </div>
        <div class="uc-meta">
          <div class="mi"><div class="mi-l">Başkent</div><div class="mi-v">Taşkent</div></div>
          <div class="mi"><div class="mi-l">Nüfus</div><div class="mi-v">~37 M</div></div>
          <div class="mi"><div class="mi-l">Yüzölçümü</div><div class="mi-v">447.400 km²</div></div>
          <div class="mi"><div class="mi-l">Para Birimi</div><div class="mi-v">Özbekistan Somu</div></div>
        </div>
        <div class="uc-desc">Orta Asya'nın en kalabalık ülkesi. Semerkant, Buhara ve Hive — Türk-İslam medeniyetinin efsanevi şehirleri. Timur İmparatorluğu mirası. 9. TDT Zirvesi Semerkant'ta düzenlendi.</div>
        <div class="uc-links">
          <div><div class="ll">🏛️ Yürütme &amp; Yasama</div>
          <div class="lrow">
            <a href="https://president.uz" target="_blank" class="lnk">🇺🇿 Cumhurbaşkanlığı</a>
            <a href="https://gov.uz" target="_blank" class="lnk">🏛️ Hükümet</a>
            <a href="https://parliament.gov.uz" target="_blank" class="lnk">📜 Oliy Majlis</a>
          </div></div>
          <div><div class="ll">⚔️ Silahlı Kuvvetler &amp; Emniyet</div>
          <div class="lrow">
            <a href="https://www.mod.uz" target="_blank" class="lnk mil">⭐ Savunma Bak.</a>
            <a href="https://www.mvd.uz" target="_blank" class="lnk mil">👮 İçişleri Bak.</a>
            <a href="https://www.sns.gov.uz" target="_blank" class="lnk mil">🔐 Güvenlik Servisi</a>
          </div></div>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- ═══ BÖLÜM 2: TDT GÖZLEMCİLERİ ═══ -->
<div class="sec">
  <div class="sec-w">
    <div class="sec-head">
      <div class="sh-left">
        <div class="sh-title">TDT Gözlemci Devletler</div>
        <div class="sh-sub">Türk Devletleri Teşkilatı'na gözlemci statüsünde katılan devletler — Türk dünyasının genişleyen diplomatik çevresi.</div>
      </div>
      <div class="sh-right"><div class="sh-cnt goz">3</div><div class="sh-label">Gözlemci</div></div>
    </div>
    <div class="ugrid g3">
      <!-- TÜRKMENİSTAN -->
      <div class="uc goz">
        <div class="uc-strip"></div>
        <div class="uc-head">
          <div class="uc-flag">🇹🇲</div>
          <div>
            <div class="uc-name">Türkmenistan</div>
            <div class="uc-official">Türkmenistan</div>
            <div class="uc-tags"><span class="tag turk">Türk Devleti</span></div>
          </div>
        </div>
        <div class="uc-meta">
          <div class="mi"><div class="mi-l">Başkent</div><div class="mi-v">Aşkabat</div></div>
          <div class="mi"><div class="mi-l">Nüfus</div><div class="mi-v">~6,1 M</div></div>
          <div class="mi"><div class="mi-l">Yüzölçümü</div><div class="mi-v">488.100 km²</div></div>
          <div class="mi"><div class="mi-l">Para Birimi</div><div class="mi-v">Türkmen Manatı</div></div>
        </div>
        <div class="uc-desc">Orta Asya'nın enerji devi; dünyanın en büyük doğalgaz rezervlerinden birine sahip. BM tarafından tanınan kalıcı tarafsızlık politikasıyla öne çıkar. Karakum Çölü ülke topraklarının büyük bölümünü kaplar. Türk dünyasıyla derin kültürel ve dilsel bağlar mevcuttur.</div>
        <div class="uc-links">
          <div><div class="ll">🏛️ Yürütme &amp; Yasama</div>
          <div class="lrow">
            <a href="https://www.turkmenistan.gov.tm" target="_blank" class="lnk">🇹🇲 Cumhurbaşkanlığı</a>
            <a href="https://www.mfa.gov.tm" target="_blank" class="lnk">🌐 Dışişleri Bak.</a>
            <a href="https://www.mejlis.gov.tm" target="_blank" class="lnk">📜 Mejlis</a>
          </div></div>
          <div><div class="ll">⚔️ Silahlı Kuvvetler &amp; Emniyet</div>
          <div class="lrow">
            <a href="https://www.turkmenistan.gov.tm" target="_blank" class="lnk mil">⭐ Savunma (Portal)</a>
            <a href="https://www.mia.gov.tm" target="_blank" class="lnk mil">👮 İçişleri Bak.</a>
          </div></div>
        </div>
      </div>
      <!-- MACARİSTAN -->
      <div class="uc goz">
        <div class="uc-strip"></div>
        <div class="uc-head">
          <div class="uc-flag">🇭🇺</div>
          <div>
            <div class="uc-name">Macaristan</div>
            <div class="uc-official">Macaristan</div>
            <div class="uc-tags"><span class="tag dost">AB Üyesi</span><span class="tag nato">NATO</span></div>
          </div>
        </div>
        <div class="uc-meta">
          <div class="mi"><div class="mi-l">Başkent</div><div class="mi-v">Budapeşte</div></div>
          <div class="mi"><div class="mi-l">Nüfus</div><div class="mi-v">~9,7 M</div></div>
          <div class="mi"><div class="mi-l">Yüzölçümü</div><div class="mi-v">93.028 km²</div></div>
          <div class="mi"><div class="mi-l">Para Birimi</div><div class="mi-v">Forint (Ft)</div></div>
        </div>
        <div class="uc-desc">Hunlardan ve Ural-Altay dil ailesinden köklenen tarihi Avrupa ülkesi. "Doğuya Açılım" politikasıyla AB ile Türk dünyası arasında stratejik köprü. Türkiye ile derinleşen stratejik ortaklık sürmektedir.</div>
        <div class="uc-links">
          <div><div class="ll">🏛️ Yürütme &amp; Yasama</div>
          <div class="lrow">
            <a href="https://www.keh.hu" target="_blank" class="lnk">🇭🇺 Cumhurbaşkanlığı</a>
            <a href="https://www.kormany.hu" target="_blank" class="lnk">🏛️ Başbakanlık</a>
            <a href="https://www.parlament.hu" target="_blank" class="lnk">📜 Parlamento</a>
          </div></div>
          <div><div class="ll">⚔️ Silahlı Kuvvetler &amp; Emniyet</div>
          <div class="lrow">
            <a href="https://www.honvedelem.hu" target="_blank" class="lnk mil">⭐ Savunma Bak.</a>
            <a href="https://www.police.hu" target="_blank" class="lnk mil">👮 Polis Gn. Md.</a>
            <a href="https://www.nbh.hu" target="_blank" class="lnk mil">🔐 Ulusal Güvenlik</a>
          </div></div>
        </div>
      </div>
      <!-- KKTC -->
      <div class="uc goz">
        <div class="uc-strip"></div>
        <div class="uc-head">
          <div class="uc-flag">🇨🇾</div>
          <div>
            <div class="uc-name">Kuzey Kıbrıs Türk Cumhuriyeti</div>
            <div class="uc-official">KKTC</div>
            <div class="uc-tags"><span class="tag turk">Türk Devleti</span></div>
          </div>
        </div>
        <div class="uc-meta">
          <div class="mi"><div class="mi-l">Başkent</div><div class="mi-v">Lefkoşa</div></div>
          <div class="mi"><div class="mi-l">Nüfus</div><div class="mi-v">~400.000</div></div>
          <div class="mi"><div class="mi-l">Yüzölçümü</div><div class="mi-v">3.355 km²</div></div>
          <div class="mi"><div class="mi-l">Para Birimi</div><div class="mi-v">₺ Türk Lirası</div></div>
        </div>
        <div class="uc-desc">Akdeniz'de Türk varlığının sembolü. 1974 Kıbrıs Barış Harekâtı şehitleri ve gazileri Vakfımızın öncelikli hizmet alanlarındandır. Yalnızca Türkiye tarafından tanınan bağımsız Türk devleti. TDT 9. Semerkant Zirvesi'nde gözlemci üye statüsü kazanmıştır.</div>
        <div class="uc-links">
          <div><div class="ll">🏛️ Yürütme &amp; Yasama</div>
          <div class="lrow">
            <a href="https://www.kktcb.eu" target="_blank" class="lnk">🇨🇾 Cumhurbaşkanlığı</a>
            <a href="https://basbakanhk.gov.ct.tr" target="_blank" class="lnk">🏛️ Başbakanlık</a>
            <a href="https://meclis.gov.ct.tr" target="_blank" class="lnk">📜 Cumhuriyet Meclisi</a>
          </div></div>
          <div><div class="ll">⚔️ Silahlı Kuvvetler &amp; Emniyet</div>
          <div class="lrow">
            <a href="https://msb.gov.ct.tr" target="_blank" class="lnk mil">⭐ Milli Savunma</a>
            <a href="https://poliskktc.gov.ct.tr" target="_blank" class="lnk mil">👮 Polis Gn. Md.</a>
          </div></div>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- ═══ BÖLÜM 3: DOST & MÜTTEFİK ═══ -->
<div class="sec">
  <div class="sec-w">
    <div class="sec-head">
      <div class="sh-left">
        <div class="sh-title">Balkanlar, Orta Doğu &amp; Stratejik Ortaklar</div>
        <div class="sh-sub">Türkiye'nin stratejik müttefikleri ve Osmanlı mirasını paylaşan coğrafyadaki dost devletler — Vakfımızın aktif faaliyet bölgeleri.</div>
      </div>
      <div class="sh-right"><div class="sh-cnt dost">5</div><div class="sh-label">Dost Ülke</div></div>
    </div>
    <div class="ugrid g5">
      <!-- PAKİSTAN -->
      <div class="uc dost">
        <div class="uc-strip"></div>
        <div class="uc-head">
          <div class="uc-flag">🇵🇰</div>
          <div>
            <div class="uc-name">Pakistan</div>
            <div class="uc-official">Pakistan İslam Cumhuriyeti</div>
            <div class="uc-tags"><span class="tag dost">Stratejik Ortak</span></div>
          </div>
        </div>
        <div class="uc-meta">
          <div class="mi"><div class="mi-l">Başkent</div><div class="mi-v">İslamabad</div></div>
          <div class="mi"><div class="mi-l">Nüfus</div><div class="mi-v">~240 M</div></div>
          <div class="mi"><div class="mi-l">Yüzölçümü</div><div class="mi-v">881.913 km²</div></div>
          <div class="mi"><div class="mi-l">Para Birimi</div><div class="mi-v">₨ Pakistan Rupisi</div></div>
        </div>
        <div class="uc-desc">İslam dünyasının nükleer gücü, Türkiye'nin en yakın müttefiki. 75+ yıllık kesintisiz diplomatik ilişki. Savunma sanayii ve ekonomide derin iş birliği. Gazi destek programlarımız Pakistan ile koordineli yürütülmektedir.</div>
        <div class="uc-links">
          <div><div class="ll">🏛️ Yürütme &amp; Yasama</div>
          <div class="lrow">
            <a href="https://president.gov.pk" target="_blank" class="lnk">🇵🇰 Cumhurbaşkanlığı</a>
            <a href="https://www.pm.gov.pk" target="_blank" class="lnk">🏛️ Başbakanlık</a>
            <a href="https://www.na.gov.pk" target="_blank" class="lnk">📜 Ulusal Meclis</a>
          </div></div>
          <div><div class="ll">⚔️ Silahlı Kuvvetler &amp; Emniyet</div>
          <div class="lrow">
            <a href="https://mod.gov.pk" target="_blank" class="lnk mil">⭐ Savunma Bak.</a>
            <a href="https://www.joinpak.gov.pk" target="_blank" class="lnk mil">🛡️ Ortak Kurmay</a>
            <a href="https://moib.gov.pk" target="_blank" class="lnk mil">👮 İçişleri Bak.</a>
          </div></div>
        </div>
      </div>
      <!-- BOSNA HERSEK -->
      <div class="uc dost">
        <div class="uc-strip"></div>
        <div class="uc-head">
          <div class="uc-flag">🇧🇦</div>
          <div>
            <div class="uc-name">Bosna Hersek</div>
            <div class="uc-official">Bosna-Hersek</div>
            <div class="uc-tags"><span class="tag dost">Osmanlı Mirası</span></div>
          </div>
        </div>
        <div class="uc-meta">
          <div class="mi"><div class="mi-l">Başkent</div><div class="mi-v">Saraybosna</div></div>
          <div class="mi"><div class="mi-l">Nüfus</div><div class="mi-v">~3,3 M</div></div>
          <div class="mi"><div class="mi-l">Yüzölçümü</div><div class="mi-v">51.197 km²</div></div>
          <div class="mi"><div class="mi-l">Para Birimi</div><div class="mi-v">Konvertibil Mark</div></div>
        </div>
        <div class="uc-desc">Balkanlarda köklü Osmanlı ve İslam mirası. 1992–1995 savaşı şehitleri ve gazi aileleri öncelikli ilgi alanımızdadır. UNESCO Mirası Mostar Köprüsü. TİKA ve Diyanet aracılığıyla kapsamlı kalkınma desteği sürmektedir.</div>
        <div class="uc-links">
          <div><div class="ll">🏛️ Yürütme &amp; Yasama</div>
          <div class="lrow">
            <a href="https://www.predsjednistvobih.ba" target="_blank" class="lnk">🇧🇦 Cumhurbaşkanlığı</a>
            <a href="https://www.vijeceministara.gov.ba" target="_blank" class="lnk">🏛️ Bakanlar Kurulu</a>
            <a href="https://www.parlament.ba" target="_blank" class="lnk">📜 Parlamento</a>
          </div></div>
          <div><div class="ll">⚔️ Silahlı Kuvvetler &amp; Emniyet</div>
          <div class="lrow">
            <a href="https://www.mod.gov.ba" target="_blank" class="lnk mil">⭐ Savunma Bak.</a>
            <a href="https://www.sipa.gov.ba" target="_blank" class="lnk mil">🔐 İstihbarat</a>
            <a href="https://mup.ks.gov.ba" target="_blank" class="lnk mil">👮 İçişleri Bak.</a>
          </div></div>
        </div>
      </div>
      <!-- ARNAVUTLUK -->
      <div class="uc dost">
        <div class="uc-strip"></div>
        <div class="uc-head">
          <div class="uc-flag">🇦🇱</div>
          <div>
            <div class="uc-name">Arnavutluk</div>
            <div class="uc-official">Arnavutluk Cumhuriyeti</div>
            <div class="uc-tags"><span class="tag nato">NATO</span><span class="tag dost">Osmanlı Mirası</span></div>
          </div>
        </div>
        <div class="uc-meta">
          <div class="mi"><div class="mi-l">Başkent</div><div class="mi-v">Tiran</div></div>
          <div class="mi"><div class="mi-l">Nüfus</div><div class="mi-v">~2,8 M</div></div>
          <div class="mi"><div class="mi-l">Yüzölçümü</div><div class="mi-v">28.748 km²</div></div>
          <div class="mi"><div class="mi-l">Para Birimi</div><div class="mi-v">Lek (L)</div></div>
        </div>
        <div class="uc-desc">Balkanlarda Müslüman çoğunluklu, derin Osmanlı izleri taşıyan stratejik ülke. Türk kültürü mimari, din ve eğitimde hâlâ güçlü biçimde hissedilmektedir. Balkanlardaki gazi destek faaliyetlerimizin öncelikli bölgesi.</div>
        <div class="uc-links">
          <div><div class="ll">🏛️ Yürütme &amp; Yasama</div>
          <div class="lrow">
            <a href="https://president.al" target="_blank" class="lnk">🇦🇱 Cumhurbaşkanlığı</a>
            <a href="https://www.keshilliministrave.al" target="_blank" class="lnk">🏛️ Bakanlar Kurulu</a>
            <a href="https://www.kuvendi.gov.al" target="_blank" class="lnk">📜 Kuvendi</a>
          </div></div>
          <div><div class="ll">⚔️ Silahlı Kuvvetler &amp; Emniyet</div>
          <div class="lrow">
            <a href="https://www.mod.gov.al" target="_blank" class="lnk mil">⭐ Savunma Bak.</a>
            <a href="https://www.asp.gov.al" target="_blank" class="lnk mil">👮 Devlet Polisi</a>
            <a href="https://www.shish.gov.al" target="_blank" class="lnk mil">🔐 İstihbarat</a>
          </div></div>
        </div>
      </div>
      <!-- KOSOVA -->
      <div class="uc dost">
        <div class="uc-strip"></div>
        <div class="uc-head">
          <div class="uc-flag">🇽🇰</div>
          <div>
            <div class="uc-name">Kosova</div>
            <div class="uc-official">Kosova Cumhuriyeti</div>
            <div class="uc-tags"><span class="tag dost">Osmanlı Mirası</span></div>
          </div>
        </div>
        <div class="uc-meta">
          <div class="mi"><div class="mi-l">Başkent</div><div class="mi-v">Priştine</div></div>
          <div class="mi"><div class="mi-l">Nüfus</div><div class="mi-v">~1,8 M</div></div>
          <div class="mi"><div class="mi-l">Yüzölçümü</div><div class="mi-v">10.887 km²</div></div>
          <div class="mi"><div class="mi-l">Para Birimi</div><div class="mi-v">Euro (€)</div></div>
        </div>
        <div class="uc-desc">Balkanlarda Osmanlı mirasının en yoğun hissedildiği coğrafya. Fatih Camii ve onlarca Osmanlı eseriyle tarihi köklü bağ mevcuttur. Türkçe Prizren'de resmi dil statüsündedir. Türkiye erken tanıyan ülkeler arasındadır.</div>
        <div class="uc-links">
          <div><div class="ll">🏛️ Yürütme &amp; Yasama</div>
          <div class="lrow">
            <a href="https://www.president-ksgov.net" target="_blank" class="lnk">🇽🇰 Cumhurbaşkanlığı</a>
            <a href="https://kryeministri.rks-gov.net" target="_blank" class="lnk">🏛️ Başbakanlık</a>
            <a href="https://www.kuvendikosoves.org" target="_blank" class="lnk">📜 Kuvendi</a>
          </div></div>
          <div><div class="ll">⚔️ Silahlı Kuvvetler &amp; Emniyet</div>
          <div class="lrow">
            <a href="https://www.mksf-ks.org" target="_blank" class="lnk mil">⭐ Savunma Bak.</a>
            <a href="https://www.mpb-ks.org" target="_blank" class="lnk mil">👮 İçişleri Bak.</a>
            <a href="https://www.policia.rks-gov.net" target="_blank" class="lnk mil">🚔 Kosova Polisi</a>
          </div></div>
        </div>
      </div>
      <!-- KUZEY MAKEDONYA -->
      <div class="uc dost">
        <div class="uc-strip"></div>
        <div class="uc-head">
          <div class="uc-flag">🇲🇰</div>
          <div>
            <div class="uc-name">Kuzey Makedonya</div>
            <div class="uc-official">Kuzey Makedonya Cumhuriyeti</div>
            <div class="uc-tags"><span class="tag nato">NATO</span><span class="tag dost">Osmanlı Mirası</span></div>
          </div>
        </div>
        <div class="uc-meta">
          <div class="mi"><div class="mi-l">Başkent</div><div class="mi-v">Üsküp</div></div>
          <div class="mi"><div class="mi-l">Nüfus</div><div class="mi-v">~2,1 M</div></div>
          <div class="mi"><div class="mi-l">Yüzölçümü</div><div class="mi-v">25.713 km²</div></div>
          <div class="mi"><div class="mi-l">Para Birimi</div><div class="mi-v">Makedonya Dinarı</div></div>
        </div>
        <div class="uc-desc">Balkanlarda derin Osmanlı izleri taşıyan ülke. Üsküp'teki Mustafa Paşa Camii ve Bedesten Osmanlı mirasının canlı tanıklarıdır. Nüfusun %25'ini Arnavut-Müslüman topluluklar oluşturmaktadır.</div>
        <div class="uc-links">
          <div><div class="ll">🏛️ Yürütme &amp; Yasama</div>
          <div class="lrow">
            <a href="https://www.president.mk" target="_blank" class="lnk">🇲🇰 Cumhurbaşkanlığı</a>
            <a href="https://vlada.mk" target="_blank" class="lnk">🏛️ Hükümet</a>
            <a href="https://www.sobranie.mk" target="_blank" class="lnk">📜 Sobranie</a>
          </div></div>
          <div><div class="ll">⚔️ Silahlı Kuvvetler &amp; Emniyet</div>
          <div class="lrow">
            <a href="https://www.mod.gov.mk" target="_blank" class="lnk mil">⭐ Savunma Bak.</a>
            <a href="https://www.mvr.gov.mk" target="_blank" class="lnk mil">👮 İçişleri Bak.</a>
            <a href="https://www.arm.mk" target="_blank" class="lnk mil">🛡️ Silahlı Kuvvetler</a>
          </div></div>
        </div>
      </div>
    </div>
  </div>
</div>
<?php endif; ?>
<?php get_footer(); ?>
