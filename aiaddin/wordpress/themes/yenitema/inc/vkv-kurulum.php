<?php
/**
 * VKV — Kurulum Sihirbazı
 * Adım 1: Site tipi seç  →  Adım 2: Sayfaları seç  →  Adım 3: Kur
 */
defined('ABSPATH') || exit;

/* ══════════════════════════════════════════════════════
   1. ŞABLON HARİTASI
══════════════════════════════════════════════════════ */
function vkv_sablon_dosyasi($sablon) {
    if (empty($sablon)) return '';
    $h = array(
        'Ana Sayfa (VKV)'        => 'front-page.php',
        'DSV Hizmetler'          => 'page-dsv-saglik.php',
        'DSV Projeler'           => 'page-dsv-projeler.php',
        'DSV Burs'               => 'page-dsv-burs.php',
        'Hakkımızda'             => 'page-hakkimizda.php',
        'Faaliyetler'            => 'page.faaliyetler.php',
        'Şehitlerimiz'           => 'page-sehitlerimiz.php',
        'Gazilerimiz'            => 'page-gazilerimiz.php',
        'Türk Büyükleri'         => 'page.turk-buyukleri.php',
        'Tarih'                  => 'page.tarih.php',
        'Türk Tarihi'            => 'page.turk-tarihi.php',
        'Askeri Tarih'           => 'page.askeri-tarih.php',
        'Tarihi Olaylar'         => 'page.tarihi-olaylar.php',
        'Canakkale Savasi'       => 'page-canakkale-savasi.php',
        'Kurtulus Savasi'        => 'page-kurtulus-savasi.php',
        'Kore Savasi'            => 'page-kore-savasi.php',
        'Kibris Baris Harekati'  => 'page-kibris-baris-harekati.php',
        'Milli Gunler'           => 'page-milli-gunler.php',
        'Sehit Gazi Haklari'     => 'page-sehit-gazi-haklari.php',
        'Burs'                   => 'page-burs.php',
        'Insani Yardim'          => 'page-insani-yardim.php',
        'Hukuk Savunuculuk'      => 'page-hukuk-savunuculuk.php',
        'Hizmet Bolgesi'         => 'page-hizmet-bolgesi.php',
        'Atatürk'                => 'page.ataturk.php',
        'Atatürk Hayatı'         => 'page-ataturk-hayati.php',
        'Atatürk İlkeleri'       => 'page-ataturk-ilkeler.php',
        'Atatürk Sözleri'        => 'page-ataturk-sozleri.php',
        'Ansiklopedi'            => 'page.ansiklopedi.php',
        'Makaleler'              => 'page.makaleler.php',
        'Haberler'               => 'page-haberler.php',
        'Video Galerisi'         => 'page.video-galerisi.php',
        'Etkinlikler'            => 'page-etkinlikler.php',
        'Foto Galeri'            => 'page.foto-galeri.php',
        'Referanslar'            => 'page.referanslar.php',
        'Firma Rehberi'          => 'page.firma-rehberi.php',
        'Bağış Yapın'            => 'page-bagis.php',
        'İletişim'               => 'page-iletisim.php',
        /* Ek şablonlar */
        'Şehit Gazi Ana Sayfa'   => 'page.sehitgazi.php',
        'Videolar'               => 'page.videolar.php',
        'Genel Başkan'           => 'page.genel-baskan.php',
        'Eserlerimiz'            => 'page.eserlerimiz.php',
        'Türk Dünyası'           => 'page.turk-dunyasi.php',
        'Turk Dunyas'            => 'page.turk-dunyasi.php',
        'Ataturk Kosesi'         => 'page-ataturk-kosesi.php',
        'Kurumlar'               => 'page-kurumlar.php',
        'Isbirligi'              => 'page-isbirligi.php',
        'Sosyal Hizmetler'       => 'page-sosyal-hizmetler.php',
        'DSV Saglik'             => 'page-dsv-saglik.php',
        'Turkiye Sehit Gazi Dernekleri' => 'page-turkiye-sehit-gazi-dernekleri.php',
        'Dunya Sehit Gazi Kuruluslari'  => 'page-dunya-sehit-gazi-kuruluslari.php',
    );
    return isset($h[$sablon]) ? $h[$sablon] : '';
}

