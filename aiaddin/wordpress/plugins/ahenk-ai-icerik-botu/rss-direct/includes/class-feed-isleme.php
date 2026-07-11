<?php
/**
 * AHB - Feed Isleme Sinifi v1.2
 * - Genis User-Agent destegi (turk.eco gibi sıkı sunucular icin)
 * - Cross-source duplicate engelleme (baslik + icerik parmak izi)
 * - Resimler sunucuya indirilmez, harici URL olarak kaydedilir.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

class AHBRSS_Feed_Isleme {

    private $kampanya;
    private $eklenen  = 0;
    private $atlanan  = 0;
    private $hatalar  = 0;
    private $log_out  = array();

    /** Bu calistirma sirasinda eklenen baslik/icerik hashleri (memory dedup) */
    private static $bu_run_basliklar = array();
    private static $bu_run_icerikler = array();

    public function __construct( $kampanya ) {
        $this->kampanya = $kampanya;
    }

    public function isle() {
        $beslemeler = array_filter( array_map('trim', explode("\n", $this->kampanya->beslemeler)) );

        if ( empty($beslemeler) ) {
            $this->log('Besleme Yok', 'Bu kampanyada hic RSS/Atom besleme URL eklenmemis.', 'uyari');
            return $this->sonuc();
        }

        $this->log('Basladi', count($beslemeler) . ' besleme islenecek.', 'bilgi');

        foreach ( $beslemeler as $besleme_url ) {
            if ( ! filter_var($besleme_url, FILTER_VALIDATE_URL) ) {
                $this->log('Gecersiz URL', 'Gecersiz besleme URL atlandi: ' . $besleme_url, 'uyari');
                continue;
            }

            // YouTube tespiti (kaynak_tipi'ne bakmadan da otomatik calissin)
            $yt_tip = self::youtube_tipi($besleme_url);
            $kt = strtolower((string)$this->kampanya->kaynak_tipi);
            if ( in_array($kt, array('youtube_kanal','youtube_playlist','youtube_video'), true) ) {
                $yt_tip = $yt_tip ?: str_replace('youtube_', '', $kt);
            }

            // HTML KAZIMA modu — RSS yok, sayfa listesinden makaleleri çek
            if ( $kt === 'kazima' ) {
                $this->kazima_isle( $besleme_url );
                continue;
            }

            if ( $yt_tip === 'video' ) {
                $this->tek_video_isle($besleme_url);
                continue;
            }
            if ( $yt_tip === 'kanal' || $yt_tip === 'playlist' ) {
                $feed_url = $this->youtube_feed_url($besleme_url, $yt_tip);
                if ( ! $feed_url ) {
                    $this->log('YouTube Hatasi', 'Kanal/Playlist ID cozumlenemedi: ' . $besleme_url, 'hata');
                    $this->hatalar++;
                    continue;
                }
                $this->log('YouTube', $yt_tip . ' beslemesi: ' . $feed_url, 'bilgi');
                $this->beslemeyi_isle($feed_url);
                continue;
            }

            $this->beslemeyi_isle($besleme_url);
        }

        AHBRSS_Veritabani::kampanya_guncelle_son_calistirma($this->kampanya->id);

        $this->log('Tamamlandi',
            "Sonuc: {$this->eklenen} eklendi, {$this->atlanan} atland, {$this->hatalar} hata.",
            'basari'
        );

        return $this->sonuc();
    }

    private function beslemeyi_isle( $url ) {
        $this->log('Besleme', 'Isleniyor: ' . $url, 'bilgi');

        // Hedef: kampanyadaki "Hedef haber sayisi" (yoksa 500)
        $hedef = (int) get_option('ahb_hedef_haber_sayisi', 500);
        if ( $hedef < 1 ) $hedef = 500;

        $toplam_oge = 0;
        $sayfa      = 1;
        $max_sayfa  = 25;       // guvenlik tavani (~25 x ~20 = 500)
        $bos_ust_uste = 0;

        while ( $toplam_oge < $hedef && $sayfa <= $max_sayfa ) {
            $sayfa_url = ( $sayfa === 1 ) ? $url : self::sayfali_url($url, $sayfa);
            $feed = self::feed_getir($sayfa_url);

            if ( is_wp_error($feed) || ! $feed ) {
                $msg = $feed instanceof WP_Error ? $feed->get_error_message() : 'Bilinmeyen hata';
                if ( $sayfa === 1 ) {
                    // Otomatik geri-düşüş: RSS değilse HTML kazıma dene
                    $this->log('Feed Yok', 'RSS/Atom alınamadı, HTML kazımaya geçiliyor: ' . $sayfa_url . ' (' . $msg . ')', 'uyari');
                    $kazima_eklenen_once = $this->eklenen;
                    $this->kazima_isle( $url );
                    if ( $this->eklenen === $kazima_eklenen_once ) {
                        $this->hatalar++;
                    }
                }
                break;
            }

            $items = $feed->get_items();
            if ( empty($items) ) {
                if ( $sayfa === 1 ) {
                    $this->log('Boş Feed', 'Besleme boş, HTML kazımaya geçiliyor: ' . $sayfa_url, 'uyari');
                    $this->kazima_isle( $url );
                    break;
                }
                $bos_ust_uste++;
                if ( $bos_ust_uste >= 2 ) break;
                $sayfa++;
                continue;
            }
            $bos_ust_uste = 0;

            // Kaynak site adi: once feed basligindan, yoksa host'tan turet
            $kaynak_site_adi = '';
            if ( method_exists($feed, 'get_title') ) {
                $kaynak_site_adi = trim( (string) $feed->get_title() );
                $kaynak_site_adi = html_entity_decode($kaynak_site_adi, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $kaynak_site_adi = wp_strip_all_tags($kaynak_site_adi);
            }
            if ( $kaynak_site_adi === '' ) {
                $h = parse_url($url, PHP_URL_HOST);
                if ( $h ) $kaynak_site_adi = preg_replace('/^www\./i', '', $h);
            }

            $this->log('Feed Tamam', count($items) . ' oge bulundu: ' . $sayfa_url, 'bilgi');
            foreach ( $items as $item ) {
                $this->oge_isle($item, $url, $kaynak_site_adi);
                $toplam_oge++;
                if ( $toplam_oge >= $hedef ) break 2;
            }

            // Sayfalama YouTube/atom feed'lerinde anlamsiz - sadece klasik web RSS
            if ( ! self::sayfalama_destekli($url) ) break;
            $sayfa++;
        }

        if ( $toplam_oge > 0 ) {
            $this->log('Toplam', $toplam_oge . ' oge islendi: ' . $url, 'bilgi');
        }
    }

    /** WordPress benzeri RSS'lerde ?paged=N destegi tahmin et */
    private static function sayfalama_destekli( $url ) {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        // YouTube / Atom feed'leri sayfalanamaz
        if ( strpos($host, 'youtube') !== false ) return false;
        // Genelde /feed, /rss, .xml ile biten WP feed'leri ?paged destekler
        return (bool) preg_match('#(/feed/?$|/rss/?$|/\?feed=|\.rss$|\.xml$)#i', $url);
    }

    /** URL'ye sayfa numarasi ekle */
    private static function sayfali_url( $url, $sayfa ) {
        if ( $sayfa <= 1 ) return $url;
        $sep = ( strpos($url, '?') !== false ) ? '&' : '?';
        return $url . $sep . 'paged=' . (int) $sayfa;
    }

    private function oge_isle( $item, $kaynak_url, $kaynak_site_adi = '' ) {
        // Baslik
        $baslik = $this->metin_temizle( $item->get_title() );
        if ( empty($baslik) ) { $this->atlanan++; return; }

        // Kaynak linki
        $link = esc_url_raw( $item->get_permalink() ?? '' );

        /* ── Duplicate kontrolleri ──────────────────────────── */

        // 1) Ayni link daha once islenmis mi (DB)
        if ( ! empty($link) && AHBRSS_Veritabani::link_islenmis_mi($link) ) {
            $this->log('Atland (Duplicate Link)', $baslik, 'bilgi');
            $this->atlanan++;
            return;
        }

        // 1b) Virüs/zararlı içerik kaynak URL kontrolü (hızlı string check)
        if ( class_exists( 'AHB_Virus_Scanner' ) ) {
            $u = AHB_Virus_Scanner::scan_url( $link );
            if ( ! $u['ok'] ) {
                AHBRSS_Veritabani::link_kaydet( $this->kampanya->id, $link ?: $baslik, $baslik, 0, '' );
                $this->log('Reddedildi (Şüpheli URL)', $baslik . ' — ' . $u['reason'], 'hata');
                $this->atlanan++;
                return;
            }
        }
        // NOT: wp_posts tablosunda post_title bazlı kontrol ESKİDEN buradaydı,
        // index olmadığı için tam tablo taraması yapıyordu ve ön yüzü yavaşlatıyordu.
        // Trash/silme hook'u (on_post_removed) zaten link_kaydet çağırarak indexli
        // baslik_islenmis_mi kontrolünün yakalamasını sağlıyor — bu yeterli.

        // 2) Ayni baslik (normalize, cross-source) DB'de varsa
        if ( AHBRSS_Veritabani::baslik_islenmis_mi($baslik) ) {
            $this->log('Atland (Duplicate Baslik)', $baslik, 'bilgi');
            $this->atlanan++;
            return;
        }

        // 3) Bu run icinde ayni baslik daha once islendiyse
        $b_norm = AHBRSS_Veritabani::baslik_normalize($baslik);
        $b_hash = md5($b_norm);
        if ( isset(self::$bu_run_basliklar[$b_hash]) ) {
            $this->log('Atland (Run Icinde Ayni Baslik)', $baslik, 'bilgi');
            $this->atlanan++;
            return;
        }

        // 3b) Cross-process kilit: paralel cron'lar aynı haberi 5 kopya üretiyor.
        // Aynı başlık son 30 dakikada başka bir worker tarafından işleniyorsa atla.
        $lock_key = 'ahb_busy_' . $b_hash;
        if ( get_transient( $lock_key ) ) {
            $this->log('Atland (Eş Zamanlı Üretim Kilidi)', $baslik, 'bilgi');
            $this->atlanan++;
            return;
        }
        set_transient( $lock_key, 1, 30 * MINUTE_IN_SECONDS );

        // 3c) Slug-bazlı kontrol — wp_posts.post_name indexli, hızlı.
        // Aynı slug zaten varsa (mansur-yavastan-... ya da -2, -3 suffix'liler) atla.
        // Bu, AI'ın aynı başlığı küçük farklarla üretmesine ve WP'nin slug'a -N eklemesine karşı ek koruma.
        global $wpdb;
        $slug_prefix = sanitize_title( $baslik );
        if ( $slug_prefix !== '' && mb_strlen( $slug_prefix ) >= 8 ) {
            $like = $wpdb->esc_like( $slug_prefix ) . '%';
            $exists = $wpdb->get_var( $wpdb->prepare(
                "SELECT ID FROM {$wpdb->posts}
                  WHERE post_status IN ('publish','draft','pending','future','private','trash')
                    AND ( post_name = %s OR post_name LIKE %s )
                  LIMIT 1",
                $slug_prefix, $like
            ) );
            if ( $exists ) {
                $this->log('Atland (Slug Çakışması)', $baslik . ' [slug: ' . $slug_prefix . ']', 'bilgi');
                AHBRSS_Veritabani::link_kaydet( $this->kampanya->id, $link ?: $baslik, $baslik, (int) $exists, '' );
                $this->atlanan++;
                return;
            }
        }

        /* ── YouTube tespiti (oge bazli) ─────────────────────── */
        $is_youtube = false;
        $yt_vid     = self::youtube_video_id($link);

        /* ── Icerik ─────────────────────────────────────────── */
        if ( $yt_vid ) {
            // YouTube videosu: icerik sadece gomulu oynaticidir (shortcode olarak).
            $is_youtube = true;
            $icerik = '[ahb_youtube id="' . esc_attr($yt_vid) . '"]';
        } else {
            $icerik_content = $item->get_content() ?? '';
            $icerik_desc    = $item->get_description() ?? '';
            $icerik = (mb_strlen(strip_tags($icerik_content)) >= mb_strlen(strip_tags($icerik_desc)))
                      ? $icerik_content : $icerik_desc;
            if (empty(trim(strip_tags($icerik)))) $icerik = $icerik_content ?: $icerik_desc;

            // HER ZAMAN kaynak sayfadan tam icerigi cekmeyi dene; daha uzun ise onu kullan
            if ( ! empty($link) ) {
                $rss_kelime = str_word_count( wp_strip_all_tags($icerik) );
                $tam = $this->tam_icerik_cek( $link );
                if ( $tam ) {
                    $tam_kelime = str_word_count( wp_strip_all_tags($tam) );
                    // Esik: tam metin RSS'in en az 1.2 kati ise kullan (kisa ozetlerde her zaman daha uzun olur)
                    if ( $tam_kelime > max(40, (int)($rss_kelime * 1.2)) ) {
                        $icerik = $tam;
                        $this->log('Tam Icerik', "Kaynaktan tam metin alindi ({$tam_kelime} kelime): " . $baslik, 'bilgi');
                    }
                }
            }

            // Iceriktekitum YouTube/Vimeo videolarini gomulu shortcode'a cevir
            $icerik = self::videolari_gom( $icerik );

            $icerik = $this->icerik_temizle($icerik);
        }

        // 4) Icerik parmak izi - cross-source benzer haber
        if ( AHBRSS_Veritabani::icerik_islenmis_mi($icerik) ) {
            $this->log('Atland (Benzer Icerik)', $baslik, 'bilgi');
            $this->atlanan++;
            return;
        }

        // 5) Bu run icinde ayni icerik
        $izi = AHBRSS_Veritabani::icerik_parmakizi($icerik);
        $i_hash = $izi !== '' ? md5($izi) : '';
        if ( $i_hash !== '' && isset(self::$bu_run_icerikler[$i_hash]) ) {
            $this->log('Atland (Run Icinde Ayni Icerik)', $baslik, 'bilgi');
            $this->atlanan++;
            return;
        }

        // Tarih kontrolu
        $yayin_tarihi = $item->get_date('U') ?: time();
        if ( $this->kampanya->max_haber_gun > 0 ) {
            $sinir = time() - ((int)$this->kampanya->max_haber_gun * 86400);
            if ( $yayin_tarihi < $sinir ) {
                $this->log('Atland (Eski Haber)', $baslik . ' - ' . date('d.m.Y', $yayin_tarihi), 'bilgi');
                $this->atlanan++;
                return;
            }
        }

        // Resim URL bul - hangi adimdan geldigini de takip et (log icin)
        $resim_url    = '';
        $resim_kaynak = '';

        if ( ! $is_youtube ) {
            // 1) RSS'in TUM resim alanlarini dene (media:content, media:thumbnail,
            //    enclosure, <image>, content/description icindeki <img>, custom Turkce alanlar)
            $resim_url = AHBRSS_Resim::rss_resim_bul($item);
            if ( $resim_url ) $resim_kaynak = 'rss';

            // 2) RSS'te hicbir sey bulunmadiysa temizlenmis icerikten dene
            if ( empty($resim_url) && ! empty($icerik) ) {
                $u = AHBRSS_Resim::icerikten_bul($icerik);
                if ( $u ) { $resim_url = $u; $resim_kaynak = 'icerik'; }
            }

            // 3) Hala yoksa: kaynak makalenin og:image / twitter:image meta'sini cek
            if ( empty($resim_url) && ! empty($link) ) {
                $og = AHBRSS_Resim::og_image_cek($link);
                if ( $og ) { $resim_url = $og; $resim_kaynak = 'og:image'; }
            }
        } else {
            // YouTube thumbnail
            $permalink = $item->get_permalink() ?? '';
            if ( preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/', $permalink, $yt_m) ) {
                $resim_url = 'https://img.youtube.com/vi/'.$yt_m[1].'/hqdefault.jpg';
                $resim_kaynak = 'youtube';
            }
        }

        // Hicbir sekilde bulunamadi -> varsayilan + uyari log
        if ( empty($resim_url) ) {
            $resim_url    = AHBRSS_Resim::varsayilan_url();
            $resim_kaynak = 'varsayilan';
            $this->log('Resim Bulunamadi', $baslik . ' (' . $link . ') - varsayilan kullanildi', 'uyari');
        }

        // Spot (YouTube videolarinda spot/icerik yazisi olmaz)
        if ( $is_youtube ) {
            $spot = '';
        } else {
            $spot = wp_strip_all_tags($item->get_description() ?? '');
            $spot = wp_trim_words($spot, 30, '...');
            if ( empty($spot) ) {
                $spot = wp_trim_words(wp_strip_all_tags($icerik), 30, '...');
            }
        }

        $is_son_dakika = $this->son_dakika_kontrol($baslik . ' ' . $spot);

        // Ceviri (YouTube basligi cevirilebilir; icerik gomulu oldugu icin cevrilmez)
        if ( (int)$this->kampanya->cevirisi_yap ) {
            $baslik_tr = AHBRSS_Cevirici::cevir($baslik, $this->kampanya->ceviri_dil_kaynak, 'tr', $this->kampanya->ceviri_motor);
            if ($baslik_tr) $baslik = $baslik_tr;

            if ( ! $is_youtube && ! empty($icerik) ) {
                $icerik_tr = AHBRSS_Cevirici::cevir(wp_strip_all_tags($icerik), $this->kampanya->ceviri_dil_kaynak, 'tr', $this->kampanya->ceviri_motor);
                if ($icerik_tr) $icerik = '<p>' . nl2br(esc_html($icerik_tr)) . '</p>';
            }
            if ( ! $is_youtube && ! empty($spot) ) {
                $spot_tr = AHBRSS_Cevirici::cevir($spot, $this->kampanya->ceviri_dil_kaynak, 'tr', $this->kampanya->ceviri_motor);
                if ($spot_tr) $spot = $spot_tr;
            }
        }

        if ( empty(wp_strip_all_tags($icerik)) ) {
            $icerik = '<p>' . esc_html($spot) . '</p>';
        }

        $kategori_ids = array();
        if ( (int)$this->kampanya->kategori_id > 0 ) {
            $kategori_ids[] = (int)$this->kampanya->kategori_id;
        }

        $etiketler = array();
        if ( ! empty($this->kampanya->etiketler) ) {
            $etiketler = array_map('trim', explode(',', $this->kampanya->etiketler));
        }
        $rss_etiketler = $item->get_categories();
        if ( $rss_etiketler ) {
            foreach ( $rss_etiketler as $kat ) {
                $kat_adi = $kat->get_label();
                if ($kat_adi && mb_strlen($kat_adi) < 50) {
                    $etiketler[] = $kat_adi;
                }
            }
        }
        // YouTube media:keywords destegi
        if ( $is_youtube ) {
            $kw = self::youtube_media_keywords($item);
            if ( $kw ) $etiketler = array_merge($etiketler, $kw);
        }
        $etiketler = array_values( array_unique( array_filter( array_map('trim', $etiketler) ) ) );

        // Hic etiket yoksa veya YouTube videosu icin etiket az ise basliktan uret
        if ( count($etiketler) < 2 ) {
            $uretilen = self::etiket_uret($baslik);
            $etiketler = array_values( array_unique( array_merge($etiketler, $uretilen) ) );
        }

        // Yayın tarihi: feed pubDate'i güvenilmez. Sunucu sistem saati de bazı
        // hosting'lerde NTP senkronu olmadığı için bozuk olabilir (örn. 3 ay ileride).
        // Bu yüzden internet'ten gerçek anı alıp onu kullanırız.
        $real_gmt = function_exists( 'ahb_get_real_gmt_timestamp' ) ? ahb_get_real_gmt_timestamp() : time();
        $tz_off   = (int) ( get_option( 'gmt_offset', 0 ) * HOUR_IN_SECONDS );
        $now_local = $real_gmt + $tz_off;
        $now_gmt   = $real_gmt;

        $post_data = array(
            'post_title'    => sanitize_text_field($baslik),
            'post_content'  => wp_kses_post($icerik),
            'post_excerpt'  => sanitize_textarea_field($spot),
            'post_status'   => 'publish',
            'post_type'     => $this->kampanya->post_turu ?: 'haber',
            'post_date'     => date('Y-m-d H:i:s', $now_local),
            'post_date_gmt' => date('Y-m-d H:i:s', $now_gmt),
        );

        // Virüs/zararlı içerik son kontrol — insert öncesi içeriği tara
        if ( class_exists( 'AHB_Virus_Scanner' ) ) {
            $scan = AHB_Virus_Scanner::scan( $icerik );
            if ( ! $scan['ok'] ) {
                AHBRSS_Veritabani::link_kaydet( $this->kampanya->id, $link ?: $baslik, $baslik, 0, '' );
                $this->log('Reddedildi (Zararlı İçerik)', $baslik . ' — ' . $scan['reason'], 'hata');
                $this->hatalar++;
                return;
            }
        }

        $post_id = wp_insert_post($post_data, true);

        if ( is_wp_error($post_id) ) {
            $this->log('Post Hatasi', $baslik . ' - ' . $post_id->get_error_message(), 'hata');
            $this->hatalar++;
            return;
        }

        if ( ! empty($kategori_ids) ) {
            wp_set_object_terms($post_id, $kategori_ids, 'haber-kategorisi');
        }
        if ( ! empty($etiketler) ) {
            wp_set_object_terms($post_id, $etiketler, 'haber-etiketi');
        }

        update_post_meta($post_id, '_haber_spot', sanitize_textarea_field($spot));
        // _kaynak_url meta'si bilerek YAZILMIYOR: tema bu meta'dan kaynak linki gosterebiliyor.
        // Dahili istatistik icin kaynak link bilgisini ozel bir meta'da tutuyoruz.
        update_post_meta($post_id, '_ahb_kaynak_link', esc_url_raw($link));
        update_post_meta($post_id, '_ahb_kampanya_id', $this->kampanya->id);
        update_post_meta($post_id, '_ahb_kaynak_besleme', $kaynak_url);

        // Kaynak SITE ADI - tema "kaynak" olarak bunu gostersin
        if ( empty($kaynak_site_adi) ) {
            $h = $link ? parse_url($link, PHP_URL_HOST) : parse_url($kaynak_url, PHP_URL_HOST);
            if ( $h ) $kaynak_site_adi = preg_replace('/^www\./i', '', $h);
        }
        if ( ! empty($kaynak_site_adi) ) {
            update_post_meta($post_id, '_ahb_kaynak_site', sanitize_text_field($kaynak_site_adi));
            // Tema uyumlulugu icin yaygin kullanilan meta isimlerini de doldur
            update_post_meta($post_id, '_haber_kaynak', sanitize_text_field($kaynak_site_adi));
            update_post_meta($post_id, '_kaynak', sanitize_text_field($kaynak_site_adi));
        }

        if ( $is_son_dakika ) update_post_meta($post_id, '_son_dakika', '1');
        if ( (int)$this->kampanya->haber_basi ) update_post_meta($post_id, '_manset_haberi', '1');

        // Kampanya ayari: "Resim Indir" kapaliysa sadece harici link kullan, sunucuya indirme.
        $indirme_izinli = ! empty( $this->kampanya->resim_indir );
        AHBRSS_Resim::ata($resim_url, $post_id, $indirme_izinli);
        update_post_meta($post_id, '_ahb_resim_kaynak', sanitize_text_field($resim_kaynak));

        // Islenenler tablosuna kaydet (icerik hash dahil)
        AHBRSS_Veritabani::link_kaydet($this->kampanya->id, $link ?: $baslik, $baslik, $post_id, $icerik);

        // Run icindeki dedup setlerine ekle
        self::$bu_run_basliklar[$b_hash] = true;
        if ( $i_hash !== '' ) self::$bu_run_icerikler[$i_hash] = true;

        AHBRSS_Veritabani::kampanya_eklenen_artir($this->kampanya->id);

        $this->log('Eklendi', $baslik . ' (#' . $post_id . ')' . ($is_son_dakika ? ' [SON DAKIKA]' : ''), 'basari');
        $this->eklenen++;
    }

    /**
     * RSS beslemeyi getir. Once SimplePie cache ile dener; sıkı sunucularda
     * (turk.eco gibi) ozel User-Agent ile wp_safe_remote_get ile alip
     * SimplePie'ye raw veri olarak besler.
     */
    private static function feed_getir( $url ) {
        if ( ! function_exists('fetch_feed') ) {
            require_once ABSPATH . WPINC . '/feed.php';
        }

        $ua = self::user_agent();

        // SimplePie'ye User-Agent set et
        $set_ua = function($feed) use ($ua) {
            if ( method_exists($feed, 'set_useragent') ) {
                $feed->set_useragent($ua);
            }
            if ( method_exists($feed, 'set_item_limit') ) {
                $feed->set_item_limit(0); // 0 = sinirsiz
            }
        };
        add_filter('wp_feed_cache_transient_lifetime', function() { return 300; });
        add_action('wp_feed_options', $set_ua, 10, 1);

        $feed = fetch_feed($url);

        remove_action('wp_feed_options', $set_ua, 10);
        remove_all_filters('wp_feed_cache_transient_lifetime');

        // Hata yoksa ve oge varsa direkt don
        if ( ! is_wp_error($feed) && $feed && count($feed->get_items()) > 0 ) {
            return $feed;
        }

        // Yedek: Tarayici User-Agent ile manuel cek + SimplePie'ye besle
        $resp = wp_safe_remote_get($url, array(
            'timeout'    => 20,
            'sslverify'  => false,
            'user-agent' => $ua,
            'headers'    => array(
                'Accept'          => 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
                'Accept-Language' => 'tr-TR,tr;q=0.9,en;q=0.5',
                'Referer'         => self::origin_from_url($url),
            ),
        ));

        if ( is_wp_error($resp) ) {
            return is_wp_error($feed) ? $feed : $resp;
        }
        $code = wp_remote_retrieve_response_code($resp);
        $body = wp_remote_retrieve_body($resp);
        if ( $code < 200 || $code >= 300 || empty($body) ) {
            return new WP_Error('ahb_feed_http', "HTTP {$code} - icerik alinamadi.");
        }

        if ( ! class_exists('SimplePie', false) ) {
            require_once ABSPATH . WPINC . '/class-simplepie.php';
        }
        $sp = new SimplePie();
        $sp->set_useragent($ua);
        $sp->set_raw_data($body);
        $sp->enable_cache(false);
        if ( method_exists($sp, 'set_item_limit') ) $sp->set_item_limit(0);
        @$sp->init();
        $sp->handle_content_type();

        if ( $sp->error() ) {
            return new WP_Error('ahb_feed_parse', 'Feed parse hatasi: ' . $sp->error());
        }
        return $sp;
    }

    private static function user_agent() {
        $opt = trim( (string) get_option('ahb_user_agent', '') );
        if ( $opt !== '' ) return $opt;
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 AhenkHaberBotu/' . (defined('AHBRSS_VERSION') ? AHBRSS_VERSION : '1.2');
    }

    private static function origin_from_url( $url ) {
        $p = wp_parse_url($url);
        if ( ! $p || empty($p['host']) ) return '';
        $scheme = $p['scheme'] ?? 'https';
        return $scheme . '://' . $p['host'] . '/';
    }

    private function son_dakika_kontrol( $metin ) {
        if ( empty($this->kampanya->son_dakika_kelime) ) return false;
        $kelimeler = array_map('trim', explode(',', mb_strtolower($this->kampanya->son_dakika_kelime)));
        $metin_kucuk = mb_strtolower($metin);
        foreach ($kelimeler as $k) {
            if ( ! empty($k) && mb_strpos($metin_kucuk, $k) !== false ) return true;
        }
        return false;
    }

    private function metin_temizle( $metin ) {
        $metin = (string) $metin;

        // Cok katmanli HTML entity kodlamasini coz (orn: &amp;#039; -> &#039; -> ')
        // Bazi RSS beslemeleri basliklari iki kez kodlar; tek decode yetmez.
        for ( $i = 0; $i < 5; $i++ ) {
            $yeni = html_entity_decode($metin, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            if ( $yeni === $metin ) break;
            $metin = $yeni;
        }

        // Numerik entity'leri (orn: &#039; &#x27;) elle de cevir; bazi PHP/HTML5
        // tablolarinda eksik olabiliyor.
        $metin = preg_replace_callback('/&#0*([0-9]+);?/', function( $m ) {
            $kod = (int) $m[1];
            if ( $kod <= 0 ) return $m[0];
            return function_exists('mb_chr') ? mb_chr($kod, 'UTF-8') : html_entity_decode('&#' . $kod . ';', ENT_QUOTES, 'UTF-8');
        }, $metin);
        $metin = preg_replace_callback('/&#x([0-9a-fA-F]+);?/', function( $m ) {
            $kod = hexdec($m[1]);
            if ( $kod <= 0 ) return $m[0];
            return function_exists('mb_chr') ? mb_chr($kod, 'UTF-8') : html_entity_decode('&#' . $kod . ';', ENT_QUOTES, 'UTF-8');
        }, $metin);

        $metin = wp_strip_all_tags($metin);
        $metin = preg_replace('/\s+/', ' ', $metin);
        return trim($metin);
    }

    private function icerik_temizle( $html ) {
        if ( empty($html) ) return '';
        $html = html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Tehlikeli/istenmeyen kod bloklarini icerigiyle birlikte komple kaldir
        $kaldir = array('script','style','noscript','iframe','embed','object','form','button','input','svg','canvas','link','meta');
        foreach ($kaldir as $tag) {
            $html = preg_replace('#<\s*' . $tag . '\b[^>]*>.*?<\s*/\s*' . $tag . '\s*>#is', '', $html);
            $html = preg_replace('#<\s*' . $tag . '\b[^>]*/?>#i', '', $html);
        }
        // HTML yorumlari
        $html = preg_replace('/<!--.*?-->/s', '', $html);
        // on/click vb. inline event attribute'lari
        $html = preg_replace('#\son[a-z]+\s*=\s*"[^"]*"#i', '', $html);
        $html = preg_replace("#\son[a-z]+\s*=\s*'[^']*'#i", '', $html);
        // javascript: linkleri
        $html = preg_replace('#href\s*=\s*"javascript:[^"]*"#i', 'href="#"', $html);

        $izinli = array(
            'p'=>array('class'=>array()), 'br'=>array(), 'strong'=>array(), 'b'=>array(),
            'em'=>array(), 'i'=>array(), 'u'=>array(), 'ul'=>array(), 'ol'=>array(), 'li'=>array(),
            'h2'=>array(), 'h3'=>array(), 'h4'=>array(), 'h5'=>array(), 'blockquote'=>array(),
            'a'=>array('href'=>array(),'target'=>array(),'rel'=>array(),'title'=>array()),
            'img'=>array('src'=>array(),'alt'=>array(),'title'=>array(),'width'=>array(),'height'=>array(),'srcset'=>array(),'sizes'=>array(),'loading'=>array()),
            'figure'=>array('class'=>array()), 'figcaption'=>array(),
        );
        $html = wp_kses($html, $izinli);

        /* ── Sondaki kaynak / "daha once X sitede yayinlandi" tarzi
              link ve cumleleri temizle ───────────────────────────── */
        // Yalnizca tek bir link iceren paragraflar (kaynak/devam linkleri)
        $kaynak_kelimeler = '(kaynak|devam|devamı|devami|haberin devam|haberin tamam|orijinal|tıklayın|tiklayin|tıklayınız|tikla|here|read more|continue reading|more info|kaynak için|gönderi|original|göre|gore|alıntı|alinti|yayınlandı|yayinlandi|yayımlandı|yayimlandi|previously published|first appeared|paylaşıldı|paylasildi|haber merkezi|takip et|abone ol)';

        // 1) Sadece bir <a> iceren <p>...</p> (case-insensitive)
        $html = preg_replace_callback(
            '#<p[^>]*>\s*(?:<(?:strong|em|b|i)>\s*)?<a\b[^>]*>(.*?)</a>(?:\s*</(?:strong|em|b|i)>)?\s*</p>#is',
            function($m) use ($kaynak_kelimeler) {
                $metin = trim( wp_strip_all_tags($m[1]) );
                if ( $metin === '' ) return '';
                if ( preg_match('#'. $kaynak_kelimeler .'#iu', $metin) ) return '';
                if ( mb_strlen($metin) < 80 ) return ''; // cogu kaynak linki kisa
                return $m[0];
            },
            $html
        );

        // 2) "Bu haber X sitesinde yayinlandi" / "Kaynak: ..." cumleleri (her yerde)
        $html = preg_replace(
            '#<p[^>]*>\s*(bu (?:haber|yazı|yazi|içerik|icerik)[^<]{0,200}?(?:yayınlan|yayinlanm|yayımlan|yayimlanm)[^<]{0,80}?\.?)\s*</p>#iu',
            '',
            $html
        );
        $html = preg_replace(
            '#<p[^>]*>\s*(?:kaynak|source|via)\s*[:\-–]\s*[^<]{1,300}</p>#iu',
            '',
            $html
        );
        // Cumle ortasinda "Kaynak: <a>..</a>" gibi son satirlar
        $html = preg_replace(
            '#(?:<br\s*/?>\s*)*(?:kaynak|source|via)\s*[:\-–][^<]{0,200}<a\b[^>]*>.*?</a>\.?#iu',
            '',
            $html
        );

        // Bos paragraflari ve fazla bosluklari temizle
        $html = preg_replace('/<p[^>]*>\s*(?:&nbsp;|\s)*\s*<\/p>/i', '', $html);
        $html = preg_replace('/\n{3,}/', "\n\n", $html);
        return trim($html);
    }

    /**
     * RSS'deki ozet cok kisaysa, kaynak URL'yi cekip ana makale gövdesini cikar.
     * - <article>, <main>, [itemprop=articleBody], en uygun gövde tahmini
     * - <script>/<style>/<iframe> baslangicta silinir
     * Donen icerik HTML; daha sonra icerik_temizle() ile sterilize edilir.
     */
    private function tam_icerik_cek( $url ) {
        $resp = wp_safe_remote_get($url, array(
            'timeout'    => 15,
            'sslverify'  => false,
            'user-agent' => self::user_agent(),
            'headers'    => array(
                'Accept'          => 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
                'Accept-Language' => 'tr-TR,tr;q=0.9,en;q=0.5',
            ),
        ));
        if ( is_wp_error($resp) ) return '';
        $code = wp_remote_retrieve_response_code($resp);
        $html = wp_remote_retrieve_body($resp);
        if ( $code < 200 || $code >= 300 || empty($html) ) return '';

        // Hizli on temizlik
        $html = preg_replace('#<script\b[^>]*>.*?</script>#is', '', $html);
        $html = preg_replace('#<style\b[^>]*>.*?</style>#is', '', $html);
        $html = preg_replace('#<noscript\b[^>]*>.*?</noscript>#is', '', $html);

        // Karakter setini meta'dan tahmin et ve UTF-8'e cevir
        if ( preg_match('#<meta[^>]+charset=["\']?([\w\-]+)#i', $html, $cm) ) {
            $cs = strtoupper($cm[1]);
            if ( $cs && $cs !== 'UTF-8' && function_exists('mb_convert_encoding') ) {
                $html = @mb_convert_encoding($html, 'UTF-8', $cs);
            }
        }

        $aday = '';

        // 1) <article>...</article>
        if ( preg_match('#<article\b[^>]*>(.*?)</article>#is', $html, $m) ) {
            $aday = $m[1];
        }
        // 2) [itemprop="articleBody"]
        if ( ! $aday && preg_match('#<([a-z0-9]+)[^>]+itemprop=["\']articleBody["\'][^>]*>(.*?)</\1>#is', $html, $m) ) {
            $aday = $m[2];
        }
        // 3) class/id icinde "article", "content", "entry", "post-body", "haber-icerik"
        if ( ! $aday && preg_match('#<(div|section)[^>]+(?:class|id)=["\'][^"\']*(?:article-?(?:body|content)|entry-content|post-?body|haber-?(?:icerik|metin|govde)|story-?body|td-post-content|content-body)[^"\']*["\'][^>]*>(.*?)</\1>#is', $html, $m) ) {
            $aday = $m[2];
        }
        // 4) Fallback: <main>
        if ( ! $aday && preg_match('#<main\b[^>]*>(.*?)</main>#is', $html, $m) ) {
            $aday = $m[1];
        }
        // 5) Fallback: tum <p>'leri topla
        if ( ! $aday ) {
            preg_match_all('#<p\b[^>]*>.*?</p>#is', $html, $pm);
            if ( ! empty($pm[0]) ) {
                $birlesik = implode("\n", $pm[0]);
                if ( str_word_count(wp_strip_all_tags($birlesik)) >= 80 ) $aday = $birlesik;
            }
        }

        if ( ! $aday ) return '';

        // Goreceli URL'leri mutlak yap (img src ve a href)
        $base = self::origin_from_url($url);
        if ( $base ) {
            $aday = preg_replace_callback('#\b(src|href)=(["\'])(?!https?://|//|data:|#|mailto:)([^"\']+)\2#i',
                function($m) use ($base, $url) {
                    $rel = $m[3];
                    if ( strpos($rel, '/') === 0 ) {
                        return $m[1] . '=' . $m[2] . rtrim($base, '/') . $rel . $m[2];
                    }
                    // basit relative
                    $base_dir = preg_replace('#/[^/]*$#', '/', $url);
                    return $m[1] . '=' . $m[2] . $base_dir . $rel . $m[2];
                },
                $aday
            );
        }

        return $aday;
    }

    private function log( $eylem, $mesaj, $seviye = 'bilgi' ) {
        AHBRSS_Log::kaydet($this->kampanya->id, $this->kampanya->ad, $eylem, $mesaj, $seviye);
        $this->log_out[] = array('eylem'=>$eylem, 'mesaj'=>$mesaj, 'seviye'=>$seviye);
    }

    private function sonuc() {
        return array(
            'eklenen'  => $this->eklenen,
            'atlanan'  => $this->atlanan,
            'hatalar'  => $this->hatalar,
            'log'      => $this->log_out,
        );
    }

    /* ════════════════════════════════════════════════════════
     *  YOUTUBE DESTEGI
     * ════════════════════════════════════════════════════════ */

    /** Plugin yuklenince shortcode'lari kaydet */
    public static function init() {
        add_shortcode('ahb_youtube', array(__CLASS__, 'shortcode_youtube'));
        add_shortcode('ahb_vimeo',   array(__CLASS__, 'shortcode_vimeo'));
    }

    /** [ahb_vimeo id="VID"] -> markasiz gomulu Vimeo oynatici */
    public static function shortcode_vimeo( $atts ) {
        $atts = shortcode_atts(array('id' => ''), $atts, 'ahb_vimeo');
        $vid  = preg_replace('/[^0-9]/', '', (string)$atts['id']);
        if ( strlen($vid) < 6 ) return '';
        $src = 'https://player.vimeo.com/video/' . $vid . '?title=0&byline=0&portrait=0&pip=1';
        $html  = '<div class="ahb-yt-wrap" style="position:relative;padding-top:56.25%;width:100%;overflow:hidden;border-radius:8px;background:#000;">';
        $html .= '<iframe src="' . esc_url($src) . '" title="Video" loading="lazy" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0;"></iframe>';
        $html .= '</div>';
        return $html;
    }

    /**
     * Icerikteki tum YouTube ve Vimeo videolarini (iframe veya yalin URL)
     * gomulu shortcode'a ([ahb_youtube]/[ahb_vimeo]) cevirir.
     */
    public static function videolari_gom( $html ) {
        if ( empty($html) ) return $html;

        // 1) YouTube iframe'lerini tespit et: youtube.com/embed/VID veya youtube-nocookie/embed/VID
        $html = preg_replace_callback(
            '#<iframe[^>]+src=["\']([^"\']*(?:youtube\.com|youtube-nocookie\.com)/embed/([A-Za-z0-9_-]{11})[^"\']*)["\'][^>]*>\s*</iframe>#i',
            function($m) { return "\n[ahb_youtube id=\"{$m[2]}\"]\n"; },
            $html
        );
        // 2) Vimeo iframe'lerini tespit et
        $html = preg_replace_callback(
            '#<iframe[^>]+src=["\'][^"\']*player\.vimeo\.com/video/(\d+)[^"\']*["\'][^>]*>\s*</iframe>#i',
            function($m) { return "\n[ahb_vimeo id=\"{$m[1]}\"]\n"; },
            $html
        );
        // 3) Tek basina kalmis YouTube watch/youtu.be/shorts URL'leri (paragraf icindeki "naked" linkler)
        $html = preg_replace_callback(
            '#(<p[^>]*>\s*)?(?:<a\b[^>]*href=["\'])?(https?://(?:www\.)?(?:youtube\.com/(?:watch\?(?:[^"\'<>\s]*?)v=|shorts/)|youtu\.be/)([A-Za-z0-9_-]{11})[^"\'<>\s]*)(?:["\'][^>]*>[^<]*</a>)?(\s*</p>)?#i',
            function($m) {
                // Paragraf icinde sadece bu link varsa shortcode ile degistir
                $sc = "\n[ahb_youtube id=\"{$m[3]}\"]\n";
                if ( ! empty($m[1]) && ! empty($m[4]) ) return $sc;
                return $sc;
            },
            $html
        );
        return $html;
    }

    /** [ahb_youtube id="VID"] -> markasiz gomulu oynatici */
    public static function shortcode_youtube( $atts ) {
        $atts = shortcode_atts(array('id' => ''), $atts, 'ahb_youtube');
        $vid  = preg_replace('/[^a-zA-Z0-9_-]/', '', (string)$atts['id']);
        if ( strlen($vid) < 8 ) return '';
        return self::youtube_embed_html($vid);
    }

    /** Markasiz/cookie-siz embed HTML (responsive 16:9) */
    public static function youtube_embed_html( $vid ) {
        $vid = esc_attr($vid);
        $src = 'https://www.youtube-nocookie.com/embed/' . $vid
             . '?modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=1&controls=1&playsinline=1&color=white&hl=tr';
        $html  = '<div class="ahb-yt-wrap" style="position:relative;padding-top:56.25%;width:100%;overflow:hidden;border-radius:8px;background:#000;">';
        $html .= '<iframe src="' . esc_url($src) . '" title="Video" loading="lazy" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;inset:0;width:100%;height:100%;border:0;"></iframe>';
        $html .= '</div>';
        return $html;
    }

    /** URL'den 11 karakterli YouTube video ID'sini cikar */
    public static function youtube_video_id( $url ) {
        if ( ! $url ) return '';
        if ( preg_match('#(?:youtube\.com/watch\?(?:.*&)?v=|youtu\.be/|youtube\.com/shorts/|youtube\.com/embed/|youtube-nocookie\.com/embed/)([A-Za-z0-9_-]{11})#', $url, $m) ) {
            return $m[1];
        }
        return '';
    }

    /** URL bir YouTube kaynagi mi? Doner: 'kanal' | 'playlist' | 'video' | '' */
    public static function youtube_tipi( $url ) {
        if ( ! $url ) return '';
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if ( ! preg_match('#(?:^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$#', $host) ) {
            return '';
        }
        if ( self::youtube_video_id($url) ) return 'video';
        if ( preg_match('#[?&]list=#', $url) || strpos($url, '/playlist') !== false ) return 'playlist';
        return 'kanal';
    }

    /** YouTube URL'sini videos.xml besleme URL'sine cevir */
    private function youtube_feed_url( $url, $tip ) {
        if ( $tip === 'playlist' ) {
            if ( preg_match('#[?&]list=([A-Za-z0-9_-]+)#', $url, $m) ) {
                return 'https://www.youtube.com/feeds/videos.xml?playlist_id=' . $m[1];
            }
            return '';
        }
        // Kanal: 3 farkli format - /channel/UCxxx, /@handle, /user/xxx, /c/xxx
        if ( preg_match('#/channel/(UC[A-Za-z0-9_-]{20,})#', $url, $m) ) {
            return 'https://www.youtube.com/feeds/videos.xml?channel_id=' . $m[1];
        }
        // Handle ya da kullanici adi -> kanal sayfasini cek, channel_id'yi ayikla
        $cid = $this->youtube_kanal_id_cek($url);
        if ( $cid ) {
            return 'https://www.youtube.com/feeds/videos.xml?channel_id=' . $cid;
        }
        return '';
    }

    /** Kanal sayfasinin HTML'inden channel_id ayikla */
    private function youtube_kanal_id_cek( $url ) {
        $cache_key = 'ahb_yt_cid_' . md5($url);
        $cached = get_transient($cache_key);
        if ( $cached ) return $cached;

        $resp = wp_safe_remote_get($url, array(
            'timeout'    => 15,
            'sslverify'  => false,
            'user-agent' => self::user_agent(),
            'headers'    => array(
                'Accept-Language' => 'tr-TR,tr;q=0.9,en;q=0.5',
            ),
        ));
        if ( is_wp_error($resp) ) return '';
        $html = wp_remote_retrieve_body($resp);
        if ( ! $html ) return '';

        $cid = '';
        if ( preg_match('#"channelId":"(UC[A-Za-z0-9_-]{20,})"#', $html, $m) ) $cid = $m[1];
        if ( ! $cid && preg_match('#<meta\s+itemprop=["\']channelId["\']\s+content=["\'](UC[A-Za-z0-9_-]{20,})["\']#i', $html, $m) ) $cid = $m[1];
        if ( ! $cid && preg_match('#<link\s+rel=["\']canonical["\']\s+href=["\'][^"\']*?/channel/(UC[A-Za-z0-9_-]{20,})#i', $html, $m) ) $cid = $m[1];

        if ( $cid ) set_transient($cache_key, $cid, DAY_IN_SECONDS * 7);
        return $cid;
    }

    /** YouTube videos.xml feed item'inden media:keywords cek */
    private static function youtube_media_keywords( $item ) {
        $out = array();
        $tags = $item->get_item_tags('http://search.yahoo.com/mrss/', 'group');
        if ( ! empty($tags[0]['child']['http://search.yahoo.com/mrss/']['keywords'][0]['data']) ) {
            $kw = $tags[0]['child']['http://search.yahoo.com/mrss/']['keywords'][0]['data'];
            foreach ( explode(',', $kw) as $t ) {
                $t = trim($t);
                if ( $t !== '' && mb_strlen($t) < 50 ) $out[] = $t;
            }
        }
        return $out;
    }

    /** Basliktan otomatik etiket uret (Turkce stopword filtreli) */
    public static function etiket_uret( $baslik ) {
        $b = mb_strtolower((string)$baslik, 'UTF-8');
        $b = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $b);
        $kelimeler = preg_split('/\s+/u', trim($b), -1, PREG_SPLIT_NO_EMPTY);
        $stop = array(
            've','ile','bir','bu','şu','o','ama','ki','de','da','mi','mı','mu','mü',
            'ya','ne','her','çok','az','en','için','icin','olarak','olan','oldu',
            'gibi','daha','sonra','önce','once','şey','sey','kadar','vs','vb',
            'a','an','the','of','to','in','on','for','and','or','is','are','it','at','by','with','from','as','be','was','were','this','that','will'
        );
        $sayim = array();
        foreach ($kelimeler as $k) {
            if ( mb_strlen($k,'UTF-8') < 4 ) continue;
            if ( in_array($k, $stop, true) ) continue;
            $sayim[$k] = isset($sayim[$k]) ? $sayim[$k]+1 : 1;
        }
        arsort($sayim);
        return array_slice( array_keys($sayim), 0, 6 );
    }

    /** Tek YouTube videosu icin oge yarat ve isle */
    private function tek_video_isle( $url ) {
        $vid = self::youtube_video_id($url);
        if ( ! $vid ) {
            $this->log('YouTube Hatasi', 'Video ID cozumlenemedi: ' . $url, 'hata');
            $this->hatalar++;
            return;
        }
        $watch = 'https://www.youtube.com/watch?v=' . $vid;

        // Daha onceden eklendi mi
        if ( AHBRSS_Veritabani::link_islenmis_mi($watch) ) {
            $this->atlanan++;
            $this->log('Atland (Tekrar)', 'YouTube videosu zaten eklenmis: ' . $watch, 'bilgi');
            return;
        }

        // Baslik ve tag'leri YouTube oEmbed ile al
        $oembed = wp_safe_remote_get('https://www.youtube.com/oembed?format=json&url=' . rawurlencode($watch), array(
            'timeout' => 10, 'user-agent' => self::user_agent(),
        ));
        $baslik = '';
        if ( ! is_wp_error($oembed) ) {
            $body = wp_remote_retrieve_body($oembed);
            $j = json_decode($body, true);
            if ( ! empty($j['title']) ) $baslik = $j['title'];
        }
        if ( ! $baslik ) $baslik = 'YouTube Video ' . $vid;
        $baslik = $this->metin_temizle($baslik);

        $b_norm = AHBRSS_Veritabani::baslik_normalize($baslik);
        $b_hash = md5($b_norm);
        if ( isset(self::$bu_run_basliklar[$b_hash]) ) { $this->atlanan++; return; }

        $icerik = '[ahb_youtube id="' . esc_attr($vid) . '"]';
        $resim_url = 'https://img.youtube.com/vi/' . $vid . '/hqdefault.jpg';

        $etiketler = self::etiket_uret($baslik);
        if ( ! empty($this->kampanya->etiketler) ) {
            $etiketler = array_merge( array_map('trim', explode(',', $this->kampanya->etiketler)), $etiketler );
        }
        $etiketler = array_values(array_unique(array_filter($etiketler)));

        $kategori_ids = array();
        if ( (int)$this->kampanya->kategori_id > 0 ) $kategori_ids[] = (int)$this->kampanya->kategori_id;

        $post_data = array(
            'post_title'   => sanitize_text_field($baslik),
            'post_content' => $icerik, // shortcode, kses ile guvenli
            'post_excerpt' => '',
            'post_status'  => 'publish',
            'post_type'    => $this->kampanya->post_turu ?: 'haber',
        );
        $post_id = wp_insert_post($post_data, true);
        if ( is_wp_error($post_id) ) {
            $this->log('Post Hatasi', $baslik . ' - ' . $post_id->get_error_message(), 'hata');
            $this->hatalar++;
            return;
        }

        if ( ! empty($kategori_ids) ) wp_set_object_terms($post_id, $kategori_ids, 'haber-kategorisi');
        if ( ! empty($etiketler) )    wp_set_object_terms($post_id, $etiketler,    'haber-etiketi');

        update_post_meta($post_id, '_ahb_kaynak_link', esc_url_raw($watch));
        update_post_meta($post_id, '_ahb_kampanya_id', $this->kampanya->id);
        update_post_meta($post_id, '_ahb_kaynak_besleme', $url);
        update_post_meta($post_id, '_ahb_youtube_id', $vid);

        AHBRSS_Resim::harici_url_ata($resim_url, $post_id);
        AHBRSS_Veritabani::link_kaydet($this->kampanya->id, $watch, $baslik, $post_id, $icerik);

        self::$bu_run_basliklar[$b_hash] = true;
        AHBRSS_Veritabani::kampanya_eklenen_artir($this->kampanya->id);

        $this->log('Eklendi', '[YouTube] ' . $baslik . ' (#' . $post_id . ')', 'basari');
        $this->eklenen++;
    }

    /* ─────────────────────────────────────────────────────────────
     *  HTML KAZIMA — RSS yok, sayfa listesinden makale URL'leri çek,
     *  her birini ziyaret edip başlık + içerik + görsel topla.
     *  Ana eklentinin AHB_Html_Scraper sınıfını kullanır.
     * ───────────────────────────────────────────────────────────── */
    private function kazima_isle( $listing_url ) {
        if ( ! class_exists( 'AHB_Html_Scraper' ) ) {
            $this->log( 'Kazıma Hatası', 'AHB_Html_Scraper sınıfı yüklü değil.', 'hata' );
            $this->hatalar++;
            return;
        }

        $this->log( 'Kazıma', 'Sayfa kazınıyor: ' . $listing_url, 'bilgi' );

        $hedef = (int) get_option( 'ahb_hedef_haber_sayisi', 50 );
        if ( $hedef < 1 || $hedef > 200 ) $hedef = 50;

        $scraper = new AHB_Html_Scraper();
        $items   = $scraper->fetch( $listing_url, $hedef );

        if ( empty( $items ) ) {
            $this->log( 'Boş Kazıma', 'Sayfadan haber linki çıkarılamadı: ' . $listing_url, 'uyari' );
            return;
        }

        $kaynak_site = parse_url( $listing_url, PHP_URL_HOST );
        if ( $kaynak_site ) $kaynak_site = preg_replace( '/^www\./i', '', $kaynak_site );

        $islenen = 0;
        foreach ( $items as $it ) {
            // AHB_Html_Scraper { 'title', 'content', 'link', ... }
            $baslik = isset( $it['title'] )   ? (string) $it['title']   : '';
            $icerik = isset( $it['content'] ) ? (string) $it['content'] : '';
            $link   = isset( $it['link'] )    ? (string) $it['link']    : '';
            $img    = isset( $it['image_url'] ) ? (string) $it['image_url'] : '';
            if ( ! $baslik || ! $link ) continue;

            // Görseli içeriğin başına ekle ki AHBRSS_Resim::icerikten_bul() yakalasın
            if ( $img && strpos( $icerik, $img ) === false ) {
                $icerik = '<p><img src="' . esc_url( $img ) . '" alt="' . esc_attr( $baslik ) . '"/></p>' . $icerik;
            }

            $fake = new AHBRSS_Fake_Item( $baslik, $icerik, $link );
            $this->oge_isle( $fake, $listing_url, $kaynak_site );
            $islenen++;
        }

        $this->log( 'Kazıma Tamam', "{$islenen} öge işlendi: " . $listing_url, 'basari' );
    }
}

