<?php
/**
 * AhenkPress v5 — Güvenlik Sınıfı
 */
defined('ROOT') or die();

class Security {

    public static function csrf(): string {
        if (empty($_SESSION['ap_csrf'])) {
            $_SESSION['ap_csrf'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['ap_csrf'];
    }

    public static function checkCsrf(): bool {
        $token = $_POST['_csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        return hash_equals($_SESSION['ap_csrf'] ?? '', $token);
    }

    /**
     * CSRF token doğrula (admin sayfaları bu metodu kullanır)
     * $token boş verilirse $_POST['_csrf'] veya $_POST['csrf'] bakar
     */
    public static function verifyCsrf(string $token = ''): bool {
        if ($token === '') {
            $token = $_POST['_csrf'] ?? ($_POST['csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''));
        }
        $stored = $_SESSION['ap_csrf'] ?? '';
        return $stored !== '' && hash_equals($stored, $token);
    }

    public static function slug(string $text): string {
        $text = mb_strtolower(trim($text), 'UTF-8');
        $map  = [
            'ç'=>'c','ğ'=>'g','ı'=>'i','ö'=>'o','ş'=>'s','ü'=>'u',
            'Ç'=>'c','Ğ'=>'g','İ'=>'i','Ö'=>'o','Ş'=>'s','Ü'=>'u',
            'â'=>'a','î'=>'i','û'=>'u',
        ];
        $text = strtr($text, $map);
        $text = preg_replace('/[^a-z0-9\s\-]/', '', $text);
        $text = preg_replace('/[\s\-]+/', '-', $text);
        return trim($text, '-');
    }

    public static function sanitize(string $text): string {
        return htmlspecialchars(strip_tags(trim($text)), ENT_QUOTES|ENT_HTML5, 'UTF-8');
    }

    /** sanitize() için kısa alias */
    public static function str(string $text): string {
        return self::sanitize($text);
    }

    /**
     * HTML gizli CSRF alanı üret:
     *   <?= Security::csrfField() ?>
     * →  <input type="hidden" name="_csrf" value="...">
     */
    public static function csrfField(): string {
        return '<input type="hidden" name="_csrf" value="' . htmlspecialchars(self::csrf(), ENT_QUOTES) . '">';
    }

    /**
     * Güvenli HTML filtresi (WordPress kses benzeri).
     * İçerik editöründen gelen zengin metin için kullanılır.
     * İzin verilen etiketler: p, br, strong, em, ul, ol, li,
     * h1-h6, a (href, target), img (src, alt, width, height),
     * table, tr, th, td, blockquote, pre, code, span, div.
     */
    public static function kses(string $html): string {
        $allowed = '<p><br><strong><b><em><i><u><s><ul><ol><li>'
                 . '<h1><h2><h3><h4><h5><h6>'
                 . '<a><img><table><thead><tbody><tfoot><tr><th><td>'
                 . '<blockquote><pre><code><span><div><figure><figcaption>'
                 . '<hr><sup><sub><mark>';
        $html = strip_tags($html, $allowed);
        // href / src içindeki javascript: saldırılarını temizle
        $html = preg_replace('/\bon\w+\s*=/i', 'data-blocked=', $html);
        $html = preg_replace('/(href|src)\s*=\s*["\']?\s*javascript:/i', '$1="#"', $html);
        return $html;
    }

    public static function int(mixed $val, int $default = 0): int {
        return filter_var($val, FILTER_VALIDATE_INT) !== false ? (int)$val : $default;
    }

    public static function positiveInt(mixed $val, int $default = 1): int {
        $i = self::int($val, $default);
        return max(1, $i);
    }

    public static function email(string $email): string|false {
        return filter_var(trim($email), FILTER_VALIDATE_EMAIL);
    }

    public static function url(string $url): string|false {
        return filter_var(trim($url), FILTER_VALIDATE_URL);
    }
}
