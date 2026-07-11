<?php

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! class_exists( 'AHB_News_Processor' ) ) {
class AHB_News_Processor {

    private $openai;
    private $checker;
    private $hot;
    private $forced_category_slug = '';
    private $forced_category_label = '';

    public function __construct( AHB_OpenAI_Client $openai, AHB_Duplicate_Checker $checker, AHB_Hot_Update $hot ) {
        $this->openai  = $openai;
        $this->checker = $checker;
        $this->hot     = $hot;
    }

    /**
     * RSS satırından gelen "kategori" değerini ayarlar (varsa).
     *
     * @param string $slug Kategori slug'ı
     */
    public function set_forced_category( $slug, $label = '' ) {
        $this->forced_category_slug  = sanitize_title( $slug );
        $this->forced_category_label = $label !== '' ? trim( $label ) : trim( $slug );
    }

    /**
     * Tek bir RSS öğesini işler.
     *
     * @param array $item
     */
    public function process( $item ) {
        $guid = $item['guid'] ?? $item['link'];
        $link = $item['link'];

        if ( $this->checker->is_duplicate( $guid, $link ) ) {
            error_log( '[AI Haber Botu] Mükerrer, atlandı: ' . $item['title'] );
            return 'skipped';
        }

        // Orijinal başlık zaten sitede varsa — taslak/yayında fark etmez — atla.
        // Önceki sürümlerde 'ahb_check_similar_title' opsiyoneldi; artık her zaman çalışır.
        if ( $this->checker->find_by_similar_title( $item['title'] ) ) {
            error_log( '[AI Haber Botu] Aynı/benzer başlıklı haber zaten var, atlandı: ' . $item['title'] );
            $this->checker->mark_as_processed( $guid, $link );
            return 'skipped';
        }

        // Cross-process kilit: paralel cron'lar aynı haberi 5 kopya üretiyor.
        // Aynı başlık son 30 dakikada başka bir worker tarafından işleniyorsa atla.
        $orig_norm = AHB_Duplicate_Checker::normalize_title( $item['title'] );
        $orig_lock_key = 'ahb_busy_' . md5( $orig_norm );
        if ( get_transient( $orig_lock_key ) ) {
            error_log( '[AI Haber Botu] Eş zamanlı üretim kilidi: ' . $item['title'] );
            return 'skipped';
        }
        set_transient( $orig_lock_key, 1, 30 * MINUTE_IN_SECONDS );

        // === VIRUS / ZARARLI ICERIK TARAMASI ===
        // Kaynak içeriği AI'ya göndermeden ÖNCE tara — boş yere AI maliyeti oluşmasın.
        if ( class_exists( 'AHB_Virus_Scanner' ) ) {
            $url_check = AHB_Virus_Scanner::scan_url( $link );
            if ( ! $url_check['ok'] ) {
                error_log( '[AI Haber Botu] Kaynak URL reddedildi: ' . $link . ' — ' . $url_check['reason'] );
                $this->checker->mark_as_processed( $guid, $link );
                return 'skipped';
            }
            $scan = AHB_Virus_Scanner::scan( $item['content'] ?? '' );
            if ( ! $scan['ok'] ) {
                error_log( '[AI Haber Botu] Virüs taramasında reddedildi: ' . $item['title'] . ' — ' . $scan['reason'] );
                $this->checker->mark_as_processed( $guid, $link ); // tekrar denenmesin
                return 'skipped';
            }
        }

        $ai_data = $this->openai->uniquify_news( $item['title'], $item['content'] );

        if ( ! $ai_data || empty( $ai_data['baslik'] ) || empty( $ai_data['icerik'] ) ) {
            error_log( '[AI Haber Botu] AI özgünleştirme başarısız: ' . $item['title'] . ' — tekrar denenecek.' );
            // AI başarısız olursa mark_as_processed YAPMA — bir sonraki çalıştırmada tekrar denensin
            return 'error';
        }

        // AI yeni bir başlık ürettikten sonra TEKRAR kontrol et — AI'ın ürettiği
        // başlık da sitede varsa taslak bile oluşturma, doğrudan atla.
        if ( $this->checker->find_by_similar_title( $ai_data['baslik'] ) ) {
            error_log( '[AI Haber Botu] AI üretimi sonrası duplicate başlık tespit edildi, taslak oluşturulmadı: ' . $ai_data['baslik'] );
            $this->checker->mark_as_processed( $guid, $link );
            return 'skipped';
        }

        // AI üretimi sonrası kilit: AI'ın ürettiği başlık için de paralel worker'lardan
        // korunma. Bu sayede 5 cron aynı kaynaktan farklı sürümler üretmesin.
        $ai_norm = AHB_Duplicate_Checker::normalize_title( $ai_data['baslik'] );
        $ai_lock_key = 'ahb_busy_' . md5( $ai_norm );
        if ( get_transient( $ai_lock_key ) ) {
            error_log( '[AI Haber Botu] AI başlık eş zamanlı üretim kilidi: ' . $ai_data['baslik'] );
            return 'skipped';
        }
        set_transient( $ai_lock_key, 1, 30 * MINUTE_IN_SECONDS );

        // Slug çakışması kontrolü (indexli, hızlı) — WP'nin slug'a -N eklemesini engelle.
        global $wpdb;
        $slug_prefix = sanitize_title( $ai_data['baslik'] );
        if ( $slug_prefix !== '' && mb_strlen( $slug_prefix ) >= 8 ) {
            $like = $wpdb->esc_like( $slug_prefix ) . '%';
            $slug_exists = $wpdb->get_var( $wpdb->prepare(
                "SELECT ID FROM {$wpdb->posts}
                  WHERE post_status IN ('publish','draft','pending','future','private','trash')
                    AND ( post_name = %s OR post_name LIKE %s )
                  LIMIT 1",
                $slug_prefix, $like
            ) );
            if ( $slug_exists ) {
                error_log( '[AI Haber Botu] Slug çakışması, atlandı: ' . $ai_data['baslik'] . ' [slug: ' . $slug_prefix . ']' );
                $this->checker->mark_as_processed( $guid, $link, (int) $slug_exists );
                return 'skipped';
            }
        }

        $topic_slug = ! empty( $ai_data['konu_slug'] ) ? sanitize_title( $ai_data['konu_slug'] ) : sanitize_title( $item['title'] );

        $updated_post_id = $this->hot->maybe_update(
            array(
                'title'   => $ai_data['baslik'],
                'content' => $ai_data['icerik'],
                'link'    => $link,
            ),
            $topic_slug,
            $this->checker
        );

        if ( $updated_post_id ) {
            $this->checker->mark_as_processed( $guid, $link, $updated_post_id, $topic_slug );
            return 'updated';
        }

        // === RESİM TESPİTİ (yayın öncesi) ===
        // 1) Direkt verilen image_url
        $resim = ! empty( $item['image_url'] ) ? trim( $item['image_url'] ) : '';
        // 2) Yoksa içerikten ilk uygun <img> 'i çek
        if ( empty( $resim ) ) {
            $resim = $this->ilk_resmi_icerikten_cek( $item['content'] ?? '' );
        }
        if ( empty( $resim ) ) {
            $resim = $this->ilk_resmi_icerikten_cek( $ai_data['icerik'] ?? '' );
        }

        // Resimsiz haberleri yayınlama — eğer ayar açıksa atla
        $resimsiz_atla = (int) get_option( 'ahb_skip_no_image', 1 );
        if ( $resimsiz_atla && empty( $resim ) ) {
            error_log( '[AI Haber Botu] Resim bulunamadı, haber atlandı: ' . ( $ai_data['baslik'] ?? $item['title'] ) );
            $this->checker->mark_as_processed( $guid, $link );
            return 'skipped_no_image';
        }

        // Resmi item'a geri yaz (create_post içinde gerekirse kullanılabilir)
        $item['image_url'] = $resim;

        $post_id = $this->create_post( $ai_data, $item );

        if ( $post_id ) {
            $this->checker->mark_as_processed( $guid, $link, $post_id, $topic_slug );
            update_post_meta( $post_id, '_ahb_source_url', esc_url_raw( $link ) );
            update_post_meta( $post_id, '_ahb_topic_slug', $topic_slug );
            if ( ! empty( $ai_data['ana_varliklar'] ) ) {
                update_post_meta( $post_id, '_ahb_entities', $ai_data['ana_varliklar'] );
            }

            // === GÖRSEL BULUNAMADIYSA ARAMA MOTORUNDAN ÇEK ===
            // (resim hâlâ boş ve "arama ile bul" açıksa)
            if ( empty( $resim ) && get_option( 'ahb_image_search_enabled', 1 ) ) {
                $searcher = new AHB_Image_Search();
                $sorgu = $ai_data['baslik'];
                if ( ! empty( $ai_data['ana_varliklar'] ) && is_array( $ai_data['ana_varliklar'] ) ) {
                    $sorgu .= ' ' . implode( ' ', array_slice( $ai_data['ana_varliklar'], 0, 3 ) );
                }
                $bulunan = $searcher->find( $sorgu );
                if ( $bulunan ) {
                    $resim = $bulunan;
                    update_post_meta( $post_id, '_ahb_image_from_search', 1 );
                    error_log( '[AI Haber Botu] Görsel arama motorundan bulundu: ' . $bulunan );
                }
            }

            // === ÖNE ÇIKAN RESİM ===
            if ( get_option( 'ahb_set_featured_image', 1 ) && ! empty( $resim ) ) {
                $link_modu = (int) get_option( 'ahb_image_link_mode', 1 );
                $ok = false;

                // 1) Önce LİNK olarak eklemeyi dene (sunucuya indirmez)
                if ( $link_modu ) {
                    if ( $this->resim_linklenebilir_mi( $resim ) ) {
                        $ok = $this->set_external_featured_image( $post_id, $resim, $ai_data['baslik'] );
                    } else {
                        error_log( '[AI Haber Botu] Resim linkle eklenemedi (erişim/hotlink yok), indirmeye düşülüyor: ' . $resim );
                    }
                }

                // 2) Link modu kapalı VEYA link modu başarısız → sunucuya indir
                if ( ! $ok ) {
                    $ok = $this->set_featured_image( $post_id, $resim, $ai_data['baslik'] );
                }

                // 3) Hâlâ başarısız ve "resimsiz atla" açıksa post'u taslağa düşür
                if ( ! $ok && $resimsiz_atla ) {
                    wp_update_post( array( 'ID' => $post_id, 'post_status' => 'draft' ) );
                    update_post_meta( $post_id, '_ahb_resim_indirilemedi', 1 );
                    error_log( '[AI Haber Botu] Resim eklenemedi, post taslağa alındı: ' . $post_id );
                }
            }

            error_log( '[AI Haber Botu] Yeni haber oluşturuldu. Post ID: ' . $post_id );
            return 'created';
        }

        return 'error';
    }

    /**
     * Resim URL'si linkle eklenebilir mi? (HEAD/GET ile erişim testi)
     * - Önce HEAD dener, izin verilmiyorsa kısa GET (Range: 0-1024) ile dener
     * - 200/206 ve image/* MIME tipi gerekir
     * - Hotlink koruması olan siteler (Referer kontrolü) için ekstra GET fallback
     */
    private function resim_linklenebilir_mi( $url ) {
        if ( empty( $url ) || ! preg_match( '#^https?://#i', $url ) ) return false;

        $args = array(
            'timeout'     => 8,
            'redirection' => 3,
            'sslverify'   => false,
            'user-agent'  => 'Mozilla/5.0 (compatible; WP-AhenkBot/1.0; +https://wordpress.org)',
            'headers'     => array(
                // Referer YOK — hotlink korumalı sitelerde 403 önler
                'Accept' => 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
            ),
        );

        // HEAD dene
        $r = wp_remote_head( $url, $args );
        $code = is_wp_error( $r ) ? 0 : (int) wp_remote_retrieve_response_code( $r );
        $type = is_wp_error( $r ) ? '' : (string) wp_remote_retrieve_header( $r, 'content-type' );

        // HEAD desteklenmediyse GET ile küçük parça dene
        if ( $code !== 200 || stripos( $type, 'image/' ) === false ) {
            $args['headers']['Range'] = 'bytes=0-2048';
            $r = wp_remote_get( $url, $args );
            $code = is_wp_error( $r ) ? 0 : (int) wp_remote_retrieve_response_code( $r );
            $type = is_wp_error( $r ) ? '' : (string) wp_remote_retrieve_header( $r, 'content-type' );
        }

        if ( $code === 200 || $code === 206 ) {
            if ( stripos( $type, 'image/' ) === 0 ) return true;
            // content-type yoksa uzantıdan tahmin
            if ( $type === '' && preg_match( '#\.(jpe?g|png|gif|webp|avif)(\?|$)#i', $url ) ) return true;
        }
        return false;
    }

    /**
     * Resmi sunucuya indirmeden, dış URL'yi öne çıkan görsel olarak bağlar.
     * - Hafif bir attachment kaydı oluşturur (dosya YOK)
     * - _ahb_external_url meta'sı ile işaretler
     * - Plugin filtreleri (register_external_image_filters) tüm WP fonksiyonlarını
     *   bu dış URL'ye yönlendirir (theme'lerin değişmesine gerek yok)
     */
    private function set_external_featured_image( $post_id, $image_url, $alt_text = '' ) {
        $mime = $this->mime_from_url( $image_url );
        $title = $alt_text ? sanitize_text_field( $alt_text ) : basename( parse_url( $image_url, PHP_URL_PATH ) );

        $attach_id = wp_insert_post( array(
            'post_title'     => $title,
            'post_content'   => '',
            'post_status'    => 'inherit',
            'post_mime_type' => $mime,
            'post_type'      => 'attachment',
            'post_parent'    => $post_id,
            'guid'           => esc_url_raw( $image_url ),
        ), true );

        if ( is_wp_error( $attach_id ) || ! $attach_id ) {
            error_log( '[AI Haber Botu] Dış resim attachment oluşturulamadı: ' . ( is_wp_error( $attach_id ) ? $attach_id->get_error_message() : 'bilinmeyen' ) );
            return false;
        }

        update_post_meta( $attach_id, '_ahb_external_url', esc_url_raw( $image_url ) );
        // _wp_attached_file'a da yazalım (bazı eklentiler buna bakar)
        update_post_meta( $attach_id, '_wp_attached_file', esc_url_raw( $image_url ) );
        // Boyut bilgisi (tahmini — gerçek değerleri bilmiyoruz, varsayılan veriyoruz)
        update_post_meta( $attach_id, '_wp_attachment_metadata', array(
            'width'  => 1200,
            'height' => 630,
            'file'   => esc_url_raw( $image_url ),
            'sizes'  => array(),
        ) );
        if ( ! empty( $alt_text ) ) {
            update_post_meta( $attach_id, '_wp_attachment_image_alt', sanitize_text_field( $alt_text ) );
        }

        set_post_thumbnail( $post_id, $attach_id );
        update_post_meta( $post_id, '_ahb_source_image_url', esc_url_raw( $image_url ) );
        update_post_meta( $post_id, '_ahb_image_mode', 'link' );

        return $attach_id;
    }

    private function mime_from_url( $url ) {
        $path = parse_url( $url, PHP_URL_PATH );
        $ext  = strtolower( pathinfo( $path ?? '', PATHINFO_EXTENSION ) );
        $map  = array(
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png'  => 'image/png',
            'gif'  => 'image/gif',
            'webp' => 'image/webp',
            'avif' => 'image/avif',
        );
        return isset( $map[ $ext ] ) ? $map[ $ext ] : 'image/jpeg';
    }

    /**
     * Verilen HTML/metin içerikten ilk gerçek görselin URL'sini döner.
     * Logo, ikon, avatar, 1px piksel ve data: URI'leri atlar.
     */
    private function ilk_resmi_icerikten_cek( $html ) {
        if ( empty( $html ) || ! is_string( $html ) ) return '';
        // src veya data-src öncelikli
        if ( preg_match_all( '/<img[^>]+(?:data-src|data-original|src)=["\']([^"\']+)["\']/i', $html, $m ) ) {
            foreach ( $m[1] as $src ) {
                $src = trim( html_entity_decode( $src, ENT_QUOTES, 'UTF-8' ) );
                if ( empty( $src ) ) continue;
                if ( stripos( $src, 'data:' ) === 0 ) continue;
                if ( preg_match( '#(logo|sprite|icon|avatar|emoji|favicon|blank|spacer|pixel|1x1|placeholder)#i', $src ) ) continue;
                if ( preg_match( '#\.svg(\?|$)#i', $src ) ) continue;
                // Protokol normalize
                if ( strpos( $src, '//' ) === 0 ) $src = 'https:' . $src;
                if ( ! preg_match( '#^https?://#i', $src ) ) continue;
                return esc_url_raw( $src );
            }
        }
        return '';
    }

    /**
     * Verilen URL'deki resmi indirip post'a öne çıkan görsel olarak ayarlar.
     */
    private function set_featured_image( $post_id, $image_url, $alt_text = '' ) {
        if ( ! function_exists( 'media_sideload_image' ) ) {
            require_once ABSPATH . 'wp-admin/includes/media.php';
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';
        }

        // Resmi indir, attachment olarak kaydet
        $attachment_id = media_sideload_image( $image_url, $post_id, $alt_text, 'id' );

        if ( is_wp_error( $attachment_id ) ) {
            error_log( '[AI Haber Botu] Resim indirilemedi (' . $image_url . '): ' . $attachment_id->get_error_message() );
            return false;
        }

        // Alt metni ekle
        if ( ! empty( $alt_text ) ) {
            update_post_meta( $attachment_id, '_wp_attachment_image_alt', sanitize_text_field( $alt_text ) );
        }

        // Öne çıkan görsel olarak ata
        set_post_thumbnail( $post_id, $attachment_id );
        update_post_meta( $post_id, '_ahb_source_image_url', esc_url_raw( $image_url ) );

        return $attachment_id;
    }

    private function create_post( $ai_data, $original_item ) {
        $status      = get_option( 'ahb_post_status', 'publish' );
        $author_id   = (int) get_option( 'ahb_author_id', 1 );
        $post_type   = sanitize_key( get_option( 'ahb_post_type', 'haber' ) );
        $taxonomy    = sanitize_key( get_option( 'ahb_taxonomy', 'haber-kategorisi' ) );

        if ( ! post_type_exists( $post_type ) ) {
            error_log( '[AI Haber Botu] Post türü mevcut değil: ' . $post_type . ' — varsayılan post kullanılıyor.' );
            $post_type = 'post';
            $taxonomy  = 'category';
        }

        $content = wp_kses_post( $ai_data['icerik'] );

        // === İMZA (kaynak linki YOK) ===
        $signature_text = trim( (string) get_option( 'ahb_signature_text', 'AHENK HABER AJANSI' ) );
        $signature_html = '';
        if ( ! empty( $signature_text ) ) {
            $signature_html = "\n\n" . '<p class="ahb-signature" style="font-weight:bold;text-align:right;margin-top:24px;letter-spacing:0.5px;color:#222;">' .
                              esc_html( $signature_text ) . '</p>';
        }

        $post_id = wp_insert_post( array(
            'post_title'   => sanitize_text_field( $ai_data['baslik'] ),
            'post_content' => $content . $signature_html,
            'post_status'  => $status,
            'post_type'    => $post_type,
            'post_author'  => $author_id,
            'post_date'    => function_exists( 'ahb_real_mysql_now' ) ? ahb_real_mysql_now() : current_time( 'mysql' ),
        ), true );

        if ( is_wp_error( $post_id ) ) {
            error_log( '[AI Haber Botu] wp_insert_post hatası: ' . $post_id->get_error_message() );
            return false;
        }

        // === KATEGORİ ATAMA (HİBRİT) ===
        $category_id = $this->resolve_category( $ai_data, $original_item, $taxonomy );

        if ( $category_id && taxonomy_exists( $taxonomy ) ) {
            wp_set_object_terms( $post_id, array( (int) $category_id ), $taxonomy, false );
        }

        // === ETİKETLER ===
        $tag_taxonomy = get_option( 'ahb_tag_taxonomy', 'post_tag' );
        if ( taxonomy_exists( $tag_taxonomy ) ) {
            $all_tags = array();
            if ( ! empty( $ai_data['etiketler'] ) && is_array( $ai_data['etiketler'] ) ) {
                $all_tags = array_merge( $all_tags, array_map( 'sanitize_text_field', $ai_data['etiketler'] ) );
            }
            if ( ! empty( $ai_data['ana_varliklar'] ) && is_array( $ai_data['ana_varliklar'] ) ) {
                $all_tags = array_merge( $all_tags, array_map( 'sanitize_text_field', $ai_data['ana_varliklar'] ) );
            }
            if ( ! empty( $all_tags ) ) {
                wp_set_object_terms( $post_id, array_unique( $all_tags ), $tag_taxonomy, false );
            }
        }

        return $post_id;
    }

    /**
     * Hibrit kategori belirleme:
     * 1. RSS satırında belirtildiyse → onu kullan
     * 2. AI etkin ve mevcut kategoriler varsa → AI'ya seçtir
     * 3. Hiçbiri yoksa → varsayılan kategori
     */
    private function resolve_category( $ai_data, $original_item, $taxonomy ) {
        if ( ! taxonomy_exists( $taxonomy ) ) return 0;

        // 1. RSS satırından gelen kategori (manuel) — slug, isim veya kısmi isim eşleşmesi dene
        if ( ! empty( $this->forced_category_slug ) ) {
            // 1a) Slug ile dene (tam eşleşme)
            $term = get_term_by( 'slug', $this->forced_category_slug, $taxonomy );

            // 1b) İsim ile dene (kullanıcının yazdığı orijinal etiket: "Gündem")
            if ( ! $term && ! empty( $this->forced_category_label ) ) {
                $term = get_term_by( 'name', $this->forced_category_label, $taxonomy );
            }

            // 1c) Tüm terimler arasında case-insensitive isim/slug eşleşmesi ara
            if ( ! $term ) {
                $all = get_terms( array( 'taxonomy' => $taxonomy, 'hide_empty' => false ) );
                if ( ! is_wp_error( $all ) ) {
                    $needle_label = mb_strtolower( $this->forced_category_label, 'UTF-8' );
                    $needle_slug  = $this->forced_category_slug;
                    foreach ( $all as $t ) {
                        if ( mb_strtolower( $t->name, 'UTF-8' ) === $needle_label
                          || $t->slug === $needle_slug ) {
                            $term = $t;
                            break;
                        }
                    }
                }
            }

            if ( $term ) return $term->term_id;

            // 1d) Hiçbiri yoksa, kullanıcının yazdığı etiketle (Türkçe karakterli) yeni terim oluştur
            $name_to_create = ! empty( $this->forced_category_label ) ? $this->forced_category_label : $this->forced_category_slug;
            $created = wp_insert_term( $name_to_create, $taxonomy, array(
                'slug' => $this->forced_category_slug,
            ) );
            if ( ! is_wp_error( $created ) ) {
                return $created['term_id'];
            }
        }

        // 2. AI ile otomatik karar
        if ( get_option( 'ahb_ai_categorize', 1 ) ) {
            $terms = get_terms( array(
                'taxonomy'   => $taxonomy,
                'hide_empty' => false,
                'number'     => 50,
            ) );

            if ( ! is_wp_error( $terms ) && ! empty( $terms ) ) {
                $cat_list = array();
                foreach ( $terms as $t ) {
                    $cat_list[] = array(
                        'id'   => $t->term_id,
                        'name' => $t->name,
                        'slug' => $t->slug,
                    );
                }

                $chosen_id = $this->openai->categorize_news(
                    $ai_data['baslik'],
                    $ai_data['icerik'],
                    $cat_list
                );

                if ( $chosen_id ) {
                    $term = get_term( $chosen_id, $taxonomy );
                    if ( $term && ! is_wp_error( $term ) ) {
                        return $chosen_id;
                    }
                }
            }
        }

        // 3. Varsayılan kategori
        $default = (int) get_option( 'ahb_default_category', 0 );
        return $default;
    }
}
} // end class_exists guard
