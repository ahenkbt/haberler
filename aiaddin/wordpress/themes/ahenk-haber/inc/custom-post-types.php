<?php
/**
 * Ahenk Haber - Özel İçerik Türleri ve Taxonomiler
 * Tüm CPT ve taxonomy tanımları bu dosyada yönetilir.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/* ============================================================
   1. HABER CPT
   ============================================================ */
function ahenk_register_cpt_haber() {
    $labels = array(
        'name'               => 'Haberler',
        'singular_name'      => 'Haber',
        'menu_name'          => 'Haberler',
        'add_new'            => 'Yeni Haber',
        'add_new_item'       => 'Yeni Haber Ekle',
        'edit_item'          => 'Haberi Düzenle',
        'new_item'           => 'Yeni Haber',
        'view_item'          => 'Haberi Görüntüle',
        'search_items'       => 'Haber Ara',
        'not_found'          => 'Haber bulunamadı',
        'not_found_in_trash' => 'Çöp kutusunda haber bulunamadı',
    );
    $args = array(
        'labels'             => $labels,
        'public'             => true,
        'publicly_queryable' => true,
        'show_ui'            => true,
        'show_in_menu'       => true,
        'query_var'          => true,
        'rewrite'            => array( 'slug' => 'haber', 'with_front' => false ),
        'capability_type'    => 'post',
        'has_archive'        => true,
        'hierarchical'       => false,
        'menu_position'      => 5,
        'menu_icon'          => 'dashicons-newspaper',
        'supports'           => array( 'title', 'editor', 'thumbnail', 'excerpt', 'author', 'comments', 'revisions' ),
        'show_in_rest'       => true,
        'taxonomies'         => array( 'haber-kategorisi', 'haber-etiketi', 'sehir' ),
    );
    register_post_type( 'haber', $args );
}
add_action( 'init', 'ahenk_register_cpt_haber' );

/* ============================================================
   2. KÖŞE YAZISI CPT
   ============================================================ */
function ahenk_register_cpt_kose() {
    $labels = array(
        'name'          => 'Köşe Yazıları',
        'singular_name' => 'Köşe Yazısı',
        'menu_name'     => 'Köşe Yazıları',
        'add_new'       => 'Yeni Köşe Yazısı',
        'add_new_item'  => 'Yeni Köşe Yazısı Ekle',
        'edit_item'     => 'Köşe Yazısını Düzenle',
    );
    $args = array(
        'labels'          => $labels,
        'public'          => true,
        'rewrite'         => array( 'slug' => 'kose-yazisi', 'with_front' => false ),
        'capability_type' => 'post',
        'has_archive'     => true,
        'hierarchical'    => false,
        'menu_position'   => 6,
        'menu_icon'       => 'dashicons-edit',
        'supports'        => array( 'title', 'editor', 'thumbnail', 'excerpt', 'author' ),
        'show_in_rest'    => true,
    );
    register_post_type( 'kose-yazisi', $args );
}
// add_action( 'init', 'ahenk_register_cpt_kose' ); // KALDIRILDI - eklenti halleder

/* ============================================================
   3. FOTO GALERİ CPT
   ============================================================ */
function ahenk_register_cpt_foto() {
    $labels = array(
        'name'          => 'Foto Galeriler',
        'singular_name' => 'Foto Galeri',
        'menu_name'     => 'Foto Galeri',
        'add_new_item'  => 'Yeni Foto Galeri Ekle',
    );
    $args = array(
        'labels'          => $labels,
        'public'          => true,
        'rewrite'         => array( 'slug' => 'foto-galeri', 'with_front' => false ),
        'capability_type' => 'post',
        'has_archive'     => true,
        'menu_position'   => 7,
        'menu_icon'       => 'dashicons-format-gallery',
        'supports'        => array( 'title', 'editor', 'thumbnail', 'excerpt' ),
        'show_in_rest'    => true,
    );
    register_post_type( 'foto-galeri', $args );
}
add_action( 'init', 'ahenk_register_cpt_foto' );

/* ============================================================
   4. VİDEO GALERİ CPT
   ============================================================ */
