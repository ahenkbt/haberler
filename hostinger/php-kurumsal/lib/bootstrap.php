<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/ApiClient.php';

/**
 * @return array{site: array<string, mixed>, meta: ?array<string, mixed>, layout: ?array<string, mixed>, nav: list<array{label:string,href:string,children:list<array{label:string,href:string}>}>, path: string}
 */
function hk_boot(): array
{
    $sites = require dirname(__DIR__) . '/config/sites.php';
    $host = hk_normalize_host($_SERVER['HTTP_HOST'] ?? 'localhost');
    $site = $sites[$host] ?? null;
    if ($site === null) {
        // Yerel / önizleme: slug query ile
        $slug = isset($_GET['site']) ? strtolower(trim((string) $_GET['site'])) : '';
        foreach ($sites as $cfg) {
            if (($cfg['slug'] ?? '') === $slug && empty($cfg['canonicalRedirect'])) {
                $site = $cfg;
                break;
            }
        }
    }
    if ($site === null) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Bilinmeyen kurumsal host: {$host}\n";
        exit;
    }

    if (!empty($site['canonicalRedirect'])) {
        $apex = (string) $site['apex'];
        $path = hk_request_path();
        $qs = $_SERVER['QUERY_STRING'] ?? '';
        $dest = 'https://' . $apex . ($path === '/' ? '/' : $path) . ($qs !== '' ? '?' . $qs : '');
        header('Location: ' . $dest, true, 301);
        exit;
    }

    $path = hk_request_path();
    // Eski SPA önekleri PHP origin'de de temizle (Worker route yoksa yedek).
    if (preg_match('#^/(tr|hm)/([^/]+)(/.*)?$#i', $path, $m)) {
        $rest = isset($m[3]) ? rtrim((string) $m[3], '/') : '';
        $next = $rest === '' ? '/' : $rest;
        header('Location: ' . $next, true, 301);
        exit;
    }

    $client = new HkApiClient();
    $meta = $client->fetchMetaByDomain((string) $site['apex']);
    if ($meta === null) {
        $meta = $client->fetchMetaBySlug((string) $site['slug']);
    }
    $layout = null;
    if (is_array($meta) && isset($meta['layout']) && is_array($meta['layout'])) {
        $layout = $meta['layout'];
    }
    if (is_array($meta) && !empty($meta['displayName'])) {
        $site['displayName'] = (string) $meta['displayName'];
    }
    if (is_array($meta) && !empty($meta['description'])) {
        $site['tagline'] = (string) $meta['description'];
    }

    $menuItems = is_array($layout['hmCorporateMenuItems'] ?? null)
        ? $layout['hmCorporateMenuItems']
        : [];
    $nav = hk_build_nav_tree($menuItems);

    return [
        'site' => $site,
        'meta' => $meta,
        'layout' => $layout,
        'nav' => $nav,
        'path' => $path,
    ];
}

/**
 * @param array<string, mixed> $ctx
 */
function hk_render(string $template, array $ctx): void
{
    $file = dirname(__DIR__) . '/templates/' . $template . '.php';
    if (!is_file($file)) {
        http_response_code(500);
        echo 'Şablon yok';
        return;
    }
    extract($ctx, EXTR_SKIP);
    require $file;
}
