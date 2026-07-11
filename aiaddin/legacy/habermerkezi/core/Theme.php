<?php
/**
 * AhenkPress v5 — Tema Yöneticisi
 */
defined('ROOT') or die();

class Theme {
    private static ?array $config   = null;
    private static ?string $slug    = null;
    private static ?string $dir     = null;
    private static ?string $url     = null;
    private static array $vars      = [];

    public static function load(): void {
        self::$slug = DB::setting('active_theme', 'ankara-haber');
        self::$dir  = ROOT . '/themes/' . self::$slug;
        self::$url  = ap_url('themes/' . self::$slug);

        $jsonFile = self::$dir . '/theme.json';
        if (file_exists($jsonFile)) {
            self::$config = json_decode(file_get_contents($jsonFile), true) ?? [];
        } else {
            self::$config = [];
        }

        // Widget alanlarını kaydet
        foreach ((self::$config['widget_areas'] ?? []) as $id => $name) {
            Widget::register($id, $name);
        }
    }

    public static function slug(): string    { return self::$slug ?? 'ankara-haber'; }
    public static function dir(): string     { return self::$dir  ?? (ROOT . '/themes/ankara-haber'); }
    public static function url(): string     { return self::$url  ?? ap_url('themes/ankara-haber'); }
    public static function config(): array   { return self::$config ?? []; }

    public static function partial(string $name, array $data = []): void {
        $file = self::dir() . '/partials/' . $name . '.php';
        if (!file_exists($file)) return;
        extract($data);
        require $file;
    }

    /** Tema route'larını döndür: ['yazarlar' => 'templates/yazarlar.php', ...] */
    public static function routes(): array {
        return self::$config['routes'] ?? [];
    }

    /** Slug için tema route'u var mı? */
    public static function routeFile(string $slug): ?string {
        $routes = self::routes();
        if (!isset($routes[$slug])) return null;
        $file = self::dir() . '/' . $routes[$slug];
        return file_exists($file) ? $file : null;
    }

    public static function template(string $name, array $data = []): void {
        $file = self::dir() . '/templates/' . $name . '.php';
        if (!file_exists($file)) {
            $file = self::dir() . '/templates/404.php';
        }
        if (file_exists($file)) {
            self::$vars = $data;
            extract($data);
            require $file;
            self::$vars = [];
        }
    }

    public static function hasTemplate(string $name): bool {
        return file_exists(self::dir() . '/templates/' . $name . '.php');
    }

    public static function setting(string $key, mixed $default = ''): mixed {
        return DB::setting($key, $default);
    }

    /**
     * Tema şablonuna geçirilen değişkeni al.
     * Kullanım: $post = Theme::var('post');
     */
    public static function var(string $key, mixed $default = null): mixed {
        return self::$vars[$key] ?? $default;
    }

    /**
     * Tema klasörü içindeki bir dosyanın tam yolunu döndür.
     * Kullanım: Theme::path('templates/404.php')
     */
    public static function path(string $file = ''): string {
        return self::dir() . ($file ? '/' . ltrim($file, '/') : '');
    }

    /**
     * Mevcut tüm temaları döndür (themes/ klasöründen).
     * Her tema ['slug', 'name', 'version', 'author', ...] döndürür.
     */
    public static function available(): array {
        $themes = [];
        $dir    = ROOT . '/themes';
        if (!is_dir($dir)) return $themes;
        foreach (new DirectoryIterator($dir) as $item) {
            if ($item->isDot() || !$item->isDir()) continue;
            $slug    = $item->getFilename();
            $jsonFile = $dir . '/' . $slug . '/theme.json';
            $info = [];
            if (file_exists($jsonFile)) {
                $info = json_decode(file_get_contents($jsonFile), true) ?? [];
            }
            $info['slug']   = $slug;
            $info['name']   = $info['name']   ?? ucwords(str_replace(['-','_'], ' ', $slug));
            $info['active'] = ($slug === self::slug());
            $themes[] = $info;
        }
        usort($themes, fn($a,$b) => strcmp($a['name'], $b['name']));
        return $themes;
    }
}
