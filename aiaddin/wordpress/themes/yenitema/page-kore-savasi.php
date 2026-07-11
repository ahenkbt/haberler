<?php
/**
 * Template Name: Kore Savasi
 * Template Post Type: page
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();
if (have_posts()) { the_post(); }
$vkv_slug   = 'kore-savasi';
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
.ph{width:100%;background:linear-gradient(150deg,#020508 0%,#071020 45%,#0d1a10 100%);padding:80px 40px 64px;position:relative;overflow:hidden}
.ph::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 70% 40%,rgba(201,168,76,.1) 0%,transparent 55%)}
.ph-w{max-width:var(--w);margin:0 auto;display:grid;grid-template-columns:1.2fr 1fr;gap:60px;align-items:center;position:relative;z-index:1}
.ph-ew{display:inline-flex;align-items:center;gap:8px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:var(--g);font-size:9.5px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:18px}
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
.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.card{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:24px;transition:all .22s;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--r),var(--g))}
.card:hover{box-shadow:0 8px 28px rgba(0,0,0,.08);transform:translateY(-3px)}
.tl{display:flex;flex-direction:column;position:relative}.tl::before{content:'';position:absolute;left:28px;top:0;bottom:0;width:2px;background:var(--bd)}
.tl-item{display:flex;gap:22px;align-items:flex-start;padding-bottom:28px}
.tl-dot{width:56px;height:56px;border-radius:50%;background:var(--r);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;position:relative;z-index:1;box-shadow:0 0 0 4px var(--bd)}
.tl-body{padding:8px 0 0;flex:1}.tl-date{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--r);margin-bottom:4px}
.tl-title{font-family:var(--fs);font-size:1rem;font-weight:700;color:var(--t1);margin-bottom:6px}.tl-desc{font-size:12.5px;color:var(--t2);line-height:1.8}
.hero-card{background:linear-gradient(135deg,var(--dk),var(--dk2));border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:28px;position:relative;overflow:hidden}
.hero-card::before{content:'"';font-size:8rem;color:rgba(201,168,76,.08);position:absolute;top:-20px;left:10px;font-family:var(--fs);line-height:1}
.cta-band{background:linear-gradient(135deg,var(--r),var(--rd));padding:52px 40px;width:100%}
.cta-w{max-width:var(--w);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap}
.cta-text h3{font-family:var(--fs);font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:8px}
.cta-text p{font-size:13px;color:rgba(255,255,255,.65);line-height:1.6}
.btn-wh{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:#fff;color:var(--r);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
.btn-ol{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
@media(max-width:768px){.ph-w,.g3,.g2{grid-template-columns:1fr}.sec,.ph,.cta-band{padding:48px 24px}.g4{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="pw">
<div class="ph">
  <div class="ph-w">
    <div>
      <div class="ph-ew">🇰🇷 Savaşlar · Kore</div>
      <h1 class="ph-h1">Kore Savaşı<em>1950 – 1953</em></h1>
      <p class="ph-desc">Türk Silahlı Kuvvetleri, 1950-1953 yılları arasında BM çatısı altında Kore'de savaştı. Özellikle Kunuri ve Kumyangjang-ni muharebelerinde sergilenen olağanüstü kahramanlık, Türk askerini dünyaya bir kez daha tanıttı.</p>
      <p class="ph-desc" style="margin-top:8px">Kore Savaşı, Türkiye'nin NATO üyeliğini pekiştiren ve uluslararası alanda itibar kazandıran kritik bir turnusol taşı oldu.</p>
    </div>
    <div class="ph-stats">
      <div class="ph-stat"><div class="ph-stat-num">25 Haziran</div><div class="ph-stat-lbl">Savaşın Başlangıcı</div></div>
      <div class="ph-stat"><div class="ph-stat-num">25 Ocak</div><div class="ph-stat-lbl">Kumyangjang-ni Anma</div></div>
      <div class="ph-stat"><div class="ph-stat-num">741</div><div class="ph-stat-lbl">Türk Şehidi</div></div>
      <div class="ph-stat"><div class="ph-stat-num">5.455</div><div class="ph-stat-lbl">Türk Askeri Katıldı</div></div>
    </div>
  </div>
</div>
<!-- GENEL BAKIŞ -->
<div class="sec">
  <div class="sec-w">
    <div class="g2">
      <div>
        <div class="badge r">Türkiye ve Kore</div>
        <h2 class="sec-title">Kore'de Türk Askeri</h2>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9;margin-bottom:14px">25 Haziran 1950'de Kuzey Kore'nin 38. Paralel'i geçerek Güney Kore'ye saldırmasıyla başlayan Kore Savaşı, BM Güvenlik Konseyi kararıyla uluslararası bir boyut kazandı. Türkiye, bu çağrıya ilk olumlu yanıt veren ülkelerden biri oldu.</p>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9;margin-bottom:14px">Türk Tugayı, Tümgeneral Tahsin Yazıcı komutasında Ekim 1950'de Kore'ye ulaştı. 5.455 kişilik bu kuvvet, üç yıl boyunca BM kuvvetleri içinde görev yaptı.</p>
        <p style="font-size:13.5px;color:var(--t2);line-height:1.9">Özellikle Kasım 1950'deki <strong>Kunuri Muharebesi</strong> ve Ocak 1951'deki <strong>Kumyangjang-ni Muharebesi</strong>nde sergilenen kahramanlık, Türk askerini uluslararası kamuoyunda kalıcı bir saygınlık kazandırdı. BM komutanları Türk Tugayı'nın savaş gücünü övgüyle kayıt altına aldı.</p>
      </div>
      <div>
        <div class="badge g">Savaşın Künyesi</div>
        <h2 class="sec-title">Temel Bilgiler</h2>
        <?php
        $bilgiler = array(
          array('📅','Tarihler','25 Haziran 1950 – 27 Temmuz 1953'),
          array('📍','Yer','Kore Yarımadası'),
          array('🎖️','Türk Komutan','Tümgeneral Tahsin Yazıcı (ilk tugay)'),
          array('🇹🇷','Türk Katkısı','5.455 asker (Türk Tugayı — 25. ABD Tümenine bağlı)'),
          array('🕯️','Türk Kayıpları','741 şehit, 2.068 yaralı, 163 esir ve kayıp'),
          array('🏅','Önemli Muharebeler','Kunuri (Kasım 1950), Kumyangjang-ni (Ocak 1951)'),
          array('📊','Sonuç','Ateşkes — 38. Paralel mevcut sınır olarak kaldı'),
          array('🇰🇷','Anma','Her yıl 25 Ocak Kumyangjang-ni; 25 Haziran Kore Savaşı başlangıcı'),
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
    <h2 class="sec-title">Türk Tugayı'nın Kore Serüveni</h2>
    <div class="tl" style="max-width:800px">
      <?php
      $tl = array(
        array('25 Haziran 1950','🔴','Savaş Patlak Verdi','Kuzey Kore kuvvetleri 38. Paralel\'i geçerek Güney Kore\'yi istila etti. BM Güvenlik Konseyi uluslararası askeri yardım kararı aldı.'),
        array('25 Temmuz 1950','🇹🇷','Türkiye Katilim Karari','TBMM, 25 Temmuz 1950\'de Kore\'ye asker gönderilmesini oybirligiyle kabul etti. Türkiye, ilk katilan BM üyelerinden oldu.'),
        array('Ekim 1950','🚢','Türk Tugayı Kore\'de','Tümgeneral Tahsin Yazıcı komutasındaki 5.455 kişilik Türk Tugayı Kore\'ye ulaştı. 25. ABD Tümeni\'ne bağlandı.'),
        array('26-30 Kasım 1950','🔥','Kunuri Muharebesi','Çin kuvvetlerinin büyük taarruzunda Türk Tugayı, ABD ve BM kuvvetlerinin çekilmesini sağlamak için ağır biçimde savaştı. Olağanüstü kahramanlık gösterildi.'),
        array('25 Ocak 1951','🏆','Kumyangjang-ni Muharebesi','Türk Tugayı\'nın en büyük muharebe zaferlerinden biri. Çin kuvvetlerine karşı verilen bu savaş, Türk askerinin kahramanlığının simgesi oldu.'),
        array('27 Temmuz 1953','📜','Ateşkes Antlaşması','Panmunjom\'da ateşkes imzalandı. Kore Yarımadası, 38. Paralelde fiilen ikiye bölünmüş kaldı. Türk birlikleri görevi tamamladı.'),
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
<!-- KAHRAMANLIK -->
<div class="sec dark">
  <div class="sec-w">
    <div class="badge w">Kahramanlık</div>
    <h2 class="sec-title wh">Öne Çıkan Muharebeler</h2>
    <div class="g3">
      <?php
      $muh = array(
        array('🔥','Kunuri Muharebesi','26-30 Kasım 1950','Çin\'in Kore\'ye girmesinin ardından büyük taarruzunu püskürtmek için Türk Tugayı ağır muharebe etti. Çok üstün Çin kuvvetlerine karşı BM hatlarının çökmesini büyük ölçüde engelledi.'),
        array('🏆','Kumyangjang-ni Muharebesi','25 Ocak 1951','Türk Tugayı\'nın en büyük zaferi. Çin birliklerini geri püskürterek stratejik bir tepe tutuldu. BM komutanlığı Türklerin savaş gücünü resmen tescilledi. Her yıl 25 Ocak\'ta anılır.'),
        array('🛡️','Nevada Tepeleri Muharebesi','Mayıs 1953','Ateşkesten kısa süre önce gerçekleşen ve Türk birliklerinin BM kuvvetleriyle omuz omuza savaştığı son büyük taarruzlardan biri.'),
      );
      foreach ($muh as $m): ?>
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:26px">
        <div style="font-size:2rem;margin-bottom:12px"><?php echo $m[0]; ?></div>
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--g);margin-bottom:6px"><?php echo esc_html($m[2]); ?></div>
        <h4 style="font-family:var(--fs);font-size:1rem;font-weight:700;color:#fff;margin-bottom:10px"><?php echo esc_html($m[1]); ?></h4>
        <p style="font-size:12px;color:rgba(255,255,255,.5);line-height:1.75"><?php echo esc_html($m[3]); ?></p>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<!-- ANMA GÜNLERİ -->
<div class="sec">
  <div class="sec-w">
    <div class="badge r">Anma Günleri</div>
    <h2 class="sec-title">Kore Gazilerini Anıyoruz</h2>
    <div class="g2">
      <div style="background:#fff;border:1px solid var(--bd);border-radius:10px;padding:24px;display:flex;gap:20px;align-items:flex-start">
        <div style="background:var(--r);color:#fff;border-radius:6px;padding:12px 16px;text-align:center;flex-shrink:0;min-width:72px">
          <div style="font-size:1.6rem;font-weight:800;line-height:1">25</div>
          <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-top:2px">Ocak</div>
        </div>
        <div>
          <h4 style="font-family:var(--fs);font-size:1rem;font-weight:700;color:var(--t1);margin-bottom:6px">Kumyangjang-ni Muharebesi Anma Günü</h4>
          <p style="font-size:12.5px;color:var(--t2);line-height:1.75">25 Ocak 1951'de Türk Tugayı'nın kazandığı tarihi zafer her yıl törenlerle anılmaktadır. Kore gazilerimiz ve şehitlerimiz saygıyla hatırlanır.</p>
        </div>
      </div>
      <div style="background:#fff;border:1px solid var(--bd);border-radius:10px;padding:24px;display:flex;gap:20px;align-items:flex-start">
        <div style="background:var(--dk2);color:#fff;border-radius:6px;padding:12px 16px;text-align:center;flex-shrink:0;min-width:72px">
          <div style="font-size:1.6rem;font-weight:800;line-height:1">25</div>
          <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-top:2px">Haziran</div>
        </div>
        <div>
          <h4 style="font-family:var(--fs);font-size:1rem;font-weight:700;color:var(--t1);margin-bottom:6px">Kore Savaşı'nın Başlama Yıldönümü</h4>
          <p style="font-size:12.5px;color:var(--t2);line-height:1.75">25 Haziran 1950'de başlayan Kore Savaşı'nın yıldönümünde Türk gazileri ve şehitleri anılır. Kore ile Türkiye arasındaki derin kardeşlik bağı vurgulanır.</p>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- CTA -->
<div class="cta-band">
  <div class="cta-w">
    <div class="cta-text">
      <h3>Kore Şehitlerimizi Minnetle Anıyoruz</h3>
      <p>741 kahraman şehidimiz ve tüm Kore gazilerimiz ebediyetle yaşamaktadır.</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a href="<?php echo esc_url(home_url('/kibris-baris-harekati')); ?>" class="btn-wh">🕊️ Kıbrıs Harekâtı</a>
      <a href="<?php echo esc_url(home_url('/milli-gunler')); ?>" class="btn-ol">📅 Millî Günler</a>
    </div>
  </div>
</div>
</div>
<?php endif; get_footer(); ?>
