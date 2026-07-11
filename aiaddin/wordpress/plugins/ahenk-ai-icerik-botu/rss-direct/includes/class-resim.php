<?php
/**
 * AHB - Resim Sinifi v1.2
 * Artik resimler sunucuya indirilmez. Karsi sunucudan link olarak kullanilir.
 * Resimsiz haberlerde varsayilan resim gosterilir.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AHBRSS_Resim {

    const META_KEY    = '_ahb_resim_url';
    const OPTION_VARS = 'ahb_varsayilan_resim_url';

    /**
     * Varsayilan (placeholder) resim URL'sini dondurur.
     */
    public static function varsayilan_url() {
        $url = get_option( self::OPTION_VARS, '' );
        if ( empty($url) ) {
            // Eklenti icindeki yedek
            $url = AHBRSS_URI . 'assets/img/varsayilan.svg';
        }
        return $url;
    }

    /**
     * Harici URL'yi posta resim olarak kaydet.
     * - Sunucuya indirilmez.
     * - _ahb_resim_url meta'sina yazilir.
     * - _thumbnail_id meta'sina '0' yazmiyoruz; tema/template tarafinda
     *   post_thumbnail_html ve get_the_post_thumbnail_url filtreleri
     *   bu URL'yi kullanir.
     *
     * @param string $resim_url
     * @param int    $post_id
     * @return bool
     */
    public static function harici_url_ata( $resim_url, $post_id ) {
        $post_id = intval($post_id);
        if ( ! $post_id ) return false;

        $resim_url = trim( (string) $resim_url );
        if ( empty($resim_url) || ! filter_var($resim_url, FILTER_VALIDATE_URL) ) {
            $resim_url = self::varsayilan_url();
        }

        update_post_meta( $post_id, self::META_KEY, esc_url_raw($resim_url) );
        return true;
    }

    /**
     * Geriye uyumluluk: eski cagri imzasi.
     */
    public static function indir_ve_ata( $resim_url, $post_id ) {
        return self::ata( $resim_url, $post_id );
    }

    /**
     * Akilli resim atama:
     *   1) Resmi sunucuya indir, WP attachment olarak ekle, featured image yap.
     *      (Hotlink korumali sitelerde tek guvenli yontem budur.)
     *   2) Indirme basarisiz olursa harici URL'yi link olarak kaydet.
     *   3) Hicbir sekilde alinamazsa varsayilan resim.
     */
    public static function ata( $resim_url, $post_id, $indirme_izinli = true ) {
        $post_id = intval($post_id);
        if ( ! $post_id ) return false;

        $resim_url = trim( (string) $resim_url );

        // Gecersiz URL
        if ( empty($resim_url) || ! filter_var($resim_url, FILTER_VALIDATE_URL) ) {
            update_post_meta( $post_id, self::META_KEY, esc_url_raw(self::varsayilan_url()) );
            return false;
        }

        // Varsayilan resim ise indirmeye calisma
        if ( $resim_url === self::varsayilan_url() ) {
            update_post_meta( $post_id, self::META_KEY, esc_url_raw($resim_url) );
            return true;
        }

        // Protokol-rolative URL'leri duzelt
        if ( strpos($resim_url, '//') === 0 ) {
            $resim_url = 'https:' . $resim_url;
        }

        // SADECE LINK MODU: Kampanyada "Resim Indir" kapaliysa indirmeyi
        // hic deneme, sunucuyu sismekten korur. Karsi sunucudan link olarak gosterilir.
        if ( ! $indirme_izinli ) {
            update_post_meta( $post_id, self::META_KEY, esc_url_raw($resim_url) );
            return true;
        }

        // 1) Once daha once ayni URL indirilmis mi? (cache)
        $mevcut = self::url_ile_bul($resim_url);
        if ( $mevcut ) {
            set_post_thumbnail($post_id, $mevcut);
            $local = wp_get_attachment_url($mevcut);
            if ( $local ) update_post_meta($post_id, self::META_KEY, esc_url_raw($local));
            return true;
        }

        // 2) Sunucuya indir
        $att_id = self::sunucuya_indir($resim_url, $post_id);
        if ( $att_id ) {
            set_post_thumbnail($post_id, $att_id);
            update_post_meta($att_id, '_ahb_kaynak_url', esc_url_raw($resim_url));
            $local = wp_get_attachment_url($att_id);
            if ( $local ) {
                update_post_meta($post_id, self::META_KEY, esc_url_raw($local));
            }
            return true;
        }

        // 3) Indirilemediyse harici link olarak dene
        update_post_meta( $post_id, self::META_KEY, esc_url_raw($resim_url) );
        return true;
    }

    /**
     * Bu URL daha once medya kutuphanesine eklendiyse attachment ID'sini dondur.
     */
    private static function url_ile_bul( $url ) {
        global $wpdb;
        $id = $wpdb->get_var( $wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = %s AND meta_value = %s LIMIT 1",
            '_ahb_kaynak_url', $url
        ));
        return $id ? (int) $id : 0;
    }

    /**
     * Bir resim URL'sinin gercekten erisilebilir oldugunu dogrula.
     */
    private static function url_erisilebilir( $url ) {
        $ua = trim((string) get_option('ahb_user_agent',''));
        if ( ! $ua ) {
            $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
        }
        $args = array(
            'timeout'     => 8,
            'redirection' => 3,
            'sslverify'   => false,
            'user-agent'  => $ua,
            'headers'     => array(
                'Referer'         => self::origin($url),
                'Accept'          => 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                'Accept-Language' => 'tr-TR,tr;q=0.9,en;q=0.5',
            ),
        );

        $resp = wp_safe_remote_head($url, $args);
        if ( is_wp_error($resp) || (int) wp_remote_retrieve_response_code($resp) >= 400 ) {
            // HEAD desteklemeyen sunucular icin kucuk bir GET dene
            $resp = wp_safe_remote_get($url, array_merge($args, array(
                'timeout'             => 10,
                'limit_response_size' => 4096,
            )));
            if ( is_wp_error($resp) ) return false;
        }

        $code = (int) wp_remote_retrieve_response_code($resp);
        if ( $code < 200 || $code >= 400 ) return false;

        $ct = strtolower( (string) wp_remote_retrieve_header($resp, 'content-type') );
        if ( $ct !== '' ) {
            return ( strpos($ct, 'image/') === 0 );
        }
        // Content-Type yoksa uzantidan tahmin
        return (bool) preg_match('/\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i', $url);
    }

    /**
     * Resmi sunucuya indirip WP medya kutuphanesine ekle.
     * Basarili olursa attachment ID dondurur.
     */
    private static function sunucuya_indir( $url, $post_id ) {
        if ( ! function_exists('download_url') ) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
        }
        if ( ! function_exists('media_handle_sideload') ) {
            require_once ABSPATH . 'wp-admin/includes/media.php';
        }
        if ( ! function_exists('wp_read_image_metadata') ) {
            require_once ABSPATH . 'wp-admin/includes/image.php';
        }

        // Tarayici gibi ozel header'larla indirebilmek icin filtrele
        $ref = self::origin($url);
        $ua  = trim((string) get_option('ahb_user_agent',''));
        if ( ! $ua ) {
            $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
        }

        $http_filter = function( $args, $u ) use ( $ref, $ua, $url ) {
            if ( $u === $url ) {
                $args['user-agent'] = $ua;
                $args['sslverify']  = false;
                $args['timeout']    = max( (int)($args['timeout'] ?? 0), 30 );
                $args['headers']    = array_merge( (array)($args['headers'] ?? array()), array(
                    'Referer'         => $ref,
                    'Accept'          => 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                    'Accept-Language' => 'tr-TR,tr;q=0.9,en;q=0.5',
                ) );
            }
            return $args;
        };
        add_filter('http_request_args', $http_filter, 10, 2);
        $tmp = download_url($url, 30);
        remove_filter('http_request_args', $http_filter, 10);

        if ( is_wp_error($tmp) || ! $tmp ) return 0;

        // Dosya adi + uzanti
        $name = basename( parse_url($url, PHP_URL_PATH) );
        $name = sanitize_file_name( $name );
        if ( ! $name || ! preg_match('/\.(jpe?g|png|webp|gif|avif)$/i', $name) ) {
            // Uzantiyi MIME'den tahmin et
            $mime = function_exists('mime_content_type') ? @mime_content_type($tmp) : '';
            $ext  = 'jpg';
            if ( $mime ) {
                $map = array(
                    'image/jpeg' => 'jpg', 'image/png'  => 'png', 'image/webp' => 'webp',
                    'image/gif'  => 'gif', 'image/avif' => 'avif',
                );
                if ( isset($map[$mime]) ) $ext = $map[$mime];
            }
            $name = 'ahb-resim-' . $post_id . '-' . wp_generate_password(6, false, false) . '.' . $ext;
        }

        $file_array = array( 'name' => $name, 'tmp_name' => $tmp );

        $att_id = media_handle_sideload( $file_array, $post_id );
        if ( is_wp_error($att_id) ) {
            @unlink( $tmp );
            return 0;
        }
        return (int) $att_id;
    }

    private static function origin( $url ) {
        $p = wp_parse_url($url);
        if ( ! $p || empty($p['host']) ) return '';
        $scheme = $p['scheme'] ?? 'https';
        return $scheme . '://' . $p['host'] . '/';
    }

    /**
     * Bir post'un (varsa) harici resim URL'sini dondurur, yoksa varsayilan.
     */
    public static function post_resim_url( $post_id ) {
        $u = get_post_meta( intval($post_id), self::META_KEY, true );
        return $u ?: self::varsayilan_url();
    }

    /**
     * XML/RSS iceriginden ilk anlamli resim URL'sini bul.
     * - Lazy-load attribute'larini destekler (data-src, data-lazy-src, data-original, srcset)
     * - Paylaş ikonu / emoji / 1x1 piksel / data: URI gibi cop resimleri eler
     */
    public static function icerikten_bul( $icerik ) {
        if ( empty($icerik) ) return '';

        // Tum <img ...> etiketlerini sirayla incele
        if ( preg_match_all('/<img\b[^>]*>/i', $icerik, $tags) ) {
            foreach ( $tags[0] as $tag ) {
                $url = self::img_url_cikar($tag);
                if ( $url && self::resim_kabul_edilir($url, $tag) ) {
                    return $url;
                }
            }
        }
        // Yedek: HTML olmayan dump bir metinde ham URL
        if ( preg_match_all('#https?://[^\s"\'<>]+?\.(?:jpe?g|png|webp|gif)(?:\?[^\s"\'<>]*)?#i', $icerik, $urls) ) {
            foreach ( $urls[0] as $u ) {
                if ( self::resim_kabul_edilir($u, '') ) return $u;
            }
        }
        return '';
    }

    /** Bir <img> etiketinden gercek resim URL'sini cikar (lazy attribute'lara dikkat) */
    private static function img_url_cikar( $tag ) {
        // Once lazy-load attribute'lari (gercek URL bunlarda)
        $oncelikli = array('data-src','data-lazy-src','data-original','data-orig-file','data-large-file','data-srcset');
        foreach ( $oncelikli as $a ) {
            if ( preg_match('/\b' . preg_quote($a,'/') . '\s*=\s*["\']([^"\']+)["\']/i', $tag, $m) ) {
                $u = trim($m[1]);
                if ( $a === 'data-srcset' || strpos($u, ',') !== false ) {
                    $parts = preg_split('/\s*,\s*/', $u);
                    $u = trim(preg_split('/\s+/', end($parts))[0]); // en buyuk varyant
                }
                if ( $u && stripos($u, 'data:') !== 0 ) return $u;
            }
        }
        // srcset varsa en buyuk varyanti al
        if ( preg_match('/\bsrcset\s*=\s*["\']([^"\']+)["\']/i', $tag, $m) ) {
            $parts = preg_split('/\s*,\s*/', $m[1]);
            $u = trim(preg_split('/\s+/', end($parts))[0]);
            if ( $u && stripos($u, 'data:') !== 0 ) return $u;
        }
        // Klasik src
        if ( preg_match('/\bsrc\s*=\s*["\']([^"\']+)["\']/i', $tag, $m) ) {
            $u = trim($m[1]);
            if ( $u && stripos($u, 'data:') !== 0 ) return $u;
        }
        return '';
    }

    /** Cop resim filtresi: paylas/emoji/avatar/1px vb. ele */
    private static function resim_kabul_edilir( $url, $tag = '' ) {
        if ( ! $url ) return false;
        if ( stripos($url, 'data:') === 0 ) return false;
        $u = strtolower($url);

        // Bilinen cop yollari
        $kara_liste = array(
            'gravatar.com', '/avatar', '/share', 'sharer', 'social-icon', '/icons/',
            'icon-', '-icon.', 'facebook.svg','twitter.svg','x.svg','whatsapp.svg',
            'telegram.svg','copy.svg','email.svg','wp-includes/images/smilies',
            'pixel.gif','spacer.gif','blank.gif','transparent.png','logo-',
            'wp-emoji', '/emoji/', 'gmpg.org',
        );
        foreach ($kara_liste as $kl) {
            if ( strpos($u, $kl) !== false ) return false;
        }
        // Cok kucuk boyut belirtilmis mi? (width/height < 100)
        if ( $tag ) {
            if ( preg_match('/\bwidth\s*=\s*["\']?(\d+)/i', $tag, $w) && (int)$w[1] > 0 && (int)$w[1] < 100 ) return false;
            if ( preg_match('/\bheight\s*=\s*["\']?(\d+)/i', $tag, $h) && (int)$h[1] > 0 && (int)$h[1] < 100 ) return false;
        }
        // Uzanti kontrolu (yoksa da kabul, CDN URL'leri parametreli olabiliyor)
        return true;
    }

    /**
     * Bir URL'nin og:image / twitter:image meta'sini cek
     */
    public static function og_image_cek( $url ) {
        if ( ! $url ) return '';
        $cache_key = 'ahb_og_img_' . md5($url);
        $cached = get_transient($cache_key);
        if ( $cached !== false ) return $cached;

        $ua = trim((string)get_option('ahb_user_agent',''));
        if ( ! $ua ) $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
        $resp = wp_safe_remote_get($url, array(
            'timeout'    => 12,
            'sslverify'  => false,
            'user-agent' => $ua,
            'headers'    => array('Accept' => 'text/html,*/*;q=0.5','Accept-Language'=>'tr-TR,tr;q=0.9,en;q=0.5'),
        ));
        if ( is_wp_error($resp) ) { set_transient($cache_key, '', HOUR_IN_SECONDS); return ''; }
        $html = wp_remote_retrieve_body($resp);
        if ( ! $html ) { set_transient($cache_key, '', HOUR_IN_SECONDS); return ''; }

        $img = '';
        if ( preg_match('#<meta[^>]+property=["\']og:image(?::secure_url)?["\'][^>]*content=["\']([^"\']+)["\']#i', $html, $m) ) $img = $m[1];
        if ( ! $img && preg_match('#<meta[^>]+content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']#i', $html, $m) ) $img = $m[1];
        if ( ! $img && preg_match('#<meta[^>]+name=["\']twitter:image["\'][^>]*content=["\']([^"\']+)["\']#i', $html, $m) ) $img = $m[1];
        if ( ! $img && preg_match('#<link[^>]+rel=["\']image_src["\'][^>]*href=["\']([^"\']+)["\']#i', $html, $m) ) $img = $m[1];

        // og:image bulunamazsa: <article>/<main> icindeki ilk anlamli <img>
        if ( ! $img ) {
            $govde = '';
            if ( preg_match('#<article\b[^>]*>(.*?)</article>#is', $html, $am) ) $govde = $am[1];
            if ( ! $govde && preg_match('#<main\b[^>]*>(.*?)</main>#is', $html, $am) ) $govde = $am[1];
            if ( $govde ) $img = self::icerikten_bul($govde);
        }

        if ( $img && strpos($img, '//') === 0 ) $img = 'https:' . $img;
        if ( $img && $img[0] === '/' ) {
            $p = parse_url($url);
            if ( ! empty($p['scheme']) && ! empty($p['host']) ) {
                $img = $p['scheme'] . '://' . $p['host'] . $img;
            }
        }

        // Bos sonuc icin kisa cache (5 dk) - bir sonraki run yeniden deniyebilsin
        set_transient($cache_key, $img ?: '', $img ? DAY_IN_SECONDS : 5 * MINUTE_IN_SECONDS);
        return $img;
    }

    /**
     * Bir SimplePie item'indan TUM yontemleri sirayla deneyerek resim URL'si bul.
     * Sirasiyla:
     *   1) get_thumbnail()                        (media:thumbnail)
     *   2) media:content (yahoo mrss)             url + image medium
     *   3) media:thumbnail (yahoo mrss)
     *   4) <itunes:image> (podcast/itunes ns)
     *   5) enclosure (image/*)
     *   6) <image><url>...</url></image>          (item ici image elementi)
     *   7) content:encoded icindeki ilk <img>
     *   8) description icindeki ilk <img>
     *   9) custom turk haber siteleri: <resim>, <foto>, <image_url> vb.
     */
    public static function rss_resim_bul( $item ) {
        if ( ! is_object($item) ) return '';

        // 1) Standart get_thumbnail
        if ( method_exists($item, 'get_thumbnail') ) {
            $t = $item->get_thumbnail();
            if ( $t && ! empty($t['attribs']['']['url']) ) {
                return self::url_normalize($t['attribs']['']['url']);
            }
        }

        // 2-3) MediaRSS namespace tag'lari
        if ( method_exists($item, 'get_item_tags') ) {
            $mrss = 'http://search.yahoo.com/mrss/';
            $alt_mrss = array($mrss, 'http://search.yahoo.com/mrss', 'media');

            // media:content
            foreach ( $alt_mrss as $ns ) {
                $tags = (array) $item->get_item_tags($ns, 'content');
                foreach ( $tags as $tag ) {
                    $url = $tag['attribs']['']['url'] ?? '';
                    $med = strtolower($tag['attribs']['']['medium'] ?? '');
                    $type = strtolower($tag['attribs']['']['type'] ?? '');
                    if ( $url && ( $med === 'image' || strpos($type, 'image') === 0 || preg_match('/\.(jpe?g|png|webp|gif|avif)(\?|$)/i', $url) ) ) {
                        return self::url_normalize($url);
                    }
                }
                // media:thumbnail
                $tags = (array) $item->get_item_tags($ns, 'thumbnail');
                foreach ( $tags as $tag ) {
                    $url = $tag['attribs']['']['url'] ?? '';
                    if ( $url ) return self::url_normalize($url);
                }
                // media:group icindeki content/thumbnail
                $tags = (array) $item->get_item_tags($ns, 'group');
                foreach ( $tags as $tag ) {
                    if ( ! empty($tag['child'][$ns]['content']) ) {
                        foreach ( $tag['child'][$ns]['content'] as $c ) {
                            $url = $c['attribs']['']['url'] ?? '';
                            if ( $url ) return self::url_normalize($url);
                        }
                    }
                    if ( ! empty($tag['child'][$ns]['thumbnail']) ) {
                        foreach ( $tag['child'][$ns]['thumbnail'] as $c ) {
                            $url = $c['attribs']['']['url'] ?? '';
                            if ( $url ) return self::url_normalize($url);
                        }
                    }
                }
            }

            // 4) itunes:image
            $itunes = 'http://www.itunes.com/dtds/podcast-1.0.dtd';
            $tags = (array) $item->get_item_tags($itunes, 'image');
            foreach ( $tags as $tag ) {
                $url = $tag['attribs']['']['href'] ?? ($tag['data'] ?? '');
                if ( $url ) return self::url_normalize($url);
            }

            // 6) <image><url>...</url></image> (RSS 2.0 item ici)
            $tags = (array) $item->get_item_tags('', 'image');
            foreach ( $tags as $tag ) {
                if ( ! empty($tag['child']['']['url'][0]['data']) ) {
                    return self::url_normalize($tag['child']['']['url'][0]['data']);
                }
                if ( ! empty($tag['data']) && filter_var(trim($tag['data']), FILTER_VALIDATE_URL) ) {
                    return self::url_normalize(trim($tag['data']));
                }
            }

            // 9) Yaygin Turkce custom alanlar
            foreach ( array('resim','foto','fotograf','image_url','imageurl','haber_resmi','haber_resim','picture') as $ozel ) {
                $tags = (array) $item->get_item_tags('', $ozel);
                foreach ( $tags as $tag ) {
                    $url = trim((string)($tag['data'] ?? ''));
                    if ( $url && filter_var($url, FILTER_VALIDATE_URL) ) {
                        return self::url_normalize($url);
                    }
                }
            }
        }

        // 5) Enclosure
        if ( method_exists($item, 'get_enclosures') ) {
            $enc = $item->get_enclosures();
            if ( $enc ) {
                foreach ( $enc as $e ) {
                    $type = strtolower($e->get_type() ?? '');
                    $link = $e->get_link() ?? '';
                    if ( $link && ( strpos($type,'image') !== false || preg_match('/\.(jpe?g|png|webp|gif|avif)(\?|$)/i', $link) ) ) {
                        return self::url_normalize($link);
                    }
                }
            }
        }

        // 7-8) Icerikteki ilk <img>
        $kandidatlar = array();
        if ( method_exists($item, 'get_content') )     $kandidatlar[] = $item->get_content();
        if ( method_exists($item, 'get_description') ) $kandidatlar[] = $item->get_description();
        foreach ( $kandidatlar as $hs ) {
            if ( ! $hs ) continue;
            $u = self::icerikten_bul($hs);
            if ( $u ) return self::url_normalize($u);
        }

        return '';
    }

    /** URL normalize: protokolsuz // veya / ile baslayanlari duzelt */
    private static function url_normalize( $url ) {
        $url = trim((string) $url);
        if ( $url === '' ) return '';
        if ( strpos($url, '//') === 0 ) return 'https:' . $url;
        return $url;
    }

    /**
     * RSS enclosure etiketinden resim URL'sini al
     */
    public static function enclosure_bul( $item ) {
        if ( method_exists($item, 'get_enclosures') ) {
            $enclosures = $item->get_enclosures();
            if ( ! empty($enclosures) ) {
                foreach ( $enclosures as $enc ) {
                    $type = $enc->get_type() ?? '';
                    if ( strpos($type, 'image') !== false ) {
                        return $enc->get_link();
                    }
                }
                return $enclosures[0]->get_link() ?? '';
            }
        }
        return '';
    }

    /* ============================================================
     * RENDER FILTRELERI
     * Tema "the_post_thumbnail()" / "get_the_post_thumbnail_url()"
     * cagrilarini bizim harici URL'mize yonlendirir.
     * ============================================================ */

    public static function filtreleri_kur() {
        add_filter('post_thumbnail_html',           array(__CLASS__, 'f_post_thumbnail_html'), 10, 5);
        add_filter('get_post_metadata',             array(__CLASS__, 'f_thumbnail_id'),        10, 4);
        add_filter('wp_get_attachment_image_src',   array(__CLASS__, 'f_attachment_src'),      10, 4);
        add_filter('has_post_thumbnail',            array(__CLASS__, 'f_has_thumbnail'),       10, 3);
    }

    /**
     * Eger post'un featured image'i yoksa veya post_thumbnail_html bos ise,
     * harici URL'den img tag uret.
     */
    public static function f_post_thumbnail_html( $html, $post_id, $post_thumbnail_id, $size, $attr ) {
        if ( ! empty($html) ) return $html;
        $url = get_post_meta( $post_id, self::META_KEY, true );
        if ( empty($url) ) {
            // Sadece ahb post'larina varsayilan ekle (kampanya meta varsa)
            if ( ! get_post_meta($post_id, '_ahb_kampanya_id', true) ) return $html;
            $url = self::varsayilan_url();
        }
        $alt = esc_attr( get_the_title($post_id) );
        return '<img src="'. esc_url($url) .'" alt="'. $alt .'" class="ahb-harici-resim attachment-'. esc_attr($size) .' wp-post-image" loading="lazy" />';
    }

    /**
     * has_post_thumbnail() -> true dondur (harici URL varsa veya ahb posti ise).
     */
    public static function f_has_thumbnail( $has_thumbnail, $post, $thumbnail_id ) {
        if ( $has_thumbnail ) return $has_thumbnail;
        $pid = $post ? ( is_object($post) ? $post->ID : (int) $post ) : 0;
        if ( ! $pid ) return $has_thumbnail;
        if ( get_post_meta($pid, self::META_KEY, true) ) return true;
        if ( get_post_meta($pid, '_ahb_kampanya_id', true) ) return true; // varsayilan da olsa
        return $has_thumbnail;
    }

    /**
     * _thumbnail_id meta'sinin alinmasi sirasinda, post'un harici resmi varsa
     * bos ise sahte bir id dondurmeyiz; bunun yerine _thumbnail_id sorgusunda
     * mevcut degeri koruruz. Bu filtreyi yalnizca diger filtreler icin gereken
     * sahte attachment src icin kullaniriz.
     */
    public static function f_thumbnail_id( $value, $object_id, $meta_key, $single ) {
        if ( $meta_key !== '_thumbnail_id' ) return $value;
        if ( $value !== null ) return $value; // baska bir filtre veya db degeri var
        // db degeri yoksa cekirdek sorgular; biz dokunmuyoruz
        return $value;
    }

    /**
     * wp_get_attachment_image_src filtresi: bizim sahte ID'lerimiz icin URL'yi cevir.
     */
    public static function f_attachment_src( $image, $attachment_id, $size, $icon ) {
        // Yalnizca AHB'nin acikca cagirdigi sahte ID'lerde devreye girmesin.
        return $image;
    }
}

/* ── Filtreleri kur ─────────────────────────────────────── */
add_action('init', array('AHBRSS_Resim', 'filtreleri_kur'), 5);