/* ══════════════════════════════════════════════════════
   2. SİTE TANIMLARI
   Her site: label, emoji, renk, aciklama, sayfalar[]
   Sayfa: [grup, baslik, slug, sablon, ust_slug, sira, zorunlu?]
══════════════════════════════════════════════════════ */
function vkv_site_tanimlari() {
    /* ── Ortak sayfalar (her sitede kullanılabilir) ── */
    $ortak_temel = array(
        array('Temel',  'Bağış Yapın',          'bagis',                 'Bağış Yapın',         '',                 16, false),
        array('Temel',  'İletişim',              'iletisim',              'İletişim',            '',                 70, false),
        array('Temel',  'Gizlilik Politikası',   'gizlilik-politikasi',   '',                   '',                 80, false),
        array('Temel',  'Kullanım Koşulları',    'kullanim-kosullari',    '',                   '',                 81, false),
    );
    $kahramanlar = array(
        array('Kahramanlar', 'Kahramanlar',             'kahramanlar',              '',               '',             20, false),
        array('Kahramanlar', 'Şehitlerimiz',            'sehitlerimiz',             'Şehitlerimiz',   'kahramanlar',  21, false),
        array('Kahramanlar', 'Gazilerimiz',             'gazilerimiz',              'Gazilerimiz',    'kahramanlar',  22, false),
        array('Kahramanlar', 'Türk Büyükleri',          'turk-buyukleri',           'Türk Büyükleri','kahramanlar',  23, false),
        array('Kahramanlar', 'K.S. Gazileri',           'kurtulus-savasi-gazileri', '',              'kahramanlar',  24, false),
        array('Kahramanlar', 'Kore Gazileri',           'kore-gazileri',            '',              'kahramanlar',  25, false),
        array('Kahramanlar', 'Kıbrıs Gazileri',         'kibris-gazileri',          '',              'kahramanlar',  26, false),
    );
    $tarih = array(
        array('Tarih', 'Tarih',                  'tarih',                 'Tarih',               '',                 30, false),
        array('Tarih', 'Türk Tarihi',            'turk-tarihi',           'Türk Tarihi',         'tarih',            31, false),
        array('Tarih', 'Kurtuluş Savaşı',        'kurtulus-savasi',       'Kurtulus Savasi',     'tarih',            32, false),
        array('Tarih', 'Askeri Tarih',           'askeri-tarih',          'Askeri Tarih',        'tarih',            33, false),
        array('Tarih', 'Tarihi Olaylar',         'tarihi-olaylar',        'Tarihi Olaylar',      'tarih',            34, false),
        array('Tarih', 'Çanakkale',              'canakkale-savasi',      'Canakkale Savasi',    'tarih',            35, false),
        array('Tarih', 'Kore Savaşı',            'kore-savasi',           'Kore Savasi',         'tarih',            36, false),
        array('Tarih', 'Kıbrıs Barış Harekâtı', 'kibris-baris-harekati', 'Kibris Baris Harekati','tarih',           37, false),
        array('Tarih', 'Millî Günler',           'milli-gunler',          'Milli Gunler',        '',                 38, false),
    );
    $sosyal = array(
        array('Sosyal Hizmetler', 'Sosyal Hizmetler',   'sosyal-hizmetler',  '',                   '',                 40, false),
        array('Sosyal Hizmetler', 'Şehit & Gazi Hakları','sehit-gazi-haklari','Sehit Gazi Haklari','sosyal-hizmetler',41, false),
        array('Sosyal Hizmetler', 'Burs Programı',      'burs',              'Burs',               'sosyal-hizmetler', 42, false),
        array('Sosyal Hizmetler', 'İnsani Yardım',      'insani-yardim',     'Insani Yardim',      'sosyal-hizmetler', 43, false),
        array('Sosyal Hizmetler', 'Hukuk & Savunuculuk','hukuk-savunuculuk', 'Hukuk Savunuculuk',  'sosyal-hizmetler', 44, false),
        array('Sosyal Hizmetler', 'Hizmet Bölgeleri',   'hizmet-bolgesi',    'Hizmet Bolgesi',     'sosyal-hizmetler', 45, false),
    );
    $ataturk = array(
        array('Atatürk', 'Atatürk',            'ataturk',          'Atatürk',           '',         50, false),
        array('Atatürk', 'Atatürk Hayatı',     'ataturk-hayati',   'Atatürk Hayatı',    'ataturk',  51, false),
        array('Atatürk', 'Atatürk İlkeleri',   'ataturk-ilkeler',  'Atatürk İlkeleri',  'ataturk',  52, false),
        array('Atatürk', 'Atatürk Sözleri',    'ataturk-sozleri',  'Atatürk Sözleri',   'ataturk',  53, false),
    );
    $icerik = array(
        array('İçerik', 'Ansiklopedi',     'ansiklopedi',    'Ansiklopedi',    '', 59, false),
        array('İçerik', 'Makaleler',       'makaleler',      'Makaleler',      '', 60, false),
        array('İçerik', 'Haberler',        'haberler',       'Haberler',       '', 61, false),
        array('İçerik', 'Video Galerisi',  'video-galerisi', 'Video Galerisi', '', 62, false),
        array('İçerik', 'Etkinlikler',     'etkinlikler',    'Etkinlikler',    '', 63, false),
        array('İçerik', 'Foto Galeri',     'foto-galeri',    'Foto Galeri',    '', 64, false),
        array('İçerik', 'Referanslar',     'referanslar',    'Referanslar',    '', 65, false),
        array('İçerik', 'Firma Rehberi',   'firma-rehberi',  'Firma Rehberi',  '', 66, false),
    );

    /* ── Vakıf bölümü ── */
    $vakif_bol = array(
        array('Vakıf', 'Vakıf',           'vakif',          '',            '',       10, false),
        array('Vakıf', 'Hakkımızda',      'hakkimizda',     'Hakkımızda',  'vakif',  11, false),
        array('Vakıf', 'Tarihçe',         'tarihce',        '',            'vakif',  12, false),
        array('Vakıf', 'Yönetim Kurulu',  'yonetim-kurulu', '',            'vakif',  13, false),
        array('Vakıf', 'Misyon & Vizyon', 'misyon-vizyon',  '',            'vakif',  14, false),
        array('Vakıf', 'Faaliyetler',     'faaliyetler',    'Faaliyetler', 'vakif',  15, false),
    );
    /* ── Dernek bölümü ── */
    $dernek_bol = array(
        array('Dernek', 'Dernek',          'dernek',         '',            '',        10, false),
        array('Dernek', 'Hakkımızda',      'hakkimizda',     'Hakkımızda',  'dernek',  11, false),
        array('Dernek', 'Tarihçe',         'tarihce',        '',            'dernek',  12, false),
        array('Dernek', 'Yönetim Kurulu',  'yonetim-kurulu', '',            'dernek',  13, false),
        array('Dernek', 'Misyon & Vizyon', 'misyon-vizyon',  '',            'dernek',  14, false),
        array('Dernek', 'Faaliyetler',     'faaliyetler',    'Faaliyetler', 'dernek',  15, false),
    );
    /* ── TUKAV bölümü ── */
    $tukav_bol = array(
        array('Vakıf', 'Vakıf',           'vakif',          '',            '',       10, false),
        array('Vakıf', 'Hakkımızda',      'hakkimizda',     'Hakkımızda',  'vakif',  11, false),
        array('Vakıf', 'Tarihçe',         'tarihce',        '',            'vakif',  12, false),
        array('Vakıf', 'Yönetim Kurulu',  'yonetim-kurulu', '',            'vakif',  13, false),
        array('Vakıf', 'Misyon & Vizyon', 'misyon-vizyon',  '',            'vakif',  14, false),
        array('Vakıf', 'Faaliyetler',     'faaliyetler',    'Faaliyetler', 'vakif',  15, false),
        array('İçerik','Makaleler',       'makaleler',      'Makaleler',   '',       60, false),
        array('İçerik','Ansiklopedi',     'ansiklopedi',    'Ansiklopedi', '',       59, false),
    );

    /* ── Dünya Sağlık Vakfı bölümü (dunyasaglik.org) ── */
    $dsv_vakif = array(
        array('Vakıf',           'Vakıf',              'dsv-vakif',          '',               '',                5,  false),
        array('Vakıf',           'Hakkımızda',         'dsv-hakkimizda',     'Hakkımızda',     'dsv-vakif',       6,  false),
        array('Vakıf',           'Tarihçe',            'dsv-tarihce',        '',               'dsv-vakif',       7,  false),
        array('Vakıf',           'Yönetim Kurulu',     'dsv-yonetim',        '',               'dsv-vakif',       8,  false),
        array('Vakıf',           'Misyon & Vizyon',    'dsv-misyon',         '',               'dsv-vakif',       9,  false),
    );
    $dsv_saglik = array(
        array('Sağlık Hizmetleri','Sağlık Hizmetleri', 'saglik-hizmetleri',  'DSV Hizmetler',  '',                20, false),
        array('Sağlık Hizmetleri','Ücretsiz Muayene',  'ucretsiz-muayene',   '',               'saglik-hizmetleri',21,false),
        array('Sağlık Hizmetleri','Sağlık Taramaları', 'saglik-taramalari',  '',               'saglik-hizmetleri',22,false),
        array('Sağlık Hizmetleri','Psikolojik Destek', 'psikolojik-destek',  '',               'saglik-hizmetleri',23,false),
        array('Sağlık Hizmetleri','Evde Sağlık',       'evde-saglik',        '',               'saglik-hizmetleri',24,false),
        array('Sağlık Hizmetleri','Diş Sağlığı',       'dis-sagligi',        '',               'saglik-hizmetleri',25,false),
        array('Sağlık Hizmetleri','Göz Taraması',      'goz-taramasi',       '',               'saglik-hizmetleri',26,false),
    );
    $dsv_projeler = array(
        array('Projeler',        'Projeler',            'dsv-projeler',       'DSV Projeler',   '',                30, false),
        array('Projeler',        'Köy Sağlık Projeleri','koy-saglik',         '',               'dsv-projeler',    31, false),
        array('Projeler',        'Uluslararası Projeler','uluslararasi',       '',               'dsv-projeler',    32, false),
        array('Projeler',        'Sürdürülebilir Sağlık','surdurulebilir',     '',               'dsv-projeler',    33, false),
    );
    $dsv_burs = array(
        array('Burs & Eğitim',   'Burs & Eğitim',       'dsv-burs',           'DSV Burs',       '',                40, false),
        array('Burs & Eğitim',   'Tıp Bursları',        'tip-burslari',       '',               'dsv-burs',        41, false),
        array('Burs & Eğitim',   'Sağlık Akademisi',    'saglik-akademisi',   '',               'dsv-burs',        42, false),
        array('Burs & Eğitim',   'Hemşire & Ebe Eğitimi','hemsire-ebe',       '',               'dsv-burs',        43, false),
    );
    $dsv_genel = array(
        array('Genel',           'Makaleler',           'makaleler',          'Makaleler',      '',                48, false),
        array('Genel',           'Haberler',            'dsv-haberler',       'Haberler',       '',                50, false),
        array('Genel',           'Etkinlikler',         'dsv-etkinlikler',    'Etkinlikler',    '',                51, false),
        array('Genel',           'Bağış Yapın',         'dsv-bagis',          'Bağış Yapın',    '',                52, false),
        array('Genel',           'İletişim',            'dsv-iletisim',       'İletişim',       '',                60, false),
        array('Genel',           'Gizlilik Politikası', 'dsv-gizlilik',       '',               '',                70, false),
    );

    return array(
        'vakif' => array(
            'label'    => 'Vatan Kahramanları Vakfı',
            'emoji'    => '🏛️',
            'renk'     => '#8B1A1A',
            'aciklama' => 'VKV — Vakıf yapısı, şehit/gazi odaklı',
            'sayfalar' => array_merge($vakif_bol, $ortak_temel, $kahramanlar, $tarih, $sosyal, $ataturk, $icerik),
            'menu'     => array(
                array('VAKIF','/vakif',null),
                array('Hakkımızda','/hakkimizda',0), array('Tarihçe','/tarihce',0),
                array('Yönetim Kurulu','/yonetim-kurulu',0), array('Faaliyetler','/faaliyetler',0), array('Bağış','/bagis',0),
                array('KAHRAMANLAR','/kahramanlar',null),
                array('Şehitlerimiz','/sehitlerimiz',6), array('Gazilerimiz','/gazilerimiz',6),
                array('Türk Büyükleri','/turk-buyukleri',6), array('K.S. Gazileri','/kurtulus-savasi-gazileri',6),
                array('TARİH','/tarih',null),
                array('Türk Tarihi','/turk-tarihi',11), array('Kurtuluş Savaşı','/kurtulus-savasi',11),
                array('Çanakkale','/canakkale-savasi',11), array('Millî Günler','/milli-gunler',11),
                array('SOSYAL HİZMETLER','/sosyal-hizmetler',null),
                array('Şehit-Gazi Hakları','/sehit-gazi-haklari',16), array('Burs Programı','/burs',16),
                array('ATATÜRK','/ataturk',null),
                array('Hayatı','/ataturk-hayati',19), array('İlkeleri','/ataturk-ilkeler',19),
                array('HABERLER','/haberler',null), array('İLETİŞİM','/iletisim',null),
            ),
        ),
        'tukav' => array(
            'label'    => 'Türkata Vakfı (TÜKAV)',
            'emoji'    => '📚',
            'renk'     => '#0D7377',
            'aciklama' => 'TÜKAV — Makaleler, Ansiklopedi, Kültür odaklı',
            'sayfalar' => array_merge($tukav_bol, $ortak_temel, $ataturk, $icerik),
            'menu'     => array(
                array('VAKIF','/vakif',null),
                array('Hakkımızda','/hakkimizda',0), array('Faaliyetler','/faaliyetler',0),
                array('MAKALELER','/makaleler',null),
                array('ANSİKLOPEDİ','/ansiklopedi',null),
                array('ATATÜRK','/ataturk',null),
                array('Hayatı','/ataturk-hayati',5), array('İlkeleri','/ataturk-ilkeler',5),
                array('HABERLER','/haberler',null), array('İLETİŞİM','/iletisim',null),
            ),
        ),
        'dernek' => array(
            'label'    => 'Vatan Kahramanları Derneği',
            'emoji'    => '🛡️',
            'renk'     => '#8B1A1A',
            'aciklama' => 'VKD — Dernek yapısı (vatankahramanlari.org.tr)',
            'sayfalar' => array_merge($dernek_bol, $ortak_temel, $kahramanlar, $tarih, $sosyal, $ataturk, $icerik),
            'menu'     => array(
                array('DERNEK','/dernek',null),
                array('Hakkımızda','/hakkimizda',0), array('Tarihçe','/tarihce',0),
                array('Yönetim Kurulu','/yonetim-kurulu',0), array('Faaliyetler','/faaliyetler',0), array('Bağış','/bagis',0),
                array('KAHRAMANLAR','/kahramanlar',null),
                array('Şehitlerimiz','/sehitlerimiz',6), array('Gazilerimiz','/gazilerimiz',6),
                array('Türk Büyükleri','/turk-buyukleri',6),
                array('TARİH','/tarih',null),
                array('Türk Tarihi','/turk-tarihi',10), array('Kurtuluş Savaşı','/kurtulus-savasi',10),
                array('Çanakkale','/canakkale-savasi',10), array('Millî Günler','/milli-gunler',10),
                array('SOSYAL HİZMETLER','/sosyal-hizmetler',null),
                array('Şehit-Gazi Hakları','/sehit-gazi-haklari',14), array('Burs Programı','/burs',14),
                array('ATATÜRK','/ataturk',null),
                array('Hayatı','/ataturk-hayati',17), array('İlkeleri','/ataturk-ilkeler',17),
                array('HABERLER','/haberler',null), array('İLETİŞİM','/iletisim',null),
            ),
        ),
        'dsv' => array(
            'label'    => 'Dünya Sağlık Vakfı',
            'emoji'    => '🏥',
            'renk'     => '#0369a1',
            'aciklama' => 'DSV — Sağlık hizmetleri, burs, projeler (dunyasaglik.org)',
            'sayfalar' => array_merge($dsv_vakif, $dsv_saglik, $dsv_projeler, $dsv_burs, $dsv_genel),
            'menu'     => array(
                array('VAKIF','/dsv-vakif',null),
                array('Hakkımızda','/dsv-hakkimizda',0), array('Tarihçe','/dsv-tarihce',0),
                array('Yönetim Kurulu','/dsv-yonetim',0),
                array('SAĞLIK HİZMETLERİ','/saglik-hizmetleri',null),
                array('Ücretsiz Muayene','/ucretsiz-muayene',4), array('Sağlık Taramaları','/saglik-taramalari',4),
                array('Psikolojik Destek','/psikolojik-destek',4), array('Evde Sağlık','/evde-saglik',4),
                array('Diş Sağlığı','/dis-sagligi',4), array('Göz Taraması','/goz-taramasi',4),
                array('PROJELER','/dsv-projeler',null),
                array('Köy Sağlık','/koy-saglik',9), array('Uluslararası','/uluslararasi',9),
                array('BURS & EĞİTİM','/dsv-burs',null),
                array('Tıp Bursları','/tip-burslari',12), array('Sağlık Akademisi','/saglik-akademisi',12),
                array('MAKALELERi','/makaleler',null),
                array('HABERLER','/dsv-haberler',null),
                array('BAĞIŞ','/dsv-bagis',null),
                array('İLETİŞİM','/dsv-iletisim',null),
            ),
        ),
    );
}

