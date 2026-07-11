<?php
/**
 * VKV Admin Ayar Sayfaları
 * Slider, Duyurular, Etkinlikler, Bağış vs.
 */
defined('ABSPATH') || exit;

function vkv_admin_menu() {
    add_menu_page('DERVAK Tema','DERVAK Ayarları','manage_options','vkv-settings','vkv_settings_page','dashicons-shield',4);
    add_submenu_page('vkv-settings','Slider Yönetimi',          '🎞️ Slider',             'manage_options','vkv-slider',       'vkv_slider_page');
    add_submenu_page('vkv-settings','Renk & Logo',              '🎨 Renkler',             'manage_options','vkv-renkler',      'vkv_renkler_page');
    add_submenu_page('vkv-settings','Mobil Navbar',             '📱 Mobil Menü',          'manage_options','vkv-mobil-nav',    'vkv_mobil_nav_page');
    add_submenu_page('vkv-settings','Modül İçerikleri',         '⚙️ Modül İçerikleri',   'manage_options','vkv-modul-icerik', 'vkv_modul_icerik_page');
    add_submenu_page('vkv-settings','Duyurular',                '📢 Duyurular',           'manage_options','vkv-duyurular',    'vkv_duyurular_page');
    add_submenu_page('vkv-settings','Etkinlikler',              '📅 Etkinlikler',         'manage_options','vkv-etkinlik',     'vkv_etkinlik_page');
    add_submenu_page('vkv-settings','Bağış Ayarları',           '💝 Bağış',               'manage_options','vkv-bagis-set',    'vkv_bagis_settings_page');
}
add_action('admin_menu', 'vkv_admin_menu');

