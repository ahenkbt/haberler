<?php
/**
 * Default Page Template
 * DSV alt sayfaları için otomatik içerik yükleme destekli
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();

/* DSV alt sayfa içerik haritası */
$_dsv_alt_icerikler = array(

'psikolojik-destek' => array(
    'baslik'  => 'Psikolojik Destek Hizmetleri',
    'emoji'   => '🧠',
    'renk'    => '#7c3aed',
    'icerik'  => '<p>Dünya Sağlık Örgütü verilerine göre dünyada her 8 kişiden 1\'i ruhsal bir bozuklukla yaşamaktadır. Depresyon ve anksiyete bozuklukları, küresel hastalık yükünün en büyük bileşenlerinden biridir. Dünya Sağlık Vakfı olarak ruh sağlığını fiziksel sağlıkla eşit değerde gören bir anlayışla bu alanda programlar yürütüyoruz.</p>
    <h2>Sunduğumuz Hizmetler</h2>
    <ul>
      <li><strong>Bireysel danışmanlık:</strong> Klinik psikolog ve psikiyatristlerle ücretsiz bireysel görüşme imkânı.</li>
      <li><strong>Grup terapisi:</strong> Benzer deneyimler yaşayan bireyleri bir araya getiren destekli grup seansları.</li>
      <li><strong>Kriz müdahale hattı:</strong> Akut psikolojik kriz durumlarında 7/24 erişilebilir destek hattı.</li>
      <li><strong>Çocuk ve ergen ruh sağlığı:</strong> Okul çağı çocuklara ve ailelerine yönelik özel programlar.</li>
      <li><strong>Afet sonrası psikososyal destek:</strong> Travma yaşayan bireyler için WHO rehberi kapsamında müdahale.</li>
    </ul>
    <h2>WHO\'nun Ruh Sağlığı Öncelikleri</h2>
    <p>WHO\'nun 2024-2031 Küresel Ruh Sağlığı Eylem Planı kapsamında ülkelerin ruh sağlığı hizmetlerine yatırımlarını artırması hedeflenmektedir. Bu planın Türkiye ayağında toplumsal farkındalık oluşturmak için çalışıyoruz.</p>
    <h2>Başvuru</h2>
    <p>Psikolojik destek almak için <a href="/dsv-iletisim">iletişim formunu</a> doldurabilir veya doğrudan randevu talebinde bulunabilirsiniz. Tüm hizmetlerimiz ücretsiz ve gizlilik esasına dayanmaktadır.</p>',
),

'saglik-taramalari' => array(
    'baslik'  => 'Sağlık Taramaları',
    'emoji'   => '🔬',
    'renk'    => '#0891b2',
    'icerik'  => '<p>Erken tanı, pek çok hastalıkta tedavi başarısını dramatik biçimde artırır. WHO\'nun küresel kanser, diyabet ve kardiyovasküler hastalık stratejileri, düzenli taramaların yaygınlaştırılmasını temel öncelik olarak belirlemiştir. Dünya Sağlık Vakfı olarak bu alanda ücretsiz toplum tarama kampanyaları düzenliyoruz.</p>
    <h2>Tarama Programlarımız</h2>
    <ul>
      <li><strong>Kanser taramaları:</strong> Meme, serviks ve kolorektal kanser için risk grubuna yönelik erken tanı programları.</li>
      <li><strong>Kardiyovasküler risk değerlendirmesi:</strong> Kan basıncı, kolesterol ve kalp ritmi ölçümleri.</li>
      <li><strong>Diyabet ve prediyabet taraması:</strong> Açlık kan şekeri ve HbA1c ölçümü ile risk tespiti.</li>
      <li><strong>Görme ve işitme taramaları:</strong> Okul öncesi ve okul çağı çocuklara yönelik periyodik muayeneler.</li>
      <li><strong>Bone density (kemik yoğunluğu):</strong> Osteoporoz riski taşıyan kadınlara yönelik DXA taraması.</li>
    </ul>
    <h2>Kimler Başvurabilir?</h2>
    <p>Tarama programlarımız ücret, sigorta durumu veya yerleşim yeri ayrımı gözetmeksizin herkese açıktır. Kırsal kesimlere ulaşım güçlüğü yaşayan vatandaşlarımız için gezici tarama araçları düzenli turneler yapmaktadır.</p>
    <p>Yakın bölgenizdeki tarama takvimini öğrenmek için <a href="/dsv-iletisim">bizimle iletişime geçin.</a></p>',
),

'evde-saglik' => array(
    'baslik'  => 'Evde Sağlık Hizmetleri',
    'emoji'   => '🏠',
    'renk'    => '#059669',
    'icerik'  => '<p>Hareket kısıtlılığı, yaşlılık veya kronik hastalık nedeniyle sağlık kuruluşlarına erişemeyen bireyler için kaliteli sağlık hizmeti evde sunulabilir. Dünya Sağlık Vakfı\'nın evde sağlık ekipleri, WHO\'nun entegre kişi merkezli sağlık hizmetleri modeli çerçevesinde çalışmaktadır.</p>
    <h2>Hizmet Kapsamı</h2>
    <ul>
      <li><strong>Yara bakımı ve pansuman:</strong> Uzmanlar tarafından evde uygulanan steril yara bakımı.</li>
      <li><strong>İlaç yönetimi ve ilaç eğitimi:</strong> Çok sayıda ilaç kullanan kronik hastalara yönelik ilaç düzenleme desteği.</li>
      <li><strong>Fizyoterapi:</strong> Hareket kısıtlılığı olan bireylere yönelik evde egzersiz ve rehabilitasyon seansları.</li>
      <li><strong>Kan alma ve lab takibi:</strong> Evde kan ve diğer örneklerin alınması, sonuçların hasta ile paylaşılması.</li>
      <li><strong>Palyatif bakım:</strong> Terminal dönem hastalara ve ailelerine tıbbi ve psikososyal destek.</li>
    </ul>
    <h2>Başvuru Koşulları</h2>
    <p>Hekim raporu veya aile hekimi yönlendirmesi ile başvurabilirsiniz. Hizmet kapasitemiz kısıtlı olduğundan öncelik kronik hastalık ve ileri yaş durumlarına verilmektedir. Başvuru için <a href="/dsv-iletisim">iletişim formunu</a> doldurun.</p>',
),

'ucretsiz-muayene' => array(
    'baslik'  => 'Ücretsiz Muayene',
    'emoji'   => '🩺',
    'renk'    => '#0369a1',
    'icerik'  => '<p>WHO\'nun evrensel sağlık kapsayıcılığı (UHC) hedefi, herkesin finansal güçlük yaşamadan temel sağlık hizmetlerine erişmesini öngörür. Dünya Sağlık Vakfı olarak bu hedefe katkı sağlamak amacıyla ücretsiz birinci basamak muayene günleri düzenliyoruz.</p>
    <h2>Hangi Branşlar?</h2>
    <ul>
      <li>Dahiliye / İç hastalıkları</li>
      <li>Aile hekimliği ve genel pratisyenlik</li>
      <li>Çocuk hastalıkları (pediatri)</li>
      <li>Kadın hastalıkları ve doğum</li>
      <li>Dermatoloji (cilt hastalıkları)</li>
      <li>Göz hastalıkları</li>
    </ul>
    <h2>Ne Zaman ve Nerede?</h2>
    <p>Ücretsiz muayene günleri ayda iki kez, Türkiye genelinde farklı ilçelerde rotasyon şeklinde düzenlenmektedir. Yaklaşan etkinlikler için <a href="/dsv-etkinlikler">etkinlikler sayfamızı</a> takip edebilir ya da <a href="/dsv-iletisim">bültenimize</a> kaydolabilirsiniz.</p>
    <p><strong>Not:</strong> Muayeneler randevulu sistemle işlemektedir. Kapasite dolduğunda yeni randevu alınamayabilir; bu nedenle erken başvuru önerilir.</p>',
),

'dis-sagligi' => array(
    'baslik'  => 'Diş Sağlığı Hizmetleri',
    'emoji'   => '🦷',
    'renk'    => '#d97706',
    'icerik'  => '<p>WHO verilerine göre ağız hastalıkları, dünyada en yaygın bulaşıcı olmayan hastalıklar arasında üst sıralarda yer almakta ve küresel nüfusun yaklaşık %45\'ini etkilemektedir. Çocuklardaki diş çürüğü, dünyada en sık görülen kronik hastalıktır. Dünya Sağlık Vakfı olarak diş sağlığını genel sağlığın ayrılmaz bir parçası olarak ele alıyoruz.</p>
    <h2>Hizmetlerimiz</h2>
    <ul>
      <li><strong>Ağız-diş muayenesi:</strong> Ücretsiz periodontal ve karyolojik değerlendirme.</li>
      <li><strong>Diş fırçalama eğitimi:</strong> Çocuk ve gençler için doğru fırçalama tekniği eğitimleri.</li>
      <li><strong>Florür uygulaması:</strong> Yüksek riskli çocuklarda diş çürüğü önleme programı.</li>
      <li><strong>Diş çekimi:</strong> Endike vakalarda serbest diş çekimi.</li>
    </ul>
    <p>Diş sağlığı takvimini öğrenmek için <a href="/dsv-iletisim">bizimle iletişime geçin.</a></p>',
),

'goz-taramasi' => array(
    'baslik'  => 'Göz Taraması',
    'emoji'   => '👁️',
    'renk'    => '#0369a1',
    'icerik'  => '<p>Dünya genelinde 2,2 milyardan fazla insanda görme bozukluğu bulunmakta; bu vakaların yarısından fazlası önlenebilir ya da tedavi edilebilir niteliktedir. WHO\'nun Dünya Görme Eylem Planı kapsamında göz sağlığının birinci basamak sağlık hizmetlerine entegrasyonu hedeflenmektedir.</p>
    <h2>Tarama Kapsamı</h2>
    <ul>
      <li>Görme keskinliği testi (uzak ve yakın)</li>
      <li>Göz içi basıncı ölçümü (glokom taraması)</li>
      <li>Renk körlüğü testi</li>
      <li>Kırma kusurları değerlendirmesi</li>
      <li>Diyabetik retinopati taraması</li>
    </ul>
    <p>Okul çağı çocuklara yönelik göz tarama günleri için <a href="/dsv-iletisim">iletişime geçin.</a></p>',
),

'koy-saglik' => array(
    'baslik'  => 'Köy Sağlık Projeleri',
    'emoji'   => '🏘️',
    'renk'    => '#059669',
    'icerik'  => '<p>Türkiye\'de kırsal kesimlerdeki sağlık hizmetlerine erişim eşitsizliği önemli bir sorun olmaya devam etmektedir. Dünya Sağlık Vakfı olarak WHO\'nun kırsal sağlık stratejileri çerçevesinde, sahra koşullarında çalışabilen seyyar klinikler ve eğitimli sağlık gönüllüleriyle bu boşluğu doldurmaya çalışıyoruz.</p>
    <h2>Proje Kapsamı</h2>
    <ul>
      <li>Gezici muayene araçlarıyla köylere düzenli sağlık ziyaretleri</li>
      <li>Köy muhtarlıklarıyla koordineli aşılama günleri</li>
      <li>Temel ilaç ve sarf malzeme deposu oluşturma</li>
      <li>Köy sağlık elçisi yetiştirme programı</li>
      <li>Anne-çocuk sağlığı takip sistemi kurma</li>
    </ul>
    <h2>Sonuçlar</h2>
    <p>Programa dahil edilen 50\'den fazla köyde rutin aşılanma oranı %40 artış göstermiştir. Gezici klinik ziyaretleri sayesinde önceden tanı konulamamış 200\'den fazla diyabet vakası erken dönemde tespit edilmiştir.</p>',
),

'uluslararasi' => array(
    'baslik'  => 'Uluslararası Sağlık Projeleri',
    'emoji'   => '🌐',
    'renk'    => '#0369a1',
    'icerik'  => '<p>Sağlık krizleri sınır tanımaz. Dünya Sağlık Vakfı olarak WHO\'nun küresel sağlık acil müdahale ağı aracılığıyla kriz bölgelerine destek sağlıyoruz. Bu desteği; ilaç ve tıbbi sarf malzeme, uzman sağlık personeli desteği ve sağlık altyapısı yeniden inşası şeklinde sunuyoruz.</p>
    <h2>Aktif Destek Verdiğimiz Bölgeler</h2>
    <ul>
      <li>Savaş ve çatışma bölgelerinde WHO koordinasyonlu insani sağlık yardımı</li>
      <li>Afet sonrası sağlık altyapısı onarımı</li>
      <li>Salgın bölgelerinde hızlı tanı ve tedavi desteği</li>
      <li>Yerinden edilmiş topluluklar için mobil sağlık hizmetleri</li>
    </ul>
    <p>Uluslararası projelere bağışçı veya gönüllü olarak destek vermek için <a href="/dsv-bagis">bağış sayfamızı</a> ziyaret edin.</p>',
),

'tip-burslari' => array(
    'baslik'  => 'Tıp Bursları',
    'emoji'   => '🩺',
    'renk'    => '#0369a1',
    'icerik'  => '<p>Güçlü bir sağlık sistemi ancak yeterli ve nitelikli sağlık iş gücüyle mümkündür. WHO raporları, düşük ve orta gelirli ülkelerde yaklaşık 10 milyon sağlık personeli açığı bulunduğunu ortaya koymaktadır. Dünya Sağlık Vakfı\'nın Tıp Bursu Programı, bu açığı kapatmaya katkı sunmak amacıyla başarılı öğrencileri desteklemektedir.</p>
    <h2>Burs Detayları</h2>
    <ul>
      <li><strong>Kapsam:</strong> Tıp, eczacılık, hemşirelik, halk sağlığı ve sağlık yönetimi öğrencileri</li>
      <li><strong>Miktar:</strong> Yıllık 50.000 TL nakdi burs</li>
      <li><strong>Süre:</strong> Akademik yıl boyunca, başarı koşuluyla her yıl yenilenir</li>
      <li><strong>Ek imkânlar:</strong> WHO yayınlarına erişim, mentorluk, staj fırsatı</li>
    </ul>
    <h2>Başvuru Koşulları</h2>
    <ul>
      <li>Aktif olarak tıp/sağlık bilimleri lisans öğrencisi olmak</li>
      <li>Genel not ortalaması 3.0/4.0 veya üzeri</li>
      <li>Motivasyon mektubu ve iki referans mektubu</li>
      <li>Sosyal sorumluluk projesi deneyimi (tercih nedeni)</li>
    </ul>
    <p>Her yıl Eylül ayında başvurular açılır. Detaylı bilgi için <a href="/dsv-iletisim">iletişime geçin.</a></p>',
),

'saglik-akademisi' => array(
    'baslik'  => 'Sağlık Akademisi',
    'emoji'   => '🎓',
    'renk'    => '#0891b2',
    'icerik'  => '<p>Dünya Sağlık Vakfı Sağlık Akademisi, WHO\'nun resmi eğitim materyalleri ve rehberlerine dayanan, güncel küresel sağlık gündemini Türkiye\'ye taşıyan bir sürekli eğitim platformudur.</p>
    <h2>Eğitim Programları</h2>
    <ul>
      <li><strong>Halk Sağlığı Sertifika Programı:</strong> 6 haftalık yoğun program; epidemiyoloji, biyoistatistik, çevre sağlığı ve sağlık politikası modülleri.</li>
      <li><strong>Acil Sağlık Müdahalesi Kursu:</strong> Afet ve salgın senaryolarında WHO protokollerine göre müdahale eğitimi.</li>
      <li><strong>Tek Sağlık Atölyesi:</strong> İnsan, hayvan ve çevre sağlığını birleştiren disiplinlerarası uygulama çalışması.</li>
      <li><strong>Sağlık Okuryazarlığı Eğitici Eğitimi:</strong> Toplumda sağlık bilincini artıracak eğiticilerin yetiştirilmesi.</li>
    </ul>
    <h2>Sertifikasyon</h2>
    <p>Programları tamamlayan katılımcılara Dünya Sağlık Vakfı onaylı sertifika verilir. Seçilmiş programlar uluslararası akreditasyon sürecindedir. Kayıt ve program takvimi için <a href="/dsv-iletisim">iletişime geçin.</a></p>',
),

);

