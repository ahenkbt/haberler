<?php
/**
 * AHB - Veritabani Sinifi v1.2
 * v1.2.0: cross-source duplicate detection (baslik+icerik hash global), duplicate temizle
 */
if ( ! defined('ABSPATH') ) exit;

class AHBRSS_Veritabani {

    // Tablo adlari
    public static function t_kampanya()  { global $wpdb; return $wpdb->prefix . 'ahbrss_kampanyalar'; }
    public static function t_islenen()   { global $wpdb; return $wpdb->prefix . 'ahbrss_islenen_linkler'; }
    public static function t_log()       { global $wpdb; return $wpdb->prefix . 'ahbrss_loglar'; }

    public static function tablolari_olustur() {
        global $wpdb;
        $charset = $wpdb->get_charset_collate();
        $t_k = self::t_kampanya();
        $t_i = self::t_islenen();
        $t_l = self::t_log();

        $sql1 = "CREATE TABLE IF NOT EXISTS `{$t_k}` (
            `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `ad`                VARCHAR(255) NOT NULL,
            `durum`             TINYINT(1) NOT NULL DEFAULT 1,
            `kaynak_tipi`       VARCHAR(30) NOT NULL DEFAULT 'rss',
            `beslemeler`        LONGTEXT NOT NULL,
            `post_turu`         VARCHAR(50) NOT NULL DEFAULT 'haber',
            `kategori_id`       INT UNSIGNED NOT NULL DEFAULT 0,
            `etiketler`         VARCHAR(500) NOT NULL DEFAULT '',
            `haber_basi`        TINYINT(1) NOT NULL DEFAULT 0,
            `son_dakika_kelime` VARCHAR(500) NOT NULL DEFAULT 'son dakika,acil,flas,breaking',
            `cevirisi_yap`      TINYINT(1) NOT NULL DEFAULT 0,
            `ceviri_dil_kaynak` VARCHAR(10) NOT NULL DEFAULT 'en',
            `ceviri_dil_hedef`  VARCHAR(10) NOT NULL DEFAULT 'tr',
            `ceviri_motor`      VARCHAR(20) NOT NULL DEFAULT 'google',
            `resim_indir`       TINYINT(1) NOT NULL DEFAULT 1,
            `min_kelime`        SMALLINT UNSIGNED NOT NULL DEFAULT 20,
            `max_haber_gun`     TINYINT UNSIGNED NOT NULL DEFAULT 7,
            `her_kac_dakika`    SMALLINT UNSIGNED NOT NULL DEFAULT 30,
            `max_post_gun`      SMALLINT UNSIGNED NOT NULL DEFAULT 5,
            `son_calistirma`    INT UNSIGNED NOT NULL DEFAULT 0,
            `toplam_eklenen`    INT UNSIGNED NOT NULL DEFAULT 0,
            `ayarlar`           TEXT NOT NULL,
            `olusturulma`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) $charset;";

        $sql2 = "CREATE TABLE IF NOT EXISTS `{$t_i}` (
            `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `kampanya_id`   INT UNSIGNED NOT NULL,
            `link_hash`     CHAR(32) NOT NULL,
            `link_url`      VARCHAR(2000) NOT NULL,
            `baslik_hash`   CHAR(32) NOT NULL DEFAULT '',
            `icerik_hash`   CHAR(32) NOT NULL DEFAULT '',
            `post_id`       INT UNSIGNED NOT NULL DEFAULT 0,
            `tarih`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `link_hash` (`link_hash`),
            KEY `kampanya_id` (`kampanya_id`),
            KEY `baslik_hash` (`baslik_hash`),
            KEY `icerik_hash` (`icerik_hash`)
        ) $charset;";

