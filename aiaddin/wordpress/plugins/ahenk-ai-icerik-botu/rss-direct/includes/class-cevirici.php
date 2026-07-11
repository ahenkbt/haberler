<?php
/**
 * AHB - Cevirici Sinifi
 * Google Translate (ucretsiz) ve DeepL API destegi
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AHBRSS_Cevirici {

    /**
     * Metni cevir
     * @param string $metin
     * @param string $kaynak  Kaynak dil kodu (tr, en, de ...)
     * @param string $hedef   Hedef dil kodu
     * @param string $motor   'google' | 'deepl' | 'mymemory'
     * @return string|false
     */
    public static function cevir( $metin, $kaynak = 'en', $hedef = 'tr', $motor = 'google' ) {
        if ( empty(trim($metin)) ) return $metin;
        $metin = mb_substr($metin, 0, 5000); // API limitini asma

        switch ($motor) {
            case 'deepl':
                return self::deepl_cevir($metin, $kaynak, $hedef);
            case 'mymemory':
                return self::mymemory_cevir($metin, $kaynak, $hedef);
            case 'google':
            default:
                return self::google_cevir($metin, $kaynak, $hedef);
        }
    }

    /**
     * Google Translate (ucretsiz, resmi olmayan yontem)
     * Kucuk metinler icin uygundur. Buyuk trafik icin Google Cloud API kullanin.
     */
    private static function google_cevir( $metin, $kaynak, $hedef ) {
        $url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl='
             . urlencode($kaynak) . '&tl=' . urlencode($hedef)
             . '&dt=t&q=' . rawurlencode($metin);

        $response = wp_remote_get( $url, array(
            'timeout'    => 15,
            'user-agent' => 'Mozilla/5.0 (compatible; AhenkHaberBotu/1.0)',
        ));

        if ( is_wp_error($response) ) return false;

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if ( empty($data[0]) ) return false;

        $ceviri = '';
        foreach ( $data[0] as $parca ) {
            if ( isset($parca[0]) ) $ceviri .= $parca[0];
        }
        return trim($ceviri) ?: false;
    }

    /**
     * MyMemory (ucretsiz, gunluk 5000 kelime limiti)
     */
    private static function mymemory_cevir( $metin, $kaynak, $hedef ) {
        $api_email = get_option('ahb_mymemory_email', '');
        $url = 'https://api.mymemory.translated.net/get?q=' . rawurlencode($metin)
             . '&langpair=' . urlencode($kaynak . '|' . $hedef)
             . ($api_email ? '&de=' . urlencode($api_email) : '');

        $response = wp_remote_get($url, array('timeout' => 15));
        if ( is_wp_error($response) ) return false;

        $data = json_decode( wp_remote_retrieve_body($response), true );
        return $data['responseData']['translatedText'] ?? false;
    }

    /**
     * DeepL API (ucretli, yuksek kalite)
     */
    private static function deepl_cevir( $metin, $kaynak, $hedef ) {
        $api_key = get_option('ahb_deepl_api_key', '');
        if ( empty($api_key) ) return false;

        // DeepL Free API
        $base_url = stripos($api_key, ':fx') !== false
            ? 'https://api-free.deepl.com/v2/translate'
            : 'https://api.deepl.com/v2/translate';

        $response = wp_remote_post($base_url, array(
            'timeout' => 20,
            'headers' => array('Authorization' => 'DeepL-Auth-Key ' . $api_key),
            'body'    => array(
                'text'        => $metin,
                'source_lang' => strtoupper($kaynak),
                'target_lang' => strtoupper($hedef),
            ),
        ));

        if ( is_wp_error($response) ) return false;
        $data = json_decode( wp_remote_retrieve_body($response), true );
        return $data['translations'][0]['text'] ?? false;
    }
}