function ahenk_register_cpt_video() {
    $labels = array(
        'name'          => 'Video Galeriler',
        'singular_name' => 'Video Galeri',
        'menu_name'     => 'Video Galeri',
        'add_new_item'  => 'Yeni Video Galeri Ekle',
    );
    $args = array(
        'labels'          => $labels,
        'public'          => true,
        'rewrite'         => array( 'slug' => 'video-galeri', 'with_front' => false ),
        'capability_type' => 'post',
        'has_archive'     => true,
        'menu_position'   => 8,
        'menu_icon'       => 'dashicons-video-alt3',
        'supports'        => array( 'title', 'editor', 'thumbnail', 'excerpt' ),
        'show_in_rest'    => true,
    );
    register_post_type( 'video-galeri', $args );
}
add_action( 'init', 'ahenk_register_cpt_video' );

/* ============================================================
   5. RESMİ İLAN CPT
   ============================================================ */
function ahenk_register_cpt_resmi_ilan() {
    $labels = array(
        'name'          => 'Resmi İlanlar',
        'singular_name' => 'Resmi İlan',
        'menu_name'     => 'Resmi İlanlar',
        'add_new_item'  => 'Yeni Resmi İlan Ekle',
    );
    $args = array(
        'labels'          => $labels,
        'public'          => true,
        'rewrite'         => array( 'slug' => 'resmi-ilan', 'with_front' => false ),
        'capability_type' => 'post',
        'has_archive'     => true,
        'menu_position'   => 9,
        'menu_icon'       => 'dashicons-megaphone',
        'supports'        => array( 'title', 'editor', 'thumbnail', 'excerpt' ),
        'show_in_rest'    => true,
        'taxonomies'      => array( 'ilan-turu' ),
    );
    register_post_type( 'resmi-ilan', $args );
}
add_action( 'init', 'ahenk_register_cpt_resmi_ilan' );

/* ============================================================
   6. SERİ İLAN CPT
   ============================================================ */
function ahenk_register_cpt_seri_ilan() {
    $labels = array(
        'name'          => 'Seri İlanlar',
        'singular_name' => 'Seri İlan',
        'menu_name'     => 'Seri İlanlar',
        'add_new_item'  => 'Yeni Seri İlan Ekle',
    );
    $args = array(
        'labels'          => $labels,
        'public'          => true,
        'rewrite'         => array( 'slug' => 'seri-ilan', 'with_front' => false ),
        'capability_type' => 'post',
        'has_archive'     => true,
        'menu_position'   => 10,
        'menu_icon'       => 'dashicons-tag',
        'supports'        => array( 'title', 'editor', 'thumbnail', 'excerpt', 'author' ),
        'show_in_rest'    => true,
        'taxonomies'      => array( 'seri-ilan-kategorisi' ),
    );
    register_post_type( 'seri-ilan', $args );
}
add_action( 'init', 'ahenk_register_cpt_seri_ilan' );

/* ============================================================
   TAXONOMİLER
   ============================================================ */
