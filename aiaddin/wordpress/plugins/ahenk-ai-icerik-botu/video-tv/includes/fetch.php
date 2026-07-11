<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class VTV_Fetch {

    /* =========================================================
     * YOUTUBE VİDEO META
     * ======================================================= */
    public static function yt_video_meta( $video_id ) {
        $url = "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={$video_id}&format=json";
        $res = wp_remote_get( $url, array( 'timeout'=>15, 'user-agent'=>'Mozilla/5.0' ) );
        if ( is_wp_error($res) || 200 !== (int)wp_remote_retrieve_response_code($res) ) { return false; }
        $d = json_decode( wp_remote_retrieve_body($res), true );
        if ( empty($d['title']) ) { return false; }
        return array(
            'platform'    => 'youtube',
            'video_id'    => $video_id,
            'baslik'      => sanitize_text_field( $d['title'] ),
            'thumbnail'   => "https://img.youtube.com/vi/{$video_id}/mqdefault.jpg",
            'kanal_ismi'  => sanitize_text_field( isset($d['author_name']) ? $d['author_name'] : '' ),
            'yayin_tarihi'=> '',
            'sure'        => '',
            'sira'        => 0,
        );
    }

    /* =========================================================
     * YOUTUBE KANAL META
     * ======================================================= */
    public static function yt_kanal_meta( $kanal_input ) {
        $slug = self::yt_kanal_slug( $kanal_input );
        $html = self::get_page( "https://www.youtube.com/{$slug}/about" );
        if ( ! $html ) {
            $html = self::get_page( "https://www.youtube.com/{$slug}" );
        }
        if ( ! $html ) { return array(); }

        $meta = array(
            'logo'        => '',
            'banner'      => '',
            'aciklama'    => '',
            'kanal_ismi'  => '',
            'abone'       => '',
            'video_sayisi'=> '',
        );

        $json_data = self::extract_yt_initial_data( $html );
        if ( $json_data ) {
            $name = self::yt_json_find( $json_data, 'title', 'channelMetadataRenderer' );
            if ( $name ) { $meta['kanal_ismi'] = sanitize_text_field( $name ); }

            $desc = self::yt_json_find( $json_data, 'description', 'channelMetadataRenderer' );
            if ( $desc ) { $meta['aciklama'] = sanitize_textarea_field( $desc ); }

            $avatar = self::yt_find_avatar( $json_data );
            if ( $avatar ) { $meta['logo'] = esc_url_raw( $avatar ); }

            $banner = self::yt_find_banner( $json_data );
            if ( $banner ) { $meta['banner'] = esc_url_raw( $banner ); }

            $subs = self::yt_json_find( $json_data, 'subscriberCountText', 'c4TabbedHeaderRenderer' );
            if ( ! $subs ) { $subs = self::yt_json_find( $json_data, 'subscriberCountText', 'channelHeaderRenderer' ); }
            if ( is_array($subs) && isset($subs['simpleText']) ) {
                $meta['abone'] = sanitize_text_field( $subs['simpleText'] );
            } elseif ( is_string($subs) ) {
                $meta['abone'] = sanitize_text_field( $subs );
            }
        }

        if ( empty($meta['logo']) ) {
            if ( preg_match( '/<meta\s+property="og:image"\s+content="([^"]+)"/i', $html, $m2 ) ) {
                $meta['logo'] = esc_url_raw( $m2[1] );
            }
        }
        if ( empty($meta['aciklama']) ) {
            if ( preg_match( '/<meta\s+name="description"\s+content="([^"]+)"/i', $html, $m3 ) ) {
                $meta['aciklama'] = sanitize_textarea_field( html_entity_decode( $m3[1], ENT_QUOTES ) );
            }
        }

        return $meta;
    }

    private static function yt_find_avatar( $json ) {
        if ( isset($json['header']['c4TabbedHeaderRenderer']['avatar']['thumbnails']) ) {
            $thumbs = $json['header']['c4TabbedHeaderRenderer']['avatar']['thumbnails'];
            $last = end($thumbs);
            if ( isset($last['url']) ) { return $last['url']; }
        }
        if ( isset($json['header']['channelHeaderRenderer']['avatar']['thumbnails']) ) {
            $thumbs = $json['header']['channelHeaderRenderer']['avatar']['thumbnails'];
            $last = end($thumbs);
            if ( isset($last['url']) ) { return $last['url']; }
        }
        return '';
    }

    private static function yt_find_banner( $json ) {
        if ( isset($json['header']['c4TabbedHeaderRenderer']['banner']['thumbnails']) ) {
            $thumbs = $json['header']['c4TabbedHeaderRenderer']['banner']['thumbnails'];
            $last = end($thumbs);
            if ( isset($last['url']) ) { return $last['url']; }
        }
        if ( isset($json['header']['channelHeaderRenderer']['banner']['thumbnails']) ) {
            $thumbs = $json['header']['channelHeaderRenderer']['banner']['thumbnails'];
            $last = end($thumbs);
            if ( isset($last['url']) ) { return $last['url']; }
        }
        return '';
    }

    private static function yt_json_find( $node, $key, $parent_key = '', $depth = 8 ) {
        if ( $depth <= 0 || ! is_array($node) ) { return null; }
        if ( $parent_key ) {
            if ( isset($node[$parent_key]) && is_array($node[$parent_key]) ) {
                $r = self::yt_json_find( $node[$parent_key], $key, '', 3 );
                if ( $r !== null ) { return $r; }
            }
        } else {
            if ( array_key_exists($key, $node) ) { return $node[$key]; }
        }
        foreach ( $node as $v ) {
            if ( is_array($v) ) {
                $r = self::yt_json_find( $v, $key, $parent_key, $depth - 1 );
                if ( $r !== null ) { return $r; }
            }
        }
        return null;
    }

    /* =========================================================
     * DAILYMOTION KANAL META
     * ======================================================= */
    public static function dm_kanal_meta( $kanal_input ) {
        $kanal = trim( $kanal_input );
        $kanal = preg_replace( '#^https?://(www\.)?dailymotion\.com/#i', '', $kanal );
        $kanal = trim( $kanal, '/' );
        if ( strpos($kanal, 'user/') !== 0 ) { $kanal = 'user/' . $kanal; }

        $html = self::get_page( "https://www.dailymotion.com/{$kanal}" );
        if ( ! $html ) { return array(); }

        $meta = array( 'logo'=>'', 'banner'=>'', 'aciklama'=>'', 'kanal_ismi'=>'', 'abone'=>'' );

        if ( preg_match( '/<meta\s+property="og:image"\s+content="([^"]+)"/i', $html, $m ) ) {
            $meta['logo'] = esc_url_raw( $m[1] );
        }
        if ( preg_match( '/<meta\s+property="og:title"\s+content="([^"]+)"/i', $html, $m ) ) {
            $meta['kanal_ismi'] = sanitize_text_field( html_entity_decode($m[1], ENT_QUOTES) );
        }
        if ( preg_match( '/<meta\s+property="og:description"\s+content="([^"]+)"/i', $html, $m ) ) {
            $meta['aciklama'] = sanitize_textarea_field( html_entity_decode($m[1], ENT_QUOTES) );
        }

        if ( preg_match( '/__NEXT_DATA__\s*=\s*(\{.+?\})\s*<\/script>/s', $html, $m ) ) {
            $json = json_decode( $m[1], true );
            if ( is_array($json) ) {
                $cover = self::dm_find_key( $json, 'coverURL', 5 );
                if ( $cover ) { $meta['banner'] = esc_url_raw( $cover ); }
                $logo2 = self::dm_find_key( $json, 'logoURL', 5 );
                if ( $logo2 && empty($meta['logo']) ) { $meta['logo'] = esc_url_raw( $logo2 ); }
                $desc2 = self::dm_find_key( $json, 'description', 4 );
                if ( $desc2 && empty($meta['aciklama']) ) { $meta['aciklama'] = sanitize_textarea_field($desc2); }
            }
        }
        return $meta;
    }

    private static function dm_find_key( $node, $key, $depth ) {
        if ( $depth <= 0 || ! is_array($node) ) { return null; }
        if ( array_key_exists($key, $node) && is_string($node[$key]) && $node[$key] ) { return $node[$key]; }
        foreach ( $node as $v ) {
            if ( is_array($v) ) {
                $r = self::dm_find_key( $v, $key, $depth - 1 );
                if ( $r !== null ) { return $r; }
            }
        }
        return null;
    }

    /* =========================================================
     * YOUTUBE PLAYLIST VİDEOLARI
     * ======================================================= */
    public static function yt_playlist_videos( $playlist_id, $limit = 150 ) {
        $html = self::get_page( "https://www.youtube.com/playlist?list={$playlist_id}" );
        if ( ! $html ) { return array(); }
        return self::yt_parse( $html, $limit, 'youtube' );
    }

    /* =========================================================
     * YOUTUBE KANAL VİDEOLARI
     * ======================================================= */
    public static function yt_kanal_videos( $kanal_input, $limit = 150 ) {
        $slug = self::yt_kanal_slug( $kanal_input );
        $html = self::get_page( "https://www.youtube.com/{$slug}/videos" );
        if ( ! $html ) { return array(); }
        return self::yt_parse( $html, $limit, 'youtube' );
    }

    private static function yt_kanal_slug( $input ) {
        $input = trim( $input );
        $input = preg_replace( '#^https?://(www\.)?youtube\.com/#i', '', $input );
        $input = trim( $input, '/' );
        if ( $input === '' ) { return '@unknown'; }
        if ( strpos($input, '@') === 0 )        { return $input; }
        if ( strpos($input, 'channel/') === 0 ) { return $input; }
        if ( strpos($input, 'c/') === 0 )       { return $input; }
        if ( preg_match( '/^UC[a-zA-Z0-9_-]{20,}$/', $input ) ) { return 'channel/' . $input; }
        return '@' . $input;
    }

    private static function yt_parse( $html, $limit, $platform ) {
        $json = self::extract_yt_initial_data( $html );
        if ( ! $json ) { return array(); }
        $renderers = array();
        self::yt_find_renderers( $json, $renderers );
        $videos = array();
        $idx    = 0;
        foreach ( $renderers as $item ) {
            if ( $idx >= $limit ) { break; }
            $vid = isset($item['videoId']) ? $item['videoId'] : '';
            if ( ! $vid ) { continue; }
            $title = '';
            if ( isset($item['title']['runs'][0]['text']) ) {
                $title = $item['title']['runs'][0]['text'];
            } elseif ( isset($item['title']['simpleText']) ) {
                $title = $item['title']['simpleText'];
            }
            if ( ! $title ) { continue; }

            $thumb = "https://img.youtube.com/vi/{$vid}/mqdefault.jpg";
            $ch    = '';
            if ( isset($item['shortBylineText']['runs'][0]['text']) ) {
                $ch = $item['shortBylineText']['runs'][0]['text'];
            } elseif ( isset($item['longBylineText']['runs'][0]['text']) ) {
                $ch = $item['longBylineText']['runs'][0]['text'];
            }
            $sure  = '';
            if ( isset($item['lengthText']['simpleText']) ) { $sure = $item['lengthText']['simpleText']; }
            elseif ( isset($item['lengthText']['accessibility']['accessibilityData']['label']) ) {
                $sure = $item['lengthText']['accessibility']['accessibilityData']['label'];
            }
            $tarih = '';
            if ( isset($item['publishedTimeText']['simpleText']) ) { $tarih = $item['publishedTimeText']['simpleText']; }

            $videos[] = array(
                'platform'    => $platform,
                'video_id'    => sanitize_text_field($vid),
                'baslik'      => sanitize_text_field($title),
                'thumbnail'   => esc_url_raw($thumb),
                'kanal_ismi'  => sanitize_text_field($ch),
                'yayin_tarihi'=> sanitize_text_field($tarih),
                'sure'        => sanitize_text_field($sure),
                'sira'        => $idx,
            );
            $idx++;
        }
        return $videos;
    }

    private static function yt_find_renderers( $node, &$out ) {
        if ( ! is_array($node) ) { return; }
        $keys = array( 'videoRenderer', 'gridVideoRenderer', 'playlistVideoRenderer', 'richItemRenderer' );
        foreach ( $keys as $k ) {
            if ( isset($node[$k]) ) {
                $item = $node[$k];
                if ( isset($item['videoId']) ) {
                    $out[] = $item;
                } elseif ( isset($item['content']['videoRenderer']) ) {
                    $out[] = $item['content']['videoRenderer'];
                }
            }
        }
        foreach ( $node as $v ) {
            if ( is_array($v) ) { self::yt_find_renderers( $v, $out ); }
        }
    }

    /* =========================================================
     * YOUTUBE KANAL PLAYLİSTLERİ
     * ======================================================= */
    public static function yt_kanal_playlistleri( $kanal_input, $limit = 50 ) {
        $slug = self::yt_kanal_slug( $kanal_input );
        $html = self::get_page( "https://www.youtube.com/{$slug}/playlists" );
        if ( ! $html ) { return array(); }
        $json = self::extract_yt_initial_data( $html );
        if ( ! $json ) { return array(); }
        $playlists = array();
        self::find_playlists_in_json( $json, $playlists, $limit );
        return $playlists;
    }

    private static function find_playlists_in_json( $node, &$out, $limit, $depth = 8 ) {
        if ( count($out) >= $limit || $depth <= 0 || ! is_array($node) ) { return; }

        if ( isset($node['playlistId']) && ! empty($node['playlistId']) ) {
            $pid   = $node['playlistId'];
            $title = '';
            $thumb = '';
            $count = 0;

            if ( isset($node['title']['simpleText']) ) {
                $title = $node['title']['simpleText'];
            } elseif ( isset($node['title']['runs'][0]['text']) ) {
                $title = $node['title']['runs'][0]['text'];
            }

            if ( isset($node['thumbnail']['thumbnails']) ) {
                $thumbs = $node['thumbnail']['thumbnails'];
                $last   = end($thumbs);
                if ( isset($last['url']) ) { $thumb = $last['url']; }
            }

            if ( isset($node['videoCountShortText']['simpleText']) ) {
                $count = (int) preg_replace( '/\D/', '', $node['videoCountShortText']['simpleText'] );
            } elseif ( isset($node['videoCountText']['runs'][0]['text']) ) {
                $count = (int) preg_replace( '/\D/', '', $node['videoCountText']['runs'][0]['text'] );
            }

            if ( $pid && $title ) {
                foreach ( $out as $p ) {
                    if ( $p['playlist_id'] === $pid ) { return; }
                }
                $out[] = array(
                    'playlist_id'  => sanitize_text_field($pid),
                    'isim'         => sanitize_text_field($title),
                    'thumbnail'    => esc_url_raw($thumb),
                    'video_sayisi' => $count,
                );
                return;
            }
        }

        foreach ( $node as $v ) {
            if ( is_array($v) ) {
                self::find_playlists_in_json( $v, $out, $limit, $depth - 1 );
            }
        }
    }

    /* =========================================================
     * YOUTUBE VİDEO AÇIKLAMASI
     * ======================================================= */
    public static function yt_video_aciklama( $video_id ) {
        $html = self::get_page( "https://www.youtube.com/watch?v={$video_id}" );
        if ( ! $html ) { return ''; }
        $json = self::extract_yt_initial_data( $html );
        if ( $json ) {
            $desc = self::yt_json_find( $json, 'description', 'videoDescriptionHeaderRenderer', 6 );
            if ( $desc && is_array($desc) && isset($desc['runs']) ) {
                $text = '';
                foreach ( $desc['runs'] as $run ) {
                    $text .= isset($run['text']) ? $run['text'] : '';
                }
                if ( $text ) { return sanitize_textarea_field($text); }
            }
            $attr = self::yt_json_find( $json, 'attributedDescription', '', 8 );
            if ( $attr && is_array($attr) && isset($attr['content']) ) {
                return sanitize_textarea_field( $attr['content'] );
            }
        }
        if ( preg_match( '/<meta\s+(?:name|property)="(?:og:description|description)"\s+content="([^"]+)"/i', $html, $m2 ) ) {
            return sanitize_textarea_field( html_entity_decode($m2[1], ENT_QUOTES) );
        }
        return '';
    }

    /* =========================================================
     * DAILYMOTION
     * ======================================================= */
    public static function dm_video_meta( $video_id ) {
        $url = "https://www.dailymotion.com/video/{$video_id}";
        $html = self::get_page( $url );
        if ( ! $html ) { return false; }
        $title = '';
        $thumb = '';
        $ch    = '';
        if ( preg_match( '/<meta\s+property="og:title"\s+content="([^"]+)"/i', $html, $m ) ) {
            $title = html_entity_decode( $m[1], ENT_QUOTES );
        }
        if ( preg_match( '/<meta\s+property="og:image"\s+content="([^"]+)"/i', $html, $m ) ) {
            $thumb = $m[1];
        }
        if ( ! $title ) { return false; }
        return array(
            'platform'   => 'dailymotion',
            'video_id'   => $video_id,
            'baslik'     => sanitize_text_field($title),
            'thumbnail'  => esc_url_raw($thumb),
            'kanal_ismi' => sanitize_text_field($ch),
            'yayin_tarihi'=> '',
            'sure'       => '',
            'sira'       => 0,
            'thumbnail'  => esc_url_raw($thumb),
        );
    }

    public static function dm_kanal_videos( $kanal, $limit = 100 ) {
        $kanal = preg_replace( '#^https?://(www\.)?dailymotion\.com/#i', '', trim($kanal) );
        $kanal = trim( $kanal, '/' );
        $url   = "https://www.dailymotion.com/{$kanal}/1#video";
        $html  = self::get_page( $url );
        if ( ! $html ) { return array(); }
        return self::dm_parse( $html, $limit );
    }

    public static function dm_playlist_videos( $playlist_id, $limit = 100 ) {
        $url  = "https://www.dailymotion.com/playlist/{$playlist_id}";
        $html = self::get_page( $url );
        if ( ! $html ) { return array(); }
        return self::dm_parse( $html, $limit );
    }

    private static function dm_parse( $html, $limit ) {
        $videos = array();
        if ( ! preg_match( '/__NEXT_DATA__\s*=\s*(\{.+?\})\s*<\/script>/s', $html, $m ) ) { return array(); }
        $json = json_decode( $m[1], true );
        if ( ! is_array($json) ) { return array(); }
        self::dm_find_videos( $json, $videos, $limit );
        return $videos;
    }

    private static function dm_find_videos( $node, &$out, $limit ) {
        if ( count($out) >= $limit || ! is_array($node) ) { return; }
        if ( isset($node['id']) && isset($node['title']) && isset($node['thumbnail_360_url']) ) {
            $out[] = array(
                'platform'    => 'dailymotion',
                'video_id'    => sanitize_text_field($node['id']),
                'baslik'      => sanitize_text_field($node['title']),
                'thumbnail'   => esc_url_raw($node['thumbnail_360_url']),
                'kanal_ismi'  => sanitize_text_field( isset($node['owner']['screenname']) ? $node['owner']['screenname'] : '' ),
                'yayin_tarihi'=> sanitize_text_field( isset($node['created_time']) ? date('Y-m-d', $node['created_time']) : '' ),
                'sure'        => sanitize_text_field( isset($node['duration']) ? gmdate('i:s', $node['duration']) : '' ),
                'sira'        => count($out),
            );
            return;
        }
        foreach ( $node as $v ) {
            if ( is_array($v) ) { self::dm_find_videos( $v, $out, $limit ); }
        }
    }

    /* =========================================================
     * ID EXTRACTION
     * ======================================================= */
    public static function extract_yt_video_id( $input ) {
        $input = trim($input);
        if ( preg_match( '/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/', $input, $m ) ) { return $m[1]; }
        if ( preg_match( '/^[a-zA-Z0-9_-]{11}$/', $input ) ) { return $input; }
        return '';
    }

    public static function extract_yt_playlist_id( $input ) {
        $input = trim($input);
        if ( preg_match( '/[?&]list=([a-zA-Z0-9_-]+)/', $input, $m ) ) { return $m[1]; }
        if ( preg_match( '/^(PL|UU|FL|RD|OL)[a-zA-Z0-9_-]+$/', $input ) ) { return $input; }
        return '';
    }

    public static function extract_dm_video_id( $input ) {
        $input = trim($input);
        if ( preg_match( '/dailymotion\.com\/video\/([a-z0-9]+)/i', $input, $m ) ) { return $m[1]; }
        if ( preg_match( '/^[a-z0-9]+$/i', $input ) ) { return $input; }
        return '';
    }

    /* =========================================================
     * ACIKLAMA TEMİZLE
     * ======================================================= */
    public static function temizle_aciklama( $text ) {
        if ( ! $text ) { return ''; }
        // Abone ol içeren satırları kaldır
        $text = preg_replace( '/^.*abone ol.*$/imu', '', $text );
        $text = preg_replace( '/^.*subscribe.*$/iu', '', $text );
        $text = preg_replace( '/^.*abone olmak.*$/iu', '', $text );
        // URL satırlarını kaldır
        $text = preg_replace( '/https?:\/\/\S+/i', '', $text );
        // @etiketleri kaldır
        $text = preg_replace( '/@[A-Za-z0-9_]+/', '', $text );
        // Ardı ardına boş satırları temizle (2+ boş satır -> 1)
        $text = preg_replace( '/\n{3,}/', "\n\n", $text );
        return trim( $text );
    }

    /* =========================================================
     * HTTP İSTEK
     * ======================================================= */
    private static function get_page( $url ) {
        $res = wp_remote_get( $url, array(
            'timeout'    => 20,
            'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'headers'    => array(
                'Accept-Language' => 'tr-TR,tr;q=0.9,en;q=0.8',
                'Accept'          => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            ),
            'sslverify'  => false,
        ) );
        if ( is_wp_error($res) ) { return false; }
        if ( 200 !== (int)wp_remote_retrieve_response_code($res) ) { return false; }
        return wp_remote_retrieve_body($res);
    }

    /* =========================================================
     * ytInitialData EXTRACT
     * ======================================================= */
    private static function extract_yt_initial_data( $html ) {
        $pattern1 = '/var\s+ytInitialData\s*=\s*(\{.+?\});\s*(?:var\s+|<\/script>)/s';
        $pattern2 = '/ytInitialData\s*=\s*(\{.+?\});\s*(?:var|window|<)/s';
        if ( preg_match( $pattern1, $html, $m ) || preg_match( $pattern2, $html, $m ) ) {
            $data = json_decode( $m[1], true );
            if ( is_array($data) ) { return $data; }
        }
        return null;
    }
}
