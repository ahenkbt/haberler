<?php
/**
 * Template Name: Atatürk Hayatı
 * Template Post Type: page
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();
if (have_posts()) { the_post(); }
$vkv_slug   = 'ataturk-hayati';
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
.ph{width:100%;background:linear-gradient(150deg,var(--dk) 0%,var(--dk2) 60%,#0a0c0e 100%);padding:80px 40px 64px}
.ph-w{max-width:var(--w);margin:0 auto;display:grid;grid-template-columns:1.2fr 1fr;gap:60px;align-items:center}
.ph-ew{display:inline-flex;align-items:center;gap:7px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:var(--g);font-size:9.5px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:18px}
.ph-h1{font-family:var(--fs);font-size:clamp(2rem,3.5vw,3rem);font-weight:700;color:#fff;line-height:1.15;margin-bottom:14px}
.ph-h1 em{color:var(--g);font-style:italic;display:block}
.ph-desc{font-size:13.5px;color:rgba(255,255,255,.55);line-height:1.85;max-width:520px}
.sec{width:100%;padding:64px 40px}
.sec.alt{background:var(--gr)}
.sec-w{max-width:var(--w);margin:0 auto}
.badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px}
.badge.g{background:rgba(201,168,76,.1);color:#7a5a00;border:1px solid rgba(201,168,76,.3)}
.badge.r{background:rgba(140,26,46,.08);color:var(--r);border:1px solid rgba(140,26,46,.15)}
.sec-title{font-family:var(--fs);font-size:1.9rem;font-weight:700;color:var(--t1);margin-bottom:10px}
.sec-sub{font-size:14px;color:var(--t3);line-height:1.75;max-width:760px;margin-bottom:32px}
.chapter{background:#fff;border:1px solid var(--bd);border-radius:12px;overflow:hidden;margin-bottom:24px}
.chapter-hd{display:grid;grid-template-columns:auto 1fr;gap:0}
.chapter-num{background:var(--r);color:#fff;font-size:1.5rem;font-weight:800;padding:24px 28px;display:flex;align-items:center;justify-content:center;min-width:80px}
.chapter-info{padding:22px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.chapter-year{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--r);margin-bottom:4px}
.chapter-title{font-family:var(--fs);font-size:1.1rem;font-weight:700;color:var(--t1)}
.chapter-body{padding:0 28px 28px;border-top:1px solid var(--bd);font-size:13.5px;color:var(--t2);line-height:1.9}
.chapter-body p{margin-top:18px}
.chapter-body strong{color:var(--t1)}
.key-events{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
.ke{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;background:var(--gr);border:1px solid var(--bd);border-radius:20px;font-size:11px;font-weight:700;color:var(--t2)}
.milestones{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:32px}
.ms{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:22px;text-align:center;transition:all .22s}
.ms:hover{box-shadow:0 6px 20px rgba(0,0,0,.07);transform:translateY(-2px)}
.ms-icon{font-size:2rem;margin-bottom:10px}
.ms-title{font-family:var(--fs);font-size:.9rem;font-weight:700;color:var(--t1);margin-bottom:6px}
.ms-desc{font-size:11.5px;color:var(--t2);line-height:1.6}
.cta-band{background:linear-gradient(135deg,var(--r),var(--rd));padding:52px 40px;width:100%}
.cta-w{max-width:var(--w);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap}
.cta-text h3{font-family:var(--fs);font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:8px}
.cta-text p{font-size:13px;color:rgba(255,255,255,.65);line-height:1.6}
.btn-wh{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:#fff;color:var(--r);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
.btn-ol{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
@media(max-width:1024px){.milestones{grid-template-columns:repeat(2,1fr)}}
@media(max-width:768px){.ph-w{grid-template-columns:1fr}.sec,.ph,.cta-band{padding:48px 24px}.milestones{grid-template-columns:1fr}}
</style>
<div class="pw">
<div class="ph">
  <div class="ph-w">
    <div>
      <div class="ph-ew">📖 Atatürk Köşesi</div>
      <h1 class="ph-h1">Mustafa Kemal Atatürk<em>Hayatı &amp; Mirası</em></h1>
      <p class="ph-desc">Selanik'ten Ankara'ya, savaş cephelerinden cumhurbaşkanlığına uzanan olağanüstü bir hayat. Büyük önderin hayatını, karakterini ve Türk milletine armağan ettiği eserleri keşfedin.</p>
    </div>
    <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:24px">
      <?php
      /* NOTE: Turkish apostrophes (kesme işareti) inside PHP strings MUST be escaped as \' */
      $ozet = array(
        array('1881', 'Selanik\'te Dogdu'),
        array('1905', 'Kurmay Subay Oldu'),
        array('1915', 'Canakkale - Ulusal Kahraman'),
        array('1919', 'Milli Mucadele Basladi - Samsun'),
        array('1923', 'Turkiye Cumhuriyeti Kuruldu'),
        array('1938', 'Vefati - 10 Kasim, Istanbul'),
      );
      foreach ($ozet as $o): ?>
      <div style="display:flex;gap:14px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)">
        <div style="font-size:11px;font-weight:800;color:var(--g);white-space:nowrap;width:36px"><?php echo $o[0]; ?></div>
        <div style="font-size:12px;color:rgba(255,255,255,.65)"><?php echo esc_html($o[1]); ?></div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<!-- HAYAT BOLUMLERI -->
