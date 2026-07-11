<?php
/**
 * Template Name: Atatürk İlkeleri
 * Template Post Type: page
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();
if (have_posts()) { the_post(); }
$vkv_slug   = 'ataturk-ilkeler';
$vkv_custom = function_exists('vkv_get_custom_page_content') ? vkv_get_custom_page_content($vkv_slug) : '';
$vkv_wp     = get_the_content();
$has_custom = !empty(trim($vkv_custom));
$has_wp     = !empty(trim(strip_tags($vkv_wp)));
if ($has_custom):
    echo '<div style="max-width:100%;width:100%;padding:0;margin:0">' . apply_filters('the_content', $vkv_custom) . '</div>';
elseif ($has_wp):
    echo '<div style="max-width:100%;width:100%;padding:0;margin:0">' . $vkv_wp . '</div>';
else:
?>
<style>
:root{--r:#0e7490;--rd:#155e75;--g:#C9A84C;--dk:#0D1117;--dk2:#1C2330;--wh:#FAFAF8;--gr:#F5F2ED;--bd:#E4E0D8;--t1:#1A1F28;--t2:#4A5568;--t3:#718096;--fn:'Nunito Sans',system-ui,sans-serif;--fs:'Merriweather',Georgia,serif;--w:1440px}
*{box-sizing:border-box}
.pw{font-family:var(--fn);background:var(--wh);color:var(--t1)}
#content,main{max-width:100%!important;padding:0!important;width:100%!important;margin:0!important}
.ph{width:100%;background:linear-gradient(150deg,var(--dk) 0%,var(--dk2) 60%,#0a0c0e 100%);padding:80px 40px 64px;text-align:center}
.ph-ew{display:inline-flex;align-items:center;gap:7px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:var(--g);font-size:9.5px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:18px}
.ph-h1{font-family:var(--fs);font-size:clamp(2rem,3.5vw,2.8rem);font-weight:700;color:#fff;line-height:1.15;margin-bottom:12px}
.ph-h1 em{color:var(--g);font-style:italic}
.ph-desc{font-size:13.5px;color:rgba(255,255,255,.5);line-height:1.85;max-width:680px;margin:0 auto}
.sec{width:100%;padding:64px 40px}
.sec.alt{background:var(--gr)}
.sec-w{max-width:var(--w);margin:0 auto}
.badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px}
.badge.g{background:rgba(201,168,76,.1);color:#7a5a00;border:1px solid rgba(201,168,76,.3)}
.badge.r{background:rgba(140,26,46,.08);color:var(--r);border:1px solid rgba(140,26,46,.15)}
.sec-title{font-family:var(--fs);font-size:1.9rem;font-weight:700;color:var(--t1);margin-bottom:10px}
.sec-sub{font-size:14px;color:var(--t3);line-height:1.75;max-width:760px;margin-bottom:32px}
.context-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px}
.context-box{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:28px}
.context-box h3{font-family:var(--fs);font-size:1.1rem;font-weight:700;color:var(--t1);margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid var(--g)}
.context-box p{font-size:13px;color:var(--t2);line-height:1.85;margin-bottom:12px}
.arrows-wrap{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.arrow-card{background:#fff;border:1px solid var(--bd);border-radius:12px;overflow:hidden;transition:all .25s}
.arrow-card:hover{box-shadow:0 10px 32px rgba(0,0,0,.1);transform:translateY(-4px)}
.arrow-head{padding:24px 24px 18px;border-bottom:1px solid var(--bd)}
.arrow-num{font-size:2.5rem;font-weight:800;color:rgba(140,26,46,.12);line-height:1;margin-bottom:8px}
.arrow-icon{font-size:2.2rem;margin-bottom:12px;display:block}
.arrow-en{font-family:var(--fs);font-size:1.2rem;font-weight:700;color:var(--t1);margin-bottom:4px}
.arrow-tr{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--r)}
.arrow-body{padding:20px 24px}
.arrow-summary{font-size:13.5px;font-weight:600;color:var(--t1);margin-bottom:12px;line-height:1.6}
.arrow-detail{font-size:12.5px;color:var(--t2);line-height:1.85}
.arrow-impact{margin-top:14px;padding:12px 14px;background:var(--gr);border-radius:6px;font-size:11.5px;color:var(--t2);line-height:1.7}
.arrow-impact strong{color:var(--r)}
.reforms-list{display:grid;gap:10px}
.reform-row{display:grid;grid-template-columns:80px 160px 1fr;gap:16px;background:#fff;border:1px solid var(--bd);border-radius:8px;padding:14px 18px;align-items:start}
.reform-year{font-size:13px;font-weight:800;color:var(--r)}
.reform-name{font-size:12.5px;font-weight:700;color:var(--t1)}
.reform-desc{font-size:12px;color:var(--t2);line-height:1.6}
.cta-band{background:linear-gradient(135deg,var(--r),var(--rd));padding:52px 40px;width:100%}
.cta-w{max-width:var(--w);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap}
.cta-text h3{font-family:var(--fs);font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:8px}
.cta-text p{font-size:13px;color:rgba(255,255,255,.65);line-height:1.6}
.btn-wh{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:#fff;color:var(--r);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
.btn-ol{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
@media(max-width:1024px){.arrows-wrap{grid-template-columns:repeat(2,1fr)}.reform-row{grid-template-columns:60px 1fr}}
@media(max-width:640px){.arrows-wrap,.context-grid{grid-template-columns:1fr}.sec,.ph,.cta-band{padding:48px 24px}.reform-row{grid-template-columns:1fr}}
</style>
<div class="pw">
<div class="ph">
  <div style="max-width:var(--w);margin:0 auto;position:relative;z-index:1">
    <div class="ph-ew">⚖️ Atatürk Köşesi</div>
    <h1 class="ph-h1">Altı Ok — <em>Atatürk'ün İlkeleri</em></h1>
    <p class="ph-desc">Kemalizm'in altı temel ilkesi: 1937'de Türkiye Cumhuriyeti Anayasası'na giren ve bugün hâlâ yürürlükte olan Cumhuriyetçilik, Milliyetçilik, Halkçılık, Devletçilik, Laiklik ve Devrimcilik.</p>
  </div>
</div>
<!-- BAĞLAM -->
<div class="sec">
  <div class="sec-w">
    <div class="context-grid" style="margin-bottom:48px">
      <div class="context-box">
        <h3>Altı Ok Nedir?</h3>
        <p>"Altı Ok", Kemalizm'in — Mustafa Kemal Atatürk tarafından temellendirilen siyasi ideolojinin — altı temel ilkesinin simgesidir. Bu ilkeler, 1931'de Cumhuriyet Halk Partisi programına, 1937'de ise Türkiye Cumhuriyeti Anayasası'na resmi olarak eklendi.</p>
        <p>Altı Ok; halkın iradesine dayalı bir cumhuriyeti, vatandaşlık temelli ulusal kimliği, tüm yurttaşlara eşit muameleyi, devletin ekonomideki etkin rolünü, din ile devlet işlerinin birbirinden ayrılmasını ve sürekli modernleşmeyi kapsamlı bir biçimde ifade eder.</p>
        <p>Bu altı ilke, bugün de Türkiye Cumhuriyeti Anayasası'nın değiştirilemez temel hükümleri arasındadır.</p>
      </div>
      <div class="context-box">
        <h3>Tarihsel Arka Plan</h3>
        <p>Atatürk, bu ilkeleri Osmanlı İmparatorluğu'nun çöküşünün ardından Türkiye'nin karşılaştığı somut zorluklara yanıt olarak geliştirdi. Teokratik bir monarşinin yerini modern bir cumhuriyet almıştı; ancak bu cumhuriyetin kurumlarının sağlam bir felsefi zemine oturtulması gerekiyordu.</p>
        <p>Altı Ok aynı zamanda 1930'larda Avrupa'yı ve dünyayı tehdit eden üç tehlikeli ideolojiye karşı bilinçli bir duruşu da simgelemekteydi: <strong>faşizm</strong> (halkçılık ve devrimcilikle reddedildi), <strong>komünizm</strong> (milliyetçilik ve piyasa dostu devletçilik anlayışıyla reddedildi) ve <strong>dini köktencilik</strong> (laiklikle reddedildi).</p>
        <p>Bu ilkeler, Türkiye'yi kendine özgü bir yola yerleştirdi — ne salt Batı liberal demokrasisi, ne otoriter yönetim; halka hizmet etmeyi temel amaç edinen laik ve güdümlü bir cumhuriyet.</p>
      </div>
    </div>
    <div class="badge g">Altı Ok</div>
    <h2 class="sec-title">Her İlke Ayrıntılarıyla</h2>
    <p class="sec-sub">Türkiye Cumhuriyeti'nin altı temel sütununun ayrıntılı açıklaması.</p>
    <div class="arrows-wrap">
      <!-- 1. Cumhuriyetçilik -->
      <div class="arrow-card">
        <div class="arrow-head">
          <div class="arrow-num">01</div>
          <span class="arrow-icon">🏛️</span>
          <div class="arrow-en">Cumhuriyetçilik</div>
          <div class="arrow-tr">Republicanism</div>
        </div>
        <div class="arrow-body">
          <p class="arrow-summary">Egemenlik kayıtsız şartsız milletindir — bir hükümdara, hanedana ya da dini otoriteye değil.</p>
          <p class="arrow-detail">Cumhuriyetçilik, Osmanlı geleneğiyle en köklü kopuşu simgeliyordu. Saltanat 1922'de, Hilafet 1924'te kaldırıldı. Atatürk, tanrısal hak kaynaklı monarşinin yerine, gücün milletten geldiğini ve devletin halka hesap veren seçilmiş temsilcilerce yönetilmesi gerektiğini koydu.</p>
          <div class="arrow-impact"><strong>Temel Reform:</strong> Cumhuriyetin ilanı, 29 Ekim 1923. Saltanatın (1922) ve Halifeliğin (1924) kaldırılması.</div>
        </div>
      </div>
      <!-- 2. Milliyetçilik -->
      <div class="arrow-card">
        <div class="arrow-head">
          <div class="arrow-num">02</div>
          <span class="arrow-icon">🌍</span>
          <div class="arrow-en">Milliyetçilik</div>
          <div class="arrow-tr">Nationalism</div>
        </div>
        <div class="arrow-body">
          <p class="arrow-summary">Etnik ya da dini değil, vatandaşlık ve ortak kültüre dayalı sivil bir milliyetçilik anlayışı.</p>
          <p class="arrow-detail">Atatürk'ün milliyetçilik anlayışı, etnik değil sivil bir temele oturuyordu. "Kendini Türk hisseden herkes Türktür" ilkesi; vatandaşlığı, dili ve ortak yazgıyı esas alıyordu. Bu yaklaşım, Osmanlı'nın pan-İslamcı ve pan-Türkçü çizgisini reddetti. Kürtler, Lazlar, Çerkezler ve öteki toplulukları tek bir ulusal kimlik altında birleştirdi.</p>
          <div class="arrow-impact"><strong>Temel Reform:</strong> Anayasal vatandaşlık tanımı, Türk Tarih Kurumu (1931) ve Türk Dil Kurumu (1932).</div>
        </div>
      </div>
      <!-- 3. Halkçılık -->
      <div class="arrow-card">
        <div class="arrow-head">
          <div class="arrow-num">03</div>
          <span class="arrow-icon">🤝</span>
          <div class="arrow-en">Halkçılık</div>
          <div class="arrow-tr">Populism</div>
        </div>
        <div class="arrow-body">
          <p class="arrow-summary">Tüm vatandaşlar yasa önünde eşittir. Hiçbir sınıf, zümre ya da ailenin ayrıcalığı yoktur.</p>
          <p class="arrow-detail">Atatürk'ün halkçılığı, ayrıcalığın reddini simgeliyordu — ister aristokratik, ister dinsel, ister ekonomik kökenli olsun. Devlet, hâkim bir sınıfın değil, tüm halkın refahı için varlık gösterir. Bu ilke, Osmanlı'nın katmanlı toplumsal hiyerarşisini yıkarak yerine eşit vatandaşlık anlayışını yerleştirdi. Sınıf mücadelesini de reddeden bu yaklaşım, toplumu birbiriyle çatışan sınıflar yerine bütünleşik bir varlık olarak ele aldı.</p>
          <div class="arrow-impact"><strong>Temel Reform:</strong> Unvan ve lakapların kaldırılması (1934); eşit haklar tanıyan Medeni Kanun (1926).</div>
        </div>
      </div>
      <!-- 4. Devletçilik -->
      <div class="arrow-card">
        <div class="arrow-head">
          <div class="arrow-num">04</div>
          <span class="arrow-icon">🏗️</span>
          <div class="arrow-en">Devletçilik</div>
          <div class="arrow-tr">Statism</div>
        </div>
        <div class="arrow-body">
          <p class="arrow-summary">Devlet, ulusal ekonomiyi yönlendiren etkin bir role sahiptir — özellikle özel sermayenin yetersiz kaldığı sektörlerde.</p>
          <p class="arrow-detail">Devletçilik, Atatürk'ün yıllarca süren savaşların ardından sanayi altyapısından yoksun ve özel sermayesi kıt olan bir ülkeye verdiği pragmatik yanıttı. Komünizm anlamına gelmiyordu; özel girişim yasal ve teşvik edilir olmaya devam etti. Ancak çelik, demiryolları, tekstil ve bankacılık gibi kilit sektörlerde devlet doğrudan yatırım yaparak sanayileşmeyi hızlandırdı. 1930'lardaki bu "güdümlü kapitalizm" modeli, kayda değer ekonomik büyüme sağladı.</p>
          <div class="arrow-impact"><strong>Temel Reform:</strong> Birinci Beş Yıllık Kalkınma Planı (1934); Sümerbank ve Etibank gibi devlet iktisadi teşebbüsleri.</div>
        </div>
      </div>
      <!-- 5. Laiklik -->
      <div class="arrow-card">
        <div class="arrow-head">
          <div class="arrow-num">05</div>
          <span class="arrow-icon">⚖️</span>
          <div class="arrow-en">Laiklik</div>
          <div class="arrow-tr">Secularism</div>
        </div>
        <div class="arrow-body">
          <p class="arrow-summary">Din ile devlet işlerinin birbirinden ayrılması. Devlet, akıl ve bilim ışığında yönetilir; din kişisel bir alandır ve güvence altındadır.</p>
          <p class="arrow-detail">Laiklik, Atatürk'ün en radikal ilkesiydi ve Türkiye Cumhuriyeti'ni komşularından en keskin biçimde ayıran unsurdu. İslam hukuku (Şeriat), Avrupa modellerinden alınan laik hukuk metinleriyle değiştirildi. Dini mahkemeler kaldırıldı. Eğitim, laik devlet çatısı altında tek tipleştirildi. Bununla birlikte din özgürlüğü güvence altına alındı; devlet dini bastırmadı, yalnızca onu kamu yönetiminden arındırdı.</p>
          <div class="arrow-impact"><strong>Temel Reformlar:</strong> Halifeliğin kaldırılması (1924); Medeni Kanun (1926); dini mahkemelerin ilgası; Latin alfabesi (1928); "devlet dini" ibaresinin Anayasa'dan çıkarılması (1928).</div>
        </div>
      </div>
      <!-- 6. Devrimcilik -->
      <div class="arrow-card">
        <div class="arrow-head">
          <div class="arrow-num">06</div>
          <span class="arrow-icon">🔄</span>
          <div class="arrow-en">Devrimcilik / İnkılapçılık</div>
          <div class="arrow-tr">Reformism / Revolutionism</div>
        </div>
        <div class="arrow-body">
          <p class="arrow-summary">Sürekli ilerleme ve modernleşme. Toplum her zaman çağdaş uygarlık standartlarına doğru ilerlemek zorundadır. Reformlar donmuş değildir.</p>
          <p class="arrow-detail">Devrimcilik — ya da İnkılapçılık — Atatürk'ün modernleşmenin bir varış noktası değil, süregelen bir yolculuk olduğunu kabul etmesiydi. 1920'ler ve 1930'ların reformları son söz değildi; bunlar Türkiye'yi sürekli iyileşme ve uyum sürecine oturtmayı amaçlıyordu. Bu ilke; durağanlığa ve gelenekçiliğe karşı çıkarken aynı zamanda herhangi bir ideolojinin kalıcı bir dogmaya dönüşmesini de engelledi. Türkiye, her zaman çağdaş medeniyetin en yüksek standartlarına doğru yürümelidir.</p>
          <div class="arrow-impact"><strong>Bugün:</strong> Türkiye'nin kurumlarını, yasalarını ve toplumunu çağın gereklerine ve uluslararası standartlara uyarlamaya yönelik süregelen reformlar — AB üyelik süreci dahil.</div>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- REFORMLAR TABLOSU -->
<div class="sec alt">
  <div class="sec-w">
    <div class="badge r">Uygulama</div>
    <h2 class="sec-title">Kronolojik Reform Tablosu</h2>
    <p class="sec-sub">Altı Ok yalnızca felsefi ilkeler değildi; 1922–1938 arasında hayata geçirilen somut hukuki ve kurumsal reformlarla bütünleşti.</p>
    <div class="reforms-list">
      <?php
      $reformlar = array(
        array('1922','Saltanatın Kaldırılması','Osmanlı Saltanatı resmen kaldırıldı. VI. Mehmed sürgüne gitti. TBMM, egemenliği bütünüyle devraldı.'),
        array('1923','Cumhuriyetin İlanı','29 Ekim 1923\'te Türkiye Cumhuriyeti ilan edildi. Atatürk ilk Cumhurbaşkanı seçildi; Ankara başkent oldu.'),
        array('1924','Halifeliğin Kaldırılması','Sünni İslam\'ın sembolik dini önderliği olan Halifelik lağvedildi. Din ile devletin ayrışması hız kazandı.'),
        array('1924','Yeni Anayasa','1924 Anayasası; halk egemenliği ve parlamenter yönetim çerçevesini belirleyerek Türkiye Cumhuriyeti\'nin temelini attı.'),
        array('1925','Şapka Kanunu','Fes yasaklanarak yerine Avrupai şapka ve kasket getirildi; başlık reformu Osmanlı giyim anlayışıyla sembolik kopuşu simgeledi.'),
        array('1925','Tekke ve Zaviyelerin Kapatılması','Tarikatlar kapatıldı; dini kardeşlikler kamusal yaşamdan uzaklaştırılarak laikleşme süreci derinleştirildi.'),
        array('1926','Medeni Kanun','İsviçre Medeni Kanunu esas alınarak hazırlandı; kadınlara evlilik, boşanma ve miras konusunda eşit haklar tanındı, dini mahkemeler kaldırıldı.'),
        array('1926','Türk Ceza Kanunu','İtalya\'nın Ceza Kanunu örnek alınarak düzenlendi; Osmanlı ceza hukuku çağdaş laik bir hukuki çerçeveyle değiştirildi.'),
        array('1928','Latin Alfabesine Geçiş','Arap harflerinin yerini Latin temelli alfabe aldı. Atatürk bizzat vatandaşlara yeni harfleri öğretti; başlatılan seferberlikle okuryazarlık oranı büyük ölçüde arttı.'),
        array('1928','Devlet Dini İbaresinin Kaldırılması','"İslam devletin dinidir" hükmü Anayasa\'dan çıkarıldı; Türkiye anayasal çerçevede laik bir devlet niteliği kazandı.'),
        array('1930','Kadınlara Belediye Oy Hakkı','Türk kadınları belediye seçimlerinde oy kullanma ve aday olma hakkını kazandı; bu, pek çok Avrupa ülkesinin önündeydi.'),
        array('1931','Metrik Sistem','Osmanlı ölçü birimleri uluslararası metrik sistemle değiştirildi.'),
        array('1932','Dil Reformu — TDK','Türk Dil Kurumu (TDK) kuruldu; Türkçedeki Arapça ve Farsça sözcüklerin yerine Türkçe karşılıklar bulma çalışmaları başlatıldı.'),
        array('1933','Üniversite Reformu','İstanbul Üniversitesi çağdaş ilkelere göre yeniden yapılandırıldı; Avrupalı akademisyenler araştırma üniversitesi kültürünü geliştirmek için davet edildi.'),
        array('1934','Kadınlara Milletvekilliği Hakkı','Türk kadınları TBMM\'de oy kullanma ve milletvekili olma hakkını kazandı; bu hak Fransa\'dan (1944) ve İtalya\'dan (1945) önce tanındı.'),
        array('1934','Soyadı Kanunu','Tüm vatandaşların soyadı alması zorunlu kılındı. TBMM, Mustafa Kemal\'e "Atatürk" soyadını takdim etti.'),
        array('1934','Birinci Beş Yıllık Plan','Devlet öncülüğünde sanayileşme planı hayata geçirildi; Anadolu\'nun dört bir yanında çelik fabrikaları, tekstil işletmeleri, şeker fabrikaları ve demiryolları inşa edildi.'),
        array('1937','Altı Ok Anayasa\'ya Girdi','Kemalizm\'in altı temel ilkesi, Türkiye Cumhuriyeti Anayasası\'na değiştirilemez temel hükümler olarak eklendi.'),
      );
      foreach ($reformlar as $rf): ?>
      <div class="reform-row">
        <div class="reform-year"><?php echo esc_html($rf[0]); ?></div>
        <div class="reform-name"><?php echo esc_html($rf[1]); ?></div>
        <div class="reform-desc"><?php echo esc_html($rf[2]); ?></div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<!-- CTA -->
<div class="cta-band">
  <div class="cta-w">
    <div class="cta-text">
      <h3>Atatürk'ü Keşfetmeye Devam Edin</h3>
      <p>Hayatı, kronolojisi ve seçilmiş sözleriyle büyük önderin mirasını inceleyin.</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a href="<?php echo esc_url(home_url('/ataturk-hayati')); ?>" class="btn-wh">📖 Hayatı</a>
      <a href="<?php echo esc_url(home_url('/ataturk-sozleri')); ?>" class="btn-ol">💬 Sözleri</a>
    </div>
  </div>
</div>
</div>
<?php endif; get_footer(); ?>
