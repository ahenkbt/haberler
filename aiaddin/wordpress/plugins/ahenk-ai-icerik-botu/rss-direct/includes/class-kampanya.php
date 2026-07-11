<?php
/**
 * AHB - Kampanya Isleme Sinifi
 * Tek bir kampanyayi veya tum aktif kampanyalari isler.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AHBRSS_Kampanya {

    /**
     * Tum aktif kampanyalari degerlendir, zamani gelenleri isle
     * (WP Cron tarafindan cagirilir)
     */
    public static function tum_kampanyalari_isle() {
        $kampanyalar = AHBRSS_Veritabani::kampanya_listesi(1); // 1 = aktif

        if ( empty($kampanyalar) ) {
            AHBRSS_Log::bilgi(0, 'Sistem', 'Cron', 'Islenecek aktif kampanya bulunamadi.');
            return;
        }

        AHBRSS_Log::bilgi(0, 'Sistem', 'Cron Basladi', count($kampanyalar) . ' aktif kampanya kontrol ediliyor.');

        foreach ( $kampanyalar as $kampanya ) {
            self::zamansal_kontrol_ve_isle($kampanya);
        }

        AHBRSS_Log::bilgi(0, 'Sistem', 'Cron Bitti', 'Tum kampanya kontrolleri tamamlandi.');
    }

    /**
     * Kampanyanin zamaninin gelip gelmedigini kontrol eder, geldiyse isler
     */
    public static function zamansal_kontrol_ve_isle( $kampanya ) {
        $dakika = (int)($kampanya->her_kac_dakika ?: 30);
        $sinir  = (int)$kampanya->son_calistirma + ($dakika * 60);

        if ( time() < $sinir ) {
            // Henuz zamani gelmemis
            return false;
        }

        self::kampanyayi_isle($kampanya);
        return true;
    }

    /**
     * Belirli bir kampanyayi zorunlu isle (manuel tetikleme)
     * @param int|object $kampanya_veya_id
     * @return array
     */
    public static function kampanyayi_isle( $kampanya_veya_id ) {
        if ( is_numeric($kampanya_veya_id) ) {
            $kampanya = AHBRSS_Veritabani::kampanya_getir((int)$kampanya_veya_id);
        } else {
            $kampanya = $kampanya_veya_id;
        }

        if ( ! $kampanya ) {
            return array('hata' => 'Kampanya bulunamadi.');
        }

        if ( (int)$kampanya->durum !== 1 ) {
            return array('hata' => 'Kampanya pasif durumda.');
        }

        $isleyici = new AHBRSS_Feed_Isleme($kampanya);
        return $isleyici->isle();
    }

    /**
     * Islenen linkleri sifirla (kampanya sifirla)
     */
    public static function islenen_sifirla( $kampanya_id ) {
        AHBRSS_Veritabani::islenen_link_sil($kampanya_id);
        AHBRSS_Log::bilgi($kampanya_id, '', 'Sifirla', 'Islenen link gecmisi silindi, kampanya sifirlandiı.');
    }
}
