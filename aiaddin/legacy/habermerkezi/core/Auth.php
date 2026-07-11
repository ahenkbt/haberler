<?php
/**
 * AhenkPress v5 — Kimlik Doğrulama Sınıfı
 */
defined('ROOT') or die();

class Auth {
    public static function check(): bool {
        return !empty($_SESSION['ap_user_id']);
    }

    public static function user(): ?array {
        if (!self::check()) return null;
        static $u = null;
        if ($u) return $u;
        try {
            $u = DB::queryRow("SELECT * FROM `{p}users` WHERE id=?", [$_SESSION['ap_user_id']]);
        } catch (\Throwable) { $u = null; }
        return $u;
    }

    public static function id(): int {
        return (int)($_SESSION['ap_user_id'] ?? 0);
    }

    /** Auth::id() için alias */
    public static function userId(): int {
        return self::id();
    }

    /** Şifre hash'le */
    public static function hashPassword(string $password): string {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    public static function login(string $username, string $password): bool {
        try {
            $user = DB::queryRow(
                "SELECT * FROM `{p}users` WHERE (username=? OR email=?) AND active=1 LIMIT 1",
                [$username, $username]
            );
        } catch (\Throwable) { return false; }

        if (!$user) return false;
        if (!password_verify($password, $user['password'])) return false;

        session_regenerate_id(true);
        $_SESSION['ap_user_id']   = $user['id'];
        $_SESSION['ap_user_role'] = $user['role'];

        try {
            DB::execute("UPDATE `{p}users` SET last_login=NOW() WHERE id=?", [$user['id']]);
        } catch (\Throwable) {}

        return true;
    }

    public static function logout(): void {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time()-42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
    }

    public static function can(string $cap): bool {
        $role = $_SESSION['ap_user_role'] ?? '';
        $caps = [
            'admin'  => ['manage_all','edit_posts','edit_others','delete_posts','manage_users','manage_settings'],
            'editor' => ['edit_posts','edit_others','delete_posts'],
            'author' => ['edit_posts'],
            'contributor' => [],
        ];
        return in_array($cap, $caps[$role] ?? [], true) || $role === 'admin';
    }

    public static function requireLogin(): void {
        if (!self::check()) {
            header('Location: /admin/login.php');
            exit;
        }
    }

    /**
     * Giriş + rol kontrolü (admin sayfaları Auth::require('admin') şeklinde çağırır)
     * role: 'admin' | 'editor' | 'author' | 'subscriber'
     */
    public static function require(string $minRole = 'author'): void {
        if (!self::check()) {
            header('Location: /admin/login.php');
            exit;
        }
        $hierarchy = ['subscriber'=>0,'contributor'=>1,'author'=>2,'editor'=>3,'admin'=>4];
        $userRole  = $_SESSION['ap_user_role'] ?? 'subscriber';
        $userLevel = $hierarchy[$userRole] ?? 0;
        $minLevel  = $hierarchy[$minRole]  ?? 0;
        if ($userLevel < $minLevel) {
            http_response_code(403);
            die('<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#0f1117;color:#e6edf3"><h1>403 — Yetkisiz Erişim</h1><p>Bu sayfaya erişim yetkiniz yok.</p><a href="/admin/" style="color:#388bfd">← Admin Panele Dön</a></body></html>');
        }
    }
}
