<?php

declare(strict_types=1);

require dirname(__DIR__) . '/src/bootstrap.php';

use Yenisafak\App;
use Yenisafak\Cache;
use Yenisafak\Db;
use Yenisafak\Repository;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$path = (string) (parse_url($uri, PHP_URL_PATH) ?: '/');
$ttl = max(1, (int) (getenv('CACHE_TTL') ?: 60));
$cacheDir = getenv('CACHE_DIR');
$cache = new Cache(is_string($cacheDir) && $cacheDir !== '' ? $cacheDir : sys_get_temp_dir() . '/yenisafak-cache', $ttl);
$key = $method . ' ' . strtolower($host) . ' ' . $uri;
$cacheable = ($method === 'GET' || $method === 'HEAD') && !str_ends_with($path, '/healthz');

if ($cacheable) {
    $hit = $cache->get($key);
    if (is_string($hit) && str_contains($hit, "\n\n")) {
        [$metaRaw, $body] = explode("\n\n", $hit, 2);
        $meta = json_decode($metaRaw, true);
        if (is_array($meta)) {
            http_response_code((int) ($meta['status'] ?? 200));
            header('Content-Type: ' . (string) ($meta['type'] ?? 'text/html; charset=utf-8'));
            header('Cache-Control: ' . (string) ($meta['cache'] ?? 'public, max-age=60, s-maxage=60'));
            header('X-Cache: HIT');
            if ($method !== 'HEAD') {
                echo $body;
            }
            return;
        }
    }
}

ob_start();
try {
    $app = new App(new Repository(Db::connect((string) (getenv('DATABASE_URL') ?: ''))));
    $app->handle($method, $uri, $host);
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    error_log('[yenisafak] ' . $e->getMessage());
    echo "Geçici olarak kullanılamıyor\n";
}
$body = (string) ob_get_clean();
$status = http_response_code() ?: 200;
if ($cacheable && $status === 200) {
    $type = 'text/html; charset=utf-8';
    $cacheControl = 'public, max-age=60, s-maxage=60, stale-while-revalidate=120';
    foreach (headers_list() as $header) {
        if (stripos($header, 'Content-Type:') === 0) {
            $type = trim(substr($header, 13));
        }
        if (stripos($header, 'Cache-Control:') === 0) {
            $cacheControl = trim(substr($header, 14));
        }
    }
    $cache->set($key, json_encode(['status' => $status, 'type' => $type, 'cache' => $cacheControl], JSON_UNESCAPED_SLASHES) . "\n\n" . $body);
}
header('X-Cache: MISS');
if ($method !== 'HEAD') {
    echo $body;
}
