<?php
/**
 * Plugin Name: YENITEMA Sayfa Yönetici
 * Plugin URI:  https://vatankahramanlari.org
 * Description: DERVAK teması için site renklerini, anasayfa modüllerini ve sayfa şablonlarını yönetin. Tüm site tipleriyle uyumludur.
 * Version:     2.1.0
 * Author:      DERVAK Teknik Ekip
 * Text Domain: yenitema-sy
 */
defined('ABSPATH') || exit;

define('VKV_SY_VER', '2.1.0');

/* sanitize_hex_color() WP 6.1 öncesinde sadece Customizer'da tanımlıdır.
   Bu eklenti wp_head'da renk CSS'i ürettiğinden burada fallback sağlıyoruz. */
if (!function_exists('sanitize_hex_color')) {
    function sanitize_hex_color($color) {
        if ('' === $color) return '';
        if (preg_match('/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/', $color)) return $color;
        return '';
    }
}

/* ═══════════════════════════════════════════════════════════
   0. AKTİVASYON HOOK — VKD VARSAYILAN AYARLARI
═══════════════════════════════════════════════════════════ */
register_activation_hook(__FILE__, 'vkvsy_aktivasyon_vkd');
function vkvsy_aktivasyon_vkd() {
    /* Sadece ilk kurulumda varsayılanları ayarla */
    if (get_option('vkvsy_vkd_aktive')) return;

    $vkd_renkler = array(
        'birincil' => '#7B1213', 'ikincil'  => '#5C0B0C', 'ucuncul'  => '#B91C1C',
        'altin'    => '#92400E', 'altin2'   => '#B45309',
        'koyu'     => '#0D0B0B', 'koyu2'    => '#1A1210',
        'arka'     => '#FFF5F5', 'arka2'    => '#FEECEC',
        'sinir'    => '#FECACA', 'yazi'     => '#1C1010', 'yazi2'    => '#4B2020',
    );
    update_option('vkv_site_tipi',        'dernek');
    update_option('vkvsy_renkler',         $vkd_renkler);
    update_option('vkv_org_adi',           'Vatan Kahramanları Derneği');
    update_option('vkv_org_aciklama',      'Şehit ve gazi ailelerine yönelik sosyal, hukuki ve insani hizmetler sunan ulusal sivil toplum kuruluşu.');
    update_option('vkv_iban_opt',           'TR54 0001 0012 6297 7557 9950 04');
    update_option('vkv_banka_adi_opt',      'Ziraat Bankası');
    update_option('vkv_banka_hesap_opt',    'Vatan Kahramanları Derneği');
    update_option('vkv_iban2_opt',          'TR14 0001 0012 6298 0441 3150 01');
    update_option('vkv_banka_hesap2_opt',   'Vatan Kahramanları Derneği Savunma Hizmetleri Ltd. Şti.');
    update_option('vkvsy_vkd_aktive',      '1');

    /* Theme modları */
    set_theme_mod('vkv_logo_name', 'Vatan Kahramanları Derneği');
    set_theme_mod('vkv_logo_tag',  'ŞEHİTLERİMİZ YAŞIYOR');
    set_theme_mod('vkv_cr',        '#7B1213');
    set_theme_mod('vkv_cr2',       '#5C0B0C');
    set_theme_mod('vkv_cr3',       '#B91C1C');
    set_theme_mod('vkv_altin',     '#92400E');
    set_theme_mod('vkv_bagis_url', get_theme_mod('vkv_bagis_url', 'https://bagis.vatankahramanlari.org/b/cNi5kC6Y78E13A5czF4AU02'));

    /* Mobil alt navbar */
    update_option('vkv_bottom_nav_items', array(
        array('ikon'=>'&#127968;', 'etiket'=>'Ana Sayfa',  'url'=>'/',              'bagis'=>false),
        array('ikon'=>'&#127963;', 'etiket'=>'Atatürk',    'url'=>'/ataturk',       'bagis'=>false),
        array('ikon'=>'&#10084;',  'etiket'=>'Bağış',      'url'=>'/bagis',         'bagis'=>true),
        array('ikon'=>'&#128197;', 'etiket'=>'Faaliyetler','url'=>'/faaliyetler',   'bagis'=>false),
        array('ikon'=>'&#128231;', 'etiket'=>'İletişim',   'url'=>'/iletisim',      'bagis'=>false),
    ));

    /* Değerler bandı VKD */
    update_option('vkv_degerler_bandi', json_encode(array(
        array('ikon'=>'&#127984;','baslik'=>'Şehitlerimiz',        'aciklama'=>'Kahramanlarımız',  'url'=>'/sehitlerimiz'),
        array('ikon'=>'&#129332;','baslik'=>'Gazilerimiz',          'aciklama'=>'Kahraman gaziler', 'url'=>'/gazilerimiz'),
        array('ikon'=>'&#9878;',  'baslik'=>'Şehit & Gazi Hakları','aciklama'=>'Hukuki destek',    'url'=>'/sehit-gazi-haklari'),
        array('ikon'=>'&#127891;','baslik'=>'Burs Programı',        'aciklama'=>'Eğitim desteği',  'url'=>'/burs'),
        array('ikon'=>'&#129309;','baslik'=>'İnsani Yardım',        'aciklama'=>'Temel ihtiyaç',   'url'=>'/insani-yardim'),
        array('ikon'=>'&#128506;','baslik'=>'Hizmet Bölgeleri',     'aciklama'=>'81 il',            'url'=>'/hizmet-bolgesi'),
    )));

    /* Hızlı erişim VKD */
    update_option('vkv_hizli_erisim_linkleri', json_encode(array(
        array('ikon'=>'&#127984;','baslik'=>'Şehitlerimiz',         'url'=>'/sehitlerimiz'),
        array('ikon'=>'&#9878;',  'baslik'=>'Şehit Gazi Hakları',   'url'=>'/sehit-gazi-haklari'),
        array('ikon'=>'&#127891;','baslik'=>'Burs Başvurusu',       'url'=>'/burs'),
        array('ikon'=>'&#129309;','baslik'=>'İnsani Yardım',        'url'=>'/insani-yardim'),
        array('ikon'=>'&#128197;','baslik'=>'Etkinlikler',          'url'=>'/etkinlikler'),
        array('ikon'=>'&#128231;','baslik'=>'Bize Ulaşın',          'url'=>'/iletisim'),
    )));

    /* Bağış URL — mevcut değeri koru, yoksa varsayılan set et */
    if (!get_theme_mod('vkv_bagis_url')) {
        set_theme_mod('vkv_bagis_url', 'https://bagis.vatankahramanlari.org/b/cNi5kC6Y78E13A5czF4AU02');
    }
}

/* ═══════════════════════════════════════════════════════════
   1. RENK YÖNETİMİ — wp_head CSS enjeksiyonu
═══════════════════════════════════════════════════════════ */
add_action('wp_head', 'vkvsy_custom_css_output', 9);
function vkvsy_custom_css_output() {
    $renkler = get_option('vkvsy_renkler', array());
    /* Eğer option boşsa theme_mod'dan oku (wizard ve Renk formu theme_mod kullanır) */
    if (empty($renkler['birincil'])) {
        $tm_cr = get_theme_mod('vkv_cr');
        if ($tm_cr) {
            $renkler = array_merge($renkler, array(
                'birincil' => get_theme_mod('vkv_cr',    '#8B1A1A'),
                'ikincil'  => get_theme_mod('vkv_cr2',   '#6B1010'),
                'ucuncul'  => get_theme_mod('vkv_cr3',   '#C53030'),
                'altin'    => get_theme_mod('vkv_altin', '#B45309'),
                'altin2'   => get_theme_mod('vkv_altin2','#D97706'),
                'koyu'     => get_theme_mod('vkv_dk',    '#0D0B0B'),
            ));
            /* Option'u güncelle (bir sonraki yüklemede tekrar okumayalım) */
            update_option('vkvsy_renkler', $renkler);
        }
    }
    if (empty($renkler)) return;

    $d = array_merge(array(
        'birincil'    => '',
        'ikincil'     => '',
        'ucuncul'     => '',
        'altin'       => '',
        'altin2'      => '',
        'koyu'        => '',
        'koyu2'       => '',
        'arka'        => '',
        'arka2'       => '',
        'sinir'       => '',
        'yazi'        => '',
        'yazi2'       => '',
    ), $renkler);

    $css = ':root{';
    $map = array(
        'birincil' => array('--cr','--tq','--cr3','--tq3-base'),
        'ikincil'  => array('--cr2','--tq2'),
        'ucuncul'  => array('--cr3','--tq3'),
        'altin'    => array('--altin'),
        'altin2'   => array('--altin2'),
        'koyu'     => array('--dk'),
        'koyu2'    => array('--dk2'),
        'arka'     => array('--bg'),
        'arka2'    => array('--bg2'),
        'sinir'    => array('--sin','--sin2'),
        'yazi'     => array('--yz'),
        'yazi2'    => array('--yz2'),
    );
    foreach ($map as $key => $vars) {
        if (!empty($d[$key])) {
            foreach ($vars as $var) {
                $css .= $var . ':' . sanitize_hex_color($d[$key]) . ';';
            }
        }
    }
    $css .= '}';

    // Birincil renk → tq da güncelle (TUKAV uyumu)
    if (!empty($d['birincil'])) {
        $c = sanitize_hex_color($d['birincil']);
        $css .= '.tp-hero::before{background:radial-gradient(ellipse 70% 80% at 75% 50%,' . vkvsy_hex_rgba($c, .25) . ' 0%,transparent 65%)}';
    }

    echo '<style id="vkvsy-custom-renk">' . $css . '</style>' . "\n";
}

function vkvsy_hex_rgba($hex, $alpha = 1) {
    $hex = ltrim($hex, '#');
    if (strlen($hex) === 3) $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
    $r = hexdec(substr($hex,0,2));
    $g = hexdec(substr($hex,2,2));
    $b = hexdec(substr($hex,4,2));
    return "rgba($r,$g,$b,$alpha)";
}

/* ═══════════════════════════════════════════════════════════
   2. ADMİN MENÜ
═══════════════════════════════════════════════════════════ */
add_action('admin_menu', 'vkvsy_admin_menu');
function vkvsy_admin_menu() {
    add_menu_page(
        'DERVAK Sayfa Yönetici',
        '🎛️ DERVAK Yönetici',
        'manage_options',
        'vkv-sayfa-yonetici',
        'vkvsy_page_render',
        'dashicons-admin-appearance',
        3
    );
    add_submenu_page('vkv-sayfa-yonetici', 'Site Renkleri',      '🎨 Renkler',         'manage_options', 'vkv-sayfa-yonetici',       'vkvsy_page_render');
    add_submenu_page('vkv-sayfa-yonetici', 'Anasayfa Modülleri', '🏠 Anasayfa Modülleri','manage_options','vkv-sy-moduller',          'vkvsy_moduller_render');
    add_submenu_page('vkv-sayfa-yonetici', 'Sayfa Şablonları',   '📄 Şablonlar',        'manage_options', 'vkv-sy-sablonlar',         'vkvsy_sablonlar_render');
    add_submenu_page('vkv-sayfa-yonetici', 'Yeni Şablon',        '➕ Yeni Şablon',      'manage_options', 'vkv-sy-yeni-sablon',       'vkvsy_yeni_sablon_render');
    add_submenu_page('vkv-sayfa-yonetici', 'Hızlı Erişim Düzenle','⚡ Hızlı Erişim',   'manage_options', 'vkv-sy-hizli-erisim',      'vkvsy_hizli_erisim_render');
    add_submenu_page('vkv-sayfa-yonetici', 'Manşet Ayarları',     '📰 Manşet Ayarları','manage_options', 'vkv-sy-manseta',           'vkvsy_manseta_render');
    add_submenu_page('vkv-sayfa-yonetici', 'Bağış Ayarları',      '💝 Bağış Ayarları', 'manage_options', 'vkv-sy-bagis',             'vkvsy_bagis_render');
    add_submenu_page('vkv-sayfa-yonetici', 'Tema Dosyaları',      '🛠️ Tema Düzenle',   'manage_options', 'vkv-sy-tema-duzenle',      'vkvsy_tema_duzenle_render');
    add_submenu_page('vkv-sayfa-yonetici', 'Kurulum Rehberi',     '📖 Kurulum Rehberi','manage_options', 'vkv-sy-rehber',            'vkvsy_rehber_render');
}

/* ═══════════════════════════════════════════════════════════
   3. ADMIN SCRIPTLER
═══════════════════════════════════════════════════════════ */
add_action('admin_enqueue_scripts', 'vkvsy_admin_scripts');
function vkvsy_admin_scripts($hook) {
    if (strpos($hook, 'vkv-') === false && strpos($hook, 'vkv_') === false) return;
    wp_enqueue_style('wp-color-picker');
    wp_enqueue_script('wp-color-picker');
    wp_enqueue_script('jquery-ui-sortable');
    wp_enqueue_style('vkvsy-admin', plugins_url('admin.css', __FILE__), array(), VKV_SY_VER);
    wp_enqueue_script('vkvsy-admin', plugins_url('admin.js', __FILE__), array('jquery','wp-color-picker','jquery-ui-sortable'), VKV_SY_VER, true);
    wp_localize_script('vkvsy-admin', 'VKVSYData', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce'    => wp_create_nonce('vkvsy_nonce'),
        'theme_dir'=> get_template_directory(),
    ));
    // CodeMirror PHP mode
    if (isset($_GET['page']) && in_array($_GET['page'], array('vkv-sy-sablonlar','vkv-sy-yeni-sablon','vkv-sy-tema-duzenle'))) {
        $cm = wp_enqueue_code_editor(array('type'=>'application/x-httpd-php'));
    }
}

/* ═══════════════════════════════════════════════════════════
   4. AJAX HANDLERS
═══════════════════════════════════════════════════════════ */

// Renk kaydet
add_action('wp_ajax_vkvsy_kaydet_renk', 'vkvsy_ajax_kaydet_renk');
function vkvsy_ajax_kaydet_renk() {
    check_ajax_referer('vkvsy_nonce','nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Yetki yok');
    $renkler = array();
    $keys = array('birincil','ikincil','ucuncul','altin','altin2','koyu','koyu2','arka','arka2','sinir','yazi','yazi2');
    foreach ($keys as $k) {
        $renkler[$k] = sanitize_hex_color(wp_unslash($_POST[$k] ?? ''));
    }
    update_option('vkvsy_renkler', $renkler);
    wp_send_json_success('Renkler kaydedildi');
}

// Modül sırası kaydet
add_action('wp_ajax_vkvsy_kaydet_modul', 'vkvsy_ajax_kaydet_modul');
function vkvsy_ajax_kaydet_modul() {
    check_ajax_referer('vkvsy_nonce','nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Yetki yok');
    $sira   = array_map('sanitize_text_field', $_POST['sira'] ?? array());
    $gorsel = array();
    foreach ($sira as $m) {
        $gorsel[$m] = isset($_POST['gorsel'][$m]) ? (bool)$_POST['gorsel'][$m] : true;
    }
    update_option('vkv_modul_sirasi', $sira);
    update_option('vkv_modul_gorunurluk', $gorsel);
    wp_send_json_success('Modüller kaydedildi');
}

