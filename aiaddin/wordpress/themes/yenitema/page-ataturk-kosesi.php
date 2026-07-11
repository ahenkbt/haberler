<?php
/**
 * Template Name: Atatürk Köşesi
 * Template Post Type: page
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();
if (have_posts()) { the_post(); }
$vkv_slug   = 'ataturk-kosesi';
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
/* HERO */
.atk-hero{width:100%;background:linear-gradient(150deg,#0a0c0e 0%,var(--dk) 50%,var(--dk2) 100%);padding:80px 40px 64px;position:relative;overflow:hidden}
.atk-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 70% 50%,rgba(201,168,76,.08) 0%,transparent 60%)}
.atk-hero-w{max-width:var(--w);margin:0 auto;display:grid;grid-template-columns:1fr 420px;gap:60px;align-items:center;position:relative;z-index:1}
.atk-eyebrow{display:inline-flex;align-items:center;gap:8px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:var(--g);font-size:9.5px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:20px}
.atk-hero-h1{font-family:var(--fs);font-size:clamp(2.2rem,4vw,3.5rem);font-weight:700;color:#fff;line-height:1.1;margin-bottom:14px}
.atk-hero-h1 em{color:var(--g);font-style:italic;display:block}
.atk-hero-sub{font-size:13.5px;color:rgba(255,255,255,.5);line-height:1.85;max-width:520px;margin-bottom:24px}
.atk-hero-quote{background:rgba(201,168,76,.08);border-left:3px solid var(--g);padding:16px 20px;border-radius:0 6px 6px 0;margin-bottom:28px;font-family:var(--fs);font-size:13px;font-style:italic;color:rgba(255,255,255,.8);line-height:1.7}
.atk-nav{display:flex;gap:10px;flex-wrap:wrap}
.atk-nav a{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border:1.5px solid rgba(255,255,255,.12);color:rgba(255,255,255,.65);border-radius:4px;font-size:11.5px;font-weight:700;text-decoration:none;transition:all .2s}
.atk-nav a:hover{background:rgba(201,168,76,.15);border-color:var(--g);color:var(--g)}
.atk-hero-r{border-radius:12px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.4);background:linear-gradient(135deg,var(--dk2),#060810);height:420px;display:flex;align-items:center;justify-content:center}
.atk-hero-r img{width:100%;height:100%;object-fit:cover;opacity:.85}
.atk-placeholder{text-align:center;color:rgba(255,255,255,.3)}
.atk-placeholder .ico{font-size:5rem;margin-bottom:12px}
.atk-placeholder p{font-size:12px;letter-spacing:2px;text-transform:uppercase}
/* BÖLÜMLER */
.sec{width:100%;padding:64px 40px}
.sec.alt{background:var(--gr)}
.sec-w{max-width:var(--w);margin:0 auto}
.badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px}
.badge.g{background:rgba(201,168,76,.1);color:#7a5a00;border:1px solid rgba(201,168,76,.3)}
.badge.r{background:rgba(140,26,46,.08);color:var(--r);border:1px solid rgba(140,26,46,.15)}
.sec-title{font-family:var(--fs);font-size:1.9rem;font-weight:700;color:var(--t1);margin-bottom:10px}
.sec-sub{font-size:14px;color:var(--t3);line-height:1.75;max-width:760px;margin-bottom:32px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.card{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:24px;transition:all .22s;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--r),var(--g))}
.card:hover{box-shadow:0 8px 28px rgba(0,0,0,.08);transform:translateY(-3px)}
/* HIZLI BİLGİLER */
.facts-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:40px}
.fact{background:#fff;border:1px solid var(--bd);border-radius:8px;padding:18px 14px;text-align:center}
.fact-num{font-size:1.4rem;font-weight:800;color:var(--r);line-height:1;margin-bottom:4px}
.fact-lbl{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--t3)}
/* ZAMAN ŞERİDİ */
.tl{display:flex;flex-direction:column;gap:0;position:relative}
.tl::before{content:'';position:absolute;left:28px;top:0;bottom:0;width:2px;background:var(--bd)}
.tl-item{display:flex;gap:22px;align-items:flex-start;padding-bottom:32px}
.tl-dot{width:56px;height:56px;border-radius:50%;background:var(--r);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;position:relative;z-index:1;box-shadow:0 0 0 4px var(--bd)}
.tl-body{padding:8px 0 0;flex:1}
.tl-year{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--r);margin-bottom:4px}
.tl-title{font-family:var(--fs);font-size:1rem;font-weight:700;color:var(--t1);margin-bottom:6px}
.tl-desc{font-size:12.5px;color:var(--t2);line-height:1.8}
/* ALTI OK */
.arrows-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.arrow-card{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:28px;transition:all .22s;border-top:4px solid var(--g)}
.arrow-card:hover{box-shadow:0 8px 28px rgba(0,0,0,.08);transform:translateY(-3px)}
.arrow-icon{font-size:2rem;margin-bottom:14px}
.arrow-title{font-family:var(--fs);font-size:1.05rem;font-weight:700;color:var(--t1);margin-bottom:6px}
.arrow-sub{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--r);margin-bottom:12px}
.arrow-desc{font-size:12.5px;color:var(--t2);line-height:1.8}
/* ALINTILER */
.quotes-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.quote-card{background:var(--dk);border-radius:10px;padding:28px;position:relative;overflow:hidden}
.quote-card::before{content:'"';font-size:6rem;color:rgba(201,168,76,.12);position:absolute;top:-10px;left:16px;font-family:var(--fs);line-height:1}
.q-text{font-family:var(--fs);font-size:1rem;font-style:italic;color:#fff;line-height:1.65;position:relative;z-index:1;margin-bottom:14px}
.q-meta{font-size:9.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.3)}
/* CTA */
.cta-band{background:linear-gradient(135deg,var(--r),var(--rd));padding:52px 40px;width:100%}
.cta-w{max-width:var(--w);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap}
.cta-text h3{font-family:var(--fs);font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:8px}
.cta-text p{font-size:13px;color:rgba(255,255,255,.65);line-height:1.6}
.btn-wh{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:#fff;color:var(--r);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
.btn-ol{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
@media(max-width:1024px){.atk-hero-w{grid-template-columns:1fr}.atk-hero-r{display:none}.facts-grid{grid-template-columns:repeat(3,1fr)}.arrows-grid,.g3{grid-template-columns:repeat(2,1fr)}}
@media(max-width:640px){.sec,.atk-hero,.cta-band{padding:48px 24px}.facts-grid,.g4,.quotes-grid{grid-template-columns:1fr}.arrows-grid,.g3{grid-template-columns:1fr}}
</style>
<div class="pw">
<!-- HERO -->
<div class="atk-hero">
  <div class="atk-hero-w">
    <div>
      <div class="atk-eyebrow">⭐ Atatürk Köşesi</div>
      <h1 class="atk-hero-h1">Mustafa Kemal<em>Atatürk</em></h1>
      <p class="atk-hero-sub">Türkiye Cumhuriyeti'nin kurucusu, büyük asker ve devlet adamı. Mustafa Kemal Atatürk (1881–1938), çökmekte olan bir imparatorluğu modern, laik ve demokratik bir cumhuriyete dönüştürerek dünya tarihine geçmiştir.</p>
      <div class="atk-hero-quote">"Yurtta sulh, cihanda sulh." — Mustafa Kemal Atatürk</div>
      <div class="atk-nav">
        <a href="<?php echo esc_url(home_url('/ataturk-hayati')); ?>">📖 Hayatı</a>
        <a href="<?php echo esc_url(home_url('/ataturk-kronoloji')); ?>">📅 Kronoloji</a>
        <a href="<?php echo esc_url(home_url('/ataturk-ilkeler')); ?>">⚖️ İlkeleri</a>
        <a href="<?php echo esc_url(home_url('/ataturk-sozleri')); ?>">💬 Sözleri</a>
      </div>
    </div>
    <div class="atk-hero-r">
      <div class="atk-placeholder">
        <div class="ico">🇹🇷</div>
        <p>Mustafa Kemal Atatürk</p>
      </div>
    </div>
  </div>
</div>
<!-- HIZLI BİLGİLER -->
<div class="sec">
  <div class="sec-w">
    <div class="badge g">Kısa Bilgiler</div>
    <h2 class="sec-title">Atatürk Hakkında Temel Bilgiler</h2>
    <div class="facts-grid">
      <div class="fact"><div class="fact-num">1881</div><div class="fact-lbl">Doğum Yılı</div></div>
      <div class="fact"><div class="fact-num">1938</div><div class="fact-lbl">Vefat Yılı</div></div>
      <div class="fact"><div class="fact-num">1923</div><div class="fact-lbl">Cumhuriyetin İlanı</div></div>
      <div class="fact"><div class="fact-num">15 Yıl</div><div class="fact-lbl">Cumhurbaşkanlığı</div></div>
      <div class="fact"><div class="fact-num">40+</div><div class="fact-lbl">Büyük Reform</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start">
      <div>
        <div class="badge r">Biyografi</div>
        <h3 style="font-family:var(--fs);font-size:1.3rem;font-weight:700;color:var(--t1);margin-bottom:14px">Mustafa Kemal Atatürk Kimdir?</h3>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9;margin-bottom:14px">Mustafa Kemal, 1881 yılında Osmanlı İmparatorluğu'nun önemli bir limanı olan <strong>Selanik'te</strong> (bugünkü Yunanistan) doğdu. Babası Ali Rıza Efendi, bir gümrük memuruydı. Babasını erken yaşta kaybeden Mustafa'yı güçlü ve azimli annesi Zübeyde Hanım büyüttü.</p>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9;margin-bottom:14px">Askeri okula başladıktan sonra matematik öğretmeni, onun üstün zekâsını fark ederek <strong>"Kemal"</strong> adını verdi — olgunluk ve mükemmellik anlamına geliyordu. İstanbul Harp Okulu'ndan 1905'te, Harp Akademisi'nden 1907'de kurmay subay olarak mezun oldu.</p>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9;margin-bottom:14px">Çanakkale Savaşları'nda (1915) 19. Tümen komutanı olarak gösterdiği üstün liderlik onu ulusal kahraman yaptı. Ardından Millî Mücadele'yi (1919–1922) bizzat komuta ederek Anadolu'yu işgalden kurtardı.</p>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9">29 Ekim 1923'te Türkiye Cumhuriyeti'ni ilan etti ve ilk Cumhurbaşkanı oldu. 10 Kasım 1938'deki vefatına kadar ülkeyi yöneterek toplumun her alanında köklü reformlar gerçekleştirdi.</p>
      </div>
      <div>
        <div class="badge g">Kişisel Profil</div>
        <h3 style="font-family:var(--fs);font-size:1.3rem;font-weight:700;color:var(--t1);margin-bottom:14px">Kişisel Bilgiler</h3>
        <?php
        $profil = array(
          array('📍','Doğum Yeri','Selanik (Osmanlı İmparatorluğu / bugünkü Yunanistan)'),
          array('📅','Vefat Tarihi','10 Kasım 1938 — Dolmabahçe Sarayı, İstanbul'),
          array('🎓','Eğitim','Selanik Askeri Rüştiyesi; Manastır Askeri İdadisi; İstanbul Harp Okulu (1905); İstanbul Harp Akademisi (1907)'),
          array('💍','Aile','Latife Hanım ile evli (1923–1925); birçok evlat edindi'),
          array('🗣️','Diller','Türkçe, Fransızca, Almanca (kısmen)'),
          array('📚','Eserleri','Nutuk (1927); Geometri; Gençliğe Hitabe (1927)'),
          array('🏛️','Son İstirahatgâhı','Anıtkabir, Ankara (1953\'te nakledildi)'),
          array('🌍','Mirası','20. yüzyılın en büyük devlet adamlarından biri; pek çok ülkenin onursal vatandaşı'),
        );
        foreach ($profil as $p): ?>
        <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--bd);align-items:flex-start">
          <span style="font-size:1.2rem;flex-shrink:0;width:28px"><?php echo $p[0]; ?></span>
          <div>
            <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--t3);margin-bottom:2px"><?php echo $p[1]; ?></div>
            <div style="font-size:12.5px;color:var(--t1);line-height:1.55"><?php echo esc_html($p[2]); ?></div>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</div>