function vkv_admin_style() {
    echo '<style>
    .vkv-box{background:#fff;border:1px solid #c3c4c7;border-radius:4px;padding:20px;margin-bottom:16px}
    .vkv-box h3{margin:0 0 16px;font-size:14px;color:#1d2327;border-bottom:2px solid #8B1A1A;padding-bottom:8px}
    .vkv-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
    .vkv-row.three{grid-template-columns:1fr 1fr 1fr}
    .vkv-field label{display:block;font-size:12px;font-weight:600;color:#50575e;margin-bottom:4px}
    .vkv-field input,.vkv-field textarea,.vkv-field select{width:100%;border:1px solid #8c8f94;border-radius:4px;padding:8px 10px;font-size:13px}
    .vkv-field textarea{min-height:80px;resize:vertical}
    .vkv-num{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;background:#8B1A1A;color:#fff;border-radius:50%;font-size:12px;font-weight:700;margin-right:6px}
    .vkv-header{background:linear-gradient(135deg,#0D1117,#1C0A00);color:#fff;padding:16px 20px;border-radius:4px;margin-bottom:20px;display:flex;align-items:center;gap:14px}
    .vkv-header h2{margin:0;font-size:18px;color:#D97706}
    .vkv-header p{margin:4px 0 0;font-size:12px;color:rgba(255,255,255,.55)}
    .vkv-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
    .vkv-card{background:#fff;border:1px solid #c3c4c7;border-radius:4px;padding:18px;text-decoration:none;display:block}
    .vkv-card:hover{border-color:#8B1A1A}
    </style>';
}

function vkv_settings_page() {
    vkv_admin_style();
    ?>
    <div class="wrap">
    <div class="vkv-header"><div style="font-size:2.5rem">🛡️</div><div><h2>DERVAK Tema Ayarları</h2><p>Ana sayfa modülleri, renkler, slider ve tüm site ayarları</p></div></div>

    <h3 style="color:#8B1A1A;margin:0 0 12px">🎨 Görünüm & Tasarım</h3>
    <div class="vkv-cards" style="margin-bottom:20px">
      <?php foreach(array(
        array('vkv-slider',       '🎞️','Slider Yönetimi',      'Hero slider slaytları (bağımsız)'),
        array('vkv-renkler',      '🎨','Renk & Logo',           'Tema renkleri, logo, tipografi'),
        array('vkv-mobil-nav',    '📱','Mobil Menü',            'Mobil navbar öğeleri'),
        array('vkv-ansiklopedi',  '📚','Ansiklopedi Ayarları',  'Header renk, önerilen konular'),
      ) as $p): ?>
      <a href="<?php echo esc_url(admin_url('admin.php?page='.$p[0])); ?>" class="vkv-card">
        <div style="font-size:2rem;margin-bottom:8px"><?php echo $p[1]; ?></div>
        <div style="font-size:13px;font-weight:700;color:#1d2327;margin-bottom:4px"><?php echo esc_html($p[2]); ?></div>
        <div style="font-size:11px;color:#646970"><?php echo esc_html($p[3]); ?></div>
      </a>
      <?php endforeach; ?>
    </div>

    <h3 style="color:#8B1A1A;margin:0 0 12px">⚙️ Modül İçerikleri</h3>
    <div class="vkv-cards" style="margin-bottom:20px">
      <?php foreach(array(
        array('vkv-modul-icerik','⚙️','Modül İçerikleri',     'Savaşlar, Millî Günler, Hizmetler, Atatürk bandı'),
        array('vkv-duyurular',   '📢','Duyurular',             'Duyuru listesi'),
        array('vkv-etkinlik',    '📅','Etkinlikler',           'Etkinlik listesi'),
        array('vkv-bagis-set',   '💝','Bağış Ayarları',        'Stripe URL, IBAN, tutarlar'),
      ) as $p): ?>
      <a href="<?php echo esc_url(admin_url('admin.php?page='.$p[0])); ?>" class="vkv-card">
        <div style="font-size:2rem;margin-bottom:8px"><?php echo $p[1]; ?></div>
        <div style="font-size:13px;font-weight:700;color:#1d2327;margin-bottom:4px"><?php echo esc_html($p[2]); ?></div>
        <div style="font-size:11px;color:#646970"><?php echo esc_html($p[3]); ?></div>
      </a>
      <?php endforeach; ?>
    </div>

    <h3 style="color:#8B1A1A;margin:0 0 12px">🚀 Kurulum & Yönetim</h3>
    <div class="vkv-cards">
      <?php foreach(array(
        array('vkv-kurulum','🚀','Hızlı Kurulum','Sayfalar, menüler ve ana sayfa kurulumu'),
      ) as $p): ?>
      <a href="<?php echo esc_url(admin_url('admin.php?page='.$p[0])); ?>" class="vkv-card">
        <div style="font-size:2rem;margin-bottom:8px"><?php echo $p[1]; ?></div>
        <div style="font-size:13px;font-weight:700;color:#1d2327;margin-bottom:4px"><?php echo esc_html($p[2]); ?></div>
        <div style="font-size:11px;color:#646970"><?php echo esc_html($p[3]); ?></div>
      </a>
      <?php endforeach; ?>
    </div>
    </div>
    <?php
}

/* ── RENKLER & LOGO ── */
function vkv_renkler_page() {
    vkv_admin_style();
    if (isset($_POST['vkv_renk_nonce']) && wp_verify_nonce($_POST['vkv_renk_nonce'], 'vkv_renk_save')) {
        $cr    = sanitize_hex_color($_POST['cr']    ?? '#8B1A1A');
        $cr2   = sanitize_hex_color($_POST['cr2']   ?? '#6B1010');
        $cr3   = sanitize_hex_color($_POST['cr3']   ?? '#C53030');
        $altin = sanitize_hex_color($_POST['altin'] ?? '#B45309');
        $altin2= sanitize_hex_color($_POST['altin2']?? '#D97706');
        $dk    = sanitize_hex_color($_POST['dk']    ?? '#0D0B0B');
        set_theme_mod('vkv_cr',    $cr);
        set_theme_mod('vkv_cr2',   $cr2);
        set_theme_mod('vkv_cr3',   $cr3);
        set_theme_mod('vkv_altin', $altin);
        set_theme_mod('vkv_altin2',$altin2);
        set_theme_mod('vkv_dk',    $dk);
        set_theme_mod('vkv_logo_name', sanitize_text_field($_POST['logo_name'] ?? ''));
        set_theme_mod('vkv_logo_tag',  sanitize_text_field($_POST['logo_tag']  ?? ''));
        set_theme_mod('vkv_phone',    sanitize_text_field($_POST['phone']   ?? ''));
        set_theme_mod('vkv_email',    sanitize_email($_POST['email']         ?? ''));
        /* Sayfa Yönetici renk sistemiyle senkronize et */
        $mevcut_r = get_option('vkvsy_renkler', array());
        update_option('vkvsy_renkler', array_merge($mevcut_r, array(
            'birincil' => $cr,
            'ikincil'  => $cr2,
            'ucuncul'  => $cr3,
            'altin'    => $altin,
            'altin2'   => $altin2,
            'koyu'     => $dk,
        )));
        echo '<div class="notice notice-success"><p>✅ Renk & logo ayarları kaydedildi!</p></div>';
    }
    $cr     = get_theme_mod('vkv_cr',      '#8B1A1A');
    $cr2    = get_theme_mod('vkv_cr2',     '#6B1010');
    $cr3    = get_theme_mod('vkv_cr3',     '#C53030');
    $altin  = get_theme_mod('vkv_altin',   '#B45309');
    $altin2 = get_theme_mod('vkv_altin2',  '#D97706');
    $dk     = get_theme_mod('vkv_dk',      '#0D0B0B');
    ?>
    <div class="wrap">
    <div class="vkv-header"><div style="font-size:2.5rem">🎨</div><div><h2>Renk & Logo Ayarları</h2><p>Tema renklerini ve site kimliğini özelleştirin</p></div></div>
    <form method="post">
    <?php wp_nonce_field('vkv_renk_save','vkv_renk_nonce'); ?>
    <div class="vkv-box">
      <h3>🎨 Ana Renkler</h3>
      <p style="font-size:11px;color:#666;margin-bottom:12px">Rengi seçici ile <strong>veya</strong> hex kodu yazarak değiştirin — ikisi birbirini otomatik günceller. Kaydet'e basınca siteye yansır.</p>
      <div class="vkv-row three">
        <?php foreach(array(
            array('cr',    'Ana Renk (--cr)',    $cr),
            array('cr2',   'Koyu Renk (--cr2)',  $cr2),
            array('cr3',   'Açık Renk (--cr3)',  $cr3),
            array('altin', 'Altın (--altin)',    $altin),
            array('altin2','Açık Altın (--altin2)',$altin2),
            array('dk',    'Koyu Zemin (--dk)',  $dk),
        ) as $rf): ?>
        <div class="vkv-field" style="margin-bottom:10px">
          <label><?php echo esc_html($rf[1]); ?></label>
          <div style="display:flex;gap:6px;align-items:center">
            <input type="color" id="pick_<?php echo $rf[0]; ?>" value="<?php echo esc_attr($rf[2]); ?>"
                   oninput="document.getElementById('txt_<?php echo $rf[0]; ?>').value=this.value"
                   style="height:38px;width:48px;border:none;padding:0;cursor:pointer;background:none">
            <input type="text" id="txt_<?php echo $rf[0]; ?>" name="<?php echo $rf[0]; ?>" value="<?php echo esc_attr($rf[2]); ?>"
                   oninput="document.getElementById('pick_<?php echo $rf[0]; ?>').value=this.value"
                   style="flex:1;border:1px solid #8c8f94;border-radius:4px;padding:8px 10px;font-size:13px;font-family:monospace"
                   placeholder="#000000" maxlength="7">
          </div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
    <div class="vkv-box">
      <h3>🏢 Site Kimliği</h3>
      <div class="vkv-row">
        <div class="vkv-field"><label>Logo Adı (Header'da görünen kurum adı)</label><input type="text" name="logo_name" value="<?php echo esc_attr(get_theme_mod('vkv_logo_name','Vatan Kahramanları Vakfı')); ?>"></div>
        <div class="vkv-field"><label>Logo Tagline (Logo altındaki küçük yazı)</label><input type="text" name="logo_tag" value="<?php echo esc_attr(get_theme_mod('vkv_logo_tag','VATANI İÇİN ÖDEYEN KAHRAMANLAR')); ?>"></div>
      </div>
      <div class="vkv-row three">
        <div class="vkv-field"><label>Telefon</label><input type="text" name="phone" value="<?php echo esc_attr(get_theme_mod('vkv_phone','')); ?>" placeholder="+90 312 XXX XX XX"></div>
        <div class="vkv-field"><label>E-posta</label><input type="email" name="email" value="<?php echo esc_attr(get_theme_mod('vkv_email','')); ?>" placeholder="info@..."></div>
        <div class="vkv-field"><label>Site Tipi (bilgi)</label><input type="text" value="<?php echo esc_attr(get_option('vkv_site_tipi','vakif')); ?>" readonly style="background:#f0f0f1;color:#999"></div>
      </div>
      <p style="font-size:11px;color:#999;margin-top:8px">💡 Site tipini ve renkleri değiştirmek için <a href="<?php echo admin_url('admin.php?page=vkv-kurulum'); ?>">Kurulum Sihirbazı</a>'nı kullanın — tüm ayarları otomatik uygular.</p>
    </div>
    <?php submit_button('💾 Kaydet'); ?>
    </form></div>
    <?php
}

/* ── MOBİL NAVBAR ── */
function vkv_mobil_nav_page() {
    vkv_admin_style();
    if (isset($_POST['vkv_mobnav_nonce']) && wp_verify_nonce($_POST['vkv_mobnav_nonce'], 'vkv_mobnav_save')) {
        $items = array();
        for ($i = 0; $i < 20; $i++) {
            $label = sanitize_text_field($_POST["mn_label_$i"] ?? '');
            $url   = esc_url_raw($_POST["mn_url_$i"] ?? '');
            $parent= sanitize_text_field($_POST["mn_parent_$i"] ?? '');
            if ($label) $items[] = array('label'=>$label,'url'=>$url,'parent'=>$parent);
        }
        update_option('vkv_mobil_nav_items', $items);
        /* Alt navbar kaydet */
        $bn = array();
        for ($i = 0; $i < 5; $i++) {
            $el = sanitize_text_field($_POST["bn_etiket_$i"] ?? '');
            $bu = esc_url_raw($_POST["bn_url_$i"] ?? '');
            $bi = sanitize_text_field($_POST["bn_ikon_$i"] ?? 'fa fa-circle');
            $bb = !empty($_POST["bn_bagis_$i"]);
            if ($el) $bn[] = array('etiket'=>$el,'url'=>$bu,'ikon'=>$bi,'bagis'=>$bb);
        }
        if (!empty($bn)) update_option('vkv_bottom_nav_items', $bn);
        echo '<div class="notice notice-success"><p>✅ Mobil menü ve alt navbar kaydedildi!</p></div>';
    }
    $items = get_option('vkv_mobil_nav_items', array());
    if (empty($items)) {
        $items = array(
            array('label'=>'Ana Sayfa',    'url'=>'/',               'parent'=>''),
            array('label'=>'Kahramanlar',  'url'=>'/kahramanlar',    'parent'=>''),
            array('label'=>'Şehitlerimiz', 'url'=>'/sehitlerimiz',   'parent'=>'Kahramanlar'),
            array('label'=>'Gazilerimiz',  'url'=>'/gazilerimiz',    'parent'=>'Kahramanlar'),
            array('label'=>'Atatürk',      'url'=>'/ataturk',        'parent'=>''),
            array('label'=>'Tarih',        'url'=>'/tarih',          'parent'=>''),
            array('label'=>'Ansiklopedi',  'url'=>'/ansiklopedi',    'parent'=>''),
            array('label'=>'Haberler',     'url'=>'/haberler',       'parent'=>''),
            array('label'=>'Bağış Yap',    'url'=>'/bagis',          'parent'=>''),
            array('label'=>'İletişim',     'url'=>'/iletisim',       'parent'=>''),
        );
    }
    while (count($items) < 18) $items[] = array('label'=>'','url'=>'','parent'=>'');
    ?>
    <div class="wrap">
    <div class="vkv-header"><div style="font-size:2.5rem">📱</div><div><h2>Mobil Menü Yönetimi</h2><p>900px altında görünen hamburger menü öğelerini düzenleyin</p></div></div>
    <form method="post">
    <?php wp_nonce_field('vkv_mobnav_save','vkv_mobnav_nonce'); ?>
    <div class="vkv-box">
      <h3>📋 Menü Öğeleri</h3>
      <p style="font-size:12px;color:#666;margin-bottom:14px"><strong>Üst Menü:</strong> Parent alanı boş olan öğeler ana menüde görünür. Parent yazılı olanlar o başlığın altına girer. Boş bırakılan satırlar görmezden gelinir.</p>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#f0f0f1;font-size:12px;font-weight:600">
          <th style="padding:8px;text-align:left;border:1px solid #ddd">#</th>
          <th style="padding:8px;text-align:left;border:1px solid #ddd">Başlık</th>
          <th style="padding:8px;text-align:left;border:1px solid #ddd">URL</th>
          <th style="padding:8px;text-align:left;border:1px solid #ddd">Üst Menü (parent)</th>
        </tr>
        <?php foreach ($items as $i => $it): ?>
        <tr>
          <td style="padding:6px;border:1px solid #eee;color:#999;font-size:11px"><?php echo $i+1; ?></td>
          <td style="padding:6px;border:1px solid #eee"><input type="text" name="mn_label_<?php echo $i; ?>" value="<?php echo esc_attr($it['label']); ?>" style="width:100%;border:1px solid #ddd;padding:5px 7px;font-size:12px" placeholder="Başlık"></td>
          <td style="padding:6px;border:1px solid #eee"><input type="text" name="mn_url_<?php echo $i; ?>" value="<?php echo esc_attr($it['url']); ?>" style="width:100%;border:1px solid #ddd;padding:5px 7px;font-size:12px" placeholder="/sayfa-adi"></td>
          <td style="padding:6px;border:1px solid #eee"><input type="text" name="mn_parent_<?php echo $i; ?>" value="<?php echo esc_attr($it['parent']); ?>" style="width:100%;border:1px solid #ddd;padding:5px 7px;font-size:12px" placeholder="(boş = kök)"></td>
        </tr>
        <?php endforeach; ?>
      </table>
    </div>

    <!-- Alt Navbar (5 öğe, sabit) -->
    <?php
    $bn_items = get_option('vkv_bottom_nav_items', array(
        array('ikon'=>'fa fa-home',     'etiket'=>'Ana Sayfa',  'url'=>'/',           'bagis'=>false),
        array('ikon'=>'fa fa-book',     'etiket'=>'Ansiklopedi','url'=>'/ansiklopedi','bagis'=>false),
        array('ikon'=>'fa fa-heart',    'etiket'=>'Bağış Yap',  'url'=>'https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07','bagis'=>true),
        array('ikon'=>'fa fa-newspaper','etiket'=>'Haberler',   'url'=>'/haberler',   'bagis'=>false),
        array('ikon'=>'fa fa-envelope', 'etiket'=>'İletişim',   'url'=>'/iletisim',   'bagis'=>false),
    ));
    while (count($bn_items) < 5) $bn_items[] = array('ikon'=>'fa fa-circle','etiket'=>'','url'=>'/','bagis'=>false);
    $bn_items = array_slice($bn_items, 0, 5);
    ?>
    <div class="vkv-box" style="margin-top:20px">
      <h3>📱 Alt Sabit Navbar (5 Öğe — Mobil'de görünür)</h3>
      <p style="font-size:12px;color:#666;margin-bottom:14px">900px altındaki ekranlarda altta sabit çubuğun 5 öğesi. Font Awesome ikon sınıfı girin (örn: <code>fa fa-home</code>). "Bağış" kutucuğu işaretlenirse merkez buton olarak vurgular.</p>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#f0f0f1;font-size:12px;font-weight:600">
          <th style="padding:8px;border:1px solid #ddd">#</th>
          <th style="padding:8px;border:1px solid #ddd">İkon (Font Awesome)</th>
          <th style="padding:8px;border:1px solid #ddd">Etiket</th>
          <th style="padding:8px;border:1px solid #ddd">URL</th>
          <th style="padding:8px;border:1px solid #ddd">Bağış Butonu</th>
        </tr>
        <?php foreach ($bn_items as $i => $bn): ?>
        <tr>
          <td style="padding:6px;border:1px solid #eee;color:#999;font-size:11px;text-align:center"><?php echo $i+1; ?></td>
          <td style="padding:6px;border:1px solid #eee"><input type="text" name="bn_ikon_<?php echo $i; ?>" value="<?php echo esc_attr($bn['ikon']); ?>" style="width:100%;border:1px solid #ddd;padding:5px 7px;font-size:12px" placeholder="fa fa-home"></td>
          <td style="padding:6px;border:1px solid #eee"><input type="text" name="bn_etiket_<?php echo $i; ?>" value="<?php echo esc_attr($bn['etiket']); ?>" style="width:100%;border:1px solid #ddd;padding:5px 7px;font-size:12px" placeholder="Ana Sayfa"></td>
          <td style="padding:6px;border:1px solid #eee"><input type="text" name="bn_url_<?php echo $i; ?>" value="<?php echo esc_attr($bn['url']); ?>" style="width:100%;border:1px solid #ddd;padding:5px 7px;font-size:12px" placeholder="/sayfa-adi"></td>
          <td style="padding:6px;border:1px solid #eee;text-align:center"><input type="checkbox" name="bn_bagis_<?php echo $i; ?>" <?php echo !empty($bn['bagis']) ? 'checked' : ''; ?>></td>
        </tr>
        <?php endforeach; ?>
      </table>
    </div>

    <?php submit_button('💾 Menüyü Kaydet'); ?>
    </form></div>
    <?php
}

/* ── MODÜL İÇERİKLERİ ── */
function vkv_modul_icerik_page() {
    vkv_admin_style();
    $tab = isset($_GET['mtab']) ? sanitize_text_field($_GET['mtab']) : 'savalar';

    /* Kaydet */
    if (isset($_POST['vkv_mi_nonce']) && wp_verify_nonce($_POST['vkv_mi_nonce'], 'vkv_mi_save')) {
        switch ($tab) {
            case 'savalar':
                $savalar = array();
                for ($i = 0; $i < 10; $i++) {
                    $yil = sanitize_text_field($_POST["sv_yil_$i"] ?? '');
                    $bas = sanitize_text_field($_POST["sv_bas_$i"] ?? '');
                    $ac  = sanitize_text_field($_POST["sv_ac_$i"]  ?? '');
                    $url = esc_url_raw($_POST["sv_url_$i"]         ?? '');
                    if ($yil && $bas) $savalar[] = array('yil'=>$yil,'baslik'=>$bas,'aciklama'=>$ac,'url'=>$url);
                }
                update_option('vkv_turk_savaslari', json_encode($savalar, JSON_UNESCAPED_UNICODE));
                break;
            case 'milli':
                $gunler = array();
                for ($i = 0; $i < 15; $i++) {
                    $tar = sanitize_text_field($_POST["mg_tar_$i"] ?? '');
                    $bas = sanitize_text_field($_POST["mg_bas_$i"] ?? '');
                    $url = esc_url_raw($_POST["mg_url_$i"]         ?? '');
                    if ($tar && $bas) $gunler[] = array('tarih'=>$tar,'baslik'=>$bas,'url'=>$url);
                }
                update_option('vkv_milli_gunler', json_encode($gunler, JSON_UNESCAPED_UNICODE));
                break;
            case 'hizmetler':
                $hizmetler = array();
                for ($i = 0; $i < 12; $i++) {
                    $ikon = sanitize_text_field($_POST["hz_ikon_$i"] ?? '');
                    $bas  = sanitize_text_field($_POST["hz_bas_$i"]  ?? '');
                    $ac   = sanitize_text_field($_POST["hz_ac_$i"]   ?? '');
                    $url  = esc_url_raw($_POST["hz_url_$i"]          ?? '');
                    if ($bas) $hizmetler[] = array('ikon'=>$ikon,'baslik'=>$bas,'aciklama'=>$ac,'url'=>$url);
                }
                update_option('vkv_hizmetler', json_encode($hizmetler, JSON_UNESCAPED_UNICODE));
                break;
            case 'ataturk':
                update_option('vkv_ataturk_bandi_soz', sanitize_text_field($_POST['at_soz'] ?? ''));
                break;
            case 'kahraman':
                update_option('vkv_kahraman_band_baslik',   sanitize_text_field($_POST['kb_baslik']   ?? ''));
                update_option('vkv_kahraman_band_aciklama', sanitize_text_field($_POST['kb_aciklama'] ?? ''));
                update_option('vkv_soz_band_metin',         sanitize_text_field($_POST['sb_metin']    ?? ''));
                update_option('vkv_soz_band_kaynak',        sanitize_text_field($_POST['sb_kaynak']   ?? ''));
                break;
        }
        echo '<div class="notice notice-success"><p>✅ Kaydedildi!</p></div>';
    }

    $tabs = array('savalar'=>'⚔️ Türk Savaşları','milli'=>'🗓️ Millî Günler','hizmetler'=>'🤝 Hizmetler','ataturk'=>'🕯️ Atatürk Bandı','kahraman'=>'🛡️ Kahraman & Söz Bandı');
    $base = admin_url('admin.php?page=vkv-modul-icerik&mtab=');
    ?>
    <div class="wrap">
    <div class="vkv-header"><div style="font-size:2.5rem">⚙️</div><div><h2>Modül İçerikleri</h2><p>Ana sayfa modüllerinin içeriklerini düzenleyin</p></div></div>
    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:20px">
      <?php foreach ($tabs as $key => $label): ?>
      <a href="<?php echo esc_url($base.$key); ?>" class="button <?php echo $tab===$key?'button-primary':''; ?>"><?php echo $label; ?></a>
      <?php endforeach; ?>
    </div>
    <form method="post">
    <?php wp_nonce_field('vkv_mi_save','vkv_mi_nonce'); ?>

    <?php if ($tab === 'savalar'):
        $savalar = json_decode(get_option('vkv_turk_savaslari','[]'), true) ?: array();
        while (count($savalar) < 8) $savalar[] = array('yil'=>'','baslik'=>'','aciklama'=>'','url'=>''); ?>
    <div class="vkv-box">
      <h3>⚔️ Türk Milletinin Savaşları</h3>
      <?php foreach ($savalar as $i => $s): ?>
      <div class="vkv-box" style="background:#f9f9f9">
        <div class="vkv-row" style="grid-template-columns:.8fr 2fr 2fr 2fr">
          <div class="vkv-field"><label>Yıl</label><input type="text" name="sv_yil_<?php echo $i; ?>" value="<?php echo esc_attr($s['yil']); ?>" placeholder="1915"></div>
          <div class="vkv-field"><label>Başlık</label><input type="text" name="sv_bas_<?php echo $i; ?>" value="<?php echo esc_attr($s['baslik']); ?>" placeholder="Çanakkale Savaşı"></div>
          <div class="vkv-field"><label>Açıklama</label><input type="text" name="sv_ac_<?php echo $i; ?>" value="<?php echo esc_attr($s['aciklama']); ?>"></div>
          <div class="vkv-field"><label>URL</label><input type="text" name="sv_url_<?php echo $i; ?>" value="<?php echo esc_attr($s['url']); ?>" placeholder="/canakkale-savasi"></div>
        </div>
      </div>
      <?php endforeach; ?>
    </div>

    <?php elseif ($tab === 'milli'):
        $gunler = json_decode(get_option('vkv_milli_gunler','[]'), true) ?: array();
        while (count($gunler) < 12) $gunler[] = array('tarih'=>'','baslik'=>'','url'=>''); ?>
    <div class="vkv-box">
      <h3>🗓️ Millî Günler & Anma Törenleri</h3>
      <?php foreach ($gunler as $i => $g): ?>
      <div style="display:grid;grid-template-columns:.6fr 2fr 1.5fr;gap:10px;margin-bottom:10px;align-items:center">
        <div class="vkv-field"><label>Tarih</label><input type="text" name="mg_tar_<?php echo $i; ?>" value="<?php echo esc_attr($g['tarih']); ?>" placeholder="18 Mart"></div>
        <div class="vkv-field"><label>Başlık</label><input type="text" name="mg_bas_<?php echo $i; ?>" value="<?php echo esc_attr($g['baslik']); ?>" placeholder="Çanakkale Zaferi..."></div>
        <div class="vkv-field"><label>URL</label><input type="text" name="mg_url_<?php echo $i; ?>" value="<?php echo esc_attr($g['url']); ?>" placeholder="/milli-gunler"></div>
      </div>
      <?php endforeach; ?>
    </div>

    <?php elseif ($tab === 'hizmetler'):
        $hizmetler = json_decode(get_option('vkv_hizmetler','[]'), true) ?: array();
        while (count($hizmetler) < 9) $hizmetler[] = array('ikon'=>'🤝','baslik'=>'','aciklama'=>'','url'=>''); ?>
    <div class="vkv-box">
      <h3>🤝 Hizmetlerimiz & Çalışmalarımız</h3>
      <?php foreach ($hizmetler as $i => $h): ?>
      <div class="vkv-box" style="background:#f9f9f9">
        <div class="vkv-row" style="grid-template-columns:.5fr .8fr 2fr 2fr 1.5fr">
          <div class="vkv-field"><label>İkon (emoji)</label><input type="text" name="hz_ikon_<?php echo $i; ?>" value="<?php echo esc_attr($h['ikon']); ?>" style="font-size:1.5rem;text-align:center" placeholder="🤝"></div>
          <div class="vkv-field"><label>Başlık</label><input type="text" name="hz_bas_<?php echo $i; ?>" value="<?php echo esc_attr($h['baslik']); ?>"></div>
          <div class="vkv-field"><label>Açıklama</label><input type="text" name="hz_ac_<?php echo $i; ?>" value="<?php echo esc_attr($h['aciklama']); ?>"></div>
          <div class="vkv-field"><label>URL</label><input type="text" name="hz_url_<?php echo $i; ?>" value="<?php echo esc_attr($h['url']); ?>" placeholder="/hizmet-adi"></div>
        </div>
      </div>
      <?php endforeach; ?>
    </div>

    <?php elseif ($tab === 'ataturk'): ?>
    <div class="vkv-box">
      <h3>🕯️ Atatürk Bandı</h3>
      <div class="vkv-field">
        <label>Atatürk Sözü</label>
        <textarea name="at_soz" style="width:100%;min-height:80px;padding:8px;border:1px solid #ddd"><?php echo esc_textarea(get_option('vkv_ataturk_bandi_soz','Ne mutlu Türk\'üm diyene!')); ?></textarea>
      </div>
    </div>

    <?php elseif ($tab === 'kahraman'): ?>
    <div class="vkv-box">
      <h3>🛡️ Kahraman Bandı</h3>
      <div class="vkv-row">
        <div class="vkv-field"><label>Başlık</label><input type="text" name="kb_baslik" value="<?php echo esc_attr(get_option('vkv_kahraman_band_baslik','Kahramanlarımıza Saygı')); ?>"></div>
        <div class="vkv-field"><label>Açıklama</label><input type="text" name="kb_aciklama" value="<?php echo esc_attr(get_option('vkv_kahraman_band_aciklama','')); ?>"></div>
      </div>
    </div>
    <div class="vkv-box">
      <h3>💬 Söz Bandı (Manşet altı)</h3>
      <div class="vkv-row">
        <div class="vkv-field"><label>Söz Metni</label><textarea name="sb_metin" style="width:100%;min-height:60px;padding:8px;border:1px solid #ddd"><?php echo esc_textarea(get_option('vkv_soz_band_metin','')); ?></textarea></div>
        <div class="vkv-field"><label>Kaynak</label><input type="text" name="sb_kaynak" value="<?php echo esc_attr(get_option('vkv_soz_band_kaynak','Mustafa Kemal ATATÜRK')); ?>"></div>
      </div>
    </div>
    <?php endif; ?>

    <?php submit_button('💾 Kaydet'); ?>
    </form></div>
    <?php
}

/* ── SLIDER ── */
function vkv_slider_page() {
    vkv_admin_style();
    if (isset($_POST['vkv_slider_nonce']) && wp_verify_nonce($_POST['vkv_slider_nonce'],'vkv_slider_save')) {
        $slides = array();
        for ($i = 0; $i < 6; $i++) {
            $s = array(
                'image'   => isset($_POST["sl_image_$i"])   ? esc_url_raw($_POST["sl_image_$i"])   : '',
                'tag'     => isset($_POST["sl_tag_$i"])     ? sanitize_text_field($_POST["sl_tag_$i"]) : '',
                'title'   => isset($_POST["sl_title_$i"])   ? sanitize_text_field($_POST["sl_title_$i"]) : '',
                'excerpt' => isset($_POST["sl_excerpt_$i"]) ? sanitize_textarea_field($_POST["sl_excerpt_$i"]) : '',
                'url'     => isset($_POST["sl_url_$i"])     ? esc_url_raw($_POST["sl_url_$i"])     : '',
            );
            if ($s['title'] || $s['image']) $slides[] = $s;
        }
        update_option('vkv_slider_slides', $slides);
        echo '<div class="notice notice-success"><p>✅ Slider kaydedildi!</p></div>';
    }
    $slides = get_option('vkv_slider_slides', array());
    while (count($slides) < 5) $slides[] = array('image'=>'','tag'=>'','title'=>'','excerpt'=>'','url'=>'');
    ?>
    <div class="wrap">
    <div class="vkv-header"><div style="font-size:2.5rem">🎞️</div><div><h2>Slider Yönetimi</h2><p>Ana sayfa hero slider slaytlarını düzenleyin</p></div></div>
    <form method="post">
    <?php wp_nonce_field('vkv_slider_save','vkv_slider_nonce'); ?>
    <?php foreach ($slides as $i => $s): ?>
    <div class="vkv-box">
      <h3><span class="vkv-num"><?php echo $i+1; ?></span> Slayt <?php echo $i+1; ?></h3>
      <div class="vkv-row three">
        <div class="vkv-field"><label>Görsel URL</label><input type="url" name="sl_image_<?php echo $i; ?>" value="<?php echo esc_url($s['image']); ?>"></div>
        <div class="vkv-field"><label>Etiket/Kategori</label><input type="text" name="sl_tag_<?php echo $i; ?>" value="<?php echo esc_attr($s['tag']); ?>"></div>
        <div class="vkv-field"><label>Buton URL</label><input type="url" name="sl_url_<?php echo $i; ?>" value="<?php echo esc_url($s['url']); ?>"></div>
      </div>
      <div class="vkv-row">
        <div class="vkv-field"><label>Başlık</label><input type="text" name="sl_title_<?php echo $i; ?>" value="<?php echo esc_attr($s['title']); ?>"></div>
        <div class="vkv-field"><label>Açıklama</label><textarea name="sl_excerpt_<?php echo $i; ?>"><?php echo esc_textarea($s['excerpt']); ?></textarea></div>
      </div>
    </div>
    <?php endforeach; ?>
    <?php submit_button('💾 Kaydet'); ?>
    </form></div>
    <?php
}

/* ── BAĞIŞ AYARLARI ── */
function vkv_bagis_settings_page() {
    vkv_admin_style();
    if (isset($_POST['vkv_bagis_nonce']) && wp_verify_nonce($_POST['vkv_bagis_nonce'],'vkv_bagis_save')) {
        update_option('vkv_iban_opt',          sanitize_text_field($_POST['iban'] ?? 'TR49 0001 0012 6298 0865 4750 01'));
        update_option('vkv_banka_adi_opt',     sanitize_text_field($_POST['banka_adi'] ?? 'Ziraat Bankası'));
        update_option('vkv_banka_hesap_opt',   sanitize_text_field($_POST['banka_hesap'] ?? 'Vatan Kahramanları Vakfı'));
        set_theme_mod('vkv_bagis_url',         esc_url_raw($_POST['bagis_url'] ?? ''));
        echo '<div class="notice notice-success"><p>✅ Bağış ayarları kaydedildi!</p></div>';
    }
    ?>
    <div class="wrap">
    <div class="vkv-header"><div style="font-size:2.5rem">💝</div><div><h2>Bağış Ayarları</h2><p>Stripe URL ve IBAN bilgilerini düzenleyin</p></div></div>
    <form method="post">
    <?php wp_nonce_field('vkv_bagis_save','vkv_bagis_nonce'); ?>
    <div class="vkv-box">
      <h3>💳 Stripe</h3>
      <div class="vkv-field"><label>Stripe Bağış URL</label><input type="url" name="bagis_url" value="<?php echo esc_url(get_theme_mod('vkv_bagis_url','https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07')); ?>" style="width:100%"></div>
    </div>
    <div class="vkv-box">
      <h3>🏦 IBAN / Banka</h3>
      <div class="vkv-row three">
        <div class="vkv-field"><label>IBAN</label><input type="text" name="iban" value="<?php echo esc_attr(get_option('vkv_iban_opt','TR49 0001 0012 6298 0865 4750 01')); ?>"></div>
        <div class="vkv-field"><label>Banka Adı</label><input type="text" name="banka_adi" value="<?php echo esc_attr(get_option('vkv_banka_adi_opt','Ziraat Bankası')); ?>"></div>
        <div class="vkv-field"><label>Hesap Adı</label><input type="text" name="banka_hesap" value="<?php echo esc_attr(get_option('vkv_banka_hesap_opt','Vatan Kahramanları Vakfı')); ?>"></div>
      </div>
    </div>
    <?php submit_button('💾 Kaydet'); ?>
    </form></div>
    <?php
}

/* ── DUYURULAR ── */
function vkv_duyurular_page() {
    vkv_admin_style();
    if (isset($_POST['vkv_duyuru_nonce']) && wp_verify_nonce($_POST['vkv_duyuru_nonce'],'vkv_duyuru_save')) {
        $items = array();
        for ($i=0;$i<8;$i++) {
            $title = sanitize_text_field($_POST["dy_title_$i"] ?? '');
            $url   = esc_url_raw($_POST["dy_url_$i"] ?? '');
            $date  = sanitize_text_field($_POST["dy_date_$i"] ?? '');
            if ($title) $items[] = array('title'=>$title,'url'=>$url,'date'=>$date);
        }
        update_option('vkv_duyurular', $items);
        echo '<div class="notice notice-success"><p>✅ Duyurular kaydedildi!</p></div>';
    }
    $items = get_option('vkv_duyurular', array());
    while (count($items) < 6) $items[] = array('title'=>'','url'=>'','date'=>'');
    ?>
    <div class="wrap">
    <div class="vkv-header"><div style="font-size:2.5rem">📢</div><div><h2>Duyurular</h2></div></div>
    <form method="post">
    <?php wp_nonce_field('vkv_duyuru_save','vkv_duyuru_nonce'); ?>
    <?php foreach ($items as $i => $d): ?>
    <div class="vkv-box">
      <h3><span class="vkv-num"><?php echo $i+1; ?></span> Duyuru <?php echo $i+1; ?></h3>
      <div class="vkv-row three">
        <div class="vkv-field"><label>Başlık</label><input type="text" name="dy_title_<?php echo $i; ?>" value="<?php echo esc_attr($d['title']); ?>"></div>
        <div class="vkv-field"><label>URL</label><input type="url" name="dy_url_<?php echo $i; ?>" value="<?php echo esc_url($d['url']); ?>"></div>
        <div class="vkv-field"><label>Tarih</label><input type="text" name="dy_date_<?php echo $i; ?>" value="<?php echo esc_attr($d['date']); ?>"></div>
      </div>
    </div>
    <?php endforeach; ?>
    <?php submit_button('💾 Kaydet'); ?>
    </form></div>
    <?php
}

/* ── ETKİNLİKLER ── */
function vkv_etkinlik_page() {
    vkv_admin_style();
    if (isset($_POST['vkv_etkinlik_nonce']) && wp_verify_nonce($_POST['vkv_etkinlik_nonce'],'vkv_etkinlik_save')) {
        $items = array();
        for ($i=0;$i<6;$i++) {
            $title = sanitize_text_field($_POST["et_title_$i"] ?? '');
            $url   = esc_url_raw($_POST["et_url_$i"] ?? '');
            $date  = sanitize_text_field($_POST["et_date_$i"] ?? '');
            $yer   = sanitize_text_field($_POST["et_yer_$i"] ?? '');
            if ($title) $items[] = array('title'=>$title,'url'=>$url,'date'=>$date,'yer'=>$yer);
        }
        update_option('vkv_etkinlikler', $items);
        echo '<div class="notice notice-success"><p>✅ Etkinlikler kaydedildi!</p></div>';
    }
    $items = get_option('vkv_etkinlikler', array());
    while (count($items) < 5) $items[] = array('title'=>'','url'=>'','date'=>'','yer'=>'');
    ?>
    <div class="wrap">
    <div class="vkv-header"><div style="font-size:2.5rem">📅</div><div><h2>Etkinlikler</h2></div></div>
    <form method="post">
    <?php wp_nonce_field('vkv_etkinlik_save','vkv_etkinlik_nonce'); ?>
    <?php foreach ($items as $i => $e): ?>
    <div class="vkv-box">
      <h3><span class="vkv-num"><?php echo $i+1; ?></span> Etkinlik <?php echo $i+1; ?></h3>
      <div class="vkv-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
        <div class="vkv-field"><label>Başlık</label><input type="text" name="et_title_<?php echo $i; ?>" value="<?php echo esc_attr($e['title']); ?>"></div>
        <div class="vkv-field"><label>Tarih</label><input type="text" name="et_date_<?php echo $i; ?>" value="<?php echo esc_attr($e['date']); ?>"></div>
        <div class="vkv-field"><label>Yer</label><input type="text" name="et_yer_<?php echo $i; ?>" value="<?php echo esc_attr($e['yer'] ?? ''); ?>"></div>
        <div class="vkv-field"><label>URL</label><input type="url" name="et_url_<?php echo $i; ?>" value="<?php echo esc_url($e['url']); ?>"></div>
      </div>
    </div>
    <?php endforeach; ?>
    <?php submit_button('💾 Kaydet'); ?>
    </form></div>
    <?php
}