function ahenk_register_taxonomies() {

    // Haber Kategorisi
    register_taxonomy( 'haber-kategorisi', array( 'haber', 'post' ), array(
        'hierarchical'      => true,
        'labels'            => array(
            'name'              => 'Haber Kategorileri',
            'singular_name'     => 'Haber Kategorisi',
            'search_items'      => 'Kategori Ara',
            'all_items'         => 'Tüm Kategoriler',
            'parent_item'       => 'Üst Kategori',
            'edit_item'         => 'Kategoriyi Düzenle',
            'add_new_item'      => 'Yeni Kategori Ekle',
            'menu_name'         => 'Kategoriler',
        ),
        'show_ui'           => true,
        'show_admin_column' => true,
        'rewrite'           => array( 'slug' => 'kategori', 'with_front' => false ),
        'show_in_rest'      => true,
    ));

    // Haber Etiketi
    register_taxonomy( 'haber-etiketi', array( 'haber', 'post' ), array(
        'hierarchical'      => false,
        'labels'            => array(
            'name'          => 'Haber Etiketleri',
            'singular_name' => 'Haber Etiketi',
            'add_new_item'  => 'Yeni Etiket Ekle',
        ),
        'show_ui'           => true,
        'show_admin_column' => true,
        'rewrite'           => array( 'slug' => 'etiket', 'with_front' => false ),
        'show_in_rest'      => true,
    ));

    // Şehir
    register_taxonomy( 'sehir', array( 'haber', 'post', 'resmi-ilan', 'seri-ilan' ), array(
        'hierarchical'      => false,
        'labels'            => array(
            'name'          => 'Şehirler',
            'singular_name' => 'Şehir',
            'add_new_item'  => 'Yeni Şehir Ekle',
        ),
        'show_ui'           => true,
        'show_admin_column' => true,
        'rewrite'           => array( 'slug' => 'sehir', 'with_front' => false ),
        'show_in_rest'      => true,
    ));

    // İlan Türü (Resmi İlan)
    register_taxonomy( 'ilan-turu', array( 'resmi-ilan' ), array(
        'hierarchical'      => true,
        'labels'            => array(
            'name'          => 'İlan Türleri',
            'singular_name' => 'İlan Türü',
            'add_new_item'  => 'Yeni İlan Türü Ekle',
        ),
        'show_ui'           => true,
        'show_admin_column' => true,
        'rewrite'           => array( 'slug' => 'ilan-turu', 'with_front' => false ),
        'show_in_rest'      => true,
    ));

    // Seri İlan Kategorisi
    register_taxonomy( 'seri-ilan-kategorisi', array( 'seri-ilan' ), array(
        'hierarchical'      => true,
        'labels'            => array(
            'name'          => 'Seri İlan Kategorileri',
            'singular_name' => 'Seri İlan Kategorisi',
            'add_new_item'  => 'Yeni Kategori Ekle',
        ),
        'show_ui'           => true,
        'show_admin_column' => true,
        'rewrite'           => array( 'slug' => 'seri-ilan-kategorisi', 'with_front' => false ),
        'show_in_rest'      => true,
    ));
}
add_action( 'init', 'ahenk_register_taxonomies' );

/* ============================================================
   META BOX - HABER DETAY ALANLARI
   ============================================================ */
function ahenk_add_haber_meta_boxes() {
    add_meta_box(
        'ahenk_haber_detay',
        'Haber Detay Bilgileri',
        'ahenk_haber_meta_box_cb',
        array( 'haber', 'post' ),
        'side',
        'high'
    );
}
add_action( 'add_meta_boxes', 'ahenk_add_haber_meta_boxes' );

function ahenk_haber_meta_box_cb( $post ) {
    wp_nonce_field( 'ahenk_haber_meta_nonce', 'ahenk_nonce' );
    $son_dakika  = get_post_meta( $post->ID, '_son_dakika', true );
    $manset      = get_post_meta( $post->ID, '_manset_haberi', true );
    $spot        = get_post_meta( $post->ID, '_haber_spot', true );
    $video_url   = get_post_meta( $post->ID, '_video_url', true );
    $okuma       = get_post_meta( $post->ID, '_okuma_suresi', true );
    ?>
    <p>
        <label>
            <input type="checkbox" name="son_dakika" value="1" <?php checked( $son_dakika, '1' ); ?> />
            <strong style="color:#d4af37;">⚡ Son Dakika Haberi</strong>
        </label>
    </p>
    <p>
        <label>
            <input type="checkbox" name="manset_haberi" value="1" <?php checked( $manset, '1' ); ?> />
            <strong>🗞 Manşet Haberi</strong>
        </label>
    </p>
    <p>
        <label><strong>Haber Spotu</strong> (160 karakter)<br>
        <textarea name="haber_spot" rows="3" style="width:100%;" maxlength="160"><?php echo esc_textarea( $spot ); ?></textarea>
        </label>
    </p>
    <p>
        <label><strong>Video URL</strong> (YouTube/Vimeo)<br>
        <input type="url" name="video_url" value="<?php echo esc_url( $video_url ); ?>" style="width:100%;" />
        </label>
    </p>
    <p>
        <label><strong>Okuma Süresi</strong> (dk)<br>
        <input type="number" name="okuma_suresi" value="<?php echo esc_attr( $okuma ); ?>" style="width:70px;" min="1" max="60" />
        </label>
    </p>
    <?php
}

