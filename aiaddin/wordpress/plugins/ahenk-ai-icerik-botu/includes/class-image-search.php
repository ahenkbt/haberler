<?php
/**
 * Görsel arama: anahtar kelime → ilk uygun görsel URL'si.
 * Sağlayıcı sırası:
 *   1) Google CSE  (key+cx girilmişse)
 *   2) Bing Görseller (HTML scrape)
 *   3) DuckDuckGo Görseller (JSON, vqd token)
 */
if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! class_exists( 'AHB_Image_Search' ) ) {
class AHB_Image_Search {

    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
    const TIMEOUT = 12;

    public function find( $query ) {
        $query = trim( wp_strip_all_tags( $query ) );
        if ( $query === '' ) return '';

        // Türkçe haber başlığındaki gürültü kelimeleri at — daha alakalı sonuç için
        $query = $this->clean_query( $query );

        // Sorguyu kısalt — çok uzun başlık alakasız sonuç verir
        if ( mb_strlen( $query ) > 80 ) {
            $query = mb_substr( $query, 0, 80 );
        }

        // 1) Google CSE
        if ( $this->google_ready() ) {
            $u = $this->search_google_cse( $query );
            if ( $u ) return $u;
            error_log( '[AI Haber Botu] Google CSE boş: ' . $query );
        }

        // 2) Bing
        $u = $this->search_bing( $query );
        if ( $u ) return $u;

        // 3) DuckDuckGo
        $u = $this->search_duckduckgo( $query );
        if ( $u ) return $u;

        return '';
    }

    private function clean_query( $q ) {
        $stop = array(
            'son dakika','flaş','flash','güncel','guncel',
            'açıklama yaptı','aciklama yapti','açıklama yapti','aciklama yaptı',
            'açıklaması','aciklamasi','iddia',
            'mü','mı','mi','mu',
        );
        foreach ( $stop as $s ) {
            $q = preg_replace( '/\b' . preg_quote( $s, '/' ) . '\b/iu', ' ', $q );
        }
        // Noktalama temizliği
        $q = preg_replace( '/[!?:;\.\,"«»]+/u', ' ', $q );
        $q = preg_replace( '/\s+/', ' ', trim( $q ) );
        return $q;
    }

    private function google_ready() {
        $key = trim( (string) get_option( 'ahb_google_cse_key', '' ) );
        $cx  = trim( (string) get_option( 'ahb_google_cse_cx', '' ) );
        return ( $key !== '' && $cx !== '' );
    }

    /* ============ Google Custom Search JSON API ============ */
    private function search_google_cse( $query ) {
        $key = trim( (string) get_option( 'ahb_google_cse_key', '' ) );
        $cx  = trim( (string) get_option( 'ahb_google_cse_cx', '' ) );

        $url = add_query_arg( array(
            'key'        => $key,
            'cx'         => $cx,
            'q'          => $query,
            'searchType' => 'image',
            'num'        => 5,
            'safe'       => 'off',
            'imgSize'    => 'large',
        ), 'https://www.googleapis.com/customsearch/v1' );

        $r = wp_remote_get( $url, array( 'timeout'=>self::TIMEOUT, 'sslverify'=>false ) );
        if ( is_wp_error( $r ) ) return '';
        $j = json_decode( wp_remote_retrieve_body( $r ), true );
        if ( ! is_array( $j ) || empty( $j['items'] ) ) return '';

        foreach ( $j['items'] as $it ) {
            if ( ! empty( $it['link'] ) && $this->is_valid_image_url( $it['link'] ) ) {
                return esc_url_raw( $it['link'] );
            }
        }
        return '';
    }

    /* ============ Bing Görseller (anahtarsız) ============ */
    private function search_bing( $query ) {
        $url = 'https://www.bing.com/images/search?' . http_build_query( array(
            'q'    => $query,
            'form' => 'HDRSC2',
            'first'=> 1,
        ) );

        $r = wp_remote_get( $url, array(
            'timeout'    => self::TIMEOUT,
            'redirection'=> 3,
            'sslverify'  => false,
            'user-agent' => self::UA,
            'headers'    => array(
                'Accept'          => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language' => 'tr-TR,tr;q=0.9,en;q=0.8',
                'Referer'         => 'https://www.bing.com/',
            ),
        ) );

        if ( is_wp_error( $r ) ) {
            error_log( '[AI Haber Botu] Bing istek hatası: ' . $r->get_error_message() );
            return '';
        }
        $code = (int) wp_remote_retrieve_response_code( $r );
        if ( $code !== 200 ) {
            error_log( '[AI Haber Botu] Bing HTTP ' . $code );
            return '';
        }
        $html = wp_remote_retrieve_body( $r );
        if ( ! $html ) return '';

        // YÖNTEM 1: m='{...murl...}' (eski format, tek tırnak)
        if ( preg_match_all( '#<a[^>]+class="[^"]*iusc[^"]*"[^>]+m=\'([^\']+)\'#', $html, $m ) ) {
            foreach ( $m[1] as $raw ) {
                $u = $this->extract_murl( $raw );
                if ( $u && $this->is_valid_image_url( $u ) ) return esc_url_raw( $u );
            }
        }
        // YÖNTEM 2: m="{...murl...}" (yeni format, çift tırnak — &quot; encoded)
        if ( preg_match_all( '#m="(\{[^"]*?murl[^"]*?\})"#', $html, $m ) ) {
            foreach ( $m[1] as $raw ) {
                $u = $this->extract_murl( $raw );
                if ( $u && $this->is_valid_image_url( $u ) ) return esc_url_raw( $u );
            }
        }
        // YÖNTEM 3: mediaurl=... query parametresi (Bing'in kendi click-through linki)
        if ( preg_match_all( '#mediaurl=([^&"\'\s]+)#i', $html, $m ) ) {
            foreach ( $m[1] as $enc ) {
                $u = urldecode( $enc );
                // bazen iki kez encode edilmiş
                if ( strpos( $u, '%' ) !== false ) $u = urldecode( $u );
                if ( $this->is_valid_image_url( $u ) ) return esc_url_raw( $u );
            }
        }

        error_log( '[AI Haber Botu] Bing parse başarısız (HTML uzunluk: ' . strlen( $html ) . ')' );
        return '';
    }

    private function extract_murl( $raw ) {
        $s = html_entity_decode( $raw, ENT_QUOTES );
        $j = json_decode( $s, true );
        if ( is_array( $j ) ) {
            if ( ! empty( $j['murl'] ) )   return $j['murl'];
            if ( ! empty( $j['imgurl'] ) ) return $j['imgurl'];
        }
        // JSON parse edilemezse murl key'ini elle bul
        if ( preg_match( '#"murl"\s*:\s*"([^"]+)"#', $s, $mm ) ) return $mm[1];
        return '';
    }

    /* ============ DuckDuckGo Görseller ============ */
    private function search_duckduckgo( $query ) {
        // 1) vqd token al
        $r = wp_remote_get( 'https://duckduckgo.com/?' . http_build_query( array(
            'q'   => $query,
            'iax' => 'images',
            'ia'  => 'images',
        ) ), array(
            'timeout'=>self::TIMEOUT, 'sslverify'=>false, 'user-agent'=>self::UA,
            'headers'=>array( 'Accept-Language'=>'tr-TR,tr;q=0.9' ),
        ) );
        if ( is_wp_error( $r ) ) return '';
        $html = wp_remote_retrieve_body( $r );
        if ( ! preg_match( '#vqd=["\']?([\d-]+)["\']?#', $html, $vm ) ) {
            // alternatif: vqd='1-1234...'
            if ( ! preg_match( '#vqd=([\d-]{10,})#', $html, $vm ) ) {
                error_log( '[AI Haber Botu] DDG vqd token bulunamadı' );
                return '';
            }
        }
        $vqd = $vm[1];

        // 2) i.js endpoint
        $api = 'https://duckduckgo.com/i.js?' . http_build_query( array(
            'l'  => 'tr-tr',
            'o'  => 'json',
            'q'  => $query,
            'vqd'=> $vqd,
            'p'  => '1',
            'f'  => ',,,,,',
        ) );
        $r2 = wp_remote_get( $api, array(
            'timeout'=>self::TIMEOUT, 'sslverify'=>false, 'user-agent'=>self::UA,
            'headers'=>array(
                'Accept'=>'application/json',
                'Referer'=>'https://duckduckgo.com/',
                'X-Requested-With'=>'XMLHttpRequest',
            ),
        ) );
        if ( is_wp_error( $r2 ) ) return '';
        $j = json_decode( wp_remote_retrieve_body( $r2 ), true );
        if ( ! is_array( $j ) || empty( $j['results'] ) ) return '';

        foreach ( $j['results'] as $it ) {
            // SADECE 'image' alanı — 'url' kaynak SAYFA URL'sidir, görsel değil!
            $u = ! empty( $it['image'] ) ? $it['image'] : '';
            if ( $u && $this->is_valid_image_url( $u ) ) {
                return esc_url_raw( $u );
            }
        }
        return '';
    }

    /**
     * URL'nin gerçekten görsel döndürdüğünü HEAD isteğiyle doğrular.
     * Çok yavaş olmaması için kısa timeout ile.
     */
    private function url_returns_image( $url ) {
        $r = wp_remote_head( $url, array(
            'timeout'    => 5,
            'redirection'=> 3,
            'sslverify'  => false,
            'user-agent' => self::UA,
        ) );
        if ( is_wp_error( $r ) ) return false;
        $code = (int) wp_remote_retrieve_response_code( $r );
        if ( $code < 200 || $code >= 400 ) return false;
        $ct = strtolower( wp_remote_retrieve_header( $r, 'content-type' ) );
        return ( strpos( $ct, 'image/' ) === 0 );
    }

    /* ============ Yardımcılar ============ */
    private function is_valid_image_url( $url ) {
        if ( ! preg_match( '#^https?://#i', $url ) ) return false;
        // Görsel uzantısı ZORUNLU — yoksa muhtemelen sayfa URL'si (HTML)
        if ( ! preg_match( '~\.(jpe?g|png|webp|gif|avif|bmp)(\?|\#|$)~i', $url ) ) return false;
        if ( preg_match( '#(logo|icon|sprite|avatar|favicon|/ad/|/ads/|banner)#i', $url ) ) return false;
        if ( preg_match( '#\.svg(\?|$)#i', $url ) ) return false;
        if ( stripos( $url, 'data:' ) === 0 ) return false;
        if ( preg_match( '#googleusercontent\.com.*=s\d{1,2}#', $url ) ) return false;
        // Bing/DDG'nin kendi thumbnail proxy'sini atla — orijinali isteriz
        if ( stripos( $url, 'tse1.mm.bing.net' ) !== false ) return false;
        if ( stripos( $url, 'tse2.mm.bing.net' ) !== false ) return false;
        if ( stripos( $url, 'duckduckgo.com' ) !== false )   return false;
        // URL'in dosya uzunluğu (yola göre) çok kısaysa muhtemelen icon
        $path = parse_url( $url, PHP_URL_PATH );
        if ( $path && strlen( $path ) < 12 ) return false;
        return true;
    }
}
}
