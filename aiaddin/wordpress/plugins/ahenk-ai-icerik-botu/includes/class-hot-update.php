<?php

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! class_exists( 'AHB_Hot_Update' ) ) {
class AHB_Hot_Update {

    private $openai;

    public function __construct( AHB_OpenAI_Client $openai ) {
        $this->openai = $openai;
    }

    /**
     * Yeni haberin mevcut bir haberi güncelleme olup olmadığını kontrol eder.
     * Güncel bir haber ise eski habere "Sıcak Gelişme" bloğu ekler.
     *
     * @param array  $new_item   ['title'=>'', 'content'=>'']
     * @param string $topic_slug
     * @param array  $checker    AHB_Duplicate_Checker instance
     * @return int|false  Güncellenen post_id veya false (yeni haber)
     */
    public function maybe_update( $new_item, $topic_slug, $checker ) {
        $existing = $checker->get_recent_by_topic( $topic_slug );

        if ( empty( $existing ) ) {
            $existing = $this->search_wordpress_by_entities( $new_item['title'], $new_item['content'] );
        }

        if ( empty( $existing ) ) return false;

        $result = $this->openai->check_hot_update(
            $new_item['title'],
            $new_item['content'],
            $existing
        );

        if ( ! $result || $result['action'] !== 'update' || empty( $result['post_id'] ) ) {
            return false;
        }

        $post = get_post( (int) $result['post_id'] );
        if ( ! $post ) return false;

        $summary = sanitize_textarea_field( $result['summary'] );
        $this->append_hot_update( $post, $new_item['title'], $summary, $new_item['link'] ?? '' );

        return $post->ID;
    }

    /**
     * Eski haber içeriğinin sonuna "Sıcak Gelişme" bloğu ekler.
     */
    private function append_hot_update( $post, $new_title, $summary, $source_link = '' ) {
        $time    = current_time( 'd.m.Y H:i' );
        $source  = ! empty( $source_link ) ? ' <a href="' . esc_url( $source_link ) . '" target="_blank" rel="nofollow">[Kaynak]</a>' : '';

        $block = "\n\n" .
                 '<div class="ahb-hot-update" style="border-left:4px solid #e74c3c;padding:12px 16px;margin:24px 0;background:#fff5f5;">' .
                 '<p style="font-weight:bold;color:#e74c3c;margin:0 0 6px;">🔴 Sıcak Gelişme | ' . esc_html( $time ) . '</p>' .
                 '<p style="margin:0;"><strong>' . esc_html( $new_title ) . '</strong><br>' .
                 esc_html( $summary ) . $source . '</p>' .
                 '</div>';

        $updated_content = $post->post_content . $block;

        wp_update_post( array(
            'ID'           => $post->ID,
            'post_content' => $updated_content,
            'post_modified' => current_time( 'mysql' ),
        ) );

        update_post_meta( $post->ID, '_ahb_last_hot_update', current_time( 'mysql' ) );

        error_log( '[AI Haber Botu] Sıcak gelişme eklendi. Post ID: ' . $post->ID );
    }

    /**
     * WordPress full-text araması ile ilişkili haber arar.
     */
    private function search_wordpress_by_entities( $title, $content ) {
        $entities = $this->openai->extract_entities( $title, $content );
        if ( empty( $entities ) ) return array();

        $query = implode( ' ', array_slice( $entities, 0, 3 ) );

        $args = array(
            's'              => $query,
            'post_type'      => sanitize_key( get_option( 'ahb_post_type', 'haber' ) ),
            'post_status'    => 'publish',
            'posts_per_page' => 5,
            'date_query'     => array(
                array(
                    'after'     => '24 hours ago',
                    'inclusive' => true,
                ),
            ),
        );

        $wp_query = new WP_Query( $args );
        $results  = array();

        if ( $wp_query->have_posts() ) {
            foreach ( $wp_query->posts as $p ) {
                $results[] = array(
                    'id'    => $p->ID,
                    'title' => $p->post_title,
                    'slug'  => $p->post_name,
                );
            }
        }

        wp_reset_postdata();
        return $results;
    }
}
} // end class_exists guard
