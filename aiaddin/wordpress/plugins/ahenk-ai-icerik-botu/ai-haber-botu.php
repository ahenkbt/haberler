<?php
/**
 * Plugin Name: Ahenk Ai İçerik Robotu
 * Plugin URI:  https://ahenk.net.tr/airobot
 * Description: RSS, Google News, HTML kazıma ve YouTube/Dailymotion kaynaklarından otomatik içerik üreten kapsamlı AI içerik editörü. AI Site Kurucu (tek tıkla premium site), haber özgünleştirme, sıcak gelişme takibi, ilgili haber bağlantıları, AI köşe yazarları, RSS Direkt (AI'sız) modu ve Video TV modülünü içerir.
 * Version:     3.11.5
 * Author:      Nail Türkoğlu
 * Author URI:  https://ahenk.net.tr/airobot
 * License:     GPL v2 or later
 * Text Domain: ahenk-ai-icerik-botu
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// ÖNEMLİ: Eski "AI Haber Botu" sürümü hâlâ kuruluysa AHB_* sabitleri zaten
// tanımlı olabilir. Yanlış path'e çözümlenmesini önlemek için kendi yolumuzu
// her zaman __DIR__'dan türetiyoruz; sabitleri sadece tanımlı değilse koyuyoruz.
if ( ! defined( 'AHB_VERSION' ) )    define( 'AHB_VERSION', '3.11.5' );
if ( ! defined( 'AHB_PLUGIN_DIR' ) ) define( 'AHB_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
if ( ! defined( 'AHB_PLUGIN_URL' ) ) define( 'AHB_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * Sunucu sistem saati bazı hosting'lerde NTP senkron olmadığı için yanlış olabilir
 * (örn. 3 ay ileride). Internet üzerinden gerçek UTC zamanını çekip 1 saat cache'leriz.
 */
if ( ! function_exists( 'ahb_get_real_gmt_timestamp' ) ) {
    function ahb_get_real_gmt_timestamp() {
        $cache = get_transient( 'ahb_real_time_offset' );
        if ( $cache !== false && is_array( $cache ) && isset( $cache['offset'] ) ) {
            return time() + (int) $cache['offset'];
        }
        $sources = array(
            'https://www.google.com',
            'https://www.cloudflare.com',
            'https://api.openai.com',
        );
        $real_ts = 0;
        foreach ( $sources as $url ) {
            $r = wp_remote_head( $url, array( 'timeout' => 5, 'sslverify' => false, 'redirection' => 0 ) );
            if ( is_wp_error( $r ) ) continue;
            $date_h = wp_remote_retrieve_header( $r, 'date' );
            if ( ! $date_h ) continue;
            $ts = strtotime( $date_h );
            if ( $ts && $ts > 1700000000 ) { $real_ts = $ts; break; }
        }
        if ( ! $real_ts ) {
            $real_ts = time(); // fallback
        }
        $offset = $real_ts - time();
        set_transient( 'ahb_real_time_offset', array( 'offset' => $offset, 'set_at' => time() ), HOUR_IN_SECONDS );
        return $real_ts;
    }
}

if ( ! function_exists( 'ahb_real_mysql_now' ) ) {
    function ahb_real_mysql_now( $type = 'local' ) {
        $gmt = ahb_get_real_gmt_timestamp();
        if ( $type === 'gmt' ) return gmdate( 'Y-m-d H:i:s', $gmt );
        $tz_off = (int) ( get_option( 'gmt_offset', 0 ) * HOUR_IN_SECONDS );
        return gmdate( 'Y-m-d H:i:s', $gmt + $tz_off );
    }
}

// Bu dosyanın gerçek dizini (sabitlerden bağımsız, çakışma-güvenli)
$ahenk_dir = __DIR__ . '/';

