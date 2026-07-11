<?php
/**
 * VKV Tema — Web Push Bildirimi Modülü
 *
 * VAPID tabansız basit push: tarayıcı aboneliği + WP Admin gönderme paneli.
 * Harici kütüphane gerektirmez — web-push PHP kütüphanesi kuruluysa daha güçlü.
 *
 * Çalışma akışı:
 *  1. Frontend: service-worker.js kaydı + abone ol butonu
 *  2. REST endpoint: aboneliği kaydet  /wp-json/vkv/v1/push/subscribe
 *  3. Admin panel: Ayarlar > Push Bildirimleri → "Gönder" butonu
 *  4. Gönder endpoint: /wp-json/vkv/v1/push/send
 */

if (!defined('ABSPATH')) exit;

/* ════════════════════════════════════════════
   1. SERVICE WORKER'I KÖKTEN SERVE ET
════════════════════════════════════════════ */
add_action('init', function() {
    if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/vkv-sw.js') !== false) {
        header('Content-Type: application/javascript; charset=utf-8');
        header('Service-Worker-Allowed: /');
        // WordPress'in 404 redirect'ini engelle
        status_header(200);
        readfile(__DIR__ . '/../vkv-sw.js');
        exit;
    }
});

/* ════════════════════════════════════════════
   2. REST API ENDPOINTLERİ
════════════════════════════════════════════ */
add_action('rest_api_init', function() {
    // Abone ol
    register_rest_route('vkv/v1', '/push/subscribe', array(
        'methods'             => 'POST',
        'callback'            => 'vkv_push_subscribe',
        'permission_callback' => '__return_true',
        'args'                => array(
            'endpoint'  => array('required'=>true, 'sanitize_callback'=>'esc_url_raw'),
            'keys'      => array('required'=>true),
        ),
    ));
    // Gönder (sadece admin)
    register_rest_route('vkv/v1', '/push/send', array(
        'methods'             => 'POST',
        'callback'            => 'vkv_push_send',
        'permission_callback' => function(){ return current_user_can('manage_options'); },
    ));
    // Aboneliği sil
    register_rest_route('vkv/v1', '/push/unsubscribe', array(
        'methods'             => 'POST',
        'callback'            => 'vkv_push_unsubscribe',
        'permission_callback' => '__return_true',
        'args'                => array('endpoint' => array('required'=>true, 'sanitize_callback'=>'esc_url_raw')),
    ));
});

// Abone kaydet
function vkv_push_subscribe(WP_REST_Request $req) {
    $endpoint = $req->get_param('endpoint');
    $keys     = $req->get_param('keys');

    if (!$endpoint) return new WP_REST_Response(array('error'=>'Endpoint eksik'), 400);

    $aboneler = get_option('vkv_push_aboneler', array());

    // Dizi temizle (eski format uyumu)
    if (!is_array($aboneler)) $aboneler = array();

    // Yineleme önle
    $hash = md5($endpoint);
    $aboneler[$hash] = array(
        'endpoint'  => $endpoint,
        'keys'      => is_array($keys) ? $keys : array(),
        'tarih'     => current_time('mysql'),
        'ip'        => substr(md5($_SERVER['REMOTE_ADDR'] ?? ''), 0, 8),
    );

    update_option('vkv_push_aboneler', $aboneler);

    return new WP_REST_Response(array('success'=>true, 'abone_sayisi'=>count($aboneler)), 200);
}

// Aboneliği sil
function vkv_push_unsubscribe(WP_REST_Request $req) {
    $endpoint = $req->get_param('endpoint');
    $aboneler = get_option('vkv_push_aboneler', array());
    $hash     = md5($endpoint);
    if (isset($aboneler[$hash])) {
        unset($aboneler[$hash]);
        update_option('vkv_push_aboneler', $aboneler);
    }
    return new WP_REST_Response(array('success'=>true), 200);
}

