<?php
defined( 'ABSPATH' ) || exit;

class VKV_Nav_Walker extends Walker_Nav_Menu {
    public function start_lvl( &$output, $depth = 0, $args = null ) {
        if ( $depth === 0 ) $output .= '<div class="hdr-drop">';
    }
    public function end_lvl( &$output, $depth = 0, $args = null ) {
        if ( $depth === 0 ) $output .= '</div>';
    }
    public function start_el( &$output, $item, $depth = 0, $args = null, $id = 0 ) {
        $classes   = empty( $item->classes ) ? array() : (array) $item->classes;
        $has_child = in_array( 'menu-item-has-children', $classes );
        $is_active = in_array( 'current-menu-item', $classes ) || in_array( 'current-menu-ancestor', $classes );

        if ( $depth === 0 ) {
            $output .= '<div class="hdr-nav-item' . ( $is_active ? ' active' : '' ) . '">';
            $output .= '<a href="' . esc_url( $item->url ) . '">' . esc_html( $item->title );
            if ( $has_child ) $output .= ' <i class="fa fa-angle-down arr"></i>';
            $output .= '</a>';
        } else {
            $output .= '<a href="' . esc_url( $item->url ) . '"><i class="fa fa-angle-right"></i>' . esc_html( $item->title ) . '</a>';
        }
    }
    public function end_el( &$output, $item, $depth = 0, $args = null ) {
        if ( $depth === 0 ) $output .= '</div>';
    }
}

class VKV_Mobile_Walker extends Walker_Nav_Menu {
    public function start_lvl( &$output, $depth = 0, $args = null ) {
        if ( $depth === 0 ) $output .= '<div class="mm-sub">';
    }
    public function end_lvl( &$output, $depth = 0, $args = null ) {
        if ( $depth === 0 ) $output .= '</div>';
    }
    public function start_el( &$output, $item, $depth = 0, $args = null, $id = 0 ) {
        $classes   = empty( $item->classes ) ? array() : (array) $item->classes;
        $has_child = in_array( 'menu-item-has-children', $classes );
        if ( $depth === 0 ) {
            $output .= '<div class="mm-item' . ( $has_child ? ' has-sub' : '' ) . '">';
            if ( $has_child ) {
                /* Ana link korunur, ok butonu ayrı eleman olarak eklenir */
                $output .= '<a href="' . esc_url( $item->url ) . '" class="mm-item-link">'
                         . esc_html( $item->title )
                         . '</a>'
                         . '<button type="button" class="mm-sub-toggle" aria-label="Alt menü">'
                         . '<i class="fa fa-angle-down mm-arr"></i>'
                         . '</button>';
            } else {
                $output .= '<a href="' . esc_url( $item->url ) . '">' . esc_html( $item->title ) . '</a>';
            }
        } else {
            $output .= '<a href="' . esc_url( $item->url ) . '">' . esc_html( $item->title ) . '</a>';
        }
    }
    public function end_el( &$output, $item, $depth = 0, $args = null ) {
        if ( $depth === 0 ) $output .= '</div>';
    }
}
