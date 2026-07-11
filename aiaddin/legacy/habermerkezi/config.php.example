<?php
/**
 * AhenkPress v5 — Veritabanı ve Site Yapılandırması
 * Kurulumdan önce aşağıdaki bilgileri doldurun.
 */

// ─── Veritabanı
define('DB_HOST',   'localhost');       // Genellikle localhost
define('DB_NAME',   'veritabani_adi'); // cPanel'de oluşturduğunuz DB adı
define('DB_USER',   'kullanici_adi'); // DB kullanıcısı
define('DB_PASS',   'guclu_sifre');   // DB şifresi
define('DB_PREFIX', 'ap_');            // Tablo öneki (değiştirmek zorunda değilsiniz)

// ─── Hata Gösterimi
// Canlı sunucuda 0, test aşamasında 1 yapın
define('AP_DEBUG', 0);

if (AP_DEBUG) {
    ini_set('display_errors', 1);
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', 0);
    error_reporting(0);
}
