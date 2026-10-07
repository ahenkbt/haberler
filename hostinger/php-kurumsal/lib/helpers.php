<?php
declare(strict_types=1);

function hk_h(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function hk_normalize_host(string $host): string
{
    $host = strtolower(trim($host));
    $host = preg_replace('/:\d+$/', '', $host) ?? $host;
    return rtrim($host, '.');
}

function hk_request_path(): string
{
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    $path = parse_url($uri, PHP_URL_PATH);
    if (!is_string($path) || $path === '') {
        return '/';
    }
    $path = '/' . trim($path, '/');
    return $path === '/' ? '/' : rtrim($path, '/') ?: '/';
}

/**
 * @param array<string, mixed> $menuItems
 * @return list<array{label:string,href:string,children:list<array{label:string,href:string}>}>
 */
function hk_build_nav_tree(array $menuItems): array
{
    $enabled = [];
    foreach ($menuItems as $raw) {
        if (!is_array($raw)) {
            continue;
        }
        if (($raw['enabled'] ?? true) === false) {
            continue;
        }
        $id = (string) ($raw['id'] ?? '');
        $label = trim((string) ($raw['label'] ?? ''));
        $href = trim((string) ($raw['href'] ?? '#'));
        if ($id === '' || $label === '') {
            continue;
        }
        $enabled[$id] = [
            'id' => $id,
            'label' => $label,
            'href' => $href === '' ? '#' : $href,
            'parentId' => isset($raw['parentId']) ? (string) $raw['parentId'] : null,
            'children' => [],
        ];
    }

    $roots = [];
    foreach ($enabled as $id => &$item) {
        $parentId = $item['parentId'];
        if ($parentId && isset($enabled[$parentId])) {
            $enabled[$parentId]['children'][] = &$item;
        } else {
            $roots[] = &$item;
        }
    }
    unset($item);

    $out = [];
    foreach ($roots as $root) {
        $children = [];
        foreach ($root['children'] as $child) {
            $children[] = [
                'label' => (string) $child['label'],
                'href' => (string) $child['href'],
            ];
        }
        $out[] = [
            'label' => (string) $root['label'],
            'href' => (string) $root['href'],
            'children' => $children,
        ];
    }
    return $out;
}

/**
 * @param array<string, mixed>|null $layout
 * @return array{slug:string,title:string,bodyHtml:string}|null
 */
function hk_find_page(?array $layout, string $slug): ?array
{
    if (!$layout) {
        return null;
    }
    $want = strtolower(trim($slug, '/'));
    $pages = $layout['hmExtraPages'] ?? [];
    if (!is_array($pages)) {
        return null;
    }
    foreach ($pages as $page) {
        if (!is_array($page)) {
            continue;
        }
        if (($page['enabled'] ?? true) === false) {
            continue;
        }
        $pageSlug = strtolower(trim((string) ($page['slug'] ?? ''), '/'));
        if ($pageSlug === '' || $pageSlug !== $want) {
            continue;
        }
        $title = trim((string) ($page['title'] ?? $pageSlug));
        $body = (string) ($page['bodyHtml'] ?? '');
        return [
            'slug' => $pageSlug,
            'title' => $title !== '' ? $title : $pageSlug,
            'bodyHtml' => $body,
        ];
    }
    return null;
}

/**
 * @param array<string, mixed>|null $layout
 * @return list<array{title:string,href:string,image:?string,excerpt:string}>
 */
function hk_home_tiles(?array $layout): array
{
    $copy = is_array($layout['hmVatanHomeCopy'] ?? null) ? $layout['hmVatanHomeCopy'] : [];
    $hero = is_array($copy['hero'] ?? null) ? $copy['hero'] : [];
    $slides = $layout['corporateSliderItems'] ?? ($hero['slides'] ?? []);
    $out = [];
    if (is_array($slides)) {
        foreach ($slides as $slide) {
            if (!is_array($slide)) {
                continue;
            }
            $title = trim((string) ($slide['title'] ?? $slide['label'] ?? ''));
            if ($title === '') {
                continue;
            }
            $out[] = [
                'title' => $title,
                'href' => (string) ($slide['href'] ?? $slide['url'] ?? '#'),
                'image' => isset($slide['image']) ? (string) $slide['image'] : (isset($slide['imageUrl']) ? (string) $slide['imageUrl'] : null),
                'excerpt' => trim((string) ($slide['excerpt'] ?? $slide['subtitle'] ?? '')),
            ];
            if (count($out) >= 8) {
                break;
            }
        }
    }
    if ($out !== []) {
        return $out;
    }

    $menu = $layout['hmCorporateMenuItems'] ?? [];
    if (!is_array($menu)) {
        return [];
    }
    foreach ($menu as $item) {
        if (!is_array($item)) {
            continue;
        }
        if (!empty($item['parentId'])) {
            continue;
        }
        if (($item['enabled'] ?? true) === false) {
            continue;
        }
        $href = trim((string) ($item['href'] ?? ''));
        $label = trim((string) ($item['label'] ?? ''));
        if ($label === '' || $href === '' || $href === '#') {
            continue;
        }
        $out[] = [
            'title' => $label,
            'href' => $href,
            'image' => null,
            'excerpt' => '',
        ];
        if (count($out) >= 6) {
            break;
        }
    }
    return $out;
}