/**
 * AHBRSS_Fake_Item — HTML kazıma sonuçlarını SimplePie_Item arayüzüne benzeten
 * minimum sarmalayıcı. Yalnızca AHBRSS_Feed_Isleme::oge_isle()'in çağırdığı
 * metotları implemente eder.
 */
class AHBRSS_Fake_Item {
    private $title;
    private $content;
    private $link;
    public function __construct( $title, $content, $link ) {
        $this->title   = $title;
        $this->content = $content;
        $this->link    = $link;
    }
    public function get_title()       { return $this->title; }
    public function get_permalink()   { return $this->link; }
    public function get_content()     { return $this->content; }
    public function get_description() { return wp_trim_words( wp_strip_all_tags( $this->content ), 30, '...' ); }
    public function get_date( $fmt = 'U' ) { return ( $fmt === 'U' ) ? time() : date( $fmt ); }
    public function get_categories()  { return array(); }
    public function get_enclosures()  { return array(); }
    public function get_thumbnail()   { return null; }
    public function get_item_tags( $ns = '', $tag = '' ) { return array(); }
    /** Bilinmeyen herhangi bir SimplePie metodu için sessiz null/boş dön (fatal'a izin verme). */
    public function __call( $name, $args ) {
        if ( strpos( $name, 'get_' ) === 0 ) return null;
        return null;
    }
}
