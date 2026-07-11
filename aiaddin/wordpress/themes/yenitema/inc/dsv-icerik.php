<?php
/**
 * DSV — Dünya Sağlık Vakfı
 * Tüm sayfa içerikleri (WordPress Option olarak kaydedilir)
 * Kurulum: Bu dosyayı temanın inc/ klasörüne koyup functions.php'den çağırın
 * VEYA: Admin paneli > Araçlar > İçe Aktar yoluyla kullanın
 *
 * Kaynak: WHO (who.int), WHO Foundation (who.foundation),
 *         İSV (isv.org.tr), Tek Sağlık (teksaglik.org)
 *         İçerikler özgün biçimde yeniden yazılmıştır.
 */
defined('ABSPATH') || exit;

/* Sadece admin yöneticisi çalıştırabilir, bir kez çalışır */
add_action('admin_init', 'dsv_icerik_yukle_bir_kez');
function dsv_icerik_yukle_bir_kez() {
    if (!current_user_can('manage_options')) return;
    if (get_option('dsv_icerik_yuklendi_v1')) return;
    dsv_icerik_kaydet();
    update_option('dsv_icerik_yuklendi_v1', 1);
}

function dsv_icerik_kaydet() {

    $ic = array();

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       1. ANASAYFA — Slider & Genel Ayarlar
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    update_option('vkv_org_adi',      'Dünya Sağlık Vakfı');
    update_option('vkv_org_aciklama', 'Dünya Sağlık Vakfı, Dünya Sağlık Örgütü\'nün (WHO) küresel sağlık misyonunu desteklemek amacıyla kurulmuş bağımsız bir vakıftır. WHO\'nun 150\'den fazla ülkedeki programlarına finansman ve teknik destek sağlayarak milyonlarca insanın sağlığa erişimini kolaylaştırıyoruz.');

    /* Slider slaytları */
    update_option('vkv_slider_slides', array(
        array(
            'tag'     => 'Küresel Sağlık İçin',
            'title'   => 'Küresel Sağlık İçin Birlikte Çalışıyoruz',
            'excerpt' => 'Dünya Sağlık Vakfı, herkes için erişilebilir sağlık hizmetlerini destekler. WHO\'nun çalışmalarına ortak olun, dünyayı daha sağlıklı kılın.',
            'url'     => '/saglik-hizmetleri',
            'image'   => '',
        ),
        array(
            'tag'     => 'Salgın Hazırlığı',
            'title'   => '431 Milyon Kişiye Sağlık Hizmeti Ulaştırdık',
            'excerpt' => 'WHO\'nun 2024-2025 sonuçlarına göre temel sağlık hizmetlerine erişim sağlanan insan sayısı 431 milyon arttı. Bu başarıda bağışçılarımızın katkısı belirleyici oldu.',
            'url'     => '/dsv-projeler',
            'image'   => '',
        ),
        array(
            'tag'     => 'Bağış Çağrısı',
            'title'   => 'Sağlıklı Bir Dünya Kurmak İçin Destek Olun',
            'excerpt' => 'Çocukları hastalıklardan korumak, doğum merkezlerine ilaç ulaştırmak ve salgınlara hazırlıklı olmak için bağışlarınıza ihtiyaç var.',
            'url'     => '/dsv-bagis',
            'image'   => '',
        ),
    ));

    /* İstatistikler */
    update_option('vkv_istatistik_1',       '431M+');
    update_option('vkv_istatistik_1_label', 'Sağlık Hizmeti Alan');
    update_option('vkv_istatistik_2',       '637M');
    update_option('vkv_istatistik_2_label', 'Acil Koruma Kapsamı');
    update_option('vkv_istatistik_3',       '150+');
    update_option('vkv_istatistik_3_label', 'Ülkede Aktif');
    update_option('vkv_istatistik_4',       '1.4Mrd');
    update_option('vkv_istatistik_4_label', 'Sağlıklı Yaşam Kazanımı');

    /* Söz bandı */
    update_option('vkv_soz_band_metin',
        '"Sağlık bir hak, lütuf değildir. Dünyanın neresinde doğarsa doğsun her insan, kaliteli sağlık hizmetine erişme hakkına sahiptir."'
    );
    update_option('vkv_soz_band_kaynak', '— Dünya Sağlık Vakfı');

    /* Hizmetlerimiz modülü */
    update_option('vkv_hizmetler', json_encode(array(
        array('ikon'=>'💉','baslik'=>'Aşı ve Bağışıklama',     'aciklama'=>'Çocuk felci, kızamık, HPV ve diğer önlenebilir hastalıklara karşı aşılama kampanyaları.'),
        array('ikon'=>'🏥','baslik'=>'Temel Sağlık Hizmetleri', 'aciklama'=>'Birinci basamak sağlık merkezlerine ilaç, malzeme ve eğitim desteği.'),
        array('ikon'=>'🦠','baslik'=>'Bulaşıcı Hastalık Kontrolü','aciklama'=>'Sıtma, tüberküloz, HIV/AIDS ve ihmal edilmiş tropikal hastalıklarla mücadele programları.'),
        array('ikon'=>'🧠','baslik'=>'Ruh Sağlığı',             'aciklama'=>'Küresel ölçekte ruh sağlığı farkındalığı, erken tanı ve tedaviye erişim desteği.'),
        array('ikon'=>'🌍','baslik'=>'Acil Sağlık Müdahalesi',  'aciklama'=>'Çatışma, afet ve salgın bölgelerinde WHO ortaklığıyla ivedi sağlık operasyonları.'),
        array('ikon'=>'📚','baslik'=>'Sağlık Okuryazarlığı',   'aciklama'=>'Toplumların sağlık konularında bilinçlenmesi için eğitim ve farkındalık projeleri.'),
    )));

    /* Hızlı erişim */
    update_option('vkv_hizli_erisim_linkleri', json_encode(array(
        array('ikon'=>'💉','baslik'=>'Aşı Programları',         'url'=>'/saglik-hizmetleri'),
        array('ikon'=>'🏥','baslik'=>'Sağlık Taramaları',       'url'=>'/saglik-taramalari'),
        array('ikon'=>'🎓','baslik'=>'Burs Başvurusu',          'url'=>'/dsv-burs'),
        array('ikon'=>'🌍','baslik'=>'Projelerimiz',            'url'=>'/dsv-projeler'),
        array('ikon'=>'📅','baslik'=>'Etkinlikler',             'url'=>'/dsv-etkinlikler'),
        array('ikon'=>'📧','baslik'=>'Bize Ulaşın',            'url'=>'/dsv-iletisim'),
    )));

    /* Değerler bandı */
    update_option('vkv_degerler_bandi', json_encode(array(
        array('ikon'=>'🏥','baslik'=>'Evrensel Sağlık',         'aciklama'=>'Herkes için sağlık',         'url'=>'/saglik-hizmetleri'),
        array('ikon'=>'🔬','baslik'=>'Bilimsel Yaklaşım',       'aciklama'=>'Kanıta dayalı çözümler',     'url'=>'/dsv-projeler'),
        array('ikon'=>'🌍','baslik'=>'Küresel Dayanışma',       'aciklama'=>'150+ ülkede aktif',          'url'=>'/dsv-projeler'),
        array('ikon'=>'🎓','baslik'=>'Eğitim Desteği',          'aciklama'=>'Geleceğin sağlıkçıları',     'url'=>'/dsv-burs'),
        array('ikon'=>'🤝','baslik'=>'WHO Ortaklığı',           'aciklama'=>'Bağımsız destek vakfı',      'url'=>'/dsv-hakkimizda'),
        array('ikon'=>'💙','baslik'=>'Şeffaf Bağış',            'aciklama'=>'Her kuruşun hesabı verilir', 'url'=>'/dsv-bagis'),
    )));

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       2. HAKKIMIZDA
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    $ic['dsv-hakkimizda'] = <<<'HTML'
<div class="dsv-page-icerik" style="font-family:var(--fm,'Open Sans',sans-serif);color:var(--yz,#0c1a2e);max-width:1100px;margin:0 auto;padding:40px 20px">

<section style="margin-bottom:48px">
  <h1 style="font-family:var(--fh);font-size:2rem;font-weight:800;color:var(--cr,#0369a1);margin:0 0 16px">Dünya Sağlık Vakfı Hakkında</h1>
  <div style="width:60px;height:4px;background:var(--cr,#0369a1);margin-bottom:24px;border-radius:2px"></div>
  <p style="font-size:15px;line-height:1.9;margin-bottom:16px">
    Dünya Sağlık Vakfı (DSV), Dünya Sağlık Örgütü'nün (WHO) küresel sağlık misyonunu Türkiye'den desteklemek amacıyla kurulmuş bağımsız bir vakıftır. Cenevre merkezli WHO Vakfı'nın (who.foundation) ilkelerini benimseyen DSV; bireyler, kurumlar ve özel sektör arasında köprü kurarak WHO'nun 150'den fazla ülkedeki programlarına finansman ve teknik destek sağlamaktadır.
  </p>
  <p style="font-size:15px;line-height:1.9;margin-bottom:16px">
    Vakfımız; sağlık hizmetlerine erişimin doğum yerine, gelirine veya sosyal statüsüne bağlı olmaksızın herkese tanınmış bir hak olduğu inancıyla hareket eder. Bu çerçevede önleyici sağlık, acil müdahale, sağlık sistemi güçlendirme ve Tek Sağlık (One Health) yaklaşımı alanlarında projeler yürütmektedir.
  </p>
</section>

<section style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:48px">
  <div style="background:var(--bg2,#e0f2fe);border-left:4px solid var(--cr,#0369a1);padding:28px;border-radius:0 8px 8px 0">
    <h2 style="font-family:var(--fh);font-size:1.2rem;font-weight:700;color:var(--cr,#0369a1);margin:0 0 12px">🎯 Misyonumuz</h2>
    <p style="font-size:13.5px;line-height:1.8;margin:0">
      Dünya Sağlık Örgütü'nün küresel sağlık gündemini Türkiye'de karşılayan bağımsız bir sivil toplum gücü olarak; bağışçılar, gönüllüler ve kurumsal ortaklardan sağlanan kaynaklarla WHO'nun öncelikli programlarını finanse etmek ve toplumun sağlık bilincini kalıcı biçimde yükseltmek.
    </p>
  </div>
  <div style="background:var(--bg2,#e0f2fe);border-left:4px solid var(--altin2,#06B6D4);padding:28px;border-radius:0 8px 8px 0">
    <h2 style="font-family:var(--fh);font-size:1.2rem;font-weight:700;color:var(--altin2,#06B6D4);margin:0 0 12px">🌐 Vizyonumuz</h2>
    <p style="font-size:13.5px;line-height:1.8;margin:0">
      Dünyanın neresinde yaşarsa yaşasın her bireyin kaliteli sağlık hizmetine eşit biçimde erişebildiği, hastalıkların sınır tanımadan yayılmasının önüne geçilebildiği ve sağlığın bir ayrıcalık değil evrensel bir standart hâline geldiği bir dünya.
    </p>
  </div>
</section>

<section style="margin-bottom:48px">
  <h2 style="font-family:var(--fh);font-size:1.4rem;font-weight:700;color:var(--yz,#0c1a2e);margin:0 0 24px">WHO ile İlişkimiz</h2>
  <p style="font-size:14px;line-height:1.9;margin-bottom:16px">
    WHO Vakfı (who.foundation), WHO ile hukuki bağımsızlığını koruyarak çalışan ve özel sektör, filantropistler ve bireylerden kaynak mobilize eden bir kuruluştur. DSV, aynı modeli Türkiye'de hayata geçirmektedir: devlet kaynaklarından bağımsız, ticari çıkarlardan arınmış ve tamamen kamuya hesap verebilir bir yapıda.
  </p>
  <p style="font-size:14px;line-height:1.9;margin-bottom:16px">
    WHO'nun 2024-2025 Sonuçlar Raporu, ortak çalışmaların somut meyvelerini ortaya koymaktadır: temel sağlık hizmetlerine erişimde 431 milyon kişilik artış, sağlık acillerine karşı daha iyi korunan 637 milyon kişi ve tütün kontrolü, hava kalitesi ve temiz su erişimindeki kazanımlar sayesinde daha sağlıklı bir yaşam süren 1,4 milyar insan.
  </p>
  <p style="font-size:14px;line-height:1.9">
    DSV olarak bu başarıların Türkiye boyutundaki katkıcısı olmak, hem ulusal hem de uluslararası ölçekte sağlık eşitsizliklerini azaltmak için çalışmaya devam ediyoruz.
  </p>
</section>

<section style="background:var(--dk,#0c1a2e);color:#fff;padding:32px;border-radius:8px;margin-bottom:48px">
  <h2 style="font-family:var(--fh);font-size:1.3rem;font-weight:700;color:var(--altin2,#06B6D4);margin:0 0 20px">Temel Değerlerimiz</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
    <div><div style="font-size:1.8rem;margin-bottom:8px">🔬</div><strong style="font-size:13px">Bilimsellik</strong><p style="font-size:12px;color:rgba(255,255,255,.6);margin-top:4px;line-height:1.6">Kanıta dayalı sağlık politikaları ve WHO rehberlerine uygun programlar.</p></div>
    <div><div style="font-size:1.8rem;margin-bottom:8px">🤝</div><strong style="font-size:13px">Bağımsızlık</strong><p style="font-size:12px;color:rgba(255,255,255,.6);margin-top:4px;line-height:1.6">Hiçbir hükümet, ticari kuruluş veya siyasi yapıdan bağımsız karar alma.</p></div>
    <div><div style="font-size:1.8rem;margin-bottom:8px">💙</div><strong style="font-size:13px">Şeffaflık</strong><p style="font-size:12px;color:rgba(255,255,255,.6);margin-top:4px;line-height:1.6">Her bağışın nereye gittiğini kamuoyuyla paylaşan açık hesap yapısı.</p></div>
    <div><div style="font-size:1.8rem;margin-bottom:8px">🌍</div><strong style="font-size:13px">Eşitlik</strong><p style="font-size:12px;color:rgba(255,255,255,.6);margin-top:4px;line-height:1.6">Sağlık hizmetlerinde coğrafi, ekonomik ve sosyal eşitsizliklerin giderilmesi.</p></div>
    <div><div style="font-size:1.8rem;margin-bottom:8px">🏃</div><strong style="font-size:13px">Hız</strong><p style="font-size:12px;color:rgba(255,255,255,.6);margin-top:4px;line-height:1.6">Salgın ve afetlerde 24 saat içinde müdahale edebilen hazır yapı.</p></div>
    <div><div style="font-size:1.8rem;margin-bottom:8px">📚</div><strong style="font-size:13px">Eğitim</strong><p style="font-size:12px;color:rgba(255,255,255,.6);margin-top:4px;line-height:1.6">Sağlık okuryazarlığını artırmak için toplum tabanlı eğitim programları.</p></div>
  </div>
</section>

</div>
HTML;

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       3. SAĞLIK HİZMETLERİ
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    $ic['saglik-hizmetleri'] = <<<'HTML'
<div class="dsv-page-icerik" style="font-family:var(--fm,'Open Sans',sans-serif);color:var(--yz,#0c1a2e);max-width:1100px;margin:0 auto;padding:40px 20px">

<h1 style="font-family:var(--fh);font-size:2rem;font-weight:800;color:var(--cr,#0369a1);margin:0 0 8px">Sağlık Hizmetlerimiz</h1>
<div style="width:60px;height:4px;background:var(--cr,#0369a1);margin-bottom:32px;border-radius:2px"></div>

<p style="font-size:15px;line-height:1.9;margin-bottom:32px;max-width:820px">
  WHO verilerine göre dünya nüfusunun yarısı hâlâ temel sağlık hizmetlerine yeterince erişememektedir. Dünya Sağlık Vakfı olarak bu açığı kapatmak için WHO'nun öncelikli programlarını destekliyor, Türkiye'deki toplumu da bu misyonun aktif paydaşı haline getiriyoruz.
</p>

<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin-bottom:40px">

  <div style="background:#fff;border:1px solid var(--sin,#BAE6FD);border-top:4px solid #0369a1;border-radius:8px;padding:28px">
    <div style="font-size:2rem;margin-bottom:12px">💉</div>
    <h2 style="font-family:var(--fh);font-size:1.1rem;font-weight:700;color:#0369a1;margin:0 0 10px">Aşı ve Bağışıklama Kampanyaları</h2>
    <p style="font-size:13.5px;line-height:1.8;color:var(--yz2,#1e3a5f);margin-bottom:12px">
      Çocuk felci, kızamık, sarıhumma ve HPV gibi aşıyla önlenebilir hastalıklara karşı WHO rehberlerine uygun aşılama programlarının finansmanı. 2025 yılına ait WHO Pandemi Anlaşması kapsamında gelecekteki salgınlara karşı aşı eşitliğini destekliyoruz.
    </p>
    <ul style="font-size:13px;color:var(--yz2,#1e3a5f);padding-left:18px;line-height:2">
      <li>Rutin çocuk aşılama programlarına destek</li>
      <li>Düşük gelirli ülkelere aşı ulaştırma</li>
      <li>Soğuk zincir altyapısı güçlendirme</li>
    </ul>
  </div>

  <div style="background:#fff;border:1px solid var(--sin,#BAE6FD);border-top:4px solid #0891b2;border-radius:8px;padding:28px">
    <div style="font-size:2rem;margin-bottom:12px">🦠</div>
    <h2 style="font-family:var(--fh);font-size:1.1rem;font-weight:700;color:#0891b2;margin:0 0 10px">Bulaşıcı Hastalık Kontrolü</h2>
    <p style="font-size:13.5px;line-height:1.8;color:var(--yz2,#1e3a5f);margin-bottom:12px">
      WHO 2024 raporuna göre yedi ülke ihmal edilmiş tropikal hastalıklardan kurtuldu. Sıtma, tüberküloz, HIV ve AMR (antimikrobiyal direnç) ile mücadelede bağışçılardan toplanan fonlar kritik rol oynamaktadır.
    </p>
    <ul style="font-size:13px;color:var(--yz2,#1e3a5f);padding-left:18px;line-height:2">
      <li>Sıtma önleme ve tedavi programları</li>
      <li>Tüberküloz erken tanı desteği</li>
      <li>Antibiyotik direnciyle mücadele (AMR)</li>
    </ul>
  </div>

  <div style="background:#fff;border:1px solid var(--sin,#BAE6FD);border-top:4px solid #7c3aed;border-radius:8px;padding:28px">
    <div style="font-size:2rem;margin-bottom:12px">🧠</div>
    <h2 style="font-family:var(--fh);font-size:1.1rem;font-weight:700;color:#7c3aed;margin:0 0 10px">Ruh Sağlığı ve Bunama</h2>
    <p style="font-size:13.5px;line-height:1.8;color:var(--yz2,#1e3a5f);margin-bottom:12px">
      Dünya genelinde 55 milyondan fazla kişiyi etkileyen bunama, 2040'ta ölüm nedenleri arasında üçüncü sıraya yükselecek. WHO'nun Küresel Bunama Eylem Planı 2031'e kadar uzatıldı. Bu planın finansmanına katkı sağlıyoruz.
    </p>
    <ul style="font-size:13px;color:var(--yz2,#1e3a5f);padding-left:18px;line-height:2">
      <li>Ruh sağlığı farkındalık kampanyaları</li>
      <li>Erken tanı programları</li>
      <li>Bakıcı destek ve eğitim hizmetleri</li>
    </ul>
  </div>

  <div style="background:#fff;border:1px solid var(--sin,#BAE6FD);border-top:4px solid #059669;border-radius:8px;padding:28px">
    <div style="font-size:2rem;margin-bottom:12px">🌡️</div>
    <h2 style="font-family:var(--fh);font-size:1.1rem;font-weight:700;color:#059669;margin:0 0 10px">Bulaşıcı Olmayan Hastalıklar (BOH)</h2>
    <p style="font-size:13.5px;line-height:1.8;color:var(--yz2,#1e3a5f);margin-bottom:12px">
      Kalp hastalıkları, kanser, diyabet ve kronik solunum hastalıkları küresel ölümlerin yüzde yetmişinden sorumludur. WHO'nun BM'de düzenleyeceği 4. Yüksek Düzeyli NCD Toplantısı (2025) süreçlerini Türkiye'de destekliyoruz.
    </p>
    <ul style="font-size:13px;color:var(--yz2,#1e3a5f);padding-left:18px;line-height:2">
      <li>Kalp-damar hastalıkları tarama programları</li>
      <li>Tütün ve sigara bıraktırma desteği</li>
      <li>Diyabet farkındalık ve önleme</li>
    </ul>
  </div>

  <div style="background:#fff;border:1px solid var(--sin,#BAE6FD);border-top:4px solid #d97706;border-radius:8px;padding:28px">
    <div style="font-size:2rem;margin-bottom:12px">🏃</div>
    <h2 style="font-family:var(--fh);font-size:1.1rem;font-weight:700;color:#d97706;margin:0 0 10px">Acil Sağlık Müdahalesi</h2>
    <p style="font-size:13.5px;line-height:1.8;color:var(--yz2,#1e3a5f);margin-bottom:12px">
      WHO Sağlık Acilleri Programı, 24 saat içinde müdahale kapasitesine sahiptir. Gazze, Sudan ve Ukrayna'daki gibi kriz bölgelerinde ilaç, tıbbi malzeme ve uzman desteği sağlıyoruz.
    </p>
    <ul style="font-size:13px;color:var(--yz2,#1e3a5f);padding-left:18px;line-height:2">
      <li>Afet ve çatışma bölgelerine acil ilaç</li>
      <li>Seyyar sağlık kliniği desteği</li>
      <li>Sağlık altyapısı yeniden inşası</li>
    </ul>
  </div>

  <div style="background:#fff;border:1px solid var(--sin,#BAE6FD);border-top:4px solid #0369a1;border-radius:8px;padding:28px">
    <div style="font-size:2rem;margin-bottom:12px">🌿</div>
    <h2 style="font-family:var(--fh);font-size:1.1rem;font-weight:700;color:#0369a1;margin:0 0 10px">Tek Sağlık (One Health) Yaklaşımı</h2>
    <p style="font-size:13.5px;line-height:1.8;color:var(--yz2,#1e3a5f);margin-bottom:12px">
      İnsan, hayvan ve çevre sağlığının birbirine bağlı olduğu Tek Sağlık anlayışı, zoonotik hastalıkların yüzde yetmişinden fazlasının hayvan kaynaklı olduğunu ortaya koymaktadır. Türkiye'nin bu alandaki kurumsal çalışmalarını destekliyoruz.
    </p>
    <ul style="font-size:13px;color:var(--yz2,#1e3a5f);padding-left:18px;line-height:2">
      <li>Zoonotik hastalık gözetimi</li>
      <li>Çevre-sağlık ilişkisi araştırmaları</li>
      <li>Disiplinlerarası eğitim programları</li>
    </ul>
  </div>

</div>

<div style="background:linear-gradient(135deg,var(--cr,#0369a1),#0ea5e9);color:#fff;padding:32px;border-radius:8px;text-align:center">
  <h3 style="font-family:var(--fh);font-size:1.3rem;margin:0 0 10px">Sağlık Hizmetlerimizi Güçlendirin</h3>
  <p style="font-size:14px;opacity:.88;margin:0 0 20px;max-width:500px;margin-left:auto;margin-right:auto">Her bağış, bir çocuğun aşılanmasına, bir annenin güvenli doğum yapmasına ya da bir hastanın ilaca kavuşmasına katkı sağlar.</p>
  <a href="/dsv-bagis" style="display:inline-block;background:#fff;color:var(--cr,#0369a1);font-family:var(--fh);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;padding:12px 32px;text-decoration:none;border-radius:4px">💙 Bağış Yapın</a>
</div>

</div>
HTML;

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       4. PROJELERİMİZ
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    $ic['dsv-projeler'] = <<<'HTML'
<div class="dsv-page-icerik" style="font-family:var(--fm,'Open Sans',sans-serif);color:var(--yz,#0c1a2e);max-width:1100px;margin:0 auto;padding:40px 20px">

<h1 style="font-family:var(--fh);font-size:2rem;font-weight:800;color:var(--cr,#0369a1);margin:0 0 8px">Projelerimiz</h1>
<div style="width:60px;height:4px;background:var(--cr,#0369a1);margin-bottom:24px;border-radius:2px"></div>

<p style="font-size:15px;line-height:1.9;margin-bottom:40px;max-width:820px">
  WHO'nun Onüçüncü Genel Çalışma Programı kapsamında belirlenen öncelikli sağlık alanlarında bağımsız projeler yürütüyoruz. Her proje, bağışçı şeffaflığı ilkesiyle hazırlanır ve sonuçlar kamuoyuyla paylaşılır.
</p>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:40px">

  <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#059669,#10b981);padding:24px;color:#fff">
      <div style="font-size:2.2rem;margin-bottom:8px">🏘️</div>
      <h2 style="font-family:var(--fh);font-size:1.2rem;font-weight:700;margin:0">Köy Sağlık Projeleri</h2>
      <div style="font-size:11px;opacity:.75;margin-top:4px;font-weight:600;letter-spacing:1px">AKTİF PROJE</div>
    </div>
    <div style="padding:24px">
      <p style="font-size:13.5px;line-height:1.8;margin-bottom:14px">Kırsal kesimlerdeki sağlık açığını kapatmak için seyyar klinikler, gezici muayene araçları ve eğitimli köy sağlık elçileri aracılığıyla birinci basamak sağlık hizmetleri sunuyoruz.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span style="background:#dcfce7;color:#166534;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">50+ Köy</span>
        <span style="background:#dcfce7;color:#166534;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">Gezici Klinik</span>
        <span style="background:#dcfce7;color:#166534;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">Ücretsiz Tarama</span>
      </div>
    </div>
  </div>

  <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#0369a1,#0ea5e9);padding:24px;color:#fff">
      <div style="font-size:2.2rem;margin-bottom:8px">🌐</div>
      <h2 style="font-family:var(--fh);font-size:1.2rem;font-weight:700;margin:0">Uluslararası Sağlık Desteği</h2>
      <div style="font-size:11px;opacity:.75;margin-top:4px;font-weight:600;letter-spacing:1px">AKTİF PROJE</div>
    </div>
    <div style="padding:24px">
      <p style="font-size:13.5px;line-height:1.8;margin-bottom:14px">WHO Sağlık Acilleri Programı ortaklığıyla kriz bölgelerine ilaç, tıbbi ekipman ve uzman destek sağlıyoruz. COVID Dayanışma Fonu deneyiminden öğrenerek oluşturduğumuz hızlı müdahale ağı aktif konumdadır.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span style="background:#dbeafe;color:#1e40af;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">15+ Ülke</span>
        <span style="background:#dbeafe;color:#1e40af;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">24s Müdahale</span>
        <span style="background:#dbeafe;color:#1e40af;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">WHO Ortaklığı</span>
      </div>
    </div>
  </div>

  <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:24px;color:#fff">
      <div style="font-size:2.2rem;margin-bottom:8px">♻️</div>
      <h2 style="font-family:var(--fh);font-size:1.2rem;font-weight:700;margin:0">Sürdürülebilir Sağlık Sistemleri</h2>
      <div style="font-size:11px;opacity:.75;margin-top:4px;font-weight:600;letter-spacing:1px">GELİŞTİRME AŞAMASINDA</div>
    </div>
    <div style="padding:24px">
      <p style="font-size:13.5px;line-height:1.8;margin-bottom:14px">Uzun vadeli toplum sağlığı için beslenme eğitimi, hijyen programları, sağlık okuryazarlığı ve iklim değişikliğinin sağlık etkilerine yönelik önleyici projeler yürütüyoruz. Tek Sağlık yaklaşımı bu projenin çekirdeğini oluşturmaktadır.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span style="background:#f3e8ff;color:#6b21a8;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">Önleyici Sağlık</span>
        <span style="background:#f3e8ff;color:#6b21a8;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">Tek Sağlık</span>
        <span style="background:#f3e8ff;color:#6b21a8;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">İklim & Sağlık</span>
      </div>
    </div>
  </div>

  <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:24px;color:#fff">
      <div style="font-size:2.2rem;margin-bottom:8px">🦟</div>
      <h2 style="font-family:var(--fh);font-size:1.2rem;font-weight:700;margin:0">Zoonotik Hastalık Gözetimi</h2>
      <div style="font-size:11px;opacity:.75;margin-top:4px;font-weight:600;letter-spacing:1px">PLANLAMA AŞAMASINDA</div>
    </div>
    <div style="padding:24px">
      <p style="font-size:13.5px;line-height:1.8;margin-bottom:14px">Yeni ortaya çıkan enfeksiyon hastalıklarının yaklaşık yüzde yetmişi hayvan kaynaklıdır. Tek Sağlık çerçevesinde veteriner hekimler, tıp doktorları ve çevre uzmanlarının ortak çalışmasıyla zoonotik riskleri izliyoruz.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">Zoonoz Takibi</span>
        <span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">Multidisipliner</span>
        <span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">Erken Uyarı</span>
      </div>
    </div>
  </div>

</div>

<div style="background:var(--bg2,#e0f2fe);border:1px solid var(--sin,#BAE6FD);border-radius:8px;padding:28px;text-align:center">
  <h3 style="font-family:var(--fh);font-size:1.1rem;color:var(--cr,#0369a1);margin:0 0 10px">Projeye Ortak Olun</h3>
  <p style="font-size:14px;color:var(--yz2,#1e3a5f);margin:0 0 16px">Kurumunuzun ya da bireysel bağışınızın hangi projeye yönlendirileceğini seçebilirsiniz.</p>
  <a href="/dsv-bagis" style="display:inline-block;background:var(--cr,#0369a1);color:#fff;font-family:var(--fh);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;padding:12px 28px;text-decoration:none;border-radius:4px">Projeye Bağış Yap</a>
</div>

</div>
HTML;

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       5. BURS & EĞİTİM
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    $ic['dsv-burs'] = <<<'HTML'
<div class="dsv-page-icerik" style="font-family:var(--fm,'Open Sans',sans-serif);color:var(--yz,#0c1a2e);max-width:1100px;margin:0 auto;padding:40px 20px">

<h1 style="font-family:var(--fh);font-size:2rem;font-weight:800;color:var(--cr,#0369a1);margin:0 0 8px">Burs ve Eğitim Programları</h1>
<div style="width:60px;height:4px;background:var(--cr,#0369a1);margin-bottom:24px;border-radius:2px"></div>

<p style="font-size:15px;line-height:1.9;margin-bottom:32px;max-width:820px">
  Sağlık alanında güçlü bir insan kaynağı olmadan sürdürülebilir sistemler kurulamaz. Dünya Sağlık Vakfı olarak geleceğin sağlık profesyonellerini yetiştirmek için tıp, hemşirelik, halk sağlığı ve sağlık yönetimi alanlarında burs ve eğitim desteği sağlıyoruz.
</p>

<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:40px">
  <div style="background:var(--bg2,#e0f2fe);border-radius:8px;padding:20px;text-align:center">
    <div style="font-family:var(--fh);font-size:2rem;font-weight:800;color:var(--cr,#0369a1)">500+</div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--yz2,#1e3a5f);margin-top:4px">Burslu Öğrenci</div>
  </div>
  <div style="background:var(--bg2,#e0f2fe);border-radius:8px;padding:20px;text-align:center">
    <div style="font-family:var(--fh);font-size:2rem;font-weight:800;color:var(--cr,#0369a1)">%95</div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--yz2,#1e3a5f);margin-top:4px">İstihdam Oranı</div>
  </div>
  <div style="background:var(--bg2,#e0f2fe);border-radius:8px;padding:20px;text-align:center">
    <div style="font-family:var(--fh);font-size:2rem;font-weight:800;color:var(--cr,#0369a1)">28</div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--yz2,#1e3a5f);margin-top:4px">Üniversite Partneri</div>
  </div>
  <div style="background:var(--bg2,#e0f2fe);border-radius:8px;padding:20px;text-align:center">
    <div style="font-family:var(--fh);font-size:2rem;font-weight:800;color:var(--cr,#0369a1)">4</div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--yz2,#1e3a5f);margin-top:4px">Burs Programı</div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:40px">

  <div style="background:#fff;border:1px solid #e5e7eb;border-left:4px solid #0369a1;padding:24px;border-radius:0 8px 8px 0">
    <h2 style="font-family:var(--fh);font-size:1rem;font-weight:700;color:#0369a1;margin:0 0 10px">🩺 Tıp Bursları</h2>
    <p style="font-size:13.5px;line-height:1.8;margin-bottom:12px">Halk sağlığı, epidemiyoloji ve bulaşıcı hastalık uzmanlığı alanlarında öğrenim gören başarılı tıp öğrencilerine yönelik yıllık burs programı.</p>
    <ul style="font-size:13px;padding-left:16px;line-height:2">
      <li>Yıllık 50.000 TL nakdi burs</li>
      <li>WHO staj ve gözlem fırsatı</li>
      <li>Mentorluk desteği</li>
    </ul>
  </div>

  <div style="background:#fff;border:1px solid #e5e7eb;border-left:4px solid #0891b2;padding:24px;border-radius:0 8px 8px 0">
    <h2 style="font-family:var(--fh);font-size:1rem;font-weight:700;color:#0891b2;margin:0 0 10px">🎓 Sağlık Akademisi</h2>
    <p style="font-size:13.5px;line-height:1.8;margin-bottom:12px">WHO eğitim materyalleri ve uzman eğiticilerle hazırlanan halk sağlığı sertifika programları. Sağlık çalışanlarına yönelik uygulamalı beceri eğitimleri.</p>
    <ul style="font-size:13px;padding-left:16px;line-height:2">
      <li>Online ve yüz yüze eğitim</li>
      <li>Akredite sertifika programları</li>
      <li>Sürekli mesleki gelişim desteği</li>
    </ul>
  </div>

  <div style="background:#fff;border:1px solid #e5e7eb;border-left:4px solid #7c3aed;padding:24px;border-radius:0 8px 8px 0">
    <h2 style="font-family:var(--fh);font-size:1rem;font-weight:700;color:#7c3aed;margin:0 0 10px">👩‍⚕️ Hemşire ve Ebe Eğitimi</h2>
    <p style="font-size:13.5px;line-height:1.8;margin-bottom:12px">Doğum güvenliği ve anne-çocuk sağlığı alanında kritik öneme sahip hemşire ve ebelerin güçlendirilmesi için uygulama odaklı eğitim programları.</p>
    <ul style="font-size:13px;padding-left:16px;line-height:2">
      <li>Güvenli doğum uygulamaları</li>
      <li>Yenidoğan bakım eğitimi</li>
      <li>Afet sağlığı simülasyonları</li>
    </ul>
  </div>

  <div style="background:#fff;border:1px solid #e5e7eb;border-left:4px solid #059669;padding:24px;border-radius:0 8px 8px 0">
    <h2 style="font-family:var(--fh);font-size:1rem;font-weight:700;color:#059669;margin:0 0 10px">🌍 Küresel Sağlık Liderliği</h2>
    <p style="font-size:13.5px;line-height:1.8;margin-bottom:12px">Geleceğin küresel sağlık liderlerini yetiştirmek için Cenevre'deki WHO Vakfı programlarıyla bağlantılı uluslararası değişim ve staj olanakları sunuyoruz.</p>
    <ul style="font-size:13px;padding-left:16px;line-height:2">
      <li>WHO Cenevre staj programı</li>
      <li>Uluslararası konferans katılımı</li>
      <li>Küresel sağlık ağına dahil olma</li>
    </ul>
  </div>

</div>

<div style="background:var(--dk,#0c1a2e);color:#fff;padding:32px;border-radius:8px;text-align:center">
  <h3 style="font-family:var(--fh);font-size:1.2rem;margin:0 0 10px">Burs Başvurusu</h3>
  <p style="font-size:14px;color:rgba(255,255,255,.7);margin:0 0 20px">Her yıl Eylül-Ekim aylarında başvurular açılır. Başvuru koşulları için iletişime geçin.</p>
  <a href="/dsv-iletisim" style="display:inline-block;background:var(--altin2,#06B6D4);color:#fff;font-family:var(--fh);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;padding:12px 28px;text-decoration:none;border-radius:4px">Başvuru Bilgisi Al</a>
</div>

</div>
HTML;

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       6. BAĞIŞ SAYFASI
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    $ic['dsv-bagis'] = <<<'HTML'
<div class="dsv-page-icerik" style="font-family:var(--fm,'Open Sans',sans-serif);color:var(--yz,#0c1a2e);max-width:1100px;margin:0 auto;padding:40px 20px">

<h1 style="font-family:var(--fh);font-size:2rem;font-weight:800;color:var(--cr,#0369a1);margin:0 0 8px">Bağış Yapın</h1>
<div style="width:60px;height:4px;background:var(--cr,#0369a1);margin-bottom:24px;border-radius:2px"></div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:48px;align-items:start">
  <div>
    <h2 style="font-family:var(--fh);font-size:1.3rem;color:var(--yz,#0c1a2e);margin:0 0 16px">Bağışınız Ne Sağlar?</h2>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <span style="font-size:1.5rem;flex-shrink:0">💉</span>
        <div><strong style="font-size:13.5px;color:var(--cr,#0369a1)">10 TL</strong><p style="font-size:13px;margin:2px 0 0;color:var(--yz2,#1e3a5f)">Bir çocuk için aşı fırsatı yaratır.</p></div>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-start">
        <span style="font-size:1.5rem;flex-shrink:0">💊</span>
        <div><strong style="font-size:13.5px;color:var(--cr,#0369a1)">50 TL</strong><p style="font-size:13px;margin:2px 0 0;color:var(--yz2,#1e3a5f)">Bir hastanın aylık temel ilaç ihtiyacını karşılar.</p></div>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-start">
        <span style="font-size:1.5rem;flex-shrink:0">🏥</span>
        <div><strong style="font-size:13.5px;color:var(--cr,#0369a1)">250 TL</strong><p style="font-size:13px;margin:2px 0 0;color:var(--yz2,#1e3a5f)">Bir seyyar kliniğin bir günlük yakıt ve malzeme giderini karşılar.</p></div>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-start">
        <span style="font-size:1.5rem;flex-shrink:0">🎓</span>
        <div><strong style="font-size:13.5px;color:var(--cr,#0369a1)">1.000 TL</strong><p style="font-size:13px;margin:2px 0 0;color:var(--yz2,#1e3a5f)">Bir sağlık görevlisinin temel eğitim programına katılımını destekler.</p></div>
      </div>
    </div>

    <div style="margin-top:28px;background:var(--bg2,#e0f2fe);border-radius:8px;padding:20px">
      <h3 style="font-family:var(--fh);font-size:13px;font-weight:700;color:var(--cr,#0369a1);margin:0 0 10px">Banka ile Bağış (IBAN)</h3>
      <p style="font-size:13px;margin:0 0 4px"><strong>Hesap Sahibi:</strong> Dünya Sağlık Vakfı</p>
      <p style="font-size:13px;margin:0 0 4px"><strong>Banka:</strong> Ziraat Bankası</p>
      <p style="font-size:13px;margin:0"><strong>IBAN:</strong> TR49 0001 0012 6298 0865 4750 01</p>
      <p style="font-size:11.5px;color:var(--yz3,#64748b);margin-top:8px">Havale açıklamasına adınızı ve "Bağış" yazmanız yeterlidir.</p>
    </div>
  </div>

  <div style="background:linear-gradient(135deg,var(--dk,#0c1a2e),var(--cr,#0369a1));border-radius:10px;padding:32px;color:#fff;text-align:center">
    <div style="font-size:2.5rem;margin-bottom:12px">💙</div>
    <h2 style="font-family:var(--fh);font-size:1.4rem;font-weight:700;margin:0 0 10px">Güvenli Online Bağış</h2>
    <p style="font-size:13.5px;color:rgba(255,255,255,.75);margin:0 0 24px;line-height:1.7">Stripe güvencesiyle saniyeler içinde bağışınızı yapın. Makbuz e-posta adresinize otomatik iletilir.</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:20px">
      <button type="button" style="padding:8px 18px;border:1px solid rgba(255,255,255,.3);background:transparent;color:rgba(255,255,255,.7);font-size:13px;font-weight:600;cursor:pointer;border-radius:4px">50 TL</button>
      <button type="button" style="padding:8px 18px;border:1px solid white;background:white;color:var(--cr,#0369a1);font-size:13px;font-weight:600;cursor:pointer;border-radius:4px">100 TL</button>
      <button type="button" style="padding:8px 18px;border:1px solid rgba(255,255,255,.3);background:transparent;color:rgba(255,255,255,.7);font-size:13px;font-weight:600;cursor:pointer;border-radius:4px">250 TL</button>
      <button type="button" style="padding:8px 18px;border:1px solid rgba(255,255,255,.3);background:transparent;color:rgba(255,255,255,.7);font-size:13px;font-weight:600;cursor:pointer;border-radius:4px">500 TL</button>
    </div>
    <a href="https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07" target="_blank" rel="noopener"
       style="display:block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-family:var(--fh);font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;padding:15px 20px;text-decoration:none;border-radius:6px;margin-bottom:12px">
      ✅ Güvenli Bağış Yap
    </a>
    <p style="font-size:11px;color:rgba(255,255,255,.4);margin:0">256-bit SSL şifreli · Stripe tarafından güvence altında</p>
  </div>
</div>

<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:24px">
  <h3 style="font-family:var(--fh);font-size:1rem;color:#166534;margin:0 0 12px">🔍 Bağışınız Nereye Gidiyor?</h3>
  <p style="font-size:13.5px;line-height:1.8;color:#1c4532;margin:0">
    Dünya Sağlık Vakfı, WHO Vakfı'nın (who.foundation) şeffaflık standartlarını benimsemektedir. Her yıl yayınladığımız mali raporda toplanan bağışların proje bazında nasıl kullanıldığını kamuoyuyla paylaşıyoruz. Yüzde seksen beşten fazlası doğrudan saha programlarına aktarılmakta, geri kalanı idari ve operasyonel giderlere harcanmaktadır.
  </p>
</div>

</div>
HTML;

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       7. İLETİŞİM — Slider içeriği
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    update_option('vkv_footer_links', array(
        array('baslik'=>'Vakıf', 'linkler'=>array(
            'Hakkımızda'     => '/dsv-hakkimizda',
            'Misyon & Vizyon'=> '/dsv-misyon',
            'Yönetim Kurulu' => '/dsv-yonetim',
            'Tarihçe'        => '/dsv-tarihce',
        )),
        array('baslik'=>'Sağlık Hizmetleri', 'linkler'=>array(
            'Tüm Hizmetler'       => '/saglik-hizmetleri',
            'Sağlık Taramaları'   => '/saglik-taramalari',
            'Psikolojik Destek'   => '/psikolojik-destek',
            'Evde Sağlık'         => '/evde-saglik',
        )),
        array('baslik'=>'Programlar', 'linkler'=>array(
            'Burs & Eğitim'       => '/dsv-burs',
            'Projelerimiz'        => '/dsv-projeler',
            'Haberler'            => '/dsv-haberler',
            'Bağış Yapın'         => '/dsv-bagis',
        )),
    ));

    /* Tüm sayfa içeriklerini vkv_sayfa_icerikleri option'una kaydet */
    $mevcut = get_option('vkv_sayfa_icerikleri', array());
    foreach ($ic as $slug => $icerik) {
        $mevcut[$slug] = $icerik;
    }
    update_option('vkv_sayfa_icerikleri', $mevcut);
}
