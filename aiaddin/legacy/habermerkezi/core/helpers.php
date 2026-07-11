<?php
/**
 * AhenkPress v5.0 — Global Yardımcı Fonksiyonlar
 */
defined('ROOT') or die();

/** HTML encode */
function e(string $str): string { return htmlspecialchars($str, ENT_QUOTES|ENT_HTML5, 'UTF-8'); }

/** URL'ye yönlendir */
function ap_redirect(string $url, int $code = 302): never {
    header('Location: ' . $url, true, $code);
    exit;
}

/** Site ayarı oku */
function ap_option(string $key, mixed $default = ''): mixed {
    return DB::setting($key, $default);
}

/** Site URL'si */
function ap_url(string $path = ''): string {
    static $base = null;
    if ($base === null) {
        $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host  = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $base  = $proto . '://' . $host;
    }
    return $base . '/' . ltrim($path, '/');
}

/** Upload URL'si */
function ap_upload_url(string $path = ''): string {
    return UPLOADS_URL . '/' . ltrim($path, '/');
}

/** Tarih formatlama (Türkçe) */
function ap_date(string|int $date, string $format = 'd M Y'): string {
    $months = [
        1=>'Ocak',2=>'Şubat',3=>'Mart',4=>'Nisan',5=>'Mayıs',6=>'Haziran',
        7=>'Temmuz',8=>'Ağustos',9=>'Eylül',10=>'Ekim',11=>'Kasım',12=>'Aralık'
    ];
    $days = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
    $ts = is_numeric($date) ? (int)$date : strtotime((string)$date);
    if (!$ts) return '';
    $str = date($format, $ts);
    foreach ($months as $n => $tr) $str = str_replace(date('F', mktime(0,0,0,$n,1)), $tr, $str);
    foreach ($days as $i => $tr) $str = str_replace(date('l', mktime(0,0,0,1,5+$i)), $tr, $str);
    return $str;
}

/** Zaman önce (3 saat önce) */
function ap_time_ago(string $date): string {
    $diff = time() - strtotime($date);
    if ($diff < 60) return 'az önce';
    if ($diff < 3600) return floor($diff/60) . ' dakika önce';
    if ($diff < 86400) return floor($diff/3600) . ' saat önce';
    if ($diff < 604800) return floor($diff/86400) . ' gün önce';
    return ap_date($date);
}

/** Excerpt oluştur */
function ap_excerpt(string $text, int $words = 25): string {
    $text = strip_tags($text);
    $arr  = explode(' ', $text);
    if (count($arr) <= $words) return $text;
    return implode(' ', array_slice($arr, 0, $words)) . '...';
}

/** Resim resize/thumb URL */
function ap_thumb_url(?string $path, string $size = 'medium'): string {
    if (!$path) return ap_url('themes/' . ap_active_theme() . '/assets/images/placeholder.jpg');
    if (str_starts_with($path, 'http')) return $path;
    return ap_upload_url($path);
}

/** Aktif tema slug */
function ap_active_theme(): string {
    static $t = null;
    if ($t === null) $t = DB::setting('active_theme', 'ankara-haber');
    return $t;
}

/** Sayfa tipi (site tipi) */
function ap_site_type(): string {
    static $t = null;
    if ($t === null) $t = DB::setting('site_type', 'news');
    return $t;
}

