<?php

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * RSS sağlamayan haber sitelerinin kategori/listeleme sayfalarından
 * son haber linklerini kazıyıp her birinin içeriğini + görselini çeker.
 *
 * Örn.  https://www.ntv.com.tr/haberleri/cevre
 *       https://medyascope.tv/cevre-haberleri/
 *       https://www.haberler.com/cevre/
 */
if ( ! class_exists( 'AHB_Html_Scraper' ) ) {
class AHB_Html_Scraper {

    /**
     * @param string $listing_url  Kategori/listeleme sayfası URL'si
     * @param int    $limit        Çekilecek max haber sayısı
     * @return array  AHB_RSS_Fetcher::fetch() ile aynı format
     */
    public function fetch( $listing_url, $limit = 20 ) {
        $listing_url = trim( $listing_url );
        if ( empty( $listing_url ) ) return array();

        $html = $this->http_get( $listing_url );
        if ( empty( $html ) ) return array();

        $links = $this->extract_article_links( $html, $listing_url, $limit * 3 );
        if ( empty( $links ) ) return array();

        $items = array();
        $count = 0;
        foreach ( $links as $link ) {
            if ( $count >= $limit ) break;

            $page = $this->http_get( $link );
            if ( empty( $page ) ) continue;

            $title   = $this->extract_title( $page );
            $body    = $this->extract_article_body( $page );
            $image   = $this->extract_og_image( $page, $link );

            if ( empty( $title ) || strlen( $body ) < 150 ) continue;

            $items[] = array(
                'title'     => $title,
                'content'   => $body,
                'link'      => $link,
                'pubDate'   => '',
                'guid'      => $link,
                'image_url' => $image,
                'source'    => parse_url( $link, PHP_URL_HOST ),
            );
            $count++;
        }

        return $items;
    }

    private function http_get( $url ) {
        $args = array(
            'timeout'     => 30,
            'redirection' => 5,
            'sslverify'   => false,
            'user-agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'headers'     => array(
                'Accept'          => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language' => 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding' => 'gzip, deflate',
                'Cache-Control'   => 'no-cache',
                'Referer'         => 'https://www.google.com/',
            ),
        );
        $response = wp_remote_get( $url, $args );
        if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) >= 400 ) {
            // Mobil UA ile yeniden dene (bazı siteler botu mobilde geçirir)
            $args['user-agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
            $response = wp_remote_get( $url, $args );
        }
        if ( is_wp_error( $response ) ) return '';
        $code = wp_remote_retrieve_response_code( $response );
        if ( $code !== 200 && $code !== 203 ) return '';
        $body = wp_remote_retrieve_body( $response );
        // Eğer body gzip ise (bazı sunucularda WP otomatik açmaz)
        if ( $body && substr( $body, 0, 2 ) === "\x1f\x8b" && function_exists( 'gzdecode' ) ) {
            $dec = @gzdecode( $body );
            if ( $dec ) $body = $dec;
        }
        return $body;
    }

    /**
     * Listeleme sayfasından haber linklerini çıkarır.
     * Heuristik: <article> içindeki ilk <a href>, <h2><a>, <h3><a>, slug'ında '/haber'/yıl içeren linkler vs.
     */
    private function extract_article_links( $html, $base_url, $max ) {
        $base_host = parse_url( $base_url, PHP_URL_HOST );
        if ( empty( $base_host ) ) return array();

        $links  = array();
        $seen   = array();

        // 0) JSON-LD ItemList / NewsArticle
        if ( preg_match_all( '#<script[^>]+type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>#i', $html, $jm ) ) {
            foreach ( $jm[1] as $jraw ) {
                $jraw = trim( $jraw );
                $j = json_decode( $jraw, true );
                if ( ! is_array( $j ) ) continue;
                $stack = array( $j );
                while ( $stack ) {
                    $cur = array_pop( $stack );
                    if ( ! is_array( $cur ) ) continue;
                    if ( isset( $cur['url'] ) && is_string( $cur['url'] ) ) {
                        $this->collect_link( $cur['url'], $base_url, $base_host, $links, $seen );
                    }
                    if ( isset( $cur['mainEntityOfPage']['@id'] ) ) {
                        $this->collect_link( $cur['mainEntityOfPage']['@id'], $base_url, $base_host, $links, $seen );
                    }
                    foreach ( $cur as $v ) if ( is_array( $v ) ) $stack[] = $v;
                }
            }
        }

        // 1) <h1..h4><a href="..."> (içinde başka <span>/<img> olabilir)
        if ( preg_match_all( '/<h[1-4][^>]*>[\s\S]{0,200}?<a[^>]+href=["\']([^"\']+)["\']/i', $html, $m ) ) {
            foreach ( $m[1] as $href ) $this->collect_link( $href, $base_url, $base_host, $links, $seen );
        }

        // 2) <article> içindeki ilk <a href="...">
        if ( preg_match_all( '/<article[^>]*>([\s\S]*?)<\/article>/i', $html, $am ) ) {
            foreach ( $am[1] as $block ) {
                if ( preg_match( '/<a[^>]+href=["\']([^"\']+)["\']/i', $block, $am2 ) ) {
                    $this->collect_link( $am2[1], $base_url, $base_host, $links, $seen );
                }
            }
        }

        // 3) class isimleri haber/news/card/post içeren <a> linkleri
        if ( preg_match_all( '/<a[^>]+class=["\'][^"\']*(?:haber|news|card|post|story|item|teaser|article|kart|gundem|manset)[^"\']*["\'][^>]+href=["\']([^"\']+)["\']/i', $html, $cm ) ) {
            foreach ( $cm[1] as $href ) $this->collect_link( $href, $base_url, $base_host, $links, $seen );
        }
        if ( preg_match_all( '/<a[^>]+href=["\']([^"\']+)["\'][^>]*class=["\'][^"\']*(?:haber|news|card|post|story|item|teaser|article|kart|gundem|manset)[^"\']*["\']/i', $html, $cm ) ) {
            foreach ( $cm[1] as $href ) $this->collect_link( $href, $base_url, $base_host, $links, $seen );
        }

        // 4) URL'sinde /haber/, /news/, /yıl/ay/ paterni olan veya uzun slug içeren tüm <a href>
        if ( preg_match_all( '/<a[^>]+href=["\']([^"\']+)["\']/i', $html, $allm ) ) {
            foreach ( $allm[1] as $href ) {
                $accept = false;
                if ( preg_match( '#/(haber|news|gundem|magazin|spor|ekonomi|dunya|teknoloji|yasam|saglik|kultur|sanat|siyaset|yazarlar|yazi)/#i', $href ) ) $accept = true;
                elseif ( preg_match( '#/20[12]\d/\d{1,2}/\d{1,2}/#', $href ) ) $accept = true;
                elseif ( preg_match( '#-\d{5,}(\.html|/?)$#i', $href ) ) $accept = true;
                // Sözcü/Hürriyet tarzı: slug + 7-12 karakterli random ID son ek (h-w-y harfleri ve rakamlar)
                elseif ( preg_match( '#-[a-z0-9]{6,12}/?$#i', $href ) && substr_count( $href, '-' ) >= 3 ) $accept = true;
                // En az 25 karakter slug, kebab-case (3+ tire)
                elseif ( preg_match( '#/[a-z0-9\-]{25,}/?$#i', $href ) && substr_count( basename( rtrim( $href, '/' ) ), '-' ) >= 3 ) $accept = true;
                if ( $accept ) $this->collect_link( $href, $base_url, $base_host, $links, $seen );
            }
        }

        // Limit
        return array_slice( $links, 0, $max );
    }

    private function collect_link( $href, $base_url, $base_host, &$links, &$seen ) {
        $href = trim( html_entity_decode( $href, ENT_QUOTES, 'UTF-8' ) );
        if ( empty( $href ) ) return;
        if ( strpos( $href, '#' ) === 0 ) return;
        if ( stripos( $href, 'javascript:' ) === 0 ) return;
        if ( stripos( $href, 'mailto:' ) === 0 ) return;

        // Mutlak URL'ye çevir
        if ( strpos( $href, '//' ) === 0 ) {
            $href = 'https:' . $href;
        } elseif ( strpos( $href, '/' ) === 0 ) {
            $scheme = parse_url( $base_url, PHP_URL_SCHEME ) ?: 'https';
            $href = $scheme . '://' . $base_host . $href;
        } elseif ( ! preg_match( '#^https?://#i', $href ) ) {
            $href = rtrim( $base_url, '/' ) . '/' . ltrim( $href, '/' );
        }

        // Aynı host filtreleme (alt domain dahil)
        $host = parse_url( $href, PHP_URL_HOST );
        if ( empty( $host ) ) return;
        $base_root = preg_replace( '/^www\./', '', $base_host );
        $cur_root  = preg_replace( '/^www\./', '', $host );
        // domain.tld eşleşmesi
        $base_parts = explode( '.', $base_root );
        $cur_parts  = explode( '.', $cur_root );
        $base_tail  = implode( '.', array_slice( $base_parts, -2 ) );
        $cur_tail   = implode( '.', array_slice( $cur_parts, -2 ) );
        if ( $base_tail !== $cur_tail ) return;

        // Listeleme/kategori sayfası filtresi (link aynı listeleme URL'sine işaret etmemeli)
        $href = strtok( $href, '#' ); // anchor'ı kes
        if ( rtrim( $href, '/' ) === rtrim( $base_url, '/' ) ) return;

        // Sayfalandırma / etiket / yazar / video sayfalarını dışla
        if ( preg_match( '#/(tag|etiket|yazar|author|video|gallery|foto|page|sayfa)/#i', $href ) ) return;
        if ( preg_match( '#\?(page|sayfa|p)=\d+#i', $href ) ) return;

        // Kısa linkler (kategori kökü) genelde haber değil
        $path = parse_url( $href, PHP_URL_PATH );
        if ( empty( $path ) || strlen( trim( $path, '/' ) ) < 8 ) return;

        $key = strtolower( $href );
        if ( isset( $seen[ $key ] ) ) return;
        $seen[ $key ] = true;
        $links[] = $href;
    }

    private function extract_title( $html ) {
        $t = '';
        if ( preg_match( '/<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']/i', $html, $m ) ) {
            $t = trim( html_entity_decode( $m[1], ENT_QUOTES, 'UTF-8' ) );
        } elseif ( preg_match( '/<meta[^>]+name=["\']twitter:title["\'][^>]+content=["\']([^"\']+)["\']/i', $html, $m ) ) {
            $t = trim( html_entity_decode( $m[1], ENT_QUOTES, 'UTF-8' ) );
        } elseif ( preg_match( '/<title[^>]*>(.*?)<\/title>/is', $html, $m ) ) {
            $t = trim( wp_strip_all_tags( html_entity_decode( $m[1], ENT_QUOTES, 'UTF-8' ) ) );
        }
        return $this->temizle_baslik_sonek( $t );
    }

    /**
     * Başlığın sonundaki kaynak site adını ("- Sözcü Gazetesi", "| Hürriyet",
     * "– CNN Türk", "» NTV" gibi) tekrar tekrar temizler.
     */
    private function temizle_baslik_sonek( $t ) {
        if ( empty( $t ) ) return '';
        $t = trim( $t );
        // Birden fazla kez uygula (zincirli sonek için: "Haber - Sözcü - Gazete")
        for ( $i = 0; $i < 3; $i++ ) {
            // Çeşitli ayraçlar: - – — | » › •  · :: ::
            if ( preg_match( '/^(.+?)\s*[\-\|–—»›•·:]{1,2}\s*([^\-\|–—»›•·:]{2,60})\s*$/u', $t, $mm ) ) {
                $tail = trim( $mm[2] );
                $tail_lower = mb_strtolower( $tail, 'UTF-8' );
                // Tail "kaynak adı" gibi mi? (kısa, çok kelime yok, haber/gazete/tv vs içerir VEYA 5 kelimeden az)
                $word_count = count( preg_split( '/\s+/u', $tail ) );
                $is_brand = ( $word_count <= 5 ) && (
                    preg_match( '/(gazete|gazetesi|haber|haberleri|news|tv|medya|ajans|post|times|daily|gündem|com|net|online|portal|dergi|radyo)/u', $tail_lower )
                    || $word_count <= 3
                );
                if ( $is_brand && mb_strlen( $mm[1], 'UTF-8' ) >= 12 ) {
                    $t = trim( $mm[1] );
                    continue;
                }
            }
            break;
        }
        return trim( $t );
    }

    private function extract_og_image( $html, $page_url ) {
        $img = '';
        if ( preg_match( '/<meta[^>]+property=["\']og:image(?::secure_url)?["\'][^>]+content=["\']([^"\']+)["\']/i', $html, $m ) ) {
            $img = html_entity_decode( $m[1], ENT_QUOTES, 'UTF-8' );
        } elseif ( preg_match( '/<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']/i', $html, $m ) ) {
            $img = html_entity_decode( $m[1], ENT_QUOTES, 'UTF-8' );
        }

        // Fallback: JSON-LD NewsArticle.image
        if ( empty( $img ) && preg_match_all( '#<script[^>]+type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>#i', $html, $jm ) ) {
            foreach ( $jm[1] as $jraw ) {
                $j = json_decode( trim( $jraw ), true );
                if ( ! is_array( $j ) ) continue;
                $stack = array( $j );
                while ( $stack ) {
                    $cur = array_pop( $stack );
                    if ( ! is_array( $cur ) ) continue;
                    if ( isset( $cur['image'] ) ) {
                        $cand = $cur['image'];
                        if ( is_string( $cand ) ) { $img = $cand; break 2; }
                        if ( is_array( $cand ) ) {
                            if ( isset( $cand['url'] ) && is_string( $cand['url'] ) ) { $img = $cand['url']; break 2; }
                            foreach ( $cand as $c ) {
                                if ( is_string( $c ) ) { $img = $c; break 3; }
                                if ( is_array( $c ) && isset( $c['url'] ) && is_string( $c['url'] ) ) { $img = $c['url']; break 3; }
                            }
                        }
                    }
                    foreach ( $cur as $v ) if ( is_array( $v ) ) $stack[] = $v;
                }
            }
        }

        // Fallback: ilk büyük <img>
        if ( empty( $img ) && preg_match_all( '/<img[^>]+(?:data-src|src)=["\']([^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)["\']/i', $html, $im ) ) {
            foreach ( $im[1] as $cand ) {
                if ( stripos( $cand, 'logo' ) !== false || stripos( $cand, 'icon' ) !== false || stripos( $cand, 'avatar' ) !== false ) continue;
                $img = $cand; break;
            }
        }

        if ( empty( $img ) ) return '';

        if ( strpos( $img, '//' ) === 0 ) $img = 'https:' . $img;
        elseif ( strpos( $img, '/' ) === 0 ) {
            $scheme = parse_url( $page_url, PHP_URL_SCHEME ) ?: 'https';
            $host   = parse_url( $page_url, PHP_URL_HOST );
            $img = $scheme . '://' . $host . $img;
        }
        return esc_url_raw( $img );
    }

    private function extract_article_body( $html ) {
        // 1) JSON-LD NewsArticle.articleBody / description (en güvenilir)
        $jbody = $this->extract_jsonld_body( $html );
        if ( $jbody && mb_strlen( $jbody, 'UTF-8' ) >= 200 ) {
            return $jbody;
        }

        // 2) Tag bazlı kapsamlama: önce <article>, yoksa içerik div'i, yoksa tüm sayfa
        $scopes = array();
        if ( preg_match_all( '/<article[^>]*>([\s\S]*?)<\/article>/i', $html, $m ) ) {
            // En uzun <article>'ı seç
            $best = ''; foreach ( $m[1] as $a ) if ( strlen( $a ) > strlen( $best ) ) $best = $a;
            if ( $best ) $scopes[] = $best;
        }
        // İçerik konteyneri olarak yaygın class/id'ler — açık etiketten itibaren sayfa sonuna kadar al
        if ( preg_match( '/<(div|section|main)[^>]+(?:class|id)=["\'][^"\']*(?:article-body|article__body|news-body|haber-detay|haber-icerik|haber-metni|news-content|post-content|entry-content|content-body|story-body|articleBody|main-content|content-text)[^"\']*["\'][^>]*>([\s\S]+)$/i', $html, $m ) ) {
            $scopes[] = $m[2];
        }
        $scopes[] = $html; // her şey

        $best_text = '';
        foreach ( $scopes as $scope ) {
            // Script/style/nav/footer/aside temizle
            $scope = preg_replace( '#<script[^>]*>[\s\S]*?</script>#i', '', $scope );
            $scope = preg_replace( '#<style[^>]*>[\s\S]*?</style>#i',   '', $scope );
            $scope = preg_replace( '#<nav[^>]*>[\s\S]*?</nav>#i',       '', $scope );
            $scope = preg_replace( '#<footer[^>]*>[\s\S]*?</footer>#i', '', $scope );
            $scope = preg_replace( '#<aside[^>]*>[\s\S]*?</aside>#i',   '', $scope );
            $scope = preg_replace( '#<form[^>]*>[\s\S]*?</form>#i',     '', $scope );

            if ( ! preg_match_all( '/<p[^>]*>([\s\S]*?)<\/p>/i', $scope, $matches ) ) continue;

            $paragraphs = array();
            $seen = array();
            foreach ( $matches[1] as $p ) {
                $text = trim( wp_strip_all_tags( html_entity_decode( $p, ENT_QUOTES, 'UTF-8' ) ) );
                $text = preg_replace( '/\s+/u', ' ', $text );
                if ( mb_strlen( $text, 'UTF-8' ) < 50 ) continue;
                // İlk 60 karakter anahtar (tekrarları ele)
                $k = mb_substr( $text, 0, 60, 'UTF-8' );
                if ( isset( $seen[ $k ] ) ) continue;
                $seen[ $k ] = true;
                // Çerez/abone/reklam/menu paragraflarını ele
                if ( preg_match( '/(çerez|cookie|kvkk|abone ol|bültenimiz|telif|tüm hakları|copyright|reklam|advertisement)/iu', $text ) && mb_strlen( $text, 'UTF-8' ) < 200 ) continue;
                $paragraphs[] = $text;
            }

            if ( empty( $paragraphs ) ) continue;
            $paragraphs = array_slice( $paragraphs, 0, 25 );
            $candidate = implode( "\n\n", $paragraphs );
            if ( mb_strlen( $candidate, 'UTF-8' ) > mb_strlen( $best_text, 'UTF-8' ) ) {
                $best_text = $candidate;
            }
        }

        // 3) Galeri sayfaları için: figcaption + JSON-LD description'ları topla
        if ( mb_strlen( $best_text, 'UTF-8' ) < 300 ) {
            $caps = array();
            if ( preg_match_all( '/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i', $html, $cm ) ) {
                foreach ( $cm[1] as $c ) {
                    $t = trim( wp_strip_all_tags( html_entity_decode( $c, ENT_QUOTES, 'UTF-8' ) ) );
                    if ( mb_strlen( $t, 'UTF-8' ) >= 30 ) $caps[] = $t;
                }
            }
            // JSON-LD ImageObject.caption / description
            if ( preg_match_all( '#<script[^>]+type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>#i', $html, $jm ) ) {
                foreach ( $jm[1] as $jraw ) {
                    $j = json_decode( trim( $jraw ), true );
                    if ( ! is_array( $j ) ) continue;
                    $stack = array( $j );
                    while ( $stack ) {
                        $cur = array_pop( $stack );
                        if ( ! is_array( $cur ) ) continue;
                        foreach ( array( 'caption', 'description' ) as $k ) {
                            if ( isset( $cur[ $k ] ) && is_string( $cur[ $k ] ) ) {
                                $t = trim( wp_strip_all_tags( $cur[ $k ] ) );
                                if ( mb_strlen( $t, 'UTF-8' ) >= 30 ) $caps[] = $t;
                            }
                        }
                        foreach ( $cur as $v ) if ( is_array( $v ) ) $stack[] = $v;
                    }
                }
            }
            if ( $caps ) {
                $caps = array_values( array_unique( $caps ) );
                $extra = implode( "\n\n", array_slice( $caps, 0, 20 ) );
                if ( mb_strlen( $extra, 'UTF-8' ) > mb_strlen( $best_text, 'UTF-8' ) ) {
                    $best_text = $extra;
                }
            }
        }

        // 4) Son çare: og:description
        if ( mb_strlen( $best_text, 'UTF-8' ) < 150 ) {
            if ( preg_match( '/<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']/i', $html, $m ) ) {
                $best_text = trim( html_entity_decode( $m[1], ENT_QUOTES, 'UTF-8' ) );
            }
        }

        return $best_text;
    }

    /**
     * JSON-LD içinden articleBody veya description çek
     */
    private function extract_jsonld_body( $html ) {
        if ( ! preg_match_all( '#<script[^>]+type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>#i', $html, $jm ) ) {
            return '';
        }
        $best = '';
        foreach ( $jm[1] as $jraw ) {
            $j = json_decode( trim( $jraw ), true );
            if ( ! is_array( $j ) ) continue;
            $stack = array( $j );
            while ( $stack ) {
                $cur = array_pop( $stack );
                if ( ! is_array( $cur ) ) continue;
                $type = isset( $cur['@type'] ) ? $cur['@type'] : '';
                if ( is_array( $type ) ) $type = implode( ',', $type );
                if ( stripos( (string) $type, 'Article' ) !== false || stripos( (string) $type, 'NewsArticle' ) !== false || stripos( (string) $type, 'BlogPosting' ) !== false ) {
                    foreach ( array( 'articleBody', 'description' ) as $k ) {
                        if ( isset( $cur[ $k ] ) && is_string( $cur[ $k ] ) ) {
                            $t = trim( wp_strip_all_tags( html_entity_decode( $cur[ $k ], ENT_QUOTES, 'UTF-8' ) ) );
                            $t = preg_replace( '/\s*\n\s*/u', "\n\n", $t );
                            if ( mb_strlen( $t, 'UTF-8' ) > mb_strlen( $best, 'UTF-8' ) ) $best = $t;
                        }
                    }
                }
                foreach ( $cur as $v ) if ( is_array( $v ) ) $stack[] = $v;
            }
        }
        return $best;
    }
}
} // end class_exists guard