require_once $ahenk_dir . 'includes/class-openai-client.php';
require_once $ahenk_dir . 'includes/class-rss-fetcher.php';
require_once $ahenk_dir . 'includes/class-google-news-fetcher.php';
require_once $ahenk_dir . 'includes/class-html-scraper.php';
require_once $ahenk_dir . 'includes/class-image-search.php';
require_once $ahenk_dir . 'includes/class-virus-scanner.php';
require_once $ahenk_dir . 'includes/class-news-processor.php';
require_once $ahenk_dir . 'includes/class-related-news.php';
require_once $ahenk_dir . 'includes/class-duplicate-checker.php';
require_once $ahenk_dir . 'includes/class-hot-update.php';
require_once $ahenk_dir . 'includes/class-site-cleanup.php';
require_once $ahenk_dir . 'includes/class-columnists.php';
require_once $ahenk_dir . 'includes/class-import-export.php';
require_once $ahenk_dir . 'includes/class-yazar-sira.php';
require_once $ahenk_dir . 'includes/class-ai-tek-uret.php';
require_once $ahenk_dir . 'includes/class-podcast-uret.php';
require_once $ahenk_dir . 'includes/class-video-uret.php';
require_once $ahenk_dir . 'includes/class-license.php';
require_once $ahenk_dir . 'includes/class-tanitim.php';
require_once $ahenk_dir . 'includes/class-site-builder.php';
require_once $ahenk_dir . 'includes/class-help.php';
require_once $ahenk_dir . 'admin/class-admin-page.php';

// Site Builder + Yardım init (Ahenk_License kendini class-license.php sonunda init eder)
if ( class_exists( 'Ahenk_Site_Builder' ) ) Ahenk_Site_Builder::init();
if ( class_exists( 'Ahenk_Help' ) )         Ahenk_Help::init();

// 5. Sekme: RSS Direkt (AI olmadan, gömülü Ahenk Haber Botu modülü)
// v3.11.5: Default AÇIK. Kullanıcı lisans panelindeki "Modüller" kartından kapatabilir.
if ( (int) get_option( 'ahenk_rss_enabled', 1 ) === 1 ) {
    require_once $ahenk_dir . 'rss-direct/loader.php';
}

// 6. Sekme: Video TV — YouTube / Dailymotion / Canlı TV (gömülü Video TV modülü)
require_once $ahenk_dir . 'video-tv/loader.php';

// 7. Sekme: Haber Blokları — Manşet / Hikaye / Kategori Tab (gömülü Ahenk Blokları modülü)
require_once $ahenk_dir . 'bloklar/loader.php';

class AI_Haber_Botu {