/** JSON çıktı ve çık */
function ap_json(mixed $data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Admin JSON çıktı */
function ap_ajax_success(mixed $data = null, string $message = 'OK'): never {
    ap_json(['success' => true, 'message' => $message, 'data' => $data]);
}

function ap_ajax_error(string $message, int $code = 400): never {
    ap_json(['success' => false, 'message' => $message], $code);
}

/** POST verisi */
function ap_post(string $key, mixed $default = ''): mixed {
    return $_POST[$key] ?? $default;
}

/** GET verisi */
function ap_get(string $key, mixed $default = ''): mixed {
    return $_GET[$key] ?? $default;
}

/** Dosya yükle (upload) */
function ap_upload_file(array $file, string $subdir = ''): array {
    $allowed = ['jpg','jpeg','png','webp','gif','pdf','mp4','mp3','zip','svg'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (!in_array($ext, $allowed)) {
        return ['error' => 'İzin verilmeyen dosya türü: ' . $ext];
    }
    if ($file['size'] > 20 * 1024 * 1024) {
        return ['error' => 'Dosya boyutu 20MB limitini aşıyor'];
    }

    $subdir = trim($subdir, '/');
    $dir    = UPLOADS_DIR . ($subdir ? '/' . $subdir : '') . '/' . date('Y/m');
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $name = Security::slug(pathinfo($file['name'], PATHINFO_FILENAME)) . '-' . uniqid() . '.' . $ext;
    $dest = $dir . '/' . $name;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        return ['error' => 'Dosya taşıma başarısız'];
    }

    $relPath = ($subdir ? $subdir . '/' : '') . date('Y/m') . '/' . $name;
    return ['path' => $relPath, 'url' => ap_upload_url($relPath), 'name' => $name, 'ext' => $ext];
}

/** HTTP GET isteği (cURL veya file_get_contents) */
function ap_http_get(string $url, array $opts = []): array {
    $timeout    = $opts['timeout'] ?? 30;
    $userAgent  = $opts['user_agent'] ?? 'AhenkPress/' . AP_VERSION . ' (+https://ahenkpress.com)';
    $maxBytes   = $opts['max_bytes'] ?? 2 * 1024 * 1024;

    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 3,
            CURLOPT_USERAGENT      => $userAgent,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_ENCODING       => 'gzip, deflate',
            CURLOPT_HTTPHEADER     => ['Accept: application/rss+xml, application/xml, text/xml, */*'],
            CURLOPT_BUFFERSIZE     => 128,
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);
        if ($err) return ['body' => '', 'code' => 0, 'error' => $err];
        return ['body' => $body, 'code' => $code, 'error' => ''];
    }

    // Fallback: file_get_contents
    $ctx = stream_context_create(['http' => [
        'timeout'    => $timeout,
        'user_agent' => $userAgent,
        'method'     => 'GET',
    ]]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) return ['body' => '', 'code' => 0, 'error' => 'HTTP isteği başarısız'];
    return ['body' => $body, 'code' => 200, 'error' => ''];
}

/** Pagination HTML */
function ap_pagination(int $total, int $perPage, int $current, string $urlPattern = ''): string {
    $pages = (int)ceil($total / max(1, $perPage));
    if ($pages <= 1) return '';

    // urlPattern verilmemişse mevcut URL'den otomatik üret: ?p={page}
    if ($urlPattern === '') {
        $qs = $_GET ?? [];
        unset($qs['p']);
        $base = strtok($_SERVER['REQUEST_URI'] ?? '/', '?');
        $extra = http_build_query($qs);
        $urlPattern = $base . '?' . ($extra ? $extra . '&' : '') . 'p={page}';
    }

    $html = '<div class="ap-pagination pagination">';
    for ($i = 1; $i <= $pages; $i++) {
        $url   = str_replace('{page}', (string)$i, $urlPattern);
        $class = ($i === $current) ? 'active' : '';
        $html .= '<a href="' . htmlspecialchars($url, ENT_QUOTES) . '" class="page-link ' . $class . '">' . $i . '</a>';
    }
    return $html . '</div>';
}

/** Unique slug üret */
function ap_unique_slug(string $text, string $table, string $col = 'slug', ?int $excludeId = null): string {
    $base = Security::slug($text);
    $slug = $base;
    $i    = 1;
    while (true) {
        $sql    = "SELECT id FROM `{$table}` WHERE `{$col}`=?";
        $params = [$slug];
        if ($excludeId) { $sql .= ' AND id!=?'; $params[] = $excludeId; }
        $row = DB::queryRow($sql, $params);
        if (!$row) break;
        $slug = $base . '-' . $i++;
    }
    return $slug;
}

/** Okuma süresi (dakika) */
function ap_read_time(string $content): int {
    $words = str_word_count(strip_tags($content));
    return max(1, ceil($words / 200));
}

/** Türkçe karakter destekli slug üretici */
function ap_slugify(string $text): string {
    $map = ['ç'=>'c','ğ'=>'g','ı'=>'i','ö'=>'o','ş'=>'s','ü'=>'u',
            'Ç'=>'c','Ğ'=>'g','İ'=>'i','Ö'=>'o','Ş'=>'s','Ü'=>'u'];
    $text = strtr($text, $map);
    $text = mb_strtolower($text);
    $text = preg_replace('/[^a-z0-9\-]/', '-', $text);
    $text = preg_replace('/-+/', '-', $text);
    return trim(mb_substr($text, 0, 120), '-');
}