/* ── Güvenli tema dosya yolu çözümleyici ── */
function vkvsy_guvenli_yol(string $dosya): ?string {
    $tema_dir = get_template_directory();
    // Sadece izin verilen karakter seti (alt klasör desteği dahil)
    if (!preg_match('/^[a-zA-Z0-9_\-\.\/]+$/', $dosya)) return null;
    // Path traversal engeli
    if (strpos($dosya, '..') !== false) return null;
    // PHP dışındaki uzantı engeli
    $ext = strtolower(pathinfo($dosya, PATHINFO_EXTENSION));
    if ($ext !== 'php') return null;
    $hedef = rtrim($tema_dir,'/') . '/' . ltrim($dosya,'/');
    // Gerçek dizin, tema dizini içinde mi? (dosya henüz yoksa dirname kontrolü)
    $dir_real = realpath(dirname($hedef));
    $tema_real = realpath($tema_dir);
    if ($dir_real === false || $tema_real === false) return null;
    if (strpos($dir_real . DIRECTORY_SEPARATOR, $tema_real . DIRECTORY_SEPARATOR) !== 0) return null;
    return $hedef;
}

// Şablon kaydet (dosyaya yaz)
add_action('wp_ajax_vkvsy_kaydet_sablon', 'vkvsy_ajax_kaydet_sablon');
function vkvsy_ajax_kaydet_sablon() {
    check_ajax_referer('vkvsy_nonce','nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Yetki yok');
    $dosya = sanitize_file_name(wp_unslash($_POST['dosya'] ?? ''));
    if (empty($dosya)) wp_send_json_error('Dosya adı boş');
    $icerik = wp_unslash($_POST['icerik'] ?? '');
    $hedef = vkvsy_guvenli_yol($dosya);
    if (!$hedef) wp_send_json_error('Güvenlik hatası: geçersiz dosya yolu');
    global $wp_filesystem;
    if (empty($wp_filesystem)) { require_once ABSPATH.'wp-admin/includes/file.php'; WP_Filesystem(); }
    $wp_filesystem->put_contents($hedef, $icerik, FS_CHMOD_FILE);
    wp_send_json_success($dosya . ' kaydedildi');
}

// Tema dosyası kaydet (inc/ alt klasörü dahil)
add_action('wp_ajax_vkvsy_kaydet_tema_dosya', 'vkvsy_ajax_kaydet_tema_dosya');
function vkvsy_ajax_kaydet_tema_dosya() {
    check_ajax_referer('vkvsy_nonce','nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Yetki yok');
    $dosya  = wp_unslash($_POST['dosya'] ?? '');
    $icerik = wp_unslash($_POST['icerik'] ?? '');
    if (empty($dosya)) wp_send_json_error('Dosya adı boş');
    $hedef = vkvsy_guvenli_yol($dosya);
    if (!$hedef) wp_send_json_error('Güvenlik hatası: geçersiz dosya yolu');
    if (!file_exists($hedef)) wp_send_json_error('Dosya bulunamadı: ' . esc_html($dosya));
    global $wp_filesystem;
    if (empty($wp_filesystem)) { require_once ABSPATH.'wp-admin/includes/file.php'; WP_Filesystem(); }
    if (!$wp_filesystem->put_contents($hedef, $icerik, FS_CHMOD_FILE)) {
        wp_send_json_error('Yazma hatası — dosya izinlerini kontrol edin');
    }
    wp_send_json_success(basename($dosya) . ' kaydedildi');
}

// Hızlı erişim kaydet
add_action('wp_ajax_vkvsy_kaydet_hizli', 'vkvsy_ajax_kaydet_hizli');
function vkvsy_ajax_kaydet_hizli() {
    check_ajax_referer('vkvsy_nonce','nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Yetki yok');
    $items = $_POST['items'] ?? array();
    $temiz = array();
    foreach ($items as $it) {
        $temiz[] = array(
            sanitize_text_field($it[0] ?? '⭐'),
            sanitize_text_field($it[1] ?? 'Sayfa'),
            '/' . ltrim(sanitize_text_field($it[2] ?? '/'), '/')
        );
    }
    update_option('vkv_hizli_erisim_items', json_encode($temiz));
    // Kahraman bandı & söz bandı
    if (!empty($_POST['kahraman_band_baslik']))   update_option('vkv_kahraman_band_baslik', sanitize_text_field($_POST['kahraman_band_baslik']));
    if (!empty($_POST['kahraman_band_aciklama'])) update_option('vkv_kahraman_band_aciklama', sanitize_textarea_field($_POST['kahraman_band_aciklama']));
    if (!empty($_POST['soz_band_metin']))         update_option('vkv_soz_band_metin', sanitize_textarea_field($_POST['soz_band_metin']));
    if (!empty($_POST['soz_band_kaynak']))        update_option('vkv_soz_band_kaynak', sanitize_text_field($_POST['soz_band_kaynak']));
    if (!empty($_POST['bagis_baslik']))           update_option('vkv_bagis_baslik', sanitize_text_field($_POST['bagis_baslik']));
    if (!empty($_POST['bagis_aciklama']))         update_option('vkv_bagis_aciklama', sanitize_textarea_field($_POST['bagis_aciklama']));
    wp_send_json_success('İçerikler kaydedildi');
}

/* ═══════════════════════════════════════════════════════════
   5. SAYFA YÖNETİCİ ADMİN ARAYÜZÜ
═══════════════════════════════════════════════════════════ */

/* ── Ortak header ── */
function vkvsy_admin_header($aktif_baslik) { ?>
<div class="wrap vkvsy-wrap">
<div class="vkvsy-header">
  <div class="vkvsy-header-sol">
    <div class="vkvsy-logo">🎛️</div>
    <div>
      <h1 class="vkvsy-baslik">Sayfa Yönetici</h1>
      <p class="vkvsy-altyazi">VKV & TUKAV Tema Kontrol Merkezi</p>
    </div>
  </div>
</div>
<div class="vkvsy-tabs">
  <?php
  $tabs = array(
    'vkv-sayfa-yonetici'  => array('🎨','Site Renkleri'),
    'vkv-sy-moduller'     => array('🏠','Anasayfa Modülleri'),
    'vkv-sy-sablonlar'    => array('📄','Sayfa Şablonları'),
    'vkv-sy-yeni-sablon'  => array('➕','Yeni Şablon'),
    'vkv-sy-hizli-erisim' => array('⚡','İçerik Düzenle'),
    'vkv-sy-tema-duzenle' => array('🛠️','Tema Düzenle'),
    'vkv-sy-manseta'      => array('📰','Manşet Ayarları'),
    'vkv-sy-bagis'        => array('💝','Bağış Ayarları'),
  );
  $cur = $_GET['page'] ?? 'vkv-sayfa-yonetici';
  foreach ($tabs as $slug => $info): ?>
  <a href="<?php echo admin_url('admin.php?page='.esc_attr($slug)); ?>"
     class="vkvsy-tab <?php echo $cur === $slug ? 'aktif' : ''; ?>">
    <?php echo $info[0]; ?> <?php echo esc_html($info[1]); ?>
  </a>
  <?php endforeach; ?>
</div>
<?php }

/* ── Ortak footer ── */
function vkvsy_admin_footer() {
    echo '<div class="vkvsy-footer">DERVAK Sayfa Yönetici v' . VKV_SY_VER . ' — <a href="' . admin_url('admin.php?page=vkv-sayfa-yonetici') . '">Ana Sayfa</a></div></div>';
}

/* ─── TAB 1: RENKLER ─────────────────────────────────── */
function vkvsy_page_render() {
    $r = get_option('vkvsy_renkler', array());
    $def = array('birincil'=>'#8B1A1A','ikincil'=>'#6B1010','ucuncul'=>'#C53030','altin'=>'#B45309','altin2'=>'#D97706','koyu'=>'#0D0B0B','koyu2'=>'#1A1210','arka'=>'#FFF8F5','arka2'=>'#FFF0F0','sinir'=>'#FECACA','yazi'=>'#1C1010','yazi2'=>'#4B3030');
    $r = array_merge($def, $r);
    vkvsy_admin_header('Renkler');
    ?>
<div class="vkvsy-card">
  <h2 class="vkvsy-kart-baslik">🎨 Site Renk Paleti</h2>
  <p style="color:#666;margin-bottom:24px">Değişiklikler anında tüm sayfalara ve TUKAV şablon sayfalarına uygulanır.</p>
  <form id="vkvsy-renk-form">
  <div class="vkvsy-renk-grid">
    <?php
    $renk_labels = array(
        'birincil' => array('Ana Renk','Tema birincil rengi (kırmızı/teal vb.)'),
        'ikincil'  => array('İkincil Renk','Hover ve vurgu tonları'),
        'ucuncul'  => array('Üçüncül / Açık Ton','Parlak aksan rengi'),
        'altin'    => array('Altın Rengi','Başlık çizgisi ve badge'),
        'altin2'   => array('Altın Açık','Hover altın tonu'),
        'koyu'     => array('Koyu Arka Plan','Hero ve footer'),
        'koyu2'    => array('Koyu İkincil','Kart arka planları'),
        'arka'     => array('Açık Arka Plan','Sayfa arka planı'),
        'arka2'    => array('Açık İkincil','Alternate section bg'),
        'sinir'    => array('Sınır Rengi','Border ve çizgiler'),
        'yazi'     => array('Yazı Rengi','Ana metin rengi'),
        'yazi2'    => array('İkincil Yazı','Açıklama metinleri'),
    );
    foreach ($renk_labels as $key => $info): ?>
    <div class="vkvsy-renk-kart">
      <div class="vkvsy-renk-onizleme" style="background:<?php echo esc_attr($r[$key]); ?>"></div>
      <div class="vkvsy-renk-bilgi">
        <label class="vkvsy-renk-ad"><?php echo esc_html($info[0]); ?></label>
        <span class="vkvsy-renk-acik"><?php echo esc_html($info[1]); ?></span>
        <input type="text" name="<?php echo esc_attr($key); ?>" value="<?php echo esc_attr($r[$key]); ?>" class="vkvsy-color-picker" data-default-color="<?php echo esc_attr($r[$key]); ?>">
      </div>
    </div>
    <?php endforeach; ?>
  </div>

  <div style="margin-top:24px;padding:20px;background:#f8f9fa;border:1px solid #e2e8f0">
    <h3 style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">🚀 Hazır Paletler</h3>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <?php
      $paletler = array(
        'vkv-kirmizi'  => array('🔴 VKV Kırmızı',    '#8B1A1A','#6B1010','#C53030','#B45309','#D97706','#0D0B0B','#1A1210','#FFF8F5','#FFF0F0','#FECACA','#1C1010','#4B3030'),
        'tukav-teal'   => array('🟦 TUKAV Teal',      '#0e7490','#155e75','#06b6d4','#b8962e','#d4af55','#0f1d22','#162535','#f0f9fb','#e0f2fe','#b2e0e8','#1e293b','#475569'),
        'lacivert'     => array('🔵 Lacivert Klasik', '#1e3a5f','#162d4a','#2563eb','#b8962e','#d4af55','#0a1628','#111d30','#f0f4f8','#e2e8f0','#bfdbfe','#1e293b','#475569'),
        'yesil'        => array('🟢 Zümrüt',          '#065f46','#064e3b','#10b981','#b45309','#d97706','#0d1a14','#102018','#f0fdf4','#dcfce7','#a7f3d0','#1c2e1a','#3d6648'),
        'mor'          => array('🟣 Mor Prestij',      '#5b21b6','#4c1d95','#8b5cf6','#b45309','#d97706','#0d0b18','#1a1030','#f5f3ff','#ede9fe','#ddd6fe','#1c1630','#4b3068'),
      );
      foreach ($paletler as $id => $pal): ?>
      <button type="button" class="vkvsy-palet-btn button" data-palet="<?php echo esc_attr(json_encode(array_slice($pal,1))); ?>">
        <?php echo esc_html($pal[0]); ?>
      </button>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="vkvsy-action-bar">
    <button type="button" id="vkvsy-renk-kaydet" class="button button-primary button-large">💾 Renkleri Kaydet</button>
    <span id="vkvsy-renk-msg" class="vkvsy-msg"></span>
  </div>
  </form>
</div>
    <?php vkvsy_admin_footer();
}

/* ─── TAB 2: ANASAYFA MODÜLLERİ ─────────────────────── */
function vkvsy_moduller_render() {
    $modul_tanim = array(
        'slider'         => array('🎞️','Hero Slider',                  'Admin panelden eklenen slaytlar (bağımsız, blog yazısı değil)'),
        'haberler'       => array('📰','Son Haberler / Manşet',         '2+4 grid haber bölümü, kategoriye göre filtreli'),
        'turk_savaslari' => array('⚔️','Türk Milletinin Savaşları',    'Tarihsel savaşlar listesi (admin panelden düzenlenebilir)'),
        'milli_gunler'   => array('🗓️','Millî Günler & Anma',          'Millî bayram ve anma törenleri takvimi'),
        'kahraman_band'  => array('🛡️','Kahramanlar Bandı',            'Şehit/Gazi vurgu bandı'),
        'hizmetler'      => array('🤝','Hizmetlerimiz & Çalışmalar',   'Hizmet kategorileri grid (admin panelden düzenlenebilir)'),
        'hizli_erisim'   => array('⚡','Hızlı Erişim',                 '6×2 grid sayfa linkleri'),
        'ataturk_bandi'  => array('🕯️','Atatürk Bandı',               'Atatürk sözü + Atatürk sayfalarına hızlı erişim'),
        'soz_band'       => array('💬','Söz Bandı',                    'Alıntı bandı (admin panelden düzenlenebilir)'),
        'bagis'          => array('💝','Bağış Bölümü',                 'Stripe + IBAN bağış modülü'),
        'etkinlikler'    => array('📅','Etkinlikler',                  'Son 3 etkinlik kartı'),
        'duyurular'      => array('📢','Duyurular',                    'Son duyuru listesi'),
    );
    $saved_sira = get_option('vkv_modul_sirasi', array('slider','haberler','turk_savaslari','milli_gunler','kahraman_band','hizmetler','hizli_erisim','ataturk_bandi','soz_band','bagis'));
    $gorsel     = get_option('vkv_modul_gorunurluk', array());
    // Kayıtlı sıranın dışında kalan modülleri sona ekle
    foreach (array_keys($modul_tanim) as $mk) {
        if (!in_array($mk, $saved_sira)) $saved_sira[] = $mk;
    }
    vkvsy_admin_header('Modüller');
    ?>
<div class="vkvsy-card">
  <h2 class="vkvsy-kart-baslik">🏠 Anasayfa Modül Yönetimi</h2>
  <p style="color:#666;margin-bottom:20px">Modülleri sürükleyerek sıralayın. Göz simgesine tıklayarak gizleyip gösterin.</p>

  <div id="vkvsy-modul-liste" class="vkvsy-modul-liste">
    <?php foreach ($saved_sira as $modul_key):
        if (!isset($modul_tanim[$modul_key])) continue;
        $m = $modul_tanim[$modul_key];
        $gorunen = isset($gorsel[$modul_key]) ? (bool)$gorsel[$modul_key] : true; ?>
    <div class="vkvsy-modul-item <?php echo $gorunen?'':'gizli'; ?>" data-key="<?php echo esc_attr($modul_key); ?>">
      <div class="vkvsy-modul-handle" title="Sürükle">⠿</div>
      <div class="vkvsy-modul-ikon"><?php echo $m[0]; ?></div>
      <div class="vkvsy-modul-bilgi">
        <strong><?php echo esc_html($m[1]); ?></strong>
        <span><?php echo esc_html($m[2]); ?></span>
      </div>
      <div class="vkvsy-modul-eylem">
        <button type="button" class="vkvsy-toggle-btn button <?php echo $gorunen?'aktif':''; ?>"
                data-key="<?php echo esc_attr($modul_key); ?>"
                title="<?php echo $gorunen?'Gizle':'Göster'; ?>">
          <?php echo $gorunen?'👁️ Görünür':'🚫 Gizli'; ?>
        </button>
      </div>
    </div>
    <?php endforeach; ?>
  </div>

  <div class="vkvsy-action-bar">
    <button type="button" id="vkvsy-modul-kaydet" class="button button-primary button-large">💾 Sıra &amp; Görünürlüğü Kaydet</button>
    <span id="vkvsy-modul-msg" class="vkvsy-msg"></span>
  </div>
</div>
    <?php vkvsy_admin_footer();
}

