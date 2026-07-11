<?php
/**
 * Template Name: Milli Gunler
 * Template Post Type: page
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();
if (have_posts()) { the_post(); }
$vkv_slug   = 'milli-gunler';
$vkv_custom = function_exists('vkv_get_custom_page_content') ? vkv_get_custom_page_content($vkv_slug) : '';
$vkv_wp     = get_the_content();
$has_custom = !empty(trim($vkv_custom));
$has_wp     = !empty(trim(strip_tags($vkv_wp)));
if ($has_custom): 
    echo '<div style="max-width:100%;width:100%;padding:0;margin:0">' . apply_filters('the_content', $vkv_custom) . '</div>';
elseif ($has_wp): 
    echo '<div style="max-width:100%;width:100%;padding:0;margin:0">' . apply_filters('the_content', $vkv_wp) . '</div>';
else:
?>
<style>
:root{--r:#0e7490;--rd:#155e75;--g:#C9A84C;--dk:#0D1117;--dk2:#1C2330;--wh:#FAFAF8;--gr:#F5F2ED;--bd:#E4E0D8;--t1:#1A1F28;--t2:#4A5568;--t3:#718096;--fn:'Nunito Sans',system-ui,sans-serif;--fs:'Merriweather',Georgia,serif;--w:1440px}
*{box-sizing:border-box}.pw{font-family:var(--fn);background:var(--wh);color:var(--t1)}
#content,main{max-width:100%!important;padding:0!important;width:100%!important;margin:0!important}
.ph{width:100%;background:linear-gradient(150deg,#050203 0%,var(--dk) 45%,var(--dk2) 100%);padding:80px 40px 64px;position:relative;overflow:hidden}
.ph::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(201,168,76,.08) 0%,transparent 60%)}
.ph-w{max-width:var(--w);margin:0 auto;text-align:center;position:relative;z-index:1}
.ph-ew{display:inline-flex;align-items:center;gap:8px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:var(--g);font-size:9.5px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:18px}
.ph-h1{font-family:var(--fs);font-size:clamp(2rem,3.5vw,2.8rem);font-weight:700;color:#fff;line-height:1.12;margin-bottom:14px}
.ph-h1 em{color:var(--g);font-style:italic}
.ph-desc{font-size:13.5px;color:rgba(255,255,255,.5);line-height:1.85;max-width:680px;margin:0 auto}
.sec{width:100%;padding:64px 40px}.sec.alt{background:var(--gr)}.sec.dark{background:var(--dk);padding:64px 40px}
.sec-w{max-width:var(--w);margin:0 auto}
.badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px}
.badge.g{background:rgba(201,168,76,.1);color:#7a5a00;border:1px solid rgba(201,168,76,.3)}
.badge.r{background:rgba(140,26,46,.08);color:var(--r);border:1px solid rgba(140,26,46,.15)}
.badge.w{background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.15)}
.sec-title{font-family:var(--fs);font-size:1.9rem;font-weight:700;color:var(--t1);margin-bottom:10px}
.sec-title.wh{color:#fff}.sec-sub{font-size:14px;color:var(--t3);line-height:1.75;max-width:760px;margin-bottom:32px}
/* TAKVİM KARTLARI */
.takvim-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.gun-card{background:#fff;border:1px solid var(--bd);border-radius:12px;overflow:hidden;transition:all .25s;display:flex;flex-direction:column}
.gun-card:hover{box-shadow:0 10px 32px rgba(0,0,0,.1);transform:translateY(-4px)}
.gun-card-head{padding:20px 22px;display:flex;align-items:center;gap:16px}
.gun-card-head.red{background:var(--r)}.gun-card-head.gold{background:var(--g)}.gun-card-head.dark{background:var(--dk)}.gun-card-head.navy{background:#1B2A4A}.gun-card-head.grey{background:#6b7280}
.gun-date-box{text-align:center;flex-shrink:0}
.gun-day{font-size:2rem;font-weight:800;color:#fff;line-height:1}
.gun-month{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.7);margin-top:2px}
.gun-head-text h3{font-family:var(--fs);font-size:1rem;font-weight:700;color:#fff;line-height:1.35;margin-bottom:3px}
.gun-head-text .gun-type{font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.6)}
.gun-card-body{padding:18px 22px;flex:1}
.gun-desc{font-size:12.5px;color:var(--t2);line-height:1.8}
/* KURTULUŞ TABLOSU */
.kurtulus-table-wrapper{overflow-x:auto; margin-top:20px;}
.kurtulus-table{width:100%;border-collapse:collapse;font-size:12px; min-width:800px;}
.kurtulus-table th{background:var(--dk);color:rgba(255,255,255,.7);padding:10px 14px;text-align:left;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid var(--r)}
.kurtulus-table td{padding:9px 14px;border-bottom:1px solid var(--bd);color:var(--t2);line-height:1.5;vertical-align:top}
.kurtulus-table tr:nth-child(even) td{background:var(--gr)}
.kurtulus-table tr:hover td{background:rgba(201,168,76,.05)}
.kurtulus-table .il{font-weight:700;color:var(--t1)}
.kurtulus-table .tarih{font-weight:700;color:var(--r);white-space:nowrap}
.power-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700}
.p-fr{background:rgba(0,80,200,.1);color:#0050c8}.p-en{background:rgba(180,30,30,.1);color:#b41e1e}
.p-yu{background:rgba(0,120,60,.1);color:#007838}.p-re{background:rgba(130,0,40,.1);color:#820028}
.p-it{background:rgba(0,140,160,.1);color:#008ca0}.p-gu{background:rgba(60,60,120,.1);color:#3c3c78}
.cta-band{background:linear-gradient(135deg,var(--r),var(--rd));padding:52px 40px;width:100%}
.cta-w{max-width:var(--w);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap}
.cta-text h3{font-family:var(--fs);font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:8px}
.cta-text p{font-size:13px;color:rgba(255,255,255,.65);line-height:1.6}
.btn-wh{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:#fff;color:var(--r);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
.btn-ol{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
@media(max-width:1024px){.takvim-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:768px){.takvim-grid{grid-template-columns:1fr}.sec,.ph,.cta-band{padding:48px 24px}}
</style>
<div class="pw">
<div class="ph">
  <div class="ph-w">
    <div class="ph-ew">🇹🇷 Millî Günler &amp; Anma Törenleri</div>
    <h1 class="ph-h1">Millî ve Zafer Günleri <em>&amp; Anma Takvimi</em></h1>
    <p class="ph-desc">Türkiye'nin resmî millî günleri, zafer bayramları, anma törenleri ve il il kurtuluş günleri. Şehitlerimizi ve gazilerimizi saygıyla anıyoruz.</p>
  </div>
</div>
<div class="sec">
  <div class="sec-w">
    <div class="badge r">Millî ve Zafer Günleri</div>
    <h2 class="sec-title">Anma, Millî ve Zafer Günleri Takvimi</h2>
    <p class="sec-sub">Türkiye Cumhuriyeti'nde resmî olarak kutlanan ve anılan önemli günler.</p>
    <div class="takvim-grid">
      <?php
      $glist = array(
        array('red',  '25', 'Ocak',    'Kumyangjang-ni (Kore)',          'Askeri Anma',
              '25 Ocak 1951 tarihinde Türk Tugayı Kore\'de Çin kuvvetlerine karşı tarihi bir zafer kazandı. Kumyangjang-ni Muharebesi, Türk askerinin kahramanlığının simgesi olarak her yıl törenlerle anılır.'),
        array('red',  '18', 'Mart',    'Çanakkale Deniz Zaferi &amp; Şehitler Günü', 'Şehitler Günü',
              '18 Mart 1915 tarihinde Türk topçu ve mayın hatları İtilaf filosunu büyük bir bozguna uğrattı. Şehitler Günü olarak tüm yurtta resmi törenler ve anma etkinlikleri düzenlenir.'),
        array('dark', '25', 'Nisan',   'Çanakkale Kara Muharebesi',      'Askeri Anma',
              'ANZAC kuvvetlerinin Arıburnu çıkarmasının ve Mustafa Kemal\'in tarihi emrinin yıldönümü. Gelibolu Şehitler Abidesi\'nde devlet törenleri düzenlenir. Avustralya ve Yeni Zelanda\'da da ANZAC Günü olarak anılır.'),
        array('gold', '19', 'Mayıs',   'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', 'Ulusal Bayram',
              'Mustafa Kemal\'in Samsun\'a çıkışının ve Millî Mücadele\'yi başlatmasının yıldönümü. Tüm yurtta gençlik etkinlikleri, spor gösterileri ve törenler düzenlenir. Resmi tatil günüdür.'),
        array('dark', '25', 'Haziran', 'Kore Savaşı Başlangıcı',          'Askeri Anma',
              'Kuzey Kore\'nin 38. Paralel\'i geçmesiyle başlayan Kore Savaşı\'nın yıldönümü. Türkiye BM çatısı altında bu savaşa katılmış; 741 şehit vermiştir.'),
        array('red',  '20', 'Temmuz',  'Kıbrıs Barış Harekâtı',          'Millî Gün',
              'Türkiye\'nin Garanti Antlaşması kapsamında Kıbrıs\'a çıkarma yapmasının yıldönümü. Kıbrıs Türklerini koruma harekâtı Türkiye ve KKTC\'de törenlerle kutlanır.'),
        array('navy', '6-9','Ağustos', 'Anafartalar Muharebesi',          'Askeri Anma',
              'Mustafa Kemal\'in Anafartalar Grubu komutanı olarak İtilaf\'ın son büyük taarruzunu kırdığı muharebe. 6-10 Ağustos 1915. Gelibolu\'da özel törenler düzenlenir.'),
        array('gold', '30', 'Ağustos', 'Zafer Bayramı',                  'Ulusal Bayram',
              'Büyük Taarruz ve Başkomutan Meydan Muharebesi\'nin zaferle sonuçlandığı 30 Ağustos 1922 günü. Türk ordusunun resmi bayramı. Tüm yurtta geçit törenleri yapılır. Resmi tatil günüdür.'),
        array('dark', '13', 'Eylül',   'Sakarya Meydan Muharebesi',      'Askeri Anma',
              'Sakarya Meydan Muharebesi\'nin zaferle sonuçlandığı gün. 23 günlük bu büyük muharebeden sonra Mustafa Kemal Gazi unvanını aldı.'),
        array('navy', '19', 'Eylül',   'Gaziler Günü',                    'Millî Anma',
              'Her yıl 19 Eylül\'de Gaziler Günü kutlanır. Tüm savaşlarda yaralanan veya sakat kalan gazilerimiz törenlerle onurlandırılır.'),
        array('gold', '29', 'Ekim',    'Cumhuriyet Bayramı',              'Ulusal Bayram',
              'Türkiye Cumhuriyeti\'nin 29 Ekim 1923\'teki ilanının yıldönümü. Yılın en büyük millî kutlaması. Resmi geçit törenleri ve kutlamalar tüm yurtta gerçekleşir. Resmi tatil günüdür.'),
        array('dark', '10', 'Kasım',   'Atatürk\'ü Anma Günü',            'Millî Anma',
              'Mustafa Kemal Atatürk\'ün 10 Kasım 1938 sabahı saat 09:05\'te vefatının yıldönümü. Tüm yurtta 09:05\'te saygı duruşunda bulunulur. Okul ve kurumlarda anma törenleri yapılır.'),
      );
      foreach ($glist as $g):
        $head_class = $g[0];
      ?>
      <div class="gun-card">
        <div class="gun-card-head <?php echo esc_attr($head_class); ?>">
          <div class="gun-date-box">
            <div class="gun-day"><?php echo esc_html($g[1]); ?></div>
            <div class="gun-month"><?php echo esc_html($g[2]); ?></div>
          </div>
          <div class="gun-head-text">
            <h3><?php echo $g[3]; ?></h3>
            <div class="gun-type"><?php echo esc_html($g[4]); ?></div>
          </div>
        </div>
        <div class="gun-card-body">
          <p class="gun-desc"><?php echo esc_html($g[5]); ?></p>
        </div>
      </div>
      <?php endforeach; ?>
      <div class="gun-card">
        <div class="gun-card-head grey">
          <div class="gun-date-box">
            <div class="gun-day" style="font-size:1.5rem">—</div>
            <div class="gun-month">Çeşitli</div>
          </div>
          <div class="gun-head-text">
            <h3>Mahalli Kurtuluş Günleri</h3>
            <div class="gun-type">İl Törenleri</div>
          </div>
        </div>
        <div class="gun-card-body">
          <p class="gun-desc">Millî Mücadele sürecinde işgalden kurtulan her ilin ve ilçenin kendine özgü kurtuluş günü vardır. Bu günler il ve ilçelerde tören, etkinlik ve kutlamalarla anılır. Detaylı liste aşağıdaki tabloda yer almaktadır.</p>
        </div>
      </div>
      <div class="gun-card">
        <div class="gun-card-head grey">
          <div class="gun-date-box">
            <div class="gun-day" style="font-size:1.5rem">—</div>
            <div class="gun-month">Çeşitli</div>
          </div>
          <div class="gun-head-text">
            <h3>Diğer Kahramanlık Günleri</h3>
            <div class="gun-type">Askerî Anma</div>
          </div>
        </div>
        <div class="gun-card-body">
          <p class="gun-desc">Tarih boyunca Türk milletinin yazdığı diğer kahramanlık destanları; Malazgirt Zaferi (26 Ağustos 1071), Mohaç Meydan Muharebesi, Preveze Deniz Zaferi (27 Eylül 1538) ve diğer tarihi zaferler çeşitli etkinliklerle anılmaktadır.</p>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="sec alt">
  <div class="sec-w">
    <div class="badge r">Kurtuluş Günleri</div>
    <h2 class="sec-title">İl ve İlçe Kurtuluş Günleri</h2>
    <p class="sec-sub">Millî Mücadele sürecinde işgale uğrayan ve kurtuluşa kavuşan il ve ilçelerin kurtuluş tarihleri. Her ilçenin kurtuluş yıldönümü, mahalli törenlerle kutlanmaktadır.</p>
    <div class="kurtulus-table-wrapper">
      <table class="kurtulus-table">
        <thead>
          <tr>
            <th>#</th><th>İl</th><th>İlçe</th><th>İşgal Başlangıcı</th><th>Kurtuluş Tarihi</th><th>İşgal Gücü</th>
          </tr>
        </thead>
        <tbody>
          <?php
          $kurtuluslar = array(
            array(1,'ADANA','Pozantı','1918','25.05.1920','fr'),
            array(1,'ADANA','Ceyhan','1918','05.01.1922','fr'),
            array(1,'ADANA','Merkez','1918','05.01.1922','fr'),
            array(1,'ADANA','Saimbeyli','1918','22.10.1920','fr'),
            array(1,'ADANA','Kozan','1918','02.06.1920','fr'),
            array(3,'AFYON','Merkez','28.03.1920','27.08.1922','yu'),
            array(3,'AFYON','Bolvadin','14.04.1921','24.09.1921','yu'),
            array(4,'AĞRI','Eleşkirt','1917','16.04.1918','re'),
            array(4,'AĞRI','Merkez','1917','15.04.1918','re'),
            array(5,'AMASYA','Merkez','15.03.1919','28.09.1919','en'),
            array(9,'AYDIN','Merkez','27.05.1919','07.09.1922','yu'),
            array(9,'AYDIN','Nazilli','03.06.1919','05.09.1922','yu'),
            array(10,'BALIKESİR','Merkez','30.06.1920','06.09.1922','yu'),
            array(10,'BALIKESİR','Edremit','01.07.1920','09.09.1922','yu'),
            array(10,'BALIKESİR','Bandırma','02.07.1920','17.09.1922','yu'),
            array(11,'BİLECİK','Merkez','06.01.1921','04.09.1922','yu'),
            array(16,'BURSA','Merkez','08.07.1920','11.09.1922','yu'),
            array(16,'BURSA','İnegöl','10.07.1921','06.09.1922','yu'),
            array(17,'ÇANAKKALE','Merkez','1918','22.09.1922','en-fr-it'),
            array(17,'ÇANAKKALE','Gelibolu','04.08.1920','26.11.1923','yu'),
            array(20,'DENİZLİ','Buldan','05.07.1920','04.09.1922','yu'),
            array(22,'EDİRNE','Merkez','1920','25.11.1922','yu'),
            array(22,'EDİRNE','Uzunköprü','14.11.1918','18.11.1922','yu-fr'),
            array(25,'ERZURUM','Merkez','16.02.1916','12.03.1918','re'),
            array(26,'ESKİŞEHİR','Merkez','20.07.1921','02.09.1922','yu'),
            array(27,'GAZİANTEP','Merkez','15.01.1919','25.12.1921','en-fr'),
            array(29,'GÜMÜŞHANE','Merkez','1916','15.02.1918','re'),
            array(31,'HATAY','Merkez (Antakya)','07.12.1918','23.07.1939','fr'),
            array(31,'HATAY','İskenderun','12.11.1918','05.07.1938','fr'),
            array(33,'İÇEL','Merkez','16.12.1918','03.01.1922','en'),
            array(33,'İÇEL','Tarsus','19.12.1918','05.01.1922','fr'),
            array(34,'İSTANBUL','Merkez','16.03.1920','06.10.1923','en-fr-it'),
            array(35,'İZMİR','Merkez','15.05.1919','09.09.1922','yu'),
            array(35,'İZMİR','Bergama','12.06.1919','14.09.1922','yu'),
            array(35,'İZMİR','Tire','30.05.1919','04.09.1922','yu'),
            array(35,'İZMİR','Ödemiş','01.06.1919','09.03.1922','yu'),
            array(36,'KARS','Merkez','—','30.10.1920','re'),
            array(39,'KIRKLARELİ','Merkez','—','10.11.1922','yu'),
            array(41,'KOCAELİ','Merkez (İzmit)','28.04.1921','28.06.1921','yu'),
            array(43,'KÜTAHYA','Merkez','17.07.1921','30.08.1922','yu'),
            array(43,'KÜTAHYA','Tavşanlı','14.07.1921','03.09.1922','yu'),
            array(45,'MANİSA','Merkez','25.05.1919','08.09.1922','yu'),
            array(45,'MANİSA','Akhisar','22.06.1920','06.09.1922','yu'),
            array(45,'MANİSA','Turgutlu','29.05.1919','07.09.1922','yu'),
            array(46,'KAHRAMANMARAŞ','Merkez','29.10.1919','12.02.1920','en-fr'),
            array(47,'MARDİN','Merkez','21.11.1919','21.11.1922','fr'),
            array(54,'SAKARYA','Merkez','26.03.1921','21.06.1921','yu'),
            array(59,'TEKİRDAĞ','Merkez','20.07.1920','13.11.1920','yu'),
            array(61,'TRABZON','Merkez','18.04.1916','24.02.1918','re'),
            array(63,'ŞANLIURFA','Merkez','1919','11.04.1920','en-fr'),
            array(64,'UŞAK','Merkez','28.08.1920','01.09.1922','yu'),
            array(67,'ZONGULDAK','Merkez','—','21.06.1921','fr'),
            array(75,'ARDAHAN','Merkez','24.04.1919','23.02.1921','re-gu'),
            array(76,'IĞDIR','Merkez','12.02.1919','14.11.1920','re'),
            array(80,'OSMANİYE','Merkez','1918','07.01.1922','fr'),
          );
          $guc_map = array(
            'yu'      => array('Yunan','p-yu'),
            'en'      => array('İngiliz','p-en'),
            'fr'      => array('Fransız','p-fr'),
            're'      => array('Rus-Ermeni','p-re'),
            'it'      => array('İtalyan','p-it'),
            'gu'      => array('Gürcü','p-gu'),
            're-gu'   => array('Rus-Ermeni-Gürcü','p-re'),
            'en-fr'   => array('İngiliz-Fransız','p-en'),
            'yu-fr'   => array('Yunan-Fransız','p-yu'),
            'en-fr-it'=> array('İng.-Fr.-İt.','p-en'),
          );
          foreach ($kurtuluslar as $k):
            $guc = isset($guc_map[$k[5]]) ? $guc_map[$k[5]] : array($k[5],'p-yu');
          ?>
          <tr>
            <td style="color:var(--t3);font-size:11px"><?php echo esc_html($k[0]); ?></td>
            <td class="il"><?php echo esc_html($k[1]); ?></td>
            <td><?php echo esc_html($k[2]); ?></td>
            <td style="font-size:11px;color:var(--t3)"><?php echo esc_html($k[3]); ?></td>
            <td class="tarih"><?php echo esc_html($k[4]); ?></td>
            <td><span class="power-tag <?php echo $guc[1]; ?>"><?php echo esc_html($guc[0]); ?></span></td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <p style="font-size:11.5px;color:var(--t3);margin-top:16px;font-style:italic">Kaynak: T.C. İçişleri Bakanlığı verilerine dayalı tablo. Bazı tarihler yaklaşık olabilir. Tam liste için ilgili il ve ilçe belediyelerine başvurabilirsiniz.</p>
  </div>
</div>
<div class="cta-band">
  <div class="cta-w">
    <div class="cta-text">
      <h3>Şehitlerimize Rahmet, Gazilerimize Saygı</h3>
      <p>Her şehidimiz bir yıldız, her gazimiz bir destanın kahramanıdır.</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a href="<?php echo esc_url(home_url('/canakkale-savasi')); ?>" class="btn-wh">⚔️ Çanakkale</a>
      <a href="<?php echo esc_url(home_url('/kurtulus-savasi')); ?>" class="btn-ol">🦅 Kurtuluş Savaşı</a>
    </div>
  </div>
</div>
</div>
<?php 
endif; 
get_footer(); 
?>