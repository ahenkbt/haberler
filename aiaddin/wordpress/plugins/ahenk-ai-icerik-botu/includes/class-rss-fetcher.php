<?php

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! class_exists( 'AHB_RSS_Fetcher' ) ) {
class AHB_RSS_Fetcher {

    /**
     * RSS/Atom URL'sinden haber öğelerini çeker.
     *
     * @param string $url
     * @return array [ ['title'=>'', 'content'=>'', 'link'=>'', 'pubDate'=>'', 'guid'=>''], ... ]
     */
    /**
     * RSS satırını ayrıştırır: "https://url.com/feed | kategori-slug" formatı.
     *
     * @param string $line
     * @return array ['url'=>'...', 'category'=>'...']
     */
    public static function parse_source_line( $line ) {
        $line = trim( $line );
        if ( empty( $line ) || $line[0] === '#' ) return null;

        $parts = array_map( 'trim', explode( '|', $line, 2 ) );
        return array(
            'url'      => esc_url_raw( $parts[0] ),
            'category' => isset( $parts[1] ) ? sanitize_title( $parts[1] ) : '',
        );
    }

    public function fetch( $url ) {
        $url = esc_url_raw( $url );
        if ( empty( $url ) ) return array();

        $response = wp_remote_get( $url, array(
            'timeout'    => 30,
            'user-agent' => 'Mozilla/5.0 (compatible; AI Haber Botu/' . AHB_VERSION . '; +https://wordpress.org)',
        ) );

        if ( is_wp_error( $response ) ) {
            error_log( '[AI Haber Botu] RSS çekme hatası (' . $url . '): ' . $response->get_error_message() );
            return array();
        }

        $body = wp_remote_retrieve_body( $response );
        if ( empty( $body ) ) return array();

        return $this->parse( $body, $url );
    }

    private function parse( $xml_string, $source_url ) {
        libxml_use_internal_errors( true );
        $xml = simplexml_load_string( $xml_string );

        if ( ! $xml ) {
            error_log( '[AI Haber Botu] XML parse hatası: ' . $source_url );
            return array();
        }

        $items  = array();
        $limit  = (int) get_option( 'ahb_max_items_per_source', 10 );
        $count  = 0;

        $channel_items = isset( $xml->channel->item ) ? $xml->channel->item : null;
        if ( ! $channel_items && isset( $xml->entry ) ) {
            $channel_items = $xml->entry;
        }

        if ( ! $channel_items ) return array();

        foreach ( $channel_items as $item ) {
            if ( $count >= $limit ) break;

            $title       = $this->get_field( $item, array( 'title' ) );
            $raw_content = $this->get_field( $item, array( 'content:encoded', 'content', 'description', 'summary' ) );
            $link        = $this->get_field( $item, array( 'link', 'url' ) );
            $guid        = $this->get_field( $item, array( 'guid', 'id' ) );
            $pubDate     = $this->get_field( $item, array( 'pubDate', 'published', 'updated', 'dc:date' ) );

            if ( empty( $title ) || empty( $link ) ) continue;

            // === RESİM URL'sini çıkar (HTML stripleme öncesi) ===
            $image_url = $this->extract_image( $item, $raw_content );

            $content = wp_strip_all_tags( html_entity_decode( $raw_content, ENT_QUOTES, 'UTF-8' ) );
            $content = preg_replace( '/\s+/', ' ', trim( $content ) );

            if ( mb_strlen( $content ) < 50 ) {
                $content = $title;
            }

            $items[] = array(
                'title'       => sanitize_text_field( html_entity_decode( (string) $title, ENT_QUOTES, 'UTF-8' ) ),
                'content'     => $content,
                'link'        => esc_url_raw( (string) $link ),
                'pubDate'     => sanitize_text_field( (string) $pubDate ),
                'guid'        => sanitize_text_field( (string) ( $guid ?: $link ) ),
                'source_url'  => $source_url,
                'image_url'   => $image_url,
            );

            $count++;
        }

        return $items;
    }

    /**
     * RSS item içinden resim URL'sini bulur.
     * Sırası: media:content > media:thumbnail > enclosure > itunes:image > içerikten <img> > image tag.
     */
    private function extract_image( $item, $raw_content ) {
        // 1) <media:content url="..." medium="image">
        $media = $item->children( 'media', true );
        if ( $media ) {
            if ( isset( $media->content ) ) {
                foreach ( $media->content as $mc ) {
                    $attrs = $mc->attributes();
                    $medium = isset( $attrs['medium'] ) ? (string) $attrs['medium'] : '';
                    $type   = isset( $attrs['type'] ) ? (string) $attrs['type'] : '';
                    if ( $medium === 'image' || strpos( $type, 'image' ) === 0 || empty( $medium ) ) {
                        if ( isset( $attrs['url'] ) ) {
                            $url = (string) $attrs['url'];
                            if ( $this->is_image_url( $url ) ) return esc_url_raw( $url );
                        }
                    }
                }
            }
            if ( isset( $media->thumbnail ) ) {
                $attrs = $media->thumbnail->attributes();
                if ( isset( $attrs['url'] ) ) {
                    $url = (string) $attrs['url'];
                    return esc_url_raw( $url );
                }
            }
        }

        // 2) <enclosure url="..." type="image/...">
        if ( isset( $item->enclosure ) ) {
            foreach ( $item->enclosure as $enc ) {
                $attrs = $enc->attributes();
                $type  = isset( $attrs['type'] ) ? (string) $attrs['type'] : '';
                $url   = isset( $attrs['url'] ) ? (string) $attrs['url'] : '';
                if ( $url && ( strpos( $type, 'image' ) === 0 || $this->is_image_url( $url ) ) ) {
                    return esc_url_raw( $url );
                }
            }
        }

        // 3) <itunes:image href="...">
        $itunes = $item->children( 'itunes', true );
        if ( $itunes && isset( $itunes->image ) ) {
            $attrs = $itunes->image->attributes();
            if ( isset( $attrs['href'] ) ) return esc_url_raw( (string) $attrs['href'] );
        }

        // 4) <image><url>...</url></image>
        if ( isset( $item->image->url ) ) {
            return esc_url_raw( (string) $item->image->url );
        }
        if ( isset( $item->image ) && ! empty( (string) $item->image ) ) {
            $val = (string) $item->image;
            if ( filter_var( $val, FILTER_VALIDATE_URL ) ) return esc_url_raw( $val );
        }

        // 5) İçerikteki ilk <img src="...">
        if ( ! empty( $raw_content ) ) {
            $decoded = html_entity_decode( $raw_content, ENT_QUOTES, 'UTF-8' );
            if ( preg_match( '/<img[^>]+src=["\']([^"\']+)["\']/i', $decoded, $m ) ) {
                return esc_url_raw( $m[1] );
            }
        }

        return '';
    }

    private function is_image_url( $url ) {
        return (bool) preg_match( '/\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i', $url );
    }

    private function get_field( $item, $keys ) {
        foreach ( $keys as $key ) {
            if ( isset( $item->$key ) && ! empty( (string) $item->$key ) ) {
                return (string) $item->$key;
            }
            if ( strpos( $key, ':' ) !== false ) {
                $parts = explode( ':', $key );
                $ns    = $parts[0];
                $local = $parts[1];
                $children = $item->children( $ns, true );
                if ( isset( $children->$local ) ) {
                    return (string) $children->$local;
                }
            }
        }
        return '';
    }
}
} // end class_exists guard
