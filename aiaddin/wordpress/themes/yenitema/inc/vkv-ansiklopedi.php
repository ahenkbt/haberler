<?php
/**
 * VKV Ansiklopedi — Wikipedia AJAX entegrasyonu
 * Kategori / konu bazlı arama (tek makale değil)
 * Kanca: wp_ajax_nopriv_vkv_wiki_ara + wp_ajax_vkv_wiki_ara
 */
defined('ABSPATH') || exit;

/* ── AJAX handler (oturum açmayan kullanıcı için de açık) ── */
add_action('wp_ajax_nopriv_vkv_wiki_ara', 'vkv_wiki_ara_handler');
add_action('wp_ajax_vkv_wiki_ara',        'vkv_wiki_ara_handler');

function vkv_wiki_ara_handler() {
    check_ajax_referer('vkv_wiki_ara', 'nonce');

    $q   = sanitize_text_field(wp_unslash($_POST['q'] ?? ''));
    $dil = in_array($_POST['dil'] ?? 'tr', array('tr','en')) ? sanitize_text_field($_POST['dil']) : 'tr';

    if (empty($q)) {
        wp_send_json_error('Arama terimi boş olamaz.');
    }

    /* Önbellek: 1 saat */
    $cache_key = 'vkv_wiki_' . md5($dil . '_' . $q);
    $cached    = get_transient($cache_key);
    if ($cached !== false) {
        wp_send_json_success($cached);
    }

    /* Wikipedia Arama API */
    $search_url = add_query_arg(array(
        'action'   => 'query',
        'list'     => 'search',
        'srsearch' => $q,
        'srlimit'  => 9,
        'srinfo'   => '',
        'srprop'   => 'snippet',
        'format'   => 'json',
        'origin'   => '*',
    ), "https://{$dil}.wikipedia.org/w/api.php");

    $resp = wp_remote_get($search_url, array(
        'timeout'    => 10,
        'user-agent' => 'VKVWikiSearch/1.0 (WordPress; ' . home_url() . ')',
    ));

    if (is_wp_error($resp)) {
        wp_send_json_error('Wikipedia bağlantı hatası: ' . $resp->get_error_message());
    }

    $body   = json_decode(wp_remote_retrieve_body($resp), true);
    $search = $body['query']['search'] ?? array();

    if (empty($search)) {
        wp_send_json_success(array());
    }

    /* Her sonuç için özet çek (paralel değil, ard arda — WordPress limit) */
    $results = array();
    foreach (array_slice($search, 0, 6) as $hit) {
        $title    = $hit['title'];
        $enc      = rawurlencode(str_replace(' ', '_', $title));
        $sum_url  = "https://{$dil}.wikipedia.org/api/rest_v1/page/summary/{$enc}";

        $sum_resp = wp_remote_get($sum_url, array('timeout' => 6));
        if (is_wp_error($sum_resp)) continue;

        $code = wp_remote_retrieve_response_code($sum_resp);
        if ($code !== 200) continue;

        $sum = json_decode(wp_remote_retrieve_body($sum_resp), true);
        if (empty($sum)) continue;

        $results[] = array(
            'title'       => $sum['title']        ?? $title,
            'description' => $sum['description']  ?? '',
            'extract'     => isset($sum['extract']) ? wp_trim_words($sum['extract'], 30, '…') : '',
            'thumbnail'   => $sum['thumbnail']['source'] ?? '',
            'url'         => $sum['content_urls']['desktop']['page'] ?? "https://{$dil}.wikipedia.org/wiki/{$enc}",
        );
    }

    set_transient($cache_key, $results, HOUR_IN_SECONDS);
    wp_send_json_success($results);
}

/* ── Ansiklopedi admin menü ── */
add_action('admin_menu', 'vkv_ansi_admin_menu', 20);
function vkv_ansi_admin_menu() {
    add_submenu_page(
        'vkv-settings',
        'Ansiklopedi Ayarları',
        '📚 Ansiklopedi',
        'manage_options',
        'vkv-ansiklopedi',
        'vkv_ansi_settings_page'
    );
}