// Bildirim gönder
function vkv_push_send(WP_REST_Request $req) {
    $title    = sanitize_text_field($req->get_param('title')   ?? '');
    $body     = sanitize_text_field($req->get_param('body')    ?? '');
    $url      = esc_url_raw($req->get_param('url')             ?? home_url('/'));
    $icon     = esc_url_raw($req->get_param('icon')            ?? '');
    $aboneler = get_option('vkv_push_aboneler', array());

    if (empty($aboneler)) {
        return new WP_REST_Response(array('error'=>'Abone bulunamadı'), 404);
    }

    $payload = wp_json_encode(array('title'=>$title,'body'=>$body,'url'=>$url,'icon'=>$icon));
    $basari  = 0;
    $hata    = 0;

    foreach ($aboneler as $hash => $abone) {
        $ep   = $abone['endpoint'];
        $keys = $abone['keys'] ?? array();

        // Basit HTTP POST ile push (VAPID olmadan — Chrome eski abonelikler için)
        $response = wp_remote_post($ep, array(
            'headers'   => array(
                'Content-Type'     => 'application/json',
                'Content-Encoding' => 'aesgcm',
                'TTL'              => 86400,
            ),
            'body'      => $payload,
            'timeout'   => 5,
            'sslverify' => false,
        ));

        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) >= 400) {
            $hata++;
            // Geçersiz aboneliği temizle (410 Gone)
            $code = is_wp_error($response) ? 0 : wp_remote_retrieve_response_code($response);
            if ($code === 410 || $code === 404) {
                unset($aboneler[$hash]);
            }
        } else {
            $basari++;
        }
    }
    update_option('vkv_push_aboneler', $aboneler);

    return new WP_REST_Response(array('gonderilen'=>$basari,'hata'=>$hata,'toplam'=>count($aboneler)), 200);
}

/* ════════════════════════════════════════════
   3. FRONTEND SCRIPT (abone ol butonu)
════════════════════════════════════════════ */
add_action('wp_footer', 'vkv_push_frontend_script', 20);
function vkv_push_frontend_script() {
    if (get_option('vkv_push_aktif', '1') !== '1') return;
    $site_name = get_bloginfo('name');
    $logo_id   = get_theme_mod('custom_logo');
    $icon      = $logo_id ? wp_get_attachment_image_url($logo_id, 'thumbnail') : '';
    ?>
<script>
(function(){
  var VKV_REST = <?php echo json_encode(esc_url(home_url('/'))); ?>;
  var VKV_SW   = <?php echo json_encode(esc_url(home_url('/vkv-sw.js'))); ?>;
  var VKV_ICON = <?php echo json_encode($icon ?: ''); ?>;
  var VKV_SUBSCRIBE_URL = VKV_REST + 'wp-json/vkv/v1/push/subscribe';

  // Service Worker desteği yoksa çık
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  // SW'yi kaydet
  navigator.serviceWorker.register(VKV_SW, {scope: '/'}).then(function(reg) {
    // Zaten izin verilmişse abone olmayı dene
    if (Notification.permission === 'granted') {
      vkvEnsureSubscription(reg);
    }
  }).catch(function(e){ console.warn('VKV SW:', e); });

  // İzin iste butonu — dom hazırsa göster
  function showPushPrompt() {
    if (Notification.permission !== 'default') return;
    if (sessionStorage.getItem('vkv_push_dismissed')) return;

    var bar = document.createElement('div');
    bar.id = 'vkv-push-bar';
    bar.innerHTML = '<div style="display:flex;align-items:center;gap:12px;max-width:640px">' +
      '<span style="font-size:20px">🔔</span>' +
      '<span style="flex:1;font-size:13px;font-weight:500">Son dakika haberler için bildirim almak ister misiniz?</span>' +
      '<button id="vkv-push-evet" style="background:#fff;color:#8B1A1A;border:none;padding:7px 18px;border-radius:3px;font-weight:700;cursor:pointer;font-size:12px">Evet, abone ol</button>' +
      '<button id="vkv-push-hayir" style="background:transparent;color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.2);padding:7px 14px;border-radius:3px;cursor:pointer;font-size:12px">Şimdi değil</button>' +
      '</div>';
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:linear-gradient(90deg,#8B1A1A,#B45309);color:#fff;padding:14px 24px;z-index:99999;box-shadow:0 -4px 20px rgba(0,0,0,.3);display:flex;justify-content:center;animation:vkvSlideUp .3s ease';
    var style = document.createElement('style');
    style.textContent = '@keyframes vkvSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}';
    document.head.appendChild(style);
    document.body.appendChild(bar);

    document.getElementById('vkv-push-evet').onclick = function() {
      bar.remove();
      Notification.requestPermission().then(function(perm) {
        if (perm === 'granted') {
          navigator.serviceWorker.ready.then(vkvEnsureSubscription);
        }
      });
    };
    document.getElementById('vkv-push-hayir').onclick = function() {
      bar.remove();
      sessionStorage.setItem('vkv_push_dismissed', '1');
    };
  }

  // 3 saniye sonra göster
  setTimeout(showPushPrompt, 3000);

  function vkvEnsureSubscription(reg) {
    reg.pushManager.getSubscription().then(function(sub) {
      if (!sub) {
        // applicationServerKey olmadan subscribe (Firebase/Web Push uyumlu)
        reg.pushManager.subscribe({userVisibleOnly: true}).then(vkvSaveSubscription).catch(function(){});
      }
    });
  }

  function vkvSaveSubscription(sub) {
    var data = sub.toJSON();
    fetch(VKV_SUBSCRIBE_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({endpoint: data.endpoint, keys: data.keys || {}})
    }).catch(function(){});
  }
})();
</script>
    <?php
}

