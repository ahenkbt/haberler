<?php
/**
 * Ahenk Haber - Yardımcı Fonksiyonlar
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Okuma süresini otomatik hesapla
 */
function ahenk_okuma_suresi( $post_id = null ) {
    $post_id  = $post_id ?: get_the_ID();
    $kayitli  = get_post_meta( $post_id, '_okuma_suresi', true );
    if ( $kayitli ) return (int) $kayitli;

    $icerik   = get_post_field( 'post_content', $post_id );
    $kelimeler = str_word_count( wp_strip_all_tags( $icerik ) );
    $dakika   = max( 1, round( $kelimeler / 200 ) );
    return $dakika;
}

/**
 * Haber tarihini Türkçe formatla
 */
function ahenk_turkce_tarih( $post_id = null, $format = 'full' ) {
    $timestamp = get_post_time( 'U', false, $post_id );
    $ay_isimleri = array(
        1  => 'Ocak', 2  => 'Şubat',  3  => 'Mart',
        4  => 'Nisan', 5  => 'Mayıs', 6  => 'Haziran',
        7  => 'Temmuz', 8  => 'Ağustos', 9  => 'Eylül',
        10 => 'Ekim', 11 => 'Kasım', 12 => 'Aralık',
    );
    $gun  = date( 'j', $timestamp );
    $ay   = $ay_isimleri[ (int) date( 'n', $timestamp ) ];
    $yil  = date( 'Y', $timestamp );
    $saat = date( 'H:i', $timestamp );

    if ( $format === 'short' ) return "$gun $ay $yil";
    return "$gun $ay $yil, $saat";
}

/**
 * Son dakika haberlerini çek
 */
function ahenk_son_dakika_haberleri( $limit = 15 ) {
    $args = array(
        'post_type'      => array( 'haber', 'post' ),
        'post_status'    => 'publish',
        'posts_per_page' => $limit,
        'meta_query'     => array(
            array(
                'key'   => '_son_dakika',
                'value' => '1',
            ),
        ),
        'orderby'        => 'date',
        'order'          => 'DESC',
        'no_found_rows'  => true,
    );
    return new WP_Query( $args );
}

/**
 * Manşet haberlerini çek
 */
function ahenk_manset_haberleri( $limit = 5 ) {
    $args = array(
        'post_type'      => array( 'haber', 'post' ),
        'post_status'    => 'publish',
        'posts_per_page' => $limit,
        'meta_query'     => array(
            array(
                'key'   => '_manset_haberi',
                'value' => '1',
            ),
        ),
        'orderby'        => 'date',
        'order'          => 'DESC',
        'no_found_rows'  => true,
    );
    $query = new WP_Query( $args );
    // Yeterli manşet yoksa son haberleri ekle
    if ( $query->post_count < $limit ) {
        $args2 = array(
            'post_type'      => array( 'haber', 'post' ),
            'post_status'    => 'publish',
            'posts_per_page' => $limit,
            'orderby'        => 'date',
            'order'          => 'DESC',
            'no_found_rows'  => true,
        );
        $query = new WP_Query( $args2 );
    }
    return $query;
}

/**
 * Kategorinin renk kodunu al (admin'de term meta olarak saklanır)
 */
function ahenk_kategori_rengi( $term_id ) {
    $renk = get_term_meta( $term_id, 'kategori_rengi', true );
    return $renk ?: '#D4AF37';
}

/**
 * YouTube video ID'sini URL'den çıkar
 */
function ahenk_youtube_id( $url ) {
    if ( empty( $url ) ) return false;
    preg_match( '/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/', $url, $match );
    return $match[1] ?? false;
}

/**
 * YouTube thumbnail URL'si
 */
function ahenk_youtube_thumbnail( $url, $quality = 'hqdefault' ) {
    $id = ahenk_youtube_id( $url );
    if ( ! $id ) return '';
    return "https://img.youtube.com/vi/{$id}/{$quality}.jpg";
}

/**
 * Sosyal medya paylaşım URL'leri
 */
function ahenk_paylasim_linkleri( $post_id = null ) {
    $post_id  = $post_id ?: get_the_ID();
    $url      = urlencode( get_permalink( $post_id ) );
    $baslik   = urlencode( get_the_title( $post_id ) );
    return array(
        'facebook'  => "https://www.facebook.com/sharer/sharer.php?u={$url}",
        'twitter'   => "https://twitter.com/intent/tweet?url={$url}&text={$baslik}",
        'whatsapp'  => "https://api.whatsapp.com/send?text={$baslik}%20{$url}",
        'telegram'  => "https://t.me/share/url?url={$url}&text={$baslik}",
        'linkedin'  => "https://www.linkedin.com/sharing/share-offsite/?url={$url}",
    );
}

/**
 * Belirli kategoriden haberler
 */
function ahenk_kategori_haberleri( $slug, $limit = 6, $post_type = null ) {
    // Önce haber-kategorisi taxonomy'sinde ara
    $term = get_term_by( 'slug', $slug, 'haber-kategorisi' );
    // Bulamazsa standart category taxonomy'sinde ara
    if ( ! $term ) {
        $term = get_term_by( 'slug', $slug, 'category' );
    }
    if ( ! $term ) return false;

    // Post tiplerini belirle
    if ( is_null( $post_type ) ) {
        $post_type = array( 'post', 'haber' );
        // ky-makale varsa ekle
        if ( post_type_exists('ky-makale') ) {
            $post_type[] = 'ky-makale';
        }
    }

    $args = array(
        'post_type'      => $post_type,
        'post_status'    => 'publish',
        'posts_per_page' => $limit,
        'tax_query'      => array(
            array(
                'taxonomy'         => $term->taxonomy,
                'field'            => 'term_id',
                'terms'            => $term->term_id,
                'include_children' => true,
            ),
        ),
        'orderby'        => 'date',
        'order'          => 'DESC',
        'no_found_rows'  => true,
    );
    return new WP_Query( $args );
}

/**
 * Kırpılmış metin
 */
function ahenk_kirp( $metin, $uzunluk = 120, $son = '...' ) {
    $metin = wp_strip_all_tags( $metin );
    if ( mb_strlen( $metin ) <= $uzunluk ) return $metin;
    return mb_substr( $metin, 0, $uzunluk ) . $son;
}

/**
 * Thumb placeholder
 */
function ahenk_placeholder_img( $w = 600, $h = 400 ) {
    return get_template_directory_uri() . '/assets/images/placeholder.jpg';
}

/**
 * Haber thumb URL
 */
function ahenk_thumb_url( $post_id = null, $size = 'large' ) {
    $post_id = $post_id ?: get_the_ID();
    if ( has_post_thumbnail( $post_id ) ) {
        $img = wp_get_attachment_image_src( get_post_thumbnail_id( $post_id ), $size );
        return $img ? $img[0] : ahenk_placeholder_img();
    }
    return ahenk_placeholder_img();
}

// v2: Kategorinin term_meta rengini oku (admin-settings.php de kaydeder)
if ( ! function_exists('ahenk_kategori_rengi') ) {
    function ahenk_kategori_rengi( $term_id ) {
        $renk = get_term_meta( $term_id, 'kategori_rengi', true );
        return $renk ?: '#D4AF37';
    }
}