<!-- ÖZET KRONOLOJİ -->
<div class="sec alt">
  <div class="sec-w">
    <div class="badge g">Önemli Dönüm Noktaları</div>
    <h2 class="sec-title">Hayatının Özeti</h2>
    <p class="sec-sub">Mustafa Kemal Atatürk'ün hayatındaki en önemli anlar — Selanik'ten Ankara'ya.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px">
      <div class="tl">
        <?php
        $tl1 = array(
          array('1881','🌟','Selanik\'te Doğdu','Ali Rıza Efendi ve Zübeyde Hanım\'ın oğlu olarak Selanik\'te dünyaya geldi. Babası erken vefat edince annesinin güçlü rehberliğinde büyüdü.'),
          array('1905','🎖️','Kurmay Subay Oldu','İstanbul Harp Akademisi\'nden Kurmay Yüzbaşı olarak mezun oldu. Şam\'a tayin edilen Mustafa Kemal, orada reform yanlısı subaylarla tanıştı.'),
          array('1915','⚔️','Çanakkale Muharebeleri','19. Tümen komutanı olarak Arıburnu\'nu savundu. "Size taarruzu değil, ölmeyi emrediyorum" emriyle tarihe geçti; İtilaf kuvvetlerinin ilerleyişini durdurdu.'),
          array('1919','🦅','Samsun\'a Çıkış — 19 Mayıs','19 Mayıs 1919\'da Samsun\'a çıkarak Millî Mücadele\'yi başlattı. Erzurum ve Sivas kongrelerini topladı; ulusal direnişi örgütledi.'),
        );
        foreach ($tl1 as $t): ?>
        <div class="tl-item">
          <div class="tl-dot"><?php echo $t[1]; ?></div>
          <div class="tl-body">
            <div class="tl-year"><?php echo $t[0]; ?></div>
            <div class="tl-title"><?php echo esc_html($t[2]); ?></div>
            <div class="tl-desc"><?php echo esc_html($t[3]); ?></div>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
      <div class="tl">
        <?php
        $tl2 = array(
          array('1923','🏛️','Türkiye Cumhuriyeti\'nin İlanı','29 Ekim 1923\'te Türkiye Büyük Millet Meclisi Cumhuriyet\'i ilan etti. Mustafa Kemal, oybirliğiyle ilk Cumhurbaşkanı seçildi.'),
          array('1924–1934','⚖️','Reformlar Dönemi','Hilafetin kaldırılması, Medeni Kanun, Latin alfabesi, ölçü birimleri, kadınların seçme-seçilme hakkı ve Soyadı Kanunu başlıca reformlardır.'),
          array('1934','🪪','Soyadı: Atatürk','Türkiye Büyük Millet Meclisi, Mustafa Kemal\'e "Atatürk" soyadını verdi — Türklerin Babası anlamına geliyordu. Bu isim yalnızca ona verilmiştir.'),
          array('1938','🕯️','Vefatı ve Mirası','10 Kasım 1938 sabahı saat 09:05\'te Dolmabahçe Sarayı\'nda vefat etti. Geride bıraktığı miras; bağımsız, laik ve demokratik bir Türkiye Cumhuriyeti\'dir.'),
        );
        foreach ($tl2 as $t): ?>
        <div class="tl-item">
          <div class="tl-dot"><?php echo $t[1]; ?></div>
          <div class="tl-body">
            <div class="tl-year"><?php echo $t[0]; ?></div>
            <div class="tl-title"><?php echo esc_html($t[2]); ?></div>
            <div class="tl-desc"><?php echo esc_html($t[3]); ?></div>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
    <div style="text-align:center;margin-top:32px">
      <a href="<?php echo esc_url(home_url('/ataturk-kronoloji')); ?>" style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:var(--r);color:#fff;border-radius:4px;font-size:12px;font-weight:700;text-decoration:none">Tam Kronolojiye Git →</a>
    </div>
  </div>