/* ══════════════════════════════════════════════════════
   2b. SİTE MARKA & RENK UYGULAMA
   Wizard kurulumu tamamlanınca site tipine göre
   logo adı, tagline ve renk paletini otomatik ayarlar.
══════════════════════════════════════════════════════ */
function vkv_site_marka_uygula($site_tipi) {
    $markalar = array(
        'vakif' => array(
            'logo_name' => 'Vatan Kahramanları Vakfı',
            'logo_tag'  => 'VATANI İÇİN ÖDEYEN KAHRAMANLAR',
            'renkler'   => array(
                'birincil'=>'#8B1A1A','ikincil'=>'#6B1010','ucuncul'=>'#C53030',
                'altin'=>'#B45309','altin2'=>'#D97706',
                'koyu'=>'#0D0B0B','koyu2'=>'#1A1210',
                'arka'=>'#FFF8F5','arka2'=>'#FEF0EC',
                'sinir'=>'#FECACA','yazi'=>'#1C1010','yazi2'=>'#4B3030',
            ),
            'bagis_text' => '🛡️ Destek Ol',
            'bottom_nav' => array(
                array('ikon'=>'&#127968;', 'etiket'=>'Ana Sayfa',  'url'=>'/',            'bagis'=>false),
                array('ikon'=>'&#127755;', 'etiket'=>'Kahramanlar','url'=>'/kahramanlar', 'bagis'=>false),
                array('ikon'=>'&#10084;',  'etiket'=>'Bağış Yap',  'url'=>'/bagis',       'bagis'=>true),
                array('ikon'=>'&#128240;', 'etiket'=>'Haberler',   'url'=>'/haberler',    'bagis'=>false),
                array('ikon'=>'&#128231;', 'etiket'=>'İletişim',   'url'=>'/iletisim',    'bagis'=>false),
            ),
        ),
        'tukav' => array(
            'logo_name' => 'TÜKAV',
            'logo_tag'  => 'TÜRK KÜLTÜRÜNÜ ARAŞTIRMA VE TANITMA',
            'renkler'   => array(
                'birincil'=>'#0D7377','ikincil'=>'#0A5A5D','ucuncul'=>'#14BDCA',
                'altin'=>'#B45309','altin2'=>'#D97706',
                'koyu'=>'#0A1416','koyu2'=>'#0F2224',
                'arka'=>'#F0FDFD','arka2'=>'#E6FAFA',
                'sinir'=>'#CCFBF1','yazi'=>'#0A1416','yazi2'=>'#1A3A3C',
            ),
            'bagis_text' => '❤ Bağış Yapın',
            'bottom_nav' => array(
                array('ikon'=>'&#127968;', 'etiket'=>'Ana Sayfa',  'url'=>'/',            'bagis'=>false),
                array('ikon'=>'&#128218;', 'etiket'=>'Makaleler',  'url'=>'/makaleler',   'bagis'=>false),
                array('ikon'=>'&#10084;',  'etiket'=>'Bağış Yap',  'url'=>'/bagis',       'bagis'=>true),
                array('ikon'=>'&#128240;', 'etiket'=>'Haberler',   'url'=>'/haberler',    'bagis'=>false),
                array('ikon'=>'&#128231;', 'etiket'=>'İletişim',   'url'=>'/iletisim',    'bagis'=>false),
            ),
        ),
        /* dernek = Vatan Kahramanları Derneği (sehitgazi.org.tr) */
        'dernek' => array(
            'logo_name' => 'Vatan Kahramanları Derneği',
            'logo_tag'  => 'ŞEHİTLERİMİZ YAŞIYOR',
            'renkler'   => array(
                'birincil'=>'#7B1213','ikincil'=>'#5C0B0C','ucuncul'=>'#B91C1C',
                'altin'=>'#92400E','altin2'=>'#B45309',
                'koyu'=>'#0D0B0B','koyu2'=>'#1A1210',
                'arka'=>'#FFF5F5','arka2'=>'#FEECEC',
                'sinir'=>'#FECACA','yazi'=>'#1C1010','yazi2'=>'#4B2020',
            ),
            'bagis_text' => '🛡️ Destek Ol',
            'bottom_nav' => array(
                array('ikon'=>'&#127968;', 'etiket'=>'Ana Sayfa',  'url'=>'/',              'bagis'=>false),
                array('ikon'=>'&#127963;', 'etiket'=>'Atatürk',    'url'=>'/ataturk',       'bagis'=>false),
                array('ikon'=>'&#10084;',  'etiket'=>'Bağış',      'url'=>'/bagis',         'bagis'=>true),
                array('ikon'=>'&#128197;', 'etiket'=>'Faaliyetler','url'=>'/faaliyetler',   'bagis'=>false),
                array('ikon'=>'&#128231;', 'etiket'=>'İletişim',   'url'=>'/iletisim',      'bagis'=>false),
            ),
        ),
        /* vkd = alias — dernek ile aynı */
        'vkd' => array(
            'logo_name' => 'Vatan Kahramanları Derneği',
            'logo_tag'  => 'ŞEHİTLERİMİZ YAŞIYOR',
            'renkler'   => array(
                'birincil'=>'#7B1213','ikincil'=>'#5C0B0C','ucuncul'=>'#B91C1C',
                'altin'=>'#92400E','altin2'=>'#B45309',
                'koyu'=>'#0D0B0B','koyu2'=>'#1A1210',
                'arka'=>'#FFF5F5','arka2'=>'#FEECEC',
                'sinir'=>'#FECACA','yazi'=>'#1C1010','yazi2'=>'#4B2020',
            ),
            'bagis_text' => '🛡️ Destek Ol',
            'bottom_nav' => array(
                array('ikon'=>'&#127968;', 'etiket'=>'Ana Sayfa',  'url'=>'/',              'bagis'=>false),
                array('ikon'=>'&#127963;', 'etiket'=>'Atatürk',    'url'=>'/ataturk',       'bagis'=>false),
                array('ikon'=>'&#10084;',  'etiket'=>'Bağış',      'url'=>'/bagis',         'bagis'=>true),
                array('ikon'=>'&#128197;', 'etiket'=>'Faaliyetler','url'=>'/faaliyetler',   'bagis'=>false),
                array('ikon'=>'&#128231;', 'etiket'=>'İletişim',   'url'=>'/iletisim',      'bagis'=>false),
            ),
        ),
        'dsv' => array(
            'logo_name' => 'Dünya Sağlık Vakfı',
            'logo_tag'  => 'SAĞLIKLI BİR DÜNYA İÇİN',
            'renkler'   => array(
                'birincil'=>'#0369A1','ikincil'=>'#075985','ucuncul'=>'#0EA5E9',
                'altin'=>'#0891B2','altin2'=>'#06B6D4',
                'koyu'=>'#0C1A2E','koyu2'=>'#0F2040',
                'arka'=>'#F0F9FF','arka2'=>'#E0F2FE',
                'sinir'=>'#BAE6FD','yazi'=>'#0C1A2E','yazi2'=>'#1E3A5F',
            ),
            'bagis_text' => '💙 Bağış Yapın',
            'bottom_nav' => array(
                array('ikon'=>'&#127968;', 'etiket'=>'Ana Sayfa','url'=>'/',                     'bagis'=>false),
                array('ikon'=>'&#127973;', 'etiket'=>'Sağlık',   'url'=>'/saglik-hizmetleri',    'bagis'=>false),
                array('ikon'=>'&#10084;',  'etiket'=>'Bağış Yap','url'=>'/dsv-bagis',            'bagis'=>true),
                array('ikon'=>'&#128240;', 'etiket'=>'Haberler', 'url'=>'/dsv-haberler',         'bagis'=>false),
                array('ikon'=>'&#128231;', 'etiket'=>'İletişim', 'url'=>'/dsv-iletisim',         'bagis'=>false),
            ),
        ),
    );

    if (!isset($markalar[$site_tipi])) return;
    $m = $markalar[$site_tipi];

    set_theme_mod('vkv_logo_name', $m['logo_name']);
    set_theme_mod('vkv_logo_tag',  $m['logo_tag']);
    if (!empty($m['bagis_text'])) set_theme_mod('vkv_bagis_text', $m['bagis_text']);

    // Renkleri vkvsy_renkler option'una kaydet (sayfa yönetici + header uyumlu)
    update_option('vkvsy_renkler', $m['renkler']);

    // Admin panel renk alanları için theme_mod da ayarla
    set_theme_mod('vkv_cr',   $m['renkler']['birincil']);
    set_theme_mod('vkv_cr2',  $m['renkler']['ikincil']);
    set_theme_mod('vkv_cr3',  $m['renkler']['ucuncul']);
    set_theme_mod('vkv_altin',$m['renkler']['altin']);

    // Site tipini kaydet (footer ve front-page için)
    update_option('vkv_site_tipi', $site_tipi);

    // Mobil alt navbar öğelerini kaydet
    if (!empty($m['bottom_nav'])) {
        update_option('vkv_bottom_nav_items', $m['bottom_nav']);
    }
}

