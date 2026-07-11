<?php
/**
 * TEMA KONFIGÜRASYONU — Yeni Projeye Uyarlama Dosyası
 * ======================================================
 * Yeni bir projeye uyarlamak için SADECE bu dosyayı değiştirin.
 * Diğer hiçbir dosyaya dokunmak gerekmez.
 *
 * Desteklenen temalar: VKV, TUKAV ve tüm türev projeler
 */
defined('ABSPATH') || exit;

/* ════════════════════════════════════════════════════════════
   PROJE KİMLİĞİ
════════════════════════════════════════════════════════════ */
define('TEMA_PROJE_ADI',     get_bloginfo('name') ?: 'Kurum Adı');
define('TEMA_PROJE_KISALTI', 'TEMA');
define('TEMA_PROJE_URL',     home_url('/'));
define('TEMA_PROJE_VERSIYON','2.0.0');

/* ════════════════════════════════════════════════════════════
   RENK PALETİ (CSS değişkenlerini Customizer'dan override)
════════════════════════════════════════════════════════════ */
define('TEMA_RENK_BIRINCIL',  '#8B1A1A');  // Ana renk
define('TEMA_RENK_IKINCIL',   '#6B1010');  // Koyu ton
define('TEMA_RENK_UCUNCUL',   '#C53030');  // Parlak ton
define('TEMA_RENK_ALTIN',     '#B45309');  // Altın
define('TEMA_RENK_ALTIN2',    '#D97706');  // Altın açık
define('TEMA_RENK_KOYU',      '#0D0B0B');  // Koyu arka plan
define('TEMA_RENK_KOYU2',     '#1A1210');  // İkincil koyu
define('TEMA_RENK_ARKA',      '#FFF8F5');  // Açık arka plan
define('TEMA_RENK_SINIR',     '#FECACA');  // Kenarlık
define('TEMA_RENK_YAZI',      '#1C1010');  // Ana metin