</div>
<!-- ALTI OK — KISA -->
<div class="sec">
  <div class="sec-w">
    <div class="badge r">Siyasi Felsefe</div>
    <h2 class="sec-title">Altı Ok — Atatürk'ün İlkeleri</h2>
    <p class="sec-sub">Kemalizm'in altı temel ilkesi; 1937'de Türkiye Cumhuriyeti Anayasası'na girerek bugün de geçerliliğini korumaktadır.</p>
    <div class="arrows-grid">
      <?php
      $oklar = array(
        array('🏛️','Cumhuriyetçilik','Cumhuriyetcilik','Egemenlik kayıtsız şartsız milletindir. Devlet, halkın seçtiği temsilciler aracılığıyla yönetilir. Saltanat ve Hilafet kaldırılmıştır.'),
        array('🌍','Milliyetçilik','Milliyetcilik','Etnik değil, vatandaşlığa dayalı sivil milliyetçilik. Anadolu\'nun tüm halklarını ortak bir ulusal kimlik altında birleştirir.'),
        array('🤝','Halkçılık','Halkcilik','Tüm vatandaşlar yasa önünde eşittir. Hiçbir sınıf, zümre ya da ailenin ayrıcalığı yoktur. Devlet, herkesin refahı için çalışır.'),
        array('🏗️','Devletçilik','Devletcilik','Devlet, özel sermayenin yetersiz kaldığı sektörlerde ekonomiyi bizzat yönlendirir ve kalkınmayı güvence altına alır.'),
        array('⚖️','Laiklik','Laiklik','Din ile devlet işleri birbirinden ayrıdır. Din kişisel bir meseledir; devlet akıl ve bilim ışığında yönetilir. Din özgürlüğü güvence altındadır.'),
        array('🔄','Devrimcilik','Devrimcilik / İnkılapçılık','Sürekli ilerleme ve modernleşme. Reformlar donmuş değildir; toplum her zaman çağdaş uygarlık standartlarına doğru yürümelidir.'),
      );
      foreach ($oklar as $o): ?>
      <div class="arrow-card">
        <div class="arrow-icon"><?php echo $o[0]; ?></div>
        <div class="arrow-title"><?php echo esc_html($o[1]); ?></div>
        <div class="arrow-sub"><?php echo esc_html($o[2]); ?></div>
        <p class="arrow-desc"><?php echo esc_html($o[3]); ?></p>
      </div>
      <?php endforeach; ?>
    </div>
    <div style="text-align:center;margin-top:28px">
      <a href="<?php echo esc_url(home_url('/ataturk-ilkeler')); ?>" style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;border:1.5px solid var(--r);color:var(--r);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none">Tüm İlkeleri İncele →</a>
    </div>
  </div>
