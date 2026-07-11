<?php
/**
 * AI Haber Botu — RSS Direkt Modülü
 *
 * "Ahenk Haber Botu" eklentisinin gömülü kopyası: AI olmadan, sadece RSS/Atom
 * beslemelerinden doğrudan haber yayınlar. Tüm sınıf adları AHBRSS_ ön ekiyle
 * yeniden adlandırıldı, tablo prefiksi `ahbrss_` yapıldı.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

if ( defined( 'AHBRSS_LOADED' ) ) return;
define( 'AHBRSS_LOADED', true );

define( 'AHBRSS_VERSION',  AHB_VERSION );
define( 'AHBRSS_DIR',      plugin_dir_path( __FILE__ ) );
define( 'AHBRSS_URI',      plugin_dir_url( __FILE__ ) );

require_once AHBRSS_DIR . 'includes/class-veritabani.php';
require_once AHBRSS_DIR . 'includes/class-kampanya.php';
require_once AHBRSS_DIR . 'includes/class-feed-isleme.php';
require_once AHBRSS_DIR . 'includes/class-resim.php';
require_once AHBRSS_DIR . 'includes/class-cevirici.php';
require_once AHBRSS_DIR . 'includes/class-log.php';
require_once AHBRSS_DIR . 'includes/class-cron.php';
require_once AHBRSS_DIR . 'admin/sayfa-ana.php';

/* Aktivasyon: bu modül ana eklentinin aktivasyonunda tablo oluşturmak için çağrılır */
function ahbrss_aktivasyon() {
	AHBRSS_Veritabani::tablolari_olustur();
}

/* DB upgrade kontrolü */
add_action( 'plugins_loaded', function () {
	if ( get_option( 'ahbrss_db_version' ) !== AHBRSS_VERSION ) {
		AHBRSS_Veritabani::tablolari_olustur();
	}
}, 20 );

/* WP Init: cron ve shortcode kayıtları */
add_action( 'init', array( 'AHBRSS_Cron', 'baslat' ) );
add_action( 'init', array( 'AHBRSS_Feed_Isleme', 'init' ) );

/* Yayınlanan haberin altına "İlgili Haberler" bloğu ekle (kategori/etiket bazlı) */
add_action( 'save_post', 'ahbrss_ilgili_haberler_ekle', 50, 3 );
function ahbrss_ilgili_haberler_ekle( $post_id, $post, $update ) {
	if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) return;
	// Yalnızca AHB RSS modülünün eklediği haberlere uygula
	$kid = get_post_meta( $post_id, '_ahb_kampanya_id', true );
	if ( ! $kid ) return;
	// Zaten eklendi mi?
	if ( get_post_meta( $post_id, '_ahbrss_ilgili_eklendi', true ) ) return;

	// İlgili haberleri bul: aynı kategori/taksonomide son 30 gün içindeki en güncel 5 haber
	$tax  = 'haber-kategorisi';
	$ttax = 'haber-etiketi';
	$cat_terms = wp_get_object_terms( $post_id, $tax,  array( 'fields' => 'ids' ) );
	$tag_terms = wp_get_object_terms( $post_id, $ttax, array( 'fields' => 'ids' ) );

	$tax_query = array( 'relation' => 'OR' );
	if ( ! is_wp_error( $cat_terms ) && ! empty( $cat_terms ) ) {
		$tax_query[] = array( 'taxonomy' => $tax,  'field' => 'term_id', 'terms' => $cat_terms );
	}
	if ( ! is_wp_error( $tag_terms ) && ! empty( $tag_terms ) ) {
		$tax_query[] = array( 'taxonomy' => $ttax, 'field' => 'term_id', 'terms' => $tag_terms );
	}
	if ( count( $tax_query ) < 2 ) return;

	$ilgili = get_posts( array(
		'post_type'      => $post->post_type,
		'post_status'    => 'publish',
		'posts_per_page' => 5,
		'post__not_in'   => array( $post_id ),
		'date_query'     => array( array( 'after' => '30 days ago' ) ),
		'tax_query'      => $tax_query,
		'orderby'        => 'date',
		'order'          => 'DESC',
	) );
	if ( empty( $ilgili ) ) return;

	$blok  = "\n\n<div class=\"ahbrss-ilgili-haberler\" style=\"margin-top:24px;padding:16px;border-top:2px solid #ccc;\">";
	$blok .= "<h3 style=\"margin:0 0 12px;\">📰 Konuyla İlgili Diğer Haberler</h3>";
	$blok .= "<ul style=\"list-style:disc;padding-left:20px;margin:0;\">";
	foreach ( $ilgili as $i ) {
		$blok .= sprintf(
			"<li><a href=\"%s\">%s</a></li>",
			esc_url( get_permalink( $i ) ),
			esc_html( $i->post_title )
		);
	}
	$blok .= "</ul></div>";

	// İçeriğe ekle (sonsuz döngüye girmemek için flag set et)
	remove_action( 'save_post', 'ahbrss_ilgili_haberler_ekle', 50 );
	wp_update_post( array(
		'ID'           => $post_id,
		'post_content' => $post->post_content . $blok,
	) );
	add_action( 'save_post', 'ahbrss_ilgili_haberler_ekle', 50, 3 );

	update_post_meta( $post_id, '_ahbrss_ilgili_eklendi', 1 );
}
