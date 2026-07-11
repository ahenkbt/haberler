<?php
/**
 * AhenkPress v5 — Modül (Eklenti) Sistemi
 * WordPress plugin API benzeri yapı
 */
defined('ROOT') or die();

class Module {
    private static array $loaded  = [];
    private static array $active  = [];
    private static bool  $booted  = false;

    public static function boot(): void {
        if (self::$booted) return;
        self::$booted = true;

        $active = self::getActive();
        foreach ($active as $slug) {
            $file = ROOT . '/modules/' . $slug . '/main.php';
            if (file_exists($file)) {
                try {
                    require_once $file;
                    self::$loaded[$slug] = self::readJson($slug);
                } catch (\Throwable $e) {
                    error_log("[AhenkPress Module] $slug yüklenemedi: " . $e->getMessage());
                }
            }
        }
    }

    public static function all(): array {
        $result = [];
        $dir    = ROOT . '/modules';
        if (!is_dir($dir)) return $result;

        $active = self::getActive();
        foreach (new DirectoryIterator($dir) as $item) {
            if ($item->isDot() || !$item->isDir()) continue;
            $slug = $item->getFilename();
            $info = self::readJson($slug);
            if (empty($info)) continue;
            $info['slug']   = $slug;
            $info['active'] = in_array($slug, $active, true);
            $result[]       = $info;
        }
        usort($result, fn($a, $b) => strcmp($a['name']??$a['slug'], $b['name']??$b['slug']));
        return $result;
    }

    public static function readJson(string $slug): array {
        $file = ROOT . '/modules/' . $slug . '/module.json';
        if (!file_exists($file)) return [];
        $data = json_decode(file_get_contents($file), true);
        return is_array($data) ? $data : [];
    }

    public static function getActive(): array {
        try {
            $val = DB::setting('active_modules', '[]');
            $arr = json_decode($val, true);
            return is_array($arr) ? $arr : [];
        } catch (\Throwable) { return []; }
    }

    public static function setActive(array $slugs): void {
        DB::setSetting('active_modules', json_encode(array_values($slugs)));
    }

    public static function activate(string $slug): bool {
        $mainFile = ROOT . '/modules/' . $slug . '/main.php';
        if (!file_exists($mainFile)) return false;

        $active = self::getActive();
        if (!in_array($slug, $active, true)) {
            $active[] = $slug;
            self::setActive($active);
        }
        // install hook
        $installFile = ROOT . '/modules/' . $slug . '/install.php';
        if (file_exists($installFile)) {
            try { require_once $installFile; } catch (\Throwable) {}
        }
        return true;
    }

    public static function deactivate(string $slug): void {
        $active = array_filter(self::getActive(), fn($s) => $s !== $slug);
        self::setActive(array_values($active));
    }

    public static function delete(string $slug): bool {
        self::deactivate($slug);
        $dir = ROOT . '/modules/' . $slug;
        if (!is_dir($dir)) return false;
        return self::rmdir($dir);
    }

    public static function installZip(string $tmpPath): array {
        if (!class_exists('ZipArchive')) {
            return ['ok' => false, 'msg' => 'ZipArchive PHP uzantısı bulunamadı.'];
        }
        $zip = new ZipArchive();
        if ($zip->open($tmpPath) !== true) {
            return ['ok' => false, 'msg' => 'ZIP dosyası açılamadı.'];
        }

        // ZIP içindeki ilk klasörü bul
        $slug = '';
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (str_contains($name, '/')) { $slug = explode('/', $name)[0]; break; }
        }
        if (!$slug) { $zip->close(); return ['ok'=>false,'msg'=>'Geçersiz modül yapısı. Bir klasör bekleniyordu.']; }

        // module.json var mı?
        if ($zip->locateName($slug . '/module.json') === false) {
            $zip->close();
            return ['ok'=>false,'msg'=>'module.json bulunamadı. Geçerli bir AhenkPress modülü değil.'];
        }

        $dest = ROOT . '/modules';
        if (!is_dir($dest)) mkdir($dest, 0755, true);

        $zip->extractTo($dest);
        $zip->close();
        return ['ok' => true, 'slug' => $slug, 'msg' => '"' . $slug . '" modülü yüklendi.'];
    }

    public static function isActive(string $slug): bool {
        return in_array($slug, self::getActive(), true);
    }

    /** Yüklü (boot edilmiş) modül slug listesi */
    public static function loaded(): array {
        return array_keys(self::$loaded);
    }

    /** Belirtilen modül yüklenmiş mi? */
    public static function isLoaded(string $slug): bool {
        return isset(self::$loaded[$slug]);
    }

    private static function rmdir(string $dir): bool {
        foreach (new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        ) as $file) {
            $file->isDir() ? rmdir($file->getPathname()) : unlink($file->getPathname());
        }
        return rmdir($dir);
    }
}