/* ════════════════════════════════════════════
   4. YENİ YAZI YAYINLANİNCA OTOMATİK PUSH
════════════════════════════════════════════ */
add_action('publish_post', 'vkv_push_yeni_yazi', 10, 2);
function vkv_push_yeni_yazi($post_id, $post) {
    // Sadece ilk yayınlamada (draft→publish geçişi)
    if (get_post_meta($post_id, '_vkv_push_sent', true)) return;
    if (get_option('vkv_push_oto_gonder', '1') !== '1') return;

    $title = get_the_title($post_id);
    $url   = get_permalink($post_id);
    $logo  = '';
    $logo_id = get_theme_mod('custom_logo');
    if ($logo_id) $logo = wp_get_attachment_image_url($logo_id, 'thumbnail');

    $aboneler = get_option('vkv_push_aboneler', array());
    if (empty($aboneler)) return;

    $payload = wp_json_encode(array(
        'title' => get_bloginfo('name'),
        'body'  => $title,
        'url'   => $url,
        'icon'  => $logo,
    ));

    foreach ($aboneler as $hash => $abone) {
        wp_remote_post($abone['endpoint'], array(
            'headers' => array('Content-Type'=>'application/json','TTL'=>86400),
            'body'    => $payload,
            'timeout' => 3,
            'blocking'=> false,
        ));
    }
    update_post_meta($post_id, '_vkv_push_sent', 1);
}

/* ════════════════════════════════════════════
   5. ADMIN PANELİ
════════════════════════════════════════════ */
add_action('admin_menu', function() {
    add_options_page('Web Push Bildirimleri', '🔔 Push Bildirimleri', 'manage_options', 'vkv-push', 'vkv_push_admin_render');
});