/* ══════════════════════════════════════════════════════
   3. SEÇİLİ SAYFALARI OLUŞTUR
══════════════════════════════════════════════════════ */
function vkv_sayfalari_olustur_secili($site_tipi, $secili_sluglar) {
    $siteler  = vkv_site_tanimlari();
    if (!isset($siteler[$site_tipi])) return array();

    $tum_sayfalar = $siteler[$site_tipi]['sayfalar'];
    $sonuclar     = array();
    $slug_id      = array();

    /* Mevcut sayfaların slug→ID haritası */
    $mevcut = get_posts(array('post_type'=>'page','post_status'=>array('publish','draft'),'numberposts'=>-1,'fields'=>'ids'));
    foreach ($mevcut as $pid) {
        $slug_id[get_post_field('post_name',$pid)] = $pid;
    }

    /* Sadece seçili sayfaları işle */
    foreach ($tum_sayfalar as $s) {
        list($grup, $baslik, $slug, $sablon, $ust_slug, $sira) = $s;

        if ($slug === '') {
            // Ana sayfa ayrı işleniyor
            $sonuclar[] = array('baslik'=>$baslik,'slug'=>'(ana-sayfa)','durum'=>'atlandı','mesaj'=>'Ana sayfa ayrıca ayarlanıyor.');
            continue;
        }

        if (!in_array($slug, $secili_sluglar)) continue;

        /* Üst sayfanın ID'sini bul */
        $ust_id = 0;
        if ($ust_slug && isset($slug_id[$ust_slug])) {
            $ust_id = $slug_id[$ust_slug];
        }

        $template_file = vkv_sablon_dosyasi($sablon);

        if (isset($slug_id[$slug])) {
            $pid = $slug_id[$slug];
            wp_update_post(array('ID'=>$pid,'post_parent'=>$ust_id,'menu_order'=>$sira));
            if ($template_file) update_post_meta($pid,'_wp_page_template',$template_file);
            $sonuclar[] = array('baslik'=>$baslik,'slug'=>$slug,'durum'=>'güncellendi','mesaj'=>'Mevcut sayfa güncellendi.');
        } else {
            $pid = wp_insert_post(array(
                'post_title'  => $baslik,
                'post_name'   => $slug,
                'post_status' => 'publish',
                'post_type'   => 'page',
                'post_parent' => $ust_id,
                'menu_order'  => $sira,
            ));
            if (is_wp_error($pid)) {
                $sonuclar[] = array('baslik'=>$baslik,'slug'=>$slug,'durum'=>'hata','mesaj'=>$pid->get_error_message());
                continue;
            }
            if ($template_file) update_post_meta($pid,'_wp_page_template',$template_file);
            $slug_id[$slug] = $pid;
            $sonuclar[] = array('baslik'=>$baslik,'slug'=>$slug,'durum'=>'oluşturuldu','mesaj'=>'Yeni sayfa oluşturuldu. ID: '.$pid);
        }
    }
    return $sonuclar;
}

