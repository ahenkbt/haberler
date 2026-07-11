<?php
/**
 * AHB - WP Cron Sinifi
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AHBRSS_Cron {

    const HOOK = 'ahbrss_cron_isleme';

    public static function baslat() {
        // Cron hook'u tanimla
        add_action( self::HOOK, array('AHBRSS_Kampanya', 'tum_kampanyalari_isle') );

        // Her dakika cron zamanlayicisini ekle
        add_filter('cron_schedules', array(__CLASS__, 'ozel_zamanlamalar'));

        // Cron'u planla
        if ( ! wp_next_scheduled(self::HOOK) ) {
            wp_schedule_event(time(), 'ahbrss_her_5_dakika', self::HOOK);
        }
    }

    public static function ozel_zamanlamalar( $schedules ) {
        $schedules['ahbrss_her_5_dakika'] = array(
            'interval' => 300,
            'display'  => 'Her 5 dakikada bir (Ahenk Haber Botu)',
        );
        $schedules['ahbrss_her_dakika'] = array(
            'interval' => 60,
            'display'  => 'Her dakika (Ahenk Haber Botu)',
        );
        return $schedules;
    }

    public static function cron_kaldir() {
        $timestamp = wp_next_scheduled(self::HOOK);
        if ($timestamp) wp_unschedule_event($timestamp, self::HOOK);
        wp_clear_scheduled_hook(self::HOOK);
    }

    public static function sonraki_calistirma() {
        $ts = wp_next_scheduled(self::HOOK);
        if ($ts) return date('d.m.Y H:i:s', $ts);
        return 'Planlanmamis';
    }
}
