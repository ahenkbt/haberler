<?php
/**
 * Template Name: Kurtulus Savasi
 * Template Post Type: page
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();
if (have_posts()) { the_post(); }
$vkv_slug   = 'kurtulus-savasi';
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
.ph{width:100%;background:linear-gradient(150deg,#050304 0%,#0D0509 45%,#1a1005 100%);padding:80px 40px 64px;position:relative;overflow:hidden}
.ph::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 25% 55%,rgba(201,168,76,.12) 0%,transparent 55%)}
.ph-w{max-width:var(--w);margin:0 auto;display:grid;grid-template-columns:1.2fr 1fr;gap:60px;align-items:center;position:relative;z-index:1}
.ph-ew{display:inline-flex;align-items:center;gap:8px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:var(--g);font-size:9.5px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:18px}
.ph-h1{font-family:var(--fs);font-size:clamp(2rem,3.5vw,3rem);font-weight:700;color:#fff;line-height:1.12;margin-bottom:14px}
.ph-h1 em{color:var(--g);font-style:italic;display:block}
.ph-desc{font-size:13.5px;color:rgba(255,255,255,.55);line-height:1.85;max-width:520px;margin-bottom:10px}
.ph-quote{background:rgba(201,168,76,.08);border-left:3px solid var(--g);padding:16px 20px;border-radius:0 6px 6px 0;margin-top:20px;font-family:var(--fs);font-size:13px;font-style:italic;color:rgba(255,255,255,.8);line-height:1.7}
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
.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.card{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:24px;transition:all .22s;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--r),var(--g))}
.card:hover{box-shadow:0 8px 28px rgba(0,0,0,.08);transform:translateY(-3px)}
.tl{display:flex;flex-direction:column;position:relative}.tl::before{content:'';position:absolute;left:28px;top:0;bottom:0;width:2px;background:var(--bd)}
.tl-item{display:flex;gap:22px;align-items:flex-start;padding-bottom:28px}
.tl-dot{width:56px;height:56px;border-radius:50%;background:var(--r);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;position:relative;z-index:1;box-shadow:0 0 0 4px var(--bd)}
.tl-body{padding:8px 0 0;flex:1}.tl-date{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--r);margin-bottom:4px}
.tl-title{font-family:var(--fs);font-size:1rem;font-weight:700;color:var(--t1);margin-bottom:6px}.tl-desc{font-size:12.5px;color:var(--t2);line-height:1.8}
/* İşgal Tablosu */
.occupation-table{width:100%;border-collapse:collapse;font-size:12.5px}
.occupation-table th{background:var(--r);color:#fff;padding:10px 14px;text-align:left;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase}
.occupation-table td{padding:9px 14px;border-bottom:1px solid var(--bd);color:var(--t2);line-height:1.5}
.occupation-table tr:nth-child(even) td{background:var(--gr)}
.occupation-table tr:hover td{background:rgba(201,168,76,.05)}
.power-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700}
.power-fr{background:rgba(0,80,200,.1);color:#0050c8}
.power-en{background:rgba(180,30,30,.1);color:#b41e1e}
.power-yu{background:rgba(0,120,60,.1);color:#007838}
.power-it{background:rgba(0,140,160,.1);color:#008ca0}
.power-re{background:rgba(130,0,40,.1);color:#820028}
.cta-band{background:linear-gradient(135deg,var(--r),var(--rd));padding:52px 40px;width:100%}
.cta-w{max-width:var(--w);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap}
.cta-text h3{font-family:var(--fs);font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:8px}
.cta-text p{font-size:13px;color:rgba(255,255,255,.65);line-height:1.6}
.btn-wh{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:#fff;color:var(--r);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
.btn-ol{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
@media(max-width:1024px){.g4{grid-template-columns:repeat(2,1fr)}}
@media(max-width:768px){.ph-w,.g3,.g2{grid-template-columns:1fr}.sec,.ph,.cta-band{padding:48px 24px}.ph-stats{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="pw">
<!-- HERO -->
<div class="ph">
  <div class="ph-w">
    <div>
      <div class="ph-ew">🦅 Savaşlar · Millî Mücadele</div>
      <h1 class="ph-h1">Türk Kurtuluş Savaşı<em>1919 – 1923</em></h1>
      <p class="ph-desc">Mondros'tan Lozan'a, Samsun'dan İzmir'e uzanan dört yıllık zorlu mücadele. Türk milletinin işgale karşı verdiği varoluş savaşı ve modern Türkiye'nin kuruluş destanı.</p>
      <div class="ph-quote">"Ya istiklal, ya ölüm!"<br><span style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:.6;margin-top:8px;display:block">— Millî Mücadele'nin parolası</span></div>
    </div>
    <div class="ph-stats">
      <div class="ph-stat"><div class="ph-stat-num">1919–1923</div><div class="ph-stat-lbl">Mücadele Yılları</div></div>
      <div class="ph-stat"><div class="ph-stat-num">30 Ağustos</div><div class="ph-stat-lbl">Zafer Bayramı</div></div>
      <div class="ph-stat"><div class="ph-stat-num">29 Ekim</div><div class="ph-stat-lbl">Cumhuriyet'in İlanı</div></div>
      <div class="ph-stat"><div class="ph-stat-num">Lozan</div><div class="ph-stat-lbl">Zafer Antlaşması</div></div>
    </div>
  </div>
</div>
<!-- ÖZET -->
<div class="sec">
  <div class="sec-w">
    <div class="g2">
      <div>
        <div class="badge r">Tarihsel Arka Plan</div>
        <h2 class="sec-title">Neden Savaşıldı?</h2>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9;margin-bottom:14px">I. Dünya Savaşı'ndan yenik ayrılan Osmanlı İmparatorluğu, 30 Ekim 1918'de Mondros Mütarekesi'ni imzaladı. İtilaf devletleri Anadolu'yu paylaşmaya başladı: İngilizler İstanbul ve çevresini, Fransızlar Güneydoğu Anadolu'yu, İtalyanlar Antalya bölgesini işgal etti. 15 Mayıs 1919'da Yunan kuvvetleri İzmir'e çıktı.</p>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9;margin-bottom:14px">Sevr Antlaşması (1920), Anadolu'nun büyük bölümünü Yunanistan'a, Ermenistan'a ve Kürdistan özerk bölgesine bırakıyordu. Osmanlı padişahı bu antlaşmayı kabul etti. Ancak Türk milleti kabul etmedi.</p>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9">19 Mayıs 1919'da Samsun'a çıkan Mustafa Kemal, ulusal direniş hareketini örgütledi. Ankara'da kurulan TBMM, egemenliği devraldı. Dört yıllık zorlu mücadelenin sonunda Türk ordusu tüm işgalcileri yurtttan çıkardı ve Lozan'da tam bağımsızlık kazandı.</p>
      </div>
      <div>
        <div class="badge g">Savaşın Künyesi</div>
        <h2 class="sec-title">Temel Bilgiler</h2>
        <?php
        $bilgiler = array(
          array('📅','Tarihler','19 Mayıs 1919 – 24 Temmuz 1923'),
          array('📍','Cepheler','Batı (Yunan), Güney (Fransız-Ermeni), Doğu (Ermeni-Gürcü), İstanbul (İngiliz)'),
          array('🎖️','Başkomutan','Mustafa Kemal Atatürk'),
          array('📊','Sonuç','Türk zaferi — Lozan Antlaşması ile tam bağımsızlık'),
          array('Siyasi Sonuc', 'Turkiye Cumhuriyeti 29 Ekim 1923\'te kuruldu'),
          array('📜','Antlaşmalar','Kars Antlaşması (1921), Ankara Antlaşması (1921), Lozan Antlaşması (1923)'),
          array('🗓️','Zafer Bayramı','30 Ağustos — Büyük Taarruz\'un başlama yıldönümü'),
          array('📅','Cumhuriyet','29 Ekim 1923 — Türkiye Cumhuriyeti ilan edildi'),
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
    <h2 class="sec-title">Millî Mücadele'nin Seyri</h2>
    <div class="g2">
      <div class="tl">
        <?php
        $tl1 = array(
          array('30 Ekim 1918','🕊️','Mondros Mütarekesi','Osmanlı İmparatorluğu I. Dünya Savaşı\'ndan yenik ayrıldı. İtilaf devletleri Anadolu\'yu işgale başladı.'),
          array('15 Mayıs 1919','⚠️','Yunan İşgali — İzmir','Yunan kuvvetleri İzmir\'e çıktı. Bu olay, Türk milletinin direniş ruhunu alevlendirdi.'),
          array('19 Mayıs 1919','🦅','Samsun\'a Çıkış','Mustafa Kemal, Samsun\'a çıkarak Millî Mücadele\'yi resmen başlattı. Erzurum ve Sivas kongrelerini topladı.'),
          array('23 Nisan 1920','🏛️','TBMM\'nin Açılışı','Türkiye Büyük Millet Meclisi Ankara\'da açıldı. Egemenlik millete devredildi. Mustafa Kemal Meclis Başkanı seçildi.'),
          array('10 Ağustos 1920','📜','Sevr Antlaşması','Osmanlı hükümeti Sevr\'i imzaladı; TBMM reddetti. Bu antlaşma fiilen hiç yürürlüğe girmedi.'),
        );
        foreach ($tl1 as $t): ?>
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
      <div class="tl">
        <?php
        $tl2 = array(
          array('İnönü 1921','🛡️','I. ve II. İnönü Muharebeleri','İsmet Paşa komutasındaki Türk kuvvetleri, Yunan taarruzlarını iki kez durdurdu. Bu zaferler Millî Mücadele\'ye inanç tazeledi.'),
          array('Ağustos–Eylül 1921','🌊','Sakarya Meydan Muharebesi','22 günlük kıyasıya çarpışmada Mustafa Kemal, Başkomutan sıfatıyla savaşı bizzat yönetti. Türk kuvvetleri Yunan taarruzunu kırdı.'),
          array('26–30 Ağustos 1922','🎯','Büyük Taarruz','Afyonkarahisar-Dumlupınar ekseni boyunca gerçekleştirilen Büyük Taarruz, Yunan ordusunu imha etti. 30 Ağustos Başkomutan Meydan Muharebesi ile zafer kesinleşti.'),
          array('9 Eylül 1922','🏆','İzmir\'in Kurtuluşu','Türk süvari birlikleri İzmir\'e girdi. Millî Mücadele\'nin son büyük hedefi gerçekleşti.'),
          array('24 Temmuz 1923','📜','Lozan Antlaşması','Modern Türkiye\'nin sınırları uluslararası alanda tanındı. Kapitülasyonlar kaldırıldı. Tam bağımsızlık kazanıldı.'),
        );
        foreach ($tl2 as $t): ?>
        <div class="tl-item">
          <div class="tl-dot" style="background:var(--g)"><?php echo $t[1]; ?></div>
          <div class="tl-body">
            <div class="tl-date" style="color:var(--g)"><?php echo esc_html($t[0]); ?></div>
            <div class="tl-title"><?php echo esc_html($t[2]); ?></div>
            <p class="tl-desc"><?php echo esc_html($t[3]); ?></p>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</div>
<!-- KRİTİK MUHAREBELER -->
<div class="sec">
  <div class="sec-w">
    <div class="badge g">Kritik Muharebeler</div>
    <h2 class="sec-title">Zaferlerimiz</h2>
    <div class="g3">
      <?php
      $muh = array(
        array('🛡️','I. İnönü Muharebesi','11 Ocak 1921','İsmet Paşa komutasında Yunan taarruzunun püskürtüldüğü ilk büyük zafer. Millî Mücadele\'ye moral tazeledi.'),
        array('🛡️','II. İnönü Muharebesi','31 Mart 1921','Yunan\'ın ikinci büyük taarruzu da Türk savunmasıyla kırıldı. İsmet Paşa Millî Mücadele\'nin sembol isimlerinden biri oldu.'),
        array('🌊','Sakarya Meydan Muharebesi','23 Ağustos – 13 Eylül 1921','Mustafa Kemal\'in Başkomutanlık yetkisiyle yönettiği ve Yunan\'ın son büyük taarruzunu kırdığı dönüm noktası. 13 Eylül anma günüdür.'),
        array('🎯','Büyük Taarruz','26-30 Ağustos 1922','Afyon-Dumlupınar ekseninde başlayan ve Yunan ordusunu tamamen imha eden tarihi harekât. 30 Ağustos Zafer Bayramı olarak kutlanır.'),
        array('🐎','Başkomutan Meydan Muharebesi','30 Ağustos 1922','Büyük Taarruz\'un doruk noktası. Türk süvari birlikleri Yunan komuta heyetini esir aldı, ordu imha edildi.'),
        array('🏆','İzmir\'in Kurtuluşu','9 Eylül 1922','Türk birliklerinin İzmir\'e girişi. Millî Mücadele\'nin fiilen sona erdiği tarihi gün. İzmir her yıl törenlerle bu tarihi kutlar.'),
      );
      foreach ($muh as $m): ?>
      <div class="card">
        <div style="font-size:2rem;margin-bottom:12px"><?php echo $m[0]; ?></div>
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--r);margin-bottom:6px"><?php echo esc_html($m[3]); ?></div>
        <h4 style="font-family:var(--fs);font-size:.95rem;font-weight:700;color:var(--t1);margin-bottom:6px"><?php echo esc_html($m[1]); ?></h4>
        <div style="font-size:11px;font-weight:700;color:var(--g);margin-bottom:10px"><?php echo esc_html($m[2]); ?></div>
        <p style="font-size:12px;color:var(--t2);line-height:1.75"><?php echo esc_html($m[4]); ?></p>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<!-- İŞGAL TABLOSU -->
<div class="sec alt">
  <div class="sec-w">
    <div class="badge r">İşgal Bilgileri</div>
    <h2 class="sec-title">Kurtuluş Günleri — Seçilmiş İller</h2>
    <p class="sec-sub">Millî Mücadele sürecinde işgal edilen ve kurtuluşa kavuşan il ve ilçelerden seçmeler. Her ilin kurtuluş günü o ilde törenlerle kutlanmaktadır.</p>
    <div style="overflow-x:auto">
      <table class="occupation-table">
        <thead>
          <tr>
            <th>İl</th>
            <th>İlçe</th>
            <th>İşgal Başlangıcı</th>
            <th>Kurtuluş Tarihi</th>
            <th>İşgal Gücü</th>
          </tr>
        </thead>
        <tbody>
          <?php
          $kurtuluslar = array(
            array('İZMİR','Merkez','15 Mayıs 1919','9 Eylül 1922','yu'),
            array('İZMİR','Bergama','12 Haziran 1919','14 Eylül 1922','yu'),
            array('İZMİR','Tire','30 Mayıs 1919','4 Eylül 1922','yu'),
            array('AYDIN','Merkez','27 Mayıs 1919','7 Eylül 1922','yu'),
            array('AYDIN','Nazilli','3 Haziran 1919','5 Eylül 1922','yu'),
            array('MANİSA','Merkez','25 Mayıs 1919','8 Eylül 1922','yu'),
            array('MANİSA','Akhisar','22 Haziran 1920','6 Eylül 1922','yu'),
            array('MANİSA','Turgutlu','29 Mayıs 1919','7 Eylül 1922','yu'),
            array('BURSA','Merkez','8 Temmuz 1920','11 Eylül 1922','yu'),
            array('BURSA','İnegöl','10 Temmuz 1921','6 Eylül 1922','yu'),
            array('KÜTAHYA','Merkez','17 Temmuz 1921','30 Ağustos 1922','yu'),
            array('ESKİŞEHİR','Merkez','20 Temmuz 1921','2 Eylül 1922','yu'),
            array('UŞAK','Merkez','28 Ağustos 1920','1 Eylül 1922','yu'),
            array('AFYON','Merkez','28 Mart 1920','27 Ağustos 1922','yu'),
            array('GAZİANTEP','Merkez','15 Ocak 1919','25 Aralık 1921','en-fr'),
            array('ADANA','Merkez','1918','5 Ocak 1922','fr'),
            array('İSTANBUL','Merkez','16 Mart 1920','6 Ekim 1923','en-fr-it'),
            array('EDİRNE','Merkez','1920','25 Kasım 1922','yu'),
            array('ÇANAKKALE','Merkez','1918','22 Eylül 1922','en-fr-it'),
            array('BALIKESİR','Merkez','30 Haziran 1920','6 Eylül 1922','yu'),
          );
          $guc_labels = array(
            'yu'      => array('Yunan','power-yu'),
            'en'      => array('İngiliz','power-en'),
            'fr'      => array('Fransız','power-fr'),
            'it'      => array('İtalyan','power-it'),
            're'      => array('Rus-Ermeni','power-re'),
            'en-fr'   => array('İngiliz-Fransız','power-en'),
            'en-fr-it'=> array('İng.-Fr.-İt.','power-en'),
          );
          foreach ($kurtuluslar as $k):
            $guc = isset($guc_labels[$k[4]]) ? $guc_labels[$k[4]] : array($k[4],'power-yu');
          ?>
          <tr>
            <td style="font-weight:700;color:var(--t1)"><?php echo esc_html($k[0]); ?></td>
            <td><?php echo esc_html($k[1]); ?></td>
            <td><?php echo esc_html($k[2]); ?></td>
            <td style="font-weight:700;color:var(--r)"><?php echo esc_html($k[3]); ?></td>
            <td><span class="power-tag <?php echo $guc[1]; ?>"><?php echo esc_html($guc[0]); ?></span></td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <p style="font-size:11.5px;color:var(--t3);margin-top:14px;font-style:italic">* Tüm kurtuluş günleri listesi için Milli Günler sayfamızı inceleyebilirsiniz.</p>
  </div>
</div>
<!-- CEPHELER -->
<div class="sec dark">
  <div class="sec-w">
    <div class="badge w">Cepheler</div>
    <h2 class="sec-title wh">Dört Cephede Mücadele</h2>
    <p class="sec-sub wh">Millî Mücadele, aynı anda birden fazla cephede yürütüldü.</p>
    <div class="g4">
      <?php
      $cepheler = array(
        array('🌊','Batı Cephesi','Yunan','İzmir\'den başlayarak Ege ve Marmara bölgelerine yayılan en büyük cephe. İnönü, Sakarya ve Büyük Taarruz\'la kazanıldı.'),
        array('🌙','Güney Cephesi','Fransız - Ermeni','Adana, Gaziantep, Kahramanmaraş, Hatay\'da Fransız ve Ermeni kuvvetlerine karşı yürütülen mücadele. Ankara Antlaşması ile sona erdi.'),
        array('❄️','Doğu Cephesi','Ermeni - Gürcü','Erzurum, Kars, Ardahan bölgelerinde Ermeni ve Gürcü kuvvetlerine karşı yürütülen harekât. Kars Antlaşması ile kazanıldı.'),
        array('🏙️','Istanbul','Ingiliz - Fransiz - Italyan','Istanbul 1920-1923 yillari arasinda isgal altinda kaldi. Lozan ve ardindan 6 Ekim 1923\'te kurtarildi.'),
      );
      foreach ($cepheler as $c): ?>
      <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:24px">
        <div style="font-size:2rem;margin-bottom:12px"><?php echo $c[0]; ?></div>
        <h4 style="font-family:var(--fs);font-size:1rem;font-weight:700;color:#fff;margin-bottom:6px"><?php echo esc_html($c[1]); ?></h4>
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--g);margin-bottom:10px"><?php echo esc_html($c[2]); ?></div>
        <p style="font-size:12px;color:rgba(255,255,255,.5);line-height:1.75"><?php echo esc_html($c[3]); ?></p>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<!-- CTA -->
<div class="cta-band">
  <div class="cta-w">
    <div class="cta-text">
      <h3>Bu Topraklar Bedelsiz Değildi</h3>
      <p>Şehitlerimize rahmet, gazilerimize sonsuz saygı ve minnettarlık.</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a href="<?php echo esc_url(home_url('/milli-gunler')); ?>" class="btn-wh">📅 Millî Günler</a>
      <a href="<?php echo esc_url(home_url('/canakkale-savasi')); ?>" class="btn-ol">⚔️ Çanakkale</a>
    </div>
  </div>
</div>
</div>
<?php endif; get_footer(); ?>