/* ─── TAB 3: SAYFA ŞABLONLARI ─────────────────────── */
function vkvsy_sablonlar_render() {
    $tema_dir = get_template_directory();
    /* sanitize_file_name() dots/slashes'ı bozar — raw al, guvenli_yol'da filtrele */
    $duzenle  = isset($_GET['dosya']) ? sanitize_text_field(wp_unslash($_GET['dosya'])) : '';
    vkvsy_admin_header('Şablonlar');

    if ($duzenle) {
        $hedef = vkvsy_guvenli_yol($duzenle);
        if (!$hedef || !file_exists($hedef)) {
            echo '<div class="notice notice-error"><p>❌ Dosya bulunamadı: <code>' . esc_html($duzenle) . '</code></p>';
            echo '<p style="margin-top:8px">Bu dosya henüz tema dizinine yüklenmemiş olabilir.<br>';
            echo 'Tam temayı indirmek için: <a href="' . esc_url(admin_url('admin.php?page=vkv-sy-rehber')) . '">Kurulum Rehberi → ZIP indir</a></p></div>';
            vkvsy_admin_footer(); return;
        }
        $icerik = file_get_contents($hedef);
        ?>
<div class="vkvsy-card">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <h2 class="vkvsy-kart-baslik" style="margin:0">✏️ Düzenle: <code><?php echo esc_html($duzenle); ?></code></h2>
    <a href="<?php echo admin_url('admin.php?page=vkv-sy-sablonlar'); ?>" class="button">← Listeye Dön</a>
  </div>
  <div id="vkvsy-editor-wrap">
    <textarea id="vkvsy-editor" name="icerik" style="width:100%;min-height:520px;font-family:'Courier New',monospace;font-size:13px;line-height:1.6"><?php echo esc_textarea($icerik); ?></textarea>
  </div>
  <div class="vkvsy-action-bar">
    <button type="button" id="vkvsy-sablon-kaydet"
            class="button button-primary button-large"
            data-dosya="<?php echo esc_attr($duzenle); ?>">
      💾 Kaydet
    </button>
    <span id="vkvsy-sablon-msg" class="vkvsy-msg"></span>
    <a href="<?php echo esc_url(home_url('/')); ?>" target="_blank" class="button" style="margin-left:8px">🌐 Siteyi Önizle</a>
  </div>
</div>
        <?php
    } else {
        /* Dosya listesi */
        $dosyalar = glob($tema_dir . '/page*.php');
        sort($dosyalar);
        ?>
<div class="vkvsy-card">
  <h2 class="vkvsy-kart-baslik">📄 Sayfa Şablonları</h2>
  <p style="color:#666;margin-bottom:16px"><?php echo count($dosyalar); ?> şablon bulundu. Düzenlemek için tıklayın.</p>
  <div class="vkvsy-sablon-tablo-wrap">
  <table class="widefat vkvsy-sablon-tablo">
    <thead>
      <tr><th>Dosya Adı</th><th>Şablon Adı</th><th>Boyut</th><th>İşlem</th></tr>
    </thead>
    <tbody>
    <?php foreach ($dosyalar as $dosya):
        $ad      = basename($dosya);
        $icerik  = file_get_contents($dosya, false, null, 0, 300);
        preg_match('/Template Name:\s*(.+)/i', $icerik, $m);
        $sablon_adi = isset($m[1]) ? trim($m[1]) : '—';
        $boyut      = round(filesize($dosya)/1024, 1) . ' KB'; ?>
      <tr>
        <td><code><?php echo esc_html($ad); ?></code></td>
        <td><?php echo esc_html($sablon_adi); ?></td>
        <td><?php echo esc_html($boyut); ?></td>
        <td>
          <a href="<?php echo admin_url('admin.php?page=vkv-sy-sablonlar&dosya=' . urlencode($ad)); ?>" class="button button-small">✏️ Düzenle</a>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
  </div>
</div>
        <?php
    }
    vkvsy_admin_footer();
}

