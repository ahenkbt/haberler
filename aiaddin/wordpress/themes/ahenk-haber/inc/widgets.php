<?php
if ( ! defined('ABSPATH') ) exit;

function ahenk_register_widget_areas() {
    $alanlar = array(
        'sidebar-main'     => array('Ana Sidebar',           'Haber ve kategori sayfaları sağ paneli'),
        'sidebar-haber'    => array('Haber Detay Sidebar',   'Haber detay sayfası özel sidebar'),
        'footer-col-1'     => array('Footer Sütun 1',        ''),
        'footer-col-2'     => array('Footer Sütun 2',        ''),
        'footer-col-3'     => array('Footer Sütun 3',        ''),
        'footer-col-4'     => array('Footer Sütun 4',        ''),
        'banner-after-hero'=> array('Manşet Altı Reklam',    '728x90 veya 970x90'),
        'ad-in-content-1'  => array('Haber İçi Reklam 1',   ''),
        'sidebar-reklam'   => array('Sidebar Üst Reklam',    '300x250'),
    );
    foreach ( $alanlar as $id => $d ) {
        register_sidebar(array(
            'name'          => $d[0],
            'id'            => $id,
            'description'   => $d[1],
            'before_widget' => '<div id="%1$s" class="widget %2$s">',
            'after_widget'  => '</div>',
            'before_title'  => '<h3 class="widget-title">',
            'after_title'   => '</h3>',
        ));
    }
}
add_action('widgets_init','ahenk_register_widget_areas');