function vkv_ansi_settings_page() {
    if (isset($_POST['vkv_ansi_nonce']) && wp_verify_nonce($_POST['vkv_ansi_nonce'], 'vkv_ansi_save')) {
        update_option('vkv_ansi_renk1',   sanitize_hex_color($_POST['ansi_renk1']   ?? '#0d9488'));
        update_option('vkv_ansi_renk2',   sanitize_hex_color($_POST['ansi_renk2']   ?? '#0f766e'));
        update_option('vkv_ansi_baslik',  sanitize_text_field($_POST['ansi_baslik']  ?? ''));
        update_option('vkv_ansi_altyazi', sanitize_text_field($_POST['ansi_altyazi'] ?? ''));
        update_option('vkv_ansi_dil',     in_array($_POST['ansi_dil'] ?? 'tr', array('tr','en')) ? $_POST['ansi_dil'] : 'tr');
        update_option('vkv_ansi_konular', sanitize_textarea_field($_POST['ansi_konular'] ?? ''));
        echo '<div class="notice notice-success"><p>✅ Ansiklopedi ayarları kaydedildi!</p></div>';
    }

    $r1      = get_option('vkv_ansi_renk1',    '#0d9488');
    $r2      = get_option('vkv_ansi_renk2',    '#0f766e');
    $baslik  = get_option('vkv_ansi_baslik',   '');
    $altyazi = get_option('vkv_ansi_altyazi',  '');
    $dil     = get_option('vkv_ansi_dil',      'tr');
    $konular = get_option('vkv_ansi_konular',  'Türk Tarihi,Atatürk,Çanakkale Savaşı,Osmanlı İmparatorluğu,Kurtuluş Savaşı,Türk Kültürü,Türk Devletleri,Selçuklu,Türkiye,Orta Asya');
    ?>
    <div class="wrap">
    <div class="vkv-header"><div style="font-size:2.5rem">📚</div><div><h2>Ansiklopedi Ayarları</h2><p>/ansiklopedi/ sayfasını özelleştirin</p></div></div>
    <form method="post">
    <?php wp_nonce_field('vkv_ansi_save','vkv_ansi_nonce'); ?>

    <div class="vkv-box">
      <h3>🎨 Hero Bölüm Rengi</h3>
      <p style="font-size:12px;color:#666;margin-bottom:12px">Ansiklopedi sayfasının üst (header) arka plan rengi</p>
      <div class="vkv-row">
        <div class="vkv-field">
          <label>Başlangıç Rengi</label>
          <input type="color" name="ansi_renk1" value="<?php echo esc_attr($r1); ?>" style="height:40px;padding:2px;width:100%">
          <input type="text" name="ansi_renk1" value="<?php echo esc_attr($r1); ?>" placeholder="#0d9488" style="margin-top:4px;width:100%">
        </div>
        <div class="vkv-field">
          <label>Bitiş Rengi (gradient)</label>
          <input type="color" name="ansi_renk2" value="<?php echo esc_attr($r2); ?>" style="height:40px;padding:2px;width:100%">
          <input type="text" name="ansi_renk2" value="<?php echo esc_attr($r2); ?>" placeholder="#0f766e" style="margin-top:4px;width:100%">
        </div>
      </div>
      <div style="height:60px;border-radius:4px;background:linear-gradient(135deg,<?php echo esc_attr($r1); ?>,<?php echo esc_attr($r2); ?>);margin-top:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:600">Önizleme</div>
    </div>

    <div class="vkv-box">
      <h3>📝 Başlık & Altyazı</h3>
      <div class="vkv-row">
        <div class="vkv-field">
          <label>Sayfa Başlığı</label>
          <input type="text" name="ansi_baslik" value="<?php echo esc_attr($baslik); ?>" placeholder="Türk Tarihi Ansiklopedisi">
        </div>
        <div class="vkv-field">
          <label>Altyazı</label>
          <input type="text" name="ansi_altyazi" value="<?php echo esc_attr($altyazi); ?>" placeholder="Türk tarihi, kültürü ve medeniyeti hakkında...">
        </div>
      </div>
    </div>

    <div class="vkv-box">
      <h3>🌐 Wikipedia Dili & Önerilen Konular</h3>
      <div class="vkv-row">
        <div class="vkv-field">
          <label>Wikipedia Dili</label>
          <select name="ansi_dil" style="width:100%;padding:8px;border:1px solid #8c8f94;border-radius:4px">
            <option value="tr" <?php selected($dil,'tr'); ?>>Türkçe (tr.wikipedia.org)</option>
            <option value="en" <?php selected($dil,'en'); ?>>İngilizce (en.wikipedia.org)</option>
          </select>
        </div>
        <div class="vkv-field">
          <label>Önerilen Konular <span style="color:#999">(virgülle ayırın)</span></label>
          <textarea name="ansi_konular" rows="3"><?php echo esc_textarea($konular); ?></textarea>
        </div>
      </div>
      <p style="font-size:11px;color:#999;margin-top:4px">Örnek: Türk Tarihi,Atatürk,Çanakkale Savaşı,Osmanlı İmparatorluğu</p>
    </div>

    <?php submit_button('💾 Kaydet'); ?>
    </form>

    <div class="vkv-box" style="background:#f0f9f0">
      <h3>🔗 Kullanım</h3>
      <p>Ansiklopedi sayfasını kullanmak için WordPress'te <code>/ansiklopedi/</code> slug'ına sahip bir sayfa oluşturun ve "Ansiklopedi" şablonunu seçin.</p>
      <ul style="font-size:13px;color:#444;line-height:2">
        <li>✅ Sayfa şablonu: <strong>Ansiklopedi</strong></li>
        <li>✅ Sayfa permalink: <code>/ansiklopedi/</code></li>
        <li>✅ Wikipedia dili seçilebilir</li>
        <li>✅ Arama önbelleği: 1 saat</li>
      </ul>
    </div>
    </div>
    <?php
}
