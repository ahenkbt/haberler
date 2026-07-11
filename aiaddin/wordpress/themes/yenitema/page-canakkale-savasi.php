<?php
/**
 * Template Name: Canakkale Savasi
 * Template Post Type: page
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();
if (have_posts()) { the_post(); }
$vkv_slug   = 'canakkale-savasi';
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
.ph{width:100%;background:linear-gradient(150deg,#050709 0%,#0D1117 45%,#1a0a10 100%);padding:80px 40px 64px;position:relative;overflow:hidden}
.ph::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 60%,rgba(140,26,46,.18) 0%,transparent 60%)}
.ph-w{max-width:var(--w);margin:0 auto;display:grid;grid-template-columns:1.2fr 1fr;gap:60px;align-items:center;position:relative;z-index:1}
.ph-ew{display:inline-flex;align-items:center;gap:8px;background:rgba(140,26,46,.2);border:1px solid rgba(140,26,46,.4);color:#e87a8a;font-size:9.5px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:18px}
.ph-h1{font-family:var(--fs);font-size:clamp(2rem,3.5vw,3rem);font-weight:700;color:#fff;line-height:1.12;margin-bottom:14px}
.ph-h1 em{color:var(--g);font-style:italic;display:block}
.ph-desc{font-size:13.5px;color:rgba(255,255,255,.55);line-height:1.85;max-width:520px;margin-bottom:10px}
.ph-quote{background:rgba(140,26,46,.15);border-left:3px solid var(--r);padding:16px 20px;border-radius:0 6px 6px 0;margin-top:20px;font-family:var(--fs);font-size:13px;font-style:italic;color:rgba(255,255,255,.8);line-height:1.7}
.ph-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.ph-stat{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:16px 18px;text-align:center}
.ph-stat-num{font-size:1.5rem;font-weight:800;color:var(--g);line-height:1;margin-bottom:4px}
.ph-stat-lbl{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.35)}
.sec{width:100%;padding:64px 40px}
.sec.alt{background:var(--gr)}
.sec.dark{background:var(--dk);padding:64px 40px}
.sec-w{max-width:var(--w);margin:0 auto}
.badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px}
.badge.g{background:rgba(201,168,76,.1);color:#7a5a00;border:1px solid rgba(201,168,76,.3)}
.badge.r{background:rgba(140,26,46,.08);color:var(--r);border:1px solid rgba(140,26,46,.15)}
.badge.w{background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.15)}
.sec-title{font-family:var(--fs);font-size:1.9rem;font-weight:700;color:var(--t1);margin-bottom:10px}
.sec-title.wh{color:#fff}
.sec-sub{font-size:14px;color:var(--t3);line-height:1.75;max-width:760px;margin-bottom:32px}
.sec-sub.wh{color:rgba(255,255,255,.5)}
.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.card{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:24px;transition:all .22s;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--r),var(--g))}
.card:hover{box-shadow:0 8px 28px rgba(0,0,0,.08);transform:translateY(-3px)}
.tl{display:flex;flex-direction:column;position:relative}
.tl::before{content:'';position:absolute;left:28px;top:0;bottom:0;width:2px;background:var(--bd)}
.tl-item{display:flex;gap:22px;align-items:flex-start;padding-bottom:28px}
.tl-dot{width:56px;height:56px;border-radius:50%;background:var(--r);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;position:relative;z-index:1;box-shadow:0 0 0 4px var(--bd)}
.tl-body{padding:8px 0 0;flex:1}
.tl-date{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--r);margin-bottom:4px}
.tl-title{font-family:var(--fs);font-size:1rem;font-weight:700;color:var(--t1);margin-bottom:6px}
.tl-desc{font-size:12.5px;color:var(--t2);line-height:1.8}
.commander-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.cmd-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:24px;text-align:center}
.cmd-flag{font-size:2.5rem;margin-bottom:12px}
.cmd-name{font-family:var(--fs);font-size:.95rem;font-weight:700;color:#fff;margin-bottom:4px}
.cmd-title{font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--g);margin-bottom:10px}
.cmd-desc{font-size:11.5px;color:rgba(255,255,255,.5);line-height:1.65}
.anma-card{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:24px;display:flex;gap:20px;align-items:flex-start}
.anma-date{background:var(--r);color:#fff;border-radius:6px;padding:12px 16px;text-align:center;flex-shrink:0;min-width:72px}
.anma-day{font-size:1.6rem;font-weight:800;line-height:1}
.anma-month{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-top:2px}
.anma-body h4{font-family:var(--fs);font-size:1rem;font-weight:700;color:var(--t1);margin-bottom:6px}
.anma-body p{font-size:12.5px;color:var(--t2);line-height:1.75}
.cta-band{background:linear-gradient(135deg,var(--r),var(--rd));padding:52px 40px;width:100%}
.cta-w{max-width:var(--w);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap}
.cta-text h3{font-family:var(--fs);font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:8px}
.cta-text p{font-size:13px;color:rgba(255,255,255,.65);line-height:1.6}
.btn-wh{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:#fff;color:var(--r);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
.btn-ol{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
@media(max-width:1024px){.g4{grid-template-columns:repeat(2,1fr)}.commander-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:768px){.ph-w,.g3,.g2{grid-template-columns:1fr}.sec,.ph,.cta-band{padding:48px 24px}.ph-stats{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="pw">
<!-- HERO -->
<div class="ph">
  <div class="ph-w">
    <div>
      <div class="ph-ew">⚔️ Savaşlar · Çanakkale</div>
      <h1 class="ph-h1">Çanakkale Savaşları<em>1915 — Ölmek İçin Emir</em></h1>
      <p class="ph-desc">Tarihin en çetin savunma muharebelerinden biri. Çanakkale Cephesi'nde Türk askeri, ezici bir üstünlüğe sahip İtilaf kuvvetlerini sekiz ay boyunca durdurmayı başardı ve tarihin akışını değiştirdi.</p>
      <div class="ph-quote">"Size taarruzu değil, ölmeyi emrediyorum. Bize taarruz edecek olan düşmana karşı geçecek zaman zarfında, başka kuvvetler ve kumandanlar mevziimize gelebilir."<br><span style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:.6;margin-top:8px;display:block">— Mustafa Kemal, Arıburnu, 1915</span></div>
    </div>
    <div class="ph-stats">
      <div class="ph-stat"><div class="ph-stat-num">250.000+</div><div class="ph-stat-lbl">Türk Şehit ve Yaralı</div></div>
      <div class="ph-stat"><div class="ph-stat-num">8 Ay</div><div class="ph-stat-lbl">Cephe Süresi</div></div>
      <div class="ph-stat"><div class="ph-stat-num">500.000+</div><div class="ph-stat-lbl">İtilaf Kaybı</div></div>
      <div class="ph-stat"><div class="ph-stat-num">18 Mart</div><div class="ph-stat-lbl">Zafer Günü</div></div>
    </div>
  </div>
</div>
<!-- GENEL BİLGİ -->
<div class="sec">
  <div class="sec-w">
    <div class="g2">
      <div>
        <div class="badge r">Savaşın Önemi</div>
        <h2 class="sec-title">Çanakkale Neden Önemlidir?</h2>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9;margin-bottom:14px">Çanakkale Savaşları (Şubat 1915 – Ocak 1916), I. Dünya Savaşı'nın en kritik cephelerinden birini oluşturur. İngiltere ve Fransa öncülüğündeki İtilaf devletleri, İstanbul Boğazı'nı geçerek Osmanlı İmparatorluğu'nu savaş dışı bırakmayı ve Rusya'ya ikmal yolu açmayı hedefliyordu.</p>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9;margin-bottom:14px">Türk ordusu, sayı ve teçhizat bakımından çok üstün bir düşmana karşı sekiz ay boyunca yarımadayı savundu. Bu savunma yalnızca askeri bir zafer değil; bir milletin yeniden doğuş destanı oldu. Mustafa Kemal'in burada kazandığı ün, ileride Millî Mücadele'yi örgütleyecek liderin filizlendiği toprak oldu.</p>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9">Çanakkale zaferi; İtilaf devletlerinin doğu stratejisini çökertti, Rusya'nın ikmal yolunu kapattı ve Osmanlı'nın çöküşünü en az bir yıl geciktirdi. Bugün hem Türkiye hem de ANZAC ülkeleri (Avustralya ve Yeni Zelanda) bu muharebe alanlarını saygıyla anmaktadır.</p>
      </div>
      <div>
        <div class="badge g">Temel Bilgiler</div>
        <h2 class="sec-title">Savaşın Künyesi</h2>
        <?php
        $bilgiler = array(
          array('📅','Tarih','Şubat 1915 – Ocak 1916'),
          array('📍','Yer','Gelibolu Yarımadası, Çanakkale Boğazı'),
          array('⚔️','Taraflar','Osmanlı İmparatorluğu — İngiltere, Fransa, Avustralya, Yeni Zelanda, Hindistan, Kanada'),
          array('🎖️','Türk Komutanlar','Mareşal Liman von Sanders (Genel), Mustafa Kemal (19. Tümen), Halil Sami, Cevat Paşa'),
          array('🏳️','İtilaf Komutanlar','General Sir Ian Hamilton, Amiral Sackville Carden, General Frederick Stopford'),
          array('📊','Sonuç','Türk zaferi — İtilaf kuvvetleri yarımadayı tahliye etti'),
          array('🕯️','Türk Kayıpları','Yaklaşık 57.000 şehit, 185.000+ yaralı'),
          array('💔','İtilaf Kayıpları','Yaklaşık 44.000 ölü, 97.000 yaralı'),
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
<!-- KRONOLOJI -->
<div class="sec alt">
  <div class="sec-w">
    <div class="badge r">Kronoloji</div>
    <h2 class="sec-title">Savaşın Seyri</h2>
    <p class="sec-sub">Çanakkale Savaşları'nın aylara göre gelişimi ve dönüm noktaları.</p>
    <div class="g2">
      <div class="tl">
        <?php
        $tl1 = array(
          array('19 Şubat 1915','🚢','Deniz Harekâtı Başladı','İngiliz ve Fransız savaş gemileri Çanakkale Boğazı\'nın dış tahkimatlarını bombalamaya başladı. Amiral Carden komutasındaki filo, boğazı zorla geçmeyi planladı.'),
          array('18 Mart 1915','🔴','Büyük Deniz Taarruzunun Püskürtülmesi','İtilaf filosunun boğazı geçme girişimi, Türk mayın hattı ve topçu ateşiyle tam bir bozguna uğradı. 6 savaş gemisi battı ya da hasar gördü. Bu tarih bugün Çanakkale Deniz Zaferi olarak anılır.'),
          array('25 Nisan 1915','🪖','Kara Çıkarması Başladı','ANZAC kuvvetleri Arıburnu\'na, İngilizler Seddülbahir\'e çıkarma yaptı. Mustafa Kemal, 19. Tümen ile Conk Bayırı\'nı tuttu ve tarihi emrini verdi.'),
          array('Mayıs 1915','⚔️','Kanlı Çarpışmalar','Her iki taraf da siperlerden çıkamıyordu. Conk Bayırı, Kilitbahir, Narin Burnu\'nda kanlı çarpışmalar yaşandı. Mustafa Kemal yaralandı; üstündeki saat bir şarapnel parçasını durdurdu.'),
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
          array('6-10 Ağustos 1915','🏔️','Anafartalar Muharebesi','İtilaf kuvvetleri Anafartalar\'a yeni çıkarma yaparak Türk hatlarını yarmayı denedi. Mustafa Kemal, Anafartalar Grubu komutanı olarak tüm taarruzları bizzat yönetip püskürttü.'),
          array('Ekim–Kasım 1915','❄️','Kış ve Yorgunluk','Cephe tutuldu. Her iki tarafta da kayıplar çok ağırdı. İtilaf komuta kademesi geri çekilmeye karar verdi.'),
          array('Aralık 1915','🚶','İtilaf Tahliyesi','ANZAC ve Suvla Koyu\'ndaki kuvvetler Türklere sezdirilmeden gece geri çekildi. Bu tahliye, savaşın en başarılı harekâtlarından biri olarak tarihe geçti.'),
          array('9 Ocak 1916','🏆','Seddülbahir\'in Tahliyesi','Son İtilaf kuvvetleri de yarımadayı terk etti. Çanakkale Cephesi Türk zaferiyle sona erdi. Sekiz ay süren bu savunma, dünya askerlik tarihine geçti.'),
        );
        foreach ($tl2 as $t): ?>
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
</div>
<!-- MUHAREBELER -->
<div class="sec">
  <div class="sec-w">
    <div class="badge g">Başlıca Muharebeler</div>
    <h2 class="sec-title">Cephenin Kritik Noktaları</h2>
    <div class="g3">
      <?php
      $muh = array(
        array('⚓','18 Mart Deniz Muharebesi','1915','Türk topçusu ve mayın hattının İtilaf filosunu büyük bir bozguna uğrattığı tarihi gün. 6 savaş gemisi battı ya da devre dışı kaldı. Boğaz geçilemedi.'),
        array('🪖','Arıburnu (ANZAC Koyu)','25 Nisan 1915','ANZAC kuvvetlerinin çıkarma yaptığı ve Mustafa Kemal\'in 57. Alay\'a tarihi emrini verdiği nokta. Bugün ANZAC Günü olarak anılır.'),
        array('🔴','Seddülbahir Muharebeleri','Nisan–Haziran 1915','İngiliz kuvvetlerinin yarımadanın ucuna çıkarma yaptığı ve defalarca püskürtüldüğü kanlı cephe hattı.'),
        array('🏔️','Conk Bayırı','Ağustos 1915','Yarımadanın en kritik yükseltisi. Mustafa Kemal\'in bizzat yönettiği savunmayla İtilaf taarruzları geri püskürtüldü.'),
        array('🌊','Anafartalar','6-10 Ağustos 1915','İtilaf\'ın son büyük çıkarma girişimi. Mustafa Kemal, Anafartalar Grubu komutanı olarak tüm taarruzları kırdı.'),
        array('🕯️','57. Alay Şehitliği','1915','Mustafa Kemal\'in emriyle taarruz eden ve tamamı şehit olan 57. Alay. Türk ordusunda bu birim numarası bir daha hiç kullanılmadı.'),
      );
      foreach ($muh as $m): ?>
      <div class="card">
        <div style="font-size:2rem;margin-bottom:12px"><?php echo $m[0]; ?></div>
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--r);margin-bottom:6px"><?php echo esc_html($m[2]); ?></div>
        <h4 style="font-family:var(--fs);font-size:.95rem;font-weight:700;color:var(--t1);margin-bottom:10px"><?php echo esc_html($m[1]); ?></h4>
        <p style="font-size:12px;color:var(--t2);line-height:1.75"><?php echo esc_html($m[3]); ?></p>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<!-- KOMUTANLAR -->
<div class="sec dark">
  <div class="sec-w">
    <div class="badge w">Komutanlar</div>
    <h2 class="sec-title wh">Cephenin Önemli İsimleri</h2>
    <p class="sec-sub wh">Çanakkale Savaşları'nda tarihe geçen komutanlar.</p>
    <div class="commander-grid">
      <?php
      $komutanlar = array(
        array('🇹🇷','Mustafa Kemal','19. Tümen / Anafartalar Grup Komutanı','Arıburnu ve Anafartalar savunmalarının mimarı. Çanakkale\'de kazandığı ün, Millî Mücadele\'nin temelini attı.'),
        array('🇩🇪','Liman von Sanders','Osmanlı 5. Ordusu Komutanı','Alman general; Çanakkale savunmasını genel olarak yönetti. İtilaf\'ın hangi noktaya çıkacağını önceden tahmin etmekte gecikmesi eleştirildi.'),
        array('🇹🇷','Cevat Paşa','Çanakkale Boğazı Komutanı','18 Mart deniz taarruzunun püskürtülmesinde belirleyici rol oynayan topçu komutanı.'),
        array('🇬🇧','Sir Ian Hamilton','İtilaf Akdeniz Kuvvetleri Komutanı','Gelibolu çıkarmasını planlayan İngiliz general; başarısızlık üzerine görevden alındı.'),
        array('🇦🇺','William Birdwood','ANZAC Kolordusu Komutanı','Avustralya ve Yeni Zelanda birliklerini komuta etti. ANZAC ruhunun simgesi olarak tarihe geçti.'),
        array('🇫🇷','Henri Gouraud','Fransız Oryantel Kolordusu Komutanı','Seddülbahir\'deki Fransız kuvvetlerini komuta etti; yaralanmasının ardından cepheden ayrıldı.'),
      );
      foreach ($komutanlar as $k): ?>
      <div class="cmd-card">
        <div class="cmd-flag"><?php echo $k[0]; ?></div>
        <div class="cmd-name"><?php echo esc_html($k[1]); ?></div>
        <div class="cmd-title"><?php echo esc_html($k[2]); ?></div>
        <p class="cmd-desc"><?php echo esc_html($k[3]); ?></p>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<!-- ANMA GÜNLERİ -->
<div class="sec">
  <div class="sec-w">
    <div class="badge r">Anma Günleri</div>
    <h2 class="sec-title">Çanakkale'yi Anıyoruz</h2>
    <div class="g2">
      <div class="anma-card">
        <div class="anma-date"><div class="anma-day">18</div><div class="anma-month">Mart</div></div>
        <div class="anma-body">
          <h4>Çanakkale Deniz Zaferi &amp; Şehitler Günü</h4>
          <p>18 Mart 1915'te Türk topçusunun İtilaf filosunu bozguna uğrattığı günün yıldönümü. Tüm yurtta törenler, anma etkinlikleri ve resmi geçit yapılır. Şehitler için dualar edilir.</p>
        </div>
      </div>
      <div class="anma-card">
        <div class="anma-date"><div class="anma-day">25</div><div class="anma-month">Nisan</div></div>
        <div class="anma-body">
          <h4>Çanakkale Kara Muharebesi Anma Günü</h4>
          <p>ANZAC kuvvetlerinin Arıburnu'na çıkarma yaptığı gün. Türkiye'de ve ANZAC ülkelerinde (Avustralya, Yeni Zelanda) törenlerle anılır. Gelibolu'daki Şehitler Abidesi'nde devlet törenleri düzenlenir.</p>
        </div>
      </div>
      <div class="anma-card">
        <div class="anma-date" style="background:var(--dk2)"><div class="anma-day">6/9</div><div class="anma-month">Ağustos</div></div>
        <div class="anma-body">
          <h4>Anafartalar Muharebesi Anma Günü</h4>
          <p>6-10 Ağustos 1915 tarihlerinde gerçekleşen Anafartalar Muharebesi'nin yıldönümü. Mustafa Kemal'in Anafartalar Grubu komutanı olarak kazandığı zafer anılır.</p>
        </div>
      </div>
      <div class="anma-card">
        <div class="anma-date" style="background:#6b7280"><div class="anma-day">9</div><div class="anma-month">Ocak</div></div>
        <div class="anma-body">
          <h4>Tahliye ve Zafer'in Tescili</h4>
          <p>9 Ocak 1916'da son İtilaf kuvvetleri Gelibolu'yu terk etti. Bu tarih, sekiz aylık savunmanın resmen sona erdiği ve Türk zaferinin kesinleştiği gün olarak tarihe geçmiştir.</p>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- CTA -->
<div class="cta-band">
  <div class="cta-w">
    <div class="cta-text">
      <h3>Çanakkale Ruhunu Yaşatıyoruz</h3>
      <p>Şehitlerimizi saygıyla anıyor, bu toprakların bedelini asla unutmuyoruz.</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a href="<?php echo esc_url(home_url('/kurtulus-savasi')); ?>" class="btn-wh">⚔️ Kurtuluş Savaşı</a>
      <a href="<?php echo esc_url(home_url('/milli-gunler')); ?>" class="btn-ol">📅 Millî Günler</a>
    </div>
  </div>
</div>
</div>
<?php endif; get_footer(); ?>