    private static $instance = null;

    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action( 'plugins_loaded', array( $this, 'init' ) );
        register_activation_hook( __FILE__, array( $this, 'activate' ) );
        register_deactivation_hook( __FILE__, array( $this, 'deactivate' ) );
    }

    public function init() {
        // v3.10.10 yükseltme: varsayılan yayın durumunu "yayında"ya geçir
        $upgraded = get_option( 'ahb_status_default_upgraded' );
        if ( $upgraded !== 'yes' ) {
            update_option( 'ahb_post_status', 'publish' );
            update_option( 'ahb_status_default_upgraded', 'yes' );
        }

        $admin = new AHB_Admin_Page();
        $admin->init();

        // Import / Export aracı (Yazarlar, Makaleler, Haberler + Diger Siteden Cek)
        AHB_Import_Export::init();

        // Dış URL'li öne çıkan görsel filtreleri (linkle eklenen resimler için)
        $this->register_external_image_filters();

        add_action( 'ahb_fetch_and_publish', array( $this, 'run_news_cycle' ) );
        add_action( 'ahb_columnists_tick', array( $this, 'run_columnists_tick' ) );
        add_action( 'save_post', array( $this, 'add_related_news_on_save' ), 20, 3 );

        // Bot meta'lı post çöpe atılınca / silinince → kalıcı duplicate kaydı bırak.
        // Aksi halde kullanıcı çöpe atsa bile bot bir sonraki çalışmasında tekrar üretiyor.
        add_action( 'wp_trash_post', array( $this, 'on_post_removed' ), 10, 1 );
        add_action( 'before_delete_post', array( $this, 'on_post_removed' ), 10, 1 );

        if ( ! wp_next_scheduled( 'ahb_fetch_and_publish' ) ) {
            $interval = get_option( 'ahb_schedule_interval', 'hourly' );
            wp_schedule_event( time(), $interval, 'ahb_fetch_and_publish' );
        }
        if ( ! wp_next_scheduled( 'ahb_columnists_tick' ) ) {
            wp_schedule_event( time(), 'hourly', 'ahb_columnists_tick' );
        }
    }

    /**
     * Bir post silindiğinde / çöpe atıldığında: bu bot tarafından eklenmişse
     * hash kayıtlarını kalıcı tutar ki bot aynı kaynağı tekrar tekrar üretmesin.
     */
    public function on_post_removed( $post_id ) {
        $post_id = (int) $post_id;
        if ( ! $post_id ) return;
        $post = get_post( $post_id );
        if ( ! $post ) return;

        // Sistem post'larını atla — sadece içerik tipindeki post'ları kara listele.
        $skip_types = array( 'attachment','revision','nav_menu_item','customize_changeset','oembed_cache','user_request','wp_block','wp_template','wp_template_part','wp_global_styles','wp_navigation' );
        if ( in_array( $post->post_type, $skip_types, true ) ) return;

        $title = trim( (string) $post->post_title );
        if ( $title === '' ) return; // Başlıksız post'u atla

        // Kaynak link varsa kullan, yoksa başlık tabanlı hash kaydet.
        // Bu sayede meta'sı olmayan kopyalar da kara listeye girer ve cron tekrar üretmez.
        $kaynak_link = (string) get_post_meta( $post_id, '_ahb_kaynak_link', true );
        if ( $kaynak_link === '' ) {
            $kaynak_link = (string) get_post_meta( $post_id, '_ahb_source_url', true );
        }
        $kampanya_id = (int) get_post_meta( $post_id, '_ahb_kampanya_id', true );

        // 1) RSS Direkt tablosuna kalıcı kayıt
        if ( class_exists( 'AHBRSS_Veritabani' ) ) {
            AHBRSS_Veritabani::link_kaydet(
                $kampanya_id,
                $kaynak_link ?: $title,
                $title,
                $post_id,
                $post->post_content
            );
        }

        // 2) AI Haber Botu duplicate-checker tablosuna kalıcı kayıt
        if ( class_exists( 'AHB_Duplicate_Checker' ) && $kaynak_link !== '' ) {
            $checker = new AHB_Duplicate_Checker();
            $checker->mark_as_processed( $kaynak_link, $kaynak_link, $post_id );
        }

        error_log( '[AI Haber Botu] Silindi/Çöp → kalıcı işaret: #' . $post_id . ' "' . $title . '"' );
    }

    /**
     * Dış URL'li öne çıkan görseller için filtreler.
     * _ahb_external_url meta'sına sahip attachment'lar tüm WP API'lerinde
     * dış linki döndürür — theme'lerin kod değişikliği gerektirmez.
     */
    private function register_external_image_filters() {
        // Attachment URL → dış URL
        add_filter( 'wp_get_attachment_url', function( $url, $attachment_id ) {
            $ext = get_post_meta( $attachment_id, '_ahb_external_url', true );
            return $ext ? $ext : $url;
        }, 10, 2 );

        // Attachment image src → [url, width, height, is_intermediate]
        add_filter( 'wp_get_attachment_image_src', function( $image, $attachment_id, $size ) {
            $ext = get_post_meta( $attachment_id, '_ahb_external_url', true );
            if ( ! $ext ) return $image;
            // Çoğu tema için yeterli — boyutu bilmediğimizden 1200x630 verir
            return array( $ext, 1200, 630, false );
        }, 10, 3 );

        // srcset üretimini iptal et (dış kaynak için tek URL veriyoruz)
        add_filter( 'wp_calculate_image_srcset', function( $sources, $size_array, $image_src, $image_meta, $attachment_id ) {
            $ext = get_post_meta( $attachment_id, '_ahb_external_url', true );
            return $ext ? array() : $sources;
        }, 10, 5 );

        // Image downsize: get_attached_file kullanılınca da dış URL'yi döndür
        add_filter( 'image_downsize', function( $downsize, $attachment_id, $size ) {
            $ext = get_post_meta( $attachment_id, '_ahb_external_url', true );
            if ( ! $ext ) return $downsize;
            return array( $ext, 1200, 630, false );
        }, 10, 3 );

        // get_attached_file → boş döner ki "yerel dosya yok" davranışı doğru olsun
        add_filter( 'get_attached_file', function( $file, $attachment_id ) {
            $ext = get_post_meta( $attachment_id, '_ahb_external_url', true );
            return $ext ? '' : $file;
        }, 10, 2 );
    }

    public function run_columnists_tick() {
        $api = get_option( 'ahb_openai_api_key', '' );
        if ( ! $api ) return;
        $openai = new AHB_OpenAI_Client( $api );
        $cols   = new AHB_Columnists( $openai );
        $cols->daily_cron_tick();
    }

    public function activate() {
        $this->create_tables();
        if ( function_exists( 'ahenk_vtv_activate' ) ) {
            ahenk_vtv_activate();
        }
        if ( ! wp_next_scheduled( 'ahb_fetch_and_publish' ) ) {
            $interval = get_option( 'ahb_schedule_interval', 'hourly' );
            wp_schedule_event( time(), $interval, 'ahb_fetch_and_publish' );
        }
        // RSS Direkt modülünün tablolarını oluştur
        if ( function_exists( 'ahbrss_aktivasyon' ) ) ahbrss_aktivasyon();
    }

    public function deactivate() {
        $timestamp = wp_next_scheduled( 'ahb_fetch_and_publish' );
        if ( $timestamp ) {
            wp_unschedule_event( $timestamp, 'ahb_fetch_and_publish' );
        }
    }

    private function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();
        $table_name = $wpdb->prefix . 'ahb_processed_news';

        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            source_url varchar(500) NOT NULL,
            source_hash varchar(64) NOT NULL,
            wp_post_id bigint(20) DEFAULT NULL,
            topic_slug varchar(255) DEFAULT NULL,
            processed_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY source_hash (source_hash),
            KEY topic_slug (topic_slug)
        ) $charset_collate;";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta( $sql );
    }

    /**
     * @param bool $is_manual  Manuel "Şimdi Çalıştır" mı yoksa cron mu?
     * @return array  [ 'created' => int, 'skipped' => int, 'errors' => int ]
     */
    public function run_news_cycle( $is_manual = false ) {
        $stats = array( 'created' => 0, 'skipped' => 0, 'errors' => 0 );

        $api_key = get_option( 'ahb_openai_api_key', '' );
        if ( empty( $api_key ) ) {
            error_log( '[AI Haber Botu] OpenAI API anahtarı ayarlanmamış.' );
            return $stats;
        }

        // OTOMATİK ÇALIŞMA (cron): Konu Planı varsa öncelik onun, sonra normal RSS
        if ( ! $is_manual ) {
            if ( get_option( 'ahb_topic_plan', '' ) ) {
                $tstats = $this->run_topic_plan_cycle( false );
                $stats['created'] += $tstats['created'];
                $stats['skipped'] += $tstats['skipped'];
                $stats['errors']  += $tstats['errors'];
            }
        }

        $rss_sources = get_option( 'ahb_rss_sources', '' );
        if ( empty( $rss_sources ) ) {
            // RSS yoksa erken çık (Konu Planı zaten çalıştıysa stats dolu olur)
            return $stats;
        }

        // Manuel çalıştırmada PHP zamanaşımını uzat
        if ( $is_manual ) {
            @set_time_limit( 600 );
            @ini_set( 'memory_limit', '512M' );
        }

        $manual_target = (int) get_option( 'ahb_manual_target_count', 10 );
        if ( $manual_target < 1 ) $manual_target = 10;

        $lines = array_filter( array_map( 'trim', explode( "\n", $rss_sources ) ) );

        $openai  = new AHB_OpenAI_Client( $api_key );
        $fetcher = new AHB_RSS_Fetcher();
        $checker = new AHB_Duplicate_Checker();
        $hot     = new AHB_Hot_Update( $openai );
        $proc    = new AHB_News_Processor( $openai, $checker, $hot );

        foreach ( $lines as $line ) {
            // Manuel modda hedef yeni haber sayısına ulaştıysak dur
            if ( $is_manual && $stats['created'] >= $manual_target ) break;

            $parsed = AHB_RSS_Fetcher::parse_source_line( $line );
            if ( ! $parsed || empty( $parsed['url'] ) ) continue;

            $proc->set_forced_category( $parsed['category'] );

            $items = $fetcher->fetch( $parsed['url'] );
            foreach ( $items as $item ) {
                if ( $is_manual && $stats['created'] >= $manual_target ) break;

                $result = $proc->process( $item );

                if ( $result === 'created' )      $stats['created']++;
                elseif ( $result === 'updated' )  $stats['created']++;
                elseif ( $result === 'skipped' )  $stats['skipped']++;
                else                              $stats['errors']++;

                // Manuel modda bekleme yok; cron'da kibarlık için kısa bekleme
                if ( ! $is_manual ) usleep( 500000 );
            }
        }

        set_transient( 'ahb_last_run_stats', $stats, HOUR_IN_SECONDS );
        return $stats;
    }

    /**
     * Konu Planı'na göre Google News'ten kategori bazlı haber çeker.
     * Her satır: kategori_slug | arama_kelimesi | adet
     *
     * @return array  ['created'=>n,'skipped'=>n,'errors'=>n,'per_category'=>[slug=>n]]
     */
    public function run_topic_plan_cycle( $is_manual = false ) {
        $stats = array( 'created' => 0, 'skipped' => 0, 'errors' => 0, 'per_category' => array() );

        $api_key = get_option( 'ahb_openai_api_key', '' );
        if ( empty( $api_key ) ) {
            error_log( '[AI Haber Botu] OpenAI API anahtarı yok.' );
            return $stats;
        }

        $plan_raw = get_option( 'ahb_topic_plan', '' );
        if ( empty( $plan_raw ) ) {
            error_log( '[AI Haber Botu] Konu planı boş.' );
            return $stats;
        }

        if ( $is_manual ) {
            @set_time_limit( 1200 );
            @ini_set( 'memory_limit', '512M' );
        }

        $openai     = new AHB_OpenAI_Client( $api_key );
        $checker    = new AHB_Duplicate_Checker();
        $hot        = new AHB_Hot_Update( $openai );
        $proc       = new AHB_News_Processor( $openai, $checker, $hot );
        $gnews      = new AHB_Google_News_Fetcher();
        $rss        = new AHB_RSS_Fetcher();
        $scraper    = new AHB_Html_Scraper();

        $cat_rss_map  = $this->parse_category_rss_map();
        $cat_html_map = $this->parse_category_html_map();

        $lines = array_filter( array_map( 'trim', explode( "\n", $plan_raw ) ) );

        foreach ( $lines as $line ) {
            if ( $line === '' || $line[0] === '#' ) continue;

            $parts = array_map( 'trim', explode( '|', $line ) );
            if ( count( $parts ) < 3 ) continue;

            $cat_label = $parts[0];                 // Kullanıcının yazdığı orijinal: "Gündem"
            $cat_slug  = sanitize_title( $cat_label ); // URL-uyumlu: "gundem"
            $query     = $parts[1];
            $target    = max( 1, (int) $parts[2] );

            $stats['per_category'][ $cat_slug ] = 0;

            $proc->set_forced_category( $cat_slug, $cat_label );

            // 1) ÖNCE Google News'ten dene
            $items = $gnews->fetch( $query, $target * 3 );

            foreach ( $items as $item ) {
                if ( $stats['per_category'][ $cat_slug ] >= $target ) break;

                $result = $proc->process( $item );

                if ( $result === 'created' || $result === 'updated' ) {
                    $stats['created']++;
                    $stats['per_category'][ $cat_slug ]++;
                } elseif ( $result === 'skipped' ) {
                    $stats['skipped']++;
                } else {
                    $stats['errors']++;
                }

                if ( ! $is_manual ) usleep( 300000 );
            }

            // 2) Hedefe ulaşılmadıysa kategoriye atanmış RSS kaynaklarına geç
            if ( $stats['per_category'][ $cat_slug ] < $target && ! empty( $cat_rss_map[ $cat_slug ] ) ) {
                foreach ( $cat_rss_map[ $cat_slug ] as $rss_url ) {
                    if ( $stats['per_category'][ $cat_slug ] >= $target ) break;

                    $rss_items = $rss->fetch( $rss_url );
                    foreach ( $rss_items as $item ) {
                        if ( $stats['per_category'][ $cat_slug ] >= $target ) break;

                        $result = $proc->process( $item );

                        if ( $result === 'created' || $result === 'updated' ) {
                            $stats['created']++;
                            $stats['per_category'][ $cat_slug ]++;
                        } elseif ( $result === 'skipped' ) {
                            $stats['skipped']++;
                        } else {
                            $stats['errors']++;
                        }

                        if ( ! $is_manual ) usleep( 300000 );
                    }
                }
            }

            // 3) Hâlâ hedef tutturulmadıysa HTML kazıma kaynaklarına geç
            if ( $stats['per_category'][ $cat_slug ] < $target && ! empty( $cat_html_map[ $cat_slug ] ) ) {
                foreach ( $cat_html_map[ $cat_slug ] as $page_url ) {
                    if ( $stats['per_category'][ $cat_slug ] >= $target ) break;

                    $remaining = $target - $stats['per_category'][ $cat_slug ];
                    $items = $scraper->fetch( $page_url, max( 5, $remaining * 2 ) );
                    foreach ( $items as $item ) {
                        if ( $stats['per_category'][ $cat_slug ] >= $target ) break;

                        $result = $proc->process( $item );

                        if ( $result === 'created' || $result === 'updated' ) {
                            $stats['created']++;
                            $stats['per_category'][ $cat_slug ]++;
                        } elseif ( $result === 'skipped' ) {
                            $stats['skipped']++;
                        } else {
                            $stats['errors']++;
                        }

                        if ( ! $is_manual ) usleep( 300000 );
                    }
                }
            }
        }

        set_transient( 'ahb_last_topic_stats', $stats, HOUR_IN_SECONDS );
        return $stats;
    }

    /**
     * "ahb_category_rss" textarea'sını ['kategori_slug' => ['url1', 'url2'], ...] yapısına çevirir.
     */
    /**
     * "ahb_category_html" textarea'sını ['kategori_slug' => ['url1', 'url2'], ...] yapısına çevirir.
     * Format: kategori_slug | https://site.com/kategori-listesi
     */
    private function parse_category_html_map() {
        $raw = get_option( 'ahb_category_html', '' );
        if ( empty( $raw ) ) return array();

        $map = array();
        $lines = array_filter( array_map( 'trim', explode( "\n", $raw ) ) );

        foreach ( $lines as $line ) {
            if ( $line === '' || $line[0] === '#' ) continue;
            $parts = array_map( 'trim', explode( '|', $line, 2 ) );
            if ( count( $parts ) < 2 ) continue;

            $slug = sanitize_title( $parts[0] );
            $url  = esc_url_raw( $parts[1] );
            if ( ! $slug || ! $url ) continue;

            if ( ! isset( $map[ $slug ] ) ) $map[ $slug ] = array();
            $map[ $slug ][] = $url;
        }

        return $map;
    }

    private function parse_category_rss_map() {
        $raw = get_option( 'ahb_category_rss', '' );
        if ( empty( $raw ) ) return array();

        $map = array();
        $lines = array_filter( array_map( 'trim', explode( "\n", $raw ) ) );

        foreach ( $lines as $line ) {
            if ( $line === '' || $line[0] === '#' ) continue;
            $parts = array_map( 'trim', explode( '|', $line, 2 ) );
            if ( count( $parts ) < 2 ) continue;

            $slug = sanitize_title( $parts[0] );
            $url  = esc_url_raw( $parts[1] );
            if ( ! $slug || ! $url ) continue;

            if ( ! isset( $map[ $slug ] ) ) $map[ $slug ] = array();
            $map[ $slug ][] = $url;
        }

        return $map;
    }

    public function add_related_news_on_save( $post_id, $post, $update ) {
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
        if ( wp_is_post_revision( $post_id ) ) return;
        $allowed_pt = sanitize_key( get_option( 'ahb_post_type', 'haber' ) );
        if ( $post->post_type !== $allowed_pt ) return;
        if ( ! get_option( 'ahb_enable_related', 1 ) ) return;

        if ( get_post_meta( $post_id, '_ahb_related_added', true ) && ! $update ) return;

        $related = new AHB_Related_News();
        $related->attach( $post_id );

        update_post_meta( $post_id, '_ahb_related_added', 1 );
    }
}

$GLOBALS['ahb_plugin_instance'] = AI_Haber_Botu::get_instance();
