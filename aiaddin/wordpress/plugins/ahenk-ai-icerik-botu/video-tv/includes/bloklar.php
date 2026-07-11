<?php
/**
 * Video TV — Anasayfa Blokları
 * 
 * Video TV'deki videoları anasayfada (veya herhangi bir sayfada) göstermek için
 * shortcode paketi. Ahenk Bloklar eklentisinin CSS sınıflarını kullanır;
 * o eklenti kuruluysa stiller otomatik uyar, değilse kendi minimal stili devreye girer.
 *
 * Shortcodes:
 *   [ahenk_video_hikayeler sayi="12" baslik="Videolar"]
 *   [ahenk_video_manset sayi="5" kucuk="4"]
 *   [ahenk_video_grid sayi="8" sutun="4"]
 *
 * Tüm linkler "Video TV Sayfası" ayarındaki sayfaya `?video=<id>` parametresiyle gider.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! class_exists( 'VTV_Bloklar' ) ) {
class VTV_Bloklar {

    public static function init() {
        add_shortcode( 'ahenk_video_hikayeler', array( __CLASS__, 'sc_hikayeler' ) );
        add_shortcode( 'ahenk_video_manset',    array( __CLASS__, 'sc_manset' ) );
        add_shortcode( 'ahenk_video_grid',      array( __CLASS__, 'sc_grid' ) );
        add_action( 'wp_enqueue_scripts', array( __CLASS__, 'register_assets' ) );
    }

    public static function register_assets() {
        // Ahenk Bloklar yoksa kendi minimal stilini kullan
        wp_register_style( 'vtv-bloklar', VTV_URL . 'assets/css/bloklar.css', array(), VTV_VER );
    }

    /** Video TV sayfasının URL'sini bulur (ayarlardan, yoksa anasayfa). */
    public static function video_page_url() {
        $pid = (int) get_option( 'ahb_vtv_page_id', 0 );
        if ( $pid && get_post_status( $pid ) === 'publish' ) {
            return get_permalink( $pid );
        }
        // Tek video URL'si bilinmiyorsa, en azından çalışan bir link ver
        return home_url( '/' );
    }

    public static function video_url( $video_id, $platform = 'youtube' ) {
        $base = self::video_page_url();
        $sep  = ( strpos( $base, '?' ) === false ) ? '?' : '&';
        return esc_url( $base . $sep . 'video=' . urlencode( $video_id ) . '&platform=' . urlencode( $platform ) );
    }

    /** Thumbnail URL: DB'deki kayıttan veya YouTube fallback'inden. */
    public static function thumb( $row, $kalite = 'medium' ) {
        if ( ! empty( $row->thumbnail ) ) return esc_url( $row->thumbnail );
        if ( ! empty( $row->video_id ) && $row->platform === 'youtube' ) {
            $q = ( $kalite === 'large' ) ? 'maxresdefault' : 'mqdefault';
            return 'https://i.ytimg.com/vi/' . $row->video_id . '/' . $q . '.jpg';
        }
        return '';
    }

    /** Video listesi getir. */
    public static function get_videos( $args = array() ) {
        global $wpdb;
        // vtv_videolar tablosunda manset/hikaye kolonları var mı garanti et
        if ( class_exists( 'VTV_DB' ) && method_exists( 'VTV_DB', 'ensure_video_flag_columns' ) ) {
            VTV_DB::ensure_video_flag_columns();
        }
        $a = wp_parse_args( $args, array(
            'sayi'         => 12,
            'kategori_id'  => 0,
            'kaynak_id'    => 0,
            'one_cikan'    => null,
            'manset'       => null,
            'hikaye'       => null,
            'orderby'      => 'created_at',
            'order'        => 'DESC',
        ) );
        $where = "v.aktif=1";
        if ( $a['kategori_id'] ) $where .= $wpdb->prepare( " AND v.kategori_id=%d", (int) $a['kategori_id'] );
        if ( $a['kaynak_id'] )   $where .= $wpdb->prepare( " AND v.kaynak_id=%d", (int) $a['kaynak_id'] );
        if ( $a['one_cikan'] !== null ) $where .= $wpdb->prepare( " AND v.one_cikan=%d", (int) $a['one_cikan'] );
        if ( $a['manset'] !== null )    $where .= $wpdb->prepare( " AND v.manset=%d", (int) $a['manset'] );
        if ( $a['hikaye'] !== null )    $where .= $wpdb->prepare( " AND v.hikaye=%d", (int) $a['hikaye'] );
        $orderby = in_array( $a['orderby'], array( 'created_at','sira','id' ), true ) ? $a['orderby'] : 'created_at';
        $order   = strtoupper( $a['order'] ) === 'ASC' ? 'ASC' : 'DESC';
        $limit   = max( 1, (int) $a['sayi'] );

        $sql = "SELECT v.*, k.isim as kategori_adi
                FROM {$wpdb->prefix}vtv_videolar v
                LEFT JOIN {$wpdb->prefix}vtv_kategoriler k ON k.id = v.kategori_id
                WHERE $where
                ORDER BY v.sira ASC, v.$orderby $order
                LIMIT $limit";
        return $wpdb->get_results( $sql );
    }

    /* ============================================================
     *  1) HİKAYE BALONCUKLARI — [ahenk_video_hikayeler]
     * ============================================================ */
    public static function sc_hikayeler( $atts ) {
        $a = shortcode_atts( array(
            'sayi'         => 15,
            'baslik'       => '🎬 Son Videolar',
            'kategori_id'  => 0,
            'kaynak_id'    => 0,
            'one_cikan'    => '',
            'hikaye'       => 'auto', // auto = işaretli varsa onları, yoksa son videolar
        ), $atts, 'ahenk_video_hikayeler' );

        wp_enqueue_style( 'vtv-bloklar' );
        $base = array(
            'sayi'        => intval( $a['sayi'] ),
            'kategori_id' => intval( $a['kategori_id'] ),
            'kaynak_id'   => intval( $a['kaynak_id'] ),
            'one_cikan'   => ( $a['one_cikan'] === '' ) ? null : (int) $a['one_cikan'],
        );
        $videos = array();
        // Önce: hikaye=1 işaretliler
        if ( $a['hikaye'] === 'auto' || (string)$a['hikaye'] === '1' ) {
            $videos = self::get_videos( array_merge( $base, array( 'hikaye' => 1 ) ) );
        }
        // Yoksa fallback: tüm aktif videolar (sadece auto modda)
        if ( empty( $videos ) && $a['hikaye'] === 'auto' ) {
            $videos = self::get_videos( $base );
        } elseif ( empty( $videos ) && (string)$a['hikaye'] === '0' ) {
            $videos = self::get_videos( array_merge( $base, array( 'hikaye' => 0 ) ) );
        }
        if ( empty( $videos ) ) return '';

        ob_start(); ?>
        <div class="ahk-hikaye-wrap vtv-bloklar-hikaye">
            <?php if ( $a['baslik'] ) : ?><div class="ahk-hikaye-baslik"><?php echo esc_html( $a['baslik'] ); ?></div><?php endif; ?>
            <button class="ahk-hk-nav ahk-hk-prev" aria-label="Önceki">&#10094;</button>
            <div class="ahk-hikaye-scroll">
                <?php foreach ( $videos as $v ) :
                    $img = self::thumb( $v, 'medium' );
                    $url = self::video_url( $v->video_id, $v->platform );
                ?>
                <a href="<?php echo $url; ?>" class="ahk-hikaye-item" title="<?php echo esc_attr( $v->baslik ); ?>">
                    <span class="ahk-hk-ring vtv-hk-ring"><span class="ahk-hk-img" style="background-image:url('<?php echo esc_url( $img ); ?>')"></span>
                        <span class="vtv-hk-play">▶</span>
                    </span>
                    <span class="ahk-hk-text"><?php echo esc_html( wp_trim_words( $v->baslik, 4, '…' ) ); ?></span>
                </a>
                <?php endforeach; ?>
            </div>
            <button class="ahk-hk-nav ahk-hk-next" aria-label="Sonraki">&#10095;</button>
        </div>
        <?php
        return ob_get_clean();
    }

    /* ============================================================
     *  2) MANŞET — [ahenk_video_manset]
     * ============================================================ */
    public static function sc_manset( $atts ) {
        $a = shortcode_atts( array(
            'sayi'        => 5,
            'kucuk'       => 4,
            'baslik'      => '',
            'kategori_id' => 0,
            'one_cikan'   => '',
            'manset'      => 'auto', // auto = işaretli varsa onları, yoksa son videolar
            'otomatik'    => 1,
            'sure'        => 6000,
        ), $atts, 'ahenk_video_manset' );

        wp_enqueue_style( 'vtv-bloklar' );

        $base = array(
            'sayi'        => intval( $a['sayi'] ) + intval( $a['kucuk'] ),
            'kategori_id' => intval( $a['kategori_id'] ),
            'one_cikan'   => ( $a['one_cikan'] === '' ) ? null : (int) $a['one_cikan'],
        );
        $top = array();
        // Önce: manset=1 işaretliler
        if ( $a['manset'] === 'auto' || (string)$a['manset'] === '1' ) {
            $top = self::get_videos( array_merge( $base, array( 'manset' => 1 ) ) );
        }
        // Yoksa fallback (sadece auto modda)
        if ( empty( $top ) && $a['manset'] === 'auto' ) {
            $top = self::get_videos( $base );
        } elseif ( empty( $top ) && (string)$a['manset'] === '0' ) {
            $top = self::get_videos( array_merge( $base, array( 'manset' => 0 ) ) );
        }
        if ( empty( $top ) ) return '';

        $buyuk = array_slice( $top, 0, intval( $a['sayi'] ) );
        $kucuk = array_slice( $top, intval( $a['sayi'] ), intval( $a['kucuk'] ) );

        $uid = 'vtv-ms-' . wp_rand( 1000, 9999 );
        ob_start(); ?>
        <div class="ahk-manset-wrap vtv-bloklar-manset" id="<?php echo esc_attr( $uid ); ?>"
             data-otomatik="<?php echo intval( $a['otomatik'] ); ?>" data-sure="<?php echo intval( $a['sure'] ); ?>">
            <div class="ahk-manset-buyuk">
                <div class="ahk-manset-slides">
                    <?php foreach ( $buyuk as $i => $v ) :
                        $img = self::thumb( $v, 'large' );
                        $url = self::video_url( $v->video_id, $v->platform );
                    ?>
                    <a href="<?php echo $url; ?>" class="ahk-manset-slide<?php echo $i===0?' aktif':''; ?>" data-i="<?php echo $i; ?>"
                       style="background-image:url('<?php echo esc_url( $img ); ?>')">
                        <span class="ahk-manset-overlay"></span>
                        <span class="vtv-manset-play">▶</span>
                        <span class="ahk-manset-icerik">
                            <?php if ( ! empty( $v->kategori_adi ) ) : ?>
                                <span class="ahk-manset-kat">🎬 <?php echo esc_html( $v->kategori_adi ); ?></span>
                            <?php else : ?>
                                <span class="ahk-manset-kat">🎬 Video</span>
                            <?php endif; ?>
                            <h2 class="ahk-manset-baslik"><?php echo esc_html( $v->baslik ); ?></h2>
                            <?php if ( ! empty( $v->kanal_ismi ) ) : ?>
                                <span class="ahk-manset-ozet"><?php echo esc_html( $v->kanal_ismi ); ?></span>
                            <?php endif; ?>
                        </span>
                    </a>
                    <?php endforeach; ?>
                </div>
                <button class="ahk-ms-nav ahk-ms-prev" aria-label="Önceki">&#10094;</button>
                <button class="ahk-ms-nav ahk-ms-next" aria-label="Sonraki">&#10095;</button>
                <div class="ahk-ms-dots">
                    <?php foreach ( $buyuk as $i => $v ) : ?>
                        <button class="ahk-ms-dot<?php echo $i===0?' aktif':''; ?>" data-i="<?php echo $i; ?>" aria-label="<?php echo $i+1; ?>"></button>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php if ( ! empty( $kucuk ) ) : ?>
            <div class="ahk-manset-yan">
                <?php foreach ( $kucuk as $v ) :
                    $img = self::thumb( $v, 'medium' );
                    $url = self::video_url( $v->video_id, $v->platform );
                ?>
                <a href="<?php echo $url; ?>" class="ahk-manset-mini">
                    <span class="ahk-mini-img" style="background-image:url('<?php echo esc_url( $img ); ?>')">
                        <span class="vtv-mini-play">▶</span>
                    </span>
                    <span class="ahk-mini-baslik"><?php echo esc_html( wp_trim_words( $v->baslik, 10, '…' ) ); ?></span>
                </a>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /* ============================================================
     *  3) GRID — [ahenk_video_grid]
     * ============================================================ */
    public static function sc_grid( $atts ) {
        $a = shortcode_atts( array(
            'sayi'        => 8,
            'sutun'       => 4,
            'baslik'      => '',
            'kategori_id' => 0,
            'kaynak_id'   => 0,
            'one_cikan'   => '',
        ), $atts, 'ahenk_video_grid' );

        wp_enqueue_style( 'vtv-bloklar' );
        $videos = self::get_videos( array(
            'sayi'        => intval( $a['sayi'] ),
            'kategori_id' => intval( $a['kategori_id'] ),
            'kaynak_id'   => intval( $a['kaynak_id'] ),
            'one_cikan'   => ( $a['one_cikan'] === '' ) ? null : (int) $a['one_cikan'],
        ) );
        if ( empty( $videos ) ) return '';

        $sutun = max( 2, min( 6, (int) $a['sutun'] ) );
        ob_start(); ?>
        <div class="vtv-bloklar-grid" style="--vtv-cols:<?php echo $sutun; ?>;">
            <?php if ( $a['baslik'] ) : ?>
                <div class="vtv-grid-baslik"><?php echo esc_html( $a['baslik'] ); ?></div>
            <?php endif; ?>
            <div class="vtv-grid-icerik">
                <?php foreach ( $videos as $v ) :
                    $img = self::thumb( $v, 'medium' );
                    $url = self::video_url( $v->video_id, $v->platform );
                ?>
                <a href="<?php echo $url; ?>" class="vtv-grid-card">
                    <span class="vtv-grid-img" style="background-image:url('<?php echo esc_url( $img ); ?>')">
                        <span class="vtv-grid-play">▶</span>
                        <?php if ( ! empty( $v->sure ) ) : ?>
                            <span class="vtv-grid-sure"><?php echo esc_html( $v->sure ); ?></span>
                        <?php endif; ?>
                    </span>
                    <span class="vtv-grid-meta">
                        <?php if ( ! empty( $v->kategori_adi ) ) : ?>
                            <span class="vtv-grid-kat"><?php echo esc_html( $v->kategori_adi ); ?></span>
                        <?php endif; ?>
                        <h4 class="vtv-grid-title"><?php echo esc_html( wp_trim_words( $v->baslik, 12, '…' ) ); ?></h4>
                        <?php if ( ! empty( $v->kanal_ismi ) ) : ?>
                            <span class="vtv-grid-kanal"><?php echo esc_html( $v->kanal_ismi ); ?></span>
                        <?php endif; ?>
                    </span>
                </a>
                <?php endforeach; ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}
} // end class_exists guard