/* ══════════════════════════════════════════════════════
   4. MENÜ OLUŞTURUCU
══════════════════════════════════════════════════════ */
function vkv_menu_olustur($site_tipi = 'vakif') {
    $siteler  = vkv_site_tanimlari();
    $yapi     = isset($siteler[$site_tipi]['menu']) ? $siteler[$site_tipi]['menu'] : array();
    if (empty($yapi)) return array('hata'=>'Bu site tipi için menü tanımı yok.');

    /* Site tipine göre menü adı — çakışma önleme */
    $menu_adi_map = array(
        'vakif'  => 'VKV Ana Menü',
        'dernek' => 'VKD Ana Menü',
        'tukav'  => 'TUKAV Ana Menü',
        'dsv'    => 'DSV Ana Menü',
    );
    $menu_adi = isset($menu_adi_map[$site_tipi]) ? $menu_adi_map[$site_tipi] : 'DERVAK Ana Menü';

    $mevcut   = wp_get_nav_menu_object($menu_adi);
    if ($mevcut) wp_delete_nav_menu($mevcut->term_id);

    $menu_id = wp_create_nav_menu($menu_adi);
    if (is_wp_error($menu_id)) return array('hata'=>$menu_id->get_error_message());

    $id_map = array();
    foreach ($yapi as $idx => $item) {
        list($baslik, $url, $parent_idx) = $item;
        $parent_id = ($parent_idx !== null && isset($id_map[$parent_idx])) ? $id_map[$parent_idx] : 0;
        $item_id = wp_update_nav_menu_item($menu_id, 0, array(
            'menu-item-title'     => $baslik,
            'menu-item-url'       => ($url === '#') ? '#' : home_url($url),
            'menu-item-status'    => 'publish',
            'menu-item-parent-id' => $parent_id,
            'menu-item-position'  => $idx + 1,
        ));
        if (!is_wp_error($item_id)) $id_map[$idx] = $item_id;
    }

    $locs = get_theme_mod('nav_menu_locations', array());
    $locs['primary'] = $menu_id;
    set_theme_mod('nav_menu_locations', $locs);
    return array('basari'=>true,'menu_id'=>$menu_id,'sayi'=>count($id_map));
}

/* ══════════════════════════════════════════════════════
   5. ANA SAYFA AYARI
══════════════════════════════════════════════════════ */
function vkv_anasayfa_ayarla() {
    $sayfa = get_page_by_path('ana-sayfa');
    if (!$sayfa) {
        $pages = get_posts(array('post_type'=>'page','post_status'=>'publish','title'=>'Ana Sayfa','numberposts'=>1));
        $sayfa = !empty($pages) ? $pages[0] : null;
    }
    if (!$sayfa) {
        $pid = wp_insert_post(array('post_title'=>'Ana Sayfa','post_name'=>'ana-sayfa','post_status'=>'publish','post_type'=>'page'));
        if (!is_wp_error($pid)) {
            update_post_meta($pid,'_wp_page_template','front-page.php');
            $sayfa = get_post($pid);
        }
    }
    if ($sayfa) {
        update_option('show_on_front','page');
        update_option('page_on_front',$sayfa->ID);
        update_post_meta($sayfa->ID,'_wp_page_template','front-page.php');
        return array('basari'=>true,'id'=>$sayfa->ID);
    }
    return array('hata'=>'Ana sayfa oluşturulamadı.');
}

/* ══════════════════════════════════════════════════════
   6. AJAX — SEÇİLİ SAYFALARI KUR
══════════════════════════════════════════════════════ */
add_action('wp_ajax_vkv_kur_secili', function() {
    check_ajax_referer('vkv_kurulum_nonce','nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Yetkisiz.');

    $site_tipi    = sanitize_text_field($_POST['site_tipi'] ?? 'vakif');
    $secili_raw   = $_POST['sluglar'] ?? array();
    $secili_sluglar = array_map('sanitize_title', (array) $secili_raw);
    $kur_anasayfa = !empty($_POST['kur_anasayfa']);
    $kur_menu     = !empty($_POST['kur_menu']);

    $ana_sonu   = null;
    $sayfa_sonu = array();
    $menu_sonu  = null;

    if ($kur_anasayfa) $ana_sonu = vkv_anasayfa_ayarla();
    if (!empty($secili_sluglar)) $sayfa_sonu = vkv_sayfalari_olustur_secili($site_tipi, $secili_sluglar);
    if ($kur_menu) $menu_sonu = vkv_menu_olustur($site_tipi);

    /* ── Site tipine göre marka ve renk uygula ── */
    vkv_site_marka_uygula($site_tipi);

    $yeni_c  = count(array_filter($sayfa_sonu, function($r){return $r['durum']==='oluşturuldu';}));
    $gunc_c  = count(array_filter($sayfa_sonu, function($r){return $r['durum']==='güncellendi';}));
    $hata_c  = count(array_filter($sayfa_sonu, function($r){return $r['durum']==='hata';}));

    wp_send_json_success(array(
        'sayfa_sonu'  => $sayfa_sonu,
        'ana_sonu'    => $ana_sonu,
        'menu_sonu'   => $menu_sonu,
        'yeni_c'      => $yeni_c,
        'gunc_c'      => $gunc_c,
        'hata_c'      => $hata_c,
    ));
});

