<?php

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Site içi haber bakımı / temizliği.
 *
 * - Aynı içerikteki haberleri "sıcak gelişme" olarak birleştirir (en eski tutulur, diğerleri silinir).
 * - Benzer (ama aynı olmayan) haberleri ilgili haberin altına link olarak ekler.
 * - Silinen haberin öne çıkan görselini medya kütüphanesinden de kaldırır.
 * - "Kaynak: ...", "Haber Kaynağı:", "Habere kaynak:" gibi atıfları içerikten temizler.
 * - İçerik çok kısaysa veya AI seçeneği "rewrite" ise OpenAI ile özgünleştirir.
 * - Kategorik çalışır, batch (parça parça) işler.
 */
if ( ! class_exists( 'AHB_Site_Cleanup' ) ) {
class AHB_Site_Cleanup {

    private $openai;
    private $post_type;
    private $taxonomy;

    /** Eşik: bu skorun üstündeyse aynı haber sayılır (silinir/birleştirilir) */
    const DUPLICATE_THRESHOLD = 0.78;
    /** Eşik: bu skorun üstündeyse benzer sayılır (link eklenir, silinmez) */
    const SIMILAR_THRESHOLD   = 0.45;

    public function __construct( $openai = null ) {
        $this->openai    = $openai;
        $this->post_type = sanitize_key( get_option( 'ahb_post_type', 'haber' ) );
        $this->taxonomy  = sanitize_key( get_option( 'ahb_taxonomy', 'category' ) );
    }

    /**
     * Bir kategoride bir batch işler. Çoklu sayfa/AJAX taraması için tasarlandı.
     *
     * @param int   $term_id     Kategori terim ID'si
     * @param int   $offset      Bu batch'in başlangıç indeksi
     * @param int   $batch_size  Bu çağrıda işlenecek max post sayısı
     * @param array $opts        ['ai_mode'=>'free'|'cheapest'|'best', 'remove_source'=>1, 'merge_duplicates'=>1, 'add_related'=>1, 'rewrite_content'=>1]
     * @return array  ['processed','deleted','merged','linked','rewritten','remaining','total','done']
     */
    public function process_category_batch( $term_id, $offset = 0, $batch_size = 10, $opts = array() ) {
        $defaults = array(
            'ai_mode'          => 'free',     // 'free' = AI kullanma, 'cheapest' = gpt-4o-mini, 'best' = gpt-4o
            'remove_source'    => 1,
            'merge_duplicates' => 1,
            'add_related'      => 1,
            'rewrite_content'  => 0,          // sadece ai_mode != 'free' ise anlamlı
        );
        $opts = array_merge( $defaults, $opts );

        $stats = array(
            'processed' => 0, 'deleted' => 0, 'merged' => 0, 'linked' => 0,
            'rewritten' => 0, 'remaining' => 0, 'total' => 0, 'done' => false,
            'log' => array(),
        );

        // Tüm post ID'lerini en eski → en yeni sırayla al
        $all_ids = $this->get_category_post_ids( $term_id );
        $stats['total'] = count( $all_ids );

        if ( empty( $all_ids ) ) {
            $stats['done'] = true;
            return $stats;
        }

        $batch = array_slice( $all_ids, $offset, $batch_size );
        if ( empty( $batch ) ) {
            $stats['done'] = true;
            return $stats;
        }

        // Bu batch içindeki postları yükle ve içerik özetlerini çıkar
        foreach ( $batch as $pid ) {
            $post = get_post( $pid );
            if ( ! $post || $post->post_status !== 'publish' ) continue;

            // Bu post zaten önceki bir iterasyonda silinmiş olabilir
            if ( get_post_status( $pid ) === false ) continue;

            $stats['processed']++;
            $action_log = array( 'id' => $pid, 'title' => $post->post_title, 'actions' => array() );

            $changed_content = false;
            $content = $post->post_content;

            // 1) Kaynak atıfını temizle
            if ( $opts['remove_source'] ) {
                $cleaned = $this->strip_source_attribution( $content );
                if ( $cleaned !== $content ) {
                    $content = $cleaned;
                    $changed_content = true;
                    $action_log['actions'][] = 'kaynak_temizlendi';
                }
            }

            // 2) Aynı kategoride mükerrer/benzer haberleri bul
            $candidates = $this->find_candidates_in_category( $term_id, $pid );
            $duplicates = array();
            $similars   = array();

            $self_norm = $this->normalize( $post->post_title . ' ' . wp_strip_all_tags( $post->post_content ) );

            foreach ( $candidates as $cand ) {
                $cand_norm = $this->normalize( $cand->post_title . ' ' . wp_strip_all_tags( $cand->post_content ) );
                $score = $this->similarity( $self_norm, $cand_norm );

                if ( $score >= self::DUPLICATE_THRESHOLD ) {
                    $duplicates[] = array( 'post' => $cand, 'score' => $score );
                } elseif ( $score >= self::SIMILAR_THRESHOLD ) {
                    $similars[] = array( 'post' => $cand, 'score' => $score );
                }
            }

            // 3) Mükerrerleri birleştir + sil
            if ( $opts['merge_duplicates'] && ! empty( $duplicates ) ) {
                $merge_block = $this->build_developments_block( $duplicates );
                if ( $merge_block ) {
                    $content = $this->append_or_replace_block( $content, '<!-- ahb:gelismeler -->', '<!-- /ahb:gelismeler -->', $merge_block );
                    $changed_content = true;
                    $action_log['actions'][] = 'gelisme_eklendi(' . count( $duplicates ) . ')';
                    $stats['merged'] += count( $duplicates );
                }

                foreach ( $duplicates as $dup ) {
                    $this->delete_post_with_image( $dup['post']->ID );
                    $stats['deleted']++;
                }
            }

            // 4) Benzerleri link olarak ekle
            if ( $opts['add_related'] && ! empty( $similars ) ) {
                $links_block = $this->build_related_links_block( $similars );
                if ( $links_block ) {
                    $content = $this->append_or_replace_block( $content, '<!-- ahb:ilgili -->', '<!-- /ahb:ilgili -->', $links_block );
                    $changed_content = true;
                    $action_log['actions'][] = 'ilgili_link_eklendi(' . count( $similars ) . ')';
                    $stats['linked'] += count( $similars );
                }
            }

            // 5) İçerik özgünleştirme (sadece AI seçilmişse)
            if ( $opts['rewrite_content'] && $opts['ai_mode'] !== 'free' && $this->openai ) {
                $rewritten = $this->rewrite_with_ai( $post->post_title, $content, $opts['ai_mode'] );
                if ( $rewritten && strlen( $rewritten ) > 200 ) {
                    // Korumalı blokları geri yapıştır (gelismeler + ilgili)
                    $rewritten = $this->preserve_blocks( $content, $rewritten );
                    $content = $rewritten;
                    $changed_content = true;
                    $action_log['actions'][] = 'icerik_yenilendi';
                    $stats['rewritten']++;
                }
            }

            if ( $changed_content ) {
                wp_update_post( array(
                    'ID'           => $pid,
                    'post_content' => $content,
                ) );
            }

            if ( ! empty( $action_log['actions'] ) ) {
                $stats['log'][] = $action_log;
            }
        }

        $next_offset = $offset + $batch_size;
        $stats['remaining'] = max( 0, $stats['total'] - $next_offset );
        $stats['done']      = $next_offset >= $stats['total'];
        $stats['next_offset'] = $next_offset;

        return $stats;
    }

    /** Kategorideki tüm yayınlanmış haber ID'lerini en eski → en yeni sırada döndürür. */
    public function get_category_post_ids( $term_id ) {
        $args = array(
            'post_type'      => $this->post_type,
            'post_status'    => 'publish',
            'posts_per_page' => -1,
            'fields'         => 'ids',
            'orderby'        => 'date',
            'order'          => 'ASC',
            'tax_query'      => array(
                array(
                    'taxonomy' => $this->taxonomy,
                    'field'    => 'term_id',
                    'terms'    => (int) $term_id,
                ),
            ),
        );
        $q = new WP_Query( $args );
        return $q->posts ? array_map( 'intval', $q->posts ) : array();
    }

    /** Mevcut post hariç aynı kategorideki diğer postları döndürür. */
    private function find_candidates_in_category( $term_id, $exclude_id ) {
        $args = array(
            'post_type'      => $this->post_type,
            'post_status'    => 'publish',
            'posts_per_page' => 200,
            'orderby'        => 'date',
            'order'          => 'DESC',
            'post__not_in'   => array( (int) $exclude_id ),
            'tax_query'      => array(
                array(
                    'taxonomy' => $this->taxonomy,
                    'field'    => 'term_id',
                    'terms'    => (int) $term_id,
                ),
            ),
        );
        $q = new WP_Query( $args );
        return $q->posts ?: array();
    }

    /** Metni normalleştir (küçük harf, noktalama temizle, Türkçe karakter sadeleştir). */
    private function normalize( $text ) {
        $text = wp_strip_all_tags( $text );
        $text = mb_strtolower( $text, 'UTF-8' );
        $text = strtr( $text, array(
            'ı'=>'i','ğ'=>'g','ü'=>'u','ş'=>'s','ö'=>'o','ç'=>'c',
            'â'=>'a','î'=>'i','û'=>'u',
        ) );
        $text = preg_replace( '/[^a-z0-9\s]/u', ' ', $text );
        $text = preg_replace( '/\s+/', ' ', $text );
        return trim( $text );
    }

    /** Jaccard benzerlik (kelime kümesi). 0..1 */
    private function similarity( $a, $b ) {
        if ( $a === '' || $b === '' ) return 0.0;
        // Kısa metinler için ilk 800 karakter yeter (hız)
        $a_words = array_unique( explode( ' ', mb_substr( $a, 0, 1500, 'UTF-8' ) ) );
        $b_words = array_unique( explode( ' ', mb_substr( $b, 0, 1500, 'UTF-8' ) ) );

        // 3 harften kısa stop-word benzeri kelimeleri çıkar
        $a_words = array_filter( $a_words, function( $w ){ return mb_strlen( $w ) >= 4; } );
        $b_words = array_filter( $b_words, function( $w ){ return mb_strlen( $w ) >= 4; } );

        if ( empty( $a_words ) || empty( $b_words ) ) return 0.0;

        $inter = count( array_intersect( $a_words, $b_words ) );
        $union = count( array_unique( array_merge( $a_words, $b_words ) ) );
        return $union > 0 ? $inter / $union : 0.0;
    }

    /** "Sıcak gelişmeler" bloğu — silinecek mükerrerlerden yeni bilgi başlıklarını listeler. */
    private function build_developments_block( $duplicates ) {
        if ( empty( $duplicates ) ) return '';
        $items = array();
        foreach ( $duplicates as $d ) {
            $title = trim( $d['post']->post_title );
            $date  = mysql2date( 'd.m.Y H:i', $d['post']->post_date );
            if ( $title ) $items[] = '<li><strong>' . esc_html( $date ) . ':</strong> ' . esc_html( $title ) . '</li>';
        }
        if ( empty( $items ) ) return '';
        return "\n\n<h3>🔥 Sıcak Gelişmeler</h3>\n<ul>\n" . implode( "\n", $items ) . "\n</ul>\n";
    }

    /** "İlgili Haberler" link bloğu. */
    private function build_related_links_block( $similars ) {
        if ( empty( $similars ) ) return '';
        // En benzer 5 tanesini al
        usort( $similars, function( $a, $b ){ return $b['score'] <=> $a['score']; } );
        $similars = array_slice( $similars, 0, 5 );

        $items = array();
        foreach ( $similars as $s ) {
            $url   = get_permalink( $s['post']->ID );
            $title = trim( $s['post']->post_title );
            if ( $url && $title ) {
                $items[] = '<li><a href="' . esc_url( $url ) . '">' . esc_html( $title ) . '</a></li>';
            }
        }
        if ( empty( $items ) ) return '';
        return "\n\n<h3>📎 İlgili Haberler</h3>\n<ul>\n" . implode( "\n", $items ) . "\n</ul>\n";
    }

    /** İçerikteki belirli bir blok varsa değiştirir, yoksa sona ekler. */
    private function append_or_replace_block( $content, $start_tag, $end_tag, $new_block ) {
        $wrapped = $start_tag . $new_block . $end_tag;
        $pattern = '/' . preg_quote( $start_tag, '/' ) . '[\s\S]*?' . preg_quote( $end_tag, '/' ) . '/';
        if ( preg_match( $pattern, $content ) ) {
            return preg_replace( $pattern, $wrapped, $content );
        }
        return rtrim( $content ) . "\n\n" . $wrapped;
    }

    /** AI yeniden yazımdan sonra korunan blokları (gelismeler + ilgili) tekrar yapıştır. */
    private function preserve_blocks( $original, $rewritten ) {
        $tags = array(
            array( '<!-- ahb:gelismeler -->', '<!-- /ahb:gelismeler -->' ),
            array( '<!-- ahb:ilgili -->',     '<!-- /ahb:ilgili -->' ),
        );
        foreach ( $tags as $t ) {
            $pattern = '/' . preg_quote( $t[0], '/' ) . '[\s\S]*?' . preg_quote( $t[1], '/' ) . '/';
            if ( preg_match( $pattern, $original, $m ) ) {
                // AI çıktısında zaten varsa kaldır, sona ekle
                $rewritten = preg_replace( $pattern, '', $rewritten );
                $rewritten = rtrim( $rewritten ) . "\n\n" . $m[0];
            }
        }
        return $rewritten;
    }

    /**
     * "Kaynak: X", "Haber Kaynağı: X", "Habere kaynak", "Source:" gibi atıfları sondan temizler.
     */
    private function strip_source_attribution( $content ) {
        $patterns = array(
            // <p>Kaynak: ...</p>
            '/<p[^>]*>\s*(?:Kaynak|Haber\s+Kayna[ğg]ı|Habere\s+kaynak|KAYNAK|Source)\s*[:\-–]?[\s\S]*?<\/p>/iu',
            // <strong>Kaynak:</strong> ...
            '/<(?:strong|b|em|i)[^>]*>\s*(?:Kaynak|Haber\s+Kayna[ğg]ı|KAYNAK|Source)\s*[:\-–]?\s*<\/(?:strong|b|em|i)>[\s\S]*?(?:<br\s*\/?>|<\/p>|$)/iu',
            // Plain satır: Kaynak: ... (sonuna kadar)
            '/(?:^|\n)\s*(?:Kaynak|Haber\s+Kayna[ğg]ı|Habere\s+kaynak|KAYNAK|Source)\s*[:\-–][^\n]*$/imu',
            // "Kaynak: <a href="...">...</a>"
            '/(?:Kaynak|Haber\s+Kayna[ğg]ı|KAYNAK|Source)\s*[:\-–]\s*<a[^>]*>[\s\S]*?<\/a>/iu',
        );

        foreach ( $patterns as $p ) {
            $content = preg_replace( $p, '', $content );
        }

        // Çift boş satırları sadeleştir
        $content = preg_replace( "/(\s*\n\s*){3,}/", "\n\n", $content );
        return trim( $content );
    }

    /** Postu ve öne çıkan görsel attachment'ını siler. */
    private function delete_post_with_image( $post_id ) {
        $thumb_id = get_post_thumbnail_id( $post_id );
        wp_delete_post( $post_id, true );
        if ( $thumb_id ) {
            // Eğer bu attachment başka bir posta atanmışsa silmeyelim
            global $wpdb;
            $other = $wpdb->get_var( $wpdb->prepare(
                "SELECT post_id FROM {$wpdb->postmeta}
                 WHERE meta_key='_thumbnail_id' AND meta_value=%d LIMIT 1",
                $thumb_id
            ) );
            if ( ! $other ) {
                wp_delete_attachment( $thumb_id, true );
            }
        }
    }

    /** Mevcut OpenAI istemcisi ile içeriği özgünleştirir. */
    private function rewrite_with_ai( $title, $content, $ai_mode ) {
        if ( ! $this->openai || ! method_exists( $this->openai, 'uniquify_news' ) ) {
            return '';
        }
        try {
            $result = $this->openai->uniquify_news( $title, wp_strip_all_tags( $content ) );
            if ( is_array( $result ) && ! empty( $result['icerik'] ) ) {
                return $result['icerik'];
            }
        } catch ( Exception $e ) {
            error_log( '[AI Haber Botu Cleanup] AI yeniden yazım hatası: ' . $e->getMessage() );
        }
        return '';
    }
}
} // end class_exists guard
