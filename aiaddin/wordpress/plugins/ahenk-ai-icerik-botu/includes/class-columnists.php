<?php

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * AI Köşe Yazarları yöneticisi.
 *
 * Veri yapısı (option 'ahb_columnists' = array):
 * [
 *   'col_xxx' => [
 *       'id'             => 'col_xxx',
 *       'type'           => 'wp' | 'ai',
 *       'wp_user_id'     => 5,
 *       'name'           => 'Ayşe Öztürk',
 *       'gender'         => 'female|male|other',
 *       'avatar_id'      => 123,           // attachment id
 *       'avatar_prompt'  => '...',
 *       'bio'            => '...',
 *       'tone'           => 'samimi',
 *       'word_count'     => 600,
 *       'category_id'    => 0,
 *       'schedule_mode'  => 'single' | 'weekly',
 *       'topic_single'   => 'Teknoloji',
 *       'topics_weekly'  => ['mon'=>'Yemek', 'tue'=>'...'],
 *       'post_status'    => 'publish',
 *       'post_time'      => '09:00',
 *       'active'         => 1,
 *       'last_run_date'  => 'YYYY-MM-DD',
 *       'created_at'     => unix_ts,
 *   ]
 * ]
 */
if ( ! class_exists( 'AHB_Columnists' ) ) {
class AHB_Columnists {

    const OPTION = 'ahb_columnists';

    /** @var AHB_OpenAI_Client|null */
    private $openai = null;

    public function __construct( $openai = null ) {
        $this->openai = $openai;
    }

    /* ========== CRUD ========== */

    public static function all() {
        $data = get_option( self::OPTION, array() );
        return is_array( $data ) ? $data : array();
    }

    public static function get( $id ) {
        $all = self::all();
        return isset( $all[ $id ] ) ? $all[ $id ] : null;
    }

    public static function save( $columnist ) {
        $all = self::all();
        if ( empty( $columnist['id'] ) ) {
            $columnist['id']         = 'col_' . wp_generate_password( 8, false, false );
            $columnist['created_at'] = time();
        }
        $all[ $columnist['id'] ] = $columnist;
        update_option( self::OPTION, $all );
        return $columnist['id'];
    }

    public static function delete( $id ) {
        $all = self::all();
        if ( ! isset( $all[ $id ] ) ) return false;
        $col = $all[ $id ];

        // 'ai' veya 'ext' için oluşturulmuş stub WP user'ı sil (yazıları admin'e devret)
        if ( in_array( $col['type'], array( 'ai', 'ext' ), true ) && ! empty( $col['wp_user_id'] ) ) {
            $u = get_user_by( 'id', (int) $col['wp_user_id'] );
            if ( $u && get_user_meta( (int) $col['wp_user_id'], 'ahb_is_ai_author', true ) ) {
                require_once ABSPATH . 'wp-admin/includes/user.php';
                wp_delete_user( (int) $col['wp_user_id'], get_current_user_id() );
            }
        }

        // Avatar attachment'ını sadece AI yazar için sil — 'ext' yazarın görseli başka eklentiye ait
        if ( $col['type'] === 'ai' && ! empty( $col['avatar_id'] ) ) {
            wp_delete_attachment( (int) $col['avatar_id'], true );
        }

        unset( $all[ $id ] );
        update_option( self::OPTION, $all );
        return true;
    }

    /* ========== AI YAZAR İÇİN STUB WP USER ========== */

    /**
     * AI yazar için role=author bir WP kullanıcısı oluşturur (oturum açamaz).
     */
    public static function create_stub_user( $display_name, $bio = '' ) {
        $base_login = sanitize_user( 'aihaber_' . sanitize_title( $display_name ), true );
        $login = $base_login;
        $i = 2;
        while ( username_exists( $login ) ) {
            $login = $base_login . '_' . $i;
            $i++;
        }
        $email_local = sanitize_user( 'ai_' . wp_generate_password( 6, false, false ), true );
        $email = $email_local . '@ai-haber-botu.local';

        $user_id = wp_create_user( $login, wp_generate_password( 32 ), $email );
        if ( is_wp_error( $user_id ) ) {
            error_log( '[AHB] stub user create failed: ' . $user_id->get_error_message() );
            return 0;
        }
        wp_update_user( array(
            'ID'           => $user_id,
            'display_name' => $display_name,
            'nickname'     => $display_name,
            'first_name'   => $display_name,
            'description'  => $bio,
            'role'         => 'author',
        ) );
        update_user_meta( $user_id, 'ahb_is_ai_author', 1 );
        return $user_id;
    }

    /* ========== GÖRSEL ÜRETİMİ ========== */

    /**
     * AI ile profil görseli üretir, medya kütüphanesine ekler. Attachment id döner.
     */
    public function generate_avatar_attachment( $prompt, $name ) {
        if ( ! $this->openai ) return 0;
        $b64 = $this->openai->generate_image( $prompt, '1024x1024' );
        if ( ! $b64 ) return 0;
        return $this->save_base64_as_attachment( $b64, sanitize_title( $name ) . '-portre' );
    }

    public function save_base64_as_attachment( $b64, $filename_base ) {
        $bytes = base64_decode( $b64 );
        if ( ! $bytes ) return 0;

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';

        $upload = wp_upload_bits( $filename_base . '-' . wp_generate_password( 4, false, false ) . '.png', null, $bytes );
        if ( ! empty( $upload['error'] ) ) {
            error_log( '[AHB] upload error: ' . $upload['error'] );
            return 0;
        }
        $file_path = $upload['file'];
        $file_type = wp_check_filetype( basename( $file_path ), null );
        $attach    = array(
            'post_mime_type' => $file_type['type'],
            'post_title'     => sanitize_text_field( $filename_base ),
            'post_content'   => '',
            'post_status'    => 'inherit',
        );
        $attach_id = wp_insert_attachment( $attach, $file_path );
        if ( ! $attach_id || is_wp_error( $attach_id ) ) return 0;
        $attach_data = wp_generate_attachment_metadata( $attach_id, $file_path );
        wp_update_attachment_metadata( $attach_id, $attach_data );
        return (int) $attach_id;
    }

    /* ========== KONU ÇAKIŞMA KONTROLÜ ========== */

    /**
     * Belirli gün ve konunun başka bir yazar tarafından da yazılıp yazılmadığını kontrol eder.
     * @return array  Çakışan diğer yazar isimleri
     */
    public static function find_topic_conflicts( $columnist_id, $topic, $day_key = null ) {
        $topic_norm = self::normalize( $topic );
        if ( ! $topic_norm ) return array();
        $conflicts = array();
        foreach ( self::all() as $cid => $col ) {
            if ( $cid === $columnist_id ) continue;
            $topics = self::topics_of( $col, $day_key );
            foreach ( $topics as $t ) {
                if ( self::normalize( $t ) === $topic_norm ) {
                    $conflicts[] = $col['name'];
                    break;
                }
            }
        }
        return $conflicts;
    }

    private static function normalize( $s ) {
        $s = mb_strtolower( $s, 'UTF-8' );
        $s = preg_replace( '/[^\p{L}\p{N}]+/u', '', $s );
        return trim( $s );
    }

    /**
     * Bir yazarın belirtilen güne ait konularını döndürür (tek konu modunda hep aynı).
     */
    public static function topics_of( $col, $day_key = null ) {
        if ( empty( $col['schedule_mode'] ) || $col['schedule_mode'] === 'single' ) {
            return ! empty( $col['topic_single'] ) ? array( $col['topic_single'] ) : array();
        }
        $w = isset( $col['topics_weekly'] ) && is_array( $col['topics_weekly'] ) ? $col['topics_weekly'] : array();
        if ( $day_key ) {
            return ! empty( $w[ $day_key ] ) ? array( $w[ $day_key ] ) : array();
        }
        return array_values( array_filter( $w ) );
    }

    public static function todays_topic( $col ) {
        $day_key = strtolower( substr( date_i18n( 'D' ), 0, 3 ) ); // mon,tue,wed,thu,fri,sat,sun
        $arr = self::topics_of( $col, $day_key );
        return ! empty( $arr ) ? $arr[0] : '';
    }

    /* ========== KÖŞE YAZISI ÜRETİMİ ========== */

    /**
     * Bir yazar için (varsa) bugünkü köşe yazısını üretir ve post oluşturur.
     * @return int|WP_Error post_id veya hata
     */
    public function generate_for( $columnist_id, $force_topic = '', $force = false ) {
        $col = self::get( $columnist_id );
        if ( ! $col ) return new WP_Error( 'not_found', 'Yazar bulunamadı' );

        if ( ! $force && empty( $col['active'] ) ) {
            return new WP_Error( 'inactive', 'Yazar pasif' );
        }

        $today = date_i18n( 'Y-m-d' );
        if ( ! $force && ! empty( $col['last_run_date'] ) && $col['last_run_date'] === $today ) {
            return new WP_Error( 'already_run', 'Bugün zaten yazı üretildi' );
        }

        $topic = $force_topic ? $force_topic : self::todays_topic( $col );
        if ( empty( $topic ) ) {
            return new WP_Error( 'no_topic', 'Bugün için tanımlı konu yok' );
        }

        if ( ! $this->openai ) {
            return new WP_Error( 'no_openai', 'OpenAI istemcisi başlatılmadı' );
        }

        $profile = array(
            'name'  => $col['name'],
            'bio'   => isset( $col['bio'] ) ? $col['bio'] : '',
            'tone'  => isset( $col['tone'] ) ? $col['tone'] : 'samimi ve özgün',
            'topic' => $topic,
        );
        $words = ! empty( $col['word_count'] ) ? (int) $col['word_count'] : 600;

        $data = $this->openai->write_column( $profile, $words );
        if ( empty( $data ) || empty( $data['baslik'] ) || empty( $data['icerik'] ) ) {
            // Detaylı hata teşhisi
            $key_set = (bool) trim( (string) get_option( 'ahb_openai_api_key', '' ) );
            $model   = get_option( 'ahb_openai_model', '?' );
            $sebep   = '';
            if ( ! $key_set ) {
                $sebep = 'OpenAI API anahtarı girilmemiş — Ayarlar > Genel sekmesinden ekleyin.';
            } elseif ( $data === false || $data === null ) {
                $api_err = isset( $this->openai->last_error ) ? $this->openai->last_error : '';
                $sebep = 'OpenAI API hatası → ' . ( $api_err ? $api_err : 'bilinmeyen' ) . ' (model: ' . $model . ')';
            } elseif ( is_array( $data ) && empty( $data ) ) {
                $sebep = 'AI yanıtı JSON formatında değil (model ' . $model . ' format korumadı).';
            } else {
                $sebep = 'AI yanıtında baslik/icerik alanı eksik. Model: ' . $model . '. Yazar konusu: "' . $topic . '"';
            }
            error_log( '[AI Haber Botu] Köşe yazısı üretemedi → yazar=' . $col['name'] . ' | konu="' . $topic . '" | sebep=' . $sebep . ' | response=' . wp_json_encode( $data ) );
            return new WP_Error( 'ai_failed', 'AI yazı üretemedi: ' . $sebep );
        }

        // Post type seçimi: önce yazara özel, sonra global "köşe" ayarı, sonra ky-makale,
        // sonra makale, sonra haber, sonra post.
        $post_type = '';
        $candidates = array();
        if ( ! empty( $col['post_type'] ) ) $candidates[] = sanitize_key( $col['post_type'] );
        $opt_pt = sanitize_key( get_option( 'ahb_columnist_post_type', '' ) );
        if ( $opt_pt ) $candidates[] = $opt_pt;
        $candidates[] = 'ky-makale';
        $candidates[] = 'makale';
        $candidates[] = 'kose-yazisi';
        $candidates[] = 'kose_yazisi';
        $candidates[] = 'haber';
        $candidates[] = 'post';
        foreach ( $candidates as $pt ) {
            if ( $pt && post_type_exists( $pt ) ) { $post_type = $pt; break; }
        }
        if ( ! $post_type ) $post_type = 'post';

        $post_arr = array(
            'post_title'   => wp_strip_all_tags( $data['baslik'] ),
            'post_content' => wp_kses_post( $data['icerik'] ),
            'post_excerpt' => isset( $data['ozet'] ) ? sanitize_text_field( $data['ozet'] ) : '',
            'post_status'  => 'publish',
            'post_type'    => $post_type,
            'post_author'  => (int) $col['wp_user_id'],
        );
        $post_id = wp_insert_post( $post_arr, true );
        if ( is_wp_error( $post_id ) ) return $post_id;

        // Kategori
        if ( ! empty( $col['category_id'] ) ) {
            $tax = sanitize_key( get_option( 'ahb_taxonomy', 'category' ) );
            if ( ! taxonomy_exists( $tax ) ) $tax = 'category';
            wp_set_post_terms( $post_id, array( (int) $col['category_id'] ), $tax );
        }

        // Etiketler
        if ( ! empty( $data['etiketler'] ) && is_array( $data['etiketler'] ) ) {
            $tag_tax = sanitize_key( get_option( 'ahb_tag_taxonomy', 'post_tag' ) );
            if ( taxonomy_exists( $tag_tax ) ) {
                wp_set_post_terms( $post_id, array_map( 'sanitize_text_field', $data['etiketler'] ), $tag_tax );
            }
        }

        // Köşe yazısı işareti (ileride filtreleme için)
        update_post_meta( $post_id, '_ahb_column_post', 1 );
        update_post_meta( $post_id, '_ahb_columnist_id', $col['id'] );

        // Featured image: yazarın avatar'ı veya generate
        if ( ! empty( $col['avatar_id'] ) ) {
            set_post_thumbnail( $post_id, (int) $col['avatar_id'] );
        }

        // Son çalışmayı güncelle
        $col['last_run_date'] = $today;
        self::save( $col );

        return $post_id;
    }

    /* ========== CRON / GÜNLÜK ÇALIŞMA ========== */

    /**
     * Cron tarafından her saat çağrılır. Aktif yazarlardan post_time'ı geçmiş ve bugün
     * çalışmamış olanları üretir.
     */
    public function daily_cron_tick() {
        $api = get_option( 'ahb_openai_api_key', '' );
        if ( ! $api ) return;
        if ( ! $this->openai ) {
            $this->openai = new AHB_OpenAI_Client( $api );
        }

        $today = date_i18n( 'Y-m-d' );
        $now_min = (int) date_i18n( 'H' ) * 60 + (int) date_i18n( 'i' );

        foreach ( self::all() as $cid => $col ) {
            if ( empty( $col['active'] ) ) continue;
            if ( ! empty( $col['last_run_date'] ) && $col['last_run_date'] === $today ) continue;

            $pt = isset( $col['post_time'] ) ? $col['post_time'] : '09:00';
            $parts = explode( ':', $pt );
            $sched_min = (int) $parts[0] * 60 + (int) ( isset( $parts[1] ) ? $parts[1] : 0 );
            if ( $now_min < $sched_min ) continue;

            $topic = self::todays_topic( $col );
            if ( ! $topic ) continue;

            $this->generate_for( $cid );
            usleep( 800000 );
        }
    }
}

/* ============================================================
 * Avatar filter — AI yazarların yorumlarda/yazar arşivlerinde
 * gerçek profil görseli görünsün (Gravatar yerine).
 * ============================================================ */
add_filter( 'get_avatar_url', function( $url, $id_or_email, $args ) {
    $user = null;
    if ( is_numeric( $id_or_email ) ) {
        $user = get_user_by( 'id', (int) $id_or_email );
    } elseif ( is_object( $id_or_email ) && ! empty( $id_or_email->user_id ) ) {
        $user = get_user_by( 'id', (int) $id_or_email->user_id );
    } elseif ( is_string( $id_or_email ) && is_email( $id_or_email ) ) {
        $user = get_user_by( 'email', $id_or_email );
    }
    if ( ! $user ) return $url;
    if ( ! get_user_meta( $user->ID, 'ahb_is_ai_author', true ) ) return $url;

    foreach ( AHB_Columnists::all() as $col ) {
        if ( (int) $col['wp_user_id'] === (int) $user->ID && ! empty( $col['avatar_id'] ) ) {
            $img = wp_get_attachment_image_url( (int) $col['avatar_id'], 'thumbnail' );
            if ( $img ) return $img;
        }
    }
    return $url;
}, 10, 3 );
} // end class_exists guard