        $sql3 = "CREATE TABLE IF NOT EXISTS `{$t_l}` (
            `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `kampanya_id`   INT UNSIGNED NOT NULL DEFAULT 0,
            `kampanya_adi`  VARCHAR(255) NOT NULL DEFAULT '',
            `eylem`         VARCHAR(100) NOT NULL,
            `mesaj`         TEXT NOT NULL,
            `seviye`        VARCHAR(10) NOT NULL DEFAULT 'bilgi',
            `tarih`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `kampanya_id` (`kampanya_id`),
            KEY `tarih` (`tarih`)
        ) $charset;";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql1);
        dbDelta($sql2);
        dbDelta($sql3);

        // v1.2.0 - icerik_hash kolonu sonradan eklenmisse
        $kolon = $wpdb->get_var("SHOW COLUMNS FROM {$t_i} LIKE 'icerik_hash'");
        if ( ! $kolon ) {
            $wpdb->query("ALTER TABLE {$t_i} ADD COLUMN `icerik_hash` CHAR(32) NOT NULL DEFAULT '' AFTER `baslik_hash`, ADD KEY `icerik_hash` (`icerik_hash`)");
        }

        update_option('ahbrss_db_version', AHBRSS_VERSION);

        if ( ! get_option('ahbrss_ornek_eklendi') ) {
            self::ornek_kampanyalar_ekle();
            update_option('ahbrss_ornek_eklendi', '1');
        }
    }

    public static function ornek_kampanyalar_ekle() {
        $ornekler = array(
            array('NTV Haber',      "https://www.ntv.com.tr/gundem/rss\nhttps://www.ntv.com.tr/ekonomi/rss\nhttps://www.ntv.com.tr/spor/rss", 30),
            array('Sabah Gazetesi', "https://www.sabah.com.tr/rss/anabasliklar.xml\nhttps://www.sabah.com.tr/rss/ekonomi.xml", 30),
            array('Hurriyet',       "https://www.hurriyet.com.tr/rss/anasayfa\nhttps://www.hurriyet.com.tr/rss/ekonomi", 30),
            array('Sozcu Gazetesi', "https://www.sozcu.com.tr/feed/", 30),
            array('TRT Haber',      "https://www.trthaber.com/sondakika.rss\nhttps://www.trthaber.com/gundem.rss", 15),
            array('Haberler.com',   "https://www.haberler.com/rss/", 20),
            array('Milliyet',       "https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml\nhttps://www.milliyet.com.tr/rss/rssNew/ekonomiRss.xml", 30),
            array('CNN Turk',       "https://www.cnnturk.com/feed/rss/turkiye", 30),
            array('BBC Turkce',     "https://feeds.bbci.co.uk/turkce/rss.xml", 60),
            array('DW Turkce',      "https://rss.dw.com/rdf/rss-tur-all", 60),
            array('Turk.eco Ekoloji', "https://turk.eco/tr/rss/category/ekoloji", 60),
        );
        $t = self::t_kampanya();
        global $wpdb;
        foreach ($ornekler as $o) {
            $wpdb->insert($t, array(
                'ad'             => $o[0],
                'durum'          => 0,
                'beslemeler'     => $o[1],
                'her_kac_dakika' => $o[2],
                'ayarlar'        => '{}',
            ));
        }
    }

    public static function kampanya_listesi( $durum = null ) {
        global $wpdb;
        $t = self::t_kampanya();
        if ( $durum !== null ) {
            $w = $wpdb->prepare('WHERE durum = %d', intval($durum));
        } else {
            $w = '';
        }
        return $wpdb->get_results("SELECT * FROM {$t} {$w} ORDER BY id DESC");
    }

    public static function kampanya_getir( $id ) {
        global $wpdb;
        return $wpdb->get_row($wpdb->prepare("SELECT * FROM " . self::t_kampanya() . " WHERE id = %d", intval($id)));
    }

    public static function kampanya_kaydet( $data, $id = 0 ) {
        global $wpdb;
        $t = self::t_kampanya();
        if ( intval($id) > 0 ) {
            return $wpdb->update($t, $data, array('id' => intval($id)));
        }
        $inserted = $wpdb->insert($t, $data);
        return $inserted ? $wpdb->insert_id : false;
    }

    public static function kampanya_sil( $id ) {
        global $wpdb;
        $wpdb->delete(self::t_islenen(), array('kampanya_id' => intval($id)));
        return $wpdb->delete(self::t_kampanya(), array('id' => intval($id)));
    }

    public static function kampanya_guncelle_son_calistirma( $id ) {
        global $wpdb;
        $wpdb->update(self::t_kampanya(), array('son_calistirma' => time()), array('id' => intval($id)));
    }

    public static function kampanya_eklenen_artir( $id, $sayi = 1 ) {
        global $wpdb;
        $t = self::t_kampanya();
        $wpdb->query($wpdb->prepare("UPDATE {$t} SET toplam_eklenen = toplam_eklenen + %d WHERE id = %d", intval($sayi), intval($id)));
    }

    /* ========= NORMALIZASYON YARDIMCILARI ========= */

    /**
     * Baslik normalize - kucuk harf, alphanum, kisa kelimeler atilmaz, fazla bosluk silinir.
     * Ayni baslikla farkli kaynaklardan gelen haberleri ayni saymak icin kullanilir.
     */
    public static function baslik_normalize( $baslik ) {
        $b = mb_strtolower(trim($baslik), 'UTF-8');
        // Turkce karakterleri sadelestir
        $tr = array('ı'=>'i','ğ'=>'g','ü'=>'u','ş'=>'s','ö'=>'o','ç'=>'c');
        $b = strtr($b, $tr);
        // alfanumerik disindakileri bosluga cevir
        $b = preg_replace('/[^a-z0-9 ]+/u', ' ', $b);
        $b = preg_replace('/\s+/', ' ', $b);
        return trim($b);
    }

    /**
     * Icerik parmak izi - ilk 300 karakter normalize.
     */
    public static function icerik_parmakizi( $icerik ) {
        $t = wp_strip_all_tags( (string) $icerik );
        $t = mb_strtolower($t, 'UTF-8');
        $tr = array('ı'=>'i','ğ'=>'g','ü'=>'u','ş'=>'s','ö'=>'o','ç'=>'c');
        $t = strtr($t, $tr);
        $t = preg_replace('/[^a-z0-9 ]+/u', ' ', $t);
        $t = preg_replace('/\s+/', ' ', trim($t));
        return mb_substr($t, 0, 300);
    }

    /* ========= DUPLICATE KONTROL (cross-source / global) ========= */

    /**
     * URL'i normalize et: query string'deki utm_*, fbclid, gclid vb. takip parametrelerini
     * sıyır, fragment'i kaldır, http/https farkını yok say, sondaki / işaretini at.
     * Aynı haberin farklı kaynaklardan farklı parametrelerle gelmesini engeller.
     */
    public static function link_normalize( $url ) {
        $url = trim( (string) $url );
        if ( $url === '' ) return '';
        $p = @parse_url( $url );
        if ( ! $p || empty( $p['host'] ) ) return strtolower( $url );
        $host = strtolower( $p['host'] );
        if ( strpos( $host, 'www.' ) === 0 ) $host = substr( $host, 4 );
        $path = isset( $p['path'] ) ? rtrim( $p['path'], '/' ) : '';
        $query = '';
        if ( ! empty( $p['query'] ) ) {
            parse_str( $p['query'], $args );
            $drop_prefixes = array( 'utm_', '_ga', 'mc_', 'pk_', 'piwik_' );
            $drop_exact    = array( 'fbclid','gclid','yclid','msclkid','dclid','igshid','mc_cid','mc_eid','ref','ref_src','ref_url','source','from' );
            foreach ( array_keys( $args ) as $k ) {
                $kl = strtolower( $k );
                if ( in_array( $kl, $drop_exact, true ) ) { unset( $args[$k] ); continue; }
                foreach ( $drop_prefixes as $pre ) {
                    if ( strpos( $kl, $pre ) === 0 ) { unset( $args[$k] ); break; }
                }
            }
            if ( $args ) { ksort( $args ); $query = '?' . http_build_query( $args ); }
        }
        return $host . $path . $query;
    }

    public static function link_islenmis_mi( $url ) {
        global $wpdb;
        $t = self::t_islenen();
        $hash_norm = md5( self::link_normalize( $url ) );
        $hash_raw  = md5( trim( $url ) );
        return (bool) $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$t} WHERE link_hash IN (%s,%s) LIMIT 1",
            $hash_norm, $hash_raw
        ) );
    }

    public static function baslik_islenmis_mi( $baslik ) {
        global $wpdb;
        $hash = md5( self::baslik_normalize($baslik) );
        $t = self::t_islenen();
        return (bool) $wpdb->get_var($wpdb->prepare("SELECT id FROM {$t} WHERE baslik_hash = %s LIMIT 1", $hash));
    }

    public static function icerik_islenmis_mi( $icerik ) {
        $izi = self::icerik_parmakizi($icerik);
        if ( mb_strlen($izi) < 30 ) return false; // cok kisa, anlamsiz
        global $wpdb;
        $hash = md5($izi);
        $t = self::t_islenen();
        return (bool) $wpdb->get_var($wpdb->prepare("SELECT id FROM {$t} WHERE icerik_hash = %s LIMIT 1", $hash));
    }

    public static function link_kaydet( $kampanya_id, $url, $baslik, $post_id, $icerik = '' ) {
        global $wpdb;
        $izi = self::icerik_parmakizi($icerik);
        return $wpdb->replace(self::t_islenen(), array(
            'kampanya_id' => intval($kampanya_id),
            'link_hash'   => md5( self::link_normalize($url) ),
            'link_url'    => mb_substr($url, 0, 1999),
            'baslik_hash' => md5( self::baslik_normalize($baslik) ),
            'icerik_hash' => $izi !== '' ? md5($izi) : '',
            'post_id'     => intval($post_id),
        ));
    }

    public static function islenen_link_sil( $kampanya_id ) {
        global $wpdb;
        return $wpdb->delete(self::t_islenen(), array('kampanya_id' => intval($kampanya_id)));
    }

    /* ========= MEVCUT DUPLICATE'LERI TEMIZLE ========= */

    /**
     * Veritabaninda ayni baslik veya ayni icerik parmak izine sahip
     * birden fazla post'u tespit eder ve EN ESKISI haric digerlerini siler.
     * @return array ['silinen_post' => N, 'silinen_kayit' => N]
     */
    public static function duplicate_temizle() {
        global $wpdb;
        $silinen_post   = 0;
        $silinen_kayit  = 0;
        $t = self::t_islenen();

        // Once mevcut tum kayitlarin baslik_hash & icerik_hash degerlerini guncelle
        // (eski surumden geliyorsa bos olabilir)
        $eksikler = $wpdb->get_results("SELECT id, post_id FROM {$t} WHERE (baslik_hash = '' OR icerik_hash = '') AND post_id > 0 LIMIT 5000");
        foreach ($eksikler as $row) {
            $p = get_post( (int)$row->post_id );
            if ( ! $p ) continue;
            $bh = md5( self::baslik_normalize($p->post_title) );
            $izi = self::icerik_parmakizi($p->post_content);
            $ih = $izi !== '' ? md5($izi) : '';
            $wpdb->update($t, array('baslik_hash'=>$bh, 'icerik_hash'=>$ih), array('id'=>(int)$row->id));
        }

        // Baslik bazli duplicate gruplari
        $gruplar = $wpdb->get_results("
            SELECT baslik_hash, GROUP_CONCAT(id ORDER BY tarih ASC) AS ids, GROUP_CONCAT(post_id ORDER BY tarih ASC) AS post_ids, COUNT(*) AS adet
            FROM {$t}
            WHERE baslik_hash <> ''
            GROUP BY baslik_hash
            HAVING adet > 1
        ");
        foreach ($gruplar as $g) {
            $ids      = explode(',', $g->ids);
            $post_ids = explode(',', $g->post_ids);
            // ilk eleman korunur, geri kalanlar silinir
            array_shift($ids);
            array_shift($post_ids);
            foreach ($post_ids as $pid) {
                $pid = (int) $pid;
                if ($pid > 0 && wp_delete_post($pid, true)) $silinen_post++;
            }
            foreach ($ids as $rid) {
                $rid = (int) $rid;
                if ($rid > 0) $silinen_kayit += (int) $wpdb->delete($t, array('id'=>$rid));
            }
        }

        // Icerik parmakizi bazli duplicate gruplari
        $gruplar2 = $wpdb->get_results("
            SELECT icerik_hash, GROUP_CONCAT(id ORDER BY tarih ASC) AS ids, GROUP_CONCAT(post_id ORDER BY tarih ASC) AS post_ids, COUNT(*) AS adet
            FROM {$t}
            WHERE icerik_hash <> ''
            GROUP BY icerik_hash
            HAVING adet > 1
        ");
        foreach ($gruplar2 as $g) {
            $ids      = explode(',', $g->ids);
            $post_ids = explode(',', $g->post_ids);
            array_shift($ids);
            array_shift($post_ids);
            foreach ($post_ids as $pid) {
                $pid = (int) $pid;
                if ($pid > 0 && wp_delete_post($pid, true)) $silinen_post++;
            }
            foreach ($ids as $rid) {
                $rid = (int) $rid;
                if ($rid > 0) $silinen_kayit += (int) $wpdb->delete($t, array('id'=>$rid));
            }
        }

        /* ── EK TARAMA: t_islenen tablosunda olmayan/eksik bot haberleri için
         *    doğrudan wp_posts üzerinde aynı başlıklı tekrarları bul ve sil.
         *    Sadece bot meta'sı olan post'lara dokunulur.
         * ─────────────────────────────────────────────────────────── */
        $bot_post_ids = $wpdb->get_col(
            "SELECT DISTINCT post_id FROM {$wpdb->postmeta}
              WHERE meta_key IN (
                '_ahb_kampanya_id','_ahb_kaynak_link','_ahb_kaynak_besleme','_ahb_column_post',
                '_ahb_source_url','_ahb_topic_slug'
              )"
        );
        if ( $bot_post_ids ) {
            $bot_post_ids = array_map( 'intval', $bot_post_ids );
            $chunks = array_chunk( $bot_post_ids, 1000 );
            $by_hash = array();
            foreach ( $chunks as $chunk ) {
                $in = implode( ',', $chunk );
                $rows = $wpdb->get_results(
                    "SELECT ID, post_title, post_date FROM {$wpdb->posts}
                      WHERE ID IN ({$in})
                        AND post_status IN ('publish','draft','pending','future')
                      ORDER BY post_date ASC"
                );
                foreach ( $rows as $r ) {
                    $h = md5( self::baslik_normalize( $r->post_title ) );
                    if ( $h === md5('') ) continue;
                    if ( ! isset( $by_hash[$h] ) ) $by_hash[$h] = array();
                    $by_hash[$h][] = (int) $r->ID;
                }
            }
            foreach ( $by_hash as $h => $list ) {
                if ( count( $list ) < 2 ) continue;
                array_shift( $list ); // en eskiyi koru
                foreach ( $list as $pid ) {
                    if ( wp_delete_post( $pid, true ) ) $silinen_post++;
                }
            }
        }

        return array(
            'silinen_post'  => $silinen_post,
            'silinen_kayit' => $silinen_kayit,
        );
    }

    public static function log_listesi( $kampanya_id = 0, $limit = 200 ) {
        global $wpdb;
        $t = self::t_log();
        $limit = intval($limit);
        if ( intval($kampanya_id) > 0 ) {
            $where = $wpdb->prepare('WHERE kampanya_id = %d', intval($kampanya_id));
        } else {
            $where = '';
        }
        return $wpdb->get_results("SELECT * FROM {$t} {$where} ORDER BY id DESC LIMIT {$limit}");
    }

    public static function log_temizle( $kampanya_id = 0 ) {
        global $wpdb;
        $t = self::t_log();
        if ( intval($kampanya_id) > 0 ) {
            return $wpdb->delete($t, array('kampanya_id' => intval($kampanya_id)));
        }
        return $wpdb->query("TRUNCATE TABLE {$t}");
    }
}
