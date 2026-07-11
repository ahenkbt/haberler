<?php
/**
 * AHB - Log Sinifi
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AHBRSS_Log {

    public static function kaydet( $kampanya_id, $kampanya_adi, $eylem, $mesaj, $seviye = 'bilgi' ) {
        global $wpdb;
        $wpdb->insert( $wpdb->prefix . 'ahbrss_loglar', array(
            'kampanya_id'  => (int)$kampanya_id,
            'kampanya_adi' => sanitize_text_field($kampanya_adi),
            'eylem'        => sanitize_text_field($eylem),
            'mesaj'        => wp_strip_all_tags($mesaj),
            'seviye'       => sanitize_key($seviye),
        ));
    }

    public static function bilgi(  $kid, $kad, $eylem, $mesaj ) { self::kaydet($kid,$kad,$eylem,$mesaj,'bilgi'); }
    public static function basari( $kid, $kad, $eylem, $mesaj ) { self::kaydet($kid,$kad,$eylem,$mesaj,'basari'); }
    public static function uyari(  $kid, $kad, $eylem, $mesaj ) { self::kaydet($kid,$kad,$eylem,$mesaj,'uyari'); }
    public static function hata(   $kid, $kad, $eylem, $mesaj ) { self::kaydet($kid,$kad,$eylem,$mesaj,'hata'); }
}
