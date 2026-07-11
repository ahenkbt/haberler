<?php
/**
 * Template Name: Bağış Yapın
 * Template Post Type: page
 * DSV + VKD çift modlu bağış sayfası
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();

$_site_tipi  = get_option('vkv_site_tipi', 'vakif');
$bagis_url   = get_theme_mod('vkv_bagis_url', 'https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07');
$iban        = get_option('vkv_iban_opt', 'TR49 0001 0012 6298 0865 4750 01');
$iban_raw    = str_replace(' ', '', $iban);
$banka_adi   = get_option('vkv_banka_adi_opt', 'Ziraat Bankası');
$org_adi     = get_theme_mod('vkv_logo_name', get_bloginfo('name'));
$banka_hesap = get_option('vkv_banka_hesap_opt', $org_adi);
$is_dsv      = ($_site_tipi === 'dsv');

if ($is_dsv) {
    $hero_eyebrow  = '💙 Dünya Sağlık Vakfı — Bağış';
    $hero_baslik   = 'Sağlıklı Bir Dünya İçin Destek Olun';
    $hero_desc     = 'Her bağışınız bir çocuğun aşılanmasına, bir annenin güvenli doğum yapmasına ve daha sağlıklı topluluklar kurulmasına katkı sağlar.';
    $etki_alanlari = array(
        array('💉','Aşı & Bağışıklama','Çocukları önlenebilir hastalıklardan korur.'),
        array('🏥','Temel Sağlık','Uzak bölgelere sağlık hizmeti ulaştırır.'),
        array('🎓','Tıp Bursu','Geleceğin sağlık profesyonellerini yetiştirir.'),
        array('🌍','Acil Müdahale','Kriz bölgelerine ilaç ve ekipman gönderir.'),
    );
    $neden_listesi = array(
        array('💉','Aşı Programları','WHO rehberine uygun aşılama kampanyaları finanse edilir.'),
        array('🦠','Hastalık Kontrolü','Sıtma, tüberküloz, HIV ile mücadele programları desteklenir.'),
        array('🧠','Ruh Sağlığı','Küresel ölçekte ruh sağlığı farkındalığı artırılır.'),
        array('🌿','Tek Sağlık','İnsan, hayvan ve çevre sağlığını kapsayan projeler yürütülür.'),
    );
    $bagis_go_txt   = '💙 Güvenli Bağış Yap';
    $hero_gradient  = 'linear-gradient(135deg,#0c1a2e 0%,#0369a1 100%)';
    $tutarlar       = array('₺50','₺100','₺250','₺500','₺1.000','Diğer');
    $neden_baslik   = '💙 Neden Destek Olmalısınız?';
    $neden_altyazi  = 'Dünyanın neresinde doğarsa doğsun her insanın sağlık hakkı vardır.';
    $etki_baslik    = '❤️ Bağışınız Ne Sağlar?';
    $etki_altyazi   = 'Her katkı doğrudan WHO ortaklı sağlık programlarına aktarılır.';
} else {
    $hero_eyebrow  = '🛡️ ' . $org_adi . ' — Destek';
    $hero_baslik   = 'Vatana Katkıda Bulun';
    $hero_desc     = 'Vakfımızın faaliyetlerini sürdürebilmek için bağışınıza ihtiyacımız var. Her katkı doğrudan hizmetlerimize aktarılır.';
    $etki_alanlari = array(
        array('🎖️','Şehit Aileler','Şehit ailelerine maddi ve manevi destek.'),
        array('🏅','Gazi Hakları','Gazilerimizin hak ve haklarının korunması.'),
        array('🎓','Burs Programı','Şehit çocuklarına eğitim bursu.'),
        array('📜','Kahraman Tarihi','Kahramanların hikâyelerini yaşatma.'),
    );
    $neden_listesi = array(
        array('🎖️','Şehit Ailelerine Destek','Vatan uğruna canını veren kahramanlarımızın ailelerine her türlü destek verilir.'),
        array('🏅','Gazi Hakları','Gazilerimizin haklarını korumak için hukuki ve sosyal destek sağlanır.'),
        array('🎓','Eğitim Bursu','Şehit ve gazi çocuklarına eğitim bursları verilir.'),
        array('📜','Tarih','Türk kahramanlarının hikâyelerini gelecek nesillere aktarıyoruz.'),
    );
    $bagis_go_txt   = '🛡️ Güvenli Bağış Yap';
    $hero_gradient  = 'linear-gradient(135deg,var(--dk) 0%,var(--cr2) 100%)';
    $tutarlar       = array('₺100','₺250','₺500','₺1.000','₺2.500','Diğer');
    $neden_baslik   = '🛡️ Neden Destek Olmalısınız?';
    $neden_altyazi  = 'Kahramanlarınızın yanında olun.';
    $etki_baslik    = '❤️ Neden Destek?';
    $etki_altyazi   = 'Her katkı doğrudan faaliyetlerimize aktarılır.';
}
?>
<style>
.bagis-grid{display:grid;grid-template-columns:1fr 340px;gap:32px;max-width:1180px;margin:0 auto;padding:40px 20px}
.bagis-kutu{background:#fff;border:1px solid var(--sin);overflow:hidden;border-radius:4px;margin-bottom:0}
.bk-head{background:var(--cr2);padding:22px 24px;border-left:4px solid var(--altin)}
.bk-head h3{font-family:var(--fh);font-size:1.1rem;font-weight:700;color:#fff;margin:0 0 4px}
.bk-head p{font-size:12px;color:rgba(255,255,255,.6);margin:0}
.bk-body{padding:22px 24px}
.tutar-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.tutar-btn{padding:12px 8px;border:1.5px solid var(--sin);background:#fff;font-family:var(--fh);font-size:14px;font-weight:700;color:var(--yz2);cursor:pointer;transition:all .2s;text-align:center;border-radius:3px}
.tutar-btn:hover,.tutar-btn.aktif{background:var(--cr);border-color:var(--cr);color:#fff}
.tutar-inp{width:100%;border:1.5px solid var(--sin);padding:11px 14px;font-size:14px;outline:none;font-family:var(--fm);margin-bottom:12px;display:block;transition:border-color .2s;box-sizing:border-box}
.tutar-inp:focus{border-color:var(--cr)}
.bagis-go{width:100%;background:var(--cr);color:#fff;border:none;padding:14px;font-family:var(--fh);font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;cursor:pointer;transition:background .2s;border-radius:3px;display:block;text-align:center;text-decoration:none;box-sizing:border-box}
.bagis-go:hover{background:var(--cr2);color:#fff}
.iban-kutu{background:var(--bg);border:1px solid var(--sin);padding:14px;margin-top:16px}
.iban-baslik{font-size:9.5px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--cr);margin-bottom:10px}
.iban-satir{font-size:12px;color:var(--dk);background:#fff;border:1px solid var(--sin);padding:8px 10px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.iban-cp{background:var(--cr);color:#fff;border:none;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--fh)}
.etki-kart{background:#fff;border:1px solid var(--sin);padding:20px 16px;text-align:center;transition:all .2s;border-radius:4px}
.etki-kart:hover{border-color:var(--cr);transform:translateY(-2px);box-shadow:0 4px 16px rgba(3,105,161,.1)}
.etki-em{font-size:2rem;margin-bottom:8px}
.etki-n{font-family:var(--fh);font-size:1rem;font-weight:700;color:var(--cr);margin-bottom:4px}
.etki-l{font-size:11px;color:var(--yz2);line-height:1.5}
.tp-hero-w{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:1fr auto;gap:32px;align-items:center}
.tp-eyebrow{font-family:var(--fh);font-size:10px;letter-spacing:2.5px;font-weight:700;text-transform:uppercase;color:var(--altin2);margin-bottom:10px}
.tp-h1{font-family:var(--fh);font-size:clamp(1.6rem,3.5vw,2.4rem);font-weight:800;color:#fff;margin:0 0 12px;line-height:1.15}
.tp-h1 em{color:var(--altin2);font-style:normal}
.tp-hdesc{font-size:14px;color:rgba(255,255,255,.75);line-height:1.8;max-width:560px;margin:0}
.tp-hero-stats{display:flex;gap:16px;flex-shrink:0}
.tp-stat{text-align:center;background:rgba(255,255,255,.1);padding:14px 18px;border-radius:6px;min-width:80px}
.tp-stat-n{font-family:var(--fh);font-size:1.3rem;font-weight:800;color:#fff}
.tp-stat-l{font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.55);margin-top:2px}
.tp-bc{background:var(--bg);border-bottom:1px solid var(--sin)}
.tp-bc-w{max-width:1180px;margin:0 auto;padding:8px 20px;font-size:12px;color:var(--yz3);display:flex;align-items:center;gap:4px}
.tp-bc-w a{color:var(--cr);text-decoration:none}
@media(max-width:860px){.bagis-grid{grid-template-columns:1fr}.tp-hero-w{grid-template-columns:1fr}.tp-hero-stats{display:none}}
@media(max-width:600px){.etki-kart-grid{grid-template-columns:1fr 1fr !important}}
</style>

<div style="background:<?php echo $hero_gradient; ?>;padding:52px 20px">
  <div class="tp-hero-w">
    <div>
      <div class="tp-eyebrow"><?php echo esc_html($hero_eyebrow); ?></div>
      <h1 class="tp-h1"><?php echo esc_html($hero_baslik); ?></h1>
      <p class="tp-hdesc"><?php echo esc_html($hero_desc); ?></p>
    </div>
    <div class="tp-hero-stats">
      <div class="tp-stat"><div class="tp-stat-n">%100</div><div class="tp-stat-l">Şeffaf</div></div>
      <div class="tp-stat"><div class="tp-stat-n">SSL</div><div class="tp-stat-l">Güvenli</div></div>
    </div>
  </div>
</div>
<div class="tp-bc"><div class="tp-bc-w"><a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a><span style="color:var(--yz3)">›</span><span>Bağış Yapın</span></div></div>

<!-- ETKİ ALANLARI -->
<div style="max-width:1180px;margin:0 auto;padding:40px 20px 0">
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-family:var(--fh);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--cr);margin-bottom:6px"><?php echo esc_html($etki_baslik); ?></div>
    <h2 style="font-family:var(--fh);font-size:1.5rem;color:var(--dk);margin:0 0 8px">Bağışınız Neye Gider?</h2>
    <p style="font-size:12.5px;color:var(--yz2);max-width:520px;margin:0 auto"><?php echo esc_html($etki_altyazi); ?></p>
  </div>
  <div class="etki-kart-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:40px">
    <?php foreach ($etki_alanlari as $e): ?>
    <div class="etki-kart">
      <div class="etki-em"><?php echo $e[0]; ?></div>
      <div class="etki-n"><?php echo esc_html($e[1]); ?></div>
      <div class="etki-l"><?php echo esc_html($e[2]); ?></div>
    </div>
    <?php endforeach; ?>
  </div>
</div>

<!-- BAĞIŞ FORMU + SAĞ PANEL -->
<div class="bagis-grid">
  <div style="display:flex;flex-direction:column;gap:24px">
    <div class="bagis-kutu">
      <div class="bk-head"><h3>💳 Online Bağış (Stripe)</h3><p>Güvenli ödeme altyapısı ile kredi/banka kartı ile bağış yapın.</p></div>
      <div class="bk-body">
        <p style="font-size:13px;color:var(--yz2);margin-bottom:16px;line-height:1.7">Bağış miktarınızı seçin veya kendiniz yazın. Stripe güvenli ödeme sayfasına yönlendirileceksiniz.</p>
        <div class="tutar-grid">
          <?php foreach ($tutarlar as $i => $t): ?>
          <button class="tutar-btn <?php echo $i===1?'aktif':''; ?>" onclick="bagisAmt(this)"><?php echo esc_html($t); ?></button>
          <?php endforeach; ?>
        </div>
        <input type="text" id="bagisKendi" class="tutar-inp" placeholder="Özel miktar girin (₺)…" style="display:none">
        <a href="<?php echo esc_url($bagis_url); ?>" target="_blank" rel="noopener" class="bagis-go"><?php echo esc_html($bagis_go_txt); ?></a>
        <p style="font-size:11px;color:var(--yz3);text-align:center;margin-top:10px"><i class="fa fa-lock"></i> 256-bit SSL şifreli · Stripe güvencesi</p>
      </div>
    </div>
    <div class="bagis-kutu">
      <div class="bk-head"><h3>🏦 Havale / EFT ile Bağış</h3><p>Banka havalesi ile de bağış yapabilirsiniz.</p></div>
      <div class="bk-body">
        <div class="iban-kutu">
          <div class="iban-baslik">Banka Hesap Bilgileri</div>
          <div class="iban-satir"><span><strong>Alıcı:</strong> <?php echo esc_html($banka_hesap); ?></span></div>
          <div class="iban-satir"><span><strong>Banka:</strong> <?php echo esc_html($banka_adi); ?></span></div>
          <div class="iban-satir">
            <span><strong>IBAN:</strong> <?php echo esc_html($iban); ?></span>
            <button class="iban-cp" onclick="ibanKopyala(this,'<?php echo esc_js($iban_raw); ?>')">Kopyala</button>
          </div>
          <p style="font-size:11px;color:var(--yz3);margin-top:8px;line-height:1.7">Havale açıklamasına "Bağış" ve adınızı yazmayı unutmayın.</p>
        </div>
      </div>
    </div>
  </div>
  <div>
    <div class="bagis-kutu">
      <div class="bk-head"><h3><?php echo esc_html($neden_baslik); ?></h3><p><?php echo esc_html($neden_altyazi); ?></p></div>
      <div class="bk-body">
        <ul style="padding:0;list-style:none;margin:0;display:flex;flex-direction:column;gap:14px">
          <?php foreach ($neden_listesi as $n): ?>
          <li style="display:flex;align-items:flex-start;gap:12px">
            <span style="font-size:1.4rem;flex-shrink:0"><?php echo $n[0]; ?></span>
            <div>
              <div style="font-family:var(--fh);font-size:12.5px;font-weight:700;color:var(--dk);margin-bottom:3px"><?php echo esc_html($n[1]); ?></div>
              <div style="font-size:11.5px;color:var(--yz2);line-height:1.6"><?php echo esc_html($n[2]); ?></div>
            </div>
          </li>
          <?php endforeach; ?>
        </ul>
        <?php if ($is_dsv): ?>
        <div style="margin-top:18px;padding:14px;background:var(--bg);border:1px solid var(--sin);border-radius:4px;font-size:12px;color:var(--yz2);line-height:1.7">
          <strong style="color:var(--cr)">🔍 Şeffaflık Taahhüdü</strong><br>
          Her yıl yayınlanan mali raporda bağışların proje bazında kullanımı kamuoyuyla paylaşılır. Toplanan fonların %85'inden fazlası saha programlarına aktarılır.
        </div>
        <?php endif; ?>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--sin);font-size:11px;color:var(--yz3);text-align:center;line-height:1.7">
          <i class="fa fa-lock" style="color:var(--cr)"></i> Tüm bağışlar yasal mevzuat kapsamındadır.<br>
          <i class="fa fa-file-alt" style="color:var(--cr)"></i> Vergi avantajı için makbuz talep edebilirsiniz.
        </div>
      </div>
    </div>
  </div>
</div>
<script>
function bagisAmt(btn){document.querySelectorAll('.tutar-btn').forEach(function(b){b.classList.remove('aktif');});btn.classList.add('aktif');var ki=document.getElementById('bagisKendi');ki.style.display=(btn.textContent==='Diğer')?'block':'none';}
function ibanKopyala(btn,iban){navigator.clipboard.writeText(iban).then(function(){btn.textContent='✓';btn.style.background='#15803d';setTimeout(function(){btn.textContent='Kopyala';btn.style.background='';},2500);});}
</script>
<?php get_footer(); ?>
