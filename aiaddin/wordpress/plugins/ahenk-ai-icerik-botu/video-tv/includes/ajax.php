<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class VTV_Ajax {

    public static function init() {
        $actions = array(
            'vtv_get_anasayfa',
            'vtv_get_kanal',
            'vtv_get_kanal_playlistler',
            'vtv_get_playlist_videolar',
            'vtv_get_video_meta',
            'vtv_get_video_aciklama',
            'vtv_arama',
            // Admin actions
            'vtv_add_kaynak',
            'vtv_update_kaynak',
            'vtv_delete_kaynak',
            'vtv_toggle_kaynak',
            'vtv_refresh_kaynak',
            'vtv_add_playlist',
            'vtv_delete_playlist',
            'vtv_refresh_playlist',
            'vtv_add_video',
            'vtv_delete_video',
            'vtv_toggle_one_cikan',
            'vtv_toggle_manset',
            'vtv_toggle_hikaye',
            'vtv_save_ayarlar',
            'vtv_add_kategori',
            'vtv_delete_kategori',
            'vtv_get_kategoriler',
            'vtv_fetch_kanal_meta',
            'vtv_import_preset',
        );
        foreach ( $actions as $a ) {
            add_action( 'wp_ajax_' . $a,        array( __CLASS__, 'dispatch' ) );
            add_action( 'wp_ajax_nopriv_' . $a, array( __CLASS__, 'dispatch' ) );
        }
    }

    public static function dispatch() {
        $action = isset($_POST['action']) ? sanitize_key($_POST['action']) : '';
        if ( ! $action ) { wp_send_json_error('No action'); }
        $method = str_replace('vtv_', 'do_', $action);
        if ( method_exists(__CLASS__, $method) ) {
            call_user_func( array(__CLASS__, $method) );
        } else {
            wp_send_json_error('Unknown action: ' . $action);
        }
    }

    /* =========================================================
     * NONCE YARDIMCI
     * ======================================================= */
    private static function verify_nonce() {
        $nonce = isset($_POST['nonce']) ? $_POST['nonce'] : '';
        if ( ! wp_verify_nonce($nonce, 'vtv_nonce') ) {
            wp_send_json_error('Gecersiz istek. Sayfayi yenileyip tekrar deneyin.');
        }
    }

    /* =========================================================
     * ANA SAYFA
     * ======================================================= */
    public static function do_get_anasayfa() {
        $populer_limit   = (int) VTV_DB::get_ayar('populer_limit', 8);
        $one_cikan_limit = (int) VTV_DB::get_ayar('one_cikan_limit', 5);

        $one_cikanlar     = VTV_DB::get_videolar( array('one_cikan'=>1,'limit'=>$one_cikan_limit) );
        $bugun            = VTV_DB::get_videolar( array('limit'=>20) );
        $karma            = VTV_DB::get_videolar( array('limit'=>28) );
        $populer_kanallar = VTV_DB::get_kaynaklar( array('aktif'=>1,'populer'=>1,'limit'=>$populer_limit) );
        $kategoriler      = VTV_DB::get_kategoriler(true);
        $kaynaklar        = VTV_DB::get_kaynaklar( array('aktif'=>1) );

        // Meta eksik popüler kanallar için arka planda çek
        foreach ( $populer_kanallar as $k ) {
            if ( $k->tip !== 'kanal' ) { continue; }
            $has_logo = isset($k->kanal_logo) ? $k->kanal_logo : '';
            if ( empty($has_logo) ) {
                $meta = self::fetch_meta_for_kaynak($k);
                if ( ! empty($meta) ) { VTV_DB::update_kaynak($k->id, $meta); }
            }
        }
        $populer_kanallar = VTV_DB::get_kaynaklar( array('aktif'=>1,'populer'=>1,'limit'=>$populer_limit) );

        wp_send_json_success( array(
            'one_cikanlar'     => $one_cikanlar,
            'bugun'            => $bugun,
            'karma'            => $karma,
            'populer_kanallar' => $populer_kanallar,
            'kategoriler'      => $kategoriler,
            'kaynaklar'        => $kaynaklar,
        ));
    }

    /* =========================================================
     * KANAL DETAY
     * ======================================================= */
    public static function do_get_kanal() {
        $id     = intval( isset($_POST['kaynak_id']) ? $_POST['kaynak_id'] : 0 );
        $kaynak = VTV_DB::get_kaynak($id);
        if ( ! $kaynak ) { wp_send_json_error('Kanal bulunamadi'); }
        $videolar = VTV_DB::get_videolar( array('kaynak_id'=>$id,'limit'=>500) );

        // Meta eksikse otomatik çek
        if ( $kaynak->tip === 'kanal' ) {
            $has_logo = isset($kaynak->kanal_logo) ? $kaynak->kanal_logo : '';
            if ( empty($has_logo) ) {
                $meta = self::fetch_meta_for_kaynak($kaynak);
                if ( ! empty($meta) ) {
                    VTV_DB::update_kaynak($id, $meta);
                    $kaynak = VTV_DB::get_kaynak($id);
                }
            }
        }

        // Kanal açıklamasını temizle
        if ( isset($kaynak->kanal_aciklama) && $kaynak->kanal_aciklama ) {
            $kaynak->kanal_aciklama = VTV_Fetch::temizle_aciklama($kaynak->kanal_aciklama);
        }

        wp_send_json_success( array('kaynak'=>$kaynak,'videolar'=>$videolar) );
    }

    /* =========================================================
     * KANAL PLAYLİSTLERİ
     * ======================================================= */
    public static function do_get_kanal_playlistler() {
        $kaynak_id = intval( isset($_POST['kaynak_id']) ? $_POST['kaynak_id'] : 0 );
        if ( ! $kaynak_id ) { wp_send_json_error('Kaynak ID gerekli'); }
        $kaynak   = VTV_DB::get_kaynak($kaynak_id);
        if ( ! $kaynak ) { wp_send_json_error('Kaynak bulunamadi'); }
        $listeler = VTV_DB::get_playlistler($kaynak_id);
        wp_send_json_success( array('kaynak'=>$kaynak, 'playlistler'=>$listeler) );
    }

    /* =========================================================
     * PLAYLİST VİDEOLARI
     * ======================================================= */
    public static function do_get_playlist_videolar() {
        $pl_db_id = intval( isset($_POST['playlist_id_db']) ? $_POST['playlist_id_db'] : 0 );
        if ( ! $pl_db_id ) { wp_send_json_error('Playlist ID gerekli'); }
        $pl = VTV_DB::get_playlist($pl_db_id);
        if ( ! $pl ) { wp_send_json_error('Playlist bulunamadi'); }
        $videos = VTV_DB::get_playlist_videolar($pl_db_id, 1000);
        // Boşsa çek
        if ( empty($videos) && $pl->playlist_id ) {
            $fetched = VTV_Fetch::yt_playlist_videos($pl->playlist_id, 1000);
            foreach ($fetched as $i => $v) {
                $v['sira'] = $i + 1;
                $v['bolum'] = $i + 1;
                VTV_DB::upsert_playlist_video($pl_db_id, $v);
            }
            if ( ! empty($fetched) ) {
                global $wpdb;
                $wpdb->update( $wpdb->prefix . 'vtv_playlistler',
                    array('video_sayisi'=>count($fetched),'son_guncelle'=>current_time('mysql')),
                    array('id'=>$pl_db_id)
                );
            }
            $videos = VTV_DB::get_playlist_videolar($pl_db_id, 1000);
        }
        wp_send_json_success( array('playlist'=>$pl,'videolar'=>$videos) );
    }

    /* =========================================================
     * VİDEO META (Permalink için)
     * ======================================================= */
    public static function do_get_video_meta() {
        $vid      = sanitize_text_field( isset($_POST['video_id']) ? $_POST['video_id'] : '' );
        $platform = sanitize_text_field( isset($_POST['platform']) ? $_POST['platform'] : 'youtube' );
        if ( ! $vid ) { wp_send_json_error('Video ID gerekli'); }

        global $wpdb;
        $row = $wpdb->get_row( $wpdb->prepare(
            "SELECT v.*, k.isim as kaynak_isim, k.id as k_id, k.kanal_aciklama, k.kanal_logo
             FROM {$wpdb->prefix}vtv_videolar v
             LEFT JOIN {$wpdb->prefix}vtv_kaynaklar k ON v.kaynak_id = k.id
             WHERE v.video_id = %s AND v.aktif = 1 LIMIT 1", $vid
        ));

        if ( $row ) {
            wp_send_json_success(array(
                'video_id'    => $row->video_id,
                'baslik'      => $row->baslik,
                'thumbnail'   => $row->thumbnail,
                'kanal_ismi'  => $row->kanal_ismi ?: $row->kaynak_isim,
                'platform'    => $row->platform,
                'sure'        => $row->sure,
                'yayin_tarihi'=> $row->yayin_tarihi,
                'kaynak_id'   => $row->k_id,
            ));
        }

        if ($platform === 'youtube') {
            $meta = VTV_Fetch::yt_video_meta($vid);
        } else {
            $meta = VTV_Fetch::dm_video_meta($vid);
        }
        if ($meta) { wp_send_json_success($meta); }
        wp_send_json_error('Video bulunamadi');
    }

    /* =========================================================
     * VİDEO AÇIKLAMASI
     * ======================================================= */
    public static function do_get_video_aciklama() {
        $vid      = sanitize_text_field( isset($_POST['video_id']) ? $_POST['video_id'] : '' );
        $platform = sanitize_text_field( isset($_POST['platform']) ? $_POST['platform'] : 'youtube' );
        if ( ! $vid ) { wp_send_json_error('Video ID gerekli'); }

        global $wpdb;
        $aciklama = $wpdb->get_var( $wpdb->prepare(
            "SELECT aciklama FROM {$wpdb->prefix}vtv_videolar WHERE video_id=%s AND aciklama != '' LIMIT 1", $vid
        ));
        if ( ! $aciklama ) {
            $aciklama = $wpdb->get_var( $wpdb->prepare(
                "SELECT aciklama FROM {$wpdb->prefix}vtv_playlist_videolar WHERE video_id=%s AND aciklama != '' LIMIT 1", $vid
            ));
        }
        if ( ! $aciklama && $platform === 'youtube' ) {
            $aciklama = VTV_Fetch::yt_video_aciklama($vid);
            if ( $aciklama ) {
                $wpdb->query( $wpdb->prepare(
                    "UPDATE {$wpdb->prefix}vtv_videolar SET aciklama=%s WHERE video_id=%s AND aciklama=''",
                    $aciklama, $vid
                ));
            }
        }
        $aciklama = VTV_Fetch::temizle_aciklama($aciklama);
        wp_send_json_success( array('aciklama' => $aciklama ?: '') );
    }

    /* =========================================================
     * ARAMA
     * ======================================================= */
    public static function do_arama() {
        $q = sanitize_text_field( isset($_POST['q']) ? $_POST['q'] : '' );
        if ( strlen($q) < 2 ) {
            wp_send_json_success( array('local'=>array(),'yt_url'=>'','dm_url'=>'') );
        }
        $local  = VTV_DB::get_videolar( array('arama'=>$q,'limit'=>24) );
        $yt_url = 'https://www.youtube.com/results?search_query=' . urlencode($q);
        $dm_url = 'https://www.dailymotion.com/search/' . urlencode($q);
        wp_send_json_success( array('local'=>$local,'yt_url'=>$yt_url,'dm_url'=>$dm_url,'q'=>$q) );
    }

    /* =========================================================
     * KAYNAK EKLE (kanal eklerken tüm playlistleri de çek)
     * ======================================================= */
    public static function do_add_kaynak() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();

        $tip       = sanitize_text_field( isset($_POST['tip'])       ? $_POST['tip']       : '' );
        $platform  = sanitize_text_field( isset($_POST['platform'])  ? $_POST['platform']  : 'youtube' );
        $isim      = sanitize_text_field( isset($_POST['isim'])      ? $_POST['isim']      : '' );
        $deger     = sanitize_text_field( isset($_POST['deger'])     ? $_POST['deger']     : '' );
        $kat_id    = intval(              isset($_POST['kategori_id'])? $_POST['kategori_id']: 0 );
        $populer   = intval(              isset($_POST['populer'])   ? $_POST['populer']   : 0 );
        $aciklama  = sanitize_textarea_field( isset($_POST['aciklama']) ? $_POST['aciklama'] : '' );

        if ( ! $tip || ! $isim || ! $deger ) { wp_send_json_error('Zorunlu alan eksik'); }

        $row = array(
            'tip'=>$tip,'platform'=>$platform,'isim'=>$isim,
            'aciklama'=>$aciklama,'kategori_id'=>$kat_id,'populer'=>$populer,'aktif'=>1,
        );

        if ( $tip === 'kanal' )         { $row['kanal_url'] = $deger; }
        elseif ( $tip === 'playlist' )  {
            $pid = ($platform === 'youtube') ? VTV_Fetch::extract_yt_playlist_id($deger) : $deger;
            if ( ! $pid ) { wp_send_json_error('Gecersiz playlist'); }
            $row['playlist_id'] = $pid;
        } elseif ( $tip === 'video' )   {
            $vid = ($platform === 'youtube') ? VTV_Fetch::extract_yt_video_id($deger) : VTV_Fetch::extract_dm_video_id($deger);
            if ( ! $vid ) { wp_send_json_error('Gecersiz video ID'); }
            $row['video_id'] = $vid;
        } elseif ( $tip === 'canli' )   {
            $row['video_id'] = $deger;
            $row['kanal_url'] = isset($_POST['kanal_url']) ? sanitize_text_field($_POST['kanal_url']) : '';
        }

        $id     = VTV_DB::insert_kaynak($row);
        $videos = self::scrape($id, $tip, $platform, $row);
        $count  = 0;
        foreach ( $videos as $i => $v ) {
            $v['sira']        = $i;
            $v['kategori_id'] = $kat_id;
            VTV_DB::upsert_video($id, $v);
            $count++;
        }
        if ( $count ) { VTV_DB::update_kaynak($id, array('son_guncelle'=>current_time('mysql'))); }

        // Kanal ise meta + playlistleri otomatik çek
        $pl_count = 0;
        if ( $tip === 'kanal' && $platform === 'youtube' ) {
            // Meta çek
            $kaynak = VTV_DB::get_kaynak($id);
            $meta   = self::fetch_meta_for_kaynak($kaynak);
            if ( ! empty($meta) ) { VTV_DB::update_kaynak($id, $meta); }

            // Playlistleri çek
            $playlists = VTV_Fetch::yt_kanal_playlistleri($deger, 30);
            foreach ($playlists as $pl) {
                $pl_db_id = VTV_DB::upsert_playlist($id, array(
                    'playlist_id'  => $pl['playlist_id'],
                    'platform'     => 'youtube',
                    'isim'         => $pl['isim'],
                    'thumbnail'    => $pl['thumbnail'],
                    'video_sayisi' => $pl['video_sayisi'],
                    'tip'          => 'playlist',
                    'aktif'        => 1,
                    'son_guncelle' => current_time('mysql'),
                ));
                $pl_count++;
                // Playlist videolarını arka planda değil, isteğe bağlı bırak
            }
        }

        wp_send_json_success( array(
            'id'       => $id,
            'count'    => $count,
            'pl_count' => $pl_count,
            'msg'      => "{$count} video, {$pl_count} playlist eklendi.",
        ));
    }

    /* =========================================================
     * KAYNAK GÜNCELLE
     * ======================================================= */
    public static function do_update_kaynak() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();

        $id      = intval( isset($_POST['id']) ? $_POST['id'] : 0 );
        $isim    = sanitize_text_field(isset($_POST['isim'])    ? $_POST['isim']    : '');
        $aciklama= sanitize_textarea_field(isset($_POST['aciklama']) ? $_POST['aciklama'] : '');
        $kat_id  = intval(isset($_POST['kategori_id']) ? $_POST['kategori_id'] : 0);
        $populer = intval(isset($_POST['populer'])     ? $_POST['populer']     : 0);
        $aktif   = intval(isset($_POST['aktif'])       ? $_POST['aktif']       : 1);
        $deger   = sanitize_text_field(isset($_POST['deger']) ? $_POST['deger'] : '');

        if ( ! $id || ! $isim ) { wp_send_json_error('ID ve isim zorunlu'); }
        $kaynak = VTV_DB::get_kaynak($id);
        if ( ! $kaynak ) { wp_send_json_error('Kaynak bulunamadi'); }

        $update = array(
            'isim'=>$isim,'aciklama'=>$aciklama,
            'kategori_id'=>$kat_id,'populer'=>$populer,'aktif'=>$aktif,
        );
        if ( $deger ) {
            if ( $kaynak->tip === 'kanal' )   { $update['kanal_url']   = $deger; }
            if ( $kaynak->tip === 'playlist' ) { $update['playlist_id'] = $deger; }
            if ( $kaynak->tip === 'video' )    { $update['video_id']    = $deger; }
        }
        VTV_DB::update_kaynak($id, $update);
        wp_send_json_success( array('msg'=>'Guncellendi.') );
    }

    /* =========================================================
     * KAYNAK SİL
     * ======================================================= */
    public static function do_delete_kaynak() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();
        $id = intval( isset($_POST['kaynak_id']) ? $_POST['kaynak_id'] : 0 );
        VTV_DB::delete_kaynak($id);
        wp_send_json_success();
    }

    /* =========================================================
     * KAYNAK TOGGLE
     * ======================================================= */
    public static function do_toggle_kaynak() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();
        $id  = intval( isset($_POST['kaynak_id']) ? $_POST['kaynak_id'] : 0 );
        $val = intval( isset($_POST['aktif'])      ? $_POST['aktif']      : 0 );
        VTV_DB::update_kaynak($id, array('aktif'=>$val));
        wp_send_json_success();
    }

    /* =========================================================
     * KAYNAK YENİLE
     * ======================================================= */
    public static function do_refresh_kaynak() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();
        $id  = intval( isset($_POST['kaynak_id']) ? $_POST['kaynak_id'] : 0 );
        $src = VTV_DB::get_kaynak($id);
        if ( ! $src ) { wp_send_json_error('Kaynak bulunamadi'); }
        $row     = (array) $src;
        $videos  = self::scrape($id, $src->tip, $src->platform, $row);
        $count   = 0;
        foreach ($videos as $i => $v) {
            $v['sira'] = $i;
            $v['kategori_id'] = $src->kategori_id;
            VTV_DB::upsert_video($id, $v);
            $count++;
        }
        VTV_DB::update_kaynak($id, array('son_guncelle'=>current_time('mysql')));
        wp_send_json_success( array('count'=>$count) );
    }

    /* =========================================================
     * PLAYLİST EKLE (bağımsız - nonce fix)
     * ======================================================= */
    public static function do_add_playlist() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();

        // Tabloların var olduğundan emin ol
        VTV_DB::ensure_playlist_tables();

        $kaynak_id = intval( isset($_POST['kaynak_id'])  ? $_POST['kaynak_id']  : 0 );
        $pl_url    = sanitize_text_field( isset($_POST['playlist_url']) ? $_POST['playlist_url'] : '' );
        $isim      = sanitize_text_field( isset($_POST['isim'])         ? $_POST['isim']         : '' );
        $tip       = sanitize_text_field( isset($_POST['tip'])          ? $_POST['tip']          : 'playlist' );
        $sezon     = intval( isset($_POST['sezon'])  ? $_POST['sezon']  : 0 );

        if ( ! $kaynak_id ) { wp_send_json_error('Kanal seçilmedi (kaynak_id=0). Sayfayı yenileyip tekrar deneyin.'); }
        if ( ! $pl_url )    { wp_send_json_error('Playlist URL veya ID boş'); }

        $pl_id = VTV_Fetch::extract_yt_playlist_id($pl_url);
        if ( ! $pl_id ) {
            wp_send_json_error('Geçersiz playlist URL. Örnek: https://youtube.com/playlist?list=PLxxxxxx — Girilen değer: ' . $pl_url);
        }

        $kaynak = VTV_DB::get_kaynak($kaynak_id);
        if ( ! $kaynak ) { wp_send_json_error('Kaynak bulunamadı (id=' . $kaynak_id . ')'); }

        @set_time_limit(300);
        $videos = VTV_Fetch::yt_playlist_videos($pl_id, 1000);

        $thumb = '';
        if ( ! empty($videos) ) { $thumb = $videos[0]['thumbnail']; }
        if ( ! $isim && ! empty($videos) ) {
            $isim = isset($videos[0]['kanal_ismi']) ? $videos[0]['kanal_ismi'] . ' Playlist' : $pl_id;
        }
        if ( ! $isim ) { $isim = $pl_id; }

        $pl_db_id = VTV_DB::upsert_playlist($kaynak_id, array(
            'playlist_id'  => $pl_id,
            'platform'     => $kaynak->platform,
            'isim'         => $isim,
            'thumbnail'    => $thumb,
            'video_sayisi' => count($videos),
            'tip'          => $tip,
            'sezon'        => $sezon,
            'aktif'        => 1,
            'son_guncelle' => current_time('mysql'),
        ));

        if ( ! $pl_db_id ) {
            global $wpdb;
            wp_send_json_error('Playlist DB\'ye kaydedilemedi. DB Hatası: ' . $wpdb->last_error);
        }

        $saved = 0;
        foreach ($videos as $i => $v) {
            $v['sira']  = $i + 1;
            $v['bolum'] = $i + 1;
            VTV_DB::upsert_playlist_video($pl_db_id, $v);
            $saved++;
        }

        wp_send_json_success(array(
            'id'    => $pl_db_id,
            'count' => $saved,
            'isim'  => $isim,
        ));
    }

    /* =========================================================
     * PLAYLİST SİL
     * ======================================================= */
    public static function do_delete_playlist() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();
        $id = intval( isset($_POST['playlist_id_db']) ? $_POST['playlist_id_db'] : 0 );
        VTV_DB::delete_playlist($id);
        wp_send_json_success();
    }

    /* =========================================================
     * PLAYLİST YENİLE
     * ======================================================= */
    public static function do_refresh_playlist() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();
        $id = intval( isset($_POST['playlist_id_db']) ? $_POST['playlist_id_db'] : 0 );
        $pl = VTV_DB::get_playlist($id);
        if ( ! $pl ) { wp_send_json_error('Playlist bulunamadi'); }
        @set_time_limit(180);
        $videos = VTV_Fetch::yt_playlist_videos($pl->playlist_id, 1000);
        if ( empty($videos) ) { wp_send_json_error('Video cekilemedi'); }
        foreach ($videos as $i => $v) {
            $v['sira']  = $i + 1;
            $v['bolum'] = $i + 1;
            VTV_DB::upsert_playlist_video($id, $v);
        }
        global $wpdb;
        $wpdb->update($wpdb->prefix.'vtv_playlistler',
            array('video_sayisi'=>count($videos),'son_guncelle'=>current_time('mysql')),
            array('id'=>$id)
        );
        wp_send_json_success( array('count'=>count($videos)) );
    }

    /* =========================================================
     * TEKİL VİDEO EKLE
     * ======================================================= */
    public static function do_add_video() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();
        $kid      = intval( isset($_POST['kaynak_id'])  ? $_POST['kaynak_id']  : 0 );
        $url      = sanitize_text_field( isset($_POST['video_url']) ? $_POST['video_url'] : '' );
        $platform = sanitize_text_field( isset($_POST['platform'])  ? $_POST['platform']  : 'youtube' );

        if ($platform === 'youtube') {
            $vid  = VTV_Fetch::extract_yt_video_id($url);
            $meta = $vid ? VTV_Fetch::yt_video_meta($vid) : false;
        } else {
            $vid  = VTV_Fetch::extract_dm_video_id($url);
            $meta = $vid ? VTV_Fetch::dm_video_meta($vid) : false;
        }
        if ( ! $meta ) { wp_send_json_error('Video bilgisi alinamadi'); }
        $src = VTV_DB::get_kaynak($kid);
        $meta['kategori_id'] = $src ? $src->kategori_id : 0;
        VTV_DB::upsert_video($kid, $meta);
        wp_send_json_success($meta);
    }

    /* =========================================================
     * VİDEO SİL
     * ======================================================= */
    public static function do_delete_video() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();
        $id = intval( isset($_POST['video_id']) ? $_POST['video_id'] : 0 );
        VTV_DB::soft_delete_video($id);
        wp_send_json_success();
    }

    /* =========================================================
     * ÖNE ÇIKAN TOGGLE
     * ======================================================= */
    public static function do_toggle_one_cikan() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();
        $id  = intval( isset($_POST['video_id']) ? $_POST['video_id'] : 0 );
        $val = intval( isset($_POST['val'])       ? $_POST['val']      : 0 );
        VTV_DB::toggle_video_one_cikan($id, $val);
        wp_send_json_success();
    }

    /* MANŞET TOGGLE — videoyu anasayfa manşet slider'ına ekler/çıkarır */
    public static function do_toggle_manset() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();
        $id  = intval( isset($_POST['video_id']) ? $_POST['video_id'] : 0 );
        $val = intval( isset($_POST['val'])       ? $_POST['val']      : 0 );
        VTV_DB::toggle_video_manset($id, $val);
        wp_send_json_success();
    }

    /* HİKAYE TOGGLE — videoyu hikaye baloncuklarına ekler/çıkarır */
    public static function do_toggle_hikaye() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();
        $id  = intval( isset($_POST['video_id']) ? $_POST['video_id'] : 0 );
        $val = intval( isset($_POST['val'])       ? $_POST['val']      : 0 );
        VTV_DB::toggle_video_hikaye($id, $val);
        wp_send_json_success();
    }

    /* =========================================================
     * AYARLAR KAYDET
     * ======================================================= */
    public static function do_save_ayarlar() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();
        $ayarlar = array('populer_limit','kategori_limit','one_cikan_limit','site_basligi','banner_video_id','banner_platform');
        foreach ($ayarlar as $a) {
            if ( isset($_POST[$a]) ) { VTV_DB::set_ayar($a, sanitize_text_field($_POST[$a])); }
        }
        wp_send_json_success();
    }

    /* =========================================================
     * KATEGORİ EKLE
     * ======================================================= */
    public static function do_add_kategori() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();
        $isim = sanitize_text_field( isset($_POST['isim']) ? $_POST['isim'] : '' );
        $renk = sanitize_text_field( isset($_POST['renk']) ? $_POST['renk'] : '#3B82F6' );
        $ikon = sanitize_text_field( isset($_POST['ikon']) ? $_POST['ikon'] : '' );
        if ( ! $isim ) { wp_send_json_error('Isim zorunlu'); }
        $slug = sanitize_title($isim);
        $id   = VTV_DB::insert_kategori( array('isim'=>$isim,'slug'=>$slug,'renk'=>$renk,'ikon'=>$ikon,'aktif'=>1) );
        wp_send_json_success( array('id'=>$id,'isim'=>$isim,'slug'=>$slug,'renk'=>$renk,'ikon'=>$ikon) );
    }

    /* =========================================================
     * KATEGORİ SİL
     * ======================================================= */
    public static function do_delete_kategori() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();
        $id = intval( isset($_POST['kategori_id']) ? $_POST['kategori_id'] : 0 );
        VTV_DB::delete_kategori($id);
        wp_send_json_success();
    }

    /* =========================================================
     * KATEGORİLERİ GETİR
     * ======================================================= */
    public static function do_get_kategoriler() {
        $cats = VTV_DB::get_kategoriler(false);
        wp_send_json_success($cats);
    }

    /* =========================================================
     * KANAL META YENİLE
     * ======================================================= */
    public static function do_fetch_kanal_meta() {
        $id     = intval( isset($_POST['kaynak_id']) ? $_POST['kaynak_id'] : 0 );
        $kaynak = VTV_DB::get_kaynak($id);
        if ( ! $kaynak ) { wp_send_json_error('Kanal bulunamadi'); }
        $meta = self::fetch_meta_for_kaynak($kaynak);
        if ( empty($meta) ) { wp_send_json_error('Meta cekilemedi'); }
        VTV_DB::update_kaynak($id, $meta);
        wp_send_json_success($meta);
    }

    /* =========================================================
     * PRESET KANAL AKTAR
     * ======================================================= */
    public static function do_import_preset() {
        if ( ! current_user_can('manage_options') ) { wp_send_json_error('Yetki yok'); }
        self::verify_nonce();
        @set_time_limit(300);

        $kat_slug  = sanitize_text_field( isset($_POST['kategori_slug']) ? $_POST['kategori_slug'] : '' );
        $fetch     = intval( isset($_POST['fetch_videos']) ? $_POST['fetch_videos'] : 0 );
        $all       = VTV_Channels_Preset::get_all();
        $results   = array();

        $to_import = ($kat_slug && isset($all[$kat_slug])) ? array($kat_slug=>$all[$kat_slug]) : $all;

        $kat_meta_map = array(
            'Haberler' => array('#EF4444','📰'), 'Tarih' => array('#F59E0B','🏛️'),
            'Bilim'    => array('#3B82F6','🔬'), 'Saglik' => array('#10B981','💚'),
            'Eglence'  => array('#8B5CF6','🎭'), 'Spor'   => array('#F97316','⚽'),
        );

        foreach ( $to_import as $kat_name => $kanallar ) {
            $cats   = VTV_DB::get_kategoriler(false);
            $kat_id = 0;
            foreach ($cats as $c) {
                if ( mb_strtolower($c->isim) === mb_strtolower($kat_name) ) { $kat_id=(int)$c->id; break; }
            }
            if ( ! $kat_id ) {
                $km     = isset($kat_meta_map[$kat_name]) ? $kat_meta_map[$kat_name] : array('#6B7280','📺');
                $kat_id = (int) VTV_DB::insert_kategori(array(
                    'isim'=>$kat_name,'slug'=>sanitize_title($kat_name),'renk'=>$km[0],'ikon'=>$km[1],'aktif'=>1
                ));
            }
            if ( ! $kat_id ) { $results[] = array('isim'=>"[$kat_name]",'status'=>'err'); continue; }

            foreach ($kanallar as $kanal) {
                global $wpdb;
                $existing = (int) $wpdb->get_var( $wpdb->prepare(
                    "SELECT id FROM {$wpdb->prefix}vtv_kaynaklar WHERE kanal_url=%s LIMIT 1", $kanal['url']
                ));
                if ( $existing ) { $results[]=array('isim'=>$kanal['isim'],'status'=>'skip'); continue; }

                $new_id = (int) VTV_DB::insert_kaynak(array(
                    'tip'=>'kanal','platform'=>'youtube',
                    'isim'=>sanitize_text_field($kanal['isim']),
                    'aciklama'=>sanitize_text_field($kanal['aciklama']),
                    'kanal_url'=>sanitize_text_field($kanal['url']),
                    'kategori_id'=>$kat_id,'populer'=>0,'aktif'=>1,
                ));
                if ( ! $new_id ) { $results[]=array('isim'=>$kanal['isim'],'status'=>'err'); continue; }

                $vc = 0;
                if ($fetch) {
                    $videos = VTV_Fetch::yt_kanal_videos($kanal['url'], 30);
                    foreach ($videos as $vi=>$v) { $v['sira']=$vi; $v['kategori_id']=$kat_id; VTV_DB::upsert_video($new_id,$v); $vc++; }
                    if ($vc) { VTV_DB::update_kaynak($new_id, array('son_guncelle'=>current_time('mysql'))); }
                }
                $results[] = array('isim'=>$kanal['isim'],'status'=>'ok','id'=>$new_id,'videos'=>$vc);
            }
        }

        $added   = count(array_filter($results, function($r){return $r['status']==='ok';}));
        $skipped = count(array_filter($results, function($r){return $r['status']==='skip';}));
        wp_send_json_success(array('results'=>$results,'added'=>$added,'skipped'=>$skipped));
    }

    /* =========================================================
     * YARDIMCI: Scrape
     * ======================================================= */
    private static function scrape($id, $tip, $platform, $row) {
        if ($tip === 'video') {
            $vid  = isset($row['video_id']) ? $row['video_id'] : '';
            if (!$vid) {return array();}
            $meta = ($platform==='youtube') ? VTV_Fetch::yt_video_meta($vid) : VTV_Fetch::dm_video_meta($vid);
            return $meta ? array($meta) : array();
        }
        if ($tip === 'playlist') {
            $pid = isset($row['playlist_id']) ? $row['playlist_id'] : '';
            if (!$pid) {return array();}
            return ($platform==='youtube') ? VTV_Fetch::yt_playlist_videos($pid,500) : VTV_Fetch::dm_playlist_videos($pid,100);
        }
        if ($tip === 'kanal') {
            $src = isset($row['kanal_url']) && $row['kanal_url'] ? $row['kanal_url'] : '';
            if (!$src) {return array();}
            return ($platform==='youtube') ? VTV_Fetch::yt_kanal_videos($src,200) : VTV_Fetch::dm_kanal_videos($src,100);
        }
        return array();
    }

    /* =========================================================
     * YARDIMCI: Meta çek
     * ======================================================= */
    private static function fetch_meta_for_kaynak( $kaynak ) {
        $platform = $kaynak->platform;
        $src      = $kaynak->kanal_url ? $kaynak->kanal_url : ($kaynak->kanal_id ? $kaynak->kanal_id : '');
        if (!$src) {return array();}
        $raw = ($platform === 'youtube') ? VTV_Fetch::yt_kanal_meta($src) : VTV_Fetch::dm_kanal_meta($src);
        if (empty($raw)) {return array();}
        return array(
            'kanal_logo'       => isset($raw['logo'])       ? $raw['logo']       : '',
            'kanal_banner'     => isset($raw['banner'])      ? $raw['banner']     : '',
            'kanal_aciklama'   => isset($raw['aciklama'])    ? VTV_Fetch::temizle_aciklama($raw['aciklama']) : '',
            'kanal_ismi_gercek'=> isset($raw['kanal_ismi']) ? $raw['kanal_ismi'] : '',
            'abone_sayisi'     => isset($raw['abone'])       ? $raw['abone']      : '',
            'meta_guncelleme'  => current_time('mysql'),
        );
    }
}
