<?php
/**
 * Template Name: Atatürk Kronolojisi
 * Template Post Type: page
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();
if (have_posts()) { the_post(); }
$vkv_slug   = 'ataturk-kronoloji';
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
.ph{width:100%;background:linear-gradient(150deg,var(--dk) 0%,var(--dk2) 60%,#0a0c0e 100%);padding:64px 40px 48px;text-align:center}
.ph-ew{display:inline-flex;align-items:center;gap:7px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:var(--g);font-size:9.5px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:18px}
.ph-h1{font-family:var(--fs);font-size:clamp(2rem,3.5vw,2.8rem);font-weight:700;color:#fff;line-height:1.15;margin-bottom:12px}
.ph-desc{font-size:13.5px;color:rgba(255,255,255,.5);line-height:1.85;max-width:620px;margin:0 auto 28px}
.ph-stats{display:flex;justify-content:center;gap:24px;flex-wrap:wrap}
.ph-stat{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:14px 24px;text-align:center}
.ph-stat-num{font-size:1.6rem;font-weight:800;color:var(--g);line-height:1}
.ph-stat-lbl{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.35);margin-top:3px}
.sec{width:100%;padding:64px 40px}
.sec-w{max-width:var(--w);margin:0 auto}
.filter-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:36px;justify-content:center}
.fbtn{padding:8px 20px;border:1.5px solid var(--bd);border-radius:20px;font-size:11.5px;font-weight:700;color:var(--t2);background:#fff;cursor:pointer;transition:all .2s;font-family:var(--fn)}
.fbtn.on,.fbtn:hover{background:var(--r);border-color:var(--r);color:#fff}
.tl{position:relative;max-width:900px;margin:0 auto}
.tl::before{content:'';position:absolute;left:50%;top:0;bottom:0;width:2px;background:var(--bd);transform:translateX(-50%)}
.tl-item{display:flex;justify-content:flex-end;padding-right:calc(50% + 32px);margin-bottom:32px;position:relative}
.tl-item:nth-child(even){justify-content:flex-start;padding-right:0;padding-left:calc(50% + 32px)}
.tl-dot{position:absolute;left:50%;top:16px;transform:translateX(-50%);width:52px;height:52px;border-radius:50%;background:var(--r);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:1.1rem;z-index:1;box-shadow:0 0 0 4px var(--bd)}
.tl-card{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:20px 22px;max-width:380px;transition:all .2s;position:relative}
.tl-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--r),var(--g));border-radius:10px 10px 0 0}
.tl-card:hover{box-shadow:0 6px 20px rgba(0,0,0,.08)}
.tl-year{font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--r);margin-bottom:5px}
.tl-title{font-family:var(--fs);font-size:.95rem;font-weight:700;color:var(--t1);margin-bottom:8px;line-height:1.4}
.tl-desc{font-size:12px;color:var(--t2);line-height:1.75}
.tl-tag{display:inline-block;margin-top:10px;padding:3px 10px;background:var(--gr);border:1px solid var(--bd);border-radius:20px;font-size:10px;font-weight:700;color:var(--t3)}
.cta-band{background:linear-gradient(135deg,var(--r),var(--rd));padding:52px 40px;width:100%}
.cta-w{max-width:var(--w);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap}
.cta-text h3{font-family:var(--fs);font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:8px}
.cta-text p{font-size:13px;color:rgba(255,255,255,.65);line-height:1.6}
.btn-wh{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:#fff;color:var(--r);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
.btn-ol{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
@media(max-width:768px){.tl::before{left:28px;transform:none}.tl-item,.tl-item:nth-child(even){justify-content:flex-start;padding-left:70px;padding-right:0}.tl-dot{left:28px;transform:none}.tl-card{max-width:100%}.sec,.ph,.cta-band{padding:48px 24px}}
</style>
<?php
$olaylar = array(
  array('yil'=>'1881','donem'=>'erken','ikon'=>'🌟','baslik'=>'Selanik\'te Doğdu','aciklama'=>'Mustafa, Osmanlı İmparatorluğu\'nun önemli bir liman kenti olan Selanik\'te (bugünkü Yunanistan) Ali Rıza Efendi ve Zübeyde Hanım\'ın oğlu olarak dünyaya geldi. Babası erken hayatını kaybetti; onu güçlü annesi büyüttü.','etiket'=>'Erken Yaşam'),
  array('yil'=>'1893','donem'=>'erken','ikon'=>'📚','baslik'=>'Selanik Askeri Rüştiyesi','aciklama'=>'Selanik Askeri Rüştiyesi\'ne kaydoldu. Matematik öğretmeni, üstün zekâsından etkilenerek ona "Kemal" adını verdi — olgunluk ve mükemmellik anlamına geliyordu.','etiket'=>'Eğitim'),
  array('yil'=>'1896','donem'=>'erken','ikon'=>'🏫','baslik'=>'Manastır Askeri İdadisi','aciklama'=>'Bugünkü Kuzey Makedonya\'da bulunan Manastır Askeri İdadisi\'ne nakledildi. 1899\'da İstanbul\'a hareket etti.','etiket'=>'Eğitim'),
  array('yil'=>'1905','donem'=>'asker','ikon'=>'🎖️','baslik'=>'Kurmay Yüzbaşı Oldu','aciklama'=>'Harp Akademisi\'nden Kurmay Yüzbaşı olarak mezun oldu. 5. Ordu\'nun bir parçası olarak Şam\'a tayin edildi; orada reform yanlısı subaylarla ilişki kurdu.','etiket'=>'Askeri Kariyer'),
  array('yil'=>'1911','donem'=>'asker','ikon'=>'⚔️','baslik'=>'Trablusgarp Savaşı — Libya','aciklama'=>'Osmanlı Libyası\'nın İtalyan işgaline karşı gönüllü olarak savaştı. Trablusgarp ve Derne\'de savunma harekâtlarını yönetti.','etiket'=>'Askeri Kariyer'),
  array('yil'=>'1912','donem'=>'asker','ikon'=>'🗡️','baslik'=>'Balkan Savaşları','aciklama'=>'Birinci ve İkinci Balkan Savaşları\'nda görev yaptı. Osmanlı İmparatorluğu, Selanik dahil Avrupa topraklarının büyük bölümünü yitirdi.','etiket'=>'Askeri Kariyer'),
  array('yil'=>'1915','donem'=>'asker','ikon'=>'🔴','baslik'=>'Çanakkale Muharebeleri','aciklama'=>'19. Tümen komutanı olarak Conk Bayırı ve Arıburnu\'nu savundu. "Size taaruzu değil, ölmeyi emrediyorum" emriyle tarihe geçti. İtilaf kuvvetlerini durduran bu savunma onu ulusal kahraman yaptı.','etiket'=>'I. Dünya Savaşı'),
  array('yil'=>'1916','donem'=>'asker','ikon'=>'🏅','baslik'=>'Generalliğe Terfi (Paşalık)','aciklama'=>'Çanakkale\'deki başarılı savunmasının ardından Generalliğe terfi etti. Doğu Cephesi\'nde Ruslara ve ardından Suriye ve Mezopotamya\'da İngilizlere karşı savaştı.','etiket'=>'I. Dünya Savaşı'),
  array('yil'=>'1918','donem'=>'asker','ikon'=>'🕊️','baslik'=>'I. Dünya Savaşı Sona Erdi — Osmanlı Yenilgisi','aciklama'=>'Osmanlı İmparatorluğu, 30 Ekim 1918\'de Mondros Mütarekesi\'ni imzaladı. İtilaf kuvvetleri İstanbul\'u işgal etti; Sevr Antlaşması ile Anadolu paylaşıma açıldı. Atatürk bu koşulları reddetti.','etiket'=>'Savaşın Sonu'),
  array('yil'=>'1919','donem'=>'kurtulus','ikon'=>'🦅','baslik'=>'Samsun\'a Çıkış — 19 Mayıs','aciklama'=>'19 Mayıs 1919\'da Samsun\'a ayak basarak Millî Mücadele\'yi resmen başlattı. Erzurum ve Sivas Kongrelerini toplayarak ulusal direniş örgütledi.','etiket'=>'Millî Mücadele'),
  array('yil'=>'1920','donem'=>'kurtulus','ikon'=>'🏛️','baslik'=>'Türkiye Büyük Millet Meclisi Açıldı','aciklama'=>'23 Nisan 1920\'de Ankara\'da TBMM açıldı. Mustafa Kemal, Meclis Başkanı seçildi. Meclis, İstanbul\'daki padişah hükümetinin tutumunu reddederek meşru hükümet sıfatını üstlendi.','etiket'=>'Millî Mücadele'),
  array('yil'=>'1921','donem'=>'kurtulus','ikon'=>'🛡️','baslik'=>'Sakarya Meydan Muharebesi — Dönüm Noktası','aciklama'=>'Başkomutan sıfatıyla bizzat yönettiği Sakarya Meydan Muharebesi (Ağustos–Eylül 1921), 22 günlük kıyasıya bir çarpışmanın ardından Yunan kuvvetlerini püskürterek savaşın kaderini değiştirdi.','etiket'=>'Millî Mücadele'),
  array('yil'=>'1922','donem'=>'kurtulus','ikon'=>'🎯','baslik'=>'Büyük Taarruz — İzmir\'in Kurtuluşu','aciklama'=>'Büyük Taarruz (26 Ağustos – 9 Eylül 1922), Yunan ordusunu Anadolu\'da imha etti. İzmir 9 Eylül\'de kurtarıldı. Mudanya Mütarekesi (11 Ekim) ateşkesi sağladı; Millî Mücadele fiilen sona erdi.','etiket'=>'Millî Mücadele'),
  array('yil'=>'1923','donem'=>'cumhuriyet','ikon'=>'📜','baslik'=>'Lozan Antlaşması','aciklama'=>'24 Temmuz 1923\'te imzalanan antlaşmayla modern Türkiye\'nin sınırları uluslararası alanda tanındı. Sevr\'in ağır hükümleri tarihe gömüldü; kapitülasyonlar kaldırıldı.','etiket'=>'Cumhuriyet'),
  array('yil'=>'1923','donem'=>'cumhuriyet','ikon'=>'🇹🇷','baslik'=>'Türkiye Cumhuriyeti\'nin İlanı','aciklama'=>'29 Ekim 1923\'te TBMM, Türkiye Cumhuriyeti\'ni ilan etti. Mustafa Kemal, oybirliğiyle ilk Cumhurbaşkanı seçildi. Ankara başkent oldu; yeni bir çağ başladı.','etiket'=>'Cumhuriyet'),
  array('yil'=>'1924','donem'=>'cumhuriyet','ikon'=>'⛪','baslik'=>'Halifeliğin Kaldırılması','aciklama'=>'3 Mart 1924\'te Halifelik kaldırıldı. Osmanlı padişahının elinde tuttuğu bu sembolik dini liderlik makamının ortadan kalkması, laikleşmenin en çarpıcı adımlarından birini oluşturdu.','etiket'=>'Reform'),
  array('yil'=>'1926','donem'=>'cumhuriyet','ikon'=>'⚖️','baslik'=>'Medeni Kanun','aciklama'=>'İsviçre Medeni Kanunu\'ndan uyarlanan yeni Medeni Kanun kabul edildi. Kadınlara evlilik, boşanma ve miras konusunda eşit haklar tanındı; dini mahkemeler kaldırıldı.','etiket'=>'Reform'),
  array('yil'=>'1928','donem'=>'cumhuriyet','ikon'=>'🔤','baslik'=>'Latin Alfabesine Geçiş','aciklama'=>'1 Kasım 1928\'de Arap harflerinin yerini Latin alfabesi aldı. Atatürk bizzat vatandaşlara yeni harfleri öğretti. Başlatılan okuma-yazma seferberliğiyle okuryazarlık oranı bir nesil içinde %10\'dan %90\'ın üzerine fırladı.','etiket'=>'Reform'),
  array('yil'=>'1930','donem'=>'cumhuriyet','ikon'=>'🗳️','baslik'=>'Kadınlara Belediye Oy Hakkı','aciklama'=>'Türk kadınları 1930\'da belediye seçimlerine katılma ve aday olma hakkını kazandı; bu, pek çok Avrupa ülkesinin önündeydi.','etiket'=>'Reform'),
  array('yil'=>'1931','donem'=>'cumhuriyet','ikon'=>'📐','baslik'=>'Metrik Sistem ve Uluslararası Takvim','aciklama'=>'Türkiye, Osmanlı\'nın ağırlık ve uzunluk sistemlerini uluslararası metrik sistemle değiştirdi; Hicri takvimin yerini Gregoryen takvim aldı.','etiket'=>'Reform'),
  array('yil'=>'1932','donem'=>'cumhuriyet','ikon'=>'📡','baslik'=>'Dil Reformu — Türk Dil Kurumu','aciklama'=>'Türk Dil Kurumu (TDK) kuruldu. Türkçedeki Arapça ve Farsça sözcüklerin yerine Türkçe karşılıklar türetilmesini amaçlayan büyük bir ulusal dil projesi başlatıldı.','etiket'=>'Reform'),
  array('yil'=>'1934','donem'=>'cumhuriyet','ikon'=>'🗳️','baslik'=>'Kadınlara Milletvekilliği Seçme-Seçilme Hakkı','aciklama'=>'Türk kadınları 1934\'te TBMM\'ye oy verme ve milletvekili olma hakkını kazandı. Fransa\'dan (1944), İtalya\'dan (1945) ve pek çok Avrupa ülkesinden önce.','etiket'=>'Reform'),
  array('yil'=>'1934','donem'=>'cumhuriyet','ikon'=>'🪪','baslik'=>'Soyadı Kanunu — "Atatürk"','aciklama'=>'Soyadı Kanunu ile tüm Türk vatandaşları soyadı almakla yükümlü kılındı. TBMM, özel bir kanunla Mustafa Kemal\'e "Atatürk" — Türklerin Babası — soyadını takdim etti. Bu isim yalnızca ona aittir.','etiket'=>'Reform'),
  array('yil'=>'1937','donem'=>'cumhuriyet','ikon'=>'📋','baslik'=>'Altı Ok Anayasa\'ya Girdi','aciklama'=>'Kemalizm\'in altı temel ilkesi — Cumhuriyetçilik, Milliyetçilik, Halkçılık, Devletçilik, Laiklik ve Devrimcilik — Türkiye Cumhuriyeti Anayasası\'na resmen eklendi.','etiket'=>'Miras'),
  array('yil'=>'1938','donem'=>'miras','ikon'=>'🕯️','baslik'=>'Vefatı — 10 Kasım 1938','aciklama'=>'Mustafa Kemal Atatürk, 10 Kasım 1938 sabahı saat 09:05\'te İstanbul Dolmabahçe Sarayı\'nda siroz hastalığından hayata gözlerini yumdu. 57 yaşındaydı. Türk milleti ve dünya derin bir yasın içine büründü. Her 10 Kasım\'da pek çok yerde saatler 09:05\'te durdurulur.','etiket'=>'Miras'),
  array('yil'=>'1953','donem'=>'miras','ikon'=>'🏛️','baslik'=>'Anıtkabir — Ankara','aciklama'=>'Atatürk\'ün naaşı 1953\'te Anıtkabir\'e (Büyük Mezar) nakledildi. Ankara\'da inşa edilen bu anıtsal türbe, her yıl milyonlarca ziyaretçiyi ağırlamaktadır.','etiket'=>'Miras'),
);
?>
<div class="pw">
<div class="ph">
  <div style="max-width:var(--w);margin:0 auto;position:relative;z-index:1">
    <div class="ph-ew">📅 Atatürk Köşesi</div>
    <h1 class="ph-h1">Atatürk Kronolojisi</h1>
    <p class="ph-desc">Selanik'teki doğumundan Cumhuriyet'in ilanına, köklü reformlardan ebediyete yolculuğuna — Mustafa Kemal Atatürk'ün hayatındaki önemli tarih ve olaylar.</p>
    <div class="ph-stats">
      <div class="ph-stat"><div class="ph-stat-num">1881</div><div class="ph-stat-lbl">Doğum Yılı</div></div>
      <div class="ph-stat"><div class="ph-stat-num">1923</div><div class="ph-stat-lbl">Cumhuriyetin İlanı</div></div>
      <div class="ph-stat"><div class="ph-stat-num">40+</div><div class="ph-stat-lbl">Büyük Reform</div></div>
      <div class="ph-stat"><div class="ph-stat-num">1938</div><div class="ph-stat-lbl">Vefat Yılı</div></div>
    </div>
  </div>
</div>
<div class="sec">
  <div class="sec-w">
    <div class="filter-bar">
      <button class="fbtn on" onclick="filterDonem('hepsi',this)">📋 Tüm Olaylar</button>
      <button class="fbtn" onclick="filterDonem('erken',this)">🌱 Erken Yaşam</button>
      <button class="fbtn" onclick="filterDonem('asker',this)">⚔️ Askeri Kariyer</button>
      <button class="fbtn" onclick="filterDonem('kurtulus',this)">🦅 Millî Mücadele</button>
      <button class="fbtn" onclick="filterDonem('cumhuriyet',this)">🏛️ Cumhuriyet &amp; Reformlar</button>
      <button class="fbtn" onclick="filterDonem('miras',this)">⭐ Miras</button>
    </div>
    <div class="tl" id="kronoloji">
      <?php foreach ($olaylar as $o): ?>
      <div class="tl-item" data-donem="<?php echo esc_attr($o['donem']); ?>">
        <div class="tl-dot"><?php echo $o['ikon']; ?></div>
        <div class="tl-card">
          <div class="tl-year"><?php echo esc_html($o['yil']); ?></div>
          <div class="tl-title"><?php echo esc_html($o['baslik']); ?></div>
          <p class="tl-desc"><?php echo esc_html($o['aciklama']); ?></p>
          <span class="tl-tag"><?php echo esc_html($o['etiket']); ?></span>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<div class="cta-band">
  <div class="cta-w">
    <div class="cta-text">
      <h3>Atatürk'ü Daha Yakından Tanıyın</h3>
      <p>Hayatı, ilkeleri ve sözleriyle büyük önderin mirasını keşfedin.</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a href="<?php echo esc_url(home_url('/ataturk-hayati')); ?>" class="btn-wh">📖 Hayatı</a>
      <a href="<?php echo esc_url(home_url('/ataturk-ilkeler')); ?>" class="btn-ol">⚖️ İlkeleri</a>
    </div>
  </div>
</div>
</div>
<script>
var aktifDonem = 'hepsi';
function filterDonem(donem, btn) {
  aktifDonem = donem;
  document.querySelectorAll('.filter-bar .fbtn').forEach(function(b){ b.classList.remove('on'); });
  btn.classList.add('on');
  document.querySelectorAll('.tl-item').forEach(function(item) {
    item.style.display = (donem === 'hepsi' || item.dataset.donem === donem) ? '' : 'none';
  });
}
</script>
<?php endif; get_footer(); ?>
