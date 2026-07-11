<?php
/**
 * Template Name: Atatürk Sözleri
 * Template Post Type: page
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();
if (have_posts()) { the_post(); }
$vkv_slug   = 'ataturk-sozleri';
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
.ph{width:100%;background:linear-gradient(150deg,var(--dk) 0%,var(--dk2) 60%,#0a0c0e 100%);padding:80px 40px 64px;text-align:center;position:relative;overflow:hidden}
.ph::before{content:'"';position:absolute;font-size:30rem;font-family:var(--fs);color:rgba(201,168,76,.05);top:-80px;left:-60px;line-height:1;pointer-events:none}
.ph-ew{display:inline-flex;align-items:center;gap:7px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:var(--g);font-size:9.5px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:18px}
.ph-h1{font-family:var(--fs);font-size:clamp(2rem,3.5vw,2.8rem);font-weight:700;color:#fff;line-height:1.15;margin-bottom:12px}
.ph-h1 em{color:var(--g);font-style:italic}
.ph-desc{font-size:13.5px;color:rgba(255,255,255,.5);line-height:1.85;max-width:620px;margin:0 auto}
.sec{width:100%;padding:64px 40px}
.sec.alt{background:var(--gr)}
.sec-w{max-width:var(--w);margin:0 auto}
.badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px}
.badge.g{background:rgba(201,168,76,.1);color:#7a5a00;border:1px solid rgba(201,168,76,.3)}
.badge.r{background:rgba(140,26,46,.08);color:var(--r);border:1px solid rgba(140,26,46,.15)}
.sec-title{font-family:var(--fs);font-size:1.9rem;font-weight:700;color:var(--t1);margin-bottom:10px}
.sec-sub{font-size:14px;color:var(--t3);line-height:1.75;max-width:760px;margin-bottom:28px}
.filter-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:32px}
.fbtn{padding:7px 16px;border:1.5px solid var(--bd);border-radius:20px;font-size:11.5px;font-weight:700;color:var(--t2);background:#fff;cursor:pointer;transition:all .2s;font-family:var(--fn)}
.fbtn.on,.fbtn:hover{background:var(--r);border-color:var(--r);color:#fff}
.search-row{display:flex;gap:12px;margin-bottom:28px;align-items:center}
.search-inp{flex:1;border:1.5px solid var(--bd);border-radius:6px;padding:11px 16px;font-family:var(--fn);font-size:13px;color:var(--t1);outline:none}
.search-inp:focus{border-color:var(--r)}
.result-count{font-size:12px;color:var(--t3);white-space:nowrap}
.quotes-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.q-card{background:#fff;border:1px solid var(--bd);border-radius:12px;padding:28px;transition:all .25s;position:relative;overflow:hidden}
.q-card::before{content:'"';font-size:5rem;color:rgba(140,26,46,.06);position:absolute;top:-10px;left:14px;font-family:var(--fs);line-height:1;pointer-events:none}
.q-card:hover{box-shadow:0 8px 28px rgba(0,0,0,.08);transform:translateY(-3px);border-color:var(--r)}
.q-cat{display:inline-block;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:3px 10px;border-radius:20px;background:rgba(140,26,46,.08);color:var(--r);border:1px solid rgba(140,26,46,.12);margin-bottom:14px}
.q-text{font-family:var(--fs);font-size:1.05rem;font-style:italic;color:var(--t1);line-height:1.7;margin-bottom:14px;position:relative;z-index:1}
.q-meta{display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:var(--t3);border-top:1px solid var(--bd);padding-top:12px;margin-top:12px}
.q-src{font-weight:700;color:var(--t2)}
.q-year{color:var(--r);font-weight:700}
.featured-q{background:var(--dk);border-radius:14px;padding:48px;margin-bottom:40px;position:relative;overflow:hidden;text-align:center}
.featured-q::before{content:'"';font-size:20rem;color:rgba(201,168,76,.06);position:absolute;top:-60px;left:-40px;font-family:var(--fs);line-height:1;pointer-events:none}
.fq-text{font-family:var(--fs);font-size:clamp(1.1rem,2vw,1.6rem);font-style:italic;color:#fff;line-height:1.6;max-width:800px;margin:0 auto 20px;position:relative;z-index:1}
.fq-src{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.3)}
#sonuc-yok{display:none;text-align:center;padding:60px 20px}
.cta-band{background:linear-gradient(135deg,var(--r),var(--rd));padding:52px 40px;width:100%}
.cta-w{max-width:var(--w);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap}
.cta-text h3{font-family:var(--fs);font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:8px}
.cta-text p{font-size:13px;color:rgba(255,255,255,.65);line-height:1.6}
.btn-wh{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:#fff;color:var(--r);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
.btn-ol{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:4px;font-size:12px;font-weight:700;text-decoration:none}
@media(max-width:768px){.quotes-grid{grid-template-columns:1fr}.sec,.ph,.cta-band,.featured-q{padding:48px 24px}}
</style>
<?php
$sozler = array(
  array(
    'metin'    => '"Yurtta sulh, cihanda sulh."',
    'kategori' => 'Barış',
    'kaynak'   => 'Dış Politika İlkesi',
    'yil'      => '1931',
  ),
  array(
    'metin'    => '"Hayatta en hakiki mürşit ilimdir."',
    'kategori' => 'Eğitim',
    'kaynak'   => 'Sivas Kongresi Açılışı',
    'yil'      => '1919',
  ),
  array(
    'metin'    => '"Egemenlik kayıtsız şartsız milletindir."',
    'kategori' => 'Demokrasi',
    'kaynak'   => 'TBMM',
    'yil'      => '1920',
  ),
  array(
    'metin'    => '"Ne mutlu Türküm diyene!"',
    'kategori' => 'Millî Gurur',
    'kaynak'   => 'Cumhuriyetin 10. Yıl Nutku',
    'yil'      => '1933',
  ),
  array(
    'metin'    => '"Muhtaç olduğun kudret damarlarındaki asil kanda mevcuttur."',
    'kategori' => 'Gençlik',
    'kaynak'   => 'Gençliğe Hitabe, Nutuk',
    'yil'      => '1927',
  ),
  array(
    'metin'    => '"Ey Türk gençliği! Birinci vazifen, Türk istiklalini, Türk Cumhuriyetini ilelebet muhafaza ve müdafaa etmektir."',
    'kategori' => 'Gençlik',
    'kaynak'   => 'Gençliğe Hitabe, Nutuk',
    'yil'      => '1927',
  ),
  array(
    'metin'    => '"Harp, zaruri ve hayati olduğu ispat edilmedikçe, bir cinayettir."',
    'kategori' => 'Barış',
    'kaynak'   => 'Konuşma',
    'yil'      => '1921',
  ),
  array(
    'metin'    => '"Bir millet ki resim yapmaz, bir millet ki heykel yapmaz, bir millet ki fennin gerektirdiği şeyleri yapmaz; itiraf etmeli ki o milletin ilerleme yolunda yeri yoktur."',
    'kategori' => 'Kültür',
    'kaynak'   => 'Kültür Üzerine Konuşma',
    'yil'      => '1925',
  ),
  array(
    'metin'    => '"En hakiki mürşit ilimdir, fendir; ilim ve fennin haricinde mürşit aramak gaflettir, cehalettir, doğru yoldan sapmaktır."',
    'kategori' => 'Eğitim',
    'kaynak'   => 'Konuşma',
    'yil'      => '1924',
  ),
  array(
    'metin'    => '"Milletin büyük adamlar yetiştirmesi yetmez, yetiştirilen büyük adamları tanıyabilmek de lazımdır."',
    'kategori' => 'Millî Hayat',
    'kaynak'   => 'Konuşma',
    'yil'      => '1925',
  ),
  array(
    'metin'    => '"Size taarruzu değil, ölmeyi emrediyorum! Bize taarruz edecek olan düşmana karşı geçecek zaman zarfında, başka kuvvetler ve kumandanlar mevziimize gelebilir."',
    'kategori' => 'Askerlik',
    'kaynak'   => 'Çanakkale, 57. Alay\'a Emir',
    'yil'      => '1915',
  ),
  array(
    'metin'    => '"İki Mustafa Kemal vardır: biri ben, şu et ve kemikten ibaret, fani olan Mustafa Kemal; diğeri, onu temsil eden ve o ise sizsiniz, sizler ki ebediyen yaşayacaksınız."',
    'kategori' => 'Miras',
    'kaynak'   => 'Subaylara Konuşma',
    'yil'      => '1937',
  ),
  array(
    'metin'    => '"Biz galip geleceğiz. Ama yalnızca savaş meydanında değil; içimizdeki cehalete de galip gelmek zorundayız."',
    'kategori' => 'Eğitim',
    'kaynak'   => 'Konuşma',
    'yil'      => '1921',
  ),
  array(
    'metin'    => '"Kadınlarımız çok ağır şartlar altında çalışarak milletin yaşamasına büyük hizmette bulunmuşlardır."',
    'kategori' => 'Kadın Hakları',
    'kaynak'   => 'Kadın Hakları Konuşması',
    'yil'      => '1923',
  ),
  array(
    'metin'    => '"Dünyada her şey için, maddiyat için, maneviyat için, başarı için, en hakiki yol gösterici ilimdir, fendir."',
    'kategori' => 'Eğitim',
    'kaynak'   => 'Okuma-Yazma Seferberliği Konuşması',
    'yil'      => '1928',
  ),
  array(
    'metin'    => '"Türk Cumhuriyeti ilelebet payidar kalacaktır."',
    'kategori' => 'Cumhuriyet',
    'kaynak'   => 'Cumhuriyet Bayramı Konuşması',
    'yil'      => '1933',
  ),
  array(
    'metin'    => '"Ben Türk gençliğine inanıyorum. Türk gençliği, memleketin geleceği hakkındaki yüksek özlemimi gerçekleştirecektir."',
    'kategori' => 'Gençlik',
    'kaynak'   => 'Konuşma',
    'yil'      => '1937',
  ),
  array(
    'metin'    => '"Erkek ve kadın birbirinin lazım ve mütemmimi olmak itibariyle bir bütündür. Bir toplumun bir uzvunu geliştirirken ötekini ihmal etmek, o toplumu felç etmektir."',
    'kategori' => 'Kadın Hakları',
    'kaynak'   => 'Kadın Hakları Konuşması',
    'yil'      => '1923',
  ),
  array(
    'metin'    => '"Büyük devlet olmak isteyen küçük devlet; büyük güç olmak iddiasındaki küçük güç, tarih boyunca ezilmiştir."',
    'kategori' => 'Dış Politika',
    'kaynak'   => 'Konuşma',
    'yil'      => '1930',
  ),
  array(
    'metin'    => '"Türkiye Cumhuriyeti\'nin ebediyen yaşayacağına eminim."',
    'kategori' => 'Cumhuriyet',
    'kaynak'   => 'Cumhuriyet Bayramı Konuşması',
    'yil'      => '1933',
  ),
  array(
    'metin'    => '"En büyük savaş, kendi nefsiyle savaşandır."',
    'kategori' => 'Felsefe',
    'kaynak'   => 'Atfedilen',
    'yil'      => '',
  ),
  array(
    'metin'    => '"Beni görmek demek, mutlaka yüzümü görmek değildir. Benim fikirlerimi, benim duygularımı anlıyorsanız bu yeterlidir."',
    'kategori' => 'Miras',
    'kaynak'   => 'Atfedilen',
    'yil'      => '',
  ),
  array(
    'metin'    => '"Vatanseverlik duygusunu besleyecek şey, milletin tarihini bilmektir."',
    'kategori' => 'Tarih',
    'kaynak'   => 'Konuşma',
    'yil'      => '1931',
  ),
  array(
    'metin'    => '"Tarih yazmak, tarih yapmak kadar mühimdir. Yazan yapana sadık kalmazsa değişmeyen hakikat insanlığı şaşırtacak bir hal alır."',
    'kategori' => 'Tarih',
    'kaynak'   => 'Konuşma',
    'yil'      => '1931',
  ),
);
$kategoriler = array('Tümü', 'Barış', 'Eğitim', 'Demokrasi', 'Gençlik', 'Kadın Hakları', 'Millî Gurur', 'Askerlik', 'Cumhuriyet', 'Miras', 'Kültür', 'Felsefe', 'Dış Politika', 'Tarih');
?>
<div class="pw">
<div class="ph">
  <div style="max-width:var(--w);margin:0 auto;position:relative;z-index:1">
    <div class="ph-ew">💬 Atatürk Köşesi</div>
    <h1 class="ph-h1">Atatürk Sözleri — <em>Işığı Hiç Sönmez</em></h1>
    <p class="ph-desc">Mustafa Kemal Atatürk'ün barış, eğitim, demokrasi, kadın hakları, gençlik ve Türkiye Cumhuriyeti'nin ebediliği üzerine seçilmiş sözleri — nesillere ilham vermeye devam eden öğütler.</p>
  </div>
</div>
<div class="sec">
  <div class="sec-w">
    <!-- ÖNE ÇIKAN SÖZ -->
    <div class="featured-q">
      <p class="fq-text">"Yurtta sulh, cihanda sulh."</p>
      <div class="fq-src">— Mustafa Kemal Atatürk &nbsp;·&nbsp; Dış Politika İlkesi, 1931</div>
    </div>
    <!-- FİLTRE & ARAMA -->
    <div class="search-row">
      <input type="text" class="search-inp" id="soz-ara" placeholder="Söz ara..." oninput="sozFiltrele()">
      <span class="result-count" id="soz-sayi"><?php echo count($sozler); ?> söz</span>
    </div>
    <div class="filter-bar" id="soz-filtre">
      <?php foreach ($kategoriler as $kat): ?>
      <button class="fbtn <?php echo ($kat === 'Tümü') ? 'on' : ''; ?>" onclick="katFiltrele('<?php echo esc_js($kat); ?>',this)"><?php echo esc_html($kat); ?></button>
      <?php endforeach; ?>
    </div>
    <!-- GRID -->
    <div class="quotes-grid" id="soz-grid">
      <?php foreach ($sozler as $s): ?>
      <div class="q-card" data-kat="<?php echo esc_attr($s['kategori']); ?>" data-metin="<?php echo esc_attr(strtolower($s['metin'])); ?>">
        <span class="q-cat"><?php echo esc_html($s['kategori']); ?></span>
        <p class="q-text"><?php echo esc_html($s['metin']); ?></p>
        <div class="q-meta">
          <span class="q-src"><?php echo esc_html($s['kaynak']); ?></span>
          <?php if (!empty($s['yil'])): ?>
          <span class="q-year"><?php echo esc_html($s['yil']); ?></span>
          <?php endif; ?>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
    <div id="sonuc-yok">
      <div style="font-size:3rem;margin-bottom:14px">🔍</div>
      <p style="font-size:14px;color:var(--t3)">Söz bulunamadı. Farklı anahtar kelimeler deneyin veya filtreyi sıfırlayın.</p>
      <button onclick="sifirla()" style="margin-top:14px;padding:10px 22px;background:var(--r);color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--fn)">Sıfırla</button>
    </div>
  </div>
</div>
<!-- KAYNAKLAR HAKKINDA -->
<div class="sec alt">
  <div class="sec-w" style="max-width:900px">
    <div class="badge g">Kaynaklar Hakkında</div>
    <h2 class="sec-title">Alıntı Kaynakları ve Atıflar</h2>
    <p style="font-size:13.5px;color:var(--t2);line-height:1.9;margin-bottom:14px">Bu sayfadaki sözler; Nutuk (1927), Türkiye Büyük Millet Meclisi tutanakları, gazete röportajları ve Atatürk Araştırma Merkezi (ATAM) tarafından belgelenmiş konuşmalar gibi doğrulanmış tarihi kaynaklardan alınmıştır.</p>
    <p style="font-size:13.5px;color:var(--t2);line-height:1.9;margin-bottom:14px">Bazı sözler Atatürk'e atfedilmekle birlikte kesin birincil kaynakları belirsizdir. Bunlar "Atfedilen" olarak işaretlenmiştir. Mümkün olan her yerde yalnızca tarihsel açıdan doğrulanabilir sözlere yer verilmektedir.</p>
    <p style="font-size:13.5px;color:var(--t2);line-height:1.9">Atatürk'ün konuşma ve yazılarının kesin arşivi için <strong>Atatürk Araştırma Merkezi (ATAM)</strong>'ın <a href="https://www.atam.gov.tr" target="_blank" rel="noopener" style="color:var(--r)">atam.gov.tr</a> adresini ziyaret etmenizi öneririz.</p>
  </div>
</div>
<div class="cta-band">
  <div class="cta-w">
    <div class="cta-text">
      <h3>Atatürk'ü Daha Yakından Tanıyın</h3>
      <p>Hayatı, ilkeleri ve tam kronolojisiyle büyük önderin mirasını keşfedin.</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a href="<?php echo esc_url(home_url('/ataturk-hayati')); ?>" class="btn-wh">📖 Hayatı</a>
      <a href="<?php echo esc_url(home_url('/ataturk-ilkeler')); ?>" class="btn-ol">⚖️ İlkeleri</a>
    </div>
  </div>
</div>
</div>
<script>
var aktifKat = 'Tümü';
function katFiltrele(kat, btn) {
  aktifKat = kat;
  document.querySelectorAll('#soz-filtre .fbtn').forEach(function(b){ b.classList.remove('on'); });
  btn.classList.add('on');
  sozFiltrele();
}
function sozFiltrele() {
  var q = document.getElementById('soz-ara').value.toLowerCase().trim();
  var kartlar = document.querySelectorAll('.q-card');
  var gorunen = 0;
  kartlar.forEach(function(kart) {
    var katOk  = (aktifKat === 'Tümü') || (kart.dataset.kat === aktifKat);
    var metinOk = (q === '') || kart.dataset.metin.includes(q);
    var goster  = katOk && metinOk;
    kart.style.display = goster ? '' : 'none';
    if (goster) gorunen++;
  });
  document.getElementById('soz-sayi').textContent = gorunen + ' söz';
  document.getElementById('sonuc-yok').style.display = (gorunen === 0) ? '' : 'none';
}
function sifirla() {
  document.getElementById('soz-ara').value = '';
  aktifKat = 'Tümü';
  document.querySelectorAll('#soz-filtre .fbtn').forEach(function(b){ b.classList.remove('on'); });
  document.querySelector('#soz-filtre .fbtn').classList.add('on');
  sozFiltrele();
}
</script>
<?php endif; get_footer(); ?>
