<?php

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! class_exists( 'AHB_Duplicate_Checker' ) ) {
class AHB_Duplicate_Checker {

    private $table;

    public function __construct() {
        global $wpdb;
        $this->table = $wpdb->prefix . 'ahb_processed_news';
    }

    /**
     * Haberin daha önce işlenip işlenmediğini kontrol eder.
     *
     * @param string $guid
     * @param string $link
     * @return bool
     */
    public function is_duplicate( $guid, $link ) {
        global $wpdb;

        $hash = $this->make_hash( $guid, $link );

        $count = $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->table} WHERE source_hash = %s",
            $hash
        ) );

        return (int) $count > 0;
    }

    /**
     * İşlenen haberi kayıt altına alır.
     *
     * @param string $guid
     * @param string $link
     * @param int    $post_id
     * @param string $topic_slug
     */
    public function mark_as_processed( $guid, $link, $post_id = null, $topic_slug = '' ) {
        global $wpdb;

        $hash = $this->make_hash( $guid, $link );

        $wpdb->replace(
            $this->table,
            array(
                'source_url'   => $link,
                'source_hash'  => $hash,
                'wp_post_id'   => $post_id,
                'topic_slug'   => sanitize_title( $topic_slug ),
                'processed_at' => current_time( 'mysql' ),
            ),
            array( '%s', '%s', '%d', '%s', '%s' )
        );
    }

    /**
     * Aynı konu slug'ı ile son 24 saatte yayınlanmış haberleri döndürür.
     *
     * @param string $topic_slug
     * @return array [ ['id'=>123,'title'=>'...','slug'=>'...'], ... ]
     */
    public function get_recent_by_topic( $topic_slug ) {
        global $wpdb;

        $slug = sanitize_title( $topic_slug );
        if ( empty( $slug ) ) return array();

        $rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT wp_post_id FROM {$this->table}
             WHERE topic_slug = %s
               AND processed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
               AND wp_post_id IS NOT NULL",
            $slug
        ), ARRAY_A );

        if ( empty( $rows ) ) return array();

        $posts = array();
        foreach ( $rows as $row ) {
            $p = get_post( $row['wp_post_id'] );
            if ( $p && $p->post_status === 'publish' ) {
                $posts[] = array(
                    'id'    => $p->ID,
                    'title' => $p->post_title,
                    'slug'  => $p->post_name,
                );
            }
        }

        return $posts;
    }

    /**
     * Benzer başlıklı WordPress yazısı var mı kontrol eder.
     *
     * @param string $title
     * @return int|false Varsa post_id, yoksa false
     */
    public function find_by_similar_title( $title ) {
        global $wpdb;

        $post_type = sanitize_key( get_option( 'ahb_post_type', 'haber' ) );

        // 1) Tam eşleşme (her durumda kontrol et)
        // ÖNEMLİ: 'trash' da dahil — kullanıcı çöpe attıysa bot tekrar üretmemeli.
        $similar = $wpdb->get_var( $wpdb->prepare(
            "SELECT ID FROM {$wpdb->posts}
             WHERE post_status IN ('publish','draft','pending','future','private','trash')
               AND post_type = %s
               AND post_title = %s
             LIMIT 1",
            $post_type,
            $title
        ) );
        if ( $similar ) return (int) $similar;

        // 2) Normalize edilmiş eşleşme (Türkçe karakter, noktalama, boşluk farkları)
        $norm = self::normalize_title( $title );
        if ( mb_strlen( $norm ) < 6 ) return false;
        $like = '%' . $wpdb->esc_like( $title ) . '%';

        // Önce LIKE ile aday daralt (index kullanır), sonra PHP'de normalize karşılaştır
        $rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT ID, post_title FROM {$wpdb->posts}
             WHERE post_status IN ('publish','draft','pending','future','private','trash')
               AND post_type = %s
             ORDER BY ID DESC
             LIMIT 5000",
            $post_type
        ) );
        foreach ( (array) $rows as $r ) {
            if ( self::normalize_title( $r->post_title ) === $norm ) {
                return (int) $r->ID;
            }
        }
        return false;
    }

    /**
     * Başlığı normalize eder: küçük harf, Türkçe karakterler sadeleşir,
     * noktalama silinir, fazla boşluk birleşir. Aynı haberin farklı
     * yazımlarını eşleştirmek için kullanılır.
     */
    public static function normalize_title( $title ) {
        $t = mb_strtolower( trim( (string) $title ), 'UTF-8' );
        $tr = array( 'ı'=>'i','ğ'=>'g','ü'=>'u','ş'=>'s','ö'=>'o','ç'=>'c','İ'=>'i' );
        $t = strtr( $t, $tr );
        $t = preg_replace( '/[^a-z0-9 ]+/u', ' ', $t );
        $t = preg_replace( '/\s+/', ' ', $t );
        return trim( $t );
    }

    private function make_hash( $guid, $link ) {
        return hash( 'sha256', $guid . '|' . $link );
    }
}
} // end class_exists guard