<div class="sec">
  <div class="sec-w">
    <div class="badge g">Biyografi</div>
    <h2 class="sec-title">Bes Bolumde Buyuk Bir Hayat</h2>
    <p class="sec-sub">Mustafa Kemal Ataturk'un hayati bes temel bolumde ele alindigi zaman, bir milletin yeniden dogusunum destani ortaya cikar.</p>
    <!-- Bolum 1 -->
    <div class="chapter">
      <div class="chapter-hd">
        <div class="chapter-num">01</div>
        <div class="chapter-info">
          <div>
            <div class="chapter-year">1881 &ndash; 1904</div>
            <div class="chapter-title">Erken Yasam &amp; Egitim</div>
          </div>
          <span style="font-size:1.2rem">📚</span>
        </div>
      </div>
      <div class="chapter-body">
        <p>Mustafa, 1881 yılında Osmanlı İmparatorluğu'nun önemli bir liman şehri olan <strong>Selanik'te</strong> dünyaya geldi. Babası Ali Rıza Efendi küçük bir gümrük memuruydu; Mustafa daha küçükken hayatını kaybetti. Güçlü ve kararlı annesi Zübeyde Hanım, oğlunu iyi bir eğitim alması için büyük fedakârlıklar yaparak yetiştirdi.</p>
        <p>Askeri okula başladıktan sonra matematik öğretmeni, onun üstün zekâsını fark ederek <strong>"Kemal"</strong> adını verdi — olgunluk ve mükemmellik anlamına geliyordu. 1905'te Harp Okulu'ndan, 1907'de Harp Akademisi'nden kurmay yüzbaşı olarak mezun oldu.</p>
        <p><strong>Manastır Askeri İdadisi'nde</strong> (bugünkü Kuzey Makedonya) eğitimini sürdüren Mustafa Kemal, 1899'da İstanbul'a gelerek Harp Okulu'na girdi. Henüz genç bir subayken hem ülkenin geleceği üzerine derin düşünceler taşıyor hem de reformcu subaylarla ilişki kuruyordu.</p>
        <div class="key-events">
          <span class="ke">🏫 Selanik Askeri Rüştiyesi</span>
          <span class="ke">🏫 Manastır Askeri İdadisi</span>
          <span class="ke">🎓 Harp Okulu 1905</span>
          <span class="ke">🎓 Harp Akademisi 1907</span>
        </div>
      </div>
    </div>
    <!-- Bolum 2 -->
    <div class="chapter">
      <div class="chapter-hd">
        <div class="chapter-num" style="background:#1C2330">02</div>
        <div class="chapter-info">
          <div>
            <div class="chapter-year">1905 &ndash; 1918</div>
            <div class="chapter-title">Askeri Kariyer &amp; I. Dünya Savaşı</div>
          </div>
          <span style="font-size:1.2rem">⚔️</span>
        </div>
      </div>
      <div class="chapter-body">
        <p>Mezuniyetin ardından <strong>Şam</strong> ve <strong>Makedonya'ya</strong> tayin edilen Mustafa Kemal, İttihat ve Terakki Cemiyeti ile temasa geçti. <strong>Trablusgarp Savaşı'nda</strong> (Libya, 1911) İtalyan işgaline karşı savaştı; <strong>Balkan Savaşları'nda</strong> (1912–1913) da görev yaptı.</p>
        <p>Tarihe adını altın harflerle yazdırdığı an, <strong>Çanakkale Muharebeleri'nde</strong> (1915) geldi. 19. Tümen komutanı olarak Conk Bayırı ve Arıburnu'nu savundu. Ünlü emri şöyledir: <em>"Size taarruzu değil, ölmeyi emrediyorum!"</em> İtilaf kuvvetlerinin yarımadasını geçmesini engelleyen bu savunma, Mustafa Kemal'i ulusal kahraman yaptı.</p>
        <p><strong>Doğu Cephesi'nde</strong> Ruslara ve <strong>Suriye Cephesi'nde</strong> İngilizlere karşı da savaştı. Savaşın sonunda Osmanlı İmparatorluğu çökmüştü. Mondros Mütarekesi'nin koşullarını onuruna yediremeyen Mustafa Kemal, ulusal kurtuluş için kolları sıvadı.</p>
        <div class="key-events">
          <span class="ke">⚔️ Çanakkale — 1915</span>
          <span class="ke">🏅 Generalliğe Terfi</span>
          <span class="ke">🔴 Osmanlı'nın Çöküşü</span>
        </div>
      </div>
    </div>
    <!-- Bolum 3 -->
    <div class="chapter">
      <div class="chapter-hd">
        <div class="chapter-num" style="background:#059669">03</div>
        <div class="chapter-info">
          <div>
            <div class="chapter-year">1919 &ndash; 1923</div>
            <div class="chapter-title">Millî Mücadele</div>
          </div>
          <span style="font-size:1.2rem">🦅</span>
        </div>
      </div>
      <div class="chapter-body">
        <p><strong>19 Mayıs 1919'da</strong> Samsun'a çıkan Mustafa Kemal, Millî Mücadele'nin fitilini ateşledi. İtilaf devletleri, Sevr Antlaşması ile Anadolu'yu paylaşmıştı; Yunan kuvvetleri İzmir'i işgal etmişti. Türk milletinin geleceği tehlikedeydi.</p>
        <p><strong>Erzurum ve Sivas kongrelerini</strong> toplayarak ulusal direniş örgütledi. 23 Nisan 1920'de <strong>Türkiye Büyük Millet Meclisi</strong> Ankara'da açıldı; Mustafa Kemal, Meclis Başkanı seçildi.</p>
        <p>Türk kuvvetleri; <strong>Sakarya Meydan Muharebesi'nde</strong> (1921) ve <strong>Büyük Taarruz'da</strong> (Ağustos 1922) İtilaf ve Yunan kuvvetlerini ezerek İzmir'i 9 Eylül 1922'de kurtardı. <strong>Lozan Antlaşması</strong> (Temmuz 1923) modern Türkiye'nin sınırlarını uluslararası alanda tanıttı.</p>
        <div class="key-events">
          <span class="ke">🚢 Samsun Çıkışı — 19 Mayıs 1919</span>
          <span class="ke">🏛️ TBMM Açıldı — 1920</span>
          <span class="ke">⚔️ Sakarya Zaferi — 1921</span>
          <span class="ke">🎯 Büyük Taarruz — 1922</span>
          <span class="ke">📜 Lozan Antlaşması — 1923</span>
        </div>
      </div>
    </div>
    <!-- Bolum 4 -->
    <div class="chapter">
      <div class="chapter-hd">
        <div class="chapter-num" style="background:var(--dk2)">04</div>
        <div class="chapter-info">
          <div>
            <div class="chapter-year">1923 &ndash; 1934</div>
            <div class="chapter-title">Cumhuriyetin İnşası — Reformlar Dönemi</div>
          </div>
          <span style="font-size:1.2rem">🏗️</span>
        </div>
      </div>
      <div class="chapter-body">
        <p><strong>29 Ekim 1923'te</strong> Türkiye Büyük Millet Meclisi, <strong>Türkiye Cumhuriyeti'ni</strong> ilan etti. Mustafa Kemal, oybirliğiyle ilk Cumhurbaşkanı seçildi. Yeni Cumhuriyet; halk egemenliği ve laiklik temellerinde, Osmanlı'dan köklü bir kopuşu temsil ediyordu.</p>
        <p>Ardından tarihte eşine az rastlanır kapsamlı bir modernleşme hamlesi başladı. Başlıca reformlar:</p>
        <p>— <strong>Halifeliğin Kaldırılması (1924)</strong> — Din ile devletin birbirinden ayrılması<br>
        — <strong>Medeni Kanun (1926)</strong> — Kadınlara evlilik, boşanma ve miras hakkında eşit haklar<br>
        — <strong>Latin Alfabesi (1928)</strong> — Arap harfleri yerine Latin alfabesi; okuma-yazma seferberliği<br>
        — <strong>Kadınlara Belediye Oy Hakkı (1930)</strong> ve <strong>Milletvekili Seçme Hakkı (1934)</strong><br>
        — <strong>Soyadı Kanunu (1934)</strong> — TBMM, Mustafa Kemal'e "Atatürk" soyadını verdi<br>
        — <strong>Ölçü, Takvim ve Saat Reformu</strong> — Türkiye uluslararası standartlara geçti</p>
        <div class="key-events">
          <span class="ke">🏛️ Cumhuriyetin İlanı — 1923</span>
          <span class="ke">📜 Medeni Kanun — 1926</span>
          <span class="ke">🔤 Latin Alfabesi — 1928</span>
          <span class="ke">🗳️ Kadınlara Oy Hakkı — 1934</span>
          <span class="ke">🪪 Soyadı Kanunu — 1934</span>
        </div>
      </div>
    </div>
    <!-- Bolum 5 -->
    <div class="chapter">
      <div class="chapter-hd">
        <div class="chapter-num" style="background:#6b7280">05</div>
        <div class="chapter-info">
          <div>
            <div class="chapter-year">1934 &ndash; 1938</div>
            <div class="chapter-title">Son Yılları &amp; Ebediyete Yolculuk</div>
          </div>
          <span style="font-size:1.2rem">🕯️</span>
        </div>
      </div>
      <div class="chapter-body">
        <p>Son yıllarında Atatürk; demokratik kurumları pekiştirmeye, ekonomik kalkınmayı hızlandırmaya ve Türkiye'nin <strong>bağımsız ve barışçıl</strong> dış politikasını sürdürmeye devam etti. "Yurtta sulh, cihanda sulh" ilkesi, Türkiye'yi II. Dünya Savaşı öncesinde tarafsız tuttu.</p>
        <p>Sağlığı <strong>siroz</strong> nedeniyle hızla bozuldu. Buna karşın çalışmayı bırakmadı. <strong>10 Kasım 1938</strong> sabahı <strong>saat 09:05'te</strong>, <strong>İstanbul Dolmabahçe Sarayı'nda</strong> hayata gözlerini yumdu. 57 yaşındaydı.</p>
        <p>Türk milleti ve tüm dünya derin bir üzüntüye büründü. Cenazesi önce Ankara Etnografya Müzesi'nde muhafaza edildi; 1953'te <strong>Anıtkabir'e</strong> nakledildi. Bu anıt mezar, her yıl milyonlarca ziyaretçiyi ağırlamaktadır.</p>
        <p>Geride bıraktığı miras; bağımsız bir Cumhuriyet, okuryazar bir toplum ve Türkiye'nin modern dünyada saygın yerini almasını sağlayan köklü bir dönüşümdür.</p>
        <div class="key-events">
          <span class="ke">🕯️ 10 Kasım 1938'de Vefat Etti</span>
          <span class="ke">🏛️ Anıtkabir — Ankara</span>
          <span class="ke">🌍 Kalıcı Miras</span>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- BASARILARI -->