/* Mevcut sayfanın slug'ını al */
$current_slug = get_post_field('post_name', get_queried_object_id());
$has_dsv_content = isset($_dsv_alt_icerikler[$current_slug]);
?>
<style>
.vkv-page-wrap{max-width:1180px;margin:0 auto;padding:32px 20px 56px;display:grid;grid-template-columns:1fr 300px;gap:28px}
.vkv-page-content{font-size:14.5px;line-height:1.9;color:var(--yz2)}
.vkv-page-content h2{font-family:var(--fh);font-size:1.2rem;font-weight:700;color:var(--dk);border-left:4px solid var(--cr);padding-left:12px;margin:28px 0 12px}
.vkv-page-content h3{font-family:var(--fh);font-size:1rem;font-weight:700;color:var(--cr);margin:20px 0 8px}
.vkv-page-content ul{padding-left:20px;margin:10px 0 16px}
.vkv-page-content ul li{margin-bottom:8px;line-height:1.7}
.vkv-page-content p{margin-bottom:14px}
.vkv-page-content a{color:var(--cr);font-weight:600}
.vkv-page-content blockquote{border-left:3px solid var(--altin);background:var(--bg);padding:14px 18px;margin:20px 0;font-style:italic;color:var(--yz)}
.vkv-page-title{font-family:var(--fh);font-size:clamp(1.4rem,3vw,2rem);font-weight:700;color:var(--dk);margin-bottom:8px}
.vkv-title-line{width:40px;height:3px;background:var(--cr);margin-bottom:24px;border-radius:2px}
/* DSV hero banner */
.dsv-sub-hero{padding:48px 20px;color:#fff;margin-bottom:0}
.dsv-sub-hero-w{max-width:1180px;margin:0 auto;display:flex;align-items:center;gap:20px}
/* Sidebar */
.sb-k{border:1px solid var(--sin);margin-bottom:16px;overflow:hidden;border-radius:4px}
.sb-h h3{background:var(--cr2);color:#fff;font-family:var(--fh);font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:10px 14px;border-left:4px solid var(--altin);margin:0}
.sb-c{padding:12px 14px}
/* TP bc */
.tp-bc{background:var(--bg);border-bottom:1px solid var(--sin)}
.tp-bc-w{max-width:1180px;margin:0 auto;padding:8px 20px;font-size:12px;color:var(--yz3);display:flex;align-items:center;gap:4px}
.tp-bc-w a{color:var(--cr);text-decoration:none}
@media(max-width:860px){.vkv-page-wrap{grid-template-columns:1fr}}
</style>

<?php if (have_posts()): the_post(); ?>

<?php if ($has_dsv_content):
    $dc = $_dsv_alt_icerikler[$current_slug]; ?>

<!-- DSV Alt Sayfa Hero -->
<div class="dsv-sub-hero" style="background:linear-gradient(135deg,#0c1a2e,<?php echo esc_attr($dc['renk']); ?>)">
  <div class="dsv-sub-hero-w">
    <div style="font-size:3rem;flex-shrink:0"><?php echo $dc['emoji']; ?></div>
    <div>
      <div style="font-family:var(--fh);font-size:10px;letter-spacing:2px;font-weight:700;text-transform:uppercase;color:rgba(255,255,255,.55);margin-bottom:6px">Dünya Sağlık Vakfı — Sağlık Hizmetleri</div>
      <h1 style="font-family:var(--fh);font-size:clamp(1.4rem,3vw,2rem);font-weight:800;color:#fff;margin:0 0 8px"><?php echo esc_html($dc['baslik']); ?></h1>
      <div style="font-size:13px;color:rgba(255,255,255,.65)">WHO ortaklığıyla sürdürülen programlarımız hakkında bilgi alın.</div>
    </div>
  </div>
</div>
<div class="tp-bc"><div class="tp-bc-w">
  <a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a>
  <span style="color:var(--yz3)">›</span>
  <a href="<?php echo esc_url(home_url('/saglik-hizmetleri')); ?>">Sağlık Hizmetleri</a>
  <span style="color:var(--yz3)">›</span>
  <span><?php echo esc_html($dc['baslik']); ?></span>
</div></div>
<div class="vkv-page-wrap">
  <div class="vkv-page-content"><?php echo wp_kses_post($dc['icerik']); ?></div>
  <aside>
    <div class="sb-k">
      <div class="sb-h"><h3>Diğer Hizmetler</h3></div>
      <div class="sb-c">
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px">
          <?php foreach($_dsv_alt_icerikler as $slug => $item): if($slug===$current_slug) continue; ?>
          <li><a href="<?php echo esc_url(home_url('/' . $slug)); ?>" style="font-size:13px;color:var(--cr);text-decoration:none;display:flex;align-items:center;gap:6px"><?php echo $item['emoji']; ?> <?php echo esc_html($item['baslik']); ?></a></li>
          <?php endforeach; ?>
        </ul>
      </div>
    </div>
    <div class="sb-k">
      <div class="sb-h"><h3>Bağış Yap</h3></div>
      <div class="sb-c" style="text-align:center;padding:16px">
        <p style="font-size:12.5px;color:var(--yz2);margin-bottom:12px">Bu hizmetleri sürdürmek için desteğinize ihtiyacımız var.</p>
        <a href="<?php echo esc_url(home_url('/dsv-bagis')); ?>" style="display:block;background:var(--cr);color:#fff;font-family:var(--fh);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;padding:10px;text-decoration:none;border-radius:3px">💙 Bağış Yap</a>
      </div>
    </div>
  </aside>
</div>

<?php else: /* Normal WP sayfa içeriği */ ?>

<?php $thumb = function_exists('tukav_get_thumb') ? tukav_get_thumb(get_the_ID(), 'large') : ''; ?>
<?php if ($thumb): ?>
<div style="height:300px;overflow:hidden;position:relative;background:var(--dk2)">
  <img src="<?php echo esc_url($thumb); ?>" alt="<?php echo esc_attr(get_the_title()); ?>" style="width:100%;height:100%;object-fit:cover;opacity:.7">
  <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 60%)"></div>
  <div style="position:absolute;bottom:0;left:0;right:0;padding:24px 32px">
    <h1 style="font-family:var(--fh);font-size:clamp(1.5rem,3vw,2.2rem);font-weight:700;color:#fff;margin:0"><?php the_title(); ?></h1>
  </div>
</div>
<?php endif; ?>
<div class="tp-bc"><div class="tp-bc-w">
  <a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a>
  <span style="color:var(--yz3)">›</span>
  <span><?php echo esc_html(get_the_title()); ?></span>
</div></div>
<div class="vkv-page-wrap">
  <div>
    <?php if (!$thumb): ?>
    <h1 class="vkv-page-title"><?php the_title(); ?></h1>
    <div class="vkv-title-line"></div>
    <?php endif; ?>
    <div class="vkv-page-content"><?php the_content(); ?></div>
  </div>
  <aside><?php get_sidebar(); ?></aside>
</div>

<?php endif; ?>
<?php endif; ?>
<?php get_footer(); ?>