</div>
<!-- SEÇİLMİŞ SÖZLER -->
<div class="sec alt">
  <div class="sec-w">
    <div class="badge g">Sözlerinden</div>
    <h2 class="sec-title">Seçilmiş Sözler</h2>
    <p class="sec-sub">Bir milleti şekillendiren ve dünyaya ilham vermeye devam eden sözler.</p>
    <div class="quotes-grid">
      <?php
      $sozler = array(
        array('"Yurtta sulh, cihanda sulh."','Dış Politika İlkesi · 1931'),
        array('"Hayatta en hakiki mürşit ilimdir."','Eğitim Felsefesi'),
        array('"Egemenlik kayıtsız şartsız milletindir."','Cumhuriyetin İlanı · 1923'),
        array('"Ne mutlu Türküm diyene!"','Millî Birlik · 1933'),
        array('"Muhtaç olduğun kudret damarlarındaki asil kanda mevcuttur."','Gençliğe Hitabe · 1927'),
        array('"Ey Türk gençliği! Birinci vazifen, Türk istiklalini, Türk Cumhuriyetini ilelebet muhafaza ve müdafaa etmektir."','Gençliğe Hitabe · 1927'),
      );
      foreach ($sozler as $s): ?>
      <div class="quote-card">
        <p class="q-text"><?php echo esc_html($s[0]); ?></p>
        <div class="q-meta">— Mustafa Kemal Atatürk &nbsp;·&nbsp; <?php echo esc_html($s[1]); ?></div>
      </div>
      <?php endforeach; ?>
    </div>
    <div style="text-align:center;margin-top:28px">
      <a href="<?php echo esc_url(home_url('/ataturk-sozleri')); ?>" style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:var(--dk);color:#fff;border-radius:4px;font-size:12px;font-weight:700;text-decoration:none">Tüm Sözleri Gör →</a>
    </div>
  </div>
</div>
<!-- CTA -->
<div class="cta-band">
  <div class="cta-w">
    <div class="cta-text">
      <h3>Atatürk'ü Daha Yakından Tanıyın</h3>
      <p>Hayatı, kronolojisi, ilkeleri ve sözleriyle büyük önderin mirasını keşfetmeye devam edin.</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a href="<?php echo esc_url(home_url('/ataturk-hayati')); ?>" class="btn-wh">📖 Hayatı</a>
      <a href="<?php echo esc_url(home_url('/ataturk-sozleri')); ?>" class="btn-ol">💬 Sözleri</a>
    </div>
  </div>
</div>
</div>
<?php endif; get_footer(); ?>
