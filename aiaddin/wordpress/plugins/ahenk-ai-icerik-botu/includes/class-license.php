<?php
/**
 * Ahenk Lisans Sistemi — Kullanici/Admin auth + abonelik + aktivasyon kodu.
 *
 * MVP yaklasim:
 *   - Her WP kurulumu kendi DB'sinde user/payments tutar (lokal).
 *   - Aktivasyon kodlari HMAC-SHA256 ile imzalanir; offline dogrulanir.
 *   - Nail Bey kendi WP'sinde "Aktivasyon Kodu Uretici" ile musteriye kod uretir.
 *   - Musteri kodu yapistirir, suresi uzar.
 *   - Default admin: ahenkbt@gmail.com / Ahenk2006*
 *   - Custom login (eklenti gate'i, WP-Admin'in ustunde) + cookie session + remember.
 *   - Tek domain kilidi (ilk kayitta site_url() kayit; degisirse engelle).
 *   - Lisans suresi bitince tum AI submenu'leri "Lisans Yenile" sayfasina yonlendirir.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class Ahenk_License {

    const VERSION         = 1;
    const SLUG            = 'ahenk-license';
    const TBL_USERS       = 'ahb_lic_users';
    const TBL_PAYMENTS    = 'ahb_lic_payments';
    const COOKIE_SESSION  = 'ahb_lic_sess';
    const COOKIE_REMEMBER = 'ahb_lic_rem';
    // v3.11.4: HMAC secret dinamik — wp_salt/AUTH_KEY ile harmanlanır, bkz. self::hmac_secret()
    const DEFAULT_ADMIN_EMAIL = 'ahenkbt@gmail.com';
    // DEFAULT_ADMIN_PASS v3.11.4'ten itibaren KALDIRILDI (güvenlik). Kurulumda rastgele üretilir.
    const SUPPORT_EMAIL   = 'ahenkbt@gmail.com';
    const SUPPORT_WHATSAPP= '+905413136245';
    const STRIPE_LINK     = 'https://buy.stripe.com/00w4gz8HJdwQe9FcNQb3q0a';
    const IBAN            = 'TR570010300000000081220796';
    const IBAN_NAME       = 'Vatan Sosyal Hizmetler Ltd';
    const TRIAL_DAYS      = 7;

    public static function init() {
        $self = new self();
        register_activation_hook( AHB_PLUGIN_DIR . 'ai-haber-botu.php', array( __CLASS__, 'install' ) );
        add_action( 'admin_menu',      array( $self, 'menu' ), 5 );  // erken menu
        add_action( 'admin_init',      array( $self, 'maybe_reseed_admin' ), 0 );
        add_action( 'admin_init',      array( $self, 'gate' ), 1 );  // her admin sayfada gate
        add_action( 'admin_notices',   array( $self, 'expiry_notice' ) );
        // AJAX
        add_action( 'wp_ajax_ahenk_lic_login',           array( $self, 'ajax_login' ) );
        add_action( 'wp_ajax_nopriv_ahenk_lic_login',    array( $self, 'ajax_login' ) );
        add_action( 'wp_ajax_ahenk_lic_logout',          array( $self, 'ajax_logout' ) );
        add_action( 'wp_ajax_ahenk_lic_register',        array( $self, 'ajax_register' ) );
        add_action( 'wp_ajax_ahenk_lic_change_pass',     array( $self, 'ajax_change_pass' ) );
        add_action( 'wp_ajax_ahenk_lic_upload_dekont',   array( $self, 'ajax_upload_dekont' ) );
        add_action( 'wp_ajax_ahenk_lic_apply_code',      array( $self, 'ajax_apply_code' ) );
        add_action( 'wp_ajax_ahenk_lic_admin_action',    array( $self, 'ajax_admin_action' ) );
        add_action( 'wp_ajax_ahenk_lic_generate_code',   array( $self, 'ajax_generate_code' ) );
        add_action( 'wp_ajax_ahenk_lic_admin_add_user',  array( $self, 'ajax_admin_add_user' ) );
        add_action( 'wp_ajax_ahenk_lic_add_manager',     array( $self, 'ajax_add_manager' ) );
        add_action( 'wp_ajax_ahenk_toggle_module',       array( $self, 'ajax_toggle_module' ) );
        // Kurulum kontrolu (db migration check)
        add_action( 'plugins_loaded', array( __CLASS__, 'maybe_install' ) );
        // v3.11.4: Kurulumda üretilen rastgele admin şifresini bir kereye mahsus göster
        add_action( 'admin_notices',  array( $self, 'first_run_password_notice' ) );
    }

    /* ================================================================== */
    /* GÜVENLİK HELPER'LARI (v3.11.4)                                       */
    /* ================================================================== */

    /**
     * Pepper: DB sızdırılsa bile hash'ler brute-force'a karşı güçlü kalır.
     * Pepper kodda değil, WP salt'larından türetilir (her sitede farklı).
     */
    private static function pepper() {
        $salt = '';
        if ( defined( 'AUTH_KEY' ) )   $salt .= AUTH_KEY;
        if ( defined( 'NONCE_SALT' ) ) $salt .= NONCE_SALT;
        if ( function_exists( 'wp_salt' ) ) $salt .= wp_salt( 'auth' );
        if ( $salt === '' ) $salt = AHB_PLUGIN_DIR; // son çare
        return 'AhenkAI-Pepper-v1|' . hash( 'sha256', $salt );
    }

    /** Şifreyi pepper + bcrypt(cost=12) ile hash'ler. */
    public static function hash_password( $pass ) {
        return password_hash( $pass . self::pepper(), PASSWORD_BCRYPT, array( 'cost' => 12 ) );
    }

    /**
     * Şifre doğrular. Yeni (pepperlı) hash önce denenir, eski (pepperlı olmayan)
     * hash'lere de geriye dönük uyumlu doğrulama yapılır.
     */
    public static function verify_password( $pass, $hash ) {
        if ( empty( $hash ) ) return false;
        if ( password_verify( $pass . self::pepper(), $hash ) ) return true;
        // Legacy (v3.11.3 ve öncesi — peppersız) fallback
        if ( password_verify( $pass, $hash ) ) return true;
        return false;
    }

    /**
     * Aktivasyon kodu (build_code/parse_code) HMAC anahtarı.
     * Tüm Ahenk kurulumlarında AYNI olmalı; yönetici sitesinde üretilen
     * kod, müşteri sitesinde doğrulanabilsin diye siteden bağımsızdır.
     * Değiştirmeyin — eski kodlar geçersiz olur.
     */
    public static function license_hmac_secret() {
        return hash( 'sha256', 'AhenkAI-LicenseCode-GLOBAL-2026|nail.turkoglu@ahenk.net.tr|do_not_change|v1' );
    }

    /** Oturum/remember cookie HMAC'ı. Kodda sabit yok; wp_salt'tan türetilir. */
    public static function hmac_secret() {
        $salt = '';
        if ( defined( 'SECURE_AUTH_KEY' ) ) $salt .= SECURE_AUTH_KEY;
        if ( defined( 'LOGGED_IN_SALT' ) )  $salt .= LOGGED_IN_SALT;
        if ( function_exists( 'wp_salt' ) ) $salt .= wp_salt( 'secure_auth' );
        if ( $salt === '' ) $salt = AHB_PLUGIN_DIR;
        return hash( 'sha256', 'AhenkAI-HMAC-v1|' . $salt );
    }

    /* ================================================================== */
    /* INSTALL & MIGRATION                                                  */
    /* ================================================================== */

    public static function maybe_install() {
        if ( (int) get_option( 'ahb_lic_db_v', 0 ) < self::VERSION ) self::install();
    }

    public static function install() {
        global $wpdb;
        $charset = $wpdb->get_charset_collate();
        $u = $wpdb->prefix . self::TBL_USERS;
        $p = $wpdb->prefix . self::TBL_PAYMENTS;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta( "CREATE TABLE $u (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(190) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(190) DEFAULT '',
            role VARCHAR(20) NOT NULL DEFAULT 'user',
            domain VARCHAR(190) DEFAULT '',
            plan VARCHAR(40) NOT NULL DEFAULT 'trial',
            status VARCHAR(20) NOT NULL DEFAULT 'aktif',
            trial_until DATETIME DEFAULT NULL,
            expires_at DATETIME DEFAULT NULL,
            last_login DATETIME DEFAULT NULL,
            remember_token VARCHAR(190) DEFAULT '',
            created_at DATETIME NOT NULL,
            INDEX idx_email (email)
        ) $charset;" );
        dbDelta( "CREATE TABLE $p (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT UNSIGNED NOT NULL,
            email VARCHAR(190) NOT NULL,
            plan VARCHAR(40) NOT NULL,
            amount_usd INT NOT NULL DEFAULT 0,
            method VARCHAR(20) NOT NULL DEFAULT 'havale',
            dekont_url TEXT DEFAULT '',
            note TEXT DEFAULT '',
            status VARCHAR(20) NOT NULL DEFAULT 'beklemede',
            admin_note TEXT DEFAULT '',
            created_at DATETIME NOT NULL,
            INDEX idx_user (user_id),
            INDEX idx_status (status)
        ) $charset;" );
        // Default admin — sadece bir kez, v3.11.4'ten itibaren RASTGELE şifreyle.
        $exists = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM $u WHERE email=%s", self::DEFAULT_ADMIN_EMAIL ) );
        if ( ! $exists ) {
            $random_pass = wp_generate_password( 16, true, false );
            $wpdb->insert( $u, array(
                'email'         => self::DEFAULT_ADMIN_EMAIL,
                'password_hash' => self::hash_password( $random_pass ),
                'full_name'     => 'Sistem Yöneticisi',
                'role'          => 'admin',
                'domain'        => parse_url( site_url(), PHP_URL_HOST ),
                'plan'          => 'lifetime',
                'status'        => 'aktif',
                'expires_at'    => '2099-12-31 23:59:59',
                'created_at'    => current_time( 'mysql' ),
            ) );
            // Tek seferlik admin bildirimi — WP admin notice olarak gösterilecek,
            // onaylandıktan sonra silinir. Email ile de gönderilir.
            set_transient( 'ahenk_first_admin_pass', $random_pass, DAY_IN_SECONDS * 30 );
            $body = "Ahenk AI İçerik Robotu kuruldu.\n\n"
                . "Yönetici Paneli Girişi:\n"
                . "Email: " . self::DEFAULT_ADMIN_EMAIL . "\n"
                . "Şifre: " . $random_pass . "\n\n"
                . "Güvenlik: WordPress yöneticileri parola girmeden otomatik tanınır.\n"
                . "Bu şifreyi lütfen güvenli bir yere not alın; şifre değiştirme bölümünden güncelleyebilirsiniz.\n\n"
                . "Site: " . site_url();
            @wp_mail( self::DEFAULT_ADMIN_EMAIL, 'Ahenk AI — İlk Kurulum Yönetici Bilgileri', $body );
        }
        update_option( 'ahb_lic_db_v', self::VERSION );
        if ( ! get_option( 'ahb_lic_install_date' ) ) update_option( 'ahb_lic_install_date', current_time( 'mysql' ) );
    }

    /* ================================================================== */
    /* MENU + GATE                                                          */
    /* ================================================================== */

    public function menu() {
        // Lisans sayfasi her zaman erisilebilir (gate icindir)
        add_menu_page( 'Ahenk Lisans', '🔐 Ahenk Lisans', 'read', self::SLUG, array( $this, 'render' ), 'dashicons-shield-alt', 2 );
    }

    /**
     * Gate: Tum Ahenk-AI submenu'lerine girmeden once
     *  - Eklenti login (ahb_lic_sess cookie) yoksa → login formuna at
     *  - Lisans suresi bitmis ve admin degilse → sadece lisans sayfasina izin
     */
    public function gate() {
        if ( ! is_admin() ) return;
        $page = isset( $_GET['page'] ) ? sanitize_key( $_GET['page'] ) : '';
        if ( ! $page ) return;
        // Sadece Ahenk eklenti sayfalarinda gate calistir
        $protected_prefixes = array( 'ai-haber-botu', 'ahenk-', 'ahb-' );
        $is_ahenk = false;
        foreach ( $protected_prefixes as $pfx ) if ( strpos( $page, $pfx ) === 0 ) { $is_ahenk = true; break; }
        if ( ! $is_ahenk ) return;
        if ( $page === self::SLUG ) return; // lisans sayfasi her zaman erisilebilir

        // v3.11.4b: WP admin otomatik eşleşmesi KALDIRILDI — her kullanıcı
        // panele girmek için eklenti email+şifresiyle oturum açmak zorundadır.
        $user = $this->current_user();
        if ( ! $user ) {
            wp_safe_redirect( admin_url( 'admin.php?page=' . self::SLUG ) );
            exit;
        }
        // Domain kilidi: kayitta tutulan domain ile mevcut site_url uyusmazsa engelle (staff harici)
        $cur_domain = parse_url( site_url(), PHP_URL_HOST );
        $is_staff = in_array( $user['role'], array( 'admin', 'submanager' ), true );
        if ( ! $is_staff && $user['domain'] && strcasecmp( $user['domain'], $cur_domain ) !== 0 ) {
            wp_safe_redirect( admin_url( 'admin.php?page=' . self::SLUG . '&domainerr=1' ) );
            exit;
        }
        // Sure kontrolu (staff sinirsiz)
        if ( ! $this->is_active( $user ) && ! $is_staff ) {
            wp_safe_redirect( admin_url( 'admin.php?page=' . self::SLUG . '&expired=1' ) );
            exit;
        }
    }

    public function expiry_notice() {
        $u = $this->current_user();
        if ( ! $u || in_array( $u['role'], array( 'admin', 'submanager' ), true ) ) return;
        $days = $this->days_remaining( $u );
        if ( $days === null ) return;
        if ( $days < 0 ) {
            echo '<div class="notice notice-error"><p>⛔ <strong>Aboneliğin sona erdi.</strong> Eklentiyi kullanmak için <a href="' . esc_url( admin_url( 'admin.php?page=' . self::SLUG ) ) . '">lisans yenile</a>.</p></div>';
        } elseif ( $days <= 7 ) {
            echo '<div class="notice notice-warning"><p>⏰ Aboneliğin <strong>' . (int) $days . ' gün</strong> sonra bitiyor. <a href="' . esc_url( admin_url( 'admin.php?page=' . self::SLUG ) ) . '">Yenile →</a></p></div>';
        }
    }

    /* ================================================================== */
    /* AUTH HELPERS                                                         */
    /* ================================================================== */

    private function current_user() {
        // 1) Session cookie
        $sess = isset( $_COOKIE[ self::COOKIE_SESSION ] ) ? (string) $_COOKIE[ self::COOKIE_SESSION ] : '';
        if ( $sess ) {
            $u = $this->verify_session_token( $sess );
            if ( $u ) return $u;
        }
        // 2) Remember cookie
        $rem = isset( $_COOKIE[ self::COOKIE_REMEMBER ] ) ? (string) $_COOKIE[ self::COOKIE_REMEMBER ] : '';
        if ( $rem ) {
            $u = $this->verify_remember_token( $rem );
            if ( $u ) {
                $this->set_session_cookie( $u['id'], DAY_IN_SECONDS );
                return $u;
            }
        }
        // v3.11.4b: WP admin otomatik bypass kaldırıldı — sadece çerez oturumuna güvenilir.
        return null;
    }

    /**
     * v3.11.4b — Tek seferlik re-seed:
     *  • admin@turkem.org gibi eski oto-map hesaplarını siler
     *  • ahenkbt@gmail.com kullanıcısının şifresini sabit "Ahenk2006*" olarak ayarlar
     *    (yoksa lifetime admin olarak oluşturur)
     *  • Tüm eski oturum çerezlerini geçersiz kılmak için yeni bir pepper sürümü
     *    atılmadan, sadece mevcut kullanıcıda değişiklik yapar.
     */
    public function maybe_reseed_admin() {
        if ( get_option( 'ahenk_reseed_v2_done' ) ) return;
        global $wpdb; $t = $wpdb->prefix . self::TBL_USERS;
        // Olası WP otomatik admin(ler)ini temizle: ahenkbt dışındaki tüm "admin" rollü eski hesaplar
        $wpdb->query( "DELETE FROM $t WHERE role='admin' AND email <> 'ahenkbt@gmail.com'" );
        $email = 'ahenkbt@gmail.com';
        $hash  = self::hash_password( 'Ahenk2006*' );
        $u = $this->find_user_by_email( $email );
        $row = array(
            'password_hash' => $hash,
            'role'          => 'admin',
            'status'        => 'aktif',
            'plan'          => 'lifetime',
            'expires_at'    => '2099-12-31 23:59:59',
        );
        if ( $u ) {
            $wpdb->update( $t, $row, array( 'id' => (int) $u['id'] ) );
        } else {
            $row['email']      = $email;
            $row['full_name']  = 'Ahenk Admin';
            $row['domain']     = parse_url( site_url(), PHP_URL_HOST );
            $row['created_at'] = current_time( 'mysql' );
            $wpdb->insert( $t, $row );
        }
        update_option( 'ahenk_reseed_v2_done', 1, false );
        // İlk kurulumdan kalmış olası geçici rastgele şifreyi de temizle
        delete_transient( 'ahenk_first_admin_pass' );
    }

    /** İlk kurulumda üretilen rastgele admin şifresini bir kereye mahsus gösterir. */
    public function first_run_password_notice() {
        if ( ! current_user_can( 'manage_options' ) ) return;
        $pass = get_transient( 'ahenk_first_admin_pass' );
        if ( ! $pass ) return;
        // Kullanıcı gördü/onayladı mı?
        if ( ! empty( $_GET['ahenk_dismiss_first_pass'] ) ) {
            delete_transient( 'ahenk_first_admin_pass' );
            return;
        }
        $dismiss = esc_url( add_query_arg( 'ahenk_dismiss_first_pass', '1' ) );
        echo '<div class="notice notice-warning" style="border-left-color:#dba617;"><p><strong>🔐 Ahenk AI — İlk Kurulum Yönetici Şifresi</strong><br>'
            . 'Email: <code>' . esc_html( self::DEFAULT_ADMIN_EMAIL ) . '</code> · '
            . 'Şifre: <code style="background:#fff8d6;padding:3px 8px;font-size:14px;">' . esc_html( $pass ) . '</code><br>'
            . '<span style="font-size:12px;color:#646970;">Güvenli bir yere not alıp bu uyarıyı kapatın. WP yöneticisi iseniz zaten otomatik giriş yaparsınız.</span><br>'
            . '<a href="' . $dismiss . '" class="button" style="margin-top:6px;">✓ Not aldım, bu uyarıyı kapat</a></p></div>';
    }

    private function set_session_cookie( $uid, $ttl ) {
        $exp = time() + $ttl;
        $payload = $uid . '|' . $exp;
        $sig = hash_hmac( 'sha256', $payload, self::hmac_secret() );
        $token = $payload . '|' . $sig;
        setcookie( self::COOKIE_SESSION, $token, $exp, COOKIEPATH ?: '/', COOKIE_DOMAIN, is_ssl(), true );
        $_COOKIE[ self::COOKIE_SESSION ] = $token;
    }

    private function verify_session_token( $token ) {
        $parts = explode( '|', $token );
        if ( count( $parts ) !== 3 ) return null;
        list( $uid, $exp, $sig ) = $parts;
        if ( (int) $exp < time() ) return null;
        $expected = hash_hmac( 'sha256', $uid . '|' . $exp, self::hmac_secret() );
        if ( ! hash_equals( $expected, $sig ) ) return null;
        return $this->find_user( (int) $uid );
    }

    private function set_remember_cookie( $uid ) {
        $rand = bin2hex( random_bytes( 16 ) );
        global $wpdb; $t = $wpdb->prefix . self::TBL_USERS;
        $wpdb->update( $t, array( 'remember_token' => $rand ), array( 'id' => (int) $uid ) );
        $exp = time() + 90 * DAY_IN_SECONDS;
        $payload = $uid . '|' . $rand . '|' . $exp;
        $sig = hash_hmac( 'sha256', $payload, self::hmac_secret() );
        $tok = $payload . '|' . $sig;
        setcookie( self::COOKIE_REMEMBER, $tok, $exp, COOKIEPATH ?: '/', COOKIE_DOMAIN, is_ssl(), true );
    }

    private function verify_remember_token( $token ) {
        $parts = explode( '|', $token );
        if ( count( $parts ) !== 4 ) return null;
        list( $uid, $rand, $exp, $sig ) = $parts;
        if ( (int) $exp < time() ) return null;
        $expected = hash_hmac( 'sha256', $uid . '|' . $rand . '|' . $exp, self::hmac_secret() );
        if ( ! hash_equals( $expected, $sig ) ) return null;
        $u = $this->find_user( (int) $uid );
        if ( ! $u || ! hash_equals( (string) $u['remember_token'], $rand ) ) return null;
        return $u;
    }

    private function find_user( $id ) {
        global $wpdb; $t = $wpdb->prefix . self::TBL_USERS;
        $row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $t WHERE id=%d", (int) $id ), ARRAY_A );
        return $row ?: null;
    }

    private function find_user_by_email( $email ) {
        global $wpdb; $t = $wpdb->prefix . self::TBL_USERS;
        $row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $t WHERE email=%s", strtolower( trim( $email ) ) ), ARRAY_A );
        return $row ?: null;
    }

    private function is_active( $u ) {
        if ( ! $u || $u['status'] !== 'aktif' ) return false;
        if ( in_array( $u['role'], array( 'admin', 'submanager' ), true ) ) return true; // staff sinirsiz
        $end = $this->effective_end( $u );
        if ( ! $end ) return false;
        return strtotime( $end ) >= time();
    }

    /** Statik helper: mevcut kullanici admin veya submanager mi? */
    public static function is_staff() {
        static $inst = null;
        if ( $inst === null ) $inst = new self();
        $u = $inst->current_user();
        return $u && in_array( $u['role'], array( 'admin', 'submanager' ), true );
    }

    public static function is_admin_only() {
        static $inst = null;
        if ( $inst === null ) $inst = new self();
        $u = $inst->current_user();
        return $u && $u['role'] === 'admin';
    }

    private function effective_end( $u ) {
        if ( ! empty( $u['expires_at'] ) ) return $u['expires_at'];
        if ( ! empty( $u['trial_until'] ) ) return $u['trial_until'];
        return null;
    }

    private function days_remaining( $u ) {
        $end = $this->effective_end( $u );
        if ( ! $end ) return null;
        return (int) floor( ( strtotime( $end ) - time() ) / DAY_IN_SECONDS );
    }

    /* ================================================================== */
    /* AJAX                                                                 */
    /* ================================================================== */

    public function ajax_login() {
        check_ajax_referer( 'ahenk_lic' );
        $email = strtolower( trim( (string) ( $_POST['email'] ?? '' ) ) );
        $pass  = (string) ( $_POST['password'] ?? '' );
        $rem   = ! empty( $_POST['remember'] );
        $u = $this->find_user_by_email( $email );
        if ( ! $u || ! self::verify_password( $pass, $u['password_hash'] ) ) wp_send_json_error( array( 'msg' => 'Email veya şifre hatalı.' ) );
        if ( $u['status'] === 'pasif' ) wp_send_json_error( array( 'msg' => 'Hesabınız pasif. Yöneticiyle iletişime geçin.' ) );
        $cur_domain = parse_url( site_url(), PHP_URL_HOST );
        $is_staff_login = in_array( $u['role'], array( 'admin', 'submanager' ), true );
        if ( ! $is_staff_login && $u['domain'] && strcasecmp( $u['domain'], $cur_domain ) !== 0 ) {
            wp_send_json_error( array( 'msg' => 'Bu lisans başka bir alan adına kilitli: ' . $u['domain'] ) );
        }
        global $wpdb; $t = $wpdb->prefix . self::TBL_USERS;
        $wpdb->update( $t, array( 'last_login' => current_time( 'mysql' ) ), array( 'id' => (int) $u['id'] ) );
        $this->set_session_cookie( (int) $u['id'], DAY_IN_SECONDS );
        if ( $rem ) $this->set_remember_cookie( (int) $u['id'] );
        wp_send_json_success( array( 'redirect' => admin_url( 'admin.php?page=' . self::SLUG ) ) );
    }

    public function ajax_logout() {
        setcookie( self::COOKIE_SESSION,  '', time() - 3600, COOKIEPATH ?: '/', COOKIE_DOMAIN );
        setcookie( self::COOKIE_REMEMBER, '', time() - 3600, COOKIEPATH ?: '/', COOKIE_DOMAIN );
        wp_send_json_success( array( 'redirect' => admin_url( 'admin.php?page=' . self::SLUG ) ) );
    }

    public function ajax_register() {
        check_ajax_referer( 'ahenk_lic' );
        $email = strtolower( trim( (string) ( $_POST['email'] ?? '' ) ) );
        $pass  = (string) ( $_POST['password'] ?? '' );
        $name  = sanitize_text_field( (string) ( $_POST['full_name'] ?? '' ) );
        if ( ! is_email( $email ) || strlen( $pass ) < 6 ) wp_send_json_error( array( 'msg' => 'Geçerli email ve en az 6 karakter şifre girin.' ) );
        if ( $this->find_user_by_email( $email ) ) wp_send_json_error( array( 'msg' => 'Bu email zaten kayıtlı. Giriş yapın.' ) );
        global $wpdb; $t = $wpdb->prefix . self::TBL_USERS;
        $domain = parse_url( site_url(), PHP_URL_HOST );
        $now    = current_time( 'mysql' );
        $trial  = date( 'Y-m-d H:i:s', strtotime( $now ) + self::TRIAL_DAYS * DAY_IN_SECONDS );
        $wpdb->insert( $t, array(
            'email'         => $email,
            'password_hash' => self::hash_password( $pass ),
            'full_name'     => $name,
            'role'          => 'user',
            'domain'        => $domain,
            'plan'          => 'trial',
            'status'        => 'aktif',
            'trial_until'   => $trial,
            'created_at'    => $now,
        ) );
        $uid = (int) $wpdb->insert_id;
        $this->set_session_cookie( $uid, DAY_IN_SECONDS );
        wp_send_json_success( array( 'redirect' => admin_url( 'admin.php?page=' . self::SLUG ) ) );
    }

    public function ajax_change_pass() {
        check_ajax_referer( 'ahenk_lic' );
        $u = $this->current_user();
        if ( ! $u ) wp_send_json_error( array( 'msg' => 'oturum yok' ) );
        $old = (string) ( $_POST['old'] ?? '' );
        $new = (string) ( $_POST['new'] ?? '' );
        if ( ! self::verify_password( $old, $u['password_hash'] ) ) wp_send_json_error( array( 'msg' => 'Mevcut şifre hatalı.' ) );
        if ( strlen( $new ) < 6 ) wp_send_json_error( array( 'msg' => 'Yeni şifre en az 6 karakter olmalı.' ) );
        global $wpdb; $t = $wpdb->prefix . self::TBL_USERS;
        $wpdb->update( $t, array( 'password_hash' => self::hash_password( $new ) ), array( 'id' => (int) $u['id'] ) );
        wp_send_json_success();
    }

    public function ajax_upload_dekont() {
        check_ajax_referer( 'ahenk_lic' );
        $u = $this->current_user();
        if ( ! $u ) wp_send_json_error( array( 'msg' => 'oturum yok' ) );
        $plan   = sanitize_key( (string) ( $_POST['plan'] ?? '' ) );
        $method = sanitize_key( (string) ( $_POST['method'] ?? 'havale' ) );
        $note   = sanitize_textarea_field( (string) ( $_POST['note'] ?? '' ) );
        $plans = array( 'monthly' => 40, 'sixmonth' => 200, 'yearly' => 350 );
        if ( ! isset( $plans[ $plan ] ) ) wp_send_json_error( array( 'msg' => 'Plan seçin.' ) );
        $amount = $plans[ $plan ];
        $dekont_url = '';
        if ( ! empty( $_FILES['dekont']['tmp_name'] ) ) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
            $up = wp_handle_upload( $_FILES['dekont'], array( 'test_form' => false, 'mimes' => array(
                'jpg|jpeg' => 'image/jpeg', 'png' => 'image/png', 'pdf' => 'application/pdf', 'webp' => 'image/webp',
            ) ) );
            if ( isset( $up['error'] ) ) wp_send_json_error( array( 'msg' => 'Dekont yüklenemedi: ' . $up['error'] ) );
            $dekont_url = $up['url'];
        }
        global $wpdb; $t = $wpdb->prefix . self::TBL_PAYMENTS;
        $wpdb->insert( $t, array(
            'user_id'    => (int) $u['id'],
            'email'      => $u['email'],
            'plan'       => $plan,
            'amount_usd' => $amount,
            'method'     => $method,
            'dekont_url' => $dekont_url,
            'note'       => $note,
            'status'     => 'beklemede',
            'created_at' => current_time( 'mysql' ),
        ) );
        // Mail
        $body  = "Yeni ödeme bildirimi alındı.\n\n";
        $body .= "Müşteri: " . $u['full_name'] . " <" . $u['email'] . ">\n";
        $body .= "Site: " . site_url() . " (" . $u['domain'] . ")\n";
        $body .= "Plan: " . $plan . " — $" . $amount . "\n";
        $body .= "Yöntem: " . $method . "\n";
        $body .= "Not: " . $note . "\n";
        if ( $dekont_url ) $body .= "Dekont: " . $dekont_url . "\n";
        $body .= "\nLütfen aktivasyon kodu üretip müşteriye iletin.\nAdmin paneli: " . admin_url( 'admin.php?page=' . self::SLUG );
        wp_mail( self::SUPPORT_EMAIL, '[Ahenk Lisans] Yeni ödeme: ' . $u['email'] . ' — $' . $amount, $body );
        wp_send_json_success( array( 'msg' => 'Bildirim alındı. Aktivasyon kodu kısa sürede WhatsApp veya email ile iletilecek.' ) );
    }

    /**
     * Aktivasyon kodu format: AHENK-<base64url(payload)>-<sig8>
     * Payload JSON: {e: email, d: days, p: plan, n: nonce, t: issued_at}
     * Sig: ilk 16 hex char of HMAC.
     */
    public static function build_code( $email, $plan, $days, $domain = '' ) {
        $dm = strtolower( trim( (string) $domain ) );
        $dm = preg_replace( '#^https?://#i', '', $dm );
        $dm = preg_replace( '#^www\.#i', '', $dm );
        $dm = preg_replace( '#/.*$#', '', $dm );
        $payload = wp_json_encode( array(
            'e'  => strtolower( trim( $email ) ),
            'p'  => $plan,
            'd'  => (int) $days,
            'dm' => $dm,
            'n'  => bin2hex( random_bytes( 4 ) ),
            't'  => time(),
        ) );
        $b64 = rtrim( strtr( base64_encode( $payload ), '+/', '-_' ), '=' );
        $sig = substr( hash_hmac( 'sha256', $b64, self::license_hmac_secret() ), 0, 16 );
        return 'AHENK-' . $b64 . '-' . $sig;
    }

    public static function parse_code( $code ) {
        $code = trim( (string) $code );
        if ( strpos( $code, 'AHENK-' ) !== 0 ) return null;
        $rest = substr( $code, 6 );
        $pos = strrpos( $rest, '-' );
        if ( $pos === false ) return null;
        $b64 = substr( $rest, 0, $pos );
        $sig = substr( $rest, $pos + 1 );
        $expected = substr( hash_hmac( 'sha256', $b64, self::license_hmac_secret() ), 0, 16 );
        // Geriye uyumluluk: eski site-özel HMAC ile üretilmiş kodları da kabul et
        if ( ! hash_equals( $expected, $sig ) ) {
            $legacy = substr( hash_hmac( 'sha256', $b64, self::hmac_secret() ), 0, 16 );
            if ( ! hash_equals( $legacy, $sig ) ) return null;
        }
        $payload = base64_decode( strtr( $b64, '-_', '+/' ) );
        $arr = json_decode( $payload, true );
        if ( ! is_array( $arr ) ) return null;
        return $arr;
    }

    public function ajax_apply_code() {
        check_ajax_referer( 'ahenk_lic' );
        $u = $this->current_user();
        if ( ! $u ) wp_send_json_error( array( 'msg' => 'oturum yok' ) );
        $code = (string) ( $_POST['code'] ?? '' );
        $data = self::parse_code( $code );
        if ( ! $data ) wp_send_json_error( array( 'msg' => 'Geçersiz aktivasyon kodu (imza doğrulanamadı).' ) );
        if ( strtolower( $u['email'] ) !== strtolower( $data['e'] ) ) wp_send_json_error( array( 'msg' => 'Bu kod sizin emailinize ait değil. Kod sahibi: ' . esc_html( $data['e'] ) ) );
        // Nonce daha once kullanildi mi?
        $used = get_option( 'ahb_lic_used_codes', array() );
        if ( in_array( $data['n'], (array) $used, true ) ) wp_send_json_error( array( 'msg' => 'Bu kod daha önce kullanılmış.' ) );
        $used[] = $data['n'];
        if ( count( $used ) > 500 ) $used = array_slice( $used, -500 );
        update_option( 'ahb_lic_used_codes', $used, false );
        // Suresi uzat
        global $wpdb; $t = $wpdb->prefix . self::TBL_USERS;
        $cur_end = $this->effective_end( $u );
        $base_ts = ( $cur_end && strtotime( $cur_end ) > time() ) ? strtotime( $cur_end ) : time();
        $new_end = date( 'Y-m-d H:i:s', $base_ts + ( (int) $data['d'] ) * DAY_IN_SECONDS );
        $upd = array(
            'plan'       => $data['p'],
            'expires_at' => $new_end,
            'status'     => 'aktif',
        );
        if ( ! empty( $data['dm'] ) ) $upd['domain'] = $data['dm'];
        $wpdb->update( $t, $upd, array( 'id' => (int) $u['id'] ) );
        $msg = 'Aktivasyon başarılı. Yeni bitiş: ' . $new_end;
        if ( ! empty( $data['dm'] ) ) $msg .= ' — Domain: ' . $data['dm'];
        wp_send_json_success( array( 'msg' => $msg, 'new_end' => $new_end ) );
    }

    /* ============ ADMIN AJAX ============ */

    private function require_admin() {
        $u = $this->current_user();
        if ( ! $u || $u['role'] !== 'admin' ) wp_send_json_error( array( 'msg' => 'admin yetkisi gerekli' ) );
        return $u;
    }

    private function require_staff() {
        $u = $this->current_user();
        if ( ! $u || ! in_array( $u['role'], array( 'admin', 'submanager' ), true ) ) wp_send_json_error( array( 'msg' => 'yonetici yetkisi gerekli' ) );
        return $u;
    }

    public function ajax_admin_action() {
        check_ajax_referer( 'ahenk_lic' );
        $me = $this->require_staff();
        global $wpdb; $tu = $wpdb->prefix . self::TBL_USERS; $tp = $wpdb->prefix . self::TBL_PAYMENTS;
        $act = sanitize_key( (string) ( $_POST['act'] ?? '' ) );
        $id  = (int) ( $_POST['id']  ?? 0 );
        // Submanager admin/submanager rollu kullanicilari etkileyemez
        if ( $me['role'] === 'submanager' && in_array( $act, array( 'set_status', 'extend', 'delete' ), true ) ) {
            $target = $wpdb->get_row( $wpdb->prepare( "SELECT role FROM $tu WHERE id=%d", $id ), ARRAY_A );
            if ( $target && in_array( $target['role'], array( 'admin', 'submanager' ), true ) ) {
                wp_send_json_error( array( 'msg' => 'Alt yönetici, diğer yöneticileri değiştiremez.' ) );
            }
        }
        if ( $act === 'set_status' ) {
            $st = in_array( $_POST['val'] ?? '', array( 'aktif', 'pasif' ), true ) ? $_POST['val'] : 'aktif';
            $wpdb->update( $tu, array( 'status' => $st ), array( 'id' => $id ) );
            wp_send_json_success();
        } elseif ( $act === 'extend' ) {
            $days = max( 1, (int) ( $_POST['val'] ?? 30 ) );
            $row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $tu WHERE id=%d", $id ), ARRAY_A );
            $base = ! empty( $row['expires_at'] ) && strtotime( $row['expires_at'] ) > time() ? strtotime( $row['expires_at'] ) : time();
            $new = date( 'Y-m-d H:i:s', $base + $days * DAY_IN_SECONDS );
            $wpdb->update( $tu, array( 'expires_at' => $new, 'status' => 'aktif' ), array( 'id' => $id ) );
            wp_send_json_success( array( 'new_end' => $new ) );
        } elseif ( $act === 'delete' ) {
            $wpdb->delete( $tu, array( 'id' => $id ) );
            wp_send_json_success();
        } elseif ( $act === 'pay_status' ) {
            $st = sanitize_key( (string) ( $_POST['val'] ?? 'onayli' ) );
            $wpdb->update( $tp, array( 'status' => $st ), array( 'id' => $id ) );
            wp_send_json_success();
        } else {
            wp_send_json_error( array( 'msg' => 'bilinmeyen islem' ) );
        }
    }

    public function ajax_admin_add_user() {
        check_ajax_referer( 'ahenk_lic' );
        $this->require_staff();
        $email = strtolower( trim( (string) ( $_POST['email'] ?? '' ) ) );
        $pass  = (string) ( $_POST['password'] ?? '' );
        $name  = sanitize_text_field( (string) ( $_POST['full_name'] ?? '' ) );
        $domain= sanitize_text_field( (string) ( $_POST['domain'] ?? '' ) );
        $days  = max( 1, (int) ( $_POST['days'] ?? 7 ) );
        if ( ! is_email( $email ) || strlen( $pass ) < 6 ) wp_send_json_error( array( 'msg' => 'Email ve şifre (>=6) zorunlu' ) );
        if ( $this->find_user_by_email( $email ) ) wp_send_json_error( array( 'msg' => 'Bu email zaten kayıtlı' ) );
        global $wpdb; $t = $wpdb->prefix . self::TBL_USERS;
        $now = current_time( 'mysql' );
        $end = date( 'Y-m-d H:i:s', strtotime( $now ) + $days * DAY_IN_SECONDS );
        $wpdb->insert( $t, array(
            'email'         => $email,
            'password_hash' => self::hash_password( $pass ),
            'full_name'     => $name,
            'role'          => 'user',
            'domain'        => $domain,
            'plan'          => 'trial',
            'status'        => 'aktif',
            'trial_until'   => $end,
            'created_at'    => $now,
        ) );
        wp_send_json_success();
    }

    public function ajax_generate_code() {
        check_ajax_referer( 'ahenk_lic' );
        $this->require_staff();
        $email  = strtolower( trim( (string) ( $_POST['email']  ?? '' ) ) );
        $plan   = sanitize_key( (string) ( $_POST['plan']  ?? 'monthly' ) );
        $days   = max( 1, (int) ( $_POST['days'] ?? 30 ) );
        $domain = sanitize_text_field( (string) ( $_POST['domain'] ?? '' ) );
        if ( ! is_email( $email ) ) wp_send_json_error( array( 'msg' => 'email gecersiz' ) );
        $code = self::build_code( $email, $plan, $days, $domain );
        wp_send_json_success( array( 'code' => $code, 'domain' => $domain ) );
    }

    /** Sadece admin → submanager ekleyebilir */
    /** v3.11.4 — Modül toggle (RSS Direkt vb.) */
    public function ajax_toggle_module() {
        check_ajax_referer( 'ahenk_lic' );
        $u = $this->current_user();
        if ( ! $u || $u['role'] !== 'admin' ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $module = sanitize_key( $_POST['module'] ?? '' );
        $on     = ! empty( $_POST['on'] ) ? 1 : 0;
        $allowed = array( 'rss' => 'ahenk_rss_enabled' );
        if ( ! isset( $allowed[ $module ] ) ) wp_send_json_error( array( 'msg' => 'bilinmeyen modül' ) );
        update_option( $allowed[ $module ], $on );
        wp_send_json_success( array( 'module' => $module, 'on' => $on ) );
    }

    public function ajax_add_manager() {
        check_ajax_referer( 'ahenk_lic' );
        $this->require_admin();
        $email = strtolower( trim( (string) ( $_POST['email'] ?? '' ) ) );
        $pass  = (string) ( $_POST['password'] ?? '' );
        $name  = sanitize_text_field( (string) ( $_POST['full_name'] ?? '' ) );
        if ( ! is_email( $email ) || strlen( $pass ) < 6 ) wp_send_json_error( array( 'msg' => 'Email ve şifre (>=6) zorunlu' ) );
        if ( $this->find_user_by_email( $email ) ) wp_send_json_error( array( 'msg' => 'Bu email zaten kayıtlı' ) );
        global $wpdb; $t = $wpdb->prefix . self::TBL_USERS;
        $wpdb->insert( $t, array(
            'email'         => $email,
            'password_hash' => self::hash_password( $pass ),
            'full_name'     => $name,
            'role'          => 'submanager',
            'domain'        => '',
            'plan'          => 'staff',
            'status'        => 'aktif',
            'expires_at'    => '2099-12-31 23:59:59',
            'created_at'    => current_time( 'mysql' ),
        ) );
        wp_send_json_success();
    }

    /* ================================================================== */
    /* RENDER                                                               */
    /* ================================================================== */

    public function render() {
        $nonce = wp_create_nonce( 'ahenk_lic' );
        $u = $this->current_user();
        echo '<div class="wrap">';
        echo '<h1>🔐 Ahenk AI İçerik Robotu — Lisans</h1>';
        if ( ! $u ) { $this->render_login( $nonce ); echo '</div>'; return; }
        // header bar
        $end = $this->effective_end( $u );
        $days = $this->days_remaining( $u );
        $color = ( $u['role'] === 'admin' ) ? '#46b450' : ( $days < 0 ? '#d63638' : ( $days <= 7 ? '#dba617' : '#46b450' ) );
        echo '<div style="background:#fff;border-left:4px solid ' . esc_attr( $color ) . ';padding:14px 18px;margin:14px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">';
        echo '<div>👤 <strong>' . esc_html( $u['full_name'] ?: $u['email'] ) . '</strong> · ' . esc_html( $u['email'] ) . ' · <code>' . esc_html( $u['role'] ) . '</code><br>';
        echo '📦 Plan: <strong>' . esc_html( $u['plan'] ) . '</strong> · Durum: ' . esc_html( $u['status'] );
        if ( $end ) echo ' · Bitiş: <strong>' . esc_html( $end ) . '</strong> (' . ( $days < 0 ? 'süresi doldu' : (int) $days . ' gün kaldı' ) . ')';
        echo '</div><div><button class="button" id="lic-logout">🚪 Çıkış</button></div></div>';
        if ( isset( $_GET['expired'] ) ) echo '<div class="notice notice-error"><p>⛔ Aboneliğin sona erdi. Yenileyene kadar AI sayfalarına erişemezsin.</p></div>';
        if ( isset( $_GET['domainerr'] ) ) echo '<div class="notice notice-error"><p>⛔ Bu lisans başka bir domaine kilitli. Yöneticiyle iletişime geç.</p></div>';

        if ( in_array( $u['role'], array( 'admin', 'submanager' ), true ) ) $this->render_admin_panel( $nonce, $u );
        else                                                                $this->render_user_panel( $nonce, $u );

        // Şifre değişimi (her iki rol için)
        echo '<hr style="margin:30px 0;"><h2>🔑 Şifre Değiştir</h2>';
        echo '<table class="form-table">';
        echo '<tr><th>Mevcut şifre</th><td><input type="password" id="lic-pw-old" class="regular-text"></td></tr>';
        echo '<tr><th>Yeni şifre (≥6)</th><td><input type="password" id="lic-pw-new" class="regular-text"></td></tr>';
        echo '</table><p><button class="button button-primary" id="lic-pw-save">💾 Şifreyi Güncelle</button></p>';

        $this->render_global_js( $nonce );
        echo '</div>';
    }

    private function render_login( $nonce ) {
        $cur_domain = parse_url( site_url(), PHP_URL_HOST );
        $wa = esc_attr( ltrim( self::SUPPORT_WHATSAPP, '+' ) );
        ?>
        <style>
        .ahlic-wrap{max-width:1100px;margin:20px auto;}
        .ahlic-topbar{display:flex;justify-content:flex-end;gap:6px;margin-bottom:10px;}
        .ahlic-lang{border:1px solid #dcdcde;background:#fff;padding:4px 12px;border-radius:20px;cursor:pointer;font-weight:600;font-size:12px;color:#2271b1;}
        .ahlic-lang.active{background:#2271b1;color:#fff;border-color:#2271b1;}
        .ahlic-card{background:#fff;padding:28px 32px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.06);}
        .ahlic-login{max-width:560px;margin:0 auto 30px;}
        .ahlic-plans{margin-top:40px;}
        .ahlic-plans-h{text-align:center;margin:0 0 8px;font-size:28px;color:#1d2327;}
        .ahlic-plans-sub{text-align:center;color:#646970;margin:0 0 28px;font-size:15px;}
        .ahlic-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        @media(max-width:900px){.ahlic-grid{grid-template-columns:1fr;}}
        .ahlic-plan{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 24px;position:relative;transition:transform .2s,box-shadow .2s;}
        .ahlic-plan:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.08);}
        .ahlic-plan.featured{border-color:#2271b1;border-width:2px;box-shadow:0 6px 24px rgba(34,113,177,.12);}
        .ahlic-plan-badge{position:absolute;top:-12px;right:20px;background:#2271b1;color:#fff;padding:4px 12px;border-radius:14px;font-size:11px;font-weight:700;letter-spacing:1px;}
        .ahlic-plan-save{position:absolute;top:-12px;left:20px;background:#00a32a;color:#fff;padding:4px 12px;border-radius:14px;font-size:11px;font-weight:700;}
        .ahlic-plan h3{margin:0 0 4px;font-size:22px;color:#1d2327;}
        .ahlic-plan-desc{color:#646970;font-size:13px;margin:0 0 18px;}
        .ahlic-price{font-size:42px;font-weight:800;color:#2271b1;line-height:1;margin-bottom:4px;}
        .ahlic-price small{font-size:14px;color:#646970;font-weight:500;}
        .ahlic-period{color:#646970;font-size:13px;margin:0 0 20px;}
        .ahlic-feats{list-style:none;padding:0;margin:0 0 22px;}
        .ahlic-feats li{padding:6px 0;color:#1d2327;font-size:14px;}
        .ahlic-feats li::before{content:"✓ ";color:#00a32a;font-weight:700;margin-right:4px;}
        .ahlic-pay{background:#f6f7f7;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;margin-top:24px;text-align:center;}
        .ahlic-pay h4{margin:0 0 12px;color:#1d2327;font-size:16px;}
        .ahlic-pay-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
        .ahlic-pay-row a{text-decoration:none;}
        .ahlic-iban{display:inline-block;background:#fff;border:1px dashed #2271b1;padding:6px 12px;border-radius:6px;font-family:ui-monospace,monospace;color:#1d2327;margin:0 4px;}
        </style>

        <div class="ahlic-wrap">

            <div class="ahlic-topbar">
                <button type="button" class="ahlic-lang active" data-lang="tr">🇹🇷 TR</button>
                <button type="button" class="ahlic-lang" data-lang="en">🇬🇧 EN</button>
                <button type="button" class="ahlic-lang" data-lang="ar">🇸🇦 AR</button>
                <button type="button" class="ahlic-lang" data-lang="de">🇩🇪 DE</button>
                <button type="button" class="ahlic-lang" data-lang="fr">🇫🇷 FR</button>
                <button type="button" class="ahlic-lang" data-lang="es">🇪🇸 ES</button>
                <button type="button" class="ahlic-lang" data-lang="ru">🇷🇺 RU</button>
            </div>

            <div class="ahlic-card ahlic-login">
                <h2 style="margin-top:0;" data-tr="Giriş Yap" data-en="Sign In">Giriş Yap</h2>
                <p style="color:#666;" data-tr="Eklentiyi kullanmak için giriş yapın. Hesabınız yoksa kayıt olun — <strong><?php echo (int) self::TRIAL_DAYS; ?> gün ücretsiz deneme</strong> başlar." data-en="Sign in to use the plugin. No account? Register — <strong><?php echo (int) self::TRIAL_DAYS; ?>-day free trial</strong> starts automatically.">Eklentiyi kullanmak için giriş yapın. Hesabınız yoksa kayıt olun — <strong><?php echo (int) self::TRIAL_DAYS; ?> gün ücretsiz deneme</strong> başlar.</p>
                <div id="lic-tabs" style="display:flex;gap:6px;margin-bottom:14px;">
                    <button class="button button-primary" data-tab="login" data-tr="Giriş" data-en="Sign In">Giriş</button>
                    <button class="button" data-tab="register" data-tr="Kayıt Ol" data-en="Register">Kayıt Ol</button>
                </div>
                <div id="tab-login">
                    <p><label><span data-tr="Email" data-en="Email">Email</span><br><input type="email" id="li-email" class="regular-text" style="width:100%;"></label></p>
                    <p><label><span data-tr="Şifre" data-en="Password">Şifre</span><br><input type="password" id="li-pass" class="regular-text" style="width:100%;"></label></p>
                    <p><label><input type="checkbox" id="li-remember" checked> <span data-tr="Beni hatırla (90 gün)" data-en="Remember me (90 days)">Beni hatırla (90 gün)</span></label></p>
                    <p><button class="button button-primary button-hero" id="li-go" style="width:100%;" data-tr="🔓 Giriş Yap" data-en="🔓 Sign In">🔓 Giriş Yap</button></p>
                    <p id="li-msg" style="color:#d63638;display:none;"></p>
                </div>
                <div id="tab-register" style="display:none;">
                    <p><label><span data-tr="Ad Soyad" data-en="Full Name">Ad Soyad</span><br><input type="text" id="re-name" class="regular-text" style="width:100%;"></label></p>
                    <p><label><span data-tr="Email" data-en="Email">Email</span><br><input type="email" id="re-email" class="regular-text" style="width:100%;"></label></p>
                    <p><label><span data-tr="Şifre (≥6 karakter)" data-en="Password (≥6 chars)">Şifre (≥6 karakter)</span><br><input type="password" id="re-pass" class="regular-text" style="width:100%;"></label></p>
                    <p style="font-size:12px;color:#666;"><span data-tr="Domain otomatik tespit:" data-en="Auto-detected domain:">Domain otomatik tespit:</span> <code><?php echo esc_html( $cur_domain ); ?></code> <span data-tr="— lisans bu domaine kilitlenir." data-en="— license will be locked to this domain."> — lisans bu domaine kilitlenir.</span></p>
                    <p><button class="button button-primary button-hero" id="re-go" style="width:100%;" data-tr="✅ Kayıt Ol & Denemeyi Başlat" data-en="✅ Register & Start Trial">✅ Kayıt Ol & Denemeyi Başlat</button></p>
                    <p id="re-msg" style="color:#d63638;display:none;"></p>
                </div>
                <hr style="margin:24px 0;">
                <p style="font-size:12px;color:#888;text-align:center;"><span data-tr="Destek:" data-en="Support:">Destek:</span> <a href="https://wa.me/<?php echo $wa; ?>" target="_blank">WhatsApp <?php echo esc_html( self::SUPPORT_WHATSAPP ); ?></a> · <?php echo esc_html( self::SUPPORT_EMAIL ); ?></p>
            </div>

            <!-- ABONELIK PLANLARI -->
            <div class="ahlic-plans">
                <h2 class="ahlic-plans-h" data-tr="💎 Abonelik Planları" data-en="💎 Subscription Plans">💎 Abonelik Planları</h2>
                <p class="ahlic-plans-sub" data-tr="Deneme sonrası ihtiyacınıza uygun planı seçin. Tüm planlarda aynı özellikler; sadece süre farklı." data-en="After your trial, choose the plan that fits. Same features across all plans — duration differs.">Deneme sonrası ihtiyacınıza uygun planı seçin. Tüm planlarda aynı özellikler; sadece süre farklı.</p>

                <div class="ahlic-grid">
                    <!-- AYLIK -->
                    <div class="ahlic-plan">
                        <h3 data-tr="Aylık" data-en="Monthly">Aylık</h3>
                        <p class="ahlic-plan-desc" data-tr="Kısa vadeli, esnek" data-en="Short-term, flexible">Kısa vadeli, esnek</p>
                        <div class="ahlic-price">$40<small>/<span data-tr="ay" data-en="month">ay</span></small></div>
                        <p class="ahlic-period" data-tr="30 gün lisans" data-en="30-day license">30 gün lisans</p>
                        <ul class="ahlic-feats">
                            <li data-tr="Sınırsız AI içerik üretimi" data-en="Unlimited AI content generation">Sınırsız AI içerik üretimi</li>
                            <li data-tr="AI görsel (DALL-E 3, GPT-Image)" data-en="AI images (DALL-E 3, GPT-Image)">AI görsel (DALL-E 3, GPT-Image)</li>
                            <li data-tr="Premium şablonlar + hub" data-en="Premium templates + hub">Premium şablonlar + hub</li>
                            <li data-tr="Web görsel arama (çoklu seçim)" data-en="Web image search (multi-select)">Web görsel arama (çoklu seçim)</li>
                            <li data-tr="HeyGen video üretimi" data-en="HeyGen video generation">HeyGen video üretimi</li>
                            <li data-tr="Tam sayfa & tema uyumlu" data-en="Full-width & theme-aware layouts">Tam sayfa & tema uyumlu</li>
                        </ul>
                    </div>

                    <!-- 6 AYLIK -->
                    <div class="ahlic-plan featured">
                        <span class="ahlic-plan-badge" data-tr="POPÜLER" data-en="POPULAR">POPÜLER</span>
                        <span class="ahlic-plan-save" data-tr="$40 tasarruf" data-en="Save $40">$40 tasarruf</span>
                        <h3 data-tr="6 Aylık" data-en="6 Months">6 Aylık</h3>
                        <p class="ahlic-plan-desc" data-tr="En popüler seçim — dengeli" data-en="Most popular — balanced">En popüler seçim — dengeli</p>
                        <div class="ahlic-price">$200<small>/6 <span data-tr="ay" data-en="mo">ay</span></small></div>
                        <p class="ahlic-period" data-tr="180 gün lisans · ~$33/ay" data-en="180-day license · ~$33/mo">180 gün lisans · ~$33/ay</p>
                        <ul class="ahlic-feats">
                            <li data-tr="Aylık plandaki tüm özellikler" data-en="Everything in Monthly">Aylık plandaki tüm özellikler</li>
                            <li data-tr="Öncelikli destek" data-en="Priority support">Öncelikli destek</li>
                            <li data-tr="6 ay boyunca kesintisiz" data-en="Uninterrupted 6 months">6 ay boyunca kesintisiz</li>
                            <li data-tr="Aylığa göre %17 indirim" data-en="17% off vs Monthly">Aylığa göre %17 indirim</li>
                            <li data-tr="Tüm şablon güncellemeleri" data-en="All template updates">Tüm şablon güncellemeleri</li>
                            <li data-tr="Özel konfigürasyon yardımı" data-en="Custom config assistance">Özel konfigürasyon yardımı</li>
                        </ul>
                    </div>

                    <!-- YILLIK -->
                    <div class="ahlic-plan">
                        <span class="ahlic-plan-save" data-tr="$130 tasarruf" data-en="Save $130">$130 tasarruf</span>
                        <h3 data-tr="Yıllık" data-en="Annual">Yıllık</h3>
                        <p class="ahlic-plan-desc" data-tr="En uygun fiyat · yayıncı & ajans" data-en="Best value · publisher & agency">En uygun fiyat · yayıncı & ajans</p>
                        <div class="ahlic-price">$350<small>/<span data-tr="yıl" data-en="year">yıl</span></small></div>
                        <p class="ahlic-period" data-tr="365 gün lisans · ~$29/ay" data-en="365-day license · ~$29/mo">365 gün lisans · ~$29/ay</p>
                        <ul class="ahlic-feats">
                            <li data-tr="6 Aylık plandaki tüm özellikler" data-en="Everything in 6 Months">6 Aylık plandaki tüm özellikler</li>
                            <li data-tr="Aylığa göre %27 indirim" data-en="27% off vs Monthly">Aylığa göre %27 indirim</li>
                            <li data-tr="VIP destek (WhatsApp + Email)" data-en="VIP support (WhatsApp + Email)">VIP destek (WhatsApp + Email)</li>
                            <li data-tr="Yeni özelliklere erken erişim" data-en="Early access to new features">Yeni özelliklere erken erişim</li>
                            <li data-tr="Yıllık kurulum danışmanlığı" data-en="Annual setup consultation">Yıllık kurulum danışmanlığı</li>
                            <li data-tr="Özel şablon talebi hakkı" data-en="Custom template request">Özel şablon talebi hakkı</li>
                        </ul>
                    </div>
                </div>

                <!-- ODEME YONTEMLERI -->
                <div class="ahlic-pay">
                    <h4 data-tr="💳 Ödeme Yöntemleri" data-en="💳 Payment Methods">💳 Ödeme Yöntemleri</h4>
                    <div class="ahlic-pay-row">
                        <a href="<?php echo esc_url( self::STRIPE_LINK ); ?>" target="_blank" class="button button-primary" data-tr="🌐 Stripe ile Öde" data-en="🌐 Pay with Stripe">🌐 Stripe ile Öde</a>
                        <a href="https://wa.me/<?php echo $wa; ?>" target="_blank" class="button" data-tr="📱 WhatsApp ile İletişim" data-en="📱 Contact via WhatsApp">📱 WhatsApp ile İletişim</a>
                        <a href="mailto:<?php echo esc_attr( self::SUPPORT_EMAIL ); ?>" class="button" data-tr="📧 Email Gönder" data-en="📧 Send Email">📧 Email Gönder</a>
                    </div>
                    <p style="margin-top:14px;color:#646970;font-size:13px;">
                        <span data-tr="🏦 Banka Havalesi (IBAN):" data-en="🏦 Bank Transfer (IBAN):">🏦 Banka Havalesi (IBAN):</span>
                        <span class="ahlic-iban"><?php echo esc_html( self::IBAN ); ?></span>
                        · <strong><?php echo esc_html( self::IBAN_NAME ); ?></strong>
                    </p>
                    <p style="margin-top:8px;color:#646970;font-size:12px;" data-tr="Havale sonrası kayıt olup dekontunuzu yükleyin; yönetici onayıyla aboneliğiniz aktif olur." data-en="After wire transfer, register and upload your receipt; your subscription is activated upon admin approval.">Havale sonrası kayıt olup dekontunuzu yükleyin; yönetici onayıyla aboneliğiniz aktif olur.</p>
                </div>

                <!-- v3.11.4: Tanıtım / Güncel sürüm indirme -->
                <p style="text-align:center;margin-top:24px;">
                    <a href="https://ahenk.net.tr/airobot" target="_blank" rel="noopener" class="button button-hero" style="font-size:14px;" data-tr="📥 Eklentinin Güncel Sürümünü İndir" data-en="📥 Download Latest Plugin Version">📥 Eklentinin Güncel Sürümünü İndir</a>
                </p>
                <p style="text-align:center;color:#646970;font-size:12px;margin-top:4px;" data-tr="Tanıtım sayfası, kılavuzlar ve son güncelleme paketi için: ahenk.net.tr/airobot" data-en="For brochure, guides and the latest update package: ahenk.net.tr/airobot">Tanıtım sayfası, kılavuzlar ve son güncelleme paketi için: ahenk.net.tr/airobot</p>
            </div>

        </div>

        <script>
        (function(){
            const NONCE = '<?php echo esc_js( $nonce ); ?>';
            const AJAX  = '<?php echo esc_url( admin_url( 'admin-ajax.php' ) ); ?>';
            const $ = id => document.getElementById(id);
            async function ajax(action, data) {
                const fd = new FormData();
                fd.append('action', action); fd.append('_ajax_nonce', NONCE);
                Object.keys(data || {}).forEach(k => fd.append(k, data[k]));
                const r = await fetch(AJAX, { method:'POST', body:fd, credentials:'same-origin' });
                return r.json();
            }

            // ====== 7 DİL SÖZLÜĞÜ (v3.11.4) ======
            // Key = mevcut Türkçe data-tr değeri. data-en zaten attribute'ta var (hızlı yol).
            // AR/DE/FR/ES/RU buradaki sözlükten çekilir.
            const DICT = {
                'Giriş Yap':                  {ar:'تسجيل الدخول', de:'Anmelden', fr:'Se connecter', es:'Iniciar sesión', ru:'Войти'},
                'Giriş':                      {ar:'دخول', de:'Anmelden', fr:'Connexion', es:'Entrar', ru:'Вход'},
                'Kayıt Ol':                   {ar:'تسجيل جديد', de:'Registrieren', fr:"S'inscrire", es:'Registrarse', ru:'Регистрация'},
                'Email':                      {ar:'البريد الإلكتروني', de:'E-Mail', fr:'Email', es:'Correo', ru:'Email'},
                'Şifre':                      {ar:'كلمة المرور', de:'Passwort', fr:'Mot de passe', es:'Contraseña', ru:'Пароль'},
                'Beni hatırla (90 gün)':      {ar:'تذكرني (٩٠ يومًا)', de:'Angemeldet bleiben (90 Tage)', fr:'Se souvenir (90 jours)', es:'Recuérdame (90 días)', ru:'Запомнить меня (90 дней)'},
                '🔓 Giriş Yap':               {ar:'🔓 تسجيل الدخول', de:'🔓 Anmelden', fr:'🔓 Se connecter', es:'🔓 Iniciar sesión', ru:'🔓 Войти'},
                'Ad Soyad':                   {ar:'الاسم الكامل', de:'Vollständiger Name', fr:'Nom complet', es:'Nombre completo', ru:'Полное имя'},
                'Şifre (≥6 karakter)':        {ar:'كلمة المرور (٦+)', de:'Passwort (≥6 Zeichen)', fr:'Mot de passe (≥6)', es:'Contraseña (≥6)', ru:'Пароль (≥6)'},
                'Domain otomatik tespit:':    {ar:'النطاق المكتشف تلقائيًا:', de:'Automatisch erkannte Domain:', fr:'Domaine auto-détecté :', es:'Dominio detectado:', ru:'Автоопределённый домен:'},
                '— lisans bu domaine kilitlenir.': {ar:'— الترخيص مقيّد بهذا النطاق.', de:'— Lizenz wird an diese Domain gebunden.', fr:'— la licence sera liée à ce domaine.', es:'— la licencia se bloqueará a este dominio.', ru:'— лицензия привязывается к этому домену.'},
                '✅ Kayıt Ol & Denemeyi Başlat': {ar:'✅ التسجيل وبدء التجربة', de:'✅ Registrieren & Testphase starten', fr:'✅ S\'inscrire & démarrer l\'essai', es:'✅ Registrar e iniciar prueba', ru:'✅ Регистрация и пробный период'},
                'Destek:':                    {ar:'الدعم:', de:'Support:', fr:'Support :', es:'Soporte:', ru:'Поддержка:'},
                '💎 Abonelik Planları':       {ar:'💎 خطط الاشتراك', de:'💎 Abonnementpläne', fr:'💎 Plans d\'abonnement', es:'💎 Planes de suscripción', ru:'💎 Тарифные планы'},
                'Deneme sonrası ihtiyacınıza uygun planı seçin. Tüm planlarda aynı özellikler; sadece süre farklı.':
                    {ar:'بعد التجربة، اختر الخطة المناسبة. جميع الخطط تحتوي على نفس الميزات — فقط المدة مختلفة.',
                     de:'Wählen Sie nach der Testphase den passenden Plan. Alle Pläne bieten dieselben Funktionen — nur die Laufzeit variiert.',
                     fr:"Après l'essai, choisissez votre plan. Mêmes fonctionnalités partout, seule la durée diffère.",
                     es:'Tras la prueba, elija su plan. Mismas funciones en todos — solo cambia la duración.',
                     ru:'После пробного периода выберите подходящий тариф. Функции одинаковые — отличается только срок.'},
                'Aylık':                      {ar:'شهري', de:'Monatlich', fr:'Mensuel', es:'Mensual', ru:'Ежемесячно'},
                'Kısa vadeli, esnek':         {ar:'قصير الأمد، مرن', de:'Kurzfristig, flexibel', fr:'Court terme, flexible', es:'Corto plazo, flexible', ru:'Краткий срок, гибко'},
                'ay':                         {ar:'شهر', de:'Monat', fr:'mois', es:'mes', ru:'мес'},
                'mo':                         {ar:'شهر', de:'Mon.', fr:'mois', es:'mes', ru:'мес'},
                'yıl':                        {ar:'سنة', de:'Jahr', fr:'an', es:'año', ru:'год'},
                '30 gün lisans':              {ar:'ترخيص ٣٠ يومًا', de:'30-Tage-Lizenz', fr:'Licence 30 jours', es:'Licencia 30 días', ru:'Лицензия на 30 дней'},
                'Sınırsız AI içerik üretimi': {ar:'توليد محتوى AI غير محدود', de:'Unbegrenzte KI-Inhaltserstellung', fr:'Génération IA illimitée', es:'Generación IA ilimitada', ru:'Безлимитная AI-генерация'},
                'AI görsel (DALL-E 3, GPT-Image)': {ar:'صور AI (DALL-E 3, GPT-Image)', de:'KI-Bilder (DALL-E 3, GPT-Image)', fr:'Images IA (DALL-E 3, GPT-Image)', es:'Imágenes IA (DALL-E 3, GPT-Image)', ru:'AI-изображения (DALL-E 3, GPT-Image)'},
                'Premium şablonlar + hub':    {ar:'قوالب مميزة + مركز', de:'Premium-Vorlagen + Hub', fr:'Modèles premium + hub', es:'Plantillas premium + hub', ru:'Premium-шаблоны + хаб'},
                'Web görsel arama (çoklu seçim)': {ar:'بحث صور الويب (اختيار متعدد)', de:'Web-Bildersuche (Mehrfachauswahl)', fr:'Recherche d\'images web (multi-sél.)', es:'Búsqueda web (multi-selec.)', ru:'Поиск картинок (мультивыбор)'},
                'HeyGen video üretimi':       {ar:'إنتاج فيديو HeyGen', de:'HeyGen-Videoerstellung', fr:'Vidéo HeyGen', es:'Vídeo HeyGen', ru:'Видео HeyGen'},
                'Tam sayfa & tema uyumlu':    {ar:'ملء الشاشة ومتوافق مع القالب', de:'Vollbild & themakonform', fr:'Pleine page & compatible thème', es:'Página completa & compatible', ru:'Полный экран & совместимо с темой'},
                'POPÜLER':                    {ar:'الأكثر شعبية', de:'BELIEBT', fr:'POPULAIRE', es:'POPULAR', ru:'ПОПУЛЯРНО'},
                '$40 tasarruf':               {ar:'وفّر $40', de:'$40 sparen', fr:'$40 d\'économie', es:'$40 de ahorro', ru:'Экономия $40'},
                '6 Aylık':                    {ar:'٦ أشهر', de:'6 Monate', fr:'6 mois', es:'6 meses', ru:'6 месяцев'},
                'En popüler seçim — dengeli': {ar:'الاختيار الأكثر شعبية', de:'Beliebteste Wahl – ausgewogen', fr:'Choix le plus populaire', es:'Elección más popular', ru:'Самый популярный выбор'},
                '180 gün lisans · ~$33/ay':   {ar:'ترخيص ١٨٠ يومًا · ~$33/شهر', de:'180-Tage-Lizenz · ~$33/Mon.', fr:'Licence 180 jours · ~$33/mois', es:'Licencia 180 días · ~$33/mes', ru:'Лицензия 180 дней · ~$33/мес'},
                'Aylık plandaki tüm özellikler': {ar:'كل ميزات الخطة الشهرية', de:'Alles aus Monatlich', fr:'Toutes les fonctions du mensuel', es:'Todo lo del plan mensual', ru:'Всё из месячного тарифа'},
                'Öncelikli destek':           {ar:'دعم ذو أولوية', de:'Priorisierter Support', fr:'Support prioritaire', es:'Soporte prioritario', ru:'Приоритетная поддержка'},
                '6 ay boyunca kesintisiz':    {ar:'٦ أشهر متواصلة', de:'6 Monate unterbrechungsfrei', fr:'6 mois sans interruption', es:'6 meses sin interrupciones', ru:'6 месяцев без перерывов'},
                'Aylığa göre %17 indirim':    {ar:'خصم ١٧٪ مقارنة بالشهري', de:'17 % günstiger als Monatlich', fr:'17 % de réduction vs Mensuel', es:'17% menos que mensual', ru:'На 17% дешевле месячного'},
                'Tüm şablon güncellemeleri':  {ar:'جميع تحديثات القوالب', de:'Alle Vorlagen-Updates', fr:'Toutes les mises à jour', es:'Todas las actualizaciones', ru:'Все обновления шаблонов'},
                'Özel konfigürasyon yardımı': {ar:'مساعدة إعداد مخصصة', de:'Individuelle Einrichtungshilfe', fr:'Aide à la configuration', es:'Ayuda de configuración', ru:'Помощь с настройкой'},
                '$130 tasarruf':              {ar:'وفّر $130', de:'$130 sparen', fr:'$130 d\'économie', es:'$130 de ahorro', ru:'Экономия $130'},
                'Yıllık':                     {ar:'سنوي', de:'Jährlich', fr:'Annuel', es:'Anual', ru:'Годовой'},
                'En uygun fiyat · yayıncı & ajans': {ar:'أفضل قيمة · للناشرين والوكالات', de:'Bestes Angebot · Verlag & Agentur', fr:'Meilleur prix · éditeur & agence', es:'Mejor precio · editor & agencia', ru:'Лучшая цена · СМИ & агентства'},
                '365 gün lisans · ~$29/ay':   {ar:'ترخيص ٣٦٥ يومًا · ~$29/شهر', de:'365-Tage-Lizenz · ~$29/Mon.', fr:'Licence 365 jours · ~$29/mois', es:'Licencia 365 días · ~$29/mes', ru:'Лицензия 365 дней · ~$29/мес'},
                '6 Aylık plandaki tüm özellikler': {ar:'كل ميزات خطة ٦ أشهر', de:'Alles aus 6-Monats-Plan', fr:'Toutes les fonctions 6 mois', es:'Todo lo del plan 6 meses', ru:'Всё из 6-месячного'},
                'Aylığa göre %27 indirim':    {ar:'خصم ٢٧٪ مقارنة بالشهري', de:'27 % günstiger als Monatlich', fr:'27 % de réduction vs Mensuel', es:'27% menos que mensual', ru:'На 27% дешевле месячного'},
                'VIP destek (WhatsApp + Email)': {ar:'دعم VIP (واتساب + بريد)', de:'VIP-Support (WhatsApp + E-Mail)', fr:'Support VIP (WhatsApp + Email)', es:'Soporte VIP (WhatsApp + Email)', ru:'VIP-поддержка (WhatsApp + Email)'},
                'Yeni özelliklere erken erişim': {ar:'وصول مبكر للميزات الجديدة', de:'Früher Zugriff auf neue Funktionen', fr:'Accès anticipé aux nouveautés', es:'Acceso anticipado a novedades', ru:'Ранний доступ к новинкам'},
                'Yıllık kurulum danışmanlığı':{ar:'استشارة إعداد سنوية', de:'Jährliche Einrichtungsberatung', fr:'Conseil d\'installation annuel', es:'Consultoría anual', ru:'Ежегодная настройка-консалтинг'},
                'Özel şablon talebi hakkı':   {ar:'طلب قوالب مخصصة', de:'Wunsch-Vorlage auf Anfrage', fr:'Modèle personnalisé sur demande', es:'Plantilla personalizada', ru:'Заказ индивидуальных шаблонов'},
                '💳 Ödeme Yöntemleri':        {ar:'💳 طرق الدفع', de:'💳 Zahlungsarten', fr:'💳 Moyens de paiement', es:'💳 Métodos de pago', ru:'💳 Способы оплаты'},
                '🌐 Stripe ile Öde':           {ar:'🌐 ادفع عبر Stripe', de:'🌐 Mit Stripe bezahlen', fr:'🌐 Payer avec Stripe', es:'🌐 Pagar con Stripe', ru:'🌐 Оплата через Stripe'},
                '📱 WhatsApp ile İletişim':    {ar:'📱 تواصل عبر واتساب', de:'📱 Kontakt per WhatsApp', fr:'📱 Contact WhatsApp', es:'📱 Contactar por WhatsApp', ru:'📱 Связь по WhatsApp'},
                '📧 Email Gönder':             {ar:'📧 إرسال بريد', de:'📧 E-Mail senden', fr:'📧 Envoyer un email', es:'📧 Enviar email', ru:'📧 Написать email'},
                '🏦 Banka Havalesi (IBAN):':   {ar:'🏦 تحويل بنكي (IBAN):', de:'🏦 Banküberweisung (IBAN):', fr:'🏦 Virement bancaire (IBAN) :', es:'🏦 Transferencia (IBAN):', ru:'🏦 Банковский перевод (IBAN):'},
                'Havale sonrası kayıt olup dekontunuzu yükleyin; yönetici onayıyla aboneliğiniz aktif olur.':
                    {ar:'بعد التحويل، سجّل وارفع الإيصال؛ يُفعَّل اشتراكك بعد موافقة الإدارة.',
                     de:'Registrieren Sie sich nach der Überweisung und laden Sie den Beleg hoch; die Freigabe erfolgt durch den Administrator.',
                     fr:'Après le virement, inscrivez-vous et téléchargez le reçu ; votre abonnement sera activé après validation.',
                     es:'Tras la transferencia, regístrese y suba el comprobante; se activa con la aprobación del administrador.',
                     ru:'После перевода зарегистрируйтесь и загрузите квитанцию; подписка активируется после одобрения.'},
                '📥 Eklentinin Güncel Sürümünü İndir': {ar:'📥 تنزيل آخر إصدار للإضافة', de:'📥 Aktuelle Plugin-Version herunterladen', fr:'📥 Télécharger la dernière version', es:'📥 Descargar última versión', ru:'📥 Скачать последнюю версию плагина'},
                'Tanıtım sayfası, kılavuzlar ve son güncelleme paketi için: ahenk.net.tr/airobot':
                    {ar:'لصفحة المنتج والأدلة وأحدث حزمة تحديث: ahenk.net.tr/airobot',
                     de:'Produktseite, Anleitungen und aktuelles Update-Paket: ahenk.net.tr/airobot',
                     fr:'Page produit, guides et dernière mise à jour : ahenk.net.tr/airobot',
                     es:'Página del producto, guías y última actualización: ahenk.net.tr/airobot',
                     ru:'Страница продукта, руководства и последнее обновление: ahenk.net.tr/airobot'}
            };
            const SUPPORTED = ['tr','en','ar','de','fr','es','ru'];
            // ====== LANG TOGGLE ======
            function applyLang(lang){
                if (SUPPORTED.indexOf(lang) < 0) lang = 'tr';
                document.querySelectorAll('[data-tr]').forEach(el => {
                    let v = null;
                    if (lang === 'tr') v = el.getAttribute('data-tr');
                    else if (lang === 'en') v = el.getAttribute('data-en');
                    else {
                        const trKey = el.getAttribute('data-tr');
                        // Strip HTML tags for key match (TRIAL_DAYS interpolated)
                        if (DICT[trKey] && DICT[trKey][lang]) v = DICT[trKey][lang];
                        else v = el.getAttribute('data-en') || trKey;
                    }
                    if (v != null) el.innerHTML = v;
                });
                document.querySelectorAll('.ahlic-lang').forEach(b => {
                    b.classList.toggle('active', b.dataset.lang === lang);
                });
                // RTL for Arabic
                document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
                document.documentElement.lang = lang;
                try { localStorage.setItem('ahenk_lang', lang); document.cookie = 'ahenk_lang=' + lang + ';path=/;max-age=31536000'; } catch(e){}
            }
            document.querySelectorAll('.ahlic-lang').forEach(b => {
                b.addEventListener('click', () => applyLang(b.dataset.lang));
            });
            const saved = (function(){ try { return localStorage.getItem('ahenk_lang'); } catch(e){ return null; } })();
            if (saved && SUPPORTED.indexOf(saved) >= 0) applyLang(saved);

            // ====== TABS ======
            document.querySelectorAll('#lic-tabs button').forEach(b => {
                b.addEventListener('click', () => {
                    document.querySelectorAll('#lic-tabs button').forEach(x => x.className = 'button');
                    b.className = 'button button-primary';
                    $('tab-login').style.display    = b.dataset.tab === 'login' ? '' : 'none';
                    $('tab-register').style.display = b.dataset.tab === 'register' ? '' : 'none';
                });
            });

            // ====== AUTH ======
            $('li-go').addEventListener('click', async () => {
                $('li-msg').style.display = 'none';
                const j = await ajax('ahenk_lic_login', {
                    email: $('li-email').value, password: $('li-pass').value, remember: $('li-remember').checked ? 1 : 0,
                });
                if (j.success) location.href = j.data.redirect;
                else { $('li-msg').style.display = ''; $('li-msg').textContent = '❌ ' + (j.data?.msg || ''); }
            });
            $('re-go').addEventListener('click', async () => {
                $('re-msg').style.display = 'none';
                const j = await ajax('ahenk_lic_register', {
                    full_name: $('re-name').value, email: $('re-email').value, password: $('re-pass').value,
                });
                if (j.success) location.href = j.data.redirect;
                else { $('re-msg').style.display = ''; $('re-msg').textContent = '❌ ' + (j.data?.msg || ''); }
            });
        })();
        </script>
        <?php
    }

    private function render_user_panel( $nonce, $u ) {
        $days = $this->days_remaining( $u );
        ?>
        <h2>📦 Abonelik Planları</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;max-width:920px;">
            <?php foreach ( array(
                'monthly'  => array( 40,  30,  'Aylık', '#2271b1' ),
                'sixmonth' => array( 200, 180, '6 Aylık', '#46b450' ),
                'yearly'   => array( 350, 365, 'Yıllık', '#dba617' ),
            ) as $key => $p ) : ?>
                <div style="background:#fff;border:2px solid <?php echo esc_attr( $p[3] ); ?>;border-radius:10px;padding:18px;">
                    <h3 style="margin:0 0 8px;color:<?php echo esc_attr( $p[3] ); ?>;"><?php echo esc_html( $p[2] ); ?></h3>
                    <div style="font-size:32px;font-weight:700;">$<?php echo (int) $p[0]; ?></div>
                    <p style="color:#666;margin:4px 0 12px;"><?php echo (int) $p[1]; ?> gün — tek domain lisansı</p>
                    <button class="button button-primary lic-buy" data-plan="<?php echo esc_attr( $key ); ?>" data-amount="<?php echo (int) $p[0]; ?>" data-label="<?php echo esc_attr( $p[2] ); ?>">💳 Bu planı seç</button>
                </div>
            <?php endforeach; ?>
        </div>

        <h2 style="margin-top:32px;">💳 Ödeme Bilgileri</h2>
        <div style="background:#fff;padding:16px;border:1px solid #ddd;border-radius:8px;max-width:920px;">
            <?php
            $own_domain = '';
            if ( ! empty( $u['domain'] ) )      $own_domain = $u['domain'];
            elseif ( function_exists( 'home_url' ) ) $own_domain = preg_replace( '#^https?://(www\.)?#i', '', rtrim( home_url(), '/' ) );
            $desc_example = ( $own_domain ? $own_domain : 'example.com' ) . ' lisans ödemesi';
            ?>
            <div style="background:#fff8d6;border:1px solid #f0c14b;padding:12px 16px;margin:0 0 14px;border-radius:6px;">
                <strong>⚠ Önemli — Ödeme Açıklaması:</strong><br>
                Ödeme yaparken (Stripe veya banka havalesi) <strong>açıklama/referans</strong> kısmına mutlaka <strong>alan adınızı ve "lisans ödemesi"</strong> yazınız. Aksi takdirde ödeme hangi site için yapıldığı anlaşılamaz ve aktivasyon gecikir.<br>
                <em style="color:#555;">Örnek:</em> <code style="background:#fff;border:1px dashed #c6a04a;padding:3px 8px;"><?php echo esc_html( $desc_example ); ?></code>
            </div>
            <p><strong>🌐 Online (Stripe):</strong> <a href="<?php echo esc_url( self::STRIPE_LINK ); ?>" target="_blank" class="button button-primary">Stripe ile Öde</a> <span style="color:#666;margin-left:8px;">(Stripe ödeme ekranında "description" alanına yukarıdaki örneği yazın.)</span></p>
            <p><strong>🏦 Banka Havalesi (IBAN):</strong></p>
            <ul style="margin:0 0 0 24px;">
                <li>Hesap: <strong><?php echo esc_html( self::IBAN_NAME ); ?></strong></li>
                <li>IBAN: <code style="font-size:14px;background:#f0f0f1;padding:3px 8px;"><?php echo esc_html( self::IBAN ); ?></code></li>
                <li>Açıklama: <code style="background:#f0f0f1;padding:3px 8px;"><?php echo esc_html( $desc_example ); ?></code></li>
            </ul>
            <p style="margin-top:14px;"><strong>📱 WhatsApp Destek:</strong> <a href="https://wa.me/<?php echo esc_attr( ltrim( self::SUPPORT_WHATSAPP, '+' ) ); ?>" target="_blank"><?php echo esc_html( self::SUPPORT_WHATSAPP ); ?></a> · <strong>📧 Email:</strong> <?php echo esc_html( self::SUPPORT_EMAIL ); ?></p>
        </div>

        <h2 style="margin-top:32px;">📤 Dekont Bildir</h2>
        <p style="color:#555;max-width:820px;">Ödemeyi yaptıktan sonra dekontu (jpg/png/pdf) yükleyin. Bildirimi alır almaz aktivasyon kodunu WhatsApp veya email ile gönderirim.</p>
        <table class="form-table" style="max-width:820px;">
            <tr><th>Plan</th><td><select id="dk-plan"><option value="monthly">Aylık ($40)</option><option value="sixmonth">6 Aylık ($200)</option><option value="yearly">Yıllık ($350)</option></select></td></tr>
            <tr><th>Yöntem</th><td><select id="dk-method"><option value="havale">Banka Havalesi</option><option value="stripe">Stripe</option><option value="other">Diğer</option></select></td></tr>
            <tr><th>Dekont Dosyası</th><td><input type="file" id="dk-file" accept="image/*,application/pdf"></td></tr>
            <tr><th>Not</th><td><textarea id="dk-note" rows="2" class="large-text" placeholder="İsim, açıklama, ek bilgi..."></textarea></td></tr>
        </table>
        <p><button class="button button-primary" id="dk-go">📤 Dekontu Gönder</button> <span id="dk-msg" style="margin-left:10px;"></span></p>

        <h2 style="margin-top:32px;">🔑 Aktivasyon Kodu Gir</h2>
        <p style="color:#555;">Yöneticiden aldığınız <code>AHENK-...</code> kodunu yapıştırın.</p>
        <p>
            <input type="text" id="ac-code" class="regular-text" style="width:100%;max-width:720px;font-family:monospace;" placeholder="AHENK-eyJlIjoiLi4uIn0-abc123...">
        </p>
        <p><button class="button button-primary" id="ac-go">✅ Aktivasyonu Uygula</button> <span id="ac-msg" style="margin-left:10px;"></span></p>
        <?php
    }

    private function render_admin_panel( $nonce, $u ) {
        global $wpdb; $tu = $wpdb->prefix . self::TBL_USERS; $tp = $wpdb->prefix . self::TBL_PAYMENTS;
        $users = $wpdb->get_results( "SELECT * FROM $tu ORDER BY FIELD(role,'admin','submanager','user'), created_at DESC", ARRAY_A );
        $pays  = $wpdb->get_results( "SELECT * FROM $tp ORDER BY created_at DESC LIMIT 100", ARRAY_A );
        $is_admin = ( $u['role'] === 'admin' );
        ?>
        <?php if ( ! $is_admin ) : ?>
            <div class="notice notice-info inline" style="margin:10px 0;"><p>👮 Alt yönetici modundasınız — kullanıcıları ve ödemeleri yönetebilirsiniz, ancak başka yöneticileri değiştiremez veya yeni alt yönetici ekleyemezsiniz.</p></div>
        <?php endif; ?>

        <?php if ( $is_admin ) : ?>
        <h2>👮 Alt Yönetici Ekle</h2>
        <p style="color:#555;max-width:820px;">Lisans, ödeme, aktif/pasif işlerini takip edecek bir alt yönetici oluşturun. Süresi sınırsızdır. Diğer yöneticileri değiştiremez.</p>
        <table class="form-table" style="max-width:820px;">
            <tr><th>Ad Soyad</th><td><input type="text" id="mg-name" class="regular-text"></td></tr>
            <tr><th>Email</th><td><input type="email" id="mg-email" class="regular-text"></td></tr>
            <tr><th>Şifre (≥6)</th><td><input type="text" id="mg-pass" class="regular-text"></td></tr>
        </table>
        <p><button class="button button-primary" id="mg-go">👮 Alt Yönetici Oluştur</button> <span id="mg-msg" style="margin-left:10px;"></span></p>
        <?php endif; ?>

        <h2 style="margin-top:32px;">🔌 Modüller</h2>
        <p style="color:#555;max-width:820px;">AI içerik üretimi dışındaki ek modülleri buradan yönetin.</p>
        <?php $rss_on = (int) get_option( 'ahenk_rss_enabled', 0 ) === 1; ?>
        <table class="form-table" style="max-width:820px;">
            <tr>
                <th>📰 RSS Direkt (AI'sız Haber Botu)</th>
                <td>
                    <label class="ahenk-switch">
                        <input type="checkbox" id="mod-rss" <?php checked( $rss_on ); ?>> Etkinleştir
                    </label>
                    <p style="color:#646970;font-size:12px;margin-top:4px;">
                        Açıldığında "Ahenk Haber Botu" menüsü görünür (RSS kaynaklarından AI olmadan haber çekme).
                        <strong>Kapalıyken hiçbir şey yüklenmez</strong> ve site hızlı kalır. Değişiklik sonrası sayfa yenilenir.
                    </p>
                    <span id="mod-rss-msg" style="margin-left:10px;color:#00a32a;"></span>
                </td>
            </tr>
        </table>

        <h2 style="margin-top:32px;">🛠 Aktivasyon Kodu Üretici</h2>
        <p style="color:#666;">Müşteriye göndereceğiniz HMAC-imzalı offline kodu üretir. Müşteri kendi panelinde yapıştırır → süresi otomatik uzar ve domain kendi hesabına yazılır.</p>
        <table class="form-table" style="max-width:820px;">
            <tr><th>Müşteri Email</th><td><input type="email" id="gc-email" class="regular-text" placeholder="musteri@example.com"></td></tr>
            <tr><th>Domain</th><td><input type="text" id="gc-domain" class="regular-text" placeholder="ornek.com"><p class="description" style="margin:4px 0 0;color:#666;">Müşterinin lisanslanacak alan adı. Kod uygulandığında kullanıcının domain alanına otomatik yazılır. (https://, www. ve / sonrası temizlenir)</p></td></tr>
            <tr><th>Plan</th><td><select id="gc-plan"><option value="monthly">monthly (Aylık)</option><option value="sixmonth">sixmonth (6 Aylık)</option><option value="yearly">yearly (Yıllık)</option><option value="custom">custom</option></select></td></tr>
            <tr><th>Süre (gün)</th><td><input type="number" id="gc-days" value="30" min="1" max="3650"></td></tr>
        </table>
        <p><button class="button button-primary" id="gc-go">🎟 Kod Üret</button></p>
        <textarea id="gc-out" rows="3" style="width:100%;max-width:820px;font-family:monospace;display:none;background:#fff8d6;padding:10px;" readonly></textarea>

        <h2 style="margin-top:32px;">👥 Kullanıcılar (<?php echo count( $users ); ?>)</h2>
        <details style="margin:8px 0 14px;"><summary style="cursor:pointer;color:#2271b1;">➕ Yeni kullanıcı ekle</summary>
            <table class="form-table" style="max-width:820px;">
                <tr><th>Email</th><td><input type="email" id="au-email" class="regular-text"></td></tr>
                <tr><th>Şifre</th><td><input type="text" id="au-pass" class="regular-text"></td></tr>
                <tr><th>Ad Soyad</th><td><input type="text" id="au-name" class="regular-text"></td></tr>
                <tr><th>Domain (opsiyonel)</th><td><input type="text" id="au-domain" class="regular-text" placeholder="example.com"></td></tr>
                <tr><th>Deneme süresi (gün)</th><td><input type="number" id="au-days" value="7" min="1"></td></tr>
            </table>
            <p><button class="button" id="au-go">➕ Ekle</button></p>
        </details>
        <table class="wp-list-table widefat striped">
            <thead><tr>
                <th>Email</th><th>Domain</th><th>Plan</th><th>Bitiş</th><th>Durum</th><th>Son Giriş</th><th style="width:340px;">İşlemler</th>
            </tr></thead>
            <tbody>
            <?php foreach ( $users as $r ) :
                $end = ! empty( $r['expires_at'] ) ? $r['expires_at'] : ( $r['trial_until'] ?: '—' );
                $days = ( $end !== '—' ) ? (int) floor( ( strtotime( $end ) - time() ) / DAY_IN_SECONDS ) : null;
                ?>
                <tr>
                    <td><strong><?php echo esc_html( $r['email'] ); ?></strong><br><small><?php echo esc_html( $r['full_name'] ); ?> · <?php echo esc_html( $r['role'] ); ?></small></td>
                    <td><?php echo esc_html( $r['domain'] ); ?></td>
                    <td><?php echo esc_html( $r['plan'] ); ?></td>
                    <td><?php echo esc_html( $end ); ?><?php if ( $days !== null ) echo '<br><small style="color:' . ( $days < 0 ? '#d63638' : ( $days < 7 ? '#dba617' : '#46b450' ) ) . ';">' . ( $days < 0 ? 'doldu' : $days . ' gün' ) . '</small>'; ?></td>
                    <td><?php echo esc_html( $r['status'] ); ?></td>
                    <td><?php echo esc_html( $r['last_login'] ?: '—' ); ?></td>
                    <td>
                        <?php
                        $is_target_staff = in_array( $r['role'], array( 'admin', 'submanager' ), true );
                        $can_edit = $is_admin || ! $is_target_staff; // submanager staff'ı değiştiremez
                        if ( $is_target_staff && $r['role'] === 'admin' ) {
                            echo '<em style="color:#888;">admin (sınırsız)</em>';
                        } elseif ( $is_target_staff && $r['role'] === 'submanager' ) {
                            if ( $is_admin ) {
                                echo '<button class="button button-small la-del" data-id="' . (int) $r['id'] . '" style="color:#d63638;">🗑 Alt yöneticiyi kaldır</button>';
                            } else {
                                echo '<em style="color:#888;">alt yönetici</em>';
                            }
                        } else { ?>
                            <button class="button button-small la-tog" data-id="<?php echo (int) $r['id']; ?>" data-cur="<?php echo esc_attr( $r['status'] ); ?>"><?php echo $r['status'] === 'aktif' ? '⏸ Pasif' : '▶ Aktif'; ?></button>
                            <button class="button button-small la-ext" data-id="<?php echo (int) $r['id']; ?>">⏰ +30g</button>
                            <button class="button button-small la-del" data-id="<?php echo (int) $r['id']; ?>" style="color:#d63638;">🗑</button>
                        <?php } ?>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>

        <h2 style="margin-top:32px;">💰 Ödemeler / Dekontlar (<?php echo count( $pays ); ?>)</h2>
        <table class="wp-list-table widefat striped">
            <thead><tr><th>Tarih</th><th>Email</th><th>Plan</th><th>$</th><th>Yöntem</th><th>Dekont</th><th>Not</th><th>Durum</th><th>İşlem</th></tr></thead>
            <tbody>
            <?php foreach ( $pays as $p ) : ?>
                <tr>
                    <td><?php echo esc_html( $p['created_at'] ); ?></td>
                    <td><?php echo esc_html( $p['email'] ); ?></td>
                    <td><?php echo esc_html( $p['plan'] ); ?></td>
                    <td>$<?php echo (int) $p['amount_usd']; ?></td>
                    <td><?php echo esc_html( $p['method'] ); ?></td>
                    <td><?php echo $p['dekont_url'] ? '<a href="' . esc_url( $p['dekont_url'] ) . '" target="_blank">📎 Aç</a>' : '—'; ?></td>
                    <td style="max-width:240px;font-size:12px;"><?php echo esc_html( $p['note'] ); ?></td>
                    <td><?php echo esc_html( $p['status'] ); ?></td>
                    <td>
                        <button class="button button-small lp-ok" data-id="<?php echo (int) $p['id']; ?>">✅ Onayla</button>
                        <button class="button button-small lp-rj" data-id="<?php echo (int) $p['id']; ?>">❌ Reddet</button>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
        <?php
    }

    private function render_global_js( $nonce ) {
        ?>
        <script>
        (function(){
            const NONCE = '<?php echo esc_js( $nonce ); ?>';
            const AJAX  = '<?php echo esc_url( admin_url( 'admin-ajax.php' ) ); ?>';
            const $ = id => document.getElementById(id);
            async function ajax(action, data, isFile) {
                const fd = isFile ? data : new FormData();
                if (!isFile) Object.keys(data || {}).forEach(k => fd.append(k, data[k]));
                fd.append('action', action); fd.append('_ajax_nonce', NONCE);
                const r = await fetch(AJAX, { method:'POST', body:fd, credentials:'same-origin' });
                return r.json();
            }

            // Logout
            const lo = $('lic-logout');
            if (lo) lo.addEventListener('click', async () => {
                const j = await ajax('ahenk_lic_logout', {}); location.href = j.data?.redirect || location.href;
            });
            // Şifre değiştir
            const pws = $('lic-pw-save');
            if (pws) pws.addEventListener('click', async () => {
                const j = await ajax('ahenk_lic_change_pass', { old: $('lic-pw-old').value, new: $('lic-pw-new').value });
                alert(j.success ? '✅ Şifre güncellendi.' : '❌ ' + (j.data?.msg || ''));
                if (j.success) { $('lic-pw-old').value = ''; $('lic-pw-new').value = ''; }
            });
            // Plan seç (sadece bilgi)
            document.querySelectorAll('.lic-buy').forEach(b => b.addEventListener('click', () => {
                $('dk-plan').value = b.dataset.plan;
                document.getElementById('dk-plan').scrollIntoView({behavior:'smooth', block:'center'});
            }));
            // Dekont gönder
            const dg = $('dk-go');
            if (dg) dg.addEventListener('click', async () => {
                const fd = new FormData();
                fd.append('plan',   $('dk-plan').value);
                fd.append('method', $('dk-method').value);
                fd.append('note',   $('dk-note').value);
                if ($('dk-file').files[0]) fd.append('dekont', $('dk-file').files[0]);
                $('dk-msg').textContent = '⏳ Gönderiliyor...';
                const j = await ajax('ahenk_lic_upload_dekont', fd, true);
                $('dk-msg').textContent = j.success ? ('✅ ' + j.data.msg) : ('❌ ' + (j.data?.msg || ''));
            });
            // Aktivasyon kodu uygula
            const ag = $('ac-go');
            if (ag) ag.addEventListener('click', async () => {
                $('ac-msg').textContent = '⏳ Doğrulanıyor...';
                const j = await ajax('ahenk_lic_apply_code', { code: $('ac-code').value });
                $('ac-msg').textContent = j.success ? ('✅ ' + j.data.msg) : ('❌ ' + (j.data?.msg || ''));
                if (j.success) setTimeout(() => location.reload(), 1500);
            });

            // ADMIN: kod üret
            const gc = $('gc-go');
            if (gc) gc.addEventListener('click', async () => {
                const j = await ajax('ahenk_lic_generate_code', {
                    email: $('gc-email').value, plan: $('gc-plan').value, days: $('gc-days').value,
                    domain: ($('gc-domain') && $('gc-domain').value) || '',
                });
                if (j.success) { $('gc-out').style.display = ''; $('gc-out').value = j.data.code; $('gc-out').select(); }
                else alert('❌ ' + (j.data?.msg || ''));
            });
            // ADMIN: alt yönetici ekle
            const mg = $('mg-go');
            if (mg) mg.addEventListener('click', async () => {
                const j = await ajax('ahenk_lic_add_manager', {
                    email: $('mg-email').value, password: $('mg-pass').value, full_name: $('mg-name').value,
                });
                $('mg-msg').textContent = j.success ? '✅ Alt yönetici eklendi' : ('❌ ' + (j.data?.msg || ''));
                if (j.success) setTimeout(() => location.reload(), 1200);
            });
            // ADMIN: kullanıcı ekle
            const au = $('au-go');
            if (au) au.addEventListener('click', async () => {
                const j = await ajax('ahenk_lic_admin_add_user', {
                    email: $('au-email').value, password: $('au-pass').value,
                    full_name: $('au-name').value, domain: $('au-domain').value, days: $('au-days').value,
                });
                if (j.success) { alert('✅ Eklendi'); location.reload(); }
                else alert('❌ ' + (j.data?.msg || ''));
            });
            // ADMIN: aktif/pasif, +30g, sil, ödeme onay/red
            document.querySelectorAll('.la-tog').forEach(b => b.addEventListener('click', async () => {
                const next = b.dataset.cur === 'aktif' ? 'pasif' : 'aktif';
                const j = await ajax('ahenk_lic_admin_action', { act:'set_status', id:b.dataset.id, val:next });
                if (j.success) location.reload();
            }));
            document.querySelectorAll('.la-ext').forEach(b => b.addEventListener('click', async () => {
                const j = await ajax('ahenk_lic_admin_action', { act:'extend', id:b.dataset.id, val:30 });
                if (j.success) { alert('✅ Yeni bitiş: ' + j.data.new_end); location.reload(); }
            }));
            document.querySelectorAll('.la-del').forEach(b => b.addEventListener('click', async () => {
                if (!confirm('Bu kullanıcıyı sil?')) return;
                const j = await ajax('ahenk_lic_admin_action', { act:'delete', id:b.dataset.id });
                if (j.success) location.reload();
            }));
            document.querySelectorAll('.lp-ok').forEach(b => b.addEventListener('click', async () => {
                const j = await ajax('ahenk_lic_admin_action', { act:'pay_status', id:b.dataset.id, val:'onayli' });
                if (j.success) location.reload();
            }));
            document.querySelectorAll('.lp-rj').forEach(b => b.addEventListener('click', async () => {
                const j = await ajax('ahenk_lic_admin_action', { act:'pay_status', id:b.dataset.id, val:'reddedildi' });
                if (j.success) location.reload();
            }));
            // v3.11.4 — Modül toggle (RSS Direkt)
            const modRss = $('mod-rss');
            if (modRss) modRss.addEventListener('change', async () => {
                const j = await ajax('ahenk_toggle_module', { module:'rss', on: modRss.checked ? 1 : 0 });
                const msg = $('mod-rss-msg');
                if (j.success) { msg.textContent = '✓ Kaydedildi — sayfa yenileniyor...'; setTimeout(() => location.reload(), 700); }
                else { msg.style.color = '#d63638'; msg.textContent = '✗ ' + (j.data?.msg || 'Hata'); }
            });
        })();
        </script>
        <?php
    }
}

Ahenk_License::init();