/* ─── TEMA DÜZENLE ────────────────────────────────── */
function vkvsy_tema_duzenle_render() {
    $tema_dir = get_template_directory();
    $duzenle  = isset($_GET['dosya']) ? sanitize_text_field(wp_unslash($_GET['dosya'])) : '';
    vkvsy_admin_header('Tema Düzenle');

    if ($duzenle) {
        /* ── Dosya düzenleme modu ── */
        $hedef = vkvsy_guvenli_yol($duzenle);
        if (!$hedef || !file_exists($hedef)) {
            echo '<div class="notice notice-error"><p>❌ Dosya bulunamadı: <code>' . esc_html($duzenle) . '</code></p></div>';
            vkvsy_admin_footer(); return;
        }
        $icerik = file_get_contents($hedef);

        /* ── Bu şablonu kullanan sayfanın URL'sini bul ── */
        $onizleme_url = home_url('/');
        $sablon_adi   = basename($duzenle);
        $sablon_query = get_posts(array(
            'post_type'      => 'page',
            'post_status'    => 'publish',
            'numberposts'    => 1,
            'meta_key'       => '_wp_page_template',
            'meta_value'     => $sablon_adi,
        ));
        if (!empty($sablon_query)) {
            $onizleme_url = get_permalink($sablon_query[0]->ID);
        }
        ?>
<style>
#vkvsy-split-wrap{display:flex;gap:0;height:680px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden}
#vkvsy-split-wrap.tek{display:block;height:auto;border:none}
#vkvsy-editor-pane{flex:1;min-width:0;display:flex;flex-direction:column;border-right:3px solid #e5e7eb}
#vkvsy-split-wrap.tek #vkvsy-editor-pane{border:none}
#vkvsy-editor-pane textarea, #vkvsy-editor-pane .CodeMirror{height:100%!important;flex:1}
#vkvsy-preview-pane{width:50%;min-width:320px;display:flex;flex-direction:column;background:#f8fafc}
#vkvsy-preview-pane.gizli{display:none}
#vkvsy-preview-pane .pane-baslik{padding:8px 12px;background:#1e293b;color:#e2e8f0;font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px;flex-shrink:0}
#vkvsy-preview-pane .pane-baslik a{color:#94a3b8;font-size:11px;margin-left:auto;text-decoration:none}
#vkvsy-preview-pane .pane-baslik a:hover{color:#fff}
#vkvsy-onizleme{flex:1;width:100%;border:none;background:#fff}
.vkvsy-split-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border:1px solid #e5e7eb;border-radius:5px;background:#fff;cursor:pointer;font-size:12px;font-weight:600;color:#374151;transition:all .15s}
.vkvsy-split-btn:hover{background:#f1f5f9}
.vkvsy-split-btn.aktif{background:#1e293b;color:#fff;border-color:#1e293b}
#vkvsy-editor-wrap-inner{flex:1;overflow:hidden;display:flex;flex-direction:column}
#vkvsy-split-wrap.tek #vkvsy-editor-wrap-inner{display:block}
#vkvsy-split-wrap.tek #vkvsy-editor-wrap-inner textarea{min-height:580px;height:auto}
</style>
<div class="vkvsy-card">
  <!-- Üst bar -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <h2 class="vkvsy-kart-baslik" style="margin:0">🛠️ Düzenle: <code style="font-size:13px"><?php echo esc_html($duzenle); ?></code></h2>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <button type="button" id="vkvsy-split-toggle" class="vkvsy-split-btn" title="Önizleme panelini aç/kapat">
        ⬜ Bölünmüş Görünüm
      </button>
      <a href="<?php echo admin_url('admin.php?page=vkv-sy-tema-duzenle'); ?>" class="button">← Dosya Listesi</a>
      <a href="<?php echo esc_url($onizleme_url); ?>" target="_blank" class="button">🌐 Sayfayı Aç</a>
    </div>
  </div>

  <!-- Uyarı -->
  <div style="background:#fff3cd;border:1px solid #ffc107;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:12.5px">
    ⚠️ <strong>Dikkat:</strong> PHP sözdizimi hatası tüm siteyi çökertebilir. Kaydetmeden önce kontrol edin.
    <?php if (!empty($sablon_query)): ?>
    · Bu şablon: <strong><?php echo esc_html($sablon_query[0]->post_title); ?></strong> sayfasına atanmış.
    <?php endif; ?>
  </div>

  <!-- Bölünmüş kapsayıcı -->
  <div id="vkvsy-split-wrap" class="tek">

    <!-- KOD EDİTÖRÜ -->
    <div id="vkvsy-editor-pane">
      <div id="vkvsy-editor-wrap-inner">
        <textarea id="vkvsy-editor" name="icerik" style="width:100%;min-height:580px;font-family:'Courier New',monospace;font-size:13px;line-height:1.6"><?php echo esc_textarea($icerik); ?></textarea>
      </div>
    </div>

    <!-- ÖNİZLEME PANELİ (başlangıçta gizli) -->
    <div id="vkvsy-preview-pane" class="gizli">
      <div class="pane-baslik">
        🔍 Önizleme
        <span id="vkvsy-preview-url-label" style="color:#64748b;font-size:10.5px;font-style:italic">
          <?php echo esc_html(str_replace(home_url(), '', $onizleme_url) ?: '/'); ?>
        </span>
        <a href="<?php echo esc_url($onizleme_url); ?>" target="_blank">↗ Yeni Sekme</a>
      </div>
      <iframe id="vkvsy-onizleme"
              src="<?php echo esc_url($onizleme_url); ?>"
              allowfullscreen></iframe>
    </div>
  </div>

  <!-- Alt eylem çubuğu -->
  <div class="vkvsy-action-bar" style="margin-top:12px">
    <button type="button" id="vkvsy-tema-kaydet"
            class="button button-primary button-large"
            data-dosya="<?php echo esc_attr($duzenle); ?>"
            data-action="vkvsy_kaydet_tema_dosya"
            data-onizleme="<?php echo esc_url($onizleme_url); ?>">
      💾 Kaydet
    </button>
    <button type="button" id="vkvsy-kaydet-onizle" class="button button-large" title="Kaydet ve önizlemeyi yenile" style="margin-left:6px">
      💾 + 🔍 Kaydet & Önizle
    </button>
    <span id="vkvsy-tema-msg" class="vkvsy-msg" style="margin-left:12px"></span>
    <span style="margin-left:auto;font-size:12px;color:#666">
      <?php echo esc_html(round(filesize($hedef)/1024, 1)); ?> KB
      · <?php echo date_i18n('d.m.Y H:i', filemtime($hedef)); ?>
    </span>
  </div>
</div>

<script>
jQuery(function($){
  /* ── Kaydet fonksiyonu ── */
  function kaydet(callback) {
    var btn = $('#vkvsy-tema-kaydet');
    var msg = $('#vkvsy-tema-msg');
    var icerik = window.vkvsyEditor ? window.vkvsyEditor.getValue() : $('#vkvsy-editor').val();
    btn.prop('disabled',true).text('Kaydediliyor…');
    $('#vkvsy-kaydet-onizle').prop('disabled',true);
    msg.text('').css('color','');
    $.post(VKVSYData.ajax_url, {
      action : btn.data('action'),
      nonce  : VKVSYData.nonce,
      dosya  : btn.data('dosya'),
      icerik : icerik
    }, function(r){
      btn.prop('disabled',false).text('💾 Kaydet');
      $('#vkvsy-kaydet-onizle').prop('disabled',false);
      if(r.success){
        msg.css('color','#16a34a').text('✅ ' + r.data);
        if(typeof callback === 'function') callback();
      } else {
        msg.css('color','#dc2626').text('❌ ' + r.data);
      }
    }).fail(function(){
      btn.prop('disabled',false).text('💾 Kaydet');
      $('#vkvsy-kaydet-onizle').prop('disabled',false);
      msg.css('color','#dc2626').text('❌ Sunucu hatası');
    });
  }

  /* ── Önizlemeyi yenile ── */
  function onizle_yenile() {
    var $ifr = $('#vkvsy-onizleme');
    if ($ifr.length && !$('#vkvsy-preview-pane').hasClass('gizli')) {
      var src = $ifr.attr('src');
      $ifr.attr('src', '');
      setTimeout(function(){ $ifr.attr('src', src); }, 80);
    }
  }

  /* ── Sadece Kaydet ── */
  $('#vkvsy-tema-kaydet').on('click', function(){ kaydet(); });

  /* ── Kaydet & Önizle ── */
  $('#vkvsy-kaydet-onizle').on('click', function(){
    /* Önizleme kapalıysa aç */
    if ($('#vkvsy-preview-pane').hasClass('gizli')) {
      acik_kapat_onizleme(true);
    }
    kaydet(function(){ onizle_yenile(); });
  });

  /* ── Bölünmüş görünüm toggle ── */
  function acik_kapat_onizleme(zorla_ac) {
    var $wrap  = $('#vkvsy-split-wrap');
    var $pane  = $('#vkvsy-preview-pane');
    var $btn   = $('#vkvsy-split-toggle');
    var acik   = !$pane.hasClass('gizli');
    if (zorla_ac === true) acik = false; // her zaman aç

    if (acik) {
      $pane.addClass('gizli');
      $wrap.addClass('tek');
      $btn.removeClass('aktif').text('⬜ Bölünmüş Görünüm');
      if (window.vkvsyEditor) setTimeout(function(){ window.vkvsyEditor.refresh(); }, 50);
    } else {
      $pane.removeClass('gizli');
      $wrap.removeClass('tek');
      $btn.addClass('aktif').html('◧ Önizleme Açık');
      if (window.vkvsyEditor) setTimeout(function(){ window.vkvsyEditor.refresh(); }, 50);
    }
  }

  $('#vkvsy-split-toggle').on('click', function(){ acik_kapat_onizleme(); });
});
</script>
        <?php
    } else {
        /* ── Dosya listesi modu ── */
        // Kök PHP dosyaları
        $kok_dosyalar = array_filter(glob($tema_dir . '/*.php'), function($f){
            return basename($f) !== 'page.php'; // page.php ayrıca şablonlarda
        });
        // Sayfa şablonları
        $sablon_dosyalar = glob($tema_dir . '/page*.php') ?: array();
        // Inc/ alt klasörü
        $inc_dosyalar = glob($tema_dir . '/inc/*.php') ?: array();

        sort($kok_dosyalar); sort($sablon_dosyalar); sort($inc_dosyalar);

        function vkvsy_dosya_satir($dosya, $tema_dir, $relative_prefix = '') {
            $ad     = $relative_prefix . basename($dosya);
            $boyut  = file_exists($dosya) ? round(filesize($dosya)/1024, 1) . ' KB' : '—';
            $mtime  = file_exists($dosya) ? date_i18n('d.m.Y H:i', filemtime($dosya)) : '—';
            // Template Name varsa göster
            $sablon_adi = '';
            if (file_exists($dosya)) {
                $kisa = file_get_contents($dosya, false, null, 0, 300);
                if (preg_match('/Template Name:\s*(.+)/i', $kisa, $m)) {
                    $sablon_adi = '<span style="color:#059669;font-size:11px"> — '.esc_html(trim($m[1])).'</span>';
                }
            }
            $url = admin_url('admin.php?page=vkv-sy-tema-duzenle&dosya=' . urlencode($ad));
            echo '<tr><td><code style="font-size:12px">' . esc_html($ad) . '</code>' . $sablon_adi . '</td>';
            echo '<td>' . esc_html($boyut) . '</td><td>' . esc_html($mtime) . '</td>';
            echo '<td><a href="' . esc_url($url) . '" class="button button-small">✏️ Düzenle</a></td></tr>';
        }
        ?>
<div class="vkvsy-card">
  <h2 class="vkvsy-kart-baslik">🛠️ Tema Dosyaları Düzenleyici</h2>
  <p style="color:#666;margin-bottom:20px">
    Tema klasöründeki tüm PHP dosyalarını doğrudan düzenleyin. Değişiklikler anında aktif olur.
  </p>

  <!-- Kök dosyalar -->
  <h3 style="border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:12px">📁 Kök Dosyalar
    <span style="font-size:13px;font-weight:normal;color:#666;margin-left:8px">(<?php echo count($kok_dosyalar); ?> dosya)</span>
  </h3>
  <div class="vkvsy-sablon-tablo-wrap" style="margin-bottom:28px">
  <table class="widefat vkvsy-sablon-tablo">
    <thead><tr><th>Dosya</th><th>Boyut</th><th>Güncelleme</th><th>İşlem</th></tr></thead>
    <tbody>
    <?php foreach ($kok_dosyalar as $d): vkvsy_dosya_satir($d, $tema_dir); endforeach; ?>
    </tbody>
  </table>
  </div>

  <!-- Sayfa Şablonları -->
  <h3 style="border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:12px">📄 Sayfa Şablonları
    <span style="font-size:13px;font-weight:normal;color:#666;margin-left:8px">(<?php echo count($sablon_dosyalar); ?> dosya)</span>
  </h3>
  <div class="vkvsy-sablon-tablo-wrap" style="margin-bottom:28px">
  <table class="widefat vkvsy-sablon-tablo">
    <thead><tr><th>Dosya</th><th>Boyut</th><th>Güncelleme</th><th>İşlem</th></tr></thead>
    <tbody>
    <?php foreach ($sablon_dosyalar as $d): vkvsy_dosya_satir($d, $tema_dir); endforeach; ?>
    </tbody>
  </table>
  </div>

  <!-- inc/ Dosyaları -->
  <h3 style="border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:12px">⚙️ inc/ Klasörü
    <span style="font-size:13px;font-weight:normal;color:#666;margin-left:8px">(<?php echo count($inc_dosyalar); ?> dosya)</span>
  </h3>
  <div class="vkvsy-sablon-tablo-wrap">
  <table class="widefat vkvsy-sablon-tablo">
    <thead><tr><th>Dosya</th><th>Boyut</th><th>Güncelleme</th><th>İşlem</th></tr></thead>
    <tbody>
    <?php foreach ($inc_dosyalar as $d): vkvsy_dosya_satir($d, $tema_dir, 'inc/'); endforeach; ?>
    </tbody>
  </table>
  </div>
</div>
        <?php
    }
    vkvsy_admin_footer();
}

/* ─── TAB 4: YENİ ŞABLON OLUŞTUR ────────────────────── */
function vkvsy_yeni_sablon_render() {
    vkvsy_admin_header('Yeni Şablon');
    $bloklar = array(
        'hero'      => array('🦸','Hero Bölümü',        'Koyu arka plan, başlık, eylem butonu, istatistik'),
        'info_grid' => array('🃏','Bilgi Kartları (4lü)','İkon + başlık + açıklama kartları'),
        'timeline'  => array('📅','Kronoloji / Timeline','Dikey zaman tüneli'),
        'kisi'      => array('👥','Kişi/Ekip Kartları', '4 kolonlu kişi ızgarası'),
        'lider'     => array('🏆','Biyografi Kartları', 'Türk büyükleri / liderler'),
        'flag'      => array('🚩','Bayrak/Bölge Griди','Ülke veya şehir kartları'),
        'deger'     => array('⭐','Değer Kartları',      '3 kolonlu değer/ilke kartları'),
        'blog'      => array('📰','Blog Yazıları',       'Kategori filtreli son yazılar'),
        'profil'    => array('👤','Kişi Profili',        'Büyük profil layout (260px + içerik)'),
        'alinti'    => array('💬','Alıntı Bandı',        'Koyu arka plan, italik alıntı'),
        'cta'       => array('🎯','CTA / Eylem Bandı',  'Başlık + 2 buton'),
        'subnav'    => array('🗂️','Altmenü Sekmeleri',   'Yatay kaydırmalı alt navigasyon'),
    );
    ?>
<div class="vkvsy-card">
  <h2 class="vkvsy-kart-baslik">➕ Yeni Sayfa Şablonu Oluştur</h2>
  <p style="color:#666;margin-bottom:24px">Hazır blokları seçin, şablonunuz otomatik oluşturulsun.</p>

  <div class="vkvsy-yeni-form">
    <div class="vkvsy-form-row">
      <label class="vkvsy-form-label">Şablon Adı (WordPress'te görünür):</label>
      <input type="text" id="vy-sablon-adi" placeholder="Örn: Şehit Listesi" class="regular-text">
    </div>
    <div class="vkvsy-form-row">
      <label class="vkvsy-form-label">Dosya Adı:</label>
      <div style="display:flex;align-items:center;gap:8px">
        <code style="font-size:14px;color:#666">page-</code>
        <input type="text" id="vy-dosya-adi" placeholder="sehit-listesi" class="regular-text" style="width:280px">
        <code style="font-size:14px;color:#666">.php</code>
      </div>
    </div>
    <div class="vkvsy-form-row">
      <label class="vkvsy-form-label">Hero Başlığı:</label>
      <input type="text" id="vy-hero-baslik" placeholder="Sayfa başlığı" class="regular-text">
    </div>
    <div class="vkvsy-form-row">
      <label class="vkvsy-form-label">Hero Açıklaması:</label>
      <input type="text" id="vy-hero-aciklama" placeholder="Kısa açıklama" class="large-text">
    </div>

    <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#1e293b;margin:24px 0 12px">Eklenecek Bölümler:</h3>
    <div class="vkvsy-blok-secim-grid">
      <?php foreach ($bloklar as $key => $blok): ?>
      <label class="vkvsy-blok-kart">
        <input type="checkbox" name="blok[]" value="<?php echo esc_attr($key); ?>"
               <?php echo in_array($key, array('hero','info_grid','blog')) ? 'checked' : ''; ?>>
        <div class="vkvsy-blok-icerik">
          <div class="vkvsy-blok-em"><?php echo $blok[0]; ?></div>
          <div class="vkvsy-blok-ad"><?php echo esc_html($blok[1]); ?></div>
          <div class="vkvsy-blok-acik"><?php echo esc_html($blok[2]); ?></div>
        </div>
      </label>
      <?php endforeach; ?>
    </div>

    <div class="vkvsy-action-bar">
      <button type="button" id="vkvsy-sablon-olustur" class="button button-primary button-large">⚡ Şablonu Oluştur ve Kaydet</button>
      <span id="vkvsy-yeni-msg" class="vkvsy-msg"></span>
    </div>
  </div>

  <!-- Önizleme alanı -->
  <div id="vkvsy-yeni-onizleme" style="display:none;margin-top:24px">
    <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#1e293b;margin-bottom:10px">📋 Oluşturulan Kod Önizlemesi:</h3>
    <textarea id="vkvsy-yeni-kod" style="width:100%;min-height:400px;font-family:'Courier New',monospace;font-size:12px" readonly></textarea>
  </div>
</div>
    <?php vkvsy_admin_footer();
}

/* ─── TAB 5: İÇERİK DÜZENLE (Hızlı Erişim, Bandlar, Söz) ── */
function vkvsy_hizli_erisim_render() {
    $hizli_json = get_option('vkv_hizli_erisim_items','');
    $hizli = $hizli_json ? json_decode($hizli_json, true) : array(
        array('🎖️','Şehitlerimiz','/sehitlerimiz'),
        array('🏅','Gazilerimiz','/gazilerimiz'),
        array('📜','Türk Tarihi','/turk-tarihi'),
        array('⚔️','Kurtuluş Savaşı','/kurtulus-savasi'),
        array('🌹','Çanakkale','/canakkale-savasi'),
        array('🛡️','Sosyal Hizmetler','/sosyal-hizmetler'),
        array('🎓','Burs Programı','/burs'),
        array('⭐','Atatürk','/ataturk'),
        array('📰','Haberler','/haberler'),
        array('📅','Etkinlikler','/etkinlikler'),
        array('💝','Bağış Yapın','/bagis'),
        array('📞','İletişim','/iletisim'),
    );
    vkvsy_admin_header('İçerik');
    ?>
<div class="vkvsy-card">
  <h2 class="vkvsy-kart-baslik">⚡ Hızlı Erişim Bağlantıları</h2>
  <p style="color:#666;margin-bottom:16px">Anasayfadaki Hızlı Erişim butonlarını düzenleyin. Sürükleyerek sıralayın.</p>

  <div id="vkvsy-hizli-liste" class="vkvsy-modul-liste">
    <?php foreach ($hizli as $idx => $item): ?>
    <div class="vkvsy-modul-item vkvsy-hizli-item" data-idx="<?php echo $idx; ?>">
      <div class="vkvsy-modul-handle">⠿</div>
      <input type="text" class="vkvsy-hizli-ikon" value="<?php echo esc_attr($item[0]); ?>" placeholder="Emoji" style="width:50px;text-align:center;font-size:16px">
      <input type="text" class="vkvsy-hizli-etiket" value="<?php echo esc_attr($item[1]); ?>" placeholder="Etiket" style="flex:1">
      <input type="text" class="vkvsy-hizli-url" value="<?php echo esc_attr($item[2]); ?>" placeholder="/slug" style="width:200px">
      <button type="button" class="vkvsy-sil-btn button" title="Sil">🗑️</button>
    </div>
    <?php endforeach; ?>
  </div>
  <div style="margin-top:10px">
    <button type="button" id="vkvsy-hizli-ekle" class="button">+ Yeni Ekle</button>
  </div>

  <hr style="margin:28px 0">
  <h3 class="vkvsy-kart-baslik" style="font-size:14px">🛡️ Kahramanlar Bandı</h3>
  <table class="form-table"><tbody>
    <tr><th>Başlık:</th><td><input type="text" id="vkvsy-kb-baslik" class="regular-text" value="<?php echo esc_attr(get_option('vkv_kahraman_band_baslik','Kahramanlarımıza Saygı')); ?>"></td></tr>
    <tr><th>Açıklama:</th><td><input type="text" id="vkvsy-kb-aciklama" class="large-text" value="<?php echo esc_attr(get_option('vkv_kahraman_band_aciklama','Şehitlerimiz ve gazilerimiz Türk milletinin en büyük onurudur. Hatıralarını yaşatıyoruz.')); ?>"></td></tr>
  </tbody></table>

  <h3 class="vkvsy-kart-baslik" style="font-size:14px">💬 Söz Bandı</h3>
  <table class="form-table"><tbody>
    <tr><th>Söz:</th><td><textarea id="vkvsy-soz-metin" class="large-text" rows="2"><?php echo esc_textarea(get_option('vkv_soz_band_metin','Büyük davamız, en medeni ve en müreffeh millet olarak varlığımızı yükseltmek ve bu konumu korumaktır.')); ?></textarea></td></tr>
    <tr><th>Kaynak:</th><td><input type="text" id="vkvsy-soz-kaynak" class="regular-text" value="<?php echo esc_attr(get_option('vkv_soz_band_kaynak','Mustafa Kemal ATATÜRK')); ?>"></td></tr>
  </tbody></table>

  <h3 class="vkvsy-kart-baslik" style="font-size:14px">💝 Bağış Bölümü</h3>
  <table class="form-table"><tbody>
    <tr><th>Başlık:</th><td><input type="text" id="vkvsy-bagis-baslik" class="regular-text" value="<?php echo esc_attr(get_option('vkv_bagis_baslik','Vatana Destek Ol')); ?>"></td></tr>
    <tr><th>Açıklama:</th><td><textarea id="vkvsy-bagis-aciklama" class="large-text" rows="2"><?php echo esc_textarea(get_option('vkv_bagis_aciklama','Şehit aileleri, gaziler ve vatanseverlere yönelik çalışmalarımızı sürdürebilmek için sizin desteğinize ihtiyaç duyuyoruz.')); ?></textarea></td></tr>
  </tbody></table>

  <div class="vkvsy-action-bar">
    <button type="button" id="vkvsy-hizli-kaydet" class="button button-primary button-large">💾 Tüm İçerikleri Kaydet</button>
    <span id="vkvsy-hizli-msg" class="vkvsy-msg"></span>
  </div>
</div>
    <?php vkvsy_admin_footer();
}

/* ═══════════════════════════════════════════════════════════
   6. YENİ ŞABLON OLUŞTURUCU (AJAX — PHP kod üretimi)
═══════════════════════════════════════════════════════════ */
add_action('wp_ajax_vkvsy_olustur_sablon', 'vkvsy_ajax_olustur_sablon');
function vkvsy_ajax_olustur_sablon() {
    check_ajax_referer('vkvsy_nonce','nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Yetki yok');

    $sablon_adi  = sanitize_text_field($_POST['sablon_adi'] ?? 'Yeni Sayfa');
    $dosya_adi   = sanitize_file_name($_POST['dosya_adi'] ?? 'yeni-sayfa');
    $hero_baslik = sanitize_text_field($_POST['hero_baslik'] ?? $sablon_adi);
    $hero_acik   = sanitize_text_field($_POST['hero_aciklama'] ?? '');
    $bloklar     = array_map('sanitize_text_field', $_POST['bloklar'] ?? array());
    $dosya       = 'page-' . $dosya_adi . '.php';

    $kod  = "<?php\n/**\n * Template Name: " . $sablon_adi . "\n */\n";
    $kod .= "tukav_init_page(); get_header(); tukav_override(); tukav_base_css();\n?>\n\n";

    foreach ($bloklar as $blok) {
        switch ($blok) {
            case 'hero':
                $kod .= "<!-- HERO -->\n<div class=\"tp-hero\">\n  <div class=\"tp-hero-w\">\n    <div>\n      <div class=\"tp-eyebrow\"><i class=\"fa fa-shield-alt\"></i> " . esc_html($sablon_adi) . "</div>\n      <h1 class=\"tp-h1\">" . esc_html($hero_baslik) . "</h1>\n      <p class=\"tp-hdesc\">" . esc_html($hero_acik) . "</p>\n    </div>\n    <div class=\"tp-hero-stats\">\n      <div class=\"tp-stat\"><div class=\"tp-stat-n\">—</div><div class=\"tp-stat-l\">İstatistik 1</div></div>\n      <div class=\"tp-stat\"><div class=\"tp-stat-n\">—</div><div class=\"tp-stat-l\">İstatistik 2</div></div>\n    </div>\n  </div>\n</div>\n\n";
                break;
            case 'subnav':
                $kod .= "<!-- ALTMENÜ -->\n<div class=\"tp-subnav\">\n  <div class=\"tp-subnav-w\">\n    <a href=\"#bolum1\" class=\"aktif\">Bölüm 1</a>\n    <a href=\"#bolum2\">Bölüm 2</a>\n    <a href=\"#bolum3\">Bölüm 3</a>\n  </div>\n</div>\n\n";
                break;
            case 'info_grid':
                $kod .= "<!-- BİLGİ KARTLARI -->\n<div class=\"tp-sec\">\n  <div class=\"tp-sec-w\">\n    <div class=\"tp-sec-hd\">\n      <span class=\"tp-badge tq\"><i class=\"fa fa-info-circle\"></i> Bilgi</span>\n      <h2 class=\"tp-sec-title\">Başlık</h2>\n      <p class=\"tp-sec-sub\">Açıklama metni buraya.</p>\n    </div>\n    <div class=\"tp-grid tp-g4\">\n      <?php\n      \$kartlar = array(\n        array('tq','fa-star','Kart 1','Açıklama 1'),\n        array('altin','fa-medal','Kart 2','Açıklama 2'),\n        array('kirmizi','fa-shield-alt','Kart 3','Açıklama 3'),\n        array('yesil','fa-heart','Kart 4','Açıklama 4'),\n      );\n      foreach(\$kartlar as \$k): ?>\n      <div class=\"tp-card\">\n        <div class=\"tp-card-top <?php echo \$k[0]; ?>\"></div>\n        <div class=\"tp-card-body\">\n          <div class=\"tp-card-icon <?php echo \$k[0]; ?>\"><i class=\"fa <?php echo \$k[2]; ?>\"></i></div>\n          <div class=\"tp-card-title\"><?php echo \$k[2]; ?></div>\n          <div class=\"tp-card-desc\"><?php echo \$k[3]; ?></div>\n        </div>\n      </div>\n      <?php endforeach; ?>\n    </div>\n  </div>\n</div>\n\n";
                break;
            case 'timeline':
                $kod .= "<!-- KRONOLOJİ -->\n<div class=\"tp-sec\">\n  <div class=\"tp-sec-w\">\n    <h2 class=\"tp-sec-title\">Kronoloji</h2>\n    <div class=\"tp-timeline\">\n      <div class=\"tp-tl-item\"><div class=\"tp-tl-dot\">🌟</div><div class=\"tp-tl-body\"><div class=\"tp-tl-year\">1920</div><div class=\"tp-tl-title\">Önemli Olay</div><div class=\"tp-tl-desc\">Açıklama metni buraya gelecek.</div></div></div>\n      <div class=\"tp-tl-item\"><div class=\"tp-tl-dot\">⚔️</div><div class=\"tp-tl-body\"><div class=\"tp-tl-year\">1923</div><div class=\"tp-tl-title\">İkinci Olay</div><div class=\"tp-tl-desc\">Açıklama metni buraya gelecek.</div></div></div>\n    </div>\n  </div>\n</div>\n\n";
                break;
            case 'kisi':
                $kod .= "<!-- KİŞİ KARTLARI -->\n<div class=\"tp-sec\">\n  <div class=\"tp-sec-w\">\n    <h2 class=\"tp-sec-title\">Ekibimiz</h2>\n    <div class=\"tp-kisi-grid\">\n      <?php\n      \$kisiler = array(\n        array('👤','Ad Soyad','Unvan','Açıklama'),\n      );\n      foreach(\$kisiler as \$k): ?>\n      <div class=\"tp-kisi\">\n        <div class=\"tp-kisi-avatar\"><?php echo \$k[0]; ?></div>\n        <div class=\"tp-kisi-ad\"><?php echo \$k[1]; ?></div>\n        <div class=\"tp-kisi-unv\"><?php echo \$k[2]; ?></div>\n        <div class=\"tp-kisi-detay\"><?php echo \$k[3]; ?></div>\n      </div>\n      <?php endforeach; ?>\n    </div>\n  </div>\n</div>\n\n";
                break;
            case 'lider':
                $kod .= "<!-- BİYOGRAFİ KARTLARI -->\n<div class=\"tp-sec\">\n  <div class=\"tp-sec-w\">\n    <h2 class=\"tp-sec-title\">Liderlerimiz</h2>\n    <div class=\"tp-lider-grid\">\n      <?php\n      \$liderler = array(\n        array('🦅','Dönem','Ad Soyad','Alt bilgi','Devlet/Kurum','Açıklama'),\n      );\n      foreach(\$liderler as \$l): ?>\n      <div class=\"tp-lider\">\n        <div class=\"tp-lider-ust\">\n          <div class=\"tp-lider-em\"><?php echo \$l[0]; ?></div>\n          <div class=\"tp-lider-don\"><?php echo \$l[1]; ?></div>\n          <div class=\"tp-lider-ad\"><?php echo \$l[2]; ?></div>\n          <div class=\"tp-lider-alt\"><?php echo \$l[3]; ?></div>\n        </div>\n        <div class=\"tp-lider-body\">\n          <div class=\"tp-lider-devlet\"><?php echo \$l[4]; ?></div>\n          <div class=\"tp-lider-detay\"><?php echo \$l[5]; ?></div>\n        </div>\n      </div>\n      <?php endforeach; ?>\n    </div>\n  </div>\n</div>\n\n";
                break;
            case 'flag':
                $kod .= "<!-- BAYRAK KARTLARI -->\n<div class=\"tp-sec\">\n  <div class=\"tp-sec-w\">\n    <h2 class=\"tp-sec-title\">Bölgeler</h2>\n    <div class=\"tp-flag-grid\">\n      <?php\n      \$bolgeler = array(\n        array('🇹🇷','Türkiye','Ankara'),\n        array('🌍','Diğer','Şehir'),\n      );\n      foreach(\$bolgeler as \$b): ?>\n      <div class=\"tp-flag-card\">\n        <div class=\"tp-flag-em\"><?php echo \$b[0]; ?></div>\n        <div class=\"tp-flag-name\"><?php echo \$b[1]; ?></div>\n        <div class=\"tp-flag-baskent\"><?php echo \$b[2]; ?></div>\n      </div>\n      <?php endforeach; ?>\n    </div>\n  </div>\n</div>\n\n";
                break;
            case 'deger':
                $kod .= "<!-- DEĞER KARTLARI -->\n<div class=\"tp-sec\">\n  <div class=\"tp-sec-w\">\n    <h2 class=\"tp-sec-title\">Değerlerimiz</h2>\n    <div class=\"tp-deger-grid\">\n      <?php\n      \$degerler = array(\n        array('🎯','Değer 1','Açıklama 1'),\n        array('⭐','Değer 2','Açıklama 2'),\n        array('🛡️','Değer 3','Açıklama 3'),\n      );\n      foreach(\$degerler as \$d): ?>\n      <div class=\"tp-deger\">\n        <div class=\"tp-deger-em\"><?php echo \$d[0]; ?></div>\n        <div class=\"tp-deger-title\"><?php echo \$d[1]; ?></div>\n        <div class=\"tp-deger-desc\"><?php echo \$d[2]; ?></div>\n      </div>\n      <?php endforeach; ?>\n    </div>\n  </div>\n</div>\n\n";
                break;
            case 'blog':
                $kod .= "<!-- BLOG YAZILARI -->\n<div class=\"tp-blog-sec\">\n  <div class=\"tp-blog-sec-w\">\n    <div class=\"tp-blog-hd\">\n      <div class=\"tp-blog-hd-bar\"></div>\n      <h3>İlgili Yazılar</h3>\n    </div>\n    <?php echo tukav_blog_box('','Tüm Yazılar',3); ?>\n  </div>\n</div>\n\n";
                break;
            case 'profil':
                $kod .= "<!-- KİŞİ PROFİLİ -->\n<div class=\"tp-sec\">\n  <div class=\"tp-sec-w\">\n    <div class=\"tp-profil-wrap\">\n      <div class=\"tp-profil-sol\">\n        <div class=\"tp-profil-foto\">👤</div>\n        <div class=\"tp-profil-ad\">Ad Soyad</div>\n        <div class=\"tp-profil-unv\">Unvan</div>\n        <span class=\"tp-profil-rozet\">Görev</span>\n      </div>\n      <div class=\"tp-profil-metin\">\n        <p>Biyografi ve detaylı açıklama metni buraya gelecek.</p>\n      </div>\n    </div>\n  </div>\n</div>\n\n";
                break;
            case 'alinti':
                $kod .= "<!-- ALINTI BANDI -->\n<div class=\"tp-quote-band\">\n  <div class=\"tp-quote-band-w\">\n    <p class=\"tp-q-text\">\"Alıntı metni buraya gelecek.\"</p>\n    <div class=\"tp-q-src\">Kaynak</div>\n  </div>\n</div>\n\n";
                break;
            case 'cta':
                $kod .= "<!-- CTA BANDI -->\n<div class=\"tp-cta\">\n  <div class=\"tp-cta-w\">\n    <div class=\"tp-cta-txt\"><h3>Harekete Geçin</h3><p>Açıklama metni buraya gelecek.</p></div>\n    <div class=\"tp-cta-btns\">\n      <a href=\"#\" class=\"tp-btn beyaz\">Birincil Eylem</a>\n      <a href=\"#\" class=\"tp-btn saydam\">İkincil Eylem</a>\n    </div>\n  </div>\n</div>\n\n";
                break;
        }
    }

    $kod .= "<?php get_footer(); ?>\n";

    // Dosyayı kaydet
    $hedef = get_template_directory() . '/' . $dosya;
    global $wp_filesystem;
    if (empty($wp_filesystem)) { require_once ABSPATH.'wp-admin/includes/file.php'; WP_Filesystem(); }
    $wp_filesystem->put_contents($hedef, $kod, FS_CHMOD_FILE);

    wp_send_json_success(array('dosya' => $dosya, 'kod' => $kod));
}

/* ═══════════════════════════════════════════════════════════
   7. MANŞET AYARLARI
═══════════════════════════════════════════════════════════ */

// Manşet ayarları kaydet (AJAX)
add_action('wp_ajax_vkvsy_kaydet_manseta', 'vkvsy_ajax_kaydet_manseta');
function vkvsy_ajax_kaydet_manseta() {
    check_ajax_referer('vkvsy_nonce', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Yetki yok');

    // Kategori ID'leri (virgülle ayrılmış)
    $kat_ids = implode(',', array_filter(array_map('intval', explode(',', $_POST['kategori_ids'] ?? ''))));
    update_option('vkv_manseta_kategoriler', sanitize_text_field($kat_ids));

    // Sabitlenmiş haber ID'leri
    $post_ids = implode(',', array_filter(array_map('intval', explode(',', $_POST['sabitli_ids'] ?? ''))));
    update_option('vkv_manseta_sabitli', sanitize_text_field($post_ids));

    wp_send_json_success('Manşet ayarları kaydedildi');
}

// Manşet ayarları sayfası
function vkvsy_manseta_render() {
    if (!current_user_can('manage_options')) return;

    // Kategorileri çek
    $tum_kategoriler = get_categories(array('hide_empty' => false, 'orderby' => 'name', 'order' => 'ASC'));
    $aktif_kat_ids   = array_filter(array_map('intval', explode(',', get_option('vkv_manseta_kategoriler', ''))));
    $sabitli_ids     = array_filter(array_map('intval', explode(',', get_option('vkv_manseta_sabitli', ''))));

    // Son 50 haberi çek (manşet sabitleme için seçim)
    $son_haberler = get_posts(array('post_type'=>'post','post_status'=>'publish','numberposts'=>50,'orderby'=>'date','order'=>'DESC'));

    vkvsy_admin_header('📰 Manşet Ayarları', 'Anasayfa manşet kategorilerini ve sabitlenmiş haberleri yönetin');
    ?>
<div class="vkvsy-wrap">

  <!-- BİLGİ KUTUSU -->
  <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:14px 18px;margin-bottom:20px;font-size:13px;color:#0369a1;">
    <strong>📰 Manşet Sistemi:</strong> Anasayfadaki haber bölümü, seçtiğiniz kategorilere göre filtre sekmeleri gösterir.
    Belirli haberleri <strong>✦ Manşet</strong> etiketiyle sabitleyerek her zaman üstte gösterebilirsiniz.
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

    <!-- SOL: KATEGORİ SEÇİMİ -->
    <div class="vkvsy-card">
      <div class="vkvsy-card-head">
        <h3>🏷️ Manşet Sekme Kategorileri</h3>
        <p>Seçtiğiniz kategoriler, anasayfa manşeti üstünde filtre sekmeleri olarak görünür. Boş bırakırsanız en çok haberli 6 kategori otomatik gösterilir.</p>
      </div>
      <div class="vkvsy-card-body">
        <div id="vkvsy-kat-listesi" style="display:flex;flex-direction:column;gap:6px;max-height:320px;overflow-y:auto;padding-right:4px">
          <?php foreach ($tum_kategoriler as $kat): ?>
          <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:<?php echo in_array($kat->term_id, $aktif_kat_ids) ? '#fff5f5' : '#f9fafb'; ?>;border:1px solid <?php echo in_array($kat->term_id, $aktif_kat_ids) ? '#fca5a5' : '#e2e8f0'; ?>;border-radius:4px;cursor:pointer;transition:all .2s" class="vkvsy-kat-item">
            <input type="checkbox" class="vkvsy-kat-chk" value="<?php echo intval($kat->term_id); ?>"
              <?php checked(in_array($kat->term_id, $aktif_kat_ids)); ?> style="accent-color:#8B1A1A">
            <span style="flex:1;font-size:13px;font-weight:500;color:#0f172a"><?php echo esc_html($kat->name); ?></span>
            <span style="font-size:11px;color:#94a3b8;background:#f1f5f9;padding:1px 7px;border-radius:10px"><?php echo intval($kat->count); ?> yazı</span>
          </label>
          <?php endforeach; ?>
        </div>
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0">
          <button type="button" id="vkvsy-manseta-kat-kaydet" class="button button-primary">💾 Kategorileri Kaydet</button>
          <span id="vkvsy-manseta-kat-msg" class="vkvsy-msg" style="margin-left:10px"></span>
        </div>
      </div>
    </div>

    <!-- SAĞ: SABİT HABERLER -->
    <div class="vkvsy-card">
      <div class="vkvsy-card-head">
        <h3>✦ Manşete Sabitlenen Haberler</h3>
        <p>İşaretlediğiniz haberler, <strong>Tümü</strong> sekmesinde en üste sabitlenir ve <strong>✦ Manşet</strong> etiketi alır. Maksimum 3 haber öneririz.</p>
      </div>
      <div class="vkvsy-card-body">
        <input type="text" id="vkvsy-haber-ara" placeholder="🔍 Haber adı ile ara..." style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:4px;margin-bottom:10px;font-size:13px">
        <div id="vkvsy-haber-listesi" style="display:flex;flex-direction:column;gap:5px;max-height:280px;overflow-y:auto;padding-right:4px">
          <?php foreach ($son_haberler as $p): ?>
          <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:<?php echo in_array($p->ID, $sabitli_ids) ? '#fff5f5' : '#f9fafb'; ?>;border:1px solid <?php echo in_array($p->ID, $sabitli_ids) ? '#fca5a5' : '#e2e8f0'; ?>;border-radius:4px;cursor:pointer;transition:all .15s" class="vkvsy-haber-item" data-title="<?php echo esc_attr(strtolower($p->post_title)); ?>">
            <input type="checkbox" class="vkvsy-pin-chk" value="<?php echo intval($p->ID); ?>"
              <?php checked(in_array($p->ID, $sabitli_ids)); ?> style="accent-color:#8B1A1A">
            <div style="flex:1;min-width:0">
              <div style="font-size:12.5px;font-weight:500;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><?php echo esc_html($p->post_title); ?></div>
              <div style="font-size:10.5px;color:#94a3b8;margin-top:1px"><?php echo get_the_date('d.m.Y', $p->ID); ?></div>
            </div>
            <?php if (in_array($p->ID, $sabitli_ids)): ?>
            <span style="font-size:9px;font-weight:700;color:#d97706;background:#fef3c7;padding:1px 6px;border-radius:3px;white-space:nowrap">✦ Sabitli</span>
            <?php endif; ?>
          </label>
          <?php endforeach; ?>
        </div>
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:12px">
          <button type="button" id="vkvsy-manseta-pin-kaydet" class="button button-primary">✦ Sabitlemeleri Kaydet</button>
          <span id="vkvsy-manseta-pin-msg" class="vkvsy-msg"></span>
        </div>
      </div>
    </div>

  </div><!-- /grid -->

  <!-- ÖN İZLEME BİLGİSİ -->
  <div style="margin-top:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px 20px">
    <h4 style="margin:0 0 10px;font-size:13px;color:#0f172a">📋 Mevcut Manşet Durumu</h4>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      <?php
      $aktif_katlar = empty($aktif_kat_ids)
        ? get_categories(array('hide_empty'=>true,'number'=>6,'orderby'=>'count','order'=>'DESC'))
        : get_categories(array('include'=>$aktif_kat_ids,'hide_empty'=>false));
      foreach ($aktif_katlar as $k):
      ?>
      <span style="background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:4px 12px;font-size:12px;color:#0f172a">🏷️ <?php echo esc_html($k->name); ?></span>
      <?php endforeach; ?>
    </div>
    <?php if (!empty($sabitli_ids)): ?>
    <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px">
      <?php foreach ($sabitli_ids as $pid):
        $pt = get_post($pid);
        if (!$pt) continue;
      ?>
      <span style="background:#fff5f5;border:1px solid #fca5a5;border-radius:20px;padding:4px 12px;font-size:12px;color:#8B1A1A">✦ <?php echo esc_html(wp_trim_words($pt->post_title, 5, '…')); ?></span>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>
  </div>

</div><!-- /vkvsy-wrap -->

<script>
jQuery(function($){
  // Kategori kaydet
  $('#vkvsy-manseta-kat-kaydet').on('click', function(){
    var ids = [];
    $('.vkvsy-kat-chk:checked').each(function(){ ids.push($(this).val()); });
    $.post(VKVSYData.ajax_url, {
      action: 'vkvsy_kaydet_manseta', nonce: VKVSYData.nonce,
      kategori_ids: ids.join(','),
      sabitli_ids: (function(){ var s=[]; $('.vkvsy-pin-chk:checked').each(function(){ s.push($(this).val()); }); return s.join(','); })()
    }, function(r){ $('#vkvsy-manseta-kat-msg').text(r.success ? '✅ Kaydedildi' : '❌ Hata').fadeIn().delay(2500).fadeOut(); });
  });

  // Sabitleme kaydet
  $('#vkvsy-manseta-pin-kaydet').on('click', function(){
    var ids = [];
    $('.vkvsy-pin-chk:checked').each(function(){ ids.push($(this).val()); });
    $.post(VKVSYData.ajax_url, {
      action: 'vkvsy_kaydet_manseta', nonce: VKVSYData.nonce,
      kategori_ids: (function(){ var c=[]; $('.vkvsy-kat-chk:checked').each(function(){ c.push($(this).val()); }); return c.join(','); })(),
      sabitli_ids: ids.join(',')
    }, function(r){ $('#vkvsy-manseta-pin-msg').text(r.success ? '✅ Kaydedildi' : '❌ Hata').fadeIn().delay(2500).fadeOut(); });
  });

  // Checkbox label renk güncelle
  $('.vkvsy-kat-chk, .vkvsy-pin-chk').on('change', function(){
    var lbl = $(this).closest('label');
    if ($(this).is(':checked')) {
      lbl.css({'background':'#fff5f5','border-color':'#fca5a5'});
    } else {
      lbl.css({'background':'#f9fafb','border-color':'#e2e8f0'});
    }
  });

  // Haber arama
  $('#vkvsy-haber-ara').on('input', function(){
    var q = $(this).val().toLowerCase();
    $('.vkvsy-haber-item').each(function(){
      $(this).toggle(!q || $(this).data('title').indexOf(q) > -1);
    });
  });
});
</script>
    <?php
    vkvsy_admin_footer();
}

/* ═══════════════════════════════════════════════════════════
   8. BAĞIŞ AYARLARI
═══════════════════════════════════════════════════════════ */

add_action('wp_ajax_vkvsy_kaydet_bagis', 'vkvsy_ajax_kaydet_bagis');
function vkvsy_ajax_kaydet_bagis() {
    check_ajax_referer('vkvsy_nonce', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Yetki yok');

    $alan = sanitize_key($_POST['alan'] ?? '');

    switch ($alan) {
        case 'genel':
            update_option('vkv_bagis_stripe_url',  esc_url_raw($_POST['stripe_url'] ?? ''));
            update_option('vkv_bagis_baslik',       sanitize_text_field($_POST['baslik'] ?? ''));
            update_option('vkv_bagis_aciklama',     sanitize_textarea_field($_POST['aciklama'] ?? ''));
            update_option('vkv_bagis_para_birimi',  sanitize_text_field($_POST['para_birimi'] ?? '₺'));
            break;

        case 'miktarlar':
            $raw   = explode(',', $_POST['miktarlar'] ?? '');
            $clean = array_values(array_filter(array_map('intval', $raw)));
            sort($clean);
            update_option('vkv_bagis_miktarlar', wp_json_encode($clean));
            break;

        case 'banka':
            update_option('vkv_bagis_iban',         sanitize_text_field($_POST['iban'] ?? ''));
            update_option('vkv_bagis_banka',         sanitize_text_field($_POST['banka'] ?? ''));
            update_option('vkv_bagis_hesap_sahibi',  sanitize_text_field($_POST['hesap_sahibi'] ?? ''));
            break;

        case 'stats':
            foreach (array('stat1_n','stat1_l','stat2_n','stat2_l','stat3_n','stat3_l') as $k) {
                update_option('vkv_bagis_'.$k, sanitize_text_field($_POST[$k] ?? ''));
            }
            break;

        default:
            wp_send_json_error('Bilinmeyen alan');
    }
    wp_send_json_success('Kaydedildi');
}

function vkvsy_bagis_render() {
    if (!current_user_can('manage_options')) return;

    /* Site tipine göre akıllı varsayılanlar */
    $_site_tipi = get_option('vkv_site_tipi', 'vakif');
    $_def_basliklar = array(
        'dernek' => array('baslik'=>'Vatana Destek Ol',        'aciklama'=>'Şehit aileleri, gaziler ve vatanseverlere yönelik çalışmalarımızı sürdürebilmek için sizin desteğinize ihtiyaç duyuyoruz.', 'iban'=>'TR54 0001 0012 6297 7557 9950 04', 'hesap'=>'Vatan Kahramanları Derneği', 'stripe'=>'https://bagis.vatankahramanlari.org/b/cNi5kC6Y78E13A5czF4AU02'),
        'vakif'  => array('baslik'=>'Vakfa Destek Ol',         'aciklama'=>'Şehit aileleri ve gazilere yönelik projelerimiz için desteğinize ihtiyaç duyuyoruz.',                                        'iban'=>'TR49 0001 0012 6298 0865 4750 01', 'hesap'=>'Vatan Kahramanları Vakfı',    'stripe'=>'https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07'),
        'dsv'    => array('baslik'=>'Sağlık İçin Bağış Yapın', 'aciklama'=>'Dünya Sağlık Vakfı olarak sağlık projelerimizi sürdürebilmek için bağışlarınıza ihtiyaç duyuyoruz.',                        'iban'=>'TR49 0001 0012 6298 0865 4750 01', 'hesap'=>'Dünya Sağlık Vakfı',          'stripe'=>'https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07'),
        'tukav'  => array('baslik'=>'Kültüre Destek Ol',       'aciklama'=>'Türk kültürünü yaşatmak için projelerimize destek olun.',                                                                     'iban'=>'',                                 'hesap'=>'TÜKAV',                        'stripe'=>'https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07'),
    );
    $_def = isset($_def_basliklar[$_site_tipi]) ? $_def_basliklar[$_site_tipi] : $_def_basliklar['vakif'];

    $stripe_url   = get_option('vkv_bagis_stripe_url', get_theme_mod('vkv_bagis_url', $_def['stripe']));
    $baslik       = get_option('vkv_bagis_baslik',     $_def['baslik']);
    $aciklama     = get_option('vkv_bagis_aciklama',   $_def['aciklama']);
    $para_birimi  = get_option('vkv_bagis_para_birimi','₺');
    $iban         = get_option('vkv_bagis_iban',       get_option('vkv_iban_opt', $_def['iban']));
    $banka        = get_option('vkv_bagis_banka',      get_option('vkv_banka_adi_opt', 'Ziraat Bankası'));
    $hesap_sahibi = get_option('vkv_bagis_hesap_sahibi', get_option('vkv_banka_hesap_opt', $_def['hesap']));
    $miktarlar_raw= get_option('vkv_bagis_miktarlar',  '');
    $miktarlar    = $miktarlar_raw ? json_decode($miktarlar_raw, true) : array(100, 250, 500, 1000, 2500);
    if (!is_array($miktarlar)) $miktarlar = array(100, 250, 500, 1000, 2500);
    $stat1_n = get_option('vkv_bagis_stat1_n','25+');
    $stat1_l = get_option('vkv_bagis_stat1_l','Yıllık Deneyim');
    $stat2_n = get_option('vkv_bagis_stat2_n','5K+');
    $stat2_l = get_option('vkv_bagis_stat2_l','Desteklenen Aile');
    $stat3_n = get_option('vkv_bagis_stat3_n','300+');
    $stat3_l = get_option('vkv_bagis_stat3_l','Etkinlik');

    vkvsy_admin_header('Bağış Ayarları');
    ?>
<div class="vkvsy-wrap">

  <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:14px 18px;margin-bottom:20px;font-size:13px;color:#166534">
    <strong>💝 Bağış Sistemi:</strong> Stripe bağlantı linkini, miktar butonlarını ve banka bilgilerini buradan yönetebilirsiniz.
    Ziyaretçi bir miktar seçtiğinde Stripe ödeme ekranında o miktar otomatik olarak doldurulur.
    <strong>Not:</strong> Stripe linkinizin <em>"müşteri miktar belirlesin"</em> modunda açık olması gerekir.
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

    <!-- Genel Ayarlar -->
    <div class="vkvsy-card">
      <div class="vkvsy-card-head">
        <h3>⚙️ Genel Bağış Ayarları</h3>
        <p>Stripe linki, başlık ve açıklama metni</p>
      </div>
      <div class="vkvsy-card-body">
        <label class="vkvsy-label">💳 Stripe Bağış Linki</label>
        <input type="url" id="vkvsy-stripe-url" class="vkvsy-input" value="<?php echo esc_attr($stripe_url); ?>" placeholder="https://donate.stripe.com/...">
        <div style="font-size:11px;color:#64748b;margin:4px 0 14px">
          Stripe Dashboard'dan aldığınız bağış linki. <em>Müşteri fiyatı belirlesin</em> seçeneği aktif olmalı.
        </div>

        <label class="vkvsy-label">🏷️ Bağış Başlığı</label>
        <input type="text" id="vkvsy-bagis-baslik" class="vkvsy-input" value="<?php echo esc_attr($baslik); ?>">

        <label class="vkvsy-label" style="margin-top:10px">📝 Açıklama</label>
        <textarea id="vkvsy-bagis-aciklama" class="vkvsy-input" rows="3" style="resize:vertical"><?php echo esc_textarea($aciklama); ?></textarea>

        <label class="vkvsy-label" style="margin-top:10px">💱 Para Birimi Sembolü</label>
        <input type="text" id="vkvsy-para-birimi" class="vkvsy-input" value="<?php echo esc_attr($para_birimi); ?>" style="width:80px" maxlength="5">

        <div style="margin-top:14px">
          <button type="button" class="button button-primary" id="vkvsy-bagis-genel-kaydet">💾 Kaydet</button>
          <span class="vkvsy-msg" id="vkvsy-bagis-genel-msg" style="margin-left:10px"></span>
        </div>
      </div>
    </div>

    <!-- Bağış Miktarları -->
    <div class="vkvsy-card">
      <div class="vkvsy-card-head">
        <h3>💰 Bağış Miktarları</h3>
        <p>Anasayfada görünecek hazır miktar butonları. "Diğer" butonu otomatik eklenir.</p>
      </div>
      <div class="vkvsy-card-body">
        <div id="vkvsy-miktar-listesi" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">
          <?php foreach ($miktarlar as $m): ?>
          <div class="vkvsy-miktar-chip" style="display:flex;align-items:center;background:#fff5f5;border:1px solid #fca5a5;border-radius:20px;overflow:hidden">
            <input type="number" class="vkvsy-miktar-input" value="<?php echo intval($m); ?>"
                   style="width:70px;border:none;background:transparent;padding:5px 8px;font-family:inherit;font-size:13px;font-weight:700;color:#8B1A1A;outline:none" min="1" max="9999999">
            <button type="button" class="vkvsy-miktar-sil" title="Sil"
                    style="border:none;background:transparent;color:#ef4444;cursor:pointer;padding:4px 8px;font-size:15px;line-height:1">×</button>
          </div>
          <?php endforeach; ?>
        </div>

        <button type="button" id="vkvsy-miktar-ekle" class="button" style="font-size:12px">➕ Yeni Miktar Ekle</button>

        <div style="margin-top:14px;padding-top:12px;border-top:1px solid #e2e8f0">
          <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Anasayfa Önizlemesi</div>
          <div id="vkvsy-miktar-onizleme" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        </div>

        <div style="margin-top:14px">
          <button type="button" class="button button-primary" id="vkvsy-miktar-kaydet">💾 Miktarları Kaydet</button>
          <span class="vkvsy-msg" id="vkvsy-miktar-msg" style="margin-left:10px"></span>
        </div>
      </div>
    </div>

    <!-- Banka Bilgileri -->
    <div class="vkvsy-card">
      <div class="vkvsy-card-head">
        <h3>🏦 Havale / EFT Bilgileri</h3>
        <p>Anasayfadaki bağış kutusunun alt kısmında görünür</p>
      </div>
      <div class="vkvsy-card-body">
        <label class="vkvsy-label">🔢 IBAN</label>
        <input type="text" id="vkvsy-iban" class="vkvsy-input" value="<?php echo esc_attr($iban); ?>"
               placeholder="TR00 0000 0000 0000 0000 0000 00" style="font-family:monospace;letter-spacing:.5px">

        <label class="vkvsy-label" style="margin-top:10px">🏛️ Banka Adı</label>
        <input type="text" id="vkvsy-banka" class="vkvsy-input" value="<?php echo esc_attr($banka); ?>">

        <label class="vkvsy-label" style="margin-top:10px">👤 Hesap Sahibi</label>
        <input type="text" id="vkvsy-hesap-sahibi" class="vkvsy-input" value="<?php echo esc_attr($hesap_sahibi); ?>">

        <div style="margin-top:14px">
          <button type="button" class="button button-primary" id="vkvsy-banka-kaydet">💾 Kaydet</button>
          <span class="vkvsy-msg" id="vkvsy-banka-msg" style="margin-left:10px"></span>
        </div>
      </div>
    </div>

    <!-- İstatistik Sayıları -->
    <div class="vkvsy-card">
      <div class="vkvsy-card-head">
        <h3>📊 İstatistik Sayıları</h3>
        <p>Bağış bölümünün sol kısmındaki 3 öne çıkan sayı ve etiketleri</p>
      </div>
      <div class="vkvsy-card-body">
        <div style="display:grid;grid-template-columns:90px 1fr;gap:8px;margin-bottom:6px">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase">Değer</div>
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase">Etiket</div>
        </div>
        <?php
        $stats = array(
            array('n'=>$stat1_n,'l'=>$stat1_l,'k'=>'stat1'),
            array('n'=>$stat2_n,'l'=>$stat2_l,'k'=>'stat2'),
            array('n'=>$stat3_n,'l'=>$stat3_l,'k'=>'stat3'),
        );
        foreach ($stats as $s): ?>
        <div style="display:grid;grid-template-columns:90px 1fr;gap:8px;margin-bottom:8px">
          <input type="text" id="vkvsy-<?php echo esc_attr($s['k']); ?>-n" class="vkvsy-input" value="<?php echo esc_attr($s['n']); ?>" placeholder="25+" style="text-align:center;font-weight:700">
          <input type="text" id="vkvsy-<?php echo esc_attr($s['k']); ?>-l" class="vkvsy-input" value="<?php echo esc_attr($s['l']); ?>" placeholder="Açıklama">
        </div>
        <?php endforeach; ?>

        <div style="margin-top:8px">
          <button type="button" class="button button-primary" id="vkvsy-stats-kaydet">💾 Kaydet</button>
          <span class="vkvsy-msg" id="vkvsy-stats-msg" style="margin-left:10px"></span>
        </div>
      </div>
    </div>

  </div><!-- /grid -->
</div><!-- /vkvsy-wrap -->

<script>
jQuery(function($){

  function postAjax(data, msgEl) {
    data.action = 'vkvsy_kaydet_bagis';
    data.nonce  = VKVSYData.nonce;
    $.post(VKVSYData.ajax_url, data, function(r){
      $(msgEl).text(r.success ? '✅ Kaydedildi' : '❌ Hata').fadeIn().delay(2500).fadeOut();
    });
  }

  /* Genel */
  $('#vkvsy-bagis-genel-kaydet').on('click', function(){
    postAjax({ alan:'genel', stripe_url:$('#vkvsy-stripe-url').val(), baslik:$('#vkvsy-bagis-baslik').val(),
               aciklama:$('#vkvsy-bagis-aciklama').val(), para_birimi:$('#vkvsy-para-birimi').val() }, '#vkvsy-bagis-genel-msg');
  });

  /* Banka */
  $('#vkvsy-banka-kaydet').on('click', function(){
    postAjax({ alan:'banka', iban:$('#vkvsy-iban').val(), banka:$('#vkvsy-banka').val(),
               hesap_sahibi:$('#vkvsy-hesap-sahibi').val() }, '#vkvsy-banka-msg');
  });

  /* Stats */
  $('#vkvsy-stats-kaydet').on('click', function(){
    postAjax({ alan:'stats',
      stat1_n:$('#vkvsy-stat1-n').val(), stat1_l:$('#vkvsy-stat1-l').val(),
      stat2_n:$('#vkvsy-stat2-n').val(), stat2_l:$('#vkvsy-stat2-l').val(),
      stat3_n:$('#vkvsy-stat3-n').val(), stat3_l:$('#vkvsy-stat3-l').val()
    }, '#vkvsy-stats-msg');
  });

  /* ── Miktar yönetimi ── */
  function getMiktarlar() {
    var vals = [];
    $('#vkvsy-miktar-listesi .vkvsy-miktar-input').each(function(){
      var v = parseInt($(this).val(), 10);
      if (v > 0) vals.push(v);
    });
    return vals;
  }

  function updateOnizleme() {
    var pb   = $('#vkvsy-para-birimi').val() || '₺';
    var html = getMiktarlar().map(function(v){
      return '<span style="background:#8B1A1A;color:#fff;padding:5px 12px;border-radius:2px;font-size:12px;font-weight:700">' + pb + v.toLocaleString('tr-TR') + '</span>';
    }).join('');
    html += '<span style="background:#e2e8f0;color:#64748b;padding:5px 12px;border-radius:2px;font-size:12px;font-weight:700">Diğer</span>';
    $('#vkvsy-miktar-onizleme').html(html);
  }

  updateOnizleme();
  $('#vkvsy-miktar-listesi').on('input', '.vkvsy-miktar-input', updateOnizleme);
  $('#vkvsy-para-birimi').on('input', updateOnizleme);

  $('#vkvsy-miktar-listesi').on('click', '.vkvsy-miktar-sil', function(){
    $(this).closest('.vkvsy-miktar-chip').remove(); updateOnizleme();
  });

  $('#vkvsy-miktar-ekle').on('click', function(){
    var chip = '<div class="vkvsy-miktar-chip" style="display:flex;align-items:center;background:#fff5f5;border:1px solid #fca5a5;border-radius:20px;overflow:hidden">' +
      '<input type="number" class="vkvsy-miktar-input" value="500" style="width:70px;border:none;background:transparent;padding:5px 8px;font-family:inherit;font-size:13px;font-weight:700;color:#8B1A1A;outline:none" min="1" max="9999999">' +
      '<button type="button" class="vkvsy-miktar-sil" title="Sil" style="border:none;background:transparent;color:#ef4444;cursor:pointer;padding:4px 8px;font-size:15px;line-height:1">×</button>' +
      '</div>';
    $('#vkvsy-miktar-listesi').append(chip);
    $('#vkvsy-miktar-listesi .vkvsy-miktar-chip:last-child input').focus().select();
    updateOnizleme();
  });

  $('#vkvsy-miktar-kaydet').on('click', function(){
    postAjax({ alan:'miktarlar', miktarlar: getMiktarlar().join(',') }, '#vkvsy-miktar-msg');
  });

});
</script>
    <?php
    vkvsy_admin_footer();
}

/* ═══════════════════════════════════════════════════════════════════
   KURULUM REHBERİ SAYFASI
═══════════════════════════════════════════════════════════════════ */
function vkvsy_rehber_render() {
    $tab = isset($_GET['rtab']) ? sanitize_key($_GET['rtab']) : 'baslangic';
    $url = admin_url('admin.php?page=vkv-sy-rehber');
    ?>
    <div class="wrap" style="max-width:980px">
      <h1 style="display:flex;align-items:center;gap:12px;margin-bottom:0">
        <span style="font-size:36px">📖</span>
        <span>Kurulum &amp; Kullanım Rehberi</span>
        <span style="font-size:12px;background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:20px;font-weight:600">v2.0</span>
      </h1>
      <p style="color:#64748b;margin-bottom:20px">Tema kurulumundan içerik yönetimine kadar adım adım rehber.</p>
      <nav class="nav-tab-wrapper" style="margin-bottom:24px">
        <?php
        $tabs = array(
          'baslangic' => '🚀 Başlangıç',
          'kurulum'   => '⚙️ Kurulum',
          'icerik'    => '📄 İçerik',
          'eklentiler'=> '🔌 Eklentiler',
          'bagis'     => '💝 Bağış',
          'sss'       => '❓ SSS',
        );
        foreach ($tabs as $k => $label): ?>
          <a href="<?= esc_url($url) ?>&amp;rtab=<?= esc_attr($k) ?>" class="nav-tab <?= $tab===$k?'nav-tab-active':'' ?>"><?= $label ?></a>
        <?php endforeach; ?>
      </nav>
      <style>
        .reh-kart{background:#fff;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;overflow:hidden}
        .reh-kart-baslik{background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:16px 20px;display:flex;align-items:center;gap:12px}
        .reh-kart-baslik h3{margin:0;font-size:17px;color:#fff}
        .reh-kart-govde{padding:20px}
        .reh-adim{display:flex;gap:14px;margin-bottom:18px;align-items:flex-start}
        .reh-adim-no{width:32px;min-width:32px;height:32px;border-radius:50%;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;margin-top:2px}
        .reh-adim-icerik h4{margin:0 0 4px;font-size:15px;color:#1e293b}
        .reh-adim-icerik p{margin:0;color:#64748b;font-size:13px;line-height:1.6}
        .reh-adim-icerik code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px;color:#0f172a}
        .reh-uyari{background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 16px;font-size:13px;color:#713f12;margin:12px 0}
        .reh-ipucu{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;font-size:13px;color:#1e3a8a;margin:12px 0}
        .reh-basari{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;font-size:13px;color:#14532d;margin:12px 0}
        .reh-link{color:#2563eb;text-decoration:none;font-weight:600;font-size:13px}
        .reh-link:hover{text-decoration:underline}
        .reh-tablo{width:100%;border-collapse:collapse;margin:12px 0}
        .reh-tablo th{background:#f8fafc;padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0}
        .reh-tablo td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}
        .reh-tablo td:first-child{font-weight:600;color:#1e293b}
        .reh-rozet{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}
        .reh-rozet-yesil{background:#dcfce7;color:#15803d}
        .reh-rozet-mavi{background:#dbeafe;color:#1e40af}
        .reh-rozet-sari{background:#fef9c3;color:#92400e}
        details summary{padding:14px 16px;cursor:pointer;font-weight:600;font-size:14px;color:#1e293b;list-style:none}
        details[open] summary span{transform:rotate(180deg)}
        details > div{padding:0 16px 16px;font-size:13px;color:#374151;line-height:1.7}
      </style>
      <?php
      if ($tab === 'baslangic') vkvsy_rehber_tab_baslangic();
      if ($tab === 'kurulum')   vkvsy_rehber_tab_kurulum();
      if ($tab === 'icerik')    vkvsy_rehber_tab_icerik();
      if ($tab === 'eklentiler') vkvsy_rehber_tab_eklentiler();
      if ($tab === 'bagis')     vkvsy_rehber_tab_bagis();
      if ($tab === 'sss')       vkvsy_rehber_tab_sss();
      ?>
    </div>
    <?php
}

function vkvsy_rehber_tab_baslangic() { ?>
  <div style="background:linear-gradient(135deg,#8B1A1A,#C53030);border-radius:16px;padding:32px;color:#fff;margin-bottom:24px">
    <h2 style="margin:0 0 8px;font-size:24px;color:#fff">VKV &amp; TUKAV Teması'na Hoş Geldiniz!</h2>
    <p style="margin:0;opacity:.9;font-size:15px;line-height:1.6">Bu tema iki vakıf için tasarlanmış premium bir WordPress temasıdır: <strong>Vatan Kahramanları Vakfı (VKV)</strong> ve <strong>TUKAV</strong>. Aşağıdaki adımları takip ederek sitenizi 30 dakikada yayına alabilirsiniz.</p>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px">
    <?php $kartlar = array(
      array('🕐','30 dakika','Ortalama kurulum süresi','#2563eb'),
      array('📄','44 sayfa','VKV için hazır sayfa şablonu','#16a34a'),
      array('🔌','3 eklenti','Kurulması gereken eklenti sayısı','#d97706'),
    );
    foreach ($kartlar as $k): ?>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;text-align:center">
        <div style="font-size:36px;margin-bottom:8px"><?= $k[0] ?></div>
        <div style="font-size:22px;font-weight:700;color:<?= $k[3] ?>"><?= $k[1] ?></div>
        <div style="font-size:13px;color:#64748b;margin-top:4px"><?= $k[2] ?></div>
      </div>
    <?php endforeach; ?>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="reh-kart">
      <div class="reh-kart-baslik"><span style="font-size:24px">📦</span><h3>Neyi İndirmelisiniz?</h3></div>
      <div class="reh-kart-govde">
        <table class="reh-tablo">
          <tr><td>🎨 DERVAK Tema ZIP</td><td><code>dervak-tema.zip</code></td><td><span class="reh-rozet reh-rozet-yesil">Zorunlu</span></td></tr>
          <tr><td>🔌 Sayfa Yönetici</td><td><code>dervak-sayfa-yonetici.zip</code></td><td><span class="reh-rozet reh-rozet-yesil">Zorunlu</span></td></tr>
          <tr><td>🌐 Wikipedia Eklentisi</td><td><code>vkv-wikipedia.zip</code></td><td><span class="reh-rozet reh-rozet-mavi">Önerilen</span></td></tr>
          <tr><td>📥 VKV İmport XML</td><td><code>vkv-import.xml</code></td><td><span class="reh-rozet reh-rozet-mavi">Önerilen</span></td></tr>
          <tr><td>📥 TUKAV İmport XML</td><td><code>tukav-import.xml</code></td><td><span class="reh-rozet reh-rozet-sari">TUKAV için</span></td></tr>
        </table>
      </div>
    </div>
    <div class="reh-kart">
      <div class="reh-kart-baslik"><span style="font-size:24px">✅</span><h3>Gereksinimler</h3></div>
      <div class="reh-kart-govde">
        <div class="reh-adim"><div class="reh-adim-no" style="background:#16a34a">✓</div><div class="reh-adim-icerik"><h4>WordPress 6.0+</h4><p>Eski sürümler desteklenmeyebilir.</p></div></div>
        <div class="reh-adim"><div class="reh-adim-no" style="background:#16a34a">✓</div><div class="reh-adim-icerik"><h4>PHP 7.4+</h4><p>PHP 8.1 veya üzeri önerilir.</p></div></div>
        <div class="reh-adim"><div class="reh-adim-no" style="background:#16a34a">✓</div><div class="reh-adim-icerik"><h4>Türkçe Dil Paketi</h4><p><code>Ayarlar → Genel → Dil → Türkçe</code></p></div></div>
        <div class="reh-adim"><div class="reh-adim-no" style="background:#16a34a">✓</div><div class="reh-adim-icerik"><h4>SSL Sertifikası (HTTPS)</h4><p>Web push bildirimleri için zorunlu.</p></div></div>
      </div>
    </div>
  </div>
  <div class="reh-ipucu">
    <strong>Hızlı Başlangıç:</strong> En hızlı kurulum için <a href="<?= esc_url(admin_url('admin.php?page=vkv-sy-rehber&rtab=kurulum')) ?>" class="reh-link">Kurulum Adımları</a> sekmesine geçin.
  </div>
<?php }

function vkvsy_rehber_tab_kurulum() { ?>
  <div class="reh-kart">
    <div class="reh-kart-baslik" style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8)"><span style="font-size:28px">⚙️</span><h3>Adım Adım Kurulum</h3></div>
    <div class="reh-kart-govde">
      <h3 style="color:#1e293b;margin-top:0">AŞAMA 1 — Tema Kurulumu</h3>
      <div class="reh-adim"><div class="reh-adim-no">1</div><div class="reh-adim-icerik"><h4>Temayı Yükleyin</h4><p><strong>Görünüm → Temalar → Tema Ekle → Tema Yükle</strong><br><code>dervak-tema.zip</code> dosyasını seçin ve "Şimdi Yükle" butonuna tıklayın.</p></div></div>
      <div class="reh-adim"><div class="reh-adim-no">2</div><div class="reh-adim-icerik"><h4>Temayı Etkinleştirin</h4><p>Yükleme tamamlandıktan sonra "Etkinleştir" butonuna tıklayın.</p></div></div>
      <div class="reh-uyari">⚠️ Yüklemeden önce eski temanın yedeğini alın.</div>

      <h3 style="color:#1e293b;margin-top:24px">AŞAMA 2 — Eklenti Kurulumu</h3>
      <div class="reh-adim"><div class="reh-adim-no">3</div><div class="reh-adim-icerik"><h4>Sayfa Yönetici Eklentisini Yükleyin</h4><p><strong>Eklentiler → Yeni Ekle → Eklenti Yükle</strong><br><code>dervak-sayfa-yonetici.zip</code> dosyasını yükleyin ve etkinleştirin.</p></div></div>
      <div class="reh-adim"><div class="reh-adim-no">4</div><div class="reh-adim-icerik"><h4>Wikipedia Eklentisini Yükleyin (İsteğe Bağlı)</h4><p><code>vkv-wikipedia.zip</code> dosyasını aynı şekilde yükleyin.</p></div></div>
      <div class="reh-adim"><div class="reh-adim-no">5</div><div class="reh-adim-icerik"><h4>WordPress Importer Yükleyin</h4><p><strong>Eklentiler → Yeni Ekle → "WordPress Importer"</strong> aratın ve yükleyin.</p></div></div>

      <h3 style="color:#1e293b;margin-top:24px">AŞAMA 3 — Kurulum Sihirbazı</h3>
      <div class="reh-adim"><div class="reh-adim-no">6</div><div class="reh-adim-icerik"><h4>Kurulum Sihirbazını Çalıştırın</h4><p><strong>VKV Yönetici → Sayfa Şablonları</strong> menüsüne gidin ve "🚀 Kurulum Sihirbazını Başlat" butonuna tıklayın. Tüm sayfalar ve menü otomatik oluşturulur.</p></div></div>
      <div class="reh-adim"><div class="reh-adim-no">7</div><div class="reh-adim-icerik"><h4>Statik Ana Sayfa Ayarlayın</h4><p><strong>Ayarlar → Okuma → "Statik bir sayfa"</strong> seçin. Ana Sayfa olarak "Ana Sayfa" sayfasını seçin.</p></div></div>
      <div class="reh-basari">✅ Kurulum tamamlandı! Sitenizi ziyaret ederek kontrol edin.</div>

      <h3 style="color:#1e293b;margin-top:24px">İçe Aktarma (XML) ile Kurulum</h3>
      <div class="reh-adim"><div class="reh-adim-no">A</div><div class="reh-adim-icerik"><h4>XML Dosyasını İndirin</h4><p>VKV için <code>vkv-import.xml</code>, TUKAV için <code>tukav-import.xml</code> dosyasını indirin.</p></div></div>
      <div class="reh-adim"><div class="reh-adim-no">B</div><div class="reh-adim-icerik"><h4>Araçlar → İçe Aktar → WordPress</h4><p>XML dosyasını seçin, yazar eşleştirmesinde mevcut admin kullanıcınızı seçin ve içe aktarın.</p></div></div>
      <div class="reh-uyari">⚠️ XML içe aktarma ile Kurulum Sihirbazını aynı anda kullanmayın — sayfalar çift oluşabilir.</div>
    </div>
  </div>
<?php }

function vkvsy_rehber_tab_icerik() { ?>
  <div class="reh-kart">
    <div class="reh-kart-baslik" style="background:linear-gradient(135deg,#7c3aed,#6d28d9)"><span style="font-size:28px">📄</span><h3>İçerik Yönetimi</h3></div>
    <div class="reh-kart-govde">
      <h3 style="margin-top:0;color:#1e293b">Sayfa Şablonları</h3>
      <table class="reh-tablo">
        <thead><tr><th>Sayfa</th><th>Şablon Dosyası</th><th>Özellik</th></tr></thead>
        <tbody>
          <tr><td>🏠 Ana Sayfa</td><td><code>front-page.php</code></td><td>Hero slider + modüller</td></tr>
          <tr><td>📰 Haberler</td><td><code>page-haberler.php</code></td><td>Kategori filtreli haber listesi</td></tr>
          <tr><td>📚 Makaleler</td><td><code>page.makaleler.php</code></td><td>Ansiklopedi tarzı konu listesi</td></tr>
          <tr><td>🎬 Video Galerisi</td><td><code>page.video-galerisi.php</code></td><td>YouTube iframe embed</td></tr>
          <tr><td>🖼️ Foto Galeri</td><td><code>page.foto-galeri.php</code></td><td>Lightbox destekli galeri</td></tr>
          <tr><td>🏢 Firma Rehberi</td><td><code>page.firma-rehberi.php</code></td><td>Arama + filtreli firma listesi</td></tr>
          <tr><td>🏆 Referanslar</td><td><code>page.referanslar.php</code></td><td>Logo ızgarası + istatistikler</td></tr>
          <tr><td>💝 Bağış</td><td><code>page-bagis.php</code></td><td>Stripe + IBAN entegrasyonu</td></tr>
          <tr><td>📬 İletişim</td><td><code>page-iletisim.php</code></td><td>Harita + form + sosyal medya</td></tr>
        </tbody>
      </table>
      <h3 style="margin-top:24px;color:#1e293b">Haber / Blog Yazısı Eklemek</h3>
      <div class="reh-adim"><div class="reh-adim-no">1</div><div class="reh-adim-icerik"><h4>Yazılar → Yeni Ekle</h4><p>Başlık ve içerik girin. Kategori seçmeyi unutmayın.</p></div></div>
      <div class="reh-adim"><div class="reh-adim-no">2</div><div class="reh-adim-icerik"><h4>Öne Çıkan Görsel Ekleyin</h4><p>800×500px önerilir. Haberler sayfasında kart görseli olarak kullanılır.</p></div></div>
      <div class="reh-adim"><div class="reh-adim-no">3</div><div class="reh-adim-icerik"><h4>SEO Meta Kutusunu Doldurun</h4><p>Sayfa editöründe "🔍 SEO Ayarları" kutusunu bulun. Başlık, açıklama ve OG görseli ekleyin.</p></div></div>
      <h3 style="margin-top:24px;color:#1e293b">Manşet (Hero) Yönetimi</h3>
      <div class="reh-adim"><div class="reh-adim-no">1</div><div class="reh-adim-icerik"><h4>VKV Yönetici → Manşet Ayarları</h4><p>Hangi kategorilerin manşette görüneceğini seçin.</p></div></div>
      <div class="reh-adim"><div class="reh-adim-no">2</div><div class="reh-adim-icerik"><h4>Manşete Haber Sabitleme</h4><p>Haberi düzenlerken sağ panelde "✦ Manşete Sabitle" seçeneğini işaretleyin.</p></div></div>
    </div>
  </div>
<?php }

function vkvsy_rehber_tab_eklentiler() { ?>
  <div class="reh-kart">
    <div class="reh-kart-baslik" style="background:linear-gradient(135deg,#0f766e,#0d9488)"><span style="font-size:28px">🔌</span><h3>Eklenti Yönetimi</h3></div>
    <div class="reh-kart-govde">
      <h3 style="margin-top:0;color:#1e293b">Zorunlu Eklentiler</h3>
      <table class="reh-tablo">
        <tr><td>DERVAK Sayfa Yönetici</td><td>Bu panel üzerinden indirin</td><td>Renkler, şablonlar, manşet, bağış</td></tr>
        <tr><td>WordPress Importer</td><td>WordPress.org</td><td>XML içe aktarma için zorunlu</td></tr>
      </table>
      <h3 style="margin-top:20px;color:#1e293b">Önerilen Eklentiler</h3>
      <table class="reh-tablo">
        <tr><td>VKV Wikipedia</td><td>Bu panel üzerinden indirin</td><td>Wikipedia makalesi entegrasyonu</td></tr>
        <tr><td>WP Mail SMTP</td><td>WordPress.org</td><td>İletişim formu e-postaları</td></tr>
        <tr><td>W3 Total Cache</td><td>WordPress.org</td><td>Hız optimizasyonu</td></tr>
        <tr><td>Wordfence Security</td><td>WordPress.org</td><td>Ek güvenlik katmanı</td></tr>
        <tr><td>UpdraftPlus</td><td>WordPress.org</td><td>Otomatik yedekleme</td></tr>
      </table>
      <h3 style="margin-top:20px;color:#1e293b">Wikipedia Eklentisi Kullanımı</h3>
      <div class="reh-adim"><div class="reh-adim-no">1</div><div class="reh-adim-icerik"><h4>Makale Ekleyin</h4><p><strong>Ayarlar → 🌐 Wikipedia → ➕ Yeni Ekle</strong> sekmesinden Wikipedia başlığını (Türkçe) girin.</p></div></div>
      <div class="reh-adim"><div class="reh-adim-no">2</div><div class="reh-adim-icerik"><h4>Sayfaya Ekleyin</h4><p>Shortcode: <code>[vkv_wiki id="ataturk"]</code> veya <code>[vkv_wiki baslik="Çanakkale Savaşı"]</code></p></div></div>
      <div class="reh-ipucu">💡 Veriler 24 saat önbellekte tutulur. Hemen yenilemek için Makaleler ekranındaki "🔄 Yenile" butonunu kullanın.</div>
      <h3 style="margin-top:20px;color:#1e293b">Web Push Bildirimleri</h3>
      <div class="reh-adim"><div class="reh-adim-no">1</div><div class="reh-adim-icerik"><h4>HTTPS Zorunludur</h4><p>Push bildirimleri yalnızca HTTPS üzerinde çalışır.</p></div></div>
      <div class="reh-adim"><div class="reh-adim-no">2</div><div class="reh-adim-icerik"><h4>Ayarlar → 🔔 Push Bildirimleri</h4><p>Otomatik bildirim seçeneğini etkinleştirin. Yeni haber yayınlandığında abonelere otomatik bildirim gönderilir.</p></div></div>
    </div>
  </div>
<?php }

function vkvsy_rehber_tab_bagis() { ?>
  <div class="reh-kart">
    <div class="reh-kart-baslik" style="background:linear-gradient(135deg,#9f1239,#e11d48)"><span style="font-size:28px">💝</span><h3>Bağış Sistemi Kurulumu</h3></div>
    <div class="reh-kart-govde">
      <h3 style="margin-top:0;color:#1e293b">Stripe ile Online Bağış</h3>
      <div class="reh-adim"><div class="reh-adim-no">1</div><div class="reh-adim-icerik"><h4>Stripe Hesabı Açın</h4><p><a href="https://dashboard.stripe.com/register" target="_blank" class="reh-link">stripe.com'dan</a> ücretsiz hesap oluşturun ve kimlik doğrulamasını tamamlayın.</p></div></div>
      <div class="reh-adim"><div class="reh-adim-no">2</div><div class="reh-adim-icerik"><h4>Payment Link Oluşturun</h4><p>Stripe Dashboard → <strong>Payment Links → Create link</strong><br><strong>Önemli:</strong> "Customer sets price" (müşteri fiyat belirler) seçeneğini aktif edin.</p></div></div>
      <div class="reh-adim"><div class="reh-adim-no">3</div><div class="reh-adim-icerik"><h4>Linki Panele Girin</h4><p><strong>VKV Yönetici → 💝 Bağış Ayarları</strong> → Stripe linkinizi yapıştırın.</p></div></div>
      <div class="reh-adim"><div class="reh-adim-no">4</div><div class="reh-adim-icerik"><h4>Bağış Miktarlarını Ayarlayın</h4><p>Hazır miktar butonlarını düzenleyin (örn: 50₺, 100₺, 250₺). Kullanıcı seçtiğinde link otomatik güncellenecektir.</p></div></div>
      <h3 style="margin-top:24px;color:#1e293b">IBAN ile Banka Havalesi</h3>
      <div class="reh-adim"><div class="reh-adim-no">5</div><div class="reh-adim-icerik"><h4>Banka Bilgilerini Girin</h4><p>Bağış Ayarları panelinde IBAN, banka adı ve hesap sahibi adını girin. Ziyaretçiler tek tıkla IBAN'ı kopyalayabilir.</p></div></div>
      <div class="reh-uyari">⚠️ "Customer sets price" modu aktif değilse miktar seçimi çalışmaz.</div>
      <div class="reh-basari">Mevcut Stripe linki: <code><?= esc_html(get_option('vkv_bagis_stripe_url','(henüz girilmemiş)')) ?></code></div>
    </div>
  </div>
<?php }

function vkvsy_rehber_tab_sss() {
    $sorular = array(
        array('Ana sayfa boş görünüyor, ne yapmalıyım?','<strong>Ayarlar → Okuma → "Statik bir sayfa"</strong> seçin, Ana Sayfa olarak "Ana Sayfa" sayfasını atayın. Kurulum Sihirbazı çalıştırılmış olmalı.'),
        array('Tema yüklendikten sonra görsel bozuk görünüyor','Tarayıcı önbelleğini temizleyin (Ctrl+Shift+R). PHP <code>upload_max_filesize</code> değerini kontrol edin (en az 64MB).'),
        array('İmport sırasında hata alıyorum','XML dosyasının UTF-8 kodlamalı olduğundan emin olun. PHP <code>max_execution_time</code> değerini artırın. WordPress Importer güncel olmalı.'),
        array('Push bildirimleri çalışmıyor','HTTPS zorunludur. Tarayıcıda bildirim izninin verildiğinden emin olun. DevTools → Application → Service Workers bölümünü kontrol edin.'),
        array('Stripe bağış linki açılıyor ama miktar çalışmıyor','Stripe Dashboard\'da Payment Link oluştururken <strong>"Customer sets price"</strong> seçeneği aktif olmalı.'),
        array('Wikipedia makaleleri yüklenmiyor','Sunucunuzun Wikipedia API\'sine erişebildiğinden emin olun. Bazı hostinglerde dış URL istekleri kısıtlanmış olabilir.'),
        array('SEO eklentim Yoast/RankMath ile çakışıyor mu?','Hayır. Tema SEO modülü, Yoast veya RankMath kurulu olduğunda otomatik olarak devre dışı kalır.'),
        array('Renkleri değiştirdim ama yansımıyor','DERVAK Yönetici → 🎨 Renkler sekmesinde kaydedin, sonra tarayıcı önbelleğini temizleyin.'),
    );
    foreach ($sorular as $i => $s): ?>
      <details style="margin-bottom:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px" <?= $i===0?'open':'' ?>>
        <summary>❓ <?= esc_html($s[0]) ?></summary>
        <div><?= wp_kses_post($s[1]) ?></div>
      </details>
    <?php endforeach;
    echo '<div class="reh-ipucu"><strong>Hâlâ sorun mu var?</strong> Sorununuzu bildirirken WordPress sürümü, PHP sürümü ve hata mesajını paylaşın.</div>';
}