function ahenk_save_haber_meta( $post_id ) {
    if ( ! isset( $_POST['ahenk_nonce'] ) ) return;
    if ( ! wp_verify_nonce( $_POST['ahenk_nonce'], 'ahenk_haber_meta_nonce' ) ) return;
    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
    if ( ! current_user_can( 'edit_post', $post_id ) ) return;

    update_post_meta( $post_id, '_son_dakika',    isset( $_POST['son_dakika'] ) ? '1' : '0' );
    update_post_meta( $post_id, '_manset_haberi', isset( $_POST['manset_haberi'] ) ? '1' : '0' );
    update_post_meta( $post_id, '_haber_spot',    sanitize_textarea_field( $_POST['haber_spot'] ?? '' ) );
    update_post_meta( $post_id, '_video_url',     esc_url_raw( $_POST['video_url'] ?? '' ) );
    update_post_meta( $post_id, '_okuma_suresi',  absint( $_POST['okuma_suresi'] ?? 0 ) );
}
add_action( 'save_post', 'ahenk_save_haber_meta' );

/* ============================================================
   YAZAR GENİŞLETİLMİŞ PROFİL META ALANLARI
   ============================================================ */
function ahenk_yazar_profil_alanlari( $user ) {
    if ( ! current_user_can( 'edit_user', $user->ID ) ) return;
    $unvan  = get_user_meta( $user->ID, 'yazar_unvani', true );
    $kose   = get_user_meta( $user->ID, 'kose_baslik', true );
    $twitter = get_user_meta( $user->ID, 'yazar_twitter', true );
    $instagram = get_user_meta( $user->ID, 'yazar_instagram', true );
    ?>
    <h3>Ahenk Haber - Yazar Bilgileri</h3>
    <table class="form-table">
        <tr><th><label>Unvan</label></th>
            <td><input type="text" name="yazar_unvani" value="<?php echo esc_attr($unvan); ?>" class="regular-text" /></td></tr>
        <tr><th><label>Köşe Başlığı</label></th>
            <td><input type="text" name="kose_baslik" value="<?php echo esc_attr($kose); ?>" class="regular-text" /></td></tr>
        <tr><th><label>Twitter / X</label></th>
            <td><input type="text" name="yazar_twitter" value="<?php echo esc_attr($twitter); ?>" class="regular-text" placeholder="@kullaniciadi" /></td></tr>
        <tr><th><label>Instagram</label></th>
            <td><input type="text" name="yazar_instagram" value="<?php echo esc_attr($instagram); ?>" class="regular-text" placeholder="@kullaniciadi" /></td></tr>
    </table>
    <?php
    wp_nonce_field( 'ahenk_yazar_meta_nonce', 'ahenk_yazar_nonce' );
}
add_action( 'show_user_profile', 'ahenk_yazar_profil_alanlari' );
add_action( 'edit_user_profile', 'ahenk_yazar_profil_alanlari' );

function ahenk_save_yazar_meta( $user_id ) {
    if ( ! wp_verify_nonce( $_POST['ahenk_yazar_nonce'] ?? '', 'ahenk_yazar_meta_nonce' ) ) return;
    if ( ! current_user_can( 'edit_user', $user_id ) ) return;
    update_user_meta( $user_id, 'yazar_unvani',   sanitize_text_field( $_POST['yazar_unvani'] ?? '' ) );
    update_user_meta( $user_id, 'kose_baslik',    sanitize_text_field( $_POST['kose_baslik'] ?? '' ) );
    update_user_meta( $user_id, 'yazar_twitter',  sanitize_text_field( $_POST['yazar_twitter'] ?? '' ) );
    update_user_meta( $user_id, 'yazar_instagram', sanitize_text_field( $_POST['yazar_instagram'] ?? '' ) );
}
add_action( 'personal_options_update', 'ahenk_save_yazar_meta' );
add_action( 'edit_user_profile_update', 'ahenk_save_yazar_meta' );