/* ════════════════════════════════════════════════════════════
   TİPOGRAFİ
════════════════════════════════════════════════════════════ */
define('TEMA_FONT_BASLIK', "'Oswald', sans-serif");
define('TEMA_FONT_METIN',  "'Open Sans', system-ui, sans-serif");
// Google Fonts URL — değiştirerek farklı font kullanabilirsiniz
define('TEMA_FONTS_URL', 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap');

/* ════════════════════════════════════════════════════════════
   İLETİŞİM BİLGİLERİ
   vkv_phone / vkv_email — tüm header/footer'da kullanılan key'ler
   tema_telefon / tema_email — eski alias, geri uyumluluk için korunur
════════════════════════════════════════════════════════════ */
define('TEMA_TELEFON',  get_theme_mod('vkv_phone',  get_theme_mod('tema_telefon',  '+90 312 XXX XX XX')));
define('TEMA_EMAIL',    get_theme_mod('vkv_email',   get_theme_mod('tema_email',    'info@kurum.org.tr')));
define('TEMA_ADRES',    get_theme_mod('tema_adres',    'Ankara, Türkiye'));

/* ════════════════════════════════════════════════════════════
   SOSYAL MEDYA
════════════════════════════════════════════════════════════ */
define('TEMA_TWITTER',   get_theme_mod('tema_twitter',   ''));
define('TEMA_INSTAGRAM', get_theme_mod('tema_instagram', ''));
define('TEMA_FACEBOOK',  get_theme_mod('tema_facebook',  ''));
define('TEMA_YOUTUBE',   get_theme_mod('tema_youtube',   ''));

/* ════════════════════════════════════════════════════════════
   BAĞIŞ / ÖDEME
════════════════════════════════════════════════════════════ */
define('TEMA_BAGIS_URL',   get_theme_mod('tema_bagis_url',   'https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07'));
define('TEMA_IBAN',        get_theme_mod('tema_iban',        'TR49 0001 0012 6298 0865 4750 01'));
define('TEMA_BANKA',       get_theme_mod('tema_banka',       'Ziraat Bankası'));
define('TEMA_HESAP_SAHIBI',get_theme_mod('tema_hesap_sahibi',get_bloginfo('name')));

/* ════════════════════════════════════════════════════════════
   GÜVENLİK AYARLARI
════════════════════════════════════════════════════════════ */
define('TEMA_MAX_UPLOAD_MB',   10);    // Maksimum yükleme boyutu (MB)
define('TEMA_SESSION_TIMEOUT', 3600);  // Oturum zaman aşımı (sn)
define('TEMA_AJAX_RATE_LIMIT', 30);    // Dakikada max AJAX isteği
define('TEMA_LOGIN_MAX_DENEME',5);     // Max başarısız giriş

/* ════════════════════════════════════════════════════════════
   ÖZELLIK TOGGLE
════════════════════════════════════════════════════════════ */
define('TEMA_YORUMLAR_AKTIF',  false); // Yazı yorumları
define('TEMA_ARAMA_AKTIF',     true);  // Arama kutusu
define('TEMA_BREADCRUMB_AKTIF',true);  // Breadcrumb navigasyon
define('TEMA_SIDEBAR_AKTIF',   false); // Sidebar (büyük ekran)
define('TEMA_SCROLL_ANIM',     true);  // Scroll animasyonları
define('TEMA_PREMIUM_UI',      true);  // Premium UI efektleri

/* ════════════════════════════════════════════════════════════
   MENÜ YAPI TANIMLARI
════════════════════════════════════════════════════════════ */
function tema_menu_tanimlari() {
    return array(
        'primary' => 'Ana Menü',
        'footer'  => 'Footer Menü',
        'mobile'  => 'Mobil Menü',
    );
}

/* ════════════════════════════════════════════════════════════
   RESİM BOYUTLARI
════════════════════════════════════════════════════════════ */
function tema_resim_boyutlari() {
    return array(
        array('tema-news',  600, 400, true),
        array('tema-hero', 1920, 700, true),
        array('tema-thumb', 400, 300, true),
        array('tema-card',  800, 500, true),
    );
}

/* ════════════════════════════════════════════════════════════
   CUSTOMIZER KAYIT
════════════════════════════════════════════════════════════ */
add_action('customize_register', 'tema_config_customizer');
function tema_config_customizer($wpc) {
    $panel = 'tema_panel';
    $wpc->add_panel($panel, array('title' => get_bloginfo('name') . ' Tema Ayarları', 'priority' => 30));

    // İletişim
    $wpc->add_section('tema_iletisim', array('title' => '📞 İletişim', 'panel' => $panel));
    $iletisim_ayarlar = array(
        'vkv_phone'          => array('Telefon',            '+90 312 XXX XX XX', 'sanitize_text_field'),
        'vkv_email'          => array('E-posta',            'info@kurum.org.tr', 'sanitize_email'),
        'tema_adres'         => array('Adres',              'Ankara, Türkiye',   'sanitize_text_field'),
        'vkv_ana_site_url'   => array('Dış Site URL',       '',                  'esc_url_raw'),
        'vkv_ana_site_etiket'=> array('Dış Site Etiketi',   '',                  'sanitize_text_field'),
        /* Eski key'ler — geri uyumluluk */
        'tema_telefon'       => array('Telefon (eski key)', '+90 312 XXX XX XX', 'sanitize_text_field'),
        'tema_email'         => array('E-posta (eski key)', 'info@kurum.org.tr', 'sanitize_email'),
    );
    foreach ($iletisim_ayarlar as $key => $v) {
        $wpc->add_setting($key, array('default' => $v[1], 'sanitize_callback' => $v[2], 'transport' => 'postMessage'));
        $wpc->add_control($key, array('label' => $v[0], 'section' => 'tema_iletisim', 'type' => 'text'));
    }

    // Sosyal Medya
    $wpc->add_section('tema_sosyal', array('title' => '📱 Sosyal Medya', 'panel' => $panel));
    foreach (array('tema_twitter'=>'Twitter/X','tema_instagram'=>'Instagram','tema_facebook'=>'Facebook','tema_youtube'=>'YouTube') as $key => $label) {
        $wpc->add_setting($key, array('default' => '', 'sanitize_callback' => 'esc_url_raw'));
        $wpc->add_control($key, array('label' => $label, 'section' => 'tema_sosyal', 'type' => 'url'));
    }

    // Bağış
    $wpc->add_section('tema_bagis', array('title' => '💝 Bağış', 'panel' => $panel));
    foreach (array(
        'tema_bagis_url'    => array('Stripe URL',    TEMA_BAGIS_URL,     'esc_url_raw',            'url'),
        'tema_iban'         => array('IBAN',          TEMA_IBAN,          'sanitize_text_field',    'text'),
        'tema_banka'        => array('Banka',         TEMA_BANKA,         'sanitize_text_field',    'text'),
        'tema_hesap_sahibi' => array('Hesap Sahibi',  TEMA_HESAP_SAHIBI,  'sanitize_text_field',    'text'),
    ) as $key => $v) {
        $wpc->add_setting($key, array('default' => $v[1], 'sanitize_callback' => $v[2]));
        $wpc->add_control($key, array('label' => $v[0], 'section' => 'tema_bagis', 'type' => $v[3]));
    }

    // Footer
    $wpc->add_section('tema_footer', array('title' => '🦶 Footer', 'panel' => $panel));
    $wpc->add_setting('tema_footer_desc', array('default' => '', 'sanitize_callback' => 'sanitize_textarea_field'));
    $wpc->add_control('tema_footer_desc', array('label' => 'Footer Açıklaması', 'section' => 'tema_footer', 'type' => 'textarea'));
    $wpc->add_setting('tema_copyright', array('default' => '© ' . date('Y') . ' ' . get_bloginfo('name'), 'sanitize_callback' => 'sanitize_text_field'));
    $wpc->add_control('tema_copyright', array('label' => 'Telif Hakkı', 'section' => 'tema_footer', 'type' => 'text'));
}
