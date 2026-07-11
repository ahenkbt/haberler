<?php

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! class_exists( 'AHB_Related_News' ) ) {
class AHB_Related_News {

    /**
     * Belirtilen yazı için ilgili haberleri bulur ve içeriğe ekler.
     *
     * @param int $post_id
     */
    public function attach( $post_id ) {
        $post = get_post( $post_id );
        if ( ! $post ) return;

        $related = $this->find_related( $post );
        if ( empty( $related ) ) return;

        if ( strpos( $post->post_content, 'ahb-related-news' ) !== false ) {
            $this->update_related_block( $post_id, $post->post_content, $related );
            return;
        }

        $block = $this->build_related_block( $related );

        wp_update_post( array(
            'ID'           => $post_id,
            'post_content' => $post->post_content . "\n\n" . $block,
        ) );
    }

    private function find_related( $post ) {
        $entities = get_post_meta( $post->ID, '_ahb_entities', true );
        $tags     = wp_get_post_tags( $post->ID, array( 'fields' => 'names' ) );

        $search_terms = array();

        if ( ! empty( $entities ) && is_array( $entities ) ) {
            $search_terms = array_merge( $search_terms, $entities );
        }

        if ( ! empty( $tags ) ) {
            $search_terms = array_merge( $search_terms, array_slice( $tags, 0, 3 ) );
        }

        if ( empty( $search_terms ) ) {
            $words = preg_split( '/\s+/', $post->post_title );
            $words = array_filter( $words, function( $w ) {
                return mb_strlen( $w ) > 3;
            });
            $search_terms = array_slice( array_values( $words ), 0, 4 );
        }

        if ( empty( $search_terms ) ) return array();

        $related = array();

        foreach ( $search_terms as $term ) {
            $args = array(
                's'              => $term,
                'post_type'      => sanitize_key( get_option( 'ahb_post_type', 'haber' ) ),
                'post_status'    => 'publish',
                'posts_per_page' => 5,
                'post__not_in'   => array( $post->ID ),
            );

            $query = new WP_Query( $args );

            if ( $query->have_posts() ) {
                foreach ( $query->posts as $p ) {
                    if ( ! isset( $related[ $p->ID ] ) ) {
                        $related[ $p->ID ] = array(
                            'id'      => $p->ID,
                            'title'   => $p->post_title,
                            'url'     => get_permalink( $p->ID ),
                            'score'   => 1,
                        );
                    } else {
                        $related[ $p->ID ]['score']++;
                    }
                }
            }
            wp_reset_postdata();
        }

        usort( $related, function( $a, $b ) {
            return $b['score'] - $a['score'];
        });

        return array_slice( $related, 0, 3 );
    }

    private function build_related_block( $related ) {
        $html = '<div class="ahb-related-news" style="border-top:2px solid #eee;margin-top:32px;padding-top:16px;">';
        $html .= '<h4 style="margin:0 0 12px;font-size:1em;text-transform:uppercase;letter-spacing:.05em;color:#555;">İlgili Haberler</h4>';
        $html .= '<ul style="list-style:none;padding:0;margin:0;">';

        foreach ( $related as $item ) {
            $html .= '<li style="padding:6px 0;border-bottom:1px solid #f0f0f0;">';
            $html .= '<a href="' . esc_url( $item['url'] ) . '" style="color:#2c3e50;text-decoration:none;">';
            $html .= '→ ' . esc_html( $item['title'] );
            $html .= '</a></li>';
        }

        $html .= '</ul></div>';
        return $html;
    }

    private function update_related_block( $post_id, $content, $related ) {
        $new_block = $this->build_related_block( $related );
        $updated   = preg_replace( '/<div class="ahb-related-news"[^>]*>.*?<\/div>/s', $new_block, $content );
        if ( $updated && $updated !== $content ) {
            wp_update_post( array(
                'ID'           => $post_id,
                'post_content' => $updated,
            ) );
        }
    }
}
} // end class_exists guard