function vkv_push_admin_render() {
    if (!current_user_can('manage_options')) return;

    // Ayarları kaydet
    if (isset($_POST['vkv_push_save']) && check_admin_referer('vkv_push_settings')) {
        update_option('vkv_push_aktif',       isset($_POST['aktif']) ? '1' : '0');
        update_option('vkv_push_oto_gonder',  isset($_POST['oto_gonder']) ? '1' : '0');
        echo '<div class="updated"><p>✅ Ayarlar kaydedildi.</p></div>';
    }

    // Manuel push gönder
    $push_result = '';
    if (isset($_POST['vkv_push_gonder']) && check_admin_referer('vkv_push_gonder')) {
        $title = sanitize_text_field($_POST['push_title'] ?? '');
        $body  = sanitize_text_field($_POST['push_body']  ?? '');
        $url   = esc_url_raw($_POST['push_url']           ?? home_url('/'));
        $logo  = '';
        $logo_id = get_theme_mod('custom_logo');
        if ($logo_id) $logo = wp_get_attachment_image_url($logo_id,'thumbnail');

        $aboneler = get_option('vkv_push_aboneler', array());
        $basari = 0;
        $payload = wp_json_encode(array('title'=>$title,'body'=>$body,'url'=>$url,'icon'=>$logo));
        foreach ($aboneler as $abone) {
            $r = wp_remote_post($abone['endpoint'],array('headers'=>array('Content-Type'=>'application/json','TTL'=>86400),'body'=>$payload,'timeout'=>5,'sslverify'=>false));
            if (!is_wp_error($r) && wp_remote_retrieve_response_code($r) < 400) $basari++;
        }
        $push_result = '<div class="updated"><p>✅ ' . $basari . ' / ' . count($aboneler) . ' abone\'ye bildirim gönderildi.</p></div>';
    }

    $aktif      = get_option('vkv_push_aktif', '1');
    $oto        = get_option('vkv_push_oto_gonder', '1');
    $aboneler   = get_option('vkv_push_aboneler', array());
    ?>
    <div class="wrap">
      <h1>🔔 Web Push Bildirimleri</h1>
      <?php echo $push_result; ?>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:900px">

        <!-- Ayarlar -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:20px">
          <h3 style="margin-top:0">⚙️ Genel Ayarlar</h3>
          <form method="post">
            <?php wp_nonce_field('vkv_push_settings'); ?>
            <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:pointer">
              <input type="checkbox" name="aktif" <?php checked($aktif,'1'); ?>>
              <span>Push bildirimi sistemini aktif et</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer">
              <input type="checkbox" name="oto_gonder" <?php checked($oto,'1'); ?>>
              <span>Yeni yazı yayınlanınca otomatik bildirim gönder</span>
            </label>
            <button type="submit" name="vkv_push_save" class="button button-primary">💾 Kaydet</button>
          </form>
        </div>

        <!-- İstatistik -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:20px">
          <h3 style="margin-top:0">📊 Abone İstatistikleri</h3>
          <div style="font-size:2.5rem;font-weight:700;color:#8B1A1A"><?php echo count($aboneler); ?></div>
          <div style="font-size:12px;color:#64748b">Toplam Abone</div>
          <div style="margin-top:12px">
            <button type="button" class="button" onclick="if(confirm('Tüm aboneler silinecek. Emin misiniz?')){
              fetch('<?php echo esc_url(admin_url('admin-ajax.php')); ?>', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
              body:'action=vkv_push_temizle&nonce=<?php echo wp_create_nonce('vkv_push_temizle'); ?>'}).then(function(){location.reload();});
            }">🗑️ Tüm Aboneleri Temizle</button>
          </div>
        </div>

      </div>

      <!-- Manuel Gönder -->
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:20px;max-width:900px;margin-top:20px">
        <h3 style="margin-top:0">📤 Manuel Bildirim Gönder</h3>
        <?php if (empty($aboneler)): ?>
        <p style="color:#64748b">Henüz abone yok. Sitenizde bir ziyaretçi bildirime abone olunca burada görünür.</p>
        <?php else: ?>
        <form method="post">
          <?php wp_nonce_field('vkv_push_gonder'); ?>
          <table class="form-table" style="max-width:600px">
            <tr><th style="width:140px">Bildirim Başlığı</th>
                <td><input type="text" name="push_title" class="large-text" required placeholder="<?php echo esc_attr(get_bloginfo('name')); ?>"></td></tr>
            <tr><th>Bildirim Metni</th>
                <td><input type="text" name="push_body" class="large-text" required placeholder="Haber açıklaması..."></td></tr>
            <tr><th>Bağlantı URL</th>
                <td><input type="url" name="push_url" class="large-text" value="<?php echo esc_attr(home_url('/')); ?>"></td></tr>
          </table>
          <button type="submit" name="vkv_push_gonder" class="button button-primary">🚀 <?php echo count($aboneler); ?> Abone\'ye Gönder</button>
        </form>
        <?php endif; ?>
      </div>

    </div>
    <?php
}

// Aboneleri temizle AJAX
add_action('wp_ajax_vkv_push_temizle', function() {
    check_ajax_referer('vkv_push_temizle', 'nonce');
    if (!current_user_can('manage_options')) wp_die('Yetki yok');
    update_option('vkv_push_aboneler', array());
    wp_send_json_success();
});
