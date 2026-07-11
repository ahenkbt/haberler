<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class VTV_DB {

    public static function init() {
        self::maybe_upgrade();
    }

    /* =========================================================
     * TABLO OLUŞTURMA
     * ======================================================= */
    public static function create_tables() {
        global $wpdb;
        $c = $wpdb->get_charset_collate();
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        dbDelta( "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}vtv_kategoriler (
            id         bigint(20)  NOT NULL AUTO_INCREMENT,
            isim       varchar(200) NOT NULL DEFAULT '',
            slug       varchar(200) NOT NULL DEFAULT '',
            aciklama   text,
            renk       varchar(20)  NOT NULL DEFAULT '#3B82F6',
            ikon       varchar(50)  NOT NULL DEFAULT '',
            sira       int(11)      NOT NULL DEFAULT 0,
            aktif      tinyint(1)   NOT NULL DEFAULT 1,
            created_at datetime     DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $c;" );

        dbDelta( "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}vtv_kaynaklar (
            id               bigint(20)   NOT NULL AUTO_INCREMENT,
            tip              varchar(20)  NOT NULL DEFAULT 'kanal',
            platform         varchar(20)  NOT NULL DEFAULT 'youtube',
            isim             varchar(300) NOT NULL DEFAULT '',
            aciklama         text,
            kapak_resmi      varchar(500) NOT NULL DEFAULT '',
            logo             varchar(500) NOT NULL DEFAULT '',
            kanal_logo       varchar(500) NOT NULL DEFAULT '',
            kanal_banner     varchar(500) NOT NULL DEFAULT '',
            kanal_aciklama   text,
            kanal_ismi_gercek varchar(300) NOT NULL DEFAULT '',
            abone_sayisi     varchar(50)  NOT NULL DEFAULT '',
            meta_guncelleme  datetime DEFAULT NULL,
            kanal_url        varchar(500) NOT NULL DEFAULT '',
            kanal_id         varchar(200) NOT NULL DEFAULT '',
            playlist_id      varchar(200) NOT NULL DEFAULT '',
            video_id         varchar(100) NOT NULL DEFAULT '',
            kategori_id      bigint(20)   NOT NULL DEFAULT 0,
            populer          tinyint(1)   NOT NULL DEFAULT 0,
            one_cikan        tinyint(1)   NOT NULL DEFAULT 0,
            sira             int(11)      NOT NULL DEFAULT 0,
            aktif            tinyint(1)   NOT NULL DEFAULT 1,
            son_guncelle     datetime     DEFAULT NULL,
            created_at       datetime     DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $c;" );

        dbDelta( "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}vtv_videolar (
            id           bigint(20)   NOT NULL AUTO_INCREMENT,
            kaynak_id    bigint(20)   NOT NULL DEFAULT 0,
            platform     varchar(20)  NOT NULL DEFAULT 'youtube',
            video_id     varchar(100) NOT NULL DEFAULT '',
            baslik       varchar(500) NOT NULL DEFAULT '',
            aciklama     text,
            thumbnail    varchar(500) NOT NULL DEFAULT '',
            kanal_ismi   varchar(300) NOT NULL DEFAULT '',
            kanal_id     varchar(200) NOT NULL DEFAULT '',
            yayin_tarihi varchar(50)  NOT NULL DEFAULT '',
            sure         varchar(20)  NOT NULL DEFAULT '',
            kategori_id  bigint(20)   NOT NULL DEFAULT 0,
            one_cikan    tinyint(1)   NOT NULL DEFAULT 0,
            manset       tinyint(1)   NOT NULL DEFAULT 0,
            hikaye       tinyint(1)   NOT NULL DEFAULT 0,
            sira         int(11)      NOT NULL DEFAULT 0,
            aktif        tinyint(1)   NOT NULL DEFAULT 1,
            created_at   datetime     DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $c;" );

        // Eski kurulumda tablo varsa kolonları sonradan ekle (idempotent)
        self::ensure_video_flag_columns();

        dbDelta( "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}vtv_playlistler (
            id           bigint(20)   NOT NULL AUTO_INCREMENT,
            kaynak_id    bigint(20)   NOT NULL DEFAULT 0,
            platform     varchar(20)  NOT NULL DEFAULT 'youtube',
            playlist_id  varchar(200) NOT NULL DEFAULT '',
            isim         varchar(500) NOT NULL DEFAULT '',
            aciklama     text,
            thumbnail    varchar(500) NOT NULL DEFAULT '',
            video_sayisi int(11)      NOT NULL DEFAULT 0,
            tip          varchar(20)  NOT NULL DEFAULT 'playlist',
            sezon        int(11)      NOT NULL DEFAULT 0,
            sira         int(11)      NOT NULL DEFAULT 0,
            aktif        tinyint(1)   NOT NULL DEFAULT 1,
            son_guncelle datetime     DEFAULT NULL,
            created_at   datetime     DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $c;" );

        dbDelta( "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}vtv_playlist_videolar (
            id             bigint(20)   NOT NULL AUTO_INCREMENT,
            playlist_id_db bigint(20)   NOT NULL DEFAULT 0,
            kaynak_id      bigint(20)   NOT NULL DEFAULT 0,
            platform       varchar(20)  NOT NULL DEFAULT 'youtube',
            video_id       varchar(100) NOT NULL DEFAULT '',
            baslik         varchar(500) NOT NULL DEFAULT '',
            thumbnail      varchar(500) NOT NULL DEFAULT '',
            kanal_ismi     varchar(300) NOT NULL DEFAULT '',
            yayin_tarihi   varchar(50)  NOT NULL DEFAULT '',
            sure           varchar(20)  NOT NULL DEFAULT '',
            aciklama       text,
            sezon          int(11)      NOT NULL DEFAULT 0,
            bolum          int(11)      NOT NULL DEFAULT 0,
            sira           int(11)      NOT NULL DEFAULT 0,
            aktif          tinyint(1)   NOT NULL DEFAULT 1,
            PRIMARY KEY (id),
            UNIQUE KEY vid_pl (video_id, playlist_id_db)
        ) $c;" );

        dbDelta( "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}vtv_ayarlar (
            ayar_adi   varchar(100) NOT NULL,
            ayar_deger text,
            PRIMARY KEY (ayar_adi)
        ) $c;" );

        $wpdb->query( "INSERT IGNORE INTO {$wpdb->prefix}vtv_ayarlar (ayar_adi, ayar_deger) VALUES
            ('populer_limit', '8'),
            ('kategori_limit', '6'),
            ('one_cikan_limit', '5'),
            ('site_basligi', 'Video TV'),
            ('banner_video_id', ''),
            ('banner_platform', 'youtube')
        " );

        $cats = array(
            array( 'Haberler', 'haberler', '#EF4444', 'haberler' ),
            array( 'Tarih',    'tarih',    '#F59E0B', 'tarih' ),
            array( 'Bilim',    'bilim',    '#3B82F6', 'bilim' ),
            array( 'Saglik',   'saglik',   '#10B981', 'saglik' ),
            array( 'Eglence',  'eglence',  '#8B5CF6', 'eglence' ),
            array( 'Spor',     'spor',     '#F97316', 'spor' ),
        );
        foreach ( $cats as $i => $cat ) {
            $wpdb->query( $wpdb->prepare(
                "INSERT IGNORE INTO {$wpdb->prefix}vtv_kategoriler (isim, slug, renk, ikon, sira) VALUES (%s, %s, %s, %s, %d)",
                $cat[0], $cat[1], $cat[2], $cat[3], $i
            ) );
        }
    }

    /* =========================================================
     * VERİTABANI YÜKSELTME (mevcut kurulumlar için)
     * ======================================================= */
    public static function maybe_upgrade() {
        global $wpdb;

        // Ana tablo yoksa sıfırdan oluştur
        $tbl = $wpdb->prefix . 'vtv_kaynaklar';
        if ( $wpdb->get_var( "SHOW TABLES LIKE '$tbl'" ) !== $tbl ) {
            self::create_tables();
            return;
        }

        // Mevcut kolonları kontrol et, eksikleri ekle
        $existing = array_column(
            $wpdb->get_results( "SHOW COLUMNS FROM {$wpdb->prefix}vtv_kaynaklar", ARRAY_A ),
            'Field'
        );

        $new_cols = array(
            'kanal_logo'        => "ALTER TABLE {$wpdb->prefix}vtv_kaynaklar ADD COLUMN kanal_logo varchar(500) NOT NULL DEFAULT ''",
            'kanal_banner'      => "ALTER TABLE {$wpdb->prefix}vtv_kaynaklar ADD COLUMN kanal_banner varchar(500) NOT NULL DEFAULT ''",
            'kanal_aciklama'    => "ALTER TABLE {$wpdb->prefix}vtv_kaynaklar ADD COLUMN kanal_aciklama text",
            'kanal_ismi_gercek' => "ALTER TABLE {$wpdb->prefix}vtv_kaynaklar ADD COLUMN kanal_ismi_gercek varchar(300) NOT NULL DEFAULT ''",
            'abone_sayisi'      => "ALTER TABLE {$wpdb->prefix}vtv_kaynaklar ADD COLUMN abone_sayisi varchar(50) NOT NULL DEFAULT ''",
            'meta_guncelleme'   => "ALTER TABLE {$wpdb->prefix}vtv_kaynaklar ADD COLUMN meta_guncelleme datetime DEFAULT NULL",
        );

        foreach ( $new_cols as $col => $sql ) {
            if ( ! in_array( $col, $existing, true ) ) {
                $wpdb->query( $sql );
            }
        }

        // vtv_videolar — aciklama kolonu
        $vtbl = $wpdb->prefix . 'vtv_videolar';
        if ( $wpdb->get_var( "SHOW TABLES LIKE '$vtbl'" ) === $vtbl ) {
            $vcols = array_column(
                $wpdb->get_results( "SHOW COLUMNS FROM {$wpdb->prefix}vtv_videolar", ARRAY_A ),
                'Field'
            );
            if ( ! in_array( 'aciklama', $vcols, true ) ) {
                $wpdb->query( "ALTER TABLE {$wpdb->prefix}vtv_videolar ADD COLUMN aciklama text" );
            }
        }

        // vtv_playlistler tabloları — ensure metoduna delege et
        self::ensure_playlist_tables();
    }

    /* =========================================================
     * AYARLAR
     * ======================================================= */
    public static function get_ayar( $adi, $varsayilan = '' ) {
        global $wpdb;
        $val = $wpdb->get_var( $wpdb->prepare(
            "SELECT ayar_deger FROM {$wpdb->prefix}vtv_ayarlar WHERE ayar_adi = %s", $adi
        ) );
        return $val !== null ? $val : $varsayilan;
    }

    public static function set_ayar( $adi, $deger ) {
        global $wpdb;
        $wpdb->query( $wpdb->prepare(
            "INSERT INTO {$wpdb->prefix}vtv_ayarlar (ayar_adi, ayar_deger) VALUES (%s, %s)
             ON DUPLICATE KEY UPDATE ayar_deger = VALUES(ayar_deger)",
            $adi, $deger
        ) );
    }

    /* =========================================================
     * KATEGORİLER
     * ======================================================= */
    public static function get_kategoriler( $sadece_aktif = true ) {
        global $wpdb;
        $w = $sadece_aktif ? 'WHERE aktif = 1' : '';
        return $wpdb->get_results( "SELECT * FROM {$wpdb->prefix}vtv_kategoriler $w ORDER BY sira ASC, id ASC" );
    }

    public static function get_kategori( $id ) {
        global $wpdb;
        return $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}vtv_kategoriler WHERE id = %d", intval($id)
        ) );
    }

    public static function insert_kategori( $data ) {
        global $wpdb;
        $wpdb->insert( $wpdb->prefix . 'vtv_kategoriler', $data );
        return (int) $wpdb->insert_id;
    }

    public static function update_kategori( $id, $data ) {
        global $wpdb;
        $wpdb->update( $wpdb->prefix . 'vtv_kategoriler', $data, array( 'id' => intval($id) ) );
    }

    public static function delete_kategori( $id ) {
        global $wpdb;
        $wpdb->delete( $wpdb->prefix . 'vtv_kategoriler', array( 'id' => intval($id) ) );
    }

    /* =========================================================
     * KAYNAKLAR
     * ======================================================= */
    public static function get_kaynaklar( $args = array() ) {
        global $wpdb;
        $where   = array( '1=1' );
        $orderby = 'sira ASC, id ASC';
        $limit   = '';

        if ( isset($args['aktif']) && intval($args['aktif']) >= 0 ) {
            $where[] = 'aktif = ' . intval($args['aktif']);
        }
        if ( ! empty($args['kategori_id']) ) { $where[] = $wpdb->prepare( 'kategori_id = %d', intval($args['kategori_id']) ); }
        if ( ! empty($args['populer']) )     { $where[] = 'populer = 1'; }
        if ( ! empty($args['tip']) )         { $where[] = $wpdb->prepare( 'tip = %s', $args['tip'] ); }
        if ( isset($args['limit']) )         { $limit = 'LIMIT ' . intval($args['limit']); }

        $sql = "SELECT * FROM {$wpdb->prefix}vtv_kaynaklar WHERE " . implode(' AND ', $where) . " ORDER BY $orderby $limit";
        return $wpdb->get_results( $sql );
    }

    public static function get_kaynak( $id ) {
        global $wpdb;
        return $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}vtv_kaynaklar WHERE id = %d", intval($id)
        ) );
    }

    public static function insert_kaynak( $data ) {
        global $wpdb;
        $wpdb->insert( $wpdb->prefix . 'vtv_kaynaklar', $data );
        return (int) $wpdb->insert_id;
    }

    public static function update_kaynak( $id, $data ) {
        global $wpdb;
        $wpdb->update( $wpdb->prefix . 'vtv_kaynaklar', $data, array( 'id' => intval($id) ) );
    }

    public static function delete_kaynak( $id ) {
        global $wpdb;
        $wpdb->delete( $wpdb->prefix . 'vtv_kaynaklar', array( 'id' => intval($id) ) );
        $wpdb->delete( $wpdb->prefix . 'vtv_videolar',  array( 'kaynak_id' => intval($id) ) );
    }

    /* =========================================================
     * VİDEOLAR
     * ======================================================= */
    public static function get_videolar( $args = array() ) {
        global $wpdb;
        $where = array( 'v.aktif = 1' );
        $limit = 'LIMIT 200';

        if ( ! empty($args['kaynak_id']) )   { $where[] = $wpdb->prepare( 'v.kaynak_id = %d', intval($args['kaynak_id']) ); }
        if ( ! empty($args['kategori_id']) ) { $where[] = $wpdb->prepare( 'v.kategori_id = %d', intval($args['kategori_id']) ); }
        if ( ! empty($args['one_cikan']) )   { $where[] = 'v.one_cikan = 1'; }
        if ( ! empty($args['manset']) )      { $where[] = 'v.manset = 1'; }
        if ( ! empty($args['hikaye']) )      { $where[] = 'v.hikaye = 1'; }
        if ( ! empty($args['platform']) )    { $where[] = $wpdb->prepare( 'v.platform = %s', $args['platform'] ); }
        if ( ! empty($args['arama']) ) {
            $like    = '%' . $wpdb->esc_like( $args['arama'] ) . '%';
            $where[] = $wpdb->prepare( '(v.baslik LIKE %s OR v.kanal_ismi LIKE %s)', $like, $like );
        }
        if ( isset($args['limit']) ) { $limit = 'LIMIT ' . intval($args['limit']); }

        $sql = "SELECT v.*, k.isim as kaynak_isim, k.kategori_id as k_kategori
                FROM {$wpdb->prefix}vtv_videolar v
                LEFT JOIN {$wpdb->prefix}vtv_kaynaklar k ON v.kaynak_id = k.id
                WHERE " . implode(' AND ', $where) . "
                ORDER BY v.one_cikan DESC, v.sira ASC, v.id DESC $limit";
        return $wpdb->get_results( $sql );
    }

    public static function get_video_count( $kaynak_id ) {
        global $wpdb;
        return (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}vtv_videolar WHERE kaynak_id = %d AND aktif = 1",
            intval($kaynak_id)
        ) );
    }

    public static function upsert_video( $kaynak_id, $data ) {
        global $wpdb;
        $kaynak_id = intval($kaynak_id);
        $vid       = isset($data['video_id']) ? sanitize_text_field($data['video_id']) : '';
        if ( ! $vid ) { return; }
        $existing = $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}vtv_videolar WHERE video_id = %s AND kaynak_id = %d LIMIT 1",
            $vid, $kaynak_id
        ) );
        $data['kaynak_id'] = $kaynak_id;
        if ( $existing ) {
            $wpdb->update( $wpdb->prefix . 'vtv_videolar', $data, array( 'id' => intval($existing) ) );
        } else {
            $wpdb->insert( $wpdb->prefix . 'vtv_videolar', $data );
        }
    }

    public static function soft_delete_video( $id ) {
        global $wpdb;
        $wpdb->update( $wpdb->prefix . 'vtv_videolar', array( 'aktif' => 0 ), array( 'id' => intval($id) ) );
    }

    public static function toggle_video_one_cikan( $id, $val ) {
        global $wpdb;
        $wpdb->update( $wpdb->prefix . 'vtv_videolar', array( 'one_cikan' => intval($val) ), array( 'id' => intval($id) ) );
    }

    public static function toggle_video_manset( $id, $val ) {
        global $wpdb;
        self::ensure_video_flag_columns();
        $wpdb->update( $wpdb->prefix . 'vtv_videolar', array( 'manset' => intval($val) ), array( 'id' => intval($id) ) );
    }

    public static function toggle_video_hikaye( $id, $val ) {
        global $wpdb;
        self::ensure_video_flag_columns();
        $wpdb->update( $wpdb->prefix . 'vtv_videolar', array( 'hikaye' => intval($val) ), array( 'id' => intval($id) ) );
    }

    /**
     * Eski kurulumlarda vtv_videolar tablosuna manset/hikaye kolonlarını ekler.
     * Idempotent: kolon zaten varsa hiçbir şey yapmaz.
     */
    public static function ensure_video_flag_columns() {
        global $wpdb;
        static $checked = false;
        if ( $checked ) return;
        $tbl = $wpdb->prefix . 'vtv_videolar';
        if ( $wpdb->get_var( "SHOW TABLES LIKE '$tbl'" ) !== $tbl ) { return; }
        $cols = $wpdb->get_col( "SHOW COLUMNS FROM $tbl" );
        if ( ! in_array( 'manset', $cols, true ) ) {
            $wpdb->query( "ALTER TABLE $tbl ADD COLUMN manset tinyint(1) NOT NULL DEFAULT 0 AFTER one_cikan" );
        }
        if ( ! in_array( 'hikaye', $cols, true ) ) {
            $wpdb->query( "ALTER TABLE $tbl ADD COLUMN hikaye tinyint(1) NOT NULL DEFAULT 0 AFTER manset" );
        }
        $checked = true;
    }

    /* =========================================================
     * PLAYLİST TABLOLARININ VARLIĞINI GARANTI ET
     * Eski kurulumda tablo yoksa anında oluştur
     * ======================================================= */
    public static function ensure_playlist_tables() {
        global $wpdb;
        $tbl = $wpdb->prefix . 'vtv_playlistler';
        if ( $wpdb->get_var( "SHOW TABLES LIKE '$tbl'" ) === $tbl ) { return; } // zaten var

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $c = $wpdb->get_charset_collate();

        dbDelta( "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}vtv_playlistler (
            id           bigint(20)   NOT NULL AUTO_INCREMENT,
            kaynak_id    bigint(20)   NOT NULL DEFAULT 0,
            platform     varchar(20)  NOT NULL DEFAULT 'youtube',
            playlist_id  varchar(200) NOT NULL DEFAULT '',
            isim         varchar(500) NOT NULL DEFAULT '',
            aciklama     text,
            thumbnail    varchar(500) NOT NULL DEFAULT '',
            video_sayisi int(11)      NOT NULL DEFAULT 0,
            tip          varchar(20)  NOT NULL DEFAULT 'playlist',
            sezon        int(11)      NOT NULL DEFAULT 0,
            sira         int(11)      NOT NULL DEFAULT 0,
            aktif        tinyint(1)   NOT NULL DEFAULT 1,
            son_guncelle datetime     DEFAULT NULL,
            created_at   datetime     DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $c;" );

        dbDelta( "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}vtv_playlist_videolar (
            id             bigint(20)   NOT NULL AUTO_INCREMENT,
            playlist_id_db bigint(20)   NOT NULL DEFAULT 0,
            kaynak_id      bigint(20)   NOT NULL DEFAULT 0,
            platform       varchar(20)  NOT NULL DEFAULT 'youtube',
            video_id       varchar(100) NOT NULL DEFAULT '',
            baslik         varchar(500) NOT NULL DEFAULT '',
            thumbnail      varchar(500) NOT NULL DEFAULT '',
            kanal_ismi     varchar(300) NOT NULL DEFAULT '',
            yayin_tarihi   varchar(50)  NOT NULL DEFAULT '',
            sure           varchar(20)  NOT NULL DEFAULT '',
            aciklama       text,
            sezon          int(11)      NOT NULL DEFAULT 0,
            bolum          int(11)      NOT NULL DEFAULT 0,
            sira           int(11)      NOT NULL DEFAULT 0,
            aktif          tinyint(1)   NOT NULL DEFAULT 1,
            PRIMARY KEY (id),
            UNIQUE KEY vid_pl (video_id, playlist_id_db)
        ) $c;" );
    }

    /* =========================================================
     * PLAYLİSTLER
     * ======================================================= */
    public static function get_playlistler( $kaynak_id ) {
        global $wpdb;
        return $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}vtv_playlistler WHERE kaynak_id = %d AND aktif = 1 ORDER BY sezon ASC, sira ASC, id ASC",
            intval($kaynak_id)
        ) );
    }

    public static function get_playlist( $id ) {
        global $wpdb;
        return $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}vtv_playlistler WHERE id = %d",
            intval($id)
        ) );
    }

    public static function upsert_playlist( $kaynak_id, $data ) {
        global $wpdb;
        $kaynak_id = intval($kaynak_id);
        $plid      = isset($data['playlist_id']) ? sanitize_text_field($data['playlist_id']) : '';
        if ( ! $plid ) { return 0; }
        $existing = $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}vtv_playlistler WHERE playlist_id = %s AND kaynak_id = %d LIMIT 1",
            $plid, $kaynak_id
        ) );
        $data['kaynak_id'] = $kaynak_id;
        if ( $existing ) {
            $wpdb->update( $wpdb->prefix . 'vtv_playlistler', $data, array( 'id' => intval($existing) ) );
            return intval($existing);
        } else {
            $wpdb->insert( $wpdb->prefix . 'vtv_playlistler', $data );
            return (int) $wpdb->insert_id;
        }
    }

    public static function delete_playlist( $id ) {
        global $wpdb;
        $wpdb->delete( $wpdb->prefix . 'vtv_playlistler',       array( 'id' => intval($id) ) );
        $wpdb->delete( $wpdb->prefix . 'vtv_playlist_videolar', array( 'playlist_id_db' => intval($id) ) );
    }

    public static function get_playlist_videolar( $playlist_id_db, $limit = 500 ) {
        global $wpdb;
        return $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}vtv_playlist_videolar WHERE playlist_id_db = %d AND aktif = 1 ORDER BY sezon ASC, bolum ASC, sira ASC LIMIT %d",
            intval($playlist_id_db), intval($limit)
        ) );
    }

    public static function upsert_playlist_video( $playlist_id_db, $data ) {
        global $wpdb;
        $pid = intval($playlist_id_db);
        $vid = isset($data['video_id']) ? sanitize_text_field($data['video_id']) : '';
        if ( ! $vid ) { return; }
        $existing = $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}vtv_playlist_videolar WHERE video_id = %s AND playlist_id_db = %d LIMIT 1",
            $vid, $pid
        ) );
        $data['playlist_id_db'] = $pid;
        if ( $existing ) {
            $wpdb->update( $wpdb->prefix . 'vtv_playlist_videolar', $data, array( 'id' => intval($existing) ) );
        } else {
            $wpdb->insert( $wpdb->prefix . 'vtv_playlist_videolar', $data );
        }
    }
}