/* ══════════════════════════════════════════════════════
   7. MEVCUT SAYFA DURUMU
══════════════════════════════════════════════════════ */
function vkv_durum_kontrol() {
    $mevcut_wp = get_posts(array('post_type'=>'page','post_status'=>array('publish','draft'),'numberposts'=>-1));
    $durum = array();
    foreach ($mevcut_wp as $p) {
        $durum[$p->post_name] = array(
            'baslik' => $p->post_title,
            'id'     => $p->ID,
            'sablon' => get_post_meta($p->ID,'_wp_page_template',true),
        );
    }
    return $durum;
}

/* ══════════════════════════════════════════════════════
   8. ADMİN MENÜSÜ
══════════════════════════════════════════════════════ */
add_action('admin_menu', function() {
    add_menu_page('DERVAK Kurulum','🛡️ DERVAK Kurulum','manage_options','vkv-kurulum','vkv_kurulum_sayfasi','dashicons-admin-settings',3);
});

/* ══════════════════════════════════════════════════════
   9. ADMİN SAYFASI — WIZARD
══════════════════════════════════════════════════════ */
function vkv_kurulum_sayfasi() {
    $siteler = vkv_site_tanimlari();
    $durum   = vkv_durum_kontrol();
    $menu_var    = (bool) wp_get_nav_menu_object('DERVAK Ana Menü');
    $anasayfa_ok = (get_option('show_on_front')==='page' && get_option('page_on_front'));
    $toplam_wp   = count($durum);
    ?>
<div id="vkv-kurulum" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:1100px;padding:20px 0">
<style>
#vkv-kurulum *{box-sizing:border-box}
.vkk-hd{background:linear-gradient(135deg,#8B1A1A,#5C0E0E);padding:22px 26px;border-radius:8px;margin-bottom:20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.vkk-hd h1{font-size:1.35rem;font-weight:800;color:#fff;margin:0}
.vkk-hd p{font-size:12px;color:rgba(255,255,255,.6);margin:3px 0 0}
.vkk-badge{background:rgba(255,255,255,.15);color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap}
.vkk-stats{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
.vkk-stat{flex:1;min-width:120px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;text-align:center}
.vkk-stat .n{font-size:1.8rem;font-weight:800;line-height:1;margin-bottom:3px}
.vkk-stat .l{font-size:10.5px;color:#64748b;text-transform:uppercase;letter-spacing:.5px}
.vkk-stat.ok .n{color:#8B1A1A} .vkk-stat.warn .n{color:#d97706} .vkk-stat.good .n{color:#15803d}
/* Adımlar */
.vkk-wizard{background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
.vkk-adimlar{display:flex;border-bottom:1px solid #e5e7eb;background:#f8fafc}
.vkk-adim{flex:1;padding:12px 8px;text-align:center;font-size:12px;font-weight:700;color:#94a3b8;border-bottom:3px solid transparent;cursor:default}
.vkk-adim.aktif{color:#8B1A1A;border-bottom-color:#8B1A1A;background:#fff}
.vkk-adim.tamamlandi{color:#15803d;border-bottom-color:#15803d}
.vkk-panel{padding:28px 26px}
.vkk-panel.gizli{display:none}
/* Site kartları */
.vkk-site-kartlar{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:8px}
.vkk-site-kart{border:2px solid #e5e7eb;border-radius:10px;padding:18px 20px;cursor:pointer;transition:all .2s;position:relative;text-align:left}
.vkk-site-kart:hover{border-color:#8B1A1A;box-shadow:0 0 0 3px rgba(139,26,26,.08)}
.vkk-site-kart.secili{border-color:#8B1A1A;background:#fff8f8;box-shadow:0 0 0 3px rgba(139,26,26,.12)}
.vkk-site-kart.secili-teal{border-color:#0D7377;background:#f0fafa;box-shadow:0 0 0 3px rgba(13,115,119,.1)}
.vkk-site-kart.secili-mavi{border-color:#0369a1;background:#f0f9ff;box-shadow:0 0 0 3px rgba(3,105,161,.1)}
.vkk-site-kart input[type=radio]{position:absolute;opacity:0;pointer-events:none}
.vkk-site-kart .emoji{font-size:2rem;margin-bottom:8px;display:block}
.vkk-site-kart h3{font-size:14px;font-weight:800;color:#0f172a;margin:0 0 4px}
.vkk-site-kart p{font-size:11.5px;color:#64748b;margin:0}
.vkk-site-kart .check{position:absolute;top:12px;right:12px;width:20px;height:20px;border-radius:50%;border:2px solid #e5e7eb;background:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;transition:all .2s}
.vkk-site-kart.secili .check{background:#8B1A1A;border-color:#8B1A1A;color:#fff}
.vkk-site-kart.secili-teal .check{background:#0D7377;border-color:#0D7377;color:#fff}
/* Sayfa seçimi */
.vkk-grup{margin-bottom:18px}
.vkk-grup-baslik{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#64748b;margin-bottom:8px;display:flex;align-items:center;gap:8px}
.vkk-grup-baslik button{font-size:10px;padding:2px 8px;border:1px solid #e5e7eb;border-radius:4px;background:#f8fafc;cursor:pointer;color:#475569;font-weight:600}
.vkk-grup-baslik button:hover{background:#e5e7eb}
.vkk-sayfalar{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.vkk-sayfa-cb{display:flex;align-items:center;gap:7px;padding:6px 10px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;transition:background .15s;font-size:12.5px;color:#374151}
.vkk-sayfa-cb:hover{background:#f8fafc}
.vkk-sayfa-cb input{accent-color:#8B1A1A;width:14px;height:14px;cursor:pointer;flex-shrink:0}
.vkk-sayfa-cb.var{background:#f0fdf4;border-color:#86efac;color:#166534}
.vkk-sayfa-cb.var input{accent-color:#15803d}
.vkk-secim-bar{background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.vkk-secim-bar .sayi{font-weight:800;color:#8B1A1A;font-size:14px}
/* Seçenekler */
.vkk-opsiyon{display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;cursor:pointer;margin-bottom:8px;background:#fff;transition:background .15s}
.vkk-opsiyon:hover{background:#f8fafc}
.vkk-opsiyon input{accent-color:#8B1A1A;width:16px;height:16px;cursor:pointer}
/* Butonlar */
.vkk-btn{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;text-decoration:none}
.vkk-btn.kirmizi{background:#8B1A1A;color:#fff} .vkk-btn.kirmizi:hover{background:#6B1010}
.vkk-btn.gri{background:#e5e7eb;color:#374151} .vkk-btn.gri:hover{background:#d1d5db}
.vkk-btn.yesil{background:#15803d;color:#fff} .vkk-btn.yesil:hover{background:#166534}
.vkk-btn.buyuk{padding:14px 32px;font-size:14px}
.vkk-btn:disabled{opacity:.5;cursor:not-allowed}
.vkk-nav{display:flex;gap:10px;align-items:center;margin-top:24px;padding-top:18px;border-top:1px solid #f1f5f9}
/* Sonuç */
.vkk-sonuc-ozet{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:18px 20px;margin-bottom:16px}
.vkk-sonuc-ozet h3{color:#166534;font-size:15px;margin:0 0 8px}
.vkk-sonuc-tablo{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
.vkk-sonuc-tablo th{background:#f1f5f9;padding:6px 10px;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#475569}
.vkk-sonuc-tablo td{padding:5px 10px;border-bottom:1px solid #f1f5f9}
.vkk-sonuc-tablo tr:last-child td{border:none}
.badge-y{display:inline-block;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700}
.badge-y.ok{background:#dcfce7;color:#166534} .badge-y.warn{background:#fef9c3;color:#854d0e}
.badge-y.err{background:#fee2e2;color:#b91c1c}
.vkk-spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:vkk-spin .7s linear infinite;display:none}
.vkk-spinner.ak{display:inline-block}
@keyframes vkk-spin{to{transform:rotate(360deg)}}
@media(max-width:720px){.vkk-site-kartlar{grid-template-columns:1fr} .vkk-sayfalar{grid-template-columns:1fr 1fr}}
@media(max-width:480px){.vkk-sayfalar{grid-template-columns:1fr}}
</style>

<!-- Başlık -->
<div class="vkk-hd">
  <div>
    <h1>⚙️ Tek Tıkla Kurulum Sihirbazı</h1>
    <p>Site tipini seçin · Kurmak istediğiniz sayfaları işaretleyin · Kur butonuna tıklayın</p>
  </div>
  <span class="vkk-badge">v2.0</span>
</div>

<!-- Özet istatistik -->
<div class="vkk-stats">
  <div class="vkk-stat ok">
    <div class="n"><?php echo $toplam_wp; ?></div>
    <div class="l">Mevcut Sayfa</div>
  </div>
  <div class="vkk-stat <?php echo $menu_var ? 'good' : 'warn'; ?>">
    <div class="n"><?php echo $menu_var ? '✓' : '✗'; ?></div>
    <div class="l">Ana Menü</div>
  </div>
  <div class="vkk-stat <?php echo $anasayfa_ok ? 'good' : 'warn'; ?>">
    <div class="n"><?php echo $anasayfa_ok ? '✓' : '✗'; ?></div>
    <div class="l">Ana Sayfa</div>
  </div>
  <div class="vkk-stat ok">
    <div class="n"><?php echo count($siteler); ?></div>
    <div class="l">Site Şablonu</div>
  </div>
</div>

<!-- Wizard -->
<div class="vkk-wizard">

  <!-- Adım başlıkları -->
  <div class="vkk-adimlar" id="vkk-adim-basliklar">
    <div class="vkk-adim aktif" id="ab-1">① Site Seçimi</div>
    <div class="vkk-adim" id="ab-2">② Sayfa Seçimi</div>
    <div class="vkk-adim" id="ab-3">③ Kurulum</div>
  </div>

  <!-- ADIM 1: Site seçimi -->
  <div class="vkk-panel" id="panel-1">
    <h2 style="margin:0 0 6px;font-size:16px;color:#0f172a">Hangi siteyi kuruyorsunuz?</h2>
    <p style="color:#64748b;font-size:13px;margin:0 0 18px">Seçtiğiniz şablona uygun sayfalar ve menü yapısı otomatik hazırlanacak.</p>

    <div class="vkk-site-kartlar">
      <?php foreach ($siteler as $tip => $site): ?>
      <label class="vkk-site-kart" id="kart-<?php echo esc_attr($tip); ?>" data-tip="<?php echo esc_attr($tip); ?>">
        <input type="radio" name="vkk_site" value="<?php echo esc_attr($tip); ?>">
        <span class="check">✓</span>
        <span class="emoji"><?php echo $site['emoji']; ?></span>
        <h3><?php echo esc_html($site['label']); ?></h3>
        <p><?php echo esc_html($site['aciklama']); ?></p>
      </label>
      <?php endforeach; ?>
    </div>

    <div class="vkk-nav">
      <button class="vkk-btn buyuk kirmizi" id="adim1-ileri" disabled>Devam → Sayfa Seçimi</button>
    </div>
  </div>

  <!-- ADIM 2: Sayfa seçimi -->
  <div class="vkk-panel gizli" id="panel-2">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <h2 style="margin:0 0 3px;font-size:16px;color:#0f172a">Hangi sayfaları kurayım?</h2>
        <p style="color:#64748b;font-size:13px;margin:0">Yeşil olanlar sitede zaten mevcut. İşaretli olmayanlar kurulmaz.</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="vkk-btn gri" id="tumunu-sec">✅ Tümünü Seç</button>
        <button class="vkk-btn gri" id="tumunu-kaldir">☐ Tümünü Kaldır</button>
      </div>
    </div>

    <div class="vkk-secim-bar">
      <span class="sayi" id="secim-sayi">0</span> sayfa seçildi
      <span style="color:#94a3b8;font-size:12px">· Sadece seçtiğiniz sayfalar kurulur</span>
    </div>

    <div id="sayfa-listesi"><!-- JS ile dolduruluyor --></div>

    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #f1f5f9">
      <h3 style="font-size:13px;font-weight:700;color:#374151;margin:0 0 10px">Ek Ayarlar</h3>
      <label class="vkk-opsiyon">
        <input type="checkbox" id="kur-anasayfa" checked>
        🏠 <strong>Ana Sayfayı ayarla</strong> — "Ayarlar → Okuma" da ön sayfa olarak tanımla
      </label>
      <label class="vkk-opsiyon">
        <input type="checkbox" id="kur-menu" checked>
        🧭 <strong>Gezinti menüsünü oluştur</strong> — Seçilen site tipine göre menüyü otomatik kur
      </label>
    </div>

    <div class="vkk-nav">
      <button class="vkk-btn gri" id="adim2-geri">← Geri</button>
      <button class="vkk-btn buyuk kirmizi" id="adim2-kur">
        <span class="vkk-spinner" id="kur-spinner"></span>
        <span id="kur-btn-yazi">🚀 Seçili Sayfaları Kur</span>
      </button>
      <span style="color:#94a3b8;font-size:12px;margin-left:auto" id="kur-mesaj"></span>
    </div>
  </div>

  <!-- ADIM 3: Sonuç -->
  <div class="vkk-panel gizli" id="panel-3">
    <div id="sonuc-icerik"></div>
    <div class="vkk-nav">
      <button class="vkk-btn gri" id="adim3-basa">← Başa Dön</button>
      <a href="<?php echo admin_url('edit.php?post_type=page'); ?>" class="vkk-btn yesil">📄 Sayfaları Gör</a>
      <a href="<?php echo esc_url(home_url('/')); ?>" target="_blank" class="vkk-btn yesil">🌐 Siteyi Aç</a>
    </div>
  </div>

</div><!-- /wizard -->
</div><!-- /vkv-kurulum -->

<script>
(function($){
  var SITE_TANIMLARI = <?php echo json_encode($siteler, JSON_UNESCAPED_UNICODE); ?>;
  var MEVCUT_SLUGLAR = <?php echo json_encode(array_keys($durum), JSON_UNESCAPED_UNICODE); ?>;
  var AJAX_URL  = '<?php echo esc_url(admin_url('admin-ajax.php')); ?>';
  var NONCE     = '<?php echo wp_create_nonce('vkv_kurulum_nonce'); ?>';
  var secili_tip = null;

  /* ── Adım geçişleri ── */
  function goster_panel(n) {
    for (var i = 1; i <= 3; i++) {
      $('#panel-'+i).toggleClass('gizli', i !== n);
      $('#ab-'+i).toggleClass('aktif', i === n);
    }
  }

  /* ── Site kartı seçimi ── */
  $(document).on('click', '.vkk-site-kart', function(){
    var tip = $(this).data('tip');
    secili_tip = tip;
    $('.vkk-site-kart').removeClass('secili secili-teal secili-mavi');
    var cls = tip === 'tukav' ? 'secili-teal' : (tip === 'dsv' ? 'secili-mavi' : 'secili');
    $(this).addClass(cls);
    $('#adim1-ileri').prop('disabled', false);
  });

  /* ── ADIM 1 → 2 ── */
  $('#adim1-ileri').on('click', function(){
    if (!secili_tip) return;
    sayfa_listesini_olustur(secili_tip);
    $('#ab-1').addClass('tamamlandi').removeClass('aktif');
    goster_panel(2);
    guncelle_secim_sayisi();
  });

  /* ── ADIM 2 → 1 ── */
  $('#adim2-geri').on('click', function(){
    goster_panel(1);
    $('#ab-1').removeClass('tamamlandi').addClass('aktif');
  });

  /* ── ADIM 3 → 1 ── */
  $('#adim3-basa').on('click', function(){
    goster_panel(1);
    $('#ab-1').removeClass('tamamlandi').addClass('aktif');
    $('#ab-2').removeClass('tamamlandi aktif');
    $('#ab-3').removeClass('tamamlandi aktif');
  });

  /* ── Sayfa listesini oluştur ── */
  function sayfa_listesini_olustur(tip) {
    var site = SITE_TANIMLARI[tip];
    if (!site) return;
    var sayfalar = site.sayfalar;

    /* Gruplara ayır */
    var gruplar = {};
    var grup_sira = [];
    sayfalar.forEach(function(s){
      var grup = s[0];
      if (!gruplar[grup]) { gruplar[grup] = []; grup_sira.push(grup); }
      gruplar[grup].push(s);
    });

    /* Tekrar eden slug'ları kaldır */
    var goruldu = {};
    var html = '';
    grup_sira.forEach(function(grup){
      var benzersiz = gruplar[grup].filter(function(s){ var k=s[2]; if(k===''||goruldu[k])return false; goruldu[k]=1; return true; });
      if (!benzersiz.length) return;
      html += '<div class="vkk-grup">';
      html += '<div class="vkk-grup-baslik">'+escH(grup)+
        ' <button class="grup-hepsini-sec" data-grup="'+escH(grup)+'">Tümü</button>'+
        ' <button class="grup-hepsini-kaldir" data-grup="'+escH(grup)+'">Hiçbiri</button>'+
        '</div>';
      html += '<div class="vkk-sayfalar">';
      benzersiz.forEach(function(s){
        var slug = s[2], baslik = s[1];
        var var_mi = MEVCUT_SLUGLAR.indexOf(slug) >= 0;
        html += '<label class="vkk-sayfa-cb'+(var_mi?' var':'')+'" data-grup="'+escH(grup)+'">';
        html += '<input type="checkbox" class="sayfa-cb" name="sluglar[]" value="'+escH(slug)+'" '+(var_mi?'checked':'checked')+'>';
        html += escH(baslik);
        if(var_mi) html += ' <span style="font-size:10px;color:#15803d;font-weight:700">✓</span>';
        html += '</label>';
      });
      html += '</div></div>';
    });
    $('#sayfa-listesi').html(html);
    guncelle_secim_sayisi();
  }

  /* ── Seçim sayısı güncelle ── */
  function guncelle_secim_sayisi() {
    var n = $('.sayfa-cb:checked').length;
    $('#secim-sayi').text(n);
  }
  $(document).on('change', '.sayfa-cb', guncelle_secim_sayisi);

  /* ── Tümünü Seç / Kaldır ── */
  $('#tumunu-sec').on('click',function(){ $('.sayfa-cb').prop('checked',true); guncelle_secim_sayisi(); });
  $('#tumunu-kaldir').on('click',function(){ $('.sayfa-cb').prop('checked',false); guncelle_secim_sayisi(); });
  $(document).on('click','.grup-hepsini-sec',function(){
    var g=$(this).data('grup');
    $('[data-grup="'+g+'"] .sayfa-cb').prop('checked',true);
    guncelle_secim_sayisi();
  });
  $(document).on('click','.grup-hepsini-kaldir',function(){
    var g=$(this).data('grup');
    $('[data-grup="'+g+'"] .sayfa-cb').prop('checked',false);
    guncelle_secim_sayisi();
  });

  /* ── KUR ── */
  $('#adim2-kur').on('click', function(){
    var secili = [];
    $('.sayfa-cb:checked').each(function(){ secili.push($(this).val()); });
    var kur_anasayfa = $('#kur-anasayfa').is(':checked') ? 1 : 0;
    var kur_menu     = $('#kur-menu').is(':checked') ? 1 : 0;

    if (!secili.length && !kur_anasayfa && !kur_menu) {
      $('#kur-mesaj').css('color','#dc2626').text('En az bir seçim yapın.');
      return;
    }

    var $btn = $(this).prop('disabled', true);
    $('#kur-spinner').addClass('ak');
    $('#kur-btn-yazi').text('Kuruluyor…');
    $('#kur-mesaj').text('');

    var data = {
      action      : 'vkv_kur_secili',
      nonce       : NONCE,
      site_tipi   : secili_tip,
      kur_anasayfa: kur_anasayfa,
      kur_menu    : kur_menu,
    };
    secili.forEach(function(s){ data['sluglar[]'] = data['sluglar[]'] ? [].concat(data['sluglar[]'],[s]) : s; });

    /* sluglar dizisi için özel post data */
    var postData = 'action=vkv_kur_secili&nonce='+encodeURIComponent(NONCE)+'&site_tipi='+encodeURIComponent(secili_tip)+'&kur_anasayfa='+kur_anasayfa+'&kur_menu='+kur_menu;
    secili.forEach(function(s){ postData += '&sluglar[]='+encodeURIComponent(s); });

    $.ajax({
      url: AJAX_URL,
      type: 'POST',
      contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
      data: postData,
      success: function(r){
        $btn.prop('disabled',false);
        $('#kur-spinner').removeClass('ak');
        $('#kur-btn-yazi').text('🚀 Seçili Sayfaları Kur');
        if (r.success) {
          goster_sonuc(r.data);
          $('#ab-2').addClass('tamamlandi').removeClass('aktif');
          $('#ab-3').addClass('aktif');
          goster_panel(3);
        } else {
          $('#kur-mesaj').css('color','#dc2626').text('❌ Hata: '+(r.data||'Bilinmeyen'));
        }
      },
      error: function(){
        $btn.prop('disabled',false);
        $('#kur-spinner').removeClass('ak');
        $('#kur-btn-yazi').text('🚀 Seçili Sayfaları Kur');
        $('#kur-mesaj').css('color','#dc2626').text('❌ Sunucu hatası oluştu.');
      }
    });
  });

  /* ── Sonuç render ── */
  function goster_sonuc(d) {
    var html = '';
    html += '<div class="vkk-sonuc-ozet">';
    html += '<h3>🎉 Kurulum Tamamlandı!</h3>';
    html += '<div style="display:flex;gap:20px;flex-wrap:wrap;font-size:13px">';
    html += '<span>✅ <strong>'+d.yeni_c+'</strong> yeni sayfa oluşturuldu</span>';
    html += '<span>♻️ <strong>'+d.gunc_c+'</strong> sayfa güncellendi</span>';
    if (d.hata_c) html += '<span style="color:#b91c1c">❌ <strong>'+d.hata_c+'</strong> hata</span>';
    if (d.menu_sonu && d.menu_sonu.basari) html += '<span>🧭 Menü: <strong>'+d.menu_sonu.sayi+'</strong> öğe</span>';
    if (d.ana_sonu && d.ana_sonu.basari) html += '<span>🏠 Ana sayfa ayarlandı (ID: '+d.ana_sonu.id+')</span>';
    html += '</div></div>';

    if (d.sayfa_sonu && d.sayfa_sonu.length) {
      html += '<table class="vkk-sonuc-tablo"><thead><tr><th>Sayfa</th><th>Slug</th><th>Durum</th></tr></thead><tbody>';
      d.sayfa_sonu.forEach(function(r){
        var cls = r.durum==='oluşturuldu'?'ok': r.durum==='güncellendi'?'warn':'err';
        html += '<tr><td>'+escH(r.baslik)+'</td><td><code style="font-size:11px">'+escH(r.slug)+'</code></td>';
        html += '<td><span class="badge-y '+cls+'">'+escH(r.durum)+'</span></td></tr>';
      });
      html += '</tbody></table>';
    }
    $('#sonuc-icerik').html(html);
  }

  function escH(s){ return $('<div>').text(s+'').html(); }

})(jQuery);
</script>
<?php
}
