<?php
/**
 * Template Name: Kibris Baris Harekati
 * Template Post Type: page
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();
if (have_posts()) { the_post(); }
$vkv_slug   = 'kibris-baris-harekati';
$vkv_custom = function_exists('vkv_get_custom_page_content') ? vkv_get_custom_page_content($vkv_slug) : '';
$vkv_wp     = get_the_content();
$has_custom = !empty(trim($vkv_custom));
$has_wp     = !empty(trim(strip_tags($vkv_wp)));
if ($has_custom): echo '<div style="max-width:100%;width:100%;padding:0;margin:0">' . apply_filters('the_content', $vkv_custom) . '</div>';
elseif ($has_wp): echo '<div style="max-width:100%;width:100%;padding:0;margin:0">' . $vkv_wp . '</div>';
else:
?>
<style>
:root{--r:#0e7490;--rd:#155e75;--g:#C9A84C;--dk:#0D1117;--dk2:#1C2330;--wh:#FAFAF8;--gr:#F5F2ED;--bd:#E4E0D8;--t1:#1A1F28;--t2:#4A5568;--t3:#718096;--fn:'Nunito Sans',system-ui,sans-serif;--fs:'Merriweather',Georgia,serif;--w:1440px}
*{box-sizing:border-box}.pw{font-family:var(--fn);background:var(--wh);color:var(--t1)}
#content,main{max-width:100%!important;padding:0!important;width:100%!important;margin:0!important}
.ph{width:100%;background:linear-gradient(150deg,#020508 0%,#071018 45%,#091008 100%);padding:80px 40px 64px;position:relative;overflow:hidden}
.ph::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 60% 45%,rgba(140,26,46,.14) 0%,transparent 55%)}
.ph-w{max-width:var(--w);margin:0 auto;display:grid;grid-template-columns:1.2fr 1fr;gap:60px;align-items:center;position:relative;z-index:1}
.ph-ew{display:inline-flex;align-items:center;gap:8px;background:rgba(140,26,46,.18);border:1px solid rgba(140,26,46,.35);color:#e87a8a;font-size:9.5px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:18px}
.ph-h1{font-family:var(--fs);font-size:clamp(2rem,3.5vw,3rem);font-weight:700;color:#fff;line-height:1.12;margin-bottom:14px}
.ph-h1 em{color:var(--g);font-style:italic;display:block}
.ph-desc{font-size:13.5px;color:rgba(255,255,255,.55);line-height:1.85;max-width:520px}
.ph-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.ph-stat{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:16px 18px;text-align:center}
.ph-stat-num{font-size:1.4rem;font-weight:800;color:var(--g);line-height:1;margin-bottom:4px}
.ph-stat-lbl{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.35)}
.sec{width:100%;padding:64px 40px}.sec.alt{background:var(--gr)}.sec.dark{background:var(--dk);padding:64px 40px}
.sec-w{max-width:var(--w);margin:0 auto}
.badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px}
.badge.g{background:rgba(201,168,76,.1);color:#7a5a00;border:1px solid rgba(201,168,76,.3)}
.badge.r{background:rgba(140,26,46,.08);color:var(--r);border:1px solid rgba(140,26,46,.15)}
.badge.w{background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.15)}
.sec-title{font-family:var(--fs);font-size:1.9rem;font-weight:700;color:var(--t1);margin-bottom:10px}
.sec-title.wh{color:#fff}.sec-sub{font-size:14px;color:var(--t3);line-height:1.75;max-width:760px;margin-bottom:32px}.sec-sub.wh{color:rgba(255,255,255,.5)}
.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.card{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:24px;transition:all .22s;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--r),var(--g))}
.card:hover{box-shadow:0 8px 28px rgba(0,0,0,.08);transform:translateY(-3px)}
.tl{display:flex;flex-direction:column;position:relative;max-width:800px}
.tl::before{content:'';position:absolute;left:28px;top:0;bottom:0;width:2px;background:var(--bd)}
.tl-item{display:flex;gap:22px;align-items:flex-start;padding-bottom:28px}
.tl-dot{width:56px;height:56px;border-radius:50%;background:var(--r);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;position:relative;z-index:1;box-shadow:0 0 0 4px var(--bd)}
.tl-body{padding:8px 0 0;flex:1}.tl-date{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--r);margin-bottom:4px}
.tl-title{font-family:var(--fs);font-size:1rem;font-weight:700;color:var(--t1);margin-bottom:6px}.tl-desc{font-size:12.5px;color:var(--t2);line-height:1.8}
.cta-band{background:linear-gradient(135deg,var(--r),var(--rd));padding:52px 40px;width:100%}
.cta-w{max-width:var(--w);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap}
.cta-text h3{font-family:var(--fs);font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:8px}
.cta-text p{font-size:13px;color:rgba(255,255,255,.65);line-height:1.6}
.btn-wh{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:#fff;color:var(--r);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
.btn-ol{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
@media(max-width:768px){.ph-w,.g3,.g2{grid-template-columns:1fr}.sec,.ph,.cta-band{padding:48px 24px}}
</style>
<div class="pw">
<div class="ph">
  <div class="ph-w">
    <div>
      <div class="ph-ew">🕊️ Savaşlar · Kıbrıs</div>
      <h1 class="ph-h1">Kıbrıs Barış Harekâtı<em>20 Temmuz 1974</em></h1>
      <p class="ph-desc">15 Temmuz 1974'te Kıbrıs'ta gerçekleştirilen Yunan askeri darbesi, Kıbrıs Türklerini ağır baskı ve katliam tehdidiyle karşı karşıya bıraktı. Türkiye, 1960 Garanti Antlaşması'ndan doğan garantör devlet hakkını kullanarak 20 Temmuz 1974'te adaya çıkarma yaptı.</p>
      <p class="ph-desc" style="margin-top:8px">Bu harekât, Kıbrıs Türklerini korumak ve garantörlük haklarını kullanmak amacıyla gerçekleştirilmiş meşru bir müdahaledir.</p>
    </div>
    <div class="ph-stats">
      <div class="ph-stat"><div class="ph-stat-num">20 Temmuz</div><div class="ph-stat-lbl">Harekât Günü</div></div>
      <div class="ph-stat"><div class="ph-stat-num">1974</div><div class="ph-stat-lbl">Yılı</div></div>
      <div class="ph-stat"><div class="ph-stat-num">498</div><div class="ph-stat-lbl">Türk Şehidi</div></div>
      <div class="ph-stat"><div class="ph-stat-num">I &amp; II</div><div class="ph-stat-lbl">İki Aşamalı Harekât</div></div>
    </div>
  </div>
</div>
<!-- GENEL BAKIŞ -->
<div class="sec">
  <div class="sec-w">
    <div class="g2">
      <div>
        <div class="badge r">Harekâtın Arka Planı</div>
        <h2 class="sec-title">Neden Yapıldı?</h2>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9;margin-bottom:14px">1960'ta bağımsızlığını kazanan Kıbrıs Cumhuriyeti, anayasal düzenin 1963'ten itibaren Rum tarafınca fiilen askıya alınmasıyla istikrarsızlığa sürüklendi. Kıbrıs Türkleri, yaşadıkları bölgelerden koparılarak kuzeydeki küçük enklavlara sıkıştırıldı.</p>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9;margin-bottom:14px">15 Temmuz 1974'te Yunanistan cuntasının desteğiyle gerçekleştirilen darbe, Kıbrıs'ı Yunanistan'a bağlamayı (enosis) hedefliyordu. Makarios hükümeti devrildi, Kıbrıs Türkleri yaşam tehlikesiyle yüz yüze geldi.</p>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9">Türkiye, 1960 Garanti Antlaşması'nın IV. maddesi uyarınca garantör devlet sıfatıyla ada halkının güvenliğini sağlamak için harekete geçti. 20 Temmuz 1974'te <strong>Birinci Barış Harekâtı</strong>, 14 Ağustos'ta ise <strong>İkinci Barış Harekâtı</strong> icra edildi.</p>
      </div>
      <div>
        <div class="badge g">Harekâtın Künyesi</div>
        <h2 class="sec-title">Temel Bilgiler</h2>
        <?php
        $bilgiler = array(
          array('📅','Tarihler','I. Harekât: 20 Temmuz 1974 / II. Harekât: 14 Ağustos 1974'),
          array('📍','Yer','Kıbrıs Adası'),
          array('🎖️','Komutan','Korgeneral Bedrettin Demirel (Kara Kuvvetleri)'),
          array('⚖️','Hukuki Dayanak','1960 Garanti Antlaşması, Madde IV — Garantör devlet hakkı'),
          array('🕯️','Türk Kayıpları','498 şehit, 1.200+ yaralı'),
          array('📊','Sonuç','Kıbrıs Türklerinin kuzey bölgede güvence altına alınması'),
          array('🏛️','Siyasi Gelişme','16 Ağustos 1960 — Kıbrıs Cumhuriyeti kuruldu'),
          array('📅','Anma Günü','Her yıl 20 Temmuz Kıbrıs Barış Harekâtı Yıldönümü'),
        );
        foreach ($bilgiler as $b): ?>
        <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--bd);align-items:flex-start">
          <span style="font-size:1.1rem;flex-shrink:0;width:26px"><?php echo $b[0]; ?></span>
          <div>
            <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--t3);margin-bottom:2px"><?php echo $b[1]; ?></div>
            <div style="font-size:12.5px;color:var(--t1);line-height:1.5"><?php echo esc_html($b[2]); ?></div>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</div>
<!-- KRONOLOJİ -->
<div class="sec alt">
  <div class="sec-w">
    <div class="badge r">Kronoloji</div>
    <h2 class="sec-title">Harekâtın Seyri</h2>
    <div class="tl">
      <?php
      $tl = array(
        array('15 Temmuz 1974','⚠️','Yunan Darbesi','Atina cuntasının yönlendirmesiyle EOKA-B Kıbrıs\'ta darbe yaptı. Cumhurbaşkanı Makarios devrildi; yerini Nikos Sampson aldı. Enosis (Yunanistan ile birleşme) hedeflendi.'),
        array('20 Temmuz 1974','🚢','Birinci Barış Harekâtı','Türk Silahlı Kuvvetleri, Garanti Antlaşması kapsamında garantör devlet sıfatıyla Kıbrıs\'a çıkarma yaptı. Beşparmak Dağları ve Girne koridoru ele geçirildi. BM ateşkesi kabul edildi.'),
        array('25-30 Temmuz 1974','🕊️','Cenevre Görüşmeleri','Garantör devletler (Türkiye, Yunanistan, İngiltere) Cenevre\'de bir araya geldi. Yunan tarafı çözüm önerisini reddetti.'),
        array('14 Ağustos 1974','🎯','İkinci Barış Harekâtı','Cenevre görüşmelerinin sonuçsuz kalması üzerine ikinci aşama başlatıldı. Türk kuvvetleri adanın kuzeyinde bugünkü sınıra ulaştı.'),
        array('16 Ağustos 1974','🛑','Ateşkes','İkinci ateşkes ilan edildi. Kuzey Kıbrıs bugünkü sınırlarıyla fiilen ikiye bölündü.'),
        array('15 Kasım 1983','🏛️','KKTC Ilanı','Kuzey Kıbrıs Türk Cumhuriyeti bağımsızlığını ilan etti. Türkiye tarafından tanındı.'),
      );
      foreach ($tl as $t): ?>
      <div class="tl-item">
        <div class="tl-dot"><?php echo $t[1]; ?></div>
        <div class="tl-body">
          <div class="tl-date"><?php echo esc_html($t[0]); ?></div>
          <div class="tl-title"><?php echo esc_html($t[2]); ?></div>
          <p class="tl-desc"><?php echo esc_html($t[3]); ?></p>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<!-- İKİ AŞAMA -->
<div class="sec">
  <div class="sec-w">
    <div class="badge g">Harekât Aşamaları</div>
    <h2 class="sec-title">Birinci ve İkinci Aşama</h2>
    <div class="g2">
      <div class="card" style="border-top:4px solid var(--r)">
        <div style="font-size:1.8rem;margin-bottom:12px">🚢</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--r);margin-bottom:8px">20 Temmuz 1974</div>
        <h3 style="font-family:var(--fs);font-size:1.1rem;font-weight:700;color:var(--t1);margin-bottom:12px">Birinci Barış Harekâtı</h3>
        <p style="font-size:13px;color:var(--t2);line-height:1.8">Deniz ve hava kuvvetlerinin desteğiyle Girne (Kyrenia) sahillerine çıkarma yapıldı. Beşparmak Dağları ele geçirilerek Girne koridor güvenliğe alındı. BM ateşkes çağrısıyla harekât geçici olarak durduruldu. Türk askerinin kontrolündeki bölge adanın yaklaşık yüzde üçüne karşılık geliyordu.</p>
      </div>
      <div class="card" style="border-top:4px solid var(--g)">
        <div style="font-size:1.8rem;margin-bottom:12px">🎯</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--g);margin-bottom:8px">14 Ağustos 1974</div>
        <h3 style="font-family:var(--fs);font-size:1.1rem;font-weight:700;color:var(--t1);margin-bottom:12px">İkinci Barış Harekâtı</h3>
        <p style="font-size:13px;color:var(--t2);line-height:1.8">Cenevre görüşmelerinin çözümsüz kalması üzerine ikinci aşama başlatıldı. Türk kuvvetleri kısa sürede Lefkoşa-Magosa-Baf hattına ulaşarak adanın kuzeyini güvence altına aldı. 16 Ağustos'ta ilan edilen ateşkesle harekât tamamlandı. Bugünkü Kuzey Kıbrıs Türk Cumhuriyeti toprakları bu harekâtla belirlendi.</p>
      </div>
    </div>
  </div>
</div>
<!-- ANMA -->
<div class="sec alt">
  <div class="sec-w">
    <div class="badge r">Anma Günü</div>
    <h2 class="sec-title">20 Temmuz — Barış ve Özgürlük Bayramı</h2>
    <div style="background:#fff;border:1px solid var(--bd);border-radius:12px;padding:32px;display:flex;gap:24px;align-items:flex-start;max-width:800px">
      <div style="background:var(--r);color:#fff;border-radius:8px;padding:16px 20px;text-align:center;flex-shrink:0">
        <div style="font-size:2rem;font-weight:800;line-height:1">20</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px">Temmuz</div>
      </div>
      <div>
        <h3 style="font-family:var(--fs);font-size:1.2rem;font-weight:700;color:var(--t1);margin-bottom:12px">Kıbrıs Barış Harekâtı Yıldönümü</h3>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.85;margin-bottom:10px">20 Temmuz 1974 Barış Harekâtı'nın yıldönümü, her yıl Türkiye'de ve Kuzey Kıbrıs Türk Cumhuriyeti'nde törenlerle kutlanmaktadır. Bu tarih, Kıbrıs Türklerinin Yunan darbesine ve baskılarına karşı Türkiye'nin garantörlük hakkını kullandığı ve Kıbrıs Türklerini korumanın yanı sıra bölgede istikrarı yeniden tesis ettiği günün simgesidir.</p>
        <p style="font-size:12px;color:var(--t3)">Şehitlerimiz rahmetle, gazilerimiz minnetle anılır.</p>
      </div>
    </div>
  </div>
</div>
<!-- CTA -->
<div class="cta-band">
  <div class="cta-w">
    <div class="cta-text">
      <h3>Kıbrıs Şehitlerimizi Saygıyla Anıyoruz</h3>
      <p>498 kahraman şehidimiz ve tüm Kıbrıs gazilerimiz ebediyetle yaşamaktadır.</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a href="<?php echo esc_url(home_url('/milli-gunler')); ?>" class="btn-wh">📅 Millî Günler</a>
      <a href="<?php echo esc_url(home_url('/kore-savasi')); ?>" class="btn-ol">🇰🇷 Kore Savaşı</a>
    </div>
  </div>
</div>
</div>
<?php endif; get_footer(); ?>
