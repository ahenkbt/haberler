<?php

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Google News RSS üzerinden konu/anahtar-kelime bazlı haber çeker.
 * Türkçe sonuçlar için hl=tr, gl=TR, ceid=TR:tr parametreleri kullanılır.
 */
if ( ! class_exists( 'AHB_Google_News_Fetcher' ) ) {
class AHB_Google_News_Fetcher {

    /**
     * Belirli bir arama sorgusu için Google News RSS'inden öğeleri çeker.
     *
     * @param string $query  Arama anahtar kelimesi (ör. "ekonomi haberleri")
     * @param int    $limit  En fazla kaç öğe döndürülsün
     * @return array  AHB_RSS_Fetcher::fetch() ile aynı format
     */
    public function fetch( $query, $limit = 20 ) {
        $query = trim( $query );
        if ( empty( $query ) ) return array();

        $url = 'https://news.google.com/rss/search?q=' . rawurlencode( $query )
             . '&hl=tr&gl=TR&ceid=TR:tr';

        $response = wp_remote_get( $url, array(
            'timeout'    => 30,
            'user-agent' => 'Mozilla/5.0 (compatible; AI Haber Botu/' . AHB_VERSION . ')',
        ) );

        if ( is_wp_error( $response ) ) {
            error_log( '[AI Haber Botu] Google News çekme hatası (' . $query . '): ' . $response->get_error_message() );
            return array();
        }

        $body = wp_remote_retrieve_body( $response );
        if ( empty( $body ) ) return array();

        return $this->parse( $body, $limit );
    }

    private function parse( $xml_string, $limit ) {
        libxml_use_internal_errors( true );
        $xml = simplexml_load_string( $xml_string );
        libxml_clear_errors();
        if ( ! $xml ) return array();

        $items = array();
        $count = 0;

        foreach ( $xml->channel->item as $entry ) {
            if ( $count >= $limit ) break;

            $title = (string) $entry->title;
            $link  = (string) $entry->link;
            $desc  = (string) $entry->description;
            $guid  = (string) $entry->guid;
            $pub   = (string) $entry->pubDate;

            // Google News başlığı: "Haber başlığı - Kaynak Adı" şeklinde gelir.
            // Kaynak adını kırpıp özgün başlığı bırakıyoruz.
            if ( preg_match( '/^(.*?)\s+-\s+([^-]+)$/u', $title, $m ) ) {
                $title  = trim( $m[1] );
                $source = trim( $m[2] );
            } else {
                $source = '';
            }

            // Açıklamadaki HTML <a> etiketlerinden temiz içerik çıkar
            $clean_desc = wp_strip_all_tags( $desc );

            // Google News linki opaque'tir; gerçek kaynak URL'sini almaya çalış
            $source_url = $this->resolve_source_url( $link );

            // Daha zengin içerik için kaynaktan da çekmeyi dene
            $content = $clean_desc;
            if ( $source_url ) {
                $extracted = $this->extract_article_body( $source_url );
                if ( $extracted && strlen( $extracted ) > strlen( $clean_desc ) ) {
                    $content = $extracted;
                }
            }

            // Kaynak yoksa en azından başlık + açıklama AI'ya yetecek girdi sağlar
            if ( empty( $content ) ) $content = $title;

            $items[] = array(
                'title'   => $title,
                'content' => $content,
                'link'    => $source_url ?: $link,
                'pubDate' => $pub,
                'guid'    => $guid ?: ( $source_url ?: $link ),
                'image'   => '', // Google News RSS'inde güvenilir görsel yok; image varsa AI yine üretir
                'source'  => $source,
            );

            $count++;
        }

        return $items;
    }

    /**
     * Google News /rss/articles/... linkinden gerçek kaynak URL'sini çözer.
     * Google çoğunlukla 302 redirect verir.
     */
    private function resolve_source_url( $google_url ) {
        if ( empty( $google_url ) ) return '';

        $response = wp_remote_head( $google_url, array(
            'timeout'     => 15,
            'redirection' => 5,
            'user-agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ) );

        if ( is_wp_error( $response ) ) {
            // HEAD desteklemeyen sunucular için GET deneyelim
            $response = wp_remote_get( $google_url, array(
                'timeout'     => 15,
                'redirection' => 5,
                'user-agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ) );
            if ( is_wp_error( $response ) ) return '';
        }

        // wp_remote_get/head otomatik redirect izlemiş olabilir; son URL'yi al
        $final_url = '';
        if ( isset( $response['http_response'] ) && method_exists( $response['http_response'], 'get_response_object' ) ) {
            $obj = $response['http_response']->get_response_object();
            if ( isset( $obj->url ) ) $final_url = $obj->url;
        }

        // Yedek: Location header'ı varsa kullan
        if ( empty( $final_url ) ) {
            $location = wp_remote_retrieve_header( $response, 'location' );
            if ( ! empty( $location ) ) $final_url = is_array( $location ) ? end( $location ) : $location;
        }

        // Hâlâ Google domain'indeyse kaynağı çözememişizdir
        if ( empty( $final_url ) || strpos( $final_url, 'news.google.com' ) !== false || strpos( $final_url, 'google.com' ) !== false ) {
            return '';
        }

        return esc_url_raw( $final_url );
    }

    /**
     * Verilen URL'den en olası haber metnini çıkarır.
     * Karmaşık parsing yerine en uzun <p> dizilerini birleştirir.
     */
    private function extract_article_body( $url ) {
        $response = wp_remote_get( $url, array(
            'timeout'     => 20,
            'redirection' => 5,
            'user-agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ) );

        if ( is_wp_error( $response ) ) return '';
        $code = wp_remote_retrieve_response_code( $response );
        if ( $code !== 200 ) return '';

        $html = wp_remote_retrieve_body( $response );
        if ( empty( $html ) ) return '';

        // <article> tagı varsa onu tercih et
        if ( preg_match( '/<article[^>]*>(.*?)<\/article>/is', $html, $m ) ) {
            $html = $m[1];
        }

        // Tüm <p> içeriklerini topla
        if ( ! preg_match_all( '/<p[^>]*>(.*?)<\/p>/is', $html, $matches ) ) return '';

        $paragraphs = array();
        foreach ( $matches[1] as $p ) {
            $text = trim( wp_strip_all_tags( $p ) );
            if ( strlen( $text ) > 50 ) $paragraphs[] = $text;
        }

        if ( empty( $paragraphs ) ) return '';

        // İlk 12 anlamlı paragrafı al — AI bunları özgünleştirip yeniden yazacak
        $paragraphs = array_slice( $paragraphs, 0, 12 );
        return implode( "\n\n", $paragraphs );
    }
}
} // end class_exists guard
