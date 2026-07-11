<?php
if ( ! defined('ABSPATH') ) exit;

add_action('admin_menu', function(){
    add_menu_page('Ahenk Haber Ayarları','Ahenk Haber','manage_options','ahenk-haber-ayarlar','ahp_admin_sayfa','dashicons-admin-site-alt3',3);
    add_submenu_page('ahenk-haber-ayarlar','Kurulum Rehberi','📖 Kurulum Rehberi','manage_options','ahenk-kurulum','ahp_kurulum_sayfa');
});

add_action('admin_init', function(){
    if ( isset($_POST['ahenk_ayar_submit']) && check_admin_referer('ahenk_ayarlar_nonce','ahenk_nonce_field') ) {
        $alanlar = array(
            'ahenk_reklam_header','ahenk_reklam_after_hero','ahenk_reklam_sidebar_top',
            'ahenk_reklam_icerik_1','ahenk_reklam_footer','ahenk_reklam_mobil',
            'ahenk_openweather_api','ahenk_hava_sehir',
        );
        foreach ($alanlar as $alan) {
            if (isset($_POST[$alan])) {
                update_option($alan, wp_kses_post(stripslashes($_POST[$alan])));
            }
        }
        add_settings_error('ahenk','ok','Ayarlar kaydedildi.','updated');
    }
});

// Kategori renk + meta
add_action('haber-kategorisi_edit_form_fields', function($term){
    $renk = get_term_meta($term->term_id,'kategori_rengi',true) ?: '#CC0000';
    echo '<tr><th>Kategori Rengi</th><td>';
    wp_nonce_field('ahenk_kat_renk','ahenk_kat_nonce');
    echo '<input type="color" name="kategori_rengi" value="'.esc_attr($renk).'"></td></tr>';
});
add_action('edited_haber-kategorisi', function($term_id){
    if ( wp_verify_nonce($_POST['ahenk_kat_nonce']??'','ahenk_kat_renk') && isset($_POST['kategori_rengi']) ) {
        update_term_meta($term_id,'kategori_rengi',sanitize_hex_color($_POST['kategori_rengi']));
    }
});

function ahp_admin_sayfa(){
    settings_errors('ahenk');
    $sekme = sanitize_key($_GET['sekme'] ?? 'reklam');
    ?>
    <div class="wrap">
        <h1 style="display:flex;align-items:center;gap:8px;">
            <span style="background:#CC0000;color:#fff;padding:2px 10px;border-radius:4px;">AHENK</span> HABER Ayarları
        </h1>
        <nav class="nav-tab-wrapper">
            <a href="?page=ahenk-haber-ayarlar&sekme=reklam"   class="nav-tab <?= $sekme=='reklam'?'nav-tab-active':''?>">Reklam</a>
            <a href="?page=ahenk-haber-ayarlar&sekme=hava"     class="nav-tab <?= $sekme=='hava'?'nav-tab-active':''?>">Hava/Spor</a>
            <a href="?page=ahenk-haber-ayarlar&sekme=guvenlik" class="nav-tab <?= $sekme=='guvenlik'?'nav-tab-active':''?>">Güvenlik</a>
        </nav>
        <form method="POST" style="margin-top:20px;">
            <?php wp_nonce_field('ahenk_ayarlar_nonce','ahenk_nonce_field'); ?>
            <?php if ($sekme === 'reklam') : ?>
                <h2>Reklam Alanları</h2>
                <table class="form-table">
                    <?php foreach(array(
                        'ahenk_reklam_header'     =>'Header Reklam (728x90)',
                        'ahenk_reklam_after_hero' =>'Manşet Altı Reklam (970x90)',
                        'ahenk_reklam_sidebar_top'=>'Sidebar Reklam (300x250)',
                        'ahenk_reklam_icerik_1'   =>'Haber İçi Reklam',
                        'ahenk_reklam_footer'     =>'Footer Reklam',
                        'ahenk_reklam_mobil'      =>'Mobil Alt Reklam (320x50)',
                    ) as $k=>$v): ?>
                    <tr><th><?=esc_html($v)?></th>
                        <td><textarea name="<?=esc_attr($k)?>" rows="3" class="large-text" style="font-family:monospace;font-size:12px"><?=esc_textarea(get_option($k,''))?></textarea></td>
                    </tr>
                    <?php endforeach; ?>
                </table>
            <?php elseif ($sekme === 'hava') : ?>
                <h2>Hava Durumu & Spor API</h2>
                <table class="form-table">
                    <tr><th>OpenWeatherMap API Key</th>
                        <td><input type="text" name="ahenk_openweather_api" value="<?=esc_attr(get_option('ahenk_openweather_api',''))?>" class="regular-text">
                        <br><small><a href="https://openweathermap.org/api" target="_blank">Ücretsiz API key al</a> (1000 istek/gün)</small></td>
                    </tr>
                    <tr><th>Hava Durumu Şehri</th>
                        <td><input type="text" name="ahenk_hava_sehir" value="<?=esc_attr(get_option('ahenk_hava_sehir','Ankara'))?>" class="regular-text">
                        <br><small>Türkçe şehir adı: Ankara, Istanbul, Izmir...</small></td>
                    </tr>
                </table>
            <?php elseif ($sekme === 'guvenlik') : ?>
                <div style="background:#e8f5e9;border-left:4px solid #2E7D32;padding:16px;border-radius:6px;">
                    <h3 style="color:#1b5e20;margin-top:0">✅ Aktif Güvenlik Önlemleri</h3>
                    <ul style="color:#1b5e20;line-height:2;margin:0;padding-left:20px">
                        <li>XML-RPC devre dışı</li><li>WordPress sürümü gizli</li>
                        <li>Giriş deneme limiti (5 hata → 30dk blok)</li>
                        <li>Güvenlik HTTP başlıkları</li><li>REST API kullanıcı listesi gizli</li>
                        <li>Uploads klasörü PHP engeli</li>
                    </ul>
                </div>
            <?php endif; ?>
            <p class="submit"><button type="submit" name="ahenk_ayar_submit" class="button button-primary">💾 Kaydet</button></p>
        </form>
    </div>
    <?php
}

/* Kurulum Rehberi Admin Sayfası */
function ahp_kurulum_sayfa(){
    $rehber = get_template_directory_uri() . '/kurulum-rehberi/index.html';
    echo '<div class="wrap">';
    echo '<h1>📖 Ahenk Haber — Kurulum Rehberi</h1>';
    echo '<p>Aşağıdaki çerçevede kurulum adımlarını takip edebilir veya <a href="'.esc_url($rehber).'" target="_blank"><strong>yeni sekmede açmak</strong></a> için tıklayabilirsiniz.</p>';
    echo '<iframe src="'.esc_url($rehber).'" style="width:100%;height:85vh;border:1px solid #ddd;border-radius:8px;margin-top:10px"></iframe>';
    echo '</div>';
}
