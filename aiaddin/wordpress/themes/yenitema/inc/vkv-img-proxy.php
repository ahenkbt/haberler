<?php
/**
 * VKV Resim Proxy — Harici resimleri hotlink korumasını aşarak önbellekler
 * Endpoint: GET /wp-json/vkv/v1/img?f=dosyaadi.jpg
 *
 * Kaynak: mehmetcik.org.tr hotlink korumasını, kendi sunucu üzerinden
 * isteyerek aşıyoruz; resimler 7 gün WordPress transient'ında saklanır.
 */
defined('ABSPATH') || exit;

add_action('rest_api_init', function () {
    register_rest_route('vkv/v1', '/img', [
        'methods'             => 'GET',
        'callback'            => 'vkv_img_proxy_handler',
        'permission_callback' => '__return_true',
        'args'                => [
            'f' => [
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
                'validate_callback' => function ($v) {
                    /* Güvenlik: sadece izin verilen karakterler */
                    return preg_match('/^[\w\-\.%]+$/', $v) && strlen($v) < 200;
                },
            ],
        ],
    ]);
});

function vkv_img_proxy_handler(WP_REST_Request $req) {
    $dosya     = rawurldecode($req->get_param('f'));
    $cache_key = 'vkv_img_' . md5($dosya);
    $base_url  = 'https://www.mehmetcik.org.tr/uploads/sayfaResim/';

    /* ── Uzantıdan Content-Type belirle ── */
    $ext = strtolower(pathinfo($dosya, PATHINFO_EXTENSION));
    $mime_harita = [
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'gif'  => 'image/gif',
        'webp' => 'image/webp',
    ];
    $mime = $mime_harita[$ext] ?? 'image/jpeg';

    /* ── Önbellekten sun ── */
    $cached = get_transient($cache_key);
    if ($cached !== false) {
        vkv_img_send($cached, $mime);
    }

    /* ── Uzak kaynaktan çek ── */
    $response = wp_remote_get($base_url . $dosya, [
        'timeout'    => 15,
        'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'headers'    => [
            'Referer'        => 'https://www.mehmetcik.org.tr/',
            'Accept'         => 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Encoding'=> 'gzip, deflate, br',
        ],
        'redirection'=> 5,
        'sslverify'  => false,
    ]);

    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
        /* Hata → placeholder yönlendir */
        $placeholder = get_template_directory_uri() . '/assets/images/placeholder-sehit.jpg';
        wp_redirect($placeholder, 302);
        exit;
    }

    $body = wp_remote_retrieve_body($response);
    if (strlen($body) < 500) {
        /* Resim çok küçük — muhtemelen placeholder veya hata sayfası */
        $placeholder = get_template_directory_uri() . '/assets/images/placeholder-sehit.jpg';
        wp_redirect($placeholder, 302);
        exit;
    }

    /* 7 gün önbelle */
    set_transient($cache_key, $body, 7 * DAY_IN_SECONDS);
    vkv_img_send($body, $mime);
}

function vkv_img_send(string $body, string $mime): void {
    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=604800, immutable');
    header('X-VKV-Proxy: hit');
    echo $body;
    exit;
}