<div class="sec alt">
  <div class="sec-w">
    <div class="badge r">Başarıları</div>
    <h2 class="sec-title">Atatürk Neden Önemlidir?</h2>
    <p class="sec-sub">Atatürk'ün Türkiye'yi dönüştürme hızı ve kapsamı, modern tarihte eşine az rastlanır bir örnektir.</p>
    <div class="milestones">
      <div class="ms">
        <div class="ms-icon">🏛️</div>
        <div class="ms-title">Cumhuriyeti Kurdu</div>
        <div class="ms-desc">29 Ekim 1923'te 600 yıllık imparatorluğu modern ve demokratik bir devlete dönüştürdü.</div>
      </div>
      <div class="ms">
        <div class="ms-icon">🔤</div>
        <div class="ms-title">Alfabe Devrimi</div>
        <div class="ms-desc">1928'de Arap harfleri yerine Latin alfabesi getirildi. Okuryazarlık oranı bir nesilde yüzde doksanın üzerine çıktı.</div>
      </div>
      <div class="ms">
        <div class="ms-icon">⚖️</div>
        <div class="ms-title">Kadın Hakları</div>
        <div class="ms-desc">Türk kadınları 1934'te tam milletvekili seçme ve seçilme hakkını kazandı; Fransa ve İtalya'dan önce.</div>
      </div>
      <div class="ms">
        <div class="ms-icon">📚</div>
        <div class="ms-title">Herkese Eğitim</div>
        <div class="ms-desc">Birleşik laik devlet okulu sistemi kuruldu; yüzlerce okul ve öğretmen okulu açıldı.</div>
      </div>
      <div class="ms">
        <div class="ms-icon">🕌</div>
        <div class="ms-title">Laik Devlet</div>
        <div class="ms-desc">Din ile devlet işleri birbirinden ayrıldı; din özgürlüğü güvence altına alınırken devlet akıl ve bilim ışığında yönetilir oldu.</div>
      </div>
      <div class="ms">
        <div class="ms-icon">🌍</div>
        <div class="ms-title">Uluslararası Tanınma</div>
        <div class="ms-desc">Lozan Antlaşması ile modern Türk devletinin sınırları uluslararası alanda onaylandı.</div>
      </div>
      <div class="ms">
        <div class="ms-icon">⚔️</div>
        <div class="ms-title">Millî Kurtuluş</div>
        <div class="ms-desc">Millî Mücadele'yi bizzat komuta ederek Anadolu'yu işgalden kurtardı ve Türk egemenliğini yeniden tesis etti.</div>
      </div>
      <div class="ms">
        <div class="ms-icon">🎖️</div>
        <div class="ms-title">Çanakkale Zaferi</div>
        <div class="ms-desc">1915'te Çanakkale'yi savunarak İtilaf kuvvetlerini durdurdu; bu zafer onu savaş bitmeden ulusal kahraman yaptı.</div>
      </div>
    </div>
  </div>
</div>
<!-- CTA -->
<div class="cta-band">
  <div class="cta-w">
    <div class="cta-text">
      <h3>Atatürk'ü Keşfetmeye Devam Edin</h3>
      <p>Tam kronoloji, altı ilke ve seçilmiş sözleriyle büyük önderin mirasını inceleyin.</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a href="<?php echo esc_url(home_url('/ataturk-kronoloji')); ?>" class="btn-wh">📅 Kronoloji</a>
      <a href="<?php echo esc_url(home_url('/ataturk-ilkeler')); ?>" class="btn-ol">⚖️ İlkeleri</a>
    </div>
  </div>
</div>
</div>
<?php endif; get_footer(); ?>