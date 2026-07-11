<?php

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! class_exists( 'AHB_Admin_Page' ) ) {
class AHB_Admin_Page {

    public function init() {
        add_action( 'admin_menu', array( $this, 'add_menu' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );
        add_action( 'admin_post_ahb_run_now', array( $this, 'handle_run_now' ) );
        add_action( 'admin_post_ahb_clear_log', array( $this, 'handle_clear_log' ) );
        add_action( 'admin_post_ahb_run_topic_plan', array( $this, 'handle_run_topic_plan' ) );
        add_action( 'wp_ajax_ahb_cleanup_batch', array( $this, 'ajax_cleanup_batch' ) );
        add_action( 'wp_ajax_ahb_cleanup_categories', array( $this, 'ajax_cleanup_categories' ) );
        add_action( 'wp_ajax_ahb_columnist_save', array( $this, 'ajax_columnist_save' ) );
        add_action( 'wp_ajax_ahb_columnist_delete', array( $this, 'ajax_columnist_delete' ) );
        add_action( 'wp_ajax_ahb_columnist_avatar', array( $this, 'ajax_columnist_avatar' ) );
        add_action( 'wp_ajax_ahb_columnist_run', array( $this, 'ajax_columnist_run' ) );
        add_action( 'wp_ajax_ahb_columnist_bio', array( $this, 'ajax_columnist_bio' ) );
        add_action( 'wp_ajax_ahb_managed_save', array( $this, 'ajax_managed_save' ) );
        add_action( 'wp_ajax_ahb_managed_delete', array( $this, 'ajax_managed_delete' ) );
        add_action( 'wp_ajax_ahb_managed_get', array( $this, 'ajax_managed_get' ) );
        add_action( 'wp_ajax_ahb_managed_status', array( $this, 'ajax_managed_status' ) );
        add_action( 'wp_ajax_ahb_convert_to_link_batch', array( $this, 'ajax_convert_to_link_batch' ) );
        add_action( 'wp_ajax_ahb_delete_by_category_batch', array( $this, 'ajax_delete_by_category_batch' ) );
        add_action( 'wp_ajax_ahb_db_scan',  array( $this, 'ajax_db_scan' ) );
        add_action( 'wp_ajax_ahb_db_clean', array( $this, 'ajax_db_clean' ) );
        add_action( 'wp_ajax_ahb_find_images_batch', array( $this, 'ajax_find_images_batch' ) );
        add_action( 'wp_ajax_ahb_fix_future_dates', array( $this, 'ajax_fix_future_dates' ) );
        add_action( 'wp_ajax_ahb_block_source',     array( $this, 'ajax_block_source' ) );
        add_action( 'wp_ajax_ahb_unblock_source',   array( $this, 'ajax_unblock_source' ) );
        add_action( 'wp_ajax_ahb_delete_by_title',  array( $this, 'ajax_delete_by_title' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
        add_action( 'admin_init', array( $this, 'maybe_handle_import_ext_author' ) );
    }

    /**
     * Köşe Yazarları sekmesindeki "İçeri Aktar" form gönderimini işler.
     * Eklenti tablosundaki yazarın ad/biyo/foto bilgilerini AI köşe yazarı
     * olarak AHB tarafına kaydeder.
     */
    public function maybe_handle_import_ext_author() {
        if ( empty( $_POST['ahb_action'] ) || $_POST['ahb_action'] !== 'import_ext_author' ) return;
        if ( ! current_user_can( 'manage_options' ) ) return;
        if ( empty( $_POST['ahb_iea_nonce'] ) || ! wp_verify_nonce( $_POST['ahb_iea_nonce'], 'ahb_import_ext_author' ) ) {
            wp_die( 'Güvenlik kontrolü başarısız.' );
        }

        $name   = isset( $_POST['src_name'] )   ? sanitize_text_field( wp_unslash( $_POST['src_name'] ) )   : '';
        $unvan  = isset( $_POST['src_unvan'] )  ? sanitize_text_field( wp_unslash( $_POST['src_unvan'] ) )  : '';
        $bio    = isset( $_POST['src_bio'] )    ? sanitize_textarea_field( wp_unslash( $_POST['src_bio'] ) ) : '';
        $avatar = isset( $_POST['src_avatar'] ) ? esc_url_raw( wp_unslash( $_POST['src_avatar'] ) )         : '';

        if ( $name === '' ) {
            wp_safe_redirect( add_query_arg( array( 'page' => 'ai-haber-botu', 'tab' => 'columnists', 'iea' => 'err' ), admin_url( 'admin.php' ) ) );
            exit;
        }

        // Avatar'ı medya kütüphanesine indir
        $avatar_id = 0;
        if ( $avatar && preg_match( '~^https?://~i', $avatar ) ) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/media.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';
            $tmp = download_url( $avatar, 30 );
            if ( ! is_wp_error( $tmp ) ) {
                $file = array( 'name' => sanitize_file_name( sanitize_title( $name ) . '.jpg' ), 'tmp_name' => $tmp );
                $sid  = media_handle_sideload( $file, 0, 'AHENK içeri aktarılan köşe yazarı: ' . $name );
                if ( ! is_wp_error( $sid ) ) $avatar_id = (int) $sid;
                else @unlink( $tmp );
            }
        }

        // İçeri aktarılan yazar için stub WP user oluştur — yoksa post_author=0 olur,
        // wp_insert_post sessizce başarısız olabilir veya yazısız bir post bırakır.
        $bio_final = $bio !== '' ? $bio : ( $unvan ? $unvan : '' );
        $wp_user_id = AHB_Columnists::create_stub_user( $name, $bio_final );
        if ( ! $wp_user_id ) {
            wp_safe_redirect( add_query_arg( array( 'page' => 'ai-haber-botu', 'tab' => 'columnists', 'iea' => 'err_user' ), admin_url( 'admin.php' ) ) );
            exit;
        }

        // AHB AI köşe yazarı oluştur
        $col = array(
            'type'          => 'ai',
            'wp_user_id'    => (int) $wp_user_id,
            'name'          => $name,
            'gender'        => 'other',
            'avatar_id'     => $avatar_id,
            'avatar_prompt' => '',
            'bio'           => $bio_final,
            'tone'          => 'samimi ve özgün',
            'schedule_mode' => 'single',
            // Konu boşsa ünvan, o da boşsa varsayılan olarak "Güncel Gündem" — boş kalırsa
            // "Şimdi Yazdır" 'no_topic' hatasıyla başarısız olur.
            'topic_single'  => $unvan !== '' ? $unvan : 'Güncel Gündem',
            'topics_weekly' => array(),
            'word_count'    => 600,
            'post_status'   => 'publish',
            'post_time'     => '09:00',
            'active'        => 1,
        );
        AHB_Columnists::save( $col );

        wp_safe_redirect( add_query_arg( array( 'page' => 'ai-haber-botu', 'tab' => 'columnists', 'iea' => 'ok' ), admin_url( 'admin.php' ) ) );
        exit;
    }

    public function add_menu() {
        add_menu_page(
            'Ahenk Ai İçerik Robotu',
            'Ahenk Ai İçerik Robotu',
            'manage_options',
            'ai-haber-botu',
            array( $this, 'render_page' ),
            'dashicons-rss',
            30
        );

        add_submenu_page(
            'ai-haber-botu',
            'Ayarlar',
            'Ayarlar',
            'manage_options',
            'ai-haber-botu',
            array( $this, 'render_page' )
        );

        // Submenu olarak gosterme (sol panel temiz kalsin) — "İçerikler" tabindan
        // link ile erisilir. URL hala admin.php?page=ai-haber-botu-managed olarak calisir.
        add_submenu_page( null, 'Eklenen Haberler', '📰 Eklenen Haberler', 'manage_options', 'ai-haber-botu-managed', array( $this, 'render_managed_posts_page' ) );
        add_submenu_page( null, 'İşlem Geçmişi',     'İşlem Geçmişi',       'manage_options', 'ai-haber-botu-log',     array( $this, 'render_log_page' ) );

        // Video TV ve Bloklar submenüleri - iframe/tab yerine direkt erişim
        // NOT: remove_submenu_page sadece görünürlüğü etkiler, sayfalar hala erişilebilir
        add_action( 'admin_menu', array( $this, 'cleanup_submenus' ), 9999 );
    }

    public function cleanup_submenus() {
        // Sadece çift kayıtlı VTV bağımsız eklenti sayfalarını gizle
        // Ana eklenti submenüsündekiler (video-tv, ahb-bloklar-manset) ERİŞİLEBİLİR kalır
        // Ayrı/bağımsız eklenti menüsü aktifse çakışmayı önle
        if ( current_user_can( 'manage_options' ) ) {
            // Standalone Video TV menüsü çakışmasını önle
            remove_menu_page( 'video-tv' );
        }
    }

    /* ============================================================
     *  EKLENEN HABERLER — bu eklentinin (klasik AHB, RSS Direkt, AI
     *  köşe yazarı) eklediği bütün postları listeler. Başlık/içerik
     *  düzenleme ve toplu silme imkânı sağlar.
     * ============================================================ */
    private function managed_meta_query() {
        return array(
            'relation' => 'OR',
            array( 'key' => '_ahb_source_url',  'compare' => 'EXISTS' ),
            array( 'key' => '_ahb_kampanya_id', 'compare' => 'EXISTS' ),
            array( 'key' => '_ahb_kaynak_link', 'compare' => 'EXISTS' ),
            array( 'key' => '_ahb_column_post', 'compare' => 'EXISTS' ),
        );
    }

    public function render_managed_posts_page() {
        if ( ! current_user_can( 'manage_options' ) ) wp_die( 'yetki yok' );

        $nonce  = wp_create_nonce( 'ahb_managed' );
        $paged  = isset( $_GET['paged'] ) ? max( 1, (int) $_GET['paged'] ) : 1;
        $per    = 25;
        $search = isset( $_GET['s'] ) ? sanitize_text_field( wp_unslash( $_GET['s'] ) ) : '';
        $kaynak = isset( $_GET['kaynak'] ) ? sanitize_key( $_GET['kaynak'] ) : '';
        $status = isset( $_GET['durum'] ) ? sanitize_key( $_GET['durum'] ) : 'any';

        // Kaynak filtresi: meta key'e göre
        $meta_q = $this->managed_meta_query();
        if ( $kaynak === 'klasik' ) {
            $meta_q = array( array( 'key' => '_ahb_source_url', 'compare' => 'EXISTS' ) );
        } elseif ( $kaynak === 'rssdirect' ) {
            $meta_q = array(
                'relation' => 'OR',
                array( 'key' => '_ahb_kampanya_id', 'compare' => 'EXISTS' ),
                array( 'key' => '_ahb_kaynak_link', 'compare' => 'EXISTS' ),
            );
        } elseif ( $kaynak === 'kose' ) {
            $meta_q = array( array( 'key' => '_ahb_column_post', 'compare' => 'EXISTS' ) );
        }

        $valid_status = in_array( $status, array( 'any','publish','draft','pending','trash' ), true ) ? $status : 'any';

        /* === HIZLI SORGU: meta_query yerine direkt postmeta JOIN ===
           Eski 'post_type=any' + 4-yönlü EXISTS meta_query büyük sitelerde
           timeout'a yol açıyor. Burada postmeta'dan distinct post_id'leri
           tek seferde çekip, sonra wp_posts üzerinde basit bir filtre uyguluyoruz. */
        global $wpdb;

        // Hangi meta key'lere bakacağız
        if ( $kaynak === 'klasik' ) {
            $keys = array( '_ahb_source_url' );
        } elseif ( $kaynak === 'rssdirect' ) {
            $keys = array( '_ahb_kampanya_id', '_ahb_kaynak_link' );
        } elseif ( $kaynak === 'kose' ) {
            $keys = array( '_ahb_column_post' );
        } else {
            $keys = array( '_ahb_source_url', '_ahb_kampanya_id', '_ahb_kaynak_link', '_ahb_column_post' );
        }
        $key_in = "'" . implode( "','", array_map( 'esc_sql', $keys ) ) . "'";

        // Status filtresi
        $status_sql = '';
        if ( $valid_status !== 'any' ) {
            $status_sql = $wpdb->prepare( ' AND p.post_status = %s', $valid_status );
        } else {
            $status_sql = " AND p.post_status IN ('publish','draft','pending','trash','private','future')";
        }

        // Arama filtresi
        $search_sql = '';
        if ( $search !== '' ) {
            $like = '%' . $wpdb->esc_like( $search ) . '%';
            $search_sql = $wpdb->prepare( ' AND (p.post_title LIKE %s OR p.post_content LIKE %s)', $like, $like );
        }

        // Toplam sayı (DISTINCT post_id)
        $toplam_yonetilen = (int) $wpdb->get_var(
            "SELECT COUNT(DISTINCT pm.post_id)
             FROM {$wpdb->postmeta} pm
             INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE pm.meta_key IN ($key_in)
             $status_sql $search_sql"
        );

        $offset = ( $paged - 1 ) * $per;
        $ids = $wpdb->get_col(
            "SELECT DISTINCT pm.post_id
             FROM {$wpdb->postmeta} pm
             INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE pm.meta_key IN ($key_in)
             $status_sql $search_sql
             ORDER BY p.post_date DESC
             LIMIT $per OFFSET $offset"
        );

        if ( ! empty( $ids ) ) {
            $q = new WP_Query( array(
                'post_type'      => 'any',
                'post_status'    => 'any',
                'post__in'       => array_map( 'intval', $ids ),
                'posts_per_page' => $per,
                'orderby'        => 'post__in',
                'no_found_rows'  => true,
                'ignore_sticky_posts' => true,
            ) );
        } else {
            $q = new WP_Query( array( 'post__in' => array( 0 ), 'posts_per_page' => 1 ) );
        }

        ?>
        <div class="wrap" style="max-width:1300px;">
            <h1 style="margin-bottom:6px;">📰 Eklenen Haberler</h1>
            <p style="color:#555;margin-top:0;">
                Bu liste yalnızca <strong>Ahenk Ai İçerik Robotu'nun eklediği</strong> haberleri gösterir
                (klasik AI haber, RSS Direkt, AI köşe yazıları).
                Manuel oluşturduğunuz yazılar burada listelenmez ve etkilenmez.
                Toplam <strong><?php echo esc_html( $toplam_yonetilen ); ?></strong> yönetilen haber bulundu.
            </p>
            <?php
            $varsayilan_durum = get_option( 'ahb_post_status', 'publish' );
            if ( $varsayilan_durum === 'draft' ) : ?>
                <div class="notice notice-info inline" style="margin:8px 0;padding:10px 14px;border-left-color:#2271b1;">
                    <p style="margin:0;">
                        💡 <strong>Yeni haberler neden Taslak'a düşüyor?</strong> Çünkü
                        <em>Ayarlar → Genel</em> sekmesindeki <strong>"Yayın Durumu"</strong> ayarı
                        şu anda <strong>Taslak</strong>'a kurulu. Tüm yeni haberlerin otomatik
                        yayınlanmasını istiyorsanız bu ayarı <strong>Yayında</strong> yapın.
                        Kontrolü elinizde tutmak için Taslak'ta bırakıp aşağıdaki
                        <strong>"Seçilenleri Yayınla"</strong> butonuyla toplu yayınlayabilirsiniz.
                    </p>
                </div>
            <?php endif; ?>

            <div style="background:#fff;border:1px solid #f0b400;border-left:4px solid #f0b400;padding:10px 14px;margin:10px 0;border-radius:6px;">
                <strong>🧹 Çift (duplicate) haberler var mı?</strong>
                Aynı başlık veya aynı içerik parmak izine sahip haberlerin <em>en eskisi hariç</em> diğerlerini tek tıkla siler.
                <button type="button" class="button button-primary" id="ahb-mng-dedupe" style="margin-left:10px;">🧹 Duplicate'leri Temizle</button>
                <span id="ahb-mng-dedupe-status" style="margin-left:10px;color:#555;"></span>
            </div>

            <?php
            $blocked_list = (array) get_option( 'ahb_blocked_domains_list', array() );
            ?>
            <div style="background:#fff;border:1px solid #d63638;border-left:4px solid #d63638;padding:12px 14px;margin:10px 0;border-radius:6px;">
                <strong>🚫 Sorunlu Kaynağı Engelle</strong>
                <p style="margin:6px 0 10px;color:#444;">
                    Sürekli kopya üreten veya silindiği halde tekrar açılan bir RSS kaynağı varsa burada engelleyin.
                    O domainden gelen <strong>tüm mevcut haberler kalıcı silinir</strong> ve bot bir daha o kaynaktan haber çekmez.
                </p>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <input type="text" id="ahb-block-domain" placeholder="örn: medyaankara.com" style="flex:1;min-width:260px;padding:6px 8px;" />
                    <button type="button" class="button button-primary" id="ahb-block-btn">🚫 Engelle ve Tüm Haberlerini Sil</button>
                    <span id="ahb-block-status" style="color:#555;"></span>
                </div>
                <?php if ( $blocked_list ) : ?>
                    <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #ddd;">
                        <strong>Engelli kaynaklar:</strong>
                        <?php foreach ( $blocked_list as $d ) : ?>
                            <span style="display:inline-block;background:#fde7e9;color:#a00;padding:2px 8px;border-radius:10px;margin:2px 4px;">
                                <?php echo esc_html( $d ); ?>
                                <a href="#" class="ahb-unblock" data-d="<?php echo esc_attr( $d ); ?>" style="color:#a00;text-decoration:none;margin-left:6px;font-weight:bold;" title="Engeli kaldır">×</a>
                            </span>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>

            <div style="background:#fff;border:1px solid #b26200;border-left:4px solid #b26200;padding:12px 14px;margin:10px 0;border-radius:6px;">
                <strong>🧹 Başlığa Göre Tüm Kopyaları Sil</strong>
                <p style="margin:6px 0 10px;color:#444;">
                    Bir başlık girin — sitedeki <strong>aynı veya çok benzer başlıklı tüm haberler</strong>
                    (yayında, taslak, çöp — hepsi) kalıcı silinir ve bot bir daha bu başlığı üretmez.
                </p>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <input type="text" id="ahb-deltitle-input" placeholder="örn: Ankara Valisi Şahin, 23 Nisan kapsamında..." style="flex:1;min-width:320px;padding:6px 8px;" />
                    <button type="button" class="button button-primary" id="ahb-deltitle-btn">🧹 Tüm Kopyaları Sil</button>
                    <span id="ahb-deltitle-status" style="color:#555;"></span>
                </div>
            </div>
            <script>
            (function(){
                var dtNonce = '<?php echo esc_js( wp_create_nonce("ahb_delete_by_title") ); ?>';
                var dtBtn = document.getElementById('ahb-deltitle-btn');
                var dtInp = document.getElementById('ahb-deltitle-input');
                var dtSt  = document.getElementById('ahb-deltitle-status');
                if(dtBtn){
                    dtBtn.addEventListener('click', function(){
                        var t = (dtInp.value||'').trim();
                        if(t.length < 8){ alert('En az 8 karakter girin'); return; }
                        if(!confirm('"'+t+'" başlığına benzeyen TÜM haberler kalıcı silinecek. Devam?')) return;
                        dtBtn.disabled = true; dtSt.textContent = 'Aranıyor...';
                        var fd = new FormData();
                        fd.append('action','ahb_delete_by_title');
                        fd.append('nonce',dtNonce);
                        fd.append('title',t);
                        fetch(ajaxurl, {method:'POST', body:fd, credentials:'same-origin'})
                            .then(function(r){return r.json();})
                            .then(function(j){
                                if(j && j.success){
                                    dtSt.innerHTML = '<strong style="color:green">✓ '+(j.data.deleted||0)+' kopya silindi.</strong> Sayfa yenileniyor...';
                                    setTimeout(function(){ location.reload(); }, 1500);
                                } else {
                                    dtSt.innerHTML = '<strong style="color:red">Hata: '+(j && j.data ? j.data : 'bilinmeyen')+'</strong>';
                                    dtBtn.disabled = false;
                                }
                            }).catch(function(e){
                                dtSt.innerHTML = '<strong style="color:red">'+e.message+'</strong>';
                                dtBtn.disabled = false;
                            });
                    });
                }
            })();
            </script>
            <script>
            (function(){
                var nonce = '<?php echo esc_js( wp_create_nonce("ahb_block_source") ); ?>';
                var btn = document.getElementById('ahb-block-btn');
                var inp = document.getElementById('ahb-block-domain');
                var st  = document.getElementById('ahb-block-status');
                if(btn){
                    btn.addEventListener('click', function(){
                        var d = (inp.value||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/.*$/,'');
                        if(!d){ alert('Domain gir (örn: medyaankara.com)'); return; }
                        if(!confirm(d+' kaynağından gelen TÜM haberler kalıcı silinecek ve domain engellenecek. Devam?')) return;
                        btn.disabled = true; st.textContent = 'İşleniyor...';
                        var fd = new FormData();
                        fd.append('action','ahb_block_source');
                        fd.append('nonce',nonce);
                        fd.append('domain',d);
                        fetch(ajaxurl, {method:'POST', body:fd, credentials:'same-origin'})
                            .then(function(r){return r.json();})
                            .then(function(j){
                                if(j && j.success){
                                    st.innerHTML = '<strong style="color:green">✓ '+(j.data.deleted||0)+' haber silindi, kaynak engellendi.</strong> Sayfa yenileniyor...';
                                    setTimeout(function(){ location.reload(); }, 1500);
                                } else {
                                    st.innerHTML = '<strong style="color:red">Hata: '+(j && j.data ? j.data : 'bilinmeyen')+'</strong>';
                                    btn.disabled = false;
                                }
                            }).catch(function(e){
                                st.innerHTML = '<strong style="color:red">'+e.message+'</strong>';
                                btn.disabled = false;
                            });
                    });
                }
                document.querySelectorAll('.ahb-unblock').forEach(function(a){
                    a.addEventListener('click', function(e){
                        e.preventDefault();
                        var d = this.getAttribute('data-d');
                        if(!confirm(d+' engeli kaldırılsın mı? (Mevcut silinen haberler geri gelmez)')) return;
                        var fd = new FormData();
                        fd.append('action','ahb_unblock_source');
                        fd.append('nonce',nonce);
                        fd.append('domain',d);
                        fetch(ajaxurl, {method:'POST', body:fd, credentials:'same-origin'})
                            .then(function(r){return r.json();})
                            .then(function(j){ if(j && j.success) location.reload(); else alert('Hata'); });
                    });
                });
            })();
            </script>
            <script>
            (function(){
                var btn = document.getElementById('ahb-mng-dedupe');
                if(!btn) return;
                btn.addEventListener('click', function(){
                    if(!confirm('Tüm çift haberler taranıp en eskisi hariç silinecek. Devam edilsin mi?')) return;
                    var st = document.getElementById('ahb-mng-dedupe-status');
                    btn.disabled = true; st.textContent = 'Taranıyor, lütfen bekleyin...';
                    var fd = new FormData();
                    fd.append('action','ahbrss_duplicate_temizle');
                    fd.append('nonce','<?php echo esc_js( wp_create_nonce("ahbrss_nonce") ); ?>');
                    fetch(ajaxurl, {method:'POST', body:fd, credentials:'same-origin'})
                        .then(function(r){return r.json();})
                        .then(function(j){
                            if(j && j.success){
                                st.innerHTML = '<strong style="color:green">✓ '+(j.data && j.data.silinen_post ? j.data.silinen_post : 0)+' çift haber silindi.</strong> Sayfa yenileniyor...';
                                setTimeout(function(){ location.reload(); }, 1200);
                            } else {
                                st.innerHTML = '<strong style="color:red">Hata: '+(j && j.data ? j.data : 'bilinmeyen')+'</strong>';
                                btn.disabled = false;
                            }
                        }).catch(function(e){
                            st.innerHTML = '<strong style="color:red">Hata: '+e.message+'</strong>';
                            btn.disabled = false;
                        });
                });
            })();
            </script>

            <div style="background:#fff;border:1px solid #2271b1;border-left:4px solid #2271b1;padding:12px 14px;margin:10px 0;border-radius:6px;">
                <strong>💾 Disk Bakımı</strong>
                <p style="margin:6px 0 10px 0;color:#444;">Sunucudaki disk yerini boşaltmak için iki araç:</p>

                <div style="display:flex;gap:14px;flex-wrap:wrap;">
                    <!-- Resimleri Linke Çevir -->
                    <div style="flex:1;min-width:320px;border:1px solid #e6e6e6;padding:10px 12px;border-radius:6px;background:#fafbfc;">
                        <strong>🔗 Eski resimleri linke çevir</strong>
                        <p style="margin:6px 0;color:#555;font-size:13px;">
                            Geçmişte indirilmiş resimleri sunucudan siler ve <em>kaynak siteden link</em> olarak gösterir.
                            Sadece kaynak URL'si bilinen resimler dönüştürülür.
                        </p>
                        <button type="button" class="button button-primary" id="ahb-convert-link">🔗 Dönüştürmeye Başla</button>
                        <span id="ahb-convert-status" style="margin-left:10px;color:#555;font-size:13px;"></span>
                        <div id="ahb-convert-progress" style="display:none;margin-top:8px;background:#eee;border-radius:4px;height:18px;overflow:hidden;">
                            <div id="ahb-convert-bar" style="background:#2271b1;height:100%;width:0%;transition:width .3s;"></div>
                        </div>
                    </div>

                    <!-- Kategoriye Göre Toplu Sil -->
                    <div style="flex:1;min-width:320px;border:1px solid #e6e6e6;padding:10px 12px;border-radius:6px;background:#fafbfc;">
                        <strong>🗑️ Kategoriye göre toplu sil</strong>
                        <p style="margin:6px 0;color:#555;font-size:13px;">
                            Seçilen kategorideki <strong>tüm haberleri</strong> ve öne çıkan görsellerini kalıcı olarak siler.
                            (Sadece bu eklentinin eklediği haberleri etkiler.)
                        </p>
                        <select id="ahb-del-cat" style="min-width:200px;">
                            <option value="">— Kategori Seçin —</option>
                            <?php
                            $cats = get_categories( array( 'hide_empty' => false, 'orderby' => 'name' ) );
                            foreach ( $cats as $c ) {
                                printf( '<option value="%d">%s (%d)</option>',
                                    $c->term_id, esc_html( $c->name ), (int) $c->count );
                            }
                            ?>
                        </select>
                        <button type="button" class="button button-secondary" id="ahb-del-cat-btn" style="background:#dc3232;color:#fff;border-color:#dc3232;">🗑️ Sil</button>
                        <span id="ahb-del-cat-status" style="margin-left:10px;color:#555;font-size:13px;"></span>
                    </div>
                </div>
            </div>

            <script>
            (function(){
                var nonce = '<?php echo esc_js( wp_create_nonce("ahb_disk_bakim") ); ?>';

                /* === RESİMLERİ LİNKE ÇEVİR === */
                var btn = document.getElementById('ahb-convert-link');
                var st  = document.getElementById('ahb-convert-status');
                var pg  = document.getElementById('ahb-convert-progress');
                var bar = document.getElementById('ahb-convert-bar');
                var totalProcessed = 0, totalConverted = 0, totalFreed = 0, totalFailed = 0;

                function fmtMB(b){ return (b/1024/1024).toFixed(2)+' MB'; }

                function runBatch(offset){
                    var fd = new FormData();
                    fd.append('action','ahb_convert_to_link_batch');
                    fd.append('nonce', nonce);
                    fd.append('offset', offset);
                    return fetch(ajaxurl,{method:'POST',body:fd,credentials:'same-origin'})
                        .then(function(r){return r.json();});
                }

                if (btn) {
                    btn.addEventListener('click', function(){
                        if(!confirm('Eski haberlerin yerel resim dosyaları silinecek ve dış URL\'ye bağlanacak. Bu işlem GERİ ALINAMAZ. Devam edilsin mi?')) return;
                        btn.disabled = true; pg.style.display='block';
                        totalProcessed=0; totalConverted=0; totalFreed=0; totalFailed=0;
                        st.textContent = 'Başlatılıyor...';

                        function step(offset){
                            runBatch(offset).then(function(j){
                                if(!j || !j.success){
                                    st.innerHTML = '<strong style="color:red">Hata: '+(j && j.data ? j.data : 'bilinmeyen')+'</strong>';
                                    btn.disabled=false; return;
                                }
                                var d = j.data;
                                totalProcessed += d.processed;
                                totalConverted += d.converted;
                                totalFailed    += d.failed;
                                totalFreed     += d.freed_bytes;
                                var pct = d.total>0 ? Math.min(100, Math.round((d.scanned_total/d.total)*100)) : 100;
                                bar.style.width = pct+'%';
                                st.innerHTML = '<strong>'+pct+'%</strong> — '+d.scanned_total+'/'+d.total+
                                    ' tarandı, <strong style="color:green">'+totalConverted+' dönüştürüldü</strong>, '+
                                    totalFailed+' atlandı, <strong>'+fmtMB(totalFreed)+'</strong> boşaltıldı.';
                                if (d.done) {
                                    st.innerHTML = '<strong style="color:green">✓ Tamamlandı.</strong> '+
                                        totalConverted+' resim linke çevrildi, <strong>'+fmtMB(totalFreed)+'</strong> disk yeri boşaltıldı.';
                                    btn.disabled=false;
                                } else {
                                    setTimeout(function(){ step(d.next_offset); }, 200);
                                }
                            }).catch(function(e){
                                st.innerHTML = '<strong style="color:red">Hata: '+e.message+'</strong>';
                                btn.disabled=false;
                            });
                        }
                        step(0);
                    });
                }

                /* === KATEGORİYE GÖRE SİL === */
                var dbtn = document.getElementById('ahb-del-cat-btn');
                var dst  = document.getElementById('ahb-del-cat-status');
                var dsel = document.getElementById('ahb-del-cat');
                var totalDeleted = 0;

                function delBatch(catId){
                    var fd = new FormData();
                    fd.append('action','ahb_delete_by_category_batch');
                    fd.append('nonce', nonce);
                    fd.append('cat_id', catId);
                    return fetch(ajaxurl,{method:'POST',body:fd,credentials:'same-origin'})
                        .then(function(r){return r.json();});
                }

                if (dbtn) {
                    dbtn.addEventListener('click', function(){
                        var catId = dsel.value;
                        if (!catId) { alert('Lütfen bir kategori seçin.'); return; }
                        var catName = dsel.options[dsel.selectedIndex].text;
                        if(!confirm('"'+catName+'" kategorisindeki TÜM eklenti haberleri ve resimleri kalıcı olarak silinecek. Bu işlem GERİ ALINAMAZ. Devam edilsin mi?')) return;
                        if(!confirm('Son uyarı: gerçekten "'+catName+'" kategorisini boşaltmak istiyor musunuz?')) return;

                        dbtn.disabled = true; totalDeleted = 0;
                        dst.textContent = 'Siliniyor...';

                        function step(){
                            delBatch(catId).then(function(j){
                                if(!j || !j.success){
                                    dst.innerHTML = '<strong style="color:red">Hata: '+(j && j.data ? j.data : 'bilinmeyen')+'</strong>';
                                    dbtn.disabled=false; return;
                                }
                                var d = j.data;
                                totalDeleted += d.deleted;
                                dst.innerHTML = '<strong>'+totalDeleted+'</strong> haber silindi, '+d.remaining+' kaldı...';
                                if (d.done) {
                                    dst.innerHTML = '<strong style="color:green">✓ Tamamlandı.</strong> '+totalDeleted+' haber silindi.';
                                    dbtn.disabled=false;
                                    setTimeout(function(){ location.reload(); }, 1500);
                                } else {
                                    setTimeout(step, 200);
                                }
                            }).catch(function(e){
                                dst.innerHTML = '<strong style="color:red">Hata: '+e.message+'</strong>';
                                dbtn.disabled=false;
                            });
                        }
                        step();
                    });
                }
            })();
            </script>

            <div style="background:#fff;border:1px solid #8e44ad;border-left:4px solid #8e44ad;padding:12px 14px;margin:10px 0;border-radius:6px;">
                <strong>🖼️ Eksik / Yerel Görselleri Web'den Bul</strong>
                <p style="margin:6px 0 10px 0;color:#444;">
                    Hedef: <strong>resmi olmayan</strong> ya da <strong>resmi sunucuda fiziksel dosya olarak duran</strong> haberler.
                    Resmi zaten dış link olanlara dokunmaz.<br>
                    Sağlayıcı: <strong><?php echo ( get_option('ahb_google_cse_key') && get_option('ahb_google_cse_cx') ) ? 'Google' : 'Bing + DuckDuckGo'; ?></strong>.
                    Bulduğu görseli link olarak öne çıkana ekler (yerel dosya silinmez, sadece thumbnail değişir).
                    Bulamazsa habere dokunmaz.<br>
                    Her haber bir kez denenir; baştan denetlemek için "Sıfırla" butonunu kullan.
                </p>
                <button type="button" class="button button-primary" id="ahb-find-img">🖼️ Aramayı Başlat</button>
                <button type="button" class="button" id="ahb-find-img-reset" style="margin-left:6px;">↺ Tarama Geçmişini Sıfırla</button>
                <a href="<?php echo esc_url( admin_url( 'edit.php?post_type=post&meta_key=_ahb_image_from_search&meta_value=1&orderby=date&order=DESC' ) ); ?>"
                   target="_blank" class="button" style="margin-left:6px;">📋 Web'den Görsel Eklenenleri Göster</a>
                <span id="ahb-find-img-status" style="margin-left:10px;color:#555;font-size:13px;"></span>
                <div id="ahb-find-img-progress" style="display:none;margin-top:8px;background:#eee;border-radius:4px;height:18px;overflow:hidden;">
                    <div id="ahb-find-img-bar" style="background:#8e44ad;height:100%;width:0%;transition:width .3s;"></div>
                </div>
                <div id="ahb-find-img-log" style="display:none;margin-top:10px;max-height:280px;overflow-y:auto;border:1px solid #ddd;border-radius:4px;padding:8px 10px;background:#fafafa;font-size:12px;line-height:1.6;">
                    <strong>Bu oturumda değiştirilen haberler:</strong>
                    <ol id="ahb-find-img-log-list" style="margin:6px 0 0 22px;padding:0;"></ol>
                </div>
            </div>

            <script>
            (function(){
                var nonce = '<?php echo esc_js( wp_create_nonce("ahb_disk_bakim") ); ?>';
                var btn = document.getElementById('ahb-find-img');
                var st  = document.getElementById('ahb-find-img-status');
                var pg  = document.getElementById('ahb-find-img-progress');
                var bar = document.getElementById('ahb-find-img-bar');
                var totalProcessed=0, totalFound=0, totalSkipped=0, originalTotal=0;

                function step(offset){
                    var fd = new FormData();
                    fd.append('action','ahb_find_images_batch');
                    fd.append('nonce', nonce);
                    fd.append('offset', offset);
                    fetch(ajaxurl,{method:'POST',body:fd,credentials:'same-origin'})
                        .then(function(r){return r.json();})
                        .then(function(j){
                            if(!j || !j.success){
                                st.innerHTML = '<strong style="color:red">Hata: '+(j && j.data ? j.data : 'bilinmeyen')+'</strong>';
                                btn.disabled=false; return;
                            }
                            var d = j.data;
                            totalProcessed += d.processed;
                            totalFound     += d.found;
                            totalSkipped   += d.skipped;
                            // Değişen haberleri canlı listeye ekle
                            if (d.changed && d.changed.length) {
                                var logBox = document.getElementById('ahb-find-img-log');
                                var ol = document.getElementById('ahb-find-img-log-list');
                                logBox.style.display = 'block';
                                d.changed.forEach(function(it){
                                    var li = document.createElement('li');
                                    li.style.marginBottom = '3px';
                                    li.innerHTML = '<a href="'+it.view+'" target="_blank">#'+it.id+' — '+it.title+'</a> '+
                                        '<a href="'+it.edit+'" target="_blank" style="color:#888;font-size:11px;">[düzenle]</a> '+
                                        '<a href="'+it.img+'" target="_blank" style="color:#8e44ad;font-size:11px;">[görsel]</a>';
                                    ol.appendChild(li);
                                });
                            }
                            // İlk batch'te orijinal toplamı sabitle (sonraki batch'lerde "kalan" geliyor)
                            if (originalTotal === 0) originalTotal = d.total + d.processed;
                            var pct = originalTotal>0 ? Math.min(100, Math.round((totalProcessed/originalTotal)*100)) : 100;
                            bar.style.width = pct+'%';
                            st.innerHTML = '<strong>'+pct+'%</strong> — '+totalProcessed+'/'+originalTotal+
                                ' tarandı, <strong style="color:green">'+totalFound+' görsel bulundu</strong>, '+totalSkipped+' atlandı.';
                            if (d.done) {
                                st.innerHTML = '<strong style="color:green">✓ Tamamlandı.</strong> '+totalFound+' habere görsel eklendi, '+totalSkipped+' habere uygun görsel bulunamadı.';
                                btn.disabled=false;
                            } else {
                                // Arama motoru rate-limit'ine girmemek için 800ms bekle
                                setTimeout(function(){ step(d.next_offset); }, 800);
                            }
                        }).catch(function(e){
                            st.innerHTML = '<strong style="color:red">Hata: '+e.message+'</strong>';
                            btn.disabled=false;
                        });
                }

                btn.addEventListener('click', function(){
                    if(!confirm('Tüm eklenti haberleri için web\'de görsel araması başlatılacak. Bulduğu yenisiyle değiştirir, bulamazsa eski resim korunur. Devam edilsin mi?')) return;
                    btn.disabled = true; pg.style.display='block';
                    totalProcessed=0; totalFound=0; totalSkipped=0; originalTotal=0;
                    st.textContent = 'Başlatılıyor...';
                    step(0);
                });

                document.getElementById('ahb-find-img-reset').addEventListener('click', function(){
                    if(!confirm('Tüm haberlerin "tarandı" işareti silinecek. Bir sonraki çalıştırmada baştan tarayacak. Emin misin?')) return;
                    var fd = new FormData();
                    fd.append('action','ahb_find_images_batch');
                    fd.append('nonce', nonce);
                    fd.append('reset','1');
                    this.disabled = true;
                    fetch(ajaxurl,{method:'POST',body:fd,credentials:'same-origin'})
                        .then(function(r){return r.json();})
                        .then(function(j){
                            st.innerHTML = j.success ? '<strong style="color:green">✓ Sıfırlandı: '+j.data.cleared+' kayıt.</strong>' : '<strong style="color:red">Hata</strong>';
                            document.getElementById('ahb-find-img-reset').disabled = false;
                        });
                });
            })();
            </script>

            <div style="background:#fff;border:1px solid #d63638;border-left:4px solid #d63638;padding:12px 14px;margin:10px 0;border-radius:6px;">
                <strong>📅 Gelecek/Yanlış Tarihli Haberleri Düzelt</strong>
                <p style="margin:6px 0 10px 0;color:#444;">RSS feed'lerinden gelen bozuk pubDate yüzünden gelecek tarih (örn. "20 Temmuz 2026") almış haberlerin tarihini şimdiki ana çeker. Önce <strong>Tara</strong>, sonra <strong>Düzelt</strong>.</p>

                <button type="button" class="button button-secondary" id="ahb-fdate-scan">🔍 Tara</button>
                <button type="button" class="button button-primary" id="ahb-fdate-fix" style="display:none;margin-left:6px;">📅 Şimdiki Tarihe Çek</button>
                <span id="ahb-fdate-status" style="margin-left:10px;color:#555;font-size:13px;"></span>
            </div>

            <script>
            (function(){
                var nonce = '<?php echo esc_js( wp_create_nonce("ahb_disk_bakim") ); ?>';
                var sBtn = document.getElementById('ahb-fdate-scan');
                var fBtn = document.getElementById('ahb-fdate-fix');
                var st   = document.getElementById('ahb-fdate-status');
                function call(mode, cb){
                    var fd = new FormData();
                    fd.append('action','ahb_fix_future_dates');
                    fd.append('mode', mode);
                    // Sunucu saati bozuk olabilir — tarayıcının gerçek saatini referans gönder
                    fd.append('now_ts', Math.floor(Date.now()/1000));
                    fd.append('tz_offset_min', new Date().getTimezoneOffset());
                    fd.append('_ajax_nonce', nonce);
                    fetch(ajaxurl,{method:'POST',body:fd,credentials:'same-origin'})
                        .then(r=>r.json()).then(cb).catch(e=>{ st.textContent='Hata: '+e; });
                }
                sBtn.addEventListener('click', function(){
                    sBtn.disabled=true; st.textContent='Taranıyor...';
                    call('scan', function(res){
                        sBtn.disabled=false;
                        if(!res||!res.success){ st.textContent='Hata: '+(res&&res.data?res.data:'bilinmeyen'); return; }
                        var n = res.data.count|0;
                        st.textContent = n + ' adet gelecek tarihli haber bulundu. (Referans: '+(res.data.reference||'')+')';
                        if (n>0) fBtn.style.display='inline-block';
                    });
                });
                fBtn.addEventListener('click', function(){
                    if(!confirm('Bu haberlerin tarihini şimdiki ana çekmek istediğine emin misin?')) return;
                    fBtn.disabled=true; st.textContent='Düzeltiliyor...';
                    call('fix', function(res){
                        fBtn.disabled=false;
                        if(!res||!res.success){ st.textContent='Hata: '+(res&&res.data?res.data:'bilinmeyen'); return; }
                        st.textContent = res.data.updated + ' haber bugünün tarihine çekildi. ✅';
                        fBtn.style.display='none';
                    });
                });
            })();
            </script>

            <div style="background:#fff;border:1px solid #46b450;border-left:4px solid #46b450;padding:12px 14px;margin:10px 0;border-radius:6px;">
                <strong>🗄️ Veritabanı Bakımı</strong>
                <p style="margin:6px 0 10px 0;color:#444;">Veritabanındaki gereksiz kayıtları (revizyonlar, süresi dolmuş cache, çöp yorumlar, sahipsiz meta'lar, vb.) tarar ve temizler. Önce <strong>Tara</strong>, sonra <strong>Temizle</strong>.</p>

                <button type="button" class="button button-secondary" id="ahb-db-scan">🔍 Veritabanını Tara</button>
                <button type="button" class="button button-primary" id="ahb-db-clean" style="display:none;margin-left:6px;">🧹 Şimdi Temizle</button>
                <span id="ahb-db-status" style="margin-left:10px;color:#555;font-size:13px;"></span>

                <table id="ahb-db-report" style="display:none;margin-top:10px;width:100%;border-collapse:collapse;font-size:13px;">
                    <thead><tr style="background:#f6f7f7;text-align:left;">
                        <th style="padding:6px 10px;border:1px solid #e6e6e6;">Tür</th>
                        <th style="padding:6px 10px;border:1px solid #e6e6e6;">Bulunan</th>
                        <th style="padding:6px 10px;border:1px solid #e6e6e6;">Açıklama</th>
                    </tr></thead>
                    <tbody></tbody>
                </table>
            </div>

            <script>
            (function(){
                var nonce = '<?php echo esc_js( wp_create_nonce("ahb_disk_bakim") ); ?>';
                var sBtn = document.getElementById('ahb-db-scan');
                var cBtn = document.getElementById('ahb-db-clean');
                var st   = document.getElementById('ahb-db-status');
                var tbl  = document.getElementById('ahb-db-report');
                var tb   = tbl.querySelector('tbody');

                var LABELS = {
                    revisions:        ['Yazı Revizyonları', 'Düzenleme geçmişi yedekleri'],
                    autodrafts:       ['Otomatik Taslaklar', '7 günden eski auto-draft post\'lar'],
                    trashed_posts:    ['Çöp Kutusundaki Yazılar', '30 günden eski çöpteki post\'lar'],
                    spam_comments:    ['Spam Yorumlar', 'Spam olarak işaretli yorumlar'],
                    trash_comments:   ['Çöp Yorumlar', 'Çöp kutusundaki yorumlar'],
                    expired_trans:    ['Süresi Dolmuş Cache', 'Eski geçici (transient) kayıtlar'],
                    orphan_postmeta:  ['Sahipsiz Yazı Meta', 'Silinmiş post\'lara ait meta kayıtları'],
                    orphan_commentmeta:['Sahipsiz Yorum Meta', 'Silinmiş yorumlara ait meta kayıtları'],
                    orphan_term_rel:  ['Sahipsiz Etiket İlişkileri', 'Silinmiş post\'ların kategori/etiket bağları'],
                    orphan_user_meta: ['Sahipsiz Kullanıcı Meta', 'Silinmiş kullanıcılara ait meta kayıtları']
                };

                function fetchJson(action){
                    var fd = new FormData();
                    fd.append('action', action);
                    fd.append('nonce', nonce);
                    return fetch(ajaxurl,{method:'POST',body:fd,credentials:'same-origin'}).then(function(r){return r.json();});
                }

                function renderReport(d){
                    tb.innerHTML = '';
                    var total = 0;
                    Object.keys(LABELS).forEach(function(k){
                        var cnt = d[k] || 0; total += cnt;
                        var tr = document.createElement('tr');
                        tr.innerHTML = '<td style="padding:6px 10px;border:1px solid #e6e6e6;"><strong>'+LABELS[k][0]+'</strong></td>'+
                                       '<td style="padding:6px 10px;border:1px solid #e6e6e6;color:'+(cnt>0?'#d63638':'#666')+';"><strong>'+cnt.toLocaleString('tr-TR')+'</strong></td>'+
                                       '<td style="padding:6px 10px;border:1px solid #e6e6e6;color:#555;">'+LABELS[k][1]+'</td>';
                        tb.appendChild(tr);
                    });
                    tbl.style.display = 'table';
                    if (total > 0) {
                        cBtn.style.display = 'inline-block';
                        st.innerHTML = '<strong>Toplam '+total.toLocaleString('tr-TR')+' gereksiz kayıt</strong> bulundu. Temizlemek için Şimdi Temizle\'ye basın.';
                    } else {
                        cBtn.style.display = 'none';
                        st.innerHTML = '<strong style="color:green">✓ Veritabanı temiz, temizlenecek bir şey yok.</strong>';
                    }
                }

                sBtn.addEventListener('click', function(){
                    sBtn.disabled = true; st.textContent = 'Taranıyor...';
                    fetchJson('ahb_db_scan').then(function(j){
                        sBtn.disabled = false;
                        if (j && j.success) renderReport(j.data);
                        else st.innerHTML = '<strong style="color:red">Hata: '+(j && j.data ? j.data : 'bilinmeyen')+'</strong>';
                    }).catch(function(e){
                        sBtn.disabled = false;
                        st.innerHTML = '<strong style="color:red">Hata: '+e.message+'</strong>';
                    });
                });

                cBtn.addEventListener('click', function(){
                    if(!confirm('Veritabanı temizleniyor. Bu işlem GERİ ALINAMAZ. Devam edilsin mi?')) return;
                    cBtn.disabled = true; sBtn.disabled = true;
                    st.textContent = 'Temizleniyor, bekleyin...';
                    fetchJson('ahb_db_clean').then(function(j){
                        cBtn.disabled = false; sBtn.disabled = false;
                        if (j && j.success) {
                            var d = j.data;
                            var msg = '<strong style="color:green">✓ Temizlik tamamlandı.</strong> ';
                            msg += 'Silinen toplam: <strong>'+(d.total_deleted||0).toLocaleString('tr-TR')+'</strong> kayıt. ';
                            if (d.tables_optimized) msg += d.tables_optimized+' tablo optimize edildi.';
                            st.innerHTML = msg;
                            renderReport({}); // sıfırla
                            cBtn.style.display = 'none';
                        } else {
                            st.innerHTML = '<strong style="color:red">Hata: '+(j && j.data ? j.data : 'bilinmeyen')+'</strong>';
                        }
                    }).catch(function(e){
                        cBtn.disabled = false; sBtn.disabled = false;
                        st.innerHTML = '<strong style="color:red">Hata: '+e.message+'</strong>';
                    });
                });
            })();
            </script>

            <form method="get" style="background:#fff;padding:12px 14px;border:1px solid #e2e2e2;border-radius:8px;margin:14px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                <input type="hidden" name="page" value="ai-haber-botu-managed">
                <label><strong>Ara:</strong>
                    <input type="search" name="s" value="<?php echo esc_attr( $search ); ?>" placeholder="Başlık veya içerikte ara…" style="width:240px;">
                </label>
                <label><strong>Kaynak:</strong>
                    <select name="kaynak">
                        <option value=""           <?php selected( $kaynak, '' ); ?>>Tümü</option>
                        <option value="klasik"     <?php selected( $kaynak, 'klasik' ); ?>>🤖 Klasik AI Haber</option>
                        <option value="rssdirect"  <?php selected( $kaynak, 'rssdirect' ); ?>>🔗 RSS Direkt</option>
                        <option value="kose"       <?php selected( $kaynak, 'kose' ); ?>>✍️ Köşe Yazısı</option>
                    </select>
                </label>
                <label><strong>Durum:</strong>
                    <select name="durum">
                        <option value="any"     <?php selected( $valid_status, 'any' ); ?>>Tümü</option>
                        <option value="publish" <?php selected( $valid_status, 'publish' ); ?>>Yayında</option>
                        <option value="draft"   <?php selected( $valid_status, 'draft' ); ?>>Taslak</option>
                        <option value="pending" <?php selected( $valid_status, 'pending' ); ?>>Onay Bekliyor</option>
                        <option value="trash"   <?php selected( $valid_status, 'trash' ); ?>>Çöp Kutusu</option>
                    </select>
                </label>
                <button class="button button-primary">Filtrele</button>
                <a href="<?php echo esc_url( admin_url( 'admin.php?page=ai-haber-botu-managed' ) ); ?>" class="button">Sıfırla</a>
            </form>

            <div id="ahb-managed-msg"></div>

            <table class="widefat striped" id="ahb-managed-table">
                <thead>
                    <tr>
                        <th style="width:32px;"><input type="checkbox" id="ahb-mng-all"></th>
                        <th>Başlık</th>
                        <th style="width:90px;">Kaynak</th>
                        <th style="width:90px;">Tip</th>
                        <th style="width:90px;">Durum</th>
                        <th style="width:140px;">Tarih</th>
                        <th style="width:280px;">İşlem</th>
                    </tr>
                </thead>
                <tbody>
                <?php if ( ! $q->have_posts() ) : ?>
                    <tr><td colspan="7" style="text-align:center;color:#888;padding:30px;">Eklenen haber bulunamadı.</td></tr>
                <?php else : while ( $q->have_posts() ) : $q->the_post();
                    $pid = get_the_ID();
                    if ( get_post_meta( $pid, '_ahb_column_post', true ) ) {
                        $kt = '✍️ Köşe';
                    } elseif ( get_post_meta( $pid, '_ahb_kampanya_id', true ) || get_post_meta( $pid, '_ahb_kaynak_link', true ) ) {
                        $kt = '🔗 RSS Direkt';
                    } else {
                        $kt = '🤖 AI Haber';
                    }
                    $st_label = array(
                        'publish' => '✅ Yayında', 'draft' => '📝 Taslak',
                        'pending' => '⏳ Onayda', 'trash' => '🗑 Çöp',
                        'private' => '🔒 Özel', 'future' => '⏰ Zamanlı',
                    );
                    $cur_st = get_post_status( $pid );
                    ?>
                    <tr data-pid="<?php echo esc_attr( $pid ); ?>">
                        <td><input type="checkbox" class="ahb-mng-cb" value="<?php echo esc_attr( $pid ); ?>"></td>
                        <td>
                            <strong><a href="<?php echo esc_url( get_edit_post_link( $pid ) ); ?>" target="_blank"><?php the_title(); ?></a></strong>
                            <div style="font-size:11px;color:#888;margin-top:3px;"><?php echo esc_html( wp_trim_words( wp_strip_all_tags( get_the_excerpt() ?: get_the_content() ), 18 ) ); ?></div>
                        </td>
                        <td><?php echo esc_html( $kt ); ?></td>
                        <td><code style="font-size:11px;"><?php echo esc_html( get_post_type( $pid ) ); ?></code></td>
                        <td><?php echo esc_html( isset( $st_label[ $cur_st ] ) ? $st_label[ $cur_st ] : $cur_st ); ?></td>
                        <td><?php echo esc_html( get_the_date( 'd.m.Y H:i' ) ); ?></td>
                        <td>
                            <button type="button" class="button button-small ahb-mng-edit" style="background:#2271b1;color:#fff;border-color:#2271b1;">✏️ Düzenle</button>
                            <a href="<?php echo esc_url( get_permalink( $pid ) ); ?>" target="_blank" class="button button-small">👁 Gör</a>
                            <?php if ( $cur_st === 'trash' ) : ?>
                                <button type="button" class="button button-small ahb-mng-del" data-mode="hard" style="background:#d63638;color:#fff;border-color:#d63638;">🗑 Tamamen Sil</button>
                            <?php else : ?>
                                <button type="button" class="button button-small ahb-mng-del" data-mode="trash" style="color:#d63638;">🗑 Çöpe At</button>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endwhile; wp_reset_postdata(); endif; ?>
                </tbody>
            </table>

            <?php
            $max_pages = max( 1, (int) ceil( $toplam_yonetilen / $per ) );
            if ( $max_pages > 1 ) : ?>
                <div class="tablenav" style="margin-top:14px;">
                    <div class="tablenav-pages">
                        <?php
                        $base = remove_query_arg( 'paged' );
                        echo paginate_links( array(
                            'base'      => add_query_arg( 'paged', '%#%', $base ),
                            'format'    => '',
                            'current'   => $paged,
                            'total'     => $max_pages,
                            'prev_text' => '« Önceki',
                            'next_text' => 'Sonraki »',
                        ) );
                        ?>
                    </div>
                </div>
            <?php endif; ?>

            <div style="margin-top:14px;background:#fff8e1;border-left:4px solid #f0b400;padding:10px 14px;">
                <strong>Toplu işlem:</strong>
                <button type="button" class="button button-primary" id="ahb-mng-bulk-publish" style="background:#46b450;border-color:#46b450;">📢 Seçilenleri Yayınla</button>
                <button type="button" class="button" id="ahb-mng-bulk-draft">📝 Seçilenleri Taslağa Al</button>
                <span style="display:inline-block;width:14px;"></span>
                <button type="button" class="button" id="ahb-mng-bulk-trash">🗑 Seçilenleri Çöpe At</button>
                <button type="button" class="button" id="ahb-mng-bulk-hard" style="color:#d63638;">⚠ Seçilenleri Tamamen Sil</button>
            </div>
        </div>

        <!-- Düzenleme modal -->
        <div id="ahb-mng-modal" style="display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);">
            <div style="background:#fff;max-width:900px;width:92%;margin:40px auto;border-radius:10px;max-height:88vh;overflow:auto;">
                <div style="padding:16px 22px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;">
                    <h2 style="margin:0;">✏️ Haberi Düzenle</h2>
                    <button type="button" class="button" id="ahb-mng-modal-close">✕ Kapat</button>
                </div>
                <div style="padding:18px 22px;">
                    <input type="hidden" id="mng_pid">
                    <p><label><strong>Başlık</strong></label><br>
                        <input type="text" id="mng_title" style="width:100%;font-size:16px;padding:8px;">
                    </p>
                    <p><label><strong>İçerik</strong></label><br>
                        <textarea id="mng_content" style="width:100%;min-height:340px;font-family:Consolas,monospace;font-size:13px;padding:10px;"></textarea>
                        <small style="color:#666;">HTML kullanabilirsiniz. Boş bırakmayın.</small>
                    </p>
                    <p><label><strong>Özet</strong></label><br>
                        <textarea id="mng_excerpt" style="width:100%;min-height:80px;padding:8px;"></textarea>
                    </p>
                    <p><label><strong>Durum</strong></label>
                        <select id="mng_status" style="margin-left:8px;">
                            <option value="publish">Yayında</option>
                            <option value="draft">Taslak</option>
                            <option value="pending">Onay Bekliyor</option>
                            <option value="private">Özel</option>
                        </select>
                    </p>
                    <p style="border-top:1px solid #eee;padding-top:14px;text-align:right;">
                        <button type="button" class="button" id="mng_btn_cancel">Vazgeç</button>
                        <button type="button" class="button button-primary button-hero" id="mng_btn_save">💾 Değişiklikleri Kaydet</button>
                    </p>
                </div>
            </div>
        </div>

        <script>
        (function(){
            var nonce='<?php echo esc_js( $nonce ); ?>';
            var ajaxurl='<?php echo esc_js( admin_url( 'admin-ajax.php' ) ); ?>';
            function $(id){return document.getElementById(id);}
            function msg(html, ok){
                $('ahb-managed-msg').innerHTML='<div class="notice notice-'+(ok?'success':'error')+' is-dismissible" style="margin:12px 0;"><p>'+html+'</p></div>';
                window.scrollTo({top:0,behavior:'smooth'});
            }

            // Tümünü seç
            $('ahb-mng-all').addEventListener('change', function(){
                document.querySelectorAll('.ahb-mng-cb').forEach(function(c){c.checked=this.checked;}.bind(this));
            });

            // Modal aç
            document.querySelectorAll('.ahb-mng-edit').forEach(function(b){
                b.addEventListener('click', function(){
                    var pid=b.closest('tr').dataset.pid;
                    b.disabled=true; b.textContent='Yükleniyor…';
                    var fd=new FormData();
                    fd.append('action','ahb_managed_get');
                    fd.append('_wpnonce',nonce);
                    fd.append('pid',pid);
                    fetch(ajaxurl,{method:'POST',credentials:'same-origin',body:fd}).then(r=>r.json()).then(j=>{
                        b.disabled=false; b.textContent='✏️ Düzenle';
                        if(!j.success){msg('Hata: '+(j.data||'bilinmeyen'),false);return;}
                        $('mng_pid').value=j.data.id;
                        $('mng_title').value=j.data.title;
                        $('mng_content').value=j.data.content;
                        $('mng_excerpt').value=j.data.excerpt;
                        $('mng_status').value=j.data.status;
                        $('ahb-mng-modal').style.display='block';
                    }).catch(e=>{b.disabled=false;b.textContent='✏️ Düzenle';msg('Ağ hatası: '+e,false);});
                });
            });
            $('ahb-mng-modal-close').addEventListener('click',function(){$('ahb-mng-modal').style.display='none';});
            $('mng_btn_cancel').addEventListener('click',function(){$('ahb-mng-modal').style.display='none';});

            // Kaydet
            $('mng_btn_save').addEventListener('click', function(){
                var btn=$('mng_btn_save'); btn.disabled=true; var orig=btn.textContent; btn.textContent='Kaydediliyor…';
                var fd=new FormData();
                fd.append('action','ahb_managed_save');
                fd.append('_wpnonce',nonce);
                fd.append('pid',$('mng_pid').value);
                fd.append('title',$('mng_title').value);
                fd.append('content',$('mng_content').value);
                fd.append('excerpt',$('mng_excerpt').value);
                fd.append('status',$('mng_status').value);
                fetch(ajaxurl,{method:'POST',credentials:'same-origin',body:fd}).then(r=>r.json()).then(j=>{
                    btn.disabled=false; btn.textContent=orig;
                    if(!j.success){msg('Kayıt hatası: '+(j.data||''),false);return;}
                    $('ahb-mng-modal').style.display='none';
                    msg('✅ Başarıyla güncellendi.',true);
                    setTimeout(function(){location.reload();},900);
                });
            });

            // Tek silme
            document.querySelectorAll('.ahb-mng-del').forEach(function(b){
                b.addEventListener('click', function(){
                    var mode=b.dataset.mode;
                    var q = mode==='hard' ? 'Bu haberi KALICI olarak silmek istediğinize emin misiniz? Geri alınamaz!' : 'Bu haberi çöpe atmak istediğinize emin misiniz?';
                    if(!confirm(q))return;
                    var pid=b.closest('tr').dataset.pid;
                    delPosts([pid], mode);
                });
            });

            // Toplu işlemler — buton var mı kontrol et (sayfada hiç haber yoksa olmayabilir)
            var btnTrash   = $('ahb-mng-bulk-trash');
            var btnHard    = $('ahb-mng-bulk-hard');
            var btnPublish = $('ahb-mng-bulk-publish');
            var btnDraft   = $('ahb-mng-bulk-draft');
            if (btnTrash)   btnTrash.addEventListener('click',   function(){ bulkDel('trash'); });
            if (btnHard)    btnHard.addEventListener('click',    function(){ bulkDel('hard');  });
            if (btnPublish) btnPublish.addEventListener('click', function(){ bulkStatus('publish'); });
            if (btnDraft)   btnDraft.addEventListener('click',   function(){ bulkStatus('draft');   });

            function lockButtons(lock){
                [btnTrash, btnHard, btnPublish, btnDraft].forEach(function(b){ if(b) b.disabled = !!lock; });
            }

            function bulkStatus(newStatus){
                var ids = getSelected();
                if(!ids.length){ alert('Önce en az bir haber seçin (satır başındaki kutucuğu işaretle).'); return; }
                var label = (newStatus === 'publish') ? 'YAYINLAMAK' : 'TASLAĞA almak';
                if (!confirm(ids.length + ' haberi ' + label + ' istediğinize emin misiniz?')) return;

                lockButtons(true);
                var BATCH = 20, chunks = [];
                for (var i=0; i<ids.length; i+=BATCH) chunks.push(ids.slice(i, i+BATCH));

                var toplam = ids.length, basarili = 0, hata = 0, idx = 0;
                msg('⏳ ' + toplam + ' haber işleniyor...', true);

                function next(){
                    if (idx >= chunks.length){
                        lockButtons(false);
                        var word = (newStatus === 'publish') ? 'yayınlandı' : 'taslağa alındı';
                        var sonuc = '✅ ' + basarili + ' / ' + toplam + ' haber ' + word + '.';
                        if (hata) sonuc += ' (' + hata + ' hata)';
                        msg(sonuc, true);
                        setTimeout(function(){ location.reload(); }, 1000);
                        return;
                    }
                    var part = chunks[idx++];
                    msg('⏳ İşleniyor: ' + Math.min(idx*BATCH, toplam) + ' / ' + toplam + ' ...', true);
                    setStatusPosts(part, newStatus, function(ok, n){
                        if (ok) basarili += n; else hata++;
                        next();
                    });
                }
                next();
            }

            function setStatusPosts(ids, newStatus, cb){
                var fd = new FormData();
                fd.append('action', 'ahb_managed_status');
                fd.append('_wpnonce', nonce);
                fd.append('new_status', newStatus);
                ids.forEach(function(id){ fd.append('ids[]', id); });
                fetch(ajaxurl, {method:'POST', credentials:'same-origin', body:fd})
                    .then(function(r){ return r.text(); })
                    .then(function(t){
                        var j = null; try { j = JSON.parse(t); } catch(e){}
                        if (j && j.success) cb(true, (j.data && j.data.guncellenen) || 0);
                        else cb(false, 0);
                    })
                    .catch(function(){ cb(false, 0); });
            }

            function getSelected(){
                var arr=[];
                document.querySelectorAll('.ahb-mng-cb:checked').forEach(function(c){
                    var v = parseInt(c.value, 10);
                    if (v > 0) arr.push(v);
                });
                return arr;
            }
            function bulkDel(mode){
                var ids = getSelected();
                if(!ids.length){ alert('Önce en az bir haber seçin (satır başındaki kutucuğu işaretle).'); return; }
                var q = mode==='hard'
                    ? ids.length+' haberi KALICI olarak silmek istediğinize emin misiniz? Geri alınamaz!'
                    : ids.length+' haberi çöpe atmak istiyor musunuz?';
                if(!confirm(q)) return;

                // Butonları kilitle
                if (btnTrash) btnTrash.disabled = true;
                if (btnHard)  btnHard.disabled  = true;

                // 20'şerli gruplara böl (büyük seçimlerde sunucu timeout'unu önler)
                var BATCH = 20;
                var chunks = [];
                for (var i=0; i<ids.length; i+=BATCH) chunks.push(ids.slice(i, i+BATCH));

                var toplam = ids.length, silinen = 0, hata = 0, idx = 0;
                msg('⏳ '+toplam+' haber işleniyor (parça parça siliniyor)...', true);

                function next(){
                    if (idx >= chunks.length){
                        if (btnTrash) btnTrash.disabled = false;
                        if (btnHard)  btnHard.disabled  = false;
                        var sonuc = '✅ '+silinen+' / '+toplam+' haber '+(mode==='hard'?'kalıcı silindi':'çöpe atıldı')+'.';
                        if (hata) sonuc += ' ('+hata+' hata)';
                        msg(sonuc, true);
                        setTimeout(function(){ location.reload(); }, 1000);
                        return;
                    }
                    var part = chunks[idx++];
                    msg('⏳ İşleniyor: '+Math.min(idx*BATCH, toplam)+' / '+toplam+' ...', true);
                    delPosts(part, mode, function(ok, n){
                        if (ok) silinen += n; else hata++;
                        next();
                    });
                }
                next();
            }
            function delPosts(ids, mode, cb){
                var fd = new FormData();
                fd.append('action','ahb_managed_delete');
                fd.append('_wpnonce', nonce);
                fd.append('mode', mode);
                ids.forEach(function(id){ fd.append('ids[]', id); });
                fetch(ajaxurl, {method:'POST', credentials:'same-origin', body:fd})
                    .then(function(r){ return r.text(); })
                    .then(function(t){
                        var j = null;
                        try { j = JSON.parse(t); } catch(e){}
                        if (j && j.success){
                            if (cb) cb(true, (j.data && j.data.silinen) || 0);
                            else { msg('✅ '+((j.data && j.data.silinen)||0)+' haber işlendi.', true); setTimeout(function(){location.reload();},800); }
                        } else {
                            var err = (j && j.data) ? j.data : (t.length<200?t:'Sunucu cevabı geçersiz');
                            if (cb) cb(false, 0);
                            else msg('Silme hatası: '+err, false);
                        }
                    })
                    .catch(function(e){
                        if (cb) cb(false, 0);
                        else msg('Ağ hatası: '+e.message, false);
                    });
            }
        })();
        </script>
        <?php
    }

    public function ajax_managed_get() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_managed' );
        $pid = isset( $_POST['pid'] ) ? (int) $_POST['pid'] : 0;
        $p   = get_post( $pid );
        if ( ! $p ) wp_send_json_error( 'haber bulunamadı' );
        // Sadece eklentiye ait postlar düzenlenebilsin
        if ( ! $this->is_managed_post( $pid ) ) wp_send_json_error( 'bu haber eklentiye ait değil' );
        wp_send_json_success( array(
            'id'      => $p->ID,
            'title'   => $p->post_title,
            'content' => $p->post_content,
            'excerpt' => $p->post_excerpt,
            'status'  => $p->post_status,
        ) );
    }

    public function ajax_managed_save() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_managed' );
        $pid = isset( $_POST['pid'] ) ? (int) $_POST['pid'] : 0;
        if ( ! $pid || ! get_post( $pid ) ) wp_send_json_error( 'haber yok' );
        if ( ! $this->is_managed_post( $pid ) ) wp_send_json_error( 'bu haber eklentiye ait değil' );

        $title   = isset( $_POST['title'] ) ? wp_strip_all_tags( wp_unslash( $_POST['title'] ) ) : '';
        $content = isset( $_POST['content'] ) ? wp_kses_post( wp_unslash( $_POST['content'] ) ) : '';
        $excerpt = isset( $_POST['excerpt'] ) ? sanitize_textarea_field( wp_unslash( $_POST['excerpt'] ) ) : '';
        $status  = isset( $_POST['status'] ) ? sanitize_key( $_POST['status'] ) : 'publish';
        if ( ! in_array( $status, array( 'publish','draft','pending','private' ), true ) ) $status = 'draft';
        if ( $title === '' ) wp_send_json_error( 'başlık boş olamaz' );

        $res = wp_update_post( array(
            'ID'           => $pid,
            'post_title'   => $title,
            'post_content' => $content,
            'post_excerpt' => $excerpt,
            'post_status'  => $status,
        ), true );
        if ( is_wp_error( $res ) ) wp_send_json_error( $res->get_error_message() );

        update_post_meta( $pid, '_ahb_manuel_duzenlendi', current_time( 'mysql' ) );
        wp_send_json_success( array( 'pid' => $pid ) );
    }

    public function ajax_managed_status() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_managed' );
        @set_time_limit( 0 );

        $ids = isset( $_POST['ids'] ) ? array_map( 'intval', (array) $_POST['ids'] ) : array();
        $new = isset( $_POST['new_status'] ) ? sanitize_key( $_POST['new_status'] ) : '';
        if ( ! in_array( $new, array( 'publish', 'draft', 'pending', 'private' ), true ) ) {
            wp_send_json_error( 'geçersiz durum' );
        }

        $guncellenen = 0;
        $atlanan     = 0;
        foreach ( $ids as $pid ) {
            if ( ! $pid ) continue;
            if ( ! $this->is_managed_post( $pid ) ) { $atlanan++; continue; }
            $cur = get_post_status( $pid );
            if ( $cur === $new ) { $guncellenen++; continue; } // zaten o durumda
            $res = wp_update_post( array(
                'ID'          => $pid,
                'post_status' => $new,
            ), true );
            if ( ! is_wp_error( $res ) && $res ) {
                $guncellenen++;
                update_post_meta( $pid, '_ahb_durum_guncellendi', current_time( 'mysql' ) );
            }
        }
        wp_send_json_success( array(
            'guncellenen' => $guncellenen,
            'atlanan'     => $atlanan,
            'gelen'       => count( $ids ),
            'durum'       => $new,
        ) );
    }

    /* ============================================================
     *  DİSK BAKIMI: Eski resimleri linke çevir
     *  Eklentinin eklediği post'ların thumbnail'larını gezer:
     *  - Bilinen bir dış URL kaynağı (post meta _ahb_source_image_url
     *    veya attachment meta _ahb_kaynak_url) varsa attachment'a
     *    _ahb_external_url meta'sı yazar ve yerel dosyayı siler.
     *  - Thumbnail ID'si değişmez, post-attachment ilişkisi korunur.
     *  - Filtreler (register_external_image_filters) sayesinde theme'ler
     *    bundan sonra dış URL'yi otomatik gösterir.
     * ============================================================ */
    public function ajax_convert_to_link_batch() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_disk_bakim', 'nonce' );
        @set_time_limit( 0 );
        @ini_set( 'memory_limit', '512M' );

        global $wpdb;
        $batch  = 25;
        $offset = isset( $_POST['offset'] ) ? max( 0, (int) $_POST['offset'] ) : 0;

        // Sadece eklentinin eklediği post'lar
        $keys = array( '_ahb_source_url', '_ahb_kampanya_id', '_ahb_kaynak_link' );
        $key_in = "'" . implode( "','", array_map( 'esc_sql', $keys ) ) . "'";

        $total = (int) $wpdb->get_var(
            "SELECT COUNT(DISTINCT pm.post_id)
             FROM {$wpdb->postmeta} pm
             INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE pm.meta_key IN ($key_in)
             AND p.post_status IN ('publish','draft','pending','private','future')"
        );

        $ids = $wpdb->get_col( $wpdb->prepare(
            "SELECT DISTINCT pm.post_id
             FROM {$wpdb->postmeta} pm
             INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE pm.meta_key IN ($key_in)
             AND p.post_status IN ('publish','draft','pending','private','future')
             ORDER BY pm.post_id ASC
             LIMIT %d OFFSET %d",
            $batch, $offset
        ) );

        $processed = count( $ids );
        $converted = 0;
        $failed    = 0;
        $freed     = 0;

        foreach ( $ids as $pid ) {
            $thumb_id = (int) get_post_thumbnail_id( $pid );
            if ( ! $thumb_id ) { $failed++; continue; }

            // Zaten link modunda mı?
            if ( get_post_meta( $thumb_id, '_ahb_external_url', true ) ) { $failed++; continue; }

            // Dış URL'yi tespit et — sırayla:
            // 1) Yeni botu post meta
            // 2) RSS-direct attachment meta (_ahb_kaynak_url)
            // 3) Attachment guid (eğer http ise ve site URL'si DEĞİLSE)
            $external = get_post_meta( $pid, '_ahb_source_image_url', true );
            if ( ! $external ) {
                $external = get_post_meta( $thumb_id, '_ahb_kaynak_url', true );
            }
            if ( ! $external ) {
                $guid = get_post_field( 'guid', $thumb_id );
                $site = home_url();
                if ( $guid && preg_match( '#^https?://#i', $guid ) && stripos( $guid, $site ) !== 0 ) {
                    $external = $guid;
                }
            }

            if ( ! $external ) { $failed++; continue; }

            // Yerel dosya boyutunu hesapla ve sil
            $file_path = get_attached_file( $thumb_id, true );
            $size_bytes = 0;
            if ( $file_path && file_exists( $file_path ) ) {
                $size_bytes = (int) filesize( $file_path );

                // Ana dosyayı sil
                @unlink( $file_path );

                // Tüm boyut varyantlarını da sil
                $meta = wp_get_attachment_metadata( $thumb_id );
                if ( ! empty( $meta['sizes'] ) && is_array( $meta['sizes'] ) ) {
                    $dir = trailingslashit( dirname( $file_path ) );
                    foreach ( $meta['sizes'] as $sz ) {
                        if ( ! empty( $sz['file'] ) && file_exists( $dir . $sz['file'] ) ) {
                            $size_bytes += (int) filesize( $dir . $sz['file'] );
                            @unlink( $dir . $sz['file'] );
                        }
                    }
                }
                // Backup orijinal (rotate vs.)
                if ( ! empty( $meta['original_image'] ) && file_exists( $dir . $meta['original_image'] ) ) {
                    $size_bytes += (int) filesize( $dir . $meta['original_image'] );
                    @unlink( $dir . $meta['original_image'] );
                }
            }

            // Attachment'ı dış URL moduna çevir
            update_post_meta( $thumb_id, '_ahb_external_url', esc_url_raw( $external ) );
            update_post_meta( $thumb_id, '_wp_attached_file', esc_url_raw( $external ) );
            update_post_meta( $thumb_id, '_wp_attachment_metadata', array(
                'width'  => 1200,
                'height' => 630,
                'file'   => esc_url_raw( $external ),
                'sizes'  => array(),
            ) );
            // GUID'i de güncelle (varsa)
            $wpdb->update( $wpdb->posts, array( 'guid' => esc_url_raw( $external ) ), array( 'ID' => $thumb_id ) );

            update_post_meta( $pid, '_ahb_image_mode', 'link_converted' );

            $converted++;
            $freed += $size_bytes;
        }

        $next_offset = $offset + $batch;
        $scanned_total = min( $total, $offset + $processed );
        $done = ( $processed === 0 || $scanned_total >= $total );

        wp_send_json_success( array(
            'processed'     => $processed,
            'converted'     => $converted,
            'failed'        => $failed,
            'freed_bytes'   => $freed,
            'total'         => $total,
            'scanned_total' => $scanned_total,
            'next_offset'   => $next_offset,
            'done'          => $done,
        ) );
    }

    /* ============================================================
     *  DİSK BAKIMI: Kategoriye göre toplu sil
     *  Sadece eklentinin eklediği post'ları siler. Öne çıkan görseli
     *  de (yerel dosya varsa) wp_delete_attachment ile temizler.
     * ============================================================ */
    public function ajax_delete_by_category_batch() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_disk_bakim', 'nonce' );
        @set_time_limit( 0 );
        @ini_set( 'memory_limit', '512M' );

        $cat_id = isset( $_POST['cat_id'] ) ? (int) $_POST['cat_id'] : 0;
        if ( ! $cat_id || ! get_term( $cat_id, 'category' ) ) {
            wp_send_json_error( 'geçersiz kategori' );
        }

        $batch = 20;

        // Sadece eklentinin eklediği post'lar
        $q = new WP_Query( array(
            'post_type'      => 'post',
            'post_status'    => array( 'publish','draft','pending','private','future','trash' ),
            'cat'            => $cat_id,
            'posts_per_page' => $batch,
            'fields'         => 'ids',
            'no_found_rows'  => false,
            'meta_query'     => $this->managed_meta_query(),
        ) );

        $deleted = 0;
        foreach ( $q->posts as $pid ) {
            // Öne çıkan görseli (yerel) sil
            $thumb_id = (int) get_post_thumbnail_id( $pid );
            if ( $thumb_id ) {
                wp_delete_attachment( $thumb_id, true );
            }
            $r = wp_delete_post( $pid, true );
            if ( $r ) $deleted++;
        }

        // Kalan sayıyı yeniden say
        $remaining_q = new WP_Query( array(
            'post_type'      => 'post',
            'post_status'    => array( 'publish','draft','pending','private','future','trash' ),
            'cat'            => $cat_id,
            'posts_per_page' => 1,
            'fields'         => 'ids',
            'meta_query'     => $this->managed_meta_query(),
        ) );
        $remaining = (int) $remaining_q->found_posts;

        wp_send_json_success( array(
            'deleted'   => $deleted,
            'remaining' => $remaining,
            'done'      => ( $deleted === 0 || $remaining === 0 ),
        ) );
    }

    /* ============================================================
     *  VERİTABANI BAKIMI: Tara
     *  Şişme yapan tablolardaki gereksiz kayıtları sayar.
     *  Hiçbir şey silmez — sadece okur.
     * ============================================================ */
    public function ajax_db_scan() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_disk_bakim', 'nonce' );
        @set_time_limit( 0 );

        global $wpdb;
        $now = time();

        $r = array();
        // 1) Revisions
        $r['revisions'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'revision'"
        );
        // 2) Auto-drafts (>7 gün)
        $r['autodrafts'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->posts}
             WHERE post_status = 'auto-draft'
             AND post_modified < DATE_SUB(NOW(), INTERVAL 7 DAY)"
        );
        // 3) Çöpteki post'lar (>30 gün)
        $r['trashed_posts'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->posts}
             WHERE post_status = 'trash'
             AND post_modified < DATE_SUB(NOW(), INTERVAL 30 DAY)"
        );
        // 4) Spam yorumlar
        $r['spam_comments'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->comments} WHERE comment_approved = 'spam'"
        );
        // 5) Çöp yorumlar
        $r['trash_comments'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->comments} WHERE comment_approved = 'trash' OR comment_approved = 'post-trashed'"
        );
        // 6) Süresi dolmuş transient'ler (option key: _transient_timeout_*)
        $r['expired_trans'] = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->options}
             WHERE option_name LIKE %s
             AND CAST(option_value AS UNSIGNED) < %d",
            $wpdb->esc_like( '_transient_timeout_' ) . '%', $now
        ) );
        // 7) Sahipsiz postmeta
        $r['orphan_postmeta'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->postmeta} pm
             LEFT JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE p.ID IS NULL"
        );
        // 8) Sahipsiz commentmeta
        $r['orphan_commentmeta'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->commentmeta} cm
             LEFT JOIN {$wpdb->comments} c ON c.comment_ID = cm.comment_id
             WHERE c.comment_ID IS NULL"
        );
        // 9) Sahipsiz term_relationships
        $r['orphan_term_rel'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->term_relationships} tr
             LEFT JOIN {$wpdb->posts} p ON p.ID = tr.object_id
             WHERE p.ID IS NULL"
        );
        // 10) Sahipsiz usermeta
        $r['orphan_user_meta'] = (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->usermeta} um
             LEFT JOIN {$wpdb->users} u ON u.ID = um.user_id
             WHERE u.ID IS NULL"
        );

        wp_send_json_success( $r );
    }

    /* ============================================================
     *  VERİTABANI BAKIMI: Temizle
     *  Yukarıda taranan tüm kategorileri tek seferde temizler.
     *  Sonunda etkilenen tabloları OPTIMIZE eder.
     * ============================================================ */
    public function ajax_db_clean() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_disk_bakim', 'nonce' );
        @set_time_limit( 0 );
        @ini_set( 'memory_limit', '512M' );

        global $wpdb;
        $now = time();
        $total = 0;

        // 1) Revisions — wp_delete_post_revision kullanarak (cache temizliği için)
        $rev_ids = $wpdb->get_col( "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'revision' LIMIT 5000" );
        foreach ( $rev_ids as $rid ) { wp_delete_post_revision( (int) $rid ); }
        $total += count( $rev_ids );

        // 2) Auto-drafts >7 gün
        $ad_ids = $wpdb->get_col(
            "SELECT ID FROM {$wpdb->posts}
             WHERE post_status = 'auto-draft'
             AND post_modified < DATE_SUB(NOW(), INTERVAL 7 DAY)
             LIMIT 5000"
        );
        foreach ( $ad_ids as $pid ) { wp_delete_post( (int) $pid, true ); }
        $total += count( $ad_ids );

        // 3) Çöp post'lar >30 gün
        $tp_ids = $wpdb->get_col(
            "SELECT ID FROM {$wpdb->posts}
             WHERE post_status = 'trash'
             AND post_modified < DATE_SUB(NOW(), INTERVAL 30 DAY)
             LIMIT 5000"
        );
        foreach ( $tp_ids as $pid ) { wp_delete_post( (int) $pid, true ); }
        $total += count( $tp_ids );

        // 4) Spam yorumlar
        $spam_ids = $wpdb->get_col( "SELECT comment_ID FROM {$wpdb->comments} WHERE comment_approved = 'spam' LIMIT 10000" );
        foreach ( $spam_ids as $cid ) { wp_delete_comment( (int) $cid, true ); }
        $total += count( $spam_ids );

        // 5) Çöp yorumlar
        $tc_ids = $wpdb->get_col( "SELECT comment_ID FROM {$wpdb->comments} WHERE comment_approved = 'trash' OR comment_approved = 'post-trashed' LIMIT 10000" );
        foreach ( $tc_ids as $cid ) { wp_delete_comment( (int) $cid, true ); }
        $total += count( $tc_ids );

        // 6) Süresi dolmuş transient'ler — hem timeout hem değer
        $expired_keys = $wpdb->get_col( $wpdb->prepare(
            "SELECT option_name FROM {$wpdb->options}
             WHERE option_name LIKE %s
             AND CAST(option_value AS UNSIGNED) < %d",
            $wpdb->esc_like( '_transient_timeout_' ) . '%', $now
        ) );
        $exp_n = 0;
        foreach ( $expired_keys as $k ) {
            $name = substr( $k, strlen( '_transient_timeout_' ) );
            delete_transient( $name );
            $exp_n++;
        }
        // site transient'ler
        $expired_site = $wpdb->get_col( $wpdb->prepare(
            "SELECT option_name FROM {$wpdb->options}
             WHERE option_name LIKE %s
             AND CAST(option_value AS UNSIGNED) < %d",
            $wpdb->esc_like( '_site_transient_timeout_' ) . '%', $now
        ) );
        foreach ( $expired_site as $k ) {
            $name = substr( $k, strlen( '_site_transient_timeout_' ) );
            delete_site_transient( $name );
            $exp_n++;
        }
        $total += $exp_n;

        // 7) Sahipsiz postmeta
        $orf_pm = (int) $wpdb->query(
            "DELETE pm FROM {$wpdb->postmeta} pm
             LEFT JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE p.ID IS NULL"
        );
        $total += $orf_pm;

        // 8) Sahipsiz commentmeta
        $orf_cm = (int) $wpdb->query(
            "DELETE cm FROM {$wpdb->commentmeta} cm
             LEFT JOIN {$wpdb->comments} c ON c.comment_ID = cm.comment_id
             WHERE c.comment_ID IS NULL"
        );
        $total += $orf_cm;

        // 9) Sahipsiz term_relationships
        $orf_tr = (int) $wpdb->query(
            "DELETE tr FROM {$wpdb->term_relationships} tr
             LEFT JOIN {$wpdb->posts} p ON p.ID = tr.object_id
             WHERE p.ID IS NULL"
        );
        $total += $orf_tr;

        // 10) Sahipsiz usermeta
        $orf_um = (int) $wpdb->query(
            "DELETE um FROM {$wpdb->usermeta} um
             LEFT JOIN {$wpdb->users} u ON u.ID = um.user_id
             WHERE u.ID IS NULL"
        );
        $total += $orf_um;

        // OPTIMIZE TABLE — fragmentasyonu giderir, gerçek disk yerini geri verir
        $tables = array(
            $wpdb->posts, $wpdb->postmeta, $wpdb->options,
            $wpdb->comments, $wpdb->commentmeta,
            $wpdb->term_relationships, $wpdb->usermeta,
        );
        $opt_n = 0;
        foreach ( $tables as $t ) {
            $res = $wpdb->query( "OPTIMIZE TABLE `$t`" );
            if ( $res !== false ) $opt_n++;
        }

        wp_send_json_success( array(
            'total_deleted'    => $total,
            'tables_optimized' => $opt_n,
        ) );
    }

    /* ============================================================
     *  EKSİK RESİMLERİ WEB'DEN BUL
     *  Eklentinin eklediği, öne çıkan görseli olmayan post'ları gezer.
     *  Başlık + entity'ler ile arama motorundan görsel bulur,
     *  link olarak öne çıkan görsel yapar.
     * ============================================================ */
    public function ajax_find_images_batch() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_disk_bakim', 'nonce' );
        @set_time_limit( 0 );
        @ini_set( 'memory_limit', '512M' );

        global $wpdb;

        // Reset modu — tarama geçmişini temizle
        if ( ! empty( $_POST['reset'] ) ) {
            $cleared = $wpdb->query( "DELETE FROM {$wpdb->postmeta} WHERE meta_key = '_ahb_image_search_done'" );
            wp_send_json_success( array( 'cleared' => (int) $cleared ) );
        }
        $batch  = 5; // Arama motoru rate-limit'i için küçük batch
        $offset = isset( $_POST['offset'] ) ? max( 0, (int) $_POST['offset'] ) : 0;

        if ( ! class_exists( 'AHB_Image_Search' ) ) {
            wp_send_json_error( 'Görsel arama sınıfı yüklenmemiş' );
        }

        // Eklentinin eklediği TÜM haberler — daha önce taranmamış olanlar
        // (resmi olan haberlerde de yeni bulunursa değiştirir, bulamazsa eski kalır)
        $keys = array( '_ahb_source_url', '_ahb_kampanya_id', '_ahb_kaynak_link' );
        $key_in = "'" . implode( "','", array_map( 'esc_sql', $keys ) ) . "'";

        // Hedef: thumbnail'i OLMAYAN  VEYA  thumbnail'i YEREL DOSYA olan haberler
        // (dış link olan thumbnail'lere — _ahb_external_url meta'sı taşıyan attachment'lara — dokunma)
        // Daha önce taranmış olanları (done) hariç tut.
        $total = (int) $wpdb->get_var(
            "SELECT COUNT(DISTINCT pm.post_id)
             FROM {$wpdb->postmeta} pm
             INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             LEFT JOIN {$wpdb->postmeta} thm  ON thm.post_id  = pm.post_id AND thm.meta_key  = '_thumbnail_id'
             LEFT JOIN {$wpdb->postmeta} ext  ON ext.post_id  = thm.meta_value AND ext.meta_key = '_ahb_external_url'
             LEFT JOIN {$wpdb->postmeta} done ON done.post_id = pm.post_id AND done.meta_key = '_ahb_image_search_done'
             WHERE pm.meta_key IN ($key_in)
             AND p.post_status IN ('publish','draft','pending','private','future')
             AND ext.meta_id IS NULL
             AND done.meta_id IS NULL"
        );

        $ids = $wpdb->get_col( $wpdb->prepare(
            "SELECT DISTINCT pm.post_id
             FROM {$wpdb->postmeta} pm
             INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             LEFT JOIN {$wpdb->postmeta} thm  ON thm.post_id  = pm.post_id AND thm.meta_key  = '_thumbnail_id'
             LEFT JOIN {$wpdb->postmeta} ext  ON ext.post_id  = thm.meta_value AND ext.meta_key = '_ahb_external_url'
             LEFT JOIN {$wpdb->postmeta} done ON done.post_id = pm.post_id AND done.meta_key = '_ahb_image_search_done'
             WHERE pm.meta_key IN ($key_in)
             AND p.post_status IN ('publish','draft','pending','private','future')
             AND ext.meta_id IS NULL
             AND done.meta_id IS NULL
             ORDER BY p.post_date DESC
             LIMIT %d OFFSET 0",
            $batch
        ) );

        $processed = count( $ids );
        $found     = 0;  // yeni görsel bulunup eklendi
        $skipped   = 0;  // bulamadı (resmi olanın eskisi korundu, olmayan boş kaldı)
        $changed   = array(); // bu batch'te değiştirilen haberlerin özet listesi
        $searcher  = new AHB_Image_Search();

        foreach ( $ids as $pid ) {
            // Her durumda işaretle — bir daha bu post taranmasın
            update_post_meta( $pid, '_ahb_image_search_done', time() );

            $title = get_the_title( $pid );
            if ( ! $title ) { $skipped++; continue; }

            // Sorgu: başlık + (varsa) ana varlıklar
            $sorgu = $title;
            $entities = get_post_meta( $pid, '_ahb_entities', true );
            if ( is_array( $entities ) && ! empty( $entities ) ) {
                $sorgu .= ' ' . implode( ' ', array_slice( $entities, 0, 3 ) );
            }

            $url = $searcher->find( $sorgu );
            if ( ! $url ) {
                // Bulunamadı — eski resim varsa zaten yerinde kalır, dokunmuyoruz
                $skipped++;
                continue;
            }

            // Dış URL'li attachment oluştur (link modunda) ve thumbnail yap
            // (eski thumbnail varsa otomatik üzerine yazılır, eski attachment kayıtta kalır)
            $attach_id = $this->ahb_attach_external_image( $pid, $url, $title );
            if ( $attach_id ) {
                set_post_thumbnail( $pid, $attach_id );
                update_post_meta( $pid, '_ahb_image_from_search', 1 );
                update_post_meta( $pid, '_ahb_source_image_url', esc_url_raw( $url ) );
                update_post_meta( $pid, '_ahb_image_mode', 'link_search' );
                update_post_meta( $pid, '_ahb_image_search_query', $sorgu );
                update_post_meta( $pid, '_ahb_image_search_date', current_time( 'mysql' ) );
                delete_post_meta( $pid, '_ahb_resim_indirilemedi' );
                error_log( '[AI Haber Botu] Görsel eklendi → post #' . $pid . ' "' . $title . '" → ' . $url );
                $changed[] = array(
                    'id'    => (int) $pid,
                    'title' => esc_html( wp_trim_words( $title, 12, '…' ) ),
                    'edit'  => esc_url( get_edit_post_link( $pid, 'raw' ) ),
                    'view'  => esc_url( get_permalink( $pid ) ),
                    'img'   => esc_url( $url ),
                );
                $found++;
            } else {
                $skipped++;
            }
        }

        // Hep "0" offset ile sorguluyoruz çünkü işlenen post'lar artık WHERE'den düşüyor.
        // İlerleme çubuğu için scanned'i tutalım.
        $scanned_total = $offset + $processed;
        $next_offset   = $scanned_total; // sadece UI için
        $done          = ( $processed === 0 );

        wp_send_json_success( array(
            'changed'       => $changed,
            'processed'     => $processed,
            'found'         => $found,
            'skipped'       => $skipped,
            'total'         => $total,
            'scanned_total' => $scanned_total,
            'next_offset'   => $next_offset,
            'done'          => $done,
        ) );
    }

    /**
     * Hafif (dosyasız) attachment oluşturup _ahb_external_url meta'sı
     * yazar. set_external_featured_image'ın admin tarafı kopyası.
     */
    private function ahb_attach_external_image( $post_id, $image_url, $title ) {
        $path = parse_url( $image_url, PHP_URL_PATH );
        $ext  = strtolower( pathinfo( $path ?? '', PATHINFO_EXTENSION ) );
        $mime_map = array( 'jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png','gif'=>'image/gif','webp'=>'image/webp','avif'=>'image/avif' );
        $mime = isset( $mime_map[ $ext ] ) ? $mime_map[ $ext ] : 'image/jpeg';

        $attach_id = wp_insert_post( array(
            'post_title'     => sanitize_text_field( $title ),
            'post_content'   => '',
            'post_status'    => 'inherit',
            'post_mime_type' => $mime,
            'post_type'      => 'attachment',
            'post_parent'    => $post_id,
            'guid'           => esc_url_raw( $image_url ),
        ), true );

        if ( is_wp_error( $attach_id ) || ! $attach_id ) return 0;

        update_post_meta( $attach_id, '_ahb_external_url', esc_url_raw( $image_url ) );
        update_post_meta( $attach_id, '_wp_attached_file', esc_url_raw( $image_url ) );
        update_post_meta( $attach_id, '_wp_attachment_metadata', array(
            'width' => 1200, 'height' => 630, 'file' => esc_url_raw( $image_url ), 'sizes' => array(),
        ) );
        update_post_meta( $attach_id, '_wp_attachment_image_alt', sanitize_text_field( $title ) );

        return (int) $attach_id;
    }

    public function ajax_managed_delete() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_managed' );
        @set_time_limit( 0 );
        @ini_set( 'memory_limit', '512M' );

        $ids  = isset( $_POST['ids'] ) ? array_map( 'intval', (array) $_POST['ids'] ) : array();
        $mode = isset( $_POST['mode'] ) ? sanitize_key( $_POST['mode'] ) : 'trash';
        $force = ( $mode === 'hard' );

        $silinen = 0;
        $atlanan = 0;
        foreach ( $ids as $pid ) {
            if ( ! $pid ) continue;
            if ( ! $this->is_managed_post( $pid ) ) { $atlanan++; continue; }

            // Trash modunda post zaten çöpteyse force=true ile kalıcı sil (kullanıcı 2. kez "çöpe at" basmış olabilir)
            $cur = get_post_status( $pid );
            $do_force = $force || ( $mode === 'trash' && $cur === 'trash' );

            $res = wp_delete_post( $pid, $do_force );
            if ( $res ) {
                $silinen++;
            } else {
                // wp_delete_post bazen false döner ama zaten silinmiş olabilir
                if ( ! get_post( $pid ) ) $silinen++;
            }
        }
        wp_send_json_success( array(
            'silinen' => $silinen,
            'atlanan' => $atlanan,
            'gelen'   => count( $ids ),
        ) );
    }

    private function is_managed_post( $pid ) {
        $pid = (int) $pid;
        if ( ! $pid ) return false;
        return (bool) (
            get_post_meta( $pid, '_ahb_source_url', true )
            || get_post_meta( $pid, '_ahb_kampanya_id', true )
            || get_post_meta( $pid, '_ahb_kaynak_link', true )
            || get_post_meta( $pid, '_ahb_column_post', true )
        );
    }

    public function register_settings() {
        $fields = array(
            'ahb_openai_api_key',
            'ahb_openai_model',
            'ahb_rss_sources',
            'ahb_post_status',
            'ahb_default_category',
            'ahb_author_id',
            'ahb_schedule_interval',
            'ahb_max_items_per_source',
            'ahb_enable_related',
            'ahb_add_source_note',
            'ahb_post_type',
            'ahb_taxonomy',
            'ahb_tag_taxonomy',
            'ahb_ai_categorize',
            'ahb_min_words',
            'ahb_max_words',
            'ahb_max_tokens',
            'ahb_set_featured_image',
            'ahb_skip_no_image',
            'ahb_image_link_mode',
            'ahb_image_search_enabled',
            'ahb_google_cse_key',
            'ahb_google_cse_cx',
            'ahb_manual_target_count',
            'ahb_signature_text',
            'ahb_check_similar_title',
            'ahb_topic_plan',
            'ahb_category_rss',
            'ahb_category_html',
        );

        foreach ( $fields as $field ) {
            register_setting( 'ahb_settings_group', $field, array(
                'sanitize_callback' => array( $this, 'sanitize_' . str_replace( 'ahb_', '', $field ) ),
            ) );
        }
    }

    public function enqueue_assets( $hook ) {
        if ( strpos( $hook, 'ai-haber-botu' ) === false ) return;
        // AHB_PLUGIN_URL eski sürümden gelmiş olabilir — kendi yolumuzu kullan
        $css_url = plugins_url( 'assets/css/admin.css', dirname( __FILE__ ) . '/../ai-haber-botu.php' );
        wp_enqueue_style( 'ahenk-aib-admin', $css_url, array(), defined( 'AHB_VERSION' ) ? AHB_VERSION : '3.8.0' );
    }

    public function render_page() {
        if ( ! current_user_can( 'manage_options' ) ) return;

        $next_run = wp_next_scheduled( 'ahb_fetch_and_publish' );
        $next_run_str = $next_run ? date_i18n( 'd.m.Y H:i', $next_run ) : 'Planlanmamış';
        ?>
        <div class="wrap ahb-wrap">
            <h1><span class="dashicons dashicons-rss"></span> AI Haber Botu <span class="ahb-version">v<?php echo AHB_VERSION; ?></span></h1>

            <?php settings_errors( 'ahb_settings_group' ); ?>

            <?php if ( isset( $_GET['message'] ) && $_GET['message'] === 'run_ok' ) : ?>
                <div class="notice notice-success is-dismissible">
                    <p><strong>Manuel çalıştırma tamamlandı.</strong>
                       <?php echo (int) ( $_GET['created'] ?? 0 ); ?> yeni/güncellenen haber,
                       <?php echo (int) ( $_GET['skipped'] ?? 0 ); ?> mükerrer atlandı,
                       <?php echo (int) ( $_GET['errors'] ?? 0 ); ?> hata.</p>
                </div>
            <?php endif; ?>

            <?php if ( isset( $_GET['message'] ) && $_GET['message'] === 'topic_ok' ) :
                $per = isset( $_GET['per'] ) ? sanitize_text_field( wp_unslash( $_GET['per'] ) ) : '';
                ?>
                <div class="notice notice-success is-dismissible">
                    <p><strong>Konu Planı çalıştırması tamamlandı.</strong>
                       Toplam <?php echo (int) ( $_GET['created'] ?? 0 ); ?> yeni haber,
                       <?php echo (int) ( $_GET['skipped'] ?? 0 ); ?> atlandı,
                       <?php echo (int) ( $_GET['errors'] ?? 0 ); ?> hata.
                       <?php if ( $per ) : ?><br><strong>Kategori dağılımı:</strong> <?php echo esc_html( str_replace( ',', ' • ', $per ) ); ?><?php endif; ?>
                    </p>
                </div>
            <?php endif; ?>

            <?php
            $active_tab = 'classic';
            if ( isset( $_GET['tab'] ) ) {
                $t = $_GET['tab'];
                if ( in_array( $t, array( 'topic', 'cleanup', 'columnists', 'rssdirect', 'videotv', 'bloklar', 'icerikler' ), true ) ) $active_tab = $t;
            }
            ?>
            <h2 class="nav-tab-wrapper" style="margin-top:15px;">
                <a href="#tab-classic" class="nav-tab ahb-nav <?php echo $active_tab === 'classic' ? 'nav-tab-active' : ''; ?>" data-ahb-tab="classic">📡 Klasik RSS Modu</a>
                <a href="#tab-topic" class="nav-tab ahb-nav <?php echo $active_tab === 'topic' ? 'nav-tab-active' : ''; ?>" data-ahb-tab="topic">🎯 Konu Planı (Google News)</a>
                <a href="#tab-cleanup" class="nav-tab ahb-nav <?php echo $active_tab === 'cleanup' ? 'nav-tab-active' : ''; ?>" data-ahb-tab="cleanup">🧹 Site Bakımı</a>
                <a href="#tab-columnists" class="nav-tab ahb-nav <?php echo $active_tab === 'columnists' ? 'nav-tab-active' : ''; ?>" data-ahb-tab="columnists">✍️ Köşe Yazarları</a>
                <a href="#tab-rssdirect" class="nav-tab ahb-nav <?php echo $active_tab === 'rssdirect' ? 'nav-tab-active' : ''; ?>" data-ahb-tab="rssdirect">🔗 RSS Direkt (AI'sız)</a>
                <a href="#tab-videotv" class="nav-tab ahb-nav <?php echo $active_tab === 'videotv' ? 'nav-tab-active' : ''; ?>" data-ahb-tab="videotv">📺 Video TV</a>
                <a href="#tab-bloklar" class="nav-tab ahb-nav <?php echo $active_tab === 'bloklar' ? 'nav-tab-active' : ''; ?>" data-ahb-tab="bloklar">📦 Haber Blokları</a>
                <a href="#tab-icerikler" class="nav-tab ahb-nav <?php echo $active_tab === 'icerikler' ? 'nav-tab-active' : ''; ?>" data-ahb-tab="icerikler">📚 İçerikler</a>
            </h2>

            <div class="ahb-status-bar" data-ahb-tab="classic">
                <span><strong>Sonraki Otomatik Çalışma:</strong> <?php echo esc_html( $next_run_str ); ?></span>
                <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;">
                    <?php wp_nonce_field( 'ahb_run_now', 'ahb_nonce' ); ?>
                    <input type="hidden" name="action" value="ahb_run_now">
                    <button type="submit" class="button button-primary ahb-run-btn">
                        ▶ Şimdi <?php echo (int) get_option( 'ahb_manual_target_count', 10 ); ?> Haber Üret
                    </button>
                </form>
                <span style="font-size:11px;color:#666;margin-left:10px;">
                    (Sayfayı kapatmayın, tüm haberler üretilene kadar bekleyin — yaklaşık <?php echo (int) get_option( 'ahb_manual_target_count', 10 ) * 5; ?>-<?php echo (int) get_option( 'ahb_manual_target_count', 10 ) * 10; ?> sn)
                </span>
            </div>

            <form method="post" action="options.php">
                <?php settings_fields( 'ahb_settings_group' ); ?>

                <div class="ahb-card" data-ahb-tab="classic">
                    <h2>🔑 OpenAI API Ayarları (her iki sekmede de geçerli)</h2>
                    <table class="form-table">
                        <tr>
                            <th>API Anahtarı</th>
                            <td>
                                <input type="password" name="ahb_openai_api_key"
                                       value="<?php echo esc_attr( get_option( 'ahb_openai_api_key', '' ) ); ?>"
                                       class="regular-text" placeholder="sk-...">
                                <p class="description">OpenAI panosundan (platform.openai.com) alınan API anahtarı.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Model</th>
                            <td>
                                <select name="ahb_openai_model">
                                    <?php
                                    $current_model = get_option( 'ahb_openai_model', 'gpt-4o-mini' );
                                    $models = array(
                                        'gpt-4o-mini' => 'GPT-4o Mini (Önerilen - Hızlı & Ucuz)',
                                        'gpt-4o'      => 'GPT-4o (Yüksek kalite)',
                                        'gpt-3.5-turbo' => 'GPT-3.5 Turbo (En ekonomik)',
                                    );
                                    foreach ( $models as $val => $label ) {
                                        echo '<option value="' . esc_attr( $val ) . '"' . selected( $current_model, $val, false ) . '>' . esc_html( $label ) . '</option>';
                                    }
                                    ?>
                                </select>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="ahb-card" data-ahb-tab="topic" style="border-left:4px solid #2271b1;">
                    <h2>🎯 Konu Planı (Google News'ten Kategori Bazlı Üretim)</h2>
                    <p style="margin:0 0 12px;padding:10px 12px;background:#e7f5ff;border-left:4px solid #2271b1;color:#1d2327;">
                        ℹ️ <strong>AI Model seçimi ortaktır:</strong> Klasik RSS Modu sekmesindeki <strong>OpenAI Modeli</strong> ayarı (gpt-4o-mini, gpt-4o vb.) bu sekmede üretilen haberler için de geçerlidir. API anahtarı ve tüm AI ayarları (kelime sayısı, sıcaklık vb.) tek bir yerden yönetilir.
                    </p>
                    <table class="form-table">
                        <tr>
                            <th>Konu / Kategori / Adet</th>
                            <td>
                                <textarea name="ahb_topic_plan" id="ahb_topic_plan" rows="8" class="large-text code"
                                          placeholder="Her satır: KategoriAdı | arama_kelimesi | adet&#10;Gündem | son dakika türkiye | 20&#10;Ekonomi | ekonomi haberleri | 10&#10;Spor | spor haberleri | 10&#10;Dünya | dünya haberleri | 10&#10;Siyaset | siyaset türkiye | 10&#10;Ekoloji | çevre iklim haberleri | 10&#10;# diye başlayan satırlar yorum olarak atlanır"
                                ><?php echo esc_textarea( get_option( 'ahb_topic_plan', '' ) ); ?></textarea>
                                <p class="description">
                                    <strong>Format:</strong> <code>KategoriAdı | arama_kelimesi | adet</code><br>
                                    • <strong>KategoriAdı</strong>: Sitenizde mevcut bir kategori adını yazın (ör. <code>Gündem</code>, <code>Sağlık</code>). Bot önce bu isimle eşleşen kategoriyi arar, bulamazsa o isimde yeni kategori oluşturur. Türkçe karakter (ğ, ü, ş, ö, ç, ı) destekler.<br>
                                    • <strong>arama_kelimesi</strong>: Google News'te aranacak Türkçe sorgu (tırnaksız).<br>
                                    • <strong>adet</strong>: Bu kategoride üretilecek <strong>yeni</strong> haber sayısı.<br>

                                    <?php
                                    $tax = sanitize_key( get_option( 'ahb_taxonomy', 'category' ) );
                                    if ( taxonomy_exists( $tax ) ) {
                                        $existing = get_terms( array( 'taxonomy' => $tax, 'hide_empty' => false, 'number' => 100 ) );
                                        if ( ! is_wp_error( $existing ) && ! empty( $existing ) ) {
                                            echo '<br><strong>Sitenizdeki mevcut kategoriler (' . esc_html( $tax ) . '):</strong><br>';
                                            $names = array();
                                            foreach ( $existing as $t ) $names[] = '<code>' . esc_html( $t->name ) . '</code>';
                                            echo '<span style="line-height:2;">' . implode( ' • ', $names ) . '</span>';
                                        }
                                    }
                                    ?>
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <th></th>
                            <td>
                                <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-top:5px;">
                                    <?php wp_nonce_field( 'ahb_run_topic_plan', 'ahb_nonce' ); ?>
                                    <input type="hidden" name="action" value="ahb_run_topic_plan">
                                    <button type="submit" class="button button-primary button-hero">
                                        🎯 Konu Planına Göre Şimdi Üret
                                    </button>
                                    <p class="description" style="margin-top:8px;">
                                        ⚠ Önce yukarıdaki ayarları <strong>"Değişiklikleri Kaydet"</strong> ile kaydedin, sonra bu butona basın.<br>
                                        ⏱ Süre: kategori başına ~10-30 saniye. 60 haber için ~5-10 dakika sürebilir, sayfayı kapatmayın.
                                    </p>
                                </form>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="ahb-card" data-ahb-tab="topic" style="border-left:4px solid #00a32a;">
                    <h2>📰 Kategori Bazlı RSS Kaynakları (Yedek)</h2>
                    <p style="margin:0 0 12px;color:#555;">
                        Google News bir konu için içerik veremezse bot otomatik olarak bu listedeki kaynaklara geçer.
                        Aynı kategoriye birden fazla kaynak ekleyebilirsiniz. Her gün belirlediğiniz adet dolana kadar bu kaynaklardan da haber çekilir.
                    </p>

                    <table class="form-table">
                        <tr>
                            <th>Yeni Kaynak Ekle</th>
                            <td>
                                <select id="ahb_cat_select" style="min-width:180px;">
                                    <option value="">— Kategori seçin —</option>
                                </select>
                                <input type="text" id="ahb_cat_url" placeholder="https://kaynak.com/rss" style="width:380px;">
                                <button type="button" class="button button-secondary" id="ahb_cat_add">➕ Ekle</button>
                                <button type="button" class="button" id="ahb_cat_refresh" title="Konu Planı'nda değişiklik yaptıysanız tıklayın">🔄 Kategorileri Yenile</button>
                                <p class="description" style="margin-top:6px;">
                                    Yukarıdaki <strong>Konu Planı</strong> alanına yazdığınız kategoriler otomatik olarak listelenir. Kategori seçin, RSS URL'si yazın, "Ekle" butonuna basın. Sonra sayfanın altındaki <strong>"Değişiklikleri Kaydet"</strong>'e basmayı unutmayın.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <th>Kayıtlı Kaynaklar</th>
                            <td>
                                <textarea name="ahb_category_rss" id="ahb_category_rss_box" rows="8" class="large-text code"
                                          placeholder="Her satır: kategori_slug | RSS_URL&#10;ekonomi | https://www.dunya.com/rss/ekonomi.xml&#10;ekonomi | https://www.bloomberght.com/rss&#10;spor | https://www.fanatik.com.tr/rss"
                                ><?php echo esc_textarea( get_option( 'ahb_category_rss', '' ) ); ?></textarea>
                                <p class="description">
                                    Format: <code>kategori_slug | RSS_URL</code> — her satıra bir kaynak. Aynı kategoriye birden fazla URL ekleyebilirsiniz.<br>
                                    Manuel olarak da düzenleyebilirsiniz; "Ekle" butonu sadece kolaylık sağlar.
                                </p>
                            </td>
                        </tr>
                    </table>

                    <script>
                    (function(){
                        var sel = document.getElementById('ahb_cat_select');
                        var btn = document.getElementById('ahb_cat_add');
                        var refreshBtn = document.getElementById('ahb_cat_refresh');
                        var planBox = document.getElementById('ahb_topic_plan');
                        if (!sel || !btn || !planBox) return;

                        function populate() {
                            var lines = (planBox.value || '').split('\n');
                            var cats = [];
                            var seen = {};
                            lines.forEach(function(l){
                                l = l.trim();
                                if (!l || l[0] === '#') return;
                                var parts = l.split('|');
                                if (parts.length < 1) return;
                                var slug = parts[0].trim().toLowerCase()
                                    .replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u')
                                    .replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')
                                    .replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');
                                if (slug && !seen[slug]) { seen[slug] = 1; cats.push(slug); }
                            });
                            // Mevcut seçimi koru
                            var prev = sel.value;
                            sel.innerHTML = '<option value="">— Kategori seçin —</option>';
                            cats.forEach(function(c){
                                var o = document.createElement('option');
                                o.value = c; o.textContent = c;
                                if (c === prev) o.selected = true;
                                sel.appendChild(o);
                            });
                            if (cats.length === 0) {
                                var o = document.createElement('option');
                                o.value = ''; o.disabled = true;
                                o.textContent = '(Önce yukarıdaki Konu Planı\'na satır ekleyin)';
                                sel.appendChild(o);
                            }
                        }

                        // Sayfa yüklenince doldur
                        populate();
                        // Konu Planı her değiştiğinde otomatik güncelle
                        planBox.addEventListener('input', populate);
                        planBox.addEventListener('change', populate);
                        if (refreshBtn) refreshBtn.addEventListener('click', populate);

                        btn.addEventListener('click', function(){
                            var cat = sel.value;
                            var url = document.getElementById('ahb_cat_url').value.trim();
                            if (!cat) { alert('Önce kategori seçin. Eğer liste boşsa Konu Planı alanına önce kategori yazın.'); return; }
                            if (!url) { alert('RSS URL girin.'); return; }
                            var box = document.getElementById('ahb_category_rss_box');
                            var sep = box.value && box.value.slice(-1) !== '\n' ? '\n' : '';
                            box.value = box.value + sep + cat + ' | ' + url + '\n';
                            document.getElementById('ahb_cat_url').value = '';
                            box.scrollTop = box.scrollHeight;
                            box.focus();
                        });
                    })();
                    </script>
                </div>

                <div class="ahb-card" data-ahb-tab="topic" style="border-left:4px solid #d63638;">
                    <h2>🌐 HTML Sayfa Kaynakları (RSS Yoksa)</h2>
                    <p style="margin:0 0 12px;color:#555;">
                        RSS sağlamayan veya RSS'i yetersiz olan sitelerin <strong>kategori/listeleme sayfalarını</strong> doğrudan tarayabilir.
                        Bot sayfayı açar, son haber linklerini bulur, her birinin içine girer, başlık + içerik + öne çıkan görseli (og:image) çeker, AI ile özgünleştirir.
                        Google News ve RSS yedeklerinden sonra kullanılır (3. yedek).
                    </p>
                    <p style="margin:0 0 12px;color:#666;font-size:12px;">
                        <strong>Örnekler:</strong>
                        <code>https://www.ntv.com.tr/haberleri/cevre</code> •
                        <code>https://medyascope.tv/cevre-haberleri/</code> •
                        <code>https://www.haberler.com/cevre/</code> •
                        <code>https://t24.com.tr/haber/cevre</code>
                    </p>

                    <table class="form-table">
                        <tr>
                            <th>Yeni Sayfa Ekle</th>
                            <td>
                                <select id="ahb_html_cat_select" style="min-width:180px;">
                                    <option value="">— Kategori seçin —</option>
                                </select>
                                <input type="text" id="ahb_html_url" placeholder="https://site.com/cevre-haberleri/" style="width:380px;">
                                <button type="button" class="button button-secondary" id="ahb_html_add">➕ Ekle</button>
                                <button type="button" class="button" id="ahb_html_refresh">🔄 Kategorileri Yenile</button>
                                <p class="description" style="margin-top:6px;">
                                    Konu Planı'ndaki kategorileri otomatik gösterir. Sayfa URL'si girip "Ekle" deyin, sonra altta <strong>"Değişiklikleri Kaydet"</strong>'e basın.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <th>Kayıtlı Sayfalar</th>
                            <td>
                                <textarea name="ahb_category_html" id="ahb_category_html_box" rows="6" class="large-text code"
                                          placeholder="Her satır: kategori_slug | LİSTELEME_URL&#10;cevre | https://www.ntv.com.tr/haberleri/cevre&#10;cevre | https://medyascope.tv/cevre-haberleri/&#10;saglik | https://www.haberler.com/saglik/"
                                ><?php echo esc_textarea( get_option( 'ahb_category_html', '' ) ); ?></textarea>
                                <p class="description">
                                    Format: <code>kategori_slug | URL</code> — her satıra bir sayfa. Aynı kategoriye birden fazla URL ekleyebilirsiniz.<br>
                                    ⚠️ Bu yöntem sitenin HTML yapısına bağlıdır. Bazı sitelerde (JavaScript ile yüklenen listeler vb.) link bulunamayabilir; o zaman Google News yedek olarak yine devreye girer.
                                </p>
                            </td>
                        </tr>
                    </table>

                    <script>
                    (function(){
                        var sel = document.getElementById('ahb_html_cat_select');
                        var btn = document.getElementById('ahb_html_add');
                        var refreshBtn = document.getElementById('ahb_html_refresh');
                        var planBox = document.getElementById('ahb_topic_plan');
                        if (!sel || !btn || !planBox) return;

                        function populate() {
                            var lines = (planBox.value || '').split('\n');
                            var cats = []; var seen = {};
                            lines.forEach(function(l){
                                l = l.trim();
                                if (!l || l[0] === '#') return;
                                var parts = l.split('|');
                                if (parts.length < 1) return;
                                var slug = parts[0].trim().toLowerCase()
                                    .replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u')
                                    .replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')
                                    .replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');
                                if (slug && !seen[slug]) { seen[slug] = 1; cats.push(slug); }
                            });
                            var prev = sel.value;
                            sel.innerHTML = '<option value="">— Kategori seçin —</option>';
                            cats.forEach(function(c){
                                var o = document.createElement('option');
                                o.value = c; o.textContent = c;
                                if (c === prev) o.selected = true;
                                sel.appendChild(o);
                            });
                            if (cats.length === 0) {
                                var o = document.createElement('option');
                                o.value = ''; o.disabled = true;
                                o.textContent = '(Önce yukarıdaki Konu Planı\'na satır ekleyin)';
                                sel.appendChild(o);
                            }
                        }
                        populate();
                        planBox.addEventListener('input', populate);
                        planBox.addEventListener('change', populate);
                        if (refreshBtn) refreshBtn.addEventListener('click', populate);

                        btn.addEventListener('click', function(){
                            var cat = sel.value;
                            var url = document.getElementById('ahb_html_url').value.trim();
                            if (!cat) { alert('Önce kategori seçin.'); return; }
                            if (!url) { alert('Sayfa URL girin.'); return; }
                            if (!/^https?:\/\//i.test(url)) { alert('URL http:// veya https:// ile başlamalı.'); return; }
                            var box = document.getElementById('ahb_category_html_box');
                            var sep = box.value && box.value.slice(-1) !== '\n' ? '\n' : '';
                            box.value = box.value + sep + cat + ' | ' + url + '\n';
                            document.getElementById('ahb_html_url').value = '';
                            box.scrollTop = box.scrollHeight;
                            box.focus();
                        });
                    })();
                    </script>
                </div>

                <div class="ahb-card">
                    <h2>📡 Genel RSS Kaynakları (Manuel)</h2>
                    <table class="form-table">
                        <tr>
                            <th>RSS/Atom URL'leri</th>
                            <td>
                                <textarea name="ahb_rss_sources" rows="10" class="large-text"
                                          placeholder="Her satıra bir RSS/Atom URL'si yazın. İsteğe bağlı kategori için | kullanın:&#10;https://example.com/spor.rss | spor&#10;https://example.com/ekonomi.rss | ekonomi&#10;https://genel-haber.com/feed       (kategori boş = AI karar verir)&#10;# Bu satır yorum olarak atlanır"
                                ><?php echo esc_textarea( get_option( 'ahb_rss_sources', '' ) ); ?></textarea>
                                <p class="description">
                                    <strong>Format:</strong> <code>RSS_URL | kategori-slug</code><br>
                                    • Kategori yazarsanız haber doğrudan o kategoriye atanır.<br>
                                    • Kategori yazmazsanız aşağıdaki "AI Kategorilendirme" ayarına göre AI karar verir.<br>
                                    • Kategori yoksa otomatik oluşturulur.<br>
                                    • <code>#</code> ile başlayan satırlar yorum olarak atlanır.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <th>Kaynak Başına Maks. Haber</th>
                            <td>
                                <input type="number" name="ahb_max_items_per_source"
                                       value="<?php echo esc_attr( get_option( 'ahb_max_items_per_source', 10 ) ); ?>"
                                       min="1" max="50" class="small-text">
                                <p class="description">Her RSS kaynağından her döngüde işlenecek maksimum haber sayısı.</p>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="ahb-card">
                    <h2>📝 Yayın Ayarları</h2>
                    <table class="form-table">
                        <tr>
                            <th>İçerik Türü (Post Type)</th>
                            <td>
                                <?php
                                $current_pt = get_option( 'ahb_post_type', 'haber' );
                                $cpts = get_post_types( array( 'public' => true ), 'objects' );
                                ?>
                                <select name="ahb_post_type">
                                    <?php foreach ( $cpts as $key => $obj ) : ?>
                                        <option value="<?php echo esc_attr( $key ); ?>" <?php selected( $current_pt, $key ); ?>>
                                            <?php echo esc_html( $obj->labels->name ); ?> (<?php echo esc_html( $key ); ?>)
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <p class="description">Haberler hangi içerik türüne kaydedilecek? <strong>Ahenk Haber Botu için "haber" seçin.</strong></p>
                            </td>
                        </tr>
                        <tr>
                            <th>Kategori Taksonomisi</th>
                            <td>
                                <?php
                                $current_tax = get_option( 'ahb_taxonomy', 'haber-kategorisi' );
                                $taxes = get_taxonomies( array( 'public' => true ), 'objects' );
                                ?>
                                <select name="ahb_taxonomy">
                                    <?php foreach ( $taxes as $key => $obj ) : ?>
                                        <option value="<?php echo esc_attr( $key ); ?>" <?php selected( $current_tax, $key ); ?>>
                                            <?php echo esc_html( $obj->labels->name ); ?> (<?php echo esc_html( $key ); ?>)
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <p class="description">Kategoriler hangi taksonomide tanımlı? <strong>Ahenk için "haber-kategorisi" seçin.</strong></p>
                            </td>
                        </tr>
                        <tr>
                            <th>Etiket Taksonomisi</th>
                            <td>
                                <select name="ahb_tag_taxonomy">
                                    <?php
                                    $current_tag = get_option( 'ahb_tag_taxonomy', 'post_tag' );
                                    foreach ( $taxes as $key => $obj ) : ?>
                                        <option value="<?php echo esc_attr( $key ); ?>" <?php selected( $current_tag, $key ); ?>>
                                            <?php echo esc_html( $obj->labels->name ); ?> (<?php echo esc_html( $key ); ?>)
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <p class="description">Etiketler hangi taksonomiye yazılsın? Yoksa boş bırakın.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Yazı Durumu</th>
                            <td>
                                <select name="ahb_post_status">
                                    <?php
                                    $current = get_option( 'ahb_post_status', 'publish' );
                                    $statuses = array(
                                        'draft'   => 'Taslak (Önerilen — elle kontrol edin)',
                                        'publish' => 'Hemen Yayınla',
                                        'pending' => 'İnceleme Bekliyor',
                                    );
                                    foreach ( $statuses as $val => $label ) {
                                        echo '<option value="' . esc_attr( $val ) . '"' . selected( $current, $val, false ) . '>' . esc_html( $label ) . '</option>';
                                    }
                                    ?>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th>Yedek Kategori</th>
                            <td>
                                <?php
                                $current_tax = get_option( 'ahb_taxonomy', 'haber-kategorisi' );
                                $default_cat = (int) get_option( 'ahb_default_category', 0 );

                                if ( taxonomy_exists( $current_tax ) ) {
                                    $terms = get_terms( array(
                                        'taxonomy'   => $current_tax,
                                        'hide_empty' => false,
                                        'number'     => 200,
                                    ) );
                                    echo '<select name="ahb_default_category">';
                                    echo '<option value="0">— Yedek kategori yok —</option>';
                                    if ( ! is_wp_error( $terms ) ) {
                                        foreach ( $terms as $t ) {
                                            echo '<option value="' . (int) $t->term_id . '"' . selected( $default_cat, $t->term_id, false ) . '>' . esc_html( $t->name ) . '</option>';
                                        }
                                    }
                                    echo '</select>';
                                } else {
                                    echo '<input type="number" name="ahb_default_category" value="' . esc_attr( $default_cat ) . '" class="small-text">';
                                    echo '<p class="description">Önce taksonomiyi seçip kaydedin, sonra liste görünecek.</p>';
                                }
                                ?>
                                <p class="description">RSS satırında kategori belirtilmemişse ve AI de karar veremezse bu kategori kullanılır.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Yazar</th>
                            <td>
                                <?php
                                wp_dropdown_users( array(
                                    'name'     => 'ahb_author_id',
                                    'selected' => get_option( 'ahb_author_id', 1 ),
                                    'role__in' => array( 'administrator', 'editor', 'author' ),
                                ) );
                                ?>
                            </td>
                        </tr>
                        <tr>
                            <th>Öne Çıkan Resim</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="ahb_set_featured_image" value="1"
                                           <?php checked( get_option( 'ahb_set_featured_image', 1 ), 1 ); ?>>
                                    RSS kaynağındaki resmi indirip yazıya öne çıkan görsel olarak ata
                                </label>
                                <p class="description">Resim Medya Kütüphanesine yüklenir ve haber yazısının kapağı olur.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Resim Ekleme Modu</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="ahb_image_link_mode" value="1"
                                           <?php checked( (int) get_option( 'ahb_image_link_mode', 1 ), 1 ); ?>>
                                    <strong>Önce LİNK olarak ekle</strong> (sunucu disk yerinden tasarruf)
                                </label>
                                <p class="description">
                                    Açıkken: resim sunucuya indirilmez, doğrudan kaynak URL kullanılır. Disk yerinden ve bant genişliğinden tasarruf sağlar.<br>
                                    Kaynak site hotlink koruması yapıyorsa veya resim erişilemezse <strong>otomatik olarak sunucuya indirme</strong>ye geçer. Kapalıyken her resim doğrudan sunucuya indirilir.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <th>Görsel Bulunamazsa Web'de Ara</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="ahb_image_search_enabled" value="1"
                                           <?php checked( (int) get_option( 'ahb_image_search_enabled', 1 ), 1 ); ?>>
                                    <strong>Resmi olmayan haberler için arama motorundan görsel bul</strong>
                                </label>
                                <p class="description">
                                    Açıkken: kaynak haberde resim yoksa, başlık + ana varlıklar (kişi/yer/kurum) ile <strong>Bing Görseller</strong>'de aratır ve ilk uygun görseli link olarak ekler.<br>
                                    <strong>Google Custom Search</strong> tercih edersen aşağıdaki API alanlarını doldur — daha kaliteli sonuçlar verir, günde 100 sorgu ücretsizdir.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <th>Google Görsel API Key <small>(opsiyonel)</small></th>
                            <td>
                                <input type="text" name="ahb_google_cse_key" value="<?php echo esc_attr( get_option( 'ahb_google_cse_key', '' ) ); ?>" class="regular-text" placeholder="AIzaSy…">
                                <p class="description">
                                    Google Cloud Console → "Custom Search API" → API Key oluştur.
                                    Boş bırakırsan Bing kullanılır (anahtarsız, ücretsiz).
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <th>Google CSE ID <small>(opsiyonel)</small></th>
                            <td>
                                <input type="text" name="ahb_google_cse_cx" value="<?php echo esc_attr( get_option( 'ahb_google_cse_cx', '' ) ); ?>" class="regular-text" placeholder="017576662512468239146:omuauf_lfve">
                                <p class="description">
                                    <a href="https://programmablesearchengine.google.com/" target="_blank">programmablesearchengine.google.com</a> adresinden bir motor oluştur, "Görsel arama" açık olsun, "Tüm web'i ara" seç. Motor ID'sini buraya yapıştır.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <th>Resimsiz Haberler</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="ahb_skip_no_image" value="1"
                                           <?php checked( (int) get_option( 'ahb_skip_no_image', 1 ), 1 ); ?>>
                                    <strong>Resmi olmayan haberleri yayınlama</strong> (önce kaynak görseli, yoksa haber içindeki ilk resmi kullanır; o da yoksa atlar)
                                </label>
                                <p class="description">Açık olduğunda: resim yoksa haber hiç oluşturulmaz. Kapatırsanız resimsiz haberler de yayınlanır.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Haber İmzası</th>
                            <td>
                                <input type="text" name="ahb_signature_text"
                                       value="<?php echo esc_attr( get_option( 'ahb_signature_text', 'AHENK HABER AJANSI' ) ); ?>"
                                       class="regular-text" placeholder="AHENK HABER AJANSI">
                                <p class="description">Her haberin sonuna eklenir. Boş bırakırsanız imza eklenmez. Kaynak linki <strong>asla</strong> eklenmez.</p>
                            </td>
                        </tr>
                        <input type="hidden" name="ahb_add_source_note" value="0">
                        <tr>
                            <th>Benzer Başlık Kontrolü</th>
                            <td>
                                <input type="hidden" name="ahb_check_similar_title" value="0">
                                <label>
                                    <input type="checkbox" name="ahb_check_similar_title" value="1"
                                           <?php checked( get_option( 'ahb_check_similar_title', 0 ), 1 ); ?>>
                                    Sitede aynı başlıklı bir haber varsa atla
                                </label>
                                <p class="description"><strong>Önerilen: KAPALI.</strong> Açarsanız, başka bir eklenti (örn. Ahenk Haber Botu) aynı RSS'i çekip yazmışsa AI bu haberleri özgünleştirmeden geçer. Kapalıyken AI mutlaka kendi özgün başlığını üretir.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Min. Kelime Sayısı</th>
                            <td>
                                <input type="number" name="ahb_min_words" min="100" max="2000" step="50"
                                       value="<?php echo esc_attr( get_option( 'ahb_min_words', 400 ) ); ?>" class="small-text">
                                <p class="description">AI üretilen haberin alt sınırı. Önerilen: 400.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Maks. Kelime Sayısı</th>
                            <td>
                                <input type="number" name="ahb_max_words" min="200" max="3000" step="50"
                                       value="<?php echo esc_attr( get_option( 'ahb_max_words', 700 ) ); ?>" class="small-text">
                                <p class="description">Üst sınır. Önerilen: 700.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Maks. Token (API limiti)</th>
                            <td>
                                <input type="number" name="ahb_max_tokens" min="800" max="8000" step="100"
                                       value="<?php echo esc_attr( get_option( 'ahb_max_tokens', 3500 ) ); ?>" class="small-text">
                                <p class="description">OpenAI yanıt token limiti. Uzun yazılar için 3500-4000 önerilir.</p>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="ahb-card">
                    <h2>🤖 Otomasyon Ayarları</h2>
                    <table class="form-table">
                        <tr>
                            <th>Çalışma Sıklığı</th>
                            <td>
                                <select name="ahb_schedule_interval">
                                    <?php
                                    $current_interval = get_option( 'ahb_schedule_interval', 'hourly' );
                                    $schedules = wp_get_schedules();
                                    foreach ( $schedules as $key => $sched ) {
                                        echo '<option value="' . esc_attr( $key ) . '"' . selected( $current_interval, $key, false ) . '>' . esc_html( $sched['display'] ) . '</option>';
                                    }
                                    ?>
                                </select>
                                <p class="description">Sıklığı değiştirirseniz kaydettikten sonra eklentiyi devre dışı bırakıp yeniden etkinleştirin.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Manuel Çalıştırma Hedefi</th>
                            <td>
                                <input type="number" name="ahb_manual_target_count" min="1" max="50" step="1"
                                       value="<?php echo esc_attr( get_option( 'ahb_manual_target_count', 10 ) ); ?>" class="small-text">
                                <p class="description">"Şimdi Çalıştır" butonuna bastığınızda kaç adet yeni haber üretilsin? Varsayılan: 10. Bekleme yapmadan ardı ardına üretilir.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>AI Kategorilendirme</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="ahb_ai_categorize" value="1"
                                           <?php checked( get_option( 'ahb_ai_categorize', 1 ), 1 ); ?>>
                                    RSS satırında kategori belirtilmemişse AI içeriğe göre otomatik kategori seçsin
                                </label>
                                <p class="description">Kapatırsanız ve RSS satırında kategori yoksa "Yedek Kategori" kullanılır.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>İlişkili Haberler</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="ahb_enable_related" value="1"
                                           <?php checked( get_option( 'ahb_enable_related', 1 ), 1 ); ?>>
                                    Her yazının altına otomatik "İlgili Haberler" bölümü ekle
                                </label>
                            </td>
                        </tr>
                    </table>
                </div>

                <?php submit_button( 'Ayarları Kaydet', 'primary large' ); ?>
            </form>

            <?php $this->render_cleanup_tab(); ?>

            <div class="ahb-card" data-ahb-tab="cleanup" style="border-left:4px solid #2271b1;">
                <h2>📦 İçe / Dışa Aktarım Aracı</h2>
                <p style="margin:0 0 12px;color:#444;">
                    Sitedeki haberleri (yazılar, sayfalar, köşe yazıları, ky-yazar gibi özel post tipler dahil), kategorileri,
                    Video TV içeriklerini ve resim/medya kayıtlarını <strong>JSON dosyası</strong> olarak indirip yeni kuruluma
                    geri yükleyebilirsiniz. WP'yi <code>/tr</code> klasörüne taşıyacaksanız ya da başka bir siteden veri çekmek
                    istiyorsanız bu aracı kullanın.
                </p>
                <p style="margin:0 0 16px;">
                    <a href="<?php echo esc_url( admin_url( 'admin.php?page=ai-haber-botu-ie' ) ); ?>"
                       class="button button-primary button-hero">📦 İçe/Dışa Aktarım Aracını Aç</a>
                </p>
                <p style="margin:0;color:#666;font-size:12px;">
                    İçinde 4 sekme bulunur: Dışa Aktar, İçe Aktar, Diğer Siteden Çek, REST Anahtarı.
                </p>
            </div>

            <?php $this->render_columnists_tab(); ?>
            <?php $this->render_rssdirect_tab(); ?>
            <?php $this->render_videotv_tab(); ?>
            <?php $this->render_bloklar_tab(); ?>

            <?php
            // İÇERİKLER tab — soldan kaldirilan tum admin sayfalarinin link kart grid'i
            $ic_links = array(
                array( 'icon' => '📰', 'title' => 'Eklenen Haberler',     'desc' => 'Bu eklentinin oluşturduğu tüm haberler (Klasik, RSS Direkt, Köşe).', 'url' => admin_url( 'admin.php?page=ai-haber-botu-managed' ) ),
                array( 'icon' => '📜', 'title' => 'İşlem Geçmişi',         'desc' => 'Otomatik çalışmalar, hata kayıtları ve detaylı log.',                  'url' => admin_url( 'admin.php?page=ai-haber-botu-log' ) ),
                array( 'icon' => '📦', 'title' => 'İçe / Dışa Aktarım',    'desc' => 'Haberleri/kategorileri JSON ile dışa aktar, başka kuruluma yükle.',     'url' => admin_url( 'admin.php?page=ai-haber-botu-ie' ) ),
                array( 'icon' => '📺', 'title' => 'Video TV — Kaynaklar',  'desc' => 'YouTube/RSS video kaynaklarını yönet.',                                  'url' => admin_url( 'admin.php?page=video-tv' ) ),
                array( 'icon' => '🎬', 'title' => 'Video TV — Videolar',   'desc' => 'Çekilmiş tüm videoları görüntüle.',                                       'url' => admin_url( 'admin.php?page=video-tv-videolar' ) ),
                array( 'icon' => '📑', 'title' => 'Video TV — Playlistler','desc' => 'Oynatma listelerini düzenle.',                                            'url' => admin_url( 'admin.php?page=video-tv-playlistler' ) ),
                array( 'icon' => '🗂', 'title' => 'Video TV — Kategoriler','desc' => 'Video kategorilerini yönet.',                                             'url' => admin_url( 'admin.php?page=video-tv-kategoriler' ) ),
                array( 'icon' => '⚙️', 'title' => 'Video TV — Ayarlar',    'desc' => 'Video TV modülü genel ayarları.',                                          'url' => admin_url( 'admin.php?page=video-tv-ayarlar' ) ),
            );
            ?>
            <div class="ahb-card" data-ahb-tab="icerikler">
                <h2>📚 İçerikler</h2>
                <p style="margin:0 0 16px;color:#444;">
                    Sol menüyü temiz tutmak için tüm içerik yönetim sayfaları burada toplandı. Açmak istediğinize tıklayın.
                </p>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;">
                    <?php foreach ( $ic_links as $l ) : ?>
                        <a href="<?php echo esc_url( $l['url'] ); ?>"
                           style="display:block;padding:18px;background:#fff;border:1px solid #dcdcde;border-radius:8px;text-decoration:none;color:inherit;transition:all .15s;box-shadow:0 1px 2px rgba(0,0,0,0.04);"
                           onmouseover="this.style.borderColor='#2271b1';this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(34,113,177,0.15)';"
                           onmouseout="this.style.borderColor='#dcdcde';this.style.transform='none';this.style.boxShadow='0 1px 2px rgba(0,0,0,0.04)';">
                            <div style="font-size:28px;line-height:1;margin-bottom:10px;"><?php echo esc_html( $l['icon'] ); ?></div>
                            <div style="font-weight:600;font-size:14px;margin-bottom:6px;color:#1d2327;"><?php echo esc_html( $l['title'] ); ?></div>
                            <div style="font-size:12px;color:#646970;line-height:1.45;"><?php echo esc_html( $l['desc'] ); ?></div>
                        </a>
                    <?php endforeach; ?>
                </div>
                <p style="margin:18px 0 0;font-size:12px;color:#888;">
                    İpucu: Haber Blokları ve Köşe Yazarları için yukarıdaki sekmeleri kullanın.
                </p>
            </div>

            <script>
            (function(){
                // data-ahb-tab="topic" olmayan her şey "classic" sayılır
                var tabs = document.querySelectorAll('.ahb-nav');
                var allCards = document.querySelectorAll('.ahb-card, .ahb-status-bar');
                function activate(name){
                    tabs.forEach(function(t){
                        if (t.dataset.ahbTab === name) t.classList.add('nav-tab-active');
                        else t.classList.remove('nav-tab-active');
                    });
                    allCards.forEach(function(c){
                        var ct = c.dataset.ahbTab || 'classic';
                        c.style.display = (ct === name) ? '' : 'none';
                    });
                    try { window.history.replaceState({}, '', '?page=ai-haber-botu&tab=' + name); } catch(e){}
                }
                tabs.forEach(function(t){
                    t.addEventListener('click', function(e){
                        e.preventDefault();
                        activate(t.dataset.ahbTab);
                    });
                });
                // Aktif tabı URL'den belirle
                var initial = '<?php echo esc_js( $active_tab ); ?>';
                activate(initial);
            })();
            </script>
        </div>
        <?php
    }

    public function render_log_page() {
        if ( ! current_user_can( 'manage_options' ) ) return;

        global $wpdb;
        $table = $wpdb->prefix . 'ahb_processed_news';

        $rows = $wpdb->get_results(
            "SELECT * FROM {$table} ORDER BY processed_at DESC LIMIT 100",
            ARRAY_A
        );
        ?>
        <div class="wrap ahb-wrap">
            <h1><span class="dashicons dashicons-list-view"></span> İşlem Geçmişi</h1>

            <?php if ( isset( $_GET['cleared'] ) && $_GET['cleared'] === '1' ) : ?>
                <div class="notice notice-success is-dismissible"><p><strong>İşlem geçmişi temizlendi.</strong> Artık aynı haberler tekrar denenebilir.</p></div>
            <?php endif; ?>

            <div class="ahb-card" style="margin-bottom:15px;">
                <p><strong>Toplam kayıt:</strong> <?php echo count( $rows ); ?></p>
                <p>Bu liste, eklentinin daha önce işlediği RSS öğelerini tutar. Aynı haberin tekrar tekrar üretilmesini engeller. Eğer bot "10 mükerrer atlandı" diyorsa, geçmişi temizleyerek aynı haberlerin yeniden işlenmesini sağlayabilirsiniz.</p>
                <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>"
                      onsubmit="return confirm('İşlem geçmişi tamamen silinsin mi? Mevcut WordPress yazılarınız silinmez, sadece bu listeyi temizler.');">
                    <?php wp_nonce_field( 'ahb_clear_log', 'ahb_clear_nonce' ); ?>
                    <input type="hidden" name="action" value="ahb_clear_log">
                    <button type="submit" class="button button-secondary">🗑 İşlem Geçmişini Sıfırla</button>
                </form>
            </div>

            <?php if ( empty( $rows ) ) : ?>
                <div class="ahb-card"><p>Henüz işlenmiş haber bulunmuyor.</p></div>
            <?php else : ?>
            <div class="ahb-card">
                <table class="widefat fixed striped">
                    <thead>
                        <tr>
                            <th>Tarih</th>
                            <th>Konu Grubu</th>
                            <th>WordPress Yazısı</th>
                            <th>Kaynak URL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ( $rows as $row ) : ?>
                        <tr>
                            <td><?php echo esc_html( $row['processed_at'] ); ?></td>
                            <td><?php echo esc_html( $row['topic_slug'] ?: '—' ); ?></td>
                            <td>
                                <?php if ( $row['wp_post_id'] ) : ?>
                                    <a href="<?php echo esc_url( get_edit_post_link( $row['wp_post_id'] ) ); ?>" target="_blank">
                                        #<?php echo (int) $row['wp_post_id']; ?> — <?php echo esc_html( get_the_title( $row['wp_post_id'] ) ?: '(silinmiş)' ); ?>
                                    </a>
                                <?php else : ?>
                                    —
                                <?php endif; ?>
                            </td>
                            <td style="word-break:break-all;">
                                <a href="<?php echo esc_url( $row['source_url'] ); ?>" target="_blank" rel="nofollow">
                                    <?php echo esc_html( mb_substr( $row['source_url'], 0, 60 ) ); ?>…
                                </a>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <p class="description">Son 100 işlem gösteriliyor.</p>
            </div>
            <?php endif; ?>
        </div>
        <?php
    }

    public function handle_run_now() {
        if ( ! current_user_can( 'manage_options' ) ) wp_die( 'Yetkisiz erişim.' );
        if ( ! isset( $_POST['ahb_nonce'] ) || ! wp_verify_nonce( $_POST['ahb_nonce'], 'ahb_run_now' ) ) {
            wp_die( 'Güvenlik doğrulaması başarısız.' );
        }

        // Manuel mod: cron action'ı yerine doğrudan çağır → bekleme yok, hedef sayıya ulaşılır
        $plugin = $GLOBALS['ahb_plugin_instance'] ?? null;
        if ( $plugin && method_exists( $plugin, 'run_news_cycle' ) ) {
            $stats = $plugin->run_news_cycle( true );
        } else {
            do_action( 'ahb_fetch_and_publish' );
            $stats = get_transient( 'ahb_last_run_stats' );
        }

        wp_redirect( add_query_arg( array(
            'page'    => 'ai-haber-botu',
            'message' => 'run_ok',
            'created' => isset( $stats['created'] ) ? (int) $stats['created'] : 0,
            'skipped' => isset( $stats['skipped'] ) ? (int) $stats['skipped'] : 0,
            'errors'  => isset( $stats['errors'] ) ? (int) $stats['errors'] : 0,
        ), admin_url( 'admin.php' ) ) );
        exit;
    }

    public function handle_clear_log() {
        if ( ! current_user_can( 'manage_options' ) ) wp_die( 'Yetkisiz erişim.' );
        if ( ! isset( $_POST['ahb_clear_nonce'] ) || ! wp_verify_nonce( $_POST['ahb_clear_nonce'], 'ahb_clear_log' ) ) {
            wp_die( 'Güvenlik doğrulaması başarısız.' );
        }
        global $wpdb;
        $table = $wpdb->prefix . 'ahb_processed_news';
        $wpdb->query( "TRUNCATE TABLE {$table}" );

        wp_redirect( add_query_arg( array(
            'page'    => 'ai-haber-botu-log',
            'cleared' => '1',
        ), admin_url( 'admin.php' ) ) );
        exit;
    }

    public function sanitize_check_similar_title( $val ) { return $val ? 1 : 0; }
    public function sanitize_topic_plan( $val ) { return sanitize_textarea_field( $val ); }
    public function sanitize_category_rss( $val ) { return sanitize_textarea_field( $val ); }
    public function sanitize_category_html( $val ) { return sanitize_textarea_field( $val ); }

    /* ============================================================
     *  3. SEKME — SİTE BAKIMI / TEMİZLİK
     * ============================================================ */

    public function render_cleanup_tab() {
        $taxonomy = sanitize_key( get_option( 'ahb_taxonomy', 'category' ) );
        $terms = taxonomy_exists( $taxonomy )
            ? get_terms( array( 'taxonomy' => $taxonomy, 'hide_empty' => true, 'number' => 200 ) )
            : array();
        $nonce = wp_create_nonce( 'ahb_cleanup' );
        ?>
        <div class="ahb-card" data-ahb-tab="cleanup" style="border-left:4px solid #d63638;">
            <h2>🧹 Site İçi Haber Bakımı</h2>
            <p style="margin:0 0 12px;color:#444;">
                Sitenizde mevcut tüm haberleri kategori kategori tarayıp <strong>aynı içerikteki mükerrer haberleri</strong> birleştirir,
                <strong>benzer haberleri</strong> link olarak ekler, fazlalıkları (öne çıkan görselleriyle birlikte) <strong>siler</strong>,
                içerik sonundaki "Kaynak: ..." atıflarını temizler. İsterseniz AI ile içeriği yeniden özgünleştirir.
            </p>
            <p style="margin:0 0 16px;padding:10px 12px;background:#fcf0f1;border-left:4px solid #d63638;color:#7a1c1f;">
                ⚠️ <strong>Geri alınamaz!</strong> Mükerrer olarak silinen haberler (ve resimleri) kalıcı olarak kaldırılır. Önce bir kategoride <strong>kuru çalıştırma (sadece raporla)</strong> deneyip görmek isteyebilirsiniz.
                Yedek almanız önerilir.
            </p>

            <table class="form-table">
                <tr>
                    <th>Kategori Seçimi</th>
                    <td>
                        <label><input type="radio" name="ahb_cleanup_scope" value="all" checked> <strong>Tüm kategoriler</strong> (sırayla)</label><br>
                        <label><input type="radio" name="ahb_cleanup_scope" value="single"> Sadece seçili kategori:</label>
                        <select id="ahb_cleanup_term">
                            <?php foreach ( $terms as $t ) : ?>
                                <option value="<?php echo (int) $t->term_id; ?>"><?php echo esc_html( $t->name ); ?> (<?php echo (int) $t->count; ?>)</option>
                            <?php endforeach; ?>
                        </select>
                    </td>
                </tr>

                <tr>
                    <th>AI Modeli</th>
                    <td>
                        <select id="ahb_cleanup_ai">
                            <option value="free" selected>🆓 AI Yok — Bedava (sadece kurallarla temizlik, çok hızlı)</option>
                            <option value="cheapest">💰 En Ucuz — gpt-4o-mini ile içerikleri yeniden yaz (~$0.0005/yazı)</option>
                            <option value="best">💎 En Kaliteli — gpt-4o ile yeniden yaz (~$0.01/yazı)</option>
                        </select>
                        <p class="description" style="margin-top:6px;">
                            <strong>Bedava modda</strong> mükerrer birleştirme, benzer haber linki ve kaynak temizliği AI'sız yapılır — ücretsiz ve çok hızlıdır.
                            <strong>AI seçerseniz</strong> içerikler ek olarak özgünleştirilir.
                        </p>
                    </td>
                </tr>

                <tr>
                    <th>Yapılacak İşlemler</th>
                    <td>
                        <label><input type="checkbox" id="ahb_cl_dup" checked> Aynı haberleri birleştir + sil (öne çıkan görseller dahil)</label><br>
                        <label><input type="checkbox" id="ahb_cl_link" checked> Benzer haberlere link ekle</label><br>
                        <label><input type="checkbox" id="ahb_cl_src" checked> "Kaynak: ..." atıflarını içerikten temizle</label><br>
                        <label><input type="checkbox" id="ahb_cl_rewrite"> AI ile içeriği yeniden yaz (sadece AI modu seçiliyse)</label>
                    </td>
                </tr>

                <tr>
                    <th>Batch Boyutu</th>
                    <td>
                        <input type="number" id="ahb_cl_batch" value="10" min="3" max="50" style="width:80px;">
                        <span style="color:#666;font-size:12px;">her turda işlenecek haber sayısı (10 önerilir; AI seçtiyseniz 5)</span>
                    </td>
                </tr>
            </table>

            <p>
                <button type="button" class="button button-primary button-hero" id="ahb_cleanup_start">▶ Bakımı Başlat</button>
                <button type="button" class="button" id="ahb_cleanup_stop" disabled>⏸ Durdur</button>
            </p>

            <div id="ahb_cleanup_progress" style="display:none;margin-top:15px;padding:12px;background:#f6f7f7;border:1px solid #c3c4c7;border-radius:4px;">
                <div style="font-size:14px;margin-bottom:6px;">
                    <strong>Mevcut kategori:</strong> <span id="ahb_cl_cat">—</span>
                    &nbsp;•&nbsp; <span id="ahb_cl_offset">0</span> / <span id="ahb_cl_total">0</span> haber
                </div>
                <div style="background:#dcdcde;height:18px;border-radius:9px;overflow:hidden;">
                    <div id="ahb_cl_bar" style="background:#2271b1;height:100%;width:0%;transition:width .3s;"></div>
                </div>
                <div style="margin-top:10px;display:flex;gap:18px;flex-wrap:wrap;font-size:13px;">
                    <span>🗑 Silinen: <strong id="ahb_cl_del">0</strong></span>
                    <span>🔥 Birleştirilen: <strong id="ahb_cl_mer">0</strong></span>
                    <span>🔗 Linklenen: <strong id="ahb_cl_lin">0</strong></span>
                    <span>✏️ Yeniden Yazılan: <strong id="ahb_cl_rew">0</strong></span>
                </div>
                <div id="ahb_cl_log" style="margin-top:10px;max-height:240px;overflow-y:auto;background:#fff;padding:8px;border:1px solid #ddd;border-radius:3px;font-family:monospace;font-size:11px;line-height:1.5;"></div>
            </div>

            <script>
            (function(){
                var nonce = '<?php echo esc_js( $nonce ); ?>';
                var ajaxurl = '<?php echo esc_js( admin_url( 'admin-ajax.php' ) ); ?>';
                var btnStart = document.getElementById('ahb_cleanup_start');
                var btnStop  = document.getElementById('ahb_cleanup_stop');
                var stopFlag = false;
                var totals = { del:0, mer:0, lin:0, rew:0 };
                var queue = [];   // sırada bekleyen [{term_id, name, total}, ...]
                var current = null;
                var offset = 0;

                function log(msg, type){
                    var el = document.getElementById('ahb_cl_log');
                    var color = type === 'err' ? '#d63638' : (type === 'ok' ? '#00a32a' : '#1d2327');
                    var time = new Date().toLocaleTimeString();
                    el.innerHTML += '<div style="color:'+color+';">['+time+'] '+msg+'</div>';
                    el.scrollTop = el.scrollHeight;
                }

                function setBar(){
                    if (!current || !current.total) return;
                    var pct = Math.min(100, Math.round(offset / current.total * 100));
                    document.getElementById('ahb_cl_bar').style.width = pct + '%';
                    document.getElementById('ahb_cl_offset').textContent = Math.min(offset, current.total);
                    document.getElementById('ahb_cl_total').textContent = current.total;
                }

                function updateTotals(s){
                    totals.del += s.deleted || 0;
                    totals.mer += s.merged || 0;
                    totals.lin += s.linked || 0;
                    totals.rew += s.rewritten || 0;
                    document.getElementById('ahb_cl_del').textContent = totals.del;
                    document.getElementById('ahb_cl_mer').textContent = totals.mer;
                    document.getElementById('ahb_cl_lin').textContent = totals.lin;
                    document.getElementById('ahb_cl_rew').textContent = totals.rew;
                }

                function nextBatch(){
                    if (stopFlag) { log('Durduruldu.', 'err'); finalize(); return; }
                    if (!current) {
                        if (!queue.length) { log('✅ Tüm kategoriler tamamlandı.', 'ok'); finalize(); return; }
                        current = queue.shift();
                        offset = 0;
                        document.getElementById('ahb_cl_cat').textContent = current.name;
                        log('--- Kategori başladı: '+current.name+' ---');
                    }

                    var fd = new FormData();
                    fd.append('action', 'ahb_cleanup_batch');
                    fd.append('_wpnonce', nonce);
                    fd.append('term_id', current.term_id);
                    fd.append('offset', offset);
                    fd.append('batch_size', document.getElementById('ahb_cl_batch').value);
                    fd.append('ai_mode', document.getElementById('ahb_cleanup_ai').value);
                    fd.append('do_dup', document.getElementById('ahb_cl_dup').checked ? 1 : 0);
                    fd.append('do_link', document.getElementById('ahb_cl_link').checked ? 1 : 0);
                    fd.append('do_src', document.getElementById('ahb_cl_src').checked ? 1 : 0);
                    fd.append('do_rewrite', document.getElementById('ahb_cl_rewrite').checked ? 1 : 0);

                    fetch(ajaxurl, { method:'POST', body:fd, credentials:'same-origin' })
                        .then(function(r){ return r.json(); })
                        .then(function(res){
                            if (!res || !res.success) {
                                log('Hata: '+ (res && res.data ? res.data : 'bilinmiyor'), 'err');
                                finalize(); return;
                            }
                            var s = res.data;
                            if (current.total === 0) current.total = s.total || 0;
                            offset = s.next_offset || (offset + parseInt(document.getElementById('ahb_cl_batch').value));
                            setBar();
                            updateTotals(s);
                            if (s.log && s.log.length) {
                                s.log.forEach(function(L){
                                    log('#'+L.id+' '+L.title.substr(0,80)+' → '+L.actions.join(', '));
                                });
                            }
                            if (s.done) {
                                log('✓ Kategori tamamlandı: '+current.name+' (toplam '+current.total+' haber işlendi)', 'ok');
                                current = null;
                            }
                            setTimeout(nextBatch, 250);
                        })
                        .catch(function(err){
                            log('Ağ hatası: '+err.message, 'err');
                            finalize();
                        });
                }

                function finalize(){
                    btnStart.disabled = false;
                    btnStop.disabled = true;
                }

                btnStart.addEventListener('click', function(){
                    if (!confirm('Bakım başlatılacak. Mükerrer haberler ve görselleri kalıcı olarak silinebilir. Devam edilsin mi?')) return;
                    btnStart.disabled = true;
                    btnStop.disabled = false;
                    stopFlag = false;
                    totals = { del:0, mer:0, lin:0, rew:0 };
                    updateTotals({});
                    document.getElementById('ahb_cleanup_progress').style.display = 'block';
                    document.getElementById('ahb_cl_log').innerHTML = '';

                    var scope = document.querySelector('input[name="ahb_cleanup_scope"]:checked').value;
                    queue = [];
                    if (scope === 'single') {
                        var sel = document.getElementById('ahb_cleanup_term');
                        var opt = sel.options[sel.selectedIndex];
                        queue.push({ term_id: parseInt(sel.value), name: opt.textContent, total: 0 });
                        nextBatch();
                    } else {
                        // Tüm kategorileri sunucudan çek
                        var fd = new FormData();
                        fd.append('action','ahb_cleanup_categories');
                        fd.append('_wpnonce', nonce);
                        fetch(ajaxurl, { method:'POST', body:fd, credentials:'same-origin' })
                            .then(function(r){ return r.json(); })
                            .then(function(res){
                                if (!res || !res.success) { log('Kategori listesi alınamadı.', 'err'); finalize(); return; }
                                queue = res.data.map(function(t){ return { term_id:t.id, name:t.name+' ('+t.count+')', total:0 }; });
                                log('Toplam '+queue.length+' kategori sırada.');
                                nextBatch();
                            });
                    }
                });

                btnStop.addEventListener('click', function(){
                    stopFlag = true;
                    log('Durdurma sinyali gönderildi…', 'err');
                });
            })();
            </script>
        </div>
        <?php
    }

    public function ajax_cleanup_categories() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_cleanup' );

        $taxonomy = sanitize_key( get_option( 'ahb_taxonomy', 'category' ) );
        if ( ! taxonomy_exists( $taxonomy ) ) wp_send_json_error( 'taksonomi yok' );

        $terms = get_terms( array( 'taxonomy' => $taxonomy, 'hide_empty' => true, 'number' => 200, 'orderby' => 'count', 'order' => 'DESC' ) );
        $out = array();
        foreach ( $terms as $t ) $out[] = array( 'id' => (int) $t->term_id, 'name' => $t->name, 'count' => (int) $t->count );
        wp_send_json_success( $out );
    }

    public function ajax_cleanup_batch() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_cleanup' );

        $term_id    = isset( $_POST['term_id'] ) ? (int) $_POST['term_id'] : 0;
        $offset     = isset( $_POST['offset'] ) ? (int) $_POST['offset'] : 0;
        $batch_size = isset( $_POST['batch_size'] ) ? max( 1, min( 50, (int) $_POST['batch_size'] ) ) : 10;
        $ai_mode    = isset( $_POST['ai_mode'] ) ? sanitize_key( $_POST['ai_mode'] ) : 'free';

        if ( ! $term_id ) wp_send_json_error( 'kategori yok' );

        @set_time_limit( 300 );
        @ini_set( 'memory_limit', '512M' );

        $openai = null;
        if ( $ai_mode !== 'free' ) {
            $api = get_option( 'ahb_openai_api_key', '' );
            if ( empty( $api ) ) wp_send_json_error( 'OpenAI API anahtarı yok — Klasik sekmesinden ekleyin' );

            // AI modeline göre geçici override
            $orig_model = get_option( 'ahb_openai_model', 'gpt-4o-mini' );
            $temp_model = $ai_mode === 'best' ? 'gpt-4o' : 'gpt-4o-mini';
            update_option( 'ahb_openai_model', $temp_model );

            $openai = new AHB_OpenAI_Client( $api );

            // Sonra orijinaline geri dön
            update_option( 'ahb_openai_model', $orig_model );
        }

        $cleanup = new AHB_Site_Cleanup( $openai );
        $opts = array(
            'ai_mode'          => $ai_mode,
            'remove_source'    => ! empty( $_POST['do_src'] ) ? 1 : 0,
            'merge_duplicates' => ! empty( $_POST['do_dup'] ) ? 1 : 0,
            'add_related'      => ! empty( $_POST['do_link'] ) ? 1 : 0,
            'rewrite_content'  => ! empty( $_POST['do_rewrite'] ) ? 1 : 0,
        );

        $stats = $cleanup->process_category_batch( $term_id, $offset, $batch_size, $opts );
        wp_send_json_success( $stats );
    }

    public function handle_run_topic_plan() {
        if ( ! current_user_can( 'manage_options' ) ) wp_die( 'Yetkisiz erişim.' );
        if ( ! isset( $_POST['ahb_nonce'] ) || ! wp_verify_nonce( $_POST['ahb_nonce'], 'ahb_run_topic_plan' ) ) {
            wp_die( 'Güvenlik doğrulaması başarısız.' );
        }

        $plugin = isset( $GLOBALS['ahb_plugin_instance'] ) ? $GLOBALS['ahb_plugin_instance'] : null;
        $stats  = array( 'created' => 0, 'skipped' => 0, 'errors' => 0, 'per_category' => array() );
        if ( $plugin && method_exists( $plugin, 'run_topic_plan_cycle' ) ) {
            $stats = $plugin->run_topic_plan_cycle( true );
        }

        $per_cat = array();
        foreach ( ( $stats['per_category'] ?? array() ) as $slug => $n ) {
            $per_cat[] = $slug . ':' . $n;
        }

        wp_redirect( add_query_arg( array(
            'page'    => 'ai-haber-botu',
            'message' => 'topic_ok',
            'created' => (int) $stats['created'],
            'skipped' => (int) $stats['skipped'],
            'errors'  => (int) $stats['errors'],
            'per'     => rawurlencode( implode( ',', $per_cat ) ),
        ), admin_url( 'admin.php' ) ) );
        exit;
    }
    public function sanitize_openai_api_key( $val ) { return sanitize_text_field( $val ); }
    public function sanitize_openai_model( $val ) { return sanitize_text_field( $val ); }
    public function sanitize_rss_sources( $val ) { return sanitize_textarea_field( $val ); }
    public function sanitize_post_status( $val ) { return in_array( $val, array( 'draft', 'publish', 'pending' ), true ) ? $val : 'draft'; }
    public function sanitize_default_category( $val ) { return absint( $val ); }
    public function sanitize_author_id( $val ) { return absint( $val ); }
    public function sanitize_schedule_interval( $val ) {
        $valid = array_keys( wp_get_schedules() );
        return in_array( $val, $valid, true ) ? $val : 'hourly';
    }
    public function sanitize_max_items_per_source( $val ) { return max( 1, min( 50, absint( $val ) ) ); }
    public function sanitize_enable_related( $val ) { return $val ? 1 : 0; }
    public function sanitize_add_source_note( $val ) { return $val ? 1 : 0; }
    public function sanitize_post_type( $val ) { return sanitize_key( $val ); }
    public function sanitize_taxonomy( $val ) { return sanitize_key( $val ); }
    public function sanitize_tag_taxonomy( $val ) { return sanitize_key( $val ); }
    public function sanitize_ai_categorize( $val ) { return $val ? 1 : 0; }
    public function sanitize_min_words( $val ) { return max( 100, min( 2000, absint( $val ) ) ); }
    public function sanitize_max_words( $val ) { return max( 200, min( 3000, absint( $val ) ) ); }
    public function sanitize_max_tokens( $val ) { return max( 800, min( 8000, absint( $val ) ) ); }
    public function sanitize_set_featured_image( $val ) { return $val ? 1 : 0; }
    public function sanitize_skip_no_image( $val ) { return $val ? 1 : 0; }
    public function sanitize_image_link_mode( $val ) { return $val ? 1 : 0; }
    public function sanitize_image_search_enabled( $val ) { return $val ? 1 : 0; }
    public function sanitize_google_cse_key( $val ) { return sanitize_text_field( trim( (string) $val ) ); }
    public function sanitize_google_cse_cx( $val ) { return sanitize_text_field( trim( (string) $val ) ); }
    public function sanitize_manual_target_count( $val ) { return max( 1, min( 50, absint( $val ) ) ); }
    public function sanitize_signature_text( $val ) { return sanitize_text_field( $val ); }

    /* ============================================================
     *  4. SEKME — KÖŞE YAZARLARI
     * ============================================================ */

    public function render_columnists_tab() {
        $nonce      = wp_create_nonce( 'ahb_columnists' );
        $columnists = AHB_Columnists::all();
        $tax        = sanitize_key( get_option( 'ahb_taxonomy', 'category' ) );
        $cats       = taxonomy_exists( $tax ) ? get_terms( array( 'taxonomy' => $tax, 'hide_empty' => false, 'number' => 200 ) ) : array();
        $wp_users   = get_users( array( 'orderby' => 'display_name', 'number' => 500 ) );

        // Diğer eklentilerin "yazar" özel post tipinden oluşturduğu yazarları bul
        // (Köşe Yazarları "ky-yazarlar", vb.)
        $ext_author_post_types = array();
        foreach ( get_post_types( array(), 'objects' ) as $pt ) {
            $needle_match = ( stripos( $pt->name, 'yazar' ) !== false )
                         || ( isset( $pt->label ) && stripos( $pt->label, 'yazar' ) !== false )
                         || in_array( $pt->name, array( 'ky_yazarlar','ky-yazarlar','kose_yazari','kose-yazari','columnist','columnists' ), true );
            if ( $needle_match && $pt->name !== sanitize_key( get_option( 'ahb_post_type', 'haber' ) ) ) {
                $ext_author_post_types[ $pt->name ] = $pt->label ?: $pt->name;
            }
        }
        $ext_authors = array();
        if ( ! empty( $ext_author_post_types ) ) {
            $posts = get_posts( array(
                'post_type'   => array_keys( $ext_author_post_types ),
                'numberposts' => 300,
                'post_status' => array( 'publish', 'draft', 'private' ),
                'orderby'     => 'title',
                'order'       => 'ASC',
            ) );
            foreach ( $posts as $p ) {
                $ext_authors[] = array(
                    'id'       => (int) $p->ID,
                    'title'    => $p->post_title,
                    'pt'       => $p->post_type,
                    'pt_label' => $ext_author_post_types[ $p->post_type ],
                    'thumb'    => get_the_post_thumbnail_url( $p->ID, 'thumbnail' ),
                );
            }
        }

        // ─────────────────────────────────────────────────────────────
        // Köşe Yazarı eklentisi (ky-yazarlar) gibi CUSTOM TABLE bazlı
        // yazarları da tara. Tablolarda "yazar" içerenleri otomatik bul,
        // kolonları sezgisel eşle (id, isim/ad, foto, ünvan/kose_adi, durum).
        // ─────────────────────────────────────────────────────────────
        global $wpdb;
        $ext_table_authors = array();
        $tables = $wpdb->get_col( "SHOW TABLES LIKE '%" . esc_sql( $wpdb->esc_like( 'yazar' ) ) . "%'" );
        if ( ! is_array( $tables ) ) $tables = array();
        $skip_re = '/(ahb_|ahbrss_|_log|_makale|_yazi|_post|_meta|_relation)/i';
        foreach ( $tables as $tbl ) {
            if ( preg_match( $skip_re, $tbl ) ) continue;
            // Sadece "yazar" sözcüğünü içeren ana tablolar (yazarlar, ky_yazarlar, kose_yazari…)
            $cols_arr = $wpdb->get_results( "SHOW COLUMNS FROM `" . esc_sql( $tbl ) . "`" );
            if ( ! $cols_arr ) continue;
            $cols = array();
            foreach ( $cols_arr as $c ) { $cols[] = strtolower( $c->Field ); }

            $find = function( $cands ) use ( $cols ) {
                foreach ( $cands as $cand ) {
                    if ( in_array( strtolower( $cand ), $cols, true ) ) return $cand;
                }
                return null;
            };
            $col_id     = $find( array( 'id', 'yazar_id', 'ID' ) );
            $col_name   = $find( array( 'isim', 'ad', 'adi', 'ad_soyad', 'adsoyad', 'name', 'baslik', 'title', 'tam_isim', 'fullname' ) );
            $col_avatar = $find( array( 'foto', 'avatar', 'resim', 'image', 'photo', 'picture', 'profil_foto', 'foto_url' ) );
            $col_unvan  = $find( array( 'unvan', 'kose_adi', 'kose', 'kose_ismi', 'gorev', 'meslek', 'sifat' ) );
            $col_slug   = $find( array( 'slug', 'url', 'link', 'permalink' ) );
            $col_aktif  = $find( array( 'aktif', 'durum', 'status', 'active', 'yayinda', 'yayinlandi' ) );
            $col_bio    = $find( array( 'biyografi', 'bio', 'aciklama', 'hakkinda', 'description', 'about' ) );

            if ( ! $col_id || ! $col_name ) continue;

            $rows = $wpdb->get_results( "SELECT * FROM `" . esc_sql( $tbl ) . "` ORDER BY `" . esc_sql( $col_name ) . "` ASC LIMIT 300" );
            if ( ! $rows ) continue;
            foreach ( $rows as $r ) {
                $aktif_raw = $col_aktif ? $r->{$col_aktif} : 1;
                $is_aktif  = ( $aktif_raw === '1' || $aktif_raw === 1 || strtolower( (string) $aktif_raw ) === 'aktif' || strtolower( (string) $aktif_raw ) === 'yayinda' || strtolower( (string) $aktif_raw ) === 'active' || $aktif_raw === true );
                $ext_table_authors[] = array(
                    'tbl'    => $tbl,
                    'id'     => (int) $r->{$col_id},
                    'name'   => $col_name   ? (string) $r->{$col_name}   : '',
                    'avatar' => $col_avatar ? (string) $r->{$col_avatar} : '',
                    'unvan'  => $col_unvan  ? (string) $r->{$col_unvan}  : '',
                    'slug'   => $col_slug   ? (string) $r->{$col_slug}   : '',
                    'bio'    => $col_bio    ? (string) $r->{$col_bio}    : '',
                    'aktif'  => $is_aktif ? 1 : 0,
                );
            }
        }

        $days = array(
            'mon' => 'Pazartesi', 'tue' => 'Salı', 'wed' => 'Çarşamba',
            'thu' => 'Perşembe',  'fri' => 'Cuma', 'sat' => 'Cumartesi', 'sun' => 'Pazar',
        );
        ?>
        <div class="ahb-card" data-ahb-tab="columnists" style="border-left:4px solid #8c52ff;">
            <h2>✍️ Köşe Yazarları</h2>
            <?php if ( isset( $_GET['iea'] ) ) : ?>
                <?php if ( $_GET['iea'] === 'ok' ) : ?>
                    <div class="notice notice-success" style="margin:0 0 12px;"><p>✅ Köşe yazarı başarıyla içeri aktarıldı. Aşağıda "Mevcut Yazarlar" listesinde görebilir, konu/saat atayıp "▶ Şimdi Yazdır" ile test edebilirsiniz.</p></div>
                <?php elseif ( $_GET['iea'] === 'err_user' ) : ?>
                    <div class="notice notice-error" style="margin:0 0 12px;"><p>❌ İçeri aktarma sırasında WordPress kullanıcı hesabı oluşturulamadı. Lütfen başka bir kullanıcı adıyla deneyin veya admin'inizi kontrol edin.</p></div>
                <?php else : ?>
                    <div class="notice notice-error" style="margin:0 0 12px;"><p>❌ İçeri aktarma başarısız. Yazar bilgileri eksik olabilir.</p></div>
                <?php endif; ?>
            <?php endif; ?>
            <p style="margin:0 0 12px;color:#444;">
                Her gün otomatik köşe yazısı üreten yazarlar. <strong>Mevcut WP yazarınızı</strong> seçip ona konu atayabilir,
                ya da <strong>tamamen yapay zeka</strong> bir köşe yazarı oluşturabilirsiniz (AI üretimli profil fotoğrafı dahil).
                Her yazar için tek bir konu (ör. "Teknoloji") veya <strong>haftanın günlerine göre farklı konular</strong>
                (Pzt: Yemek, Salı: Seyahat, ...) tanımlayabilirsiniz. Konu çakışırsa uyarı gösterilir.
            </p>
            <p style="margin:0 0 16px;padding:10px 12px;background:#f0e7ff;border-left:4px solid #8c52ff;color:#3d2065;font-size:13px;">
                ℹ️ Botun zamanlayıcısı her saat çalışır. Yazarın <strong>günlük yazma saati</strong> geldiğinde
                ve o gün için tanımlı bir konu varsa, yazı otomatik üretilir. Sayfa açık olmasına gerek yok.
            </p>

            <h3 style="margin-top:20px;">📋 Mevcut Yazarlar</h3>
            <table class="widefat striped" id="ahb_col_list">
                <thead>
                    <tr>
                        <th style="width:60px;">Foto</th>
                        <th>Yazar</th>
                        <th>Tip</th>
                        <th>Bugünkü Konu</th>
                        <th>Saat</th>
                        <th>Son Yazı</th>
                        <th style="width:60px;">Aktif</th>
                        <th style="width:280px;">İşlem</th>
                    </tr>
                </thead>
                <tbody>
                <?php if ( empty( $columnists ) ) : ?>
                    <tr><td colspan="8" style="text-align:center;color:#888;padding:20px;">Henüz yazar eklenmemiş. Aşağıdan yeni yazar ekleyin.</td></tr>
                <?php else : foreach ( $columnists as $c ) :
                    $today_topic = AHB_Columnists::todays_topic( $c );
                    $avatar_url  = ! empty( $c['avatar_id'] ) ? wp_get_attachment_image_url( (int) $c['avatar_id'], 'thumbnail' ) : get_avatar_url( (int) $c['wp_user_id'], array( 'size' => 60 ) );
                    ?>
                    <tr data-col-id="<?php echo esc_attr( $c['id'] ); ?>">
                        <td><img src="<?php echo esc_url( $avatar_url ); ?>" style="width:48px;height:48px;border-radius:50%;object-fit:cover;"></td>
                        <td>
                            <strong><?php echo esc_html( $c['name'] ); ?></strong>
                            <?php if ( ! empty( $c['bio'] ) ) : ?>
                                <br><span style="font-size:11px;color:#666;"><?php echo esc_html( mb_substr( $c['bio'], 0, 70 ) ); ?>…</span>
                            <?php endif; ?>
                        </td>
                        <td><?php echo $c['type'] === 'ai' ? '🤖 AI' : '👤 WP'; ?></td>
                        <td><?php echo $today_topic ? '<strong>' . esc_html( $today_topic ) . '</strong>' : '<em style="color:#999;">— bugün konu yok —</em>'; ?></td>
                        <td><?php echo esc_html( isset( $c['post_time'] ) ? $c['post_time'] : '09:00' ); ?></td>
                        <td><?php echo ! empty( $c['last_run_date'] ) ? esc_html( $c['last_run_date'] ) : '<span style="color:#999;">—</span>'; ?></td>
                        <td><?php echo ! empty( $c['active'] ) ? '✅' : '⏸'; ?></td>
                        <td>
                            <button type="button" class="button button-small ahb-col-edit">✏️ Düzenle</button>
                            <button type="button" class="button button-small ahb-col-run" style="background:#00a32a;color:#fff;border-color:#00a32a;">▶ Şimdi Yazdır</button>
                            <button type="button" class="button button-small ahb-col-del" style="color:#d63638;">🗑</button>
                        </td>
                    </tr>
                <?php endforeach; endif; ?>
                </tbody>
            </table>

            <?php if ( ! empty( $ext_table_authors ) ) : ?>
            <h3 style="margin-top:30px;">🔍 Sitedeki Diğer Köşe Yazarları (Eklentiden Tespit Edildi)</h3>
            <p style="margin:0 0 12px;color:#3d2065;background:#f0e7ff;padding:10px 12px;border-left:4px solid #8c52ff;font-size:13px;">
                Aşağıda <strong>"Köşe Yazarı" (ky-yazarlar) gibi başka bir eklentinin</strong> kendi tablosunda tuttuğu yazarlar listeleniyor.
                Bu yazarlar Ahenk Ai İçerik Robotu'nun otomatik yazma sistemi tarafından <em>doğrudan</em> kullanılamaz —
                "İçeri Aktar" butonuna basarsanız, sistem o yazarın <strong>adını, biyografisini ve fotoğrafını alarak</strong>
                size aynı isimde bir <strong>AI köşe yazarı</strong> oluşturur. Sonra konu/saat atayabilirsiniz; bot her gün otomatik yazar.
            </p>
            <table class="widefat striped">
                <thead>
                    <tr>
                        <th style="width:60px;">Foto</th>
                        <th>Yazar</th>
                        <th>Köşe / Ünvan</th>
                        <th>Kaynak Tablo</th>
                        <th style="width:60px;">Aktif</th>
                        <th style="width:160px;">İşlem</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ( $ext_table_authors as $ta ) :
                    $av = $ta['avatar'];
                    if ( $av && ! preg_match( '~^https?://~i', $av ) ) {
                        // göreceli yol — admin tarafından servis edilemez, atla
                        $av = '';
                    }
                    if ( ! $av ) {
                        $av = 'data:image/svg+xml;utf8,' . rawurlencode( '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" rx="24" fill="#e9d5ff"/><text x="50%" y="55%" font-size="20" text-anchor="middle" fill="#8c52ff" font-family="Arial">👤</text></svg>' );
                    }
                    $import_nonce = wp_create_nonce( 'ahb_import_ext_author' );
                ?>
                    <tr>
                        <td><img src="<?php echo esc_url( $av ); ?>" style="width:48px;height:48px;border-radius:50%;object-fit:cover;background:#f3e8ff;"></td>
                        <td>
                            <strong><?php echo esc_html( $ta['name'] ); ?></strong>
                            <?php if ( ! empty( $ta['bio'] ) ) : ?>
                                <br><span style="font-size:11px;color:#666;"><?php echo esc_html( mb_substr( wp_strip_all_tags( $ta['bio'] ), 0, 80 ) ); ?>…</span>
                            <?php endif; ?>
                        </td>
                        <td><?php echo $ta['unvan'] ? esc_html( $ta['unvan'] ) : '<span style="color:#999;">—</span>'; ?></td>
                        <td><code style="font-size:11px;color:#666;"><?php echo esc_html( $ta['tbl'] ); ?></code></td>
                        <td><?php echo $ta['aktif'] ? '✅' : '⏸'; ?></td>
                        <td>
                            <form method="post" style="display:inline;" onsubmit="return confirm('<?php echo esc_attr( $ta['name'] ); ?> adıyla AI köşe yazarı oluşturulacak. Devam edilsin mi?');">
                                <?php wp_nonce_field( 'ahb_import_ext_author', 'ahb_iea_nonce' ); ?>
                                <input type="hidden" name="ahb_action" value="import_ext_author">
                                <input type="hidden" name="src_tbl"    value="<?php echo esc_attr( $ta['tbl'] ); ?>">
                                <input type="hidden" name="src_id"     value="<?php echo (int) $ta['id']; ?>">
                                <input type="hidden" name="src_name"   value="<?php echo esc_attr( $ta['name'] ); ?>">
                                <input type="hidden" name="src_unvan"  value="<?php echo esc_attr( $ta['unvan'] ); ?>">
                                <input type="hidden" name="src_bio"    value="<?php echo esc_attr( $ta['bio'] ); ?>">
                                <input type="hidden" name="src_avatar" value="<?php echo esc_attr( $av ); ?>">
                                <button type="submit" class="button button-small" style="background:#8c52ff;color:#fff;border-color:#8c52ff;">⬇ İçeri Aktar (AI Yazar Yap)</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
            <?php endif; ?>

            <h3 style="margin-top:30px;">➕ Yeni / Düzenle</h3>
            <div id="ahb_col_form" style="background:#f6f7f7;padding:18px;border:1px solid #c3c4c7;border-radius:6px;">
                <input type="hidden" id="col_id" value="">
                <table class="form-table">
                    <tr>
                        <th>Yazar Tipi</th>
                        <td>
                            <label><input type="radio" name="col_type" value="ai" checked> 🤖 <strong>Yeni AI Yazar oluştur</strong></label> &nbsp;
                            <?php if ( ! empty( $ext_authors ) ) : ?>
                                <label><input type="radio" name="col_type" value="ext"> 📰 <strong>Eklenti Yazarımı seç</strong> <span style="color:#8c52ff;">(<?php echo count( $ext_authors ); ?> bulundu)</span></label> &nbsp;
                            <?php endif; ?>
                            <label><input type="radio" name="col_type" value="wp"> 👤 <strong>WP Kullanıcısı seç</strong></label>
                        </td>
                    </tr>

                    <tr class="ahb-row-wp" style="display:none;">
                        <th>WP Kullanıcı</th>
                        <td>
                            <select id="col_wp_user_id" style="min-width:280px;">
                                <option value="">— Seçin —</option>
                                <?php foreach ( $wp_users as $u ) : ?>
                                    <option value="<?php echo (int) $u->ID; ?>"><?php echo esc_html( $u->display_name ); ?> (<?php echo esc_html( $u->user_login ); ?>)</option>
                                <?php endforeach; ?>
                            </select>
                            <p class="description">Bu kullanıcı adına yazılar yayınlanır.</p>
                        </td>
                    </tr>

                    <tr class="ahb-row-ext" style="display:none;">
                        <th>Eklenti Yazarı</th>
                        <td>
                            <select id="col_ext_id" style="min-width:340px;">
                                <option value="">— Seçin —</option>
                                <?php
                                // post_type'a göre grupla
                                $grouped = array();
                                foreach ( $ext_authors as $a ) {
                                    $grouped[ $a['pt_label'] ][] = $a;
                                }
                                foreach ( $grouped as $label => $items ) :
                                ?>
                                    <optgroup label="<?php echo esc_attr( $label ); ?>">
                                        <?php foreach ( $items as $a ) : ?>
                                            <option value="<?php echo (int) $a['id']; ?>"
                                                    data-title="<?php echo esc_attr( $a['title'] ); ?>"
                                                    data-thumb="<?php echo esc_attr( $a['thumb'] ?: '' ); ?>"
                                                    data-pt="<?php echo esc_attr( $a['pt'] ); ?>">
                                                <?php echo esc_html( $a['title'] ); ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </optgroup>
                                <?php endforeach; ?>
                            </select>
                            <p class="description">
                                Diğer eklentilerinizin yazar tanımları (örn. <strong>Köşe Yazarları</strong> ⇒ <code>ky-yazarlar</code>).
                                Seçtiğinizde isim ve profil fotoğrafı otomatik dolar — siz sadece konuyu ve programı belirleyin.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <th>Yazar Adı</th>
                        <td>
                            <input type="text" id="col_name" class="regular-text" placeholder="Örn: Ayşe Öztürk">
                            <p class="description">AI yazar için sergilenecek isim. WP yazar seçtiyseniz otomatik dolar.</p>
                        </td>
                    </tr>

                    <tr class="ahb-row-ai">
                        <th>Cinsiyet</th>
                        <td>
                            <label><input type="radio" name="col_gender" value="female" checked> 👩 Kadın</label>
                            <label style="margin-left:15px;"><input type="radio" name="col_gender" value="male"> 👨 Erkek</label>
                            <label style="margin-left:15px;"><input type="radio" name="col_gender" value="other"> Belirtilmemiş</label>
                        </td>
                    </tr>

                    <tr class="ahb-row-ai">
                        <th>Profil Fotoğrafı</th>
                        <td>
                            <div id="col_avatar_preview" style="margin-bottom:8px;">
                                <img id="col_avatar_img" src="" alt="" style="width:120px;height:120px;border-radius:50%;border:3px solid #ddd;object-fit:cover;display:none;">
                                <input type="hidden" id="col_avatar_id" value="0">
                            </div>
                            <input type="text" id="col_avatar_prompt" class="large-text"
                                   placeholder="Örn: Lüks ofiste, takım elbiseli profesyonel kadın gazeteci portresi, doğal aydınlatma, fotoğraf gerçekçi">
                            <p class="description">AI'ya görsel için talimat yazın. Boş bırakırsanız cinsiyete göre standart profesyonel portre üretilir.</p>
                            <p style="margin-top:8px;">
                                <button type="button" class="button" id="col_btn_gen_avatar">🎨 AI ile Görsel Üret (~$0.04)</button>
                                <button type="button" class="button" id="col_btn_upload">📤 Veya Bilgisayardan Yükle</button>
                                <input type="file" id="col_file_input" accept="image/*" style="display:none;">
                            </p>
                        </td>
                    </tr>

                    <tr class="ahb-row-ai">
                        <th>Biyografi</th>
                        <td>
                            <textarea id="col_bio" class="large-text" rows="2" placeholder="Kısa profesyonel biyografi (30-60 kelime)"></textarea>
                            <p style="margin-top:6px;">
                                <button type="button" class="button button-small" id="col_btn_gen_bio">🪄 AI ile Biyografi Üret</button>
                                <span style="color:#666;font-size:11px;">(önce isim ve cinsiyet doldurun)</span>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <th>Üslup / Ton</th>
                        <td>
                            <select id="col_tone" style="min-width:280px;">
                                <option value="samimi ve özgün">Samimi ve Özgün</option>
                                <option value="akademik ve analitik">Akademik / Analitik</option>
                                <option value="esprili ve eğlenceli">Esprili / Eğlenceli</option>
                                <option value="eleştirel ve keskin">Eleştirel / Keskin</option>
                                <option value="ilham verici ve motive edici">İlham Verici / Motive</option>
                                <option value="profesyonel ve uzman">Profesyonel / Uzman</option>
                                <option value="duygusal ve hikaye anlatıcı">Duygusal / Hikaye</option>
                            </select>
                        </td>
                    </tr>

                    <tr>
                        <th>Konu Programı</th>
                        <td>
                            <label><input type="radio" name="col_sched" value="single" checked> <strong>Tek konu</strong> (her gün aynı)</label>
                            <label style="margin-left:18px;"><input type="radio" name="col_sched" value="weekly"> <strong>Haftalık plan</strong> (gün gün farklı konu)</label>

                            <div class="ahb-sched-single" style="margin-top:10px;">
                                <input type="text" id="col_topic_single" class="regular-text" placeholder="Örn: Teknoloji, Sağlık, Ekonomi, Yemek...">
                                <p class="description">Bu yazar her gün bu konu çevresinde özgün yazı yazacak.</p>
                            </div>

                            <div class="ahb-sched-weekly" style="display:none;margin-top:10px;background:#fff;padding:12px;border:1px solid #ddd;border-radius:4px;">
                                <p style="margin:0 0 10px;color:#555;">Boş bıraktığınız günlerde yazı üretilmez:</p>
                                <?php foreach ( $days as $k => $label ) : ?>
                                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                                        <label style="width:90px;font-weight:600;"><?php echo esc_html( $label ); ?></label>
                                        <input type="text" data-day="<?php echo esc_attr( $k ); ?>" class="ahb-col-day" style="flex:1;" placeholder="O günün konusu (boş bırakılabilir)">
                                    </div>
                                <?php endforeach; ?>
                            </div>

                            <div id="col_conflict_warn" style="display:none;margin-top:10px;padding:8px 10px;background:#fff8e5;border-left:4px solid #dba617;color:#674d00;font-size:13px;"></div>
                        </td>
                    </tr>

                    <tr>
                        <th>Kategori</th>
                        <td>
                            <select id="col_category_id" style="min-width:240px;">
                                <option value="0">— Yok —</option>
                                <?php foreach ( $cats as $cat ) : ?>
                                    <option value="<?php echo (int) $cat->term_id; ?>"><?php echo esc_html( $cat->name ); ?></option>
                                <?php endforeach; ?>
                            </select>
                            <p class="description">Yazılar bu kategoriye atanır (opsiyonel).</p>
                        </td>
                    </tr>

                    <tr>
                        <th>Yazma Saati</th>
                        <td>
                            <input type="time" id="col_post_time" value="09:00">
                            <span style="color:#666;font-size:12px;margin-left:6px;">Bu saat geldiğinde günün yazısı üretilir.</span>
                        </td>
                    </tr>

                    <tr>
                        <th>Yazı Uzunluğu</th>
                        <td>
                            <input type="number" id="col_word_count" value="600" min="200" max="2000" style="width:100px;"> kelime
                        </td>
                    </tr>

                    <tr>
                        <th>Yayın Durumu</th>
                        <td>
                            <select id="col_post_status">
                                <option value="publish">Yayınla (canlıya çıkar)</option>
                                <option value="draft">Taslak (önce ben okuyayım)</option>
                                <option value="pending">Onay bekleniyor</option>
                            </select>
                        </td>
                    </tr>

                    <tr>
                        <th>Aktif</th>
                        <td>
                            <label><input type="checkbox" id="col_active" checked> Otomatik yazı üretimini bu yazar için aç</label>
                        </td>
                    </tr>
                </table>

                <p>
                    <button type="button" class="button button-primary button-hero" id="col_btn_save">💾 Yazarı Kaydet</button>
                    <button type="button" class="button" id="col_btn_reset">↺ Formu Temizle</button>
                </p>
                <div id="col_msg" style="margin-top:8px;"></div>
            </div>

            <script>
            (function(){
                var nonce = '<?php echo esc_js( $nonce ); ?>';
                var ajaxurl = '<?php echo esc_js( admin_url( 'admin-ajax.php' ) ); ?>';
                var data = <?php echo wp_json_encode( $columnists ); ?>;

                function $(id){ return document.getElementById(id); }
                function setMsg(msg, ok){
                    $('col_msg').innerHTML = '<div class="notice notice-'+(ok?'success':'error')+' inline"><p>'+msg+'</p></div>';
                    setTimeout(function(){ $('col_msg').innerHTML=''; }, 6000);
                }

                function syncRows(){
                    var t = document.querySelector('input[name="col_type"]:checked').value;
                    document.querySelectorAll('.ahb-row-wp').forEach(function(r){ r.style.display = t==='wp'?'':'none'; });
                    document.querySelectorAll('.ahb-row-ext').forEach(function(r){ r.style.display = t==='ext'?'':'none'; });
                    // AI'a özel alanlar (cinsiyet, AI görsel butonları, biyografi üretici) sadece AI modunda
                    document.querySelectorAll('.ahb-row-ai').forEach(function(r){ r.style.display = t==='ai'?'':'none'; });
                }
                function syncSched(){
                    var s = document.querySelector('input[name="col_sched"]:checked').value;
                    document.querySelectorAll('.ahb-sched-single').forEach(function(r){ r.style.display = s==='single'?'':'none'; });
                    document.querySelectorAll('.ahb-sched-weekly').forEach(function(r){ r.style.display = s==='weekly'?'':'none'; });
                }
                document.querySelectorAll('input[name="col_type"]').forEach(function(r){ r.addEventListener('change', syncRows); });
                document.querySelectorAll('input[name="col_sched"]').forEach(function(r){ r.addEventListener('change', syncSched); });

                function resetForm(){
                    $('col_id').value = '';
                    $('col_name').value = '';
                    $('col_bio').value = '';
                    $('col_avatar_id').value = '0';
                    $('col_avatar_img').style.display = 'none';
                    $('col_avatar_img').src = '';
                    $('col_avatar_prompt').value = '';
                    $('col_topic_single').value = '';
                    document.querySelectorAll('.ahb-col-day').forEach(function(i){ i.value=''; });
                    $('col_post_time').value = '09:00';
                    $('col_word_count').value = '600';
                    $('col_active').checked = true;
                    $('col_post_status').value = 'publish';
                    $('col_category_id').value = '0';
                    $('col_wp_user_id').value = '';
                    if ($('col_ext_id')) $('col_ext_id').value = '';
                    document.querySelector('input[name="col_type"][value="ai"]').checked = true;
                    document.querySelector('input[name="col_sched"][value="single"]').checked = true;
                    document.querySelector('input[name="col_gender"][value="female"]').checked = true;
                    syncRows(); syncSched();
                    $('col_conflict_warn').style.display = 'none';
                }

                $('col_btn_reset').addEventListener('click', resetForm);

                // Edit
                document.querySelectorAll('.ahb-col-edit').forEach(function(btn){
                    btn.addEventListener('click', function(){
                        var id = btn.closest('tr').dataset.colId;
                        var c = data[id]; if (!c) return;
                        $('col_id').value = c.id;
                        document.querySelector('input[name="col_type"][value="'+c.type+'"]').checked = true;
                        $('col_name').value = c.name || '';
                        $('col_bio').value = c.bio || '';
                        $('col_tone').value = c.tone || 'samimi ve özgün';
                        $('col_avatar_id').value = c.avatar_id || 0;
                        if (c.avatar_id) {
                            // Async fetch attachment URL? We have it from the row image:
                            var rowImg = btn.closest('tr').querySelector('img');
                            $('col_avatar_img').src = rowImg ? rowImg.src : '';
                            $('col_avatar_img').style.display = 'inline-block';
                        }
                        $('col_avatar_prompt').value = c.avatar_prompt || '';
                        document.querySelector('input[name="col_gender"][value="'+(c.gender||'female')+'"]').checked = true;
                        $('col_post_time').value = c.post_time || '09:00';
                        $('col_word_count').value = c.word_count || 600;
                        $('col_post_status').value = c.post_status || 'publish';
                        $('col_active').checked = !!c.active;
                        $('col_category_id').value = c.category_id || 0;
                        $('col_wp_user_id').value = c.type==='wp' ? (c.wp_user_id||'') : '';
                        if ($('col_ext_id')) $('col_ext_id').value = c.type==='ext' ? (c.ext_id||'') : '';
                        document.querySelector('input[name="col_sched"][value="'+(c.schedule_mode||'single')+'"]').checked = true;
                        $('col_topic_single').value = c.topic_single || '';
                        document.querySelectorAll('.ahb-col-day').forEach(function(i){
                            var d = i.dataset.day;
                            i.value = (c.topics_weekly && c.topics_weekly[d]) ? c.topics_weekly[d] : '';
                        });
                        syncRows(); syncSched();
                        window.scrollTo({ top: $('ahb_col_form').offsetTop - 60, behavior:'smooth' });
                    });
                });

                // Delete
                document.querySelectorAll('.ahb-col-del').forEach(function(btn){
                    btn.addEventListener('click', function(){
                        var id = btn.closest('tr').dataset.colId;
                        var c = data[id]; if (!c) return;
                        if (!confirm('"'+c.name+'" yazarı silinsin mi? '+(c.type==='ai' ? 'AI yazarsa profil resmi ve WP kullanıcı kaydı da silinir.' : 'WP kullanıcı silinmez, sadece bot listesinden çıkarılır.'))) return;
                        var fd = new FormData();
                        fd.append('action','ahb_columnist_delete');
                        fd.append('_wpnonce', nonce);
                        fd.append('id', id);
                        fetch(ajaxurl,{method:'POST',body:fd,credentials:'same-origin'})
                            .then(function(r){ return r.json(); })
                            .then(function(res){
                                if (res && res.success) location.reload();
                                else alert('Silme başarısız: '+(res && res.data ? res.data : 'bilinmiyor'));
                            });
                    });
                });

                // Run now
                document.querySelectorAll('.ahb-col-run').forEach(function(btn){
                    btn.addEventListener('click', function(){
                        var id = btn.closest('tr').dataset.colId;
                        var c = data[id]; if (!c) return;
                        var topic = prompt('"'+c.name+'" için yazılacak konuyu girin (boş bırakırsanız bugünkü plan kullanılır):', '');
                        if (topic === null) return;
                        btn.disabled = true; btn.textContent = '⏳ Yazılıyor...';
                        var fd = new FormData();
                        fd.append('action','ahb_columnist_run');
                        fd.append('_wpnonce', nonce);
                        fd.append('id', id);
                        fd.append('topic', topic);
                        fetch(ajaxurl,{method:'POST',body:fd,credentials:'same-origin'})
                            .then(function(r){ return r.json(); })
                            .then(function(res){
                                btn.disabled = false; btn.textContent = '▶ Şimdi Yazdır';
                                if (res && res.success) {
                                    if (confirm('Yazı oluşturuldu (Post #'+res.data.post_id+')\n\nBaşlık: '+res.data.title+'\n\nDüzenleme sayfasını aç?')) {
                                        window.open(res.data.edit_url, '_blank');
                                    }
                                    location.reload();
                                } else {
                                    alert('Hata: '+(res && res.data ? res.data : 'bilinmiyor'));
                                }
                            });
                    });
                });

                // Generate avatar
                $('col_btn_gen_avatar').addEventListener('click', function(){
                    var name = $('col_name').value.trim();
                    if (!name) { alert('Önce yazar adını yazın.'); return; }
                    var prompt = $('col_avatar_prompt').value.trim();
                    var gender = document.querySelector('input[name="col_gender"]:checked').value;
                    var btn = this;
                    btn.disabled = true; btn.textContent = '🎨 Üretiliyor (15-30 sn)...';
                    var fd = new FormData();
                    fd.append('action','ahb_columnist_avatar');
                    fd.append('_wpnonce', nonce);
                    fd.append('name', name);
                    fd.append('gender', gender);
                    fd.append('prompt', prompt);
                    fetch(ajaxurl,{method:'POST',body:fd,credentials:'same-origin'})
                        .then(function(r){ return r.json(); })
                        .then(function(res){
                            btn.disabled = false; btn.textContent = '🎨 AI ile Görsel Üret (~$0.04)';
                            if (res && res.success) {
                                $('col_avatar_id').value = res.data.id;
                                $('col_avatar_img').src = res.data.url;
                                $('col_avatar_img').style.display = 'inline-block';
                                setMsg('Görsel üretildi ve medya kütüphanesine eklendi.', true);
                            } else {
                                alert('Görsel üretilemedi: '+(res && res.data ? res.data : 'bilinmiyor'));
                            }
                        });
                });

                // Upload local
                $('col_btn_upload').addEventListener('click', function(){ $('col_file_input').click(); });
                $('col_file_input').addEventListener('change', function(){
                    var f = this.files[0]; if (!f) return;
                    var fd = new FormData();
                    fd.append('action','ahb_columnist_avatar');
                    fd.append('_wpnonce', nonce);
                    fd.append('upload', '1');
                    fd.append('file', f);
                    fd.append('name', $('col_name').value.trim() || 'yazar');
                    fetch(ajaxurl,{method:'POST',body:fd,credentials:'same-origin'})
                        .then(function(r){ return r.json(); })
                        .then(function(res){
                            if (res && res.success) {
                                $('col_avatar_id').value = res.data.id;
                                $('col_avatar_img').src = res.data.url;
                                $('col_avatar_img').style.display = 'inline-block';
                                setMsg('Görsel yüklendi.', true);
                            } else {
                                alert('Yükleme başarısız: '+(res && res.data ? res.data : 'bilinmiyor'));
                            }
                        });
                });

                // Generate bio
                $('col_btn_gen_bio').addEventListener('click', function(){
                    var name = $('col_name').value.trim();
                    if (!name) { alert('Önce yazar adını yazın.'); return; }
                    var gender = document.querySelector('input[name="col_gender"]:checked').value;
                    var topic = $('col_topic_single').value.trim() || 'genel köşe yazarlığı';
                    var btn = this;
                    btn.disabled = true; btn.textContent = '🪄 Üretiliyor...';
                    var fd = new FormData();
                    fd.append('action','ahb_columnist_bio');
                    fd.append('_wpnonce', nonce);
                    fd.append('name', name);
                    fd.append('gender', gender);
                    fd.append('expertise', topic);
                    fetch(ajaxurl,{method:'POST',body:fd,credentials:'same-origin'})
                        .then(function(r){ return r.json(); })
                        .then(function(res){
                            btn.disabled = false; btn.textContent = '🪄 AI ile Biyografi Üret';
                            if (res && res.success) $('col_bio').value = res.data;
                            else alert('Biyografi üretilemedi.');
                        });
                });

                // Auto-fill name when WP user picked
                $('col_wp_user_id').addEventListener('change', function(){
                    if (this.value && !$('col_name').value) {
                        var opt = this.options[this.selectedIndex];
                        $('col_name').value = opt.textContent.replace(/\s*\([^)]*\)\s*$/,'');
                    }
                });

                // Auto-fill name+avatar when external author picked
                var extSel = $('col_ext_id');
                if (extSel) {
                    extSel.addEventListener('change', function(){
                        if (!this.value) return;
                        var opt = this.options[this.selectedIndex];
                        var title = opt.dataset.title || opt.textContent;
                        var thumb = opt.dataset.thumb || '';
                        $('col_name').value = title;
                        if (thumb) {
                            $('col_avatar_img').src = thumb;
                            $('col_avatar_img').style.display = 'inline-block';
                            // ext modunda avatar_id 0 kalır; sunucu ext_id üzerinden featured image'ı kendisi alır
                            $('col_avatar_id').value = '0';
                        }
                    });
                }

                // Conflict check (basic: only on save we'll show it from server response too)
                function checkConflicts(){
                    var sched = document.querySelector('input[name="col_sched"]:checked').value;
                    var current_id = $('col_id').value;
                    var conflicts = [];
                    var inputs = (sched === 'single')
                        ? [{ day:null, topic: $('col_topic_single').value.trim() }]
                        : Array.from(document.querySelectorAll('.ahb-col-day')).map(function(i){ return { day:i.dataset.day, topic:i.value.trim() }; });
                    function norm(s){ return (s||'').toLowerCase().replace(/[^a-z0-9çğıöşü]+/gi,''); }
                    inputs.forEach(function(it){
                        if (!it.topic) return;
                        Object.keys(data).forEach(function(cid){
                            if (cid === current_id) return;
                            var c = data[cid];
                            var theirs = (c.schedule_mode==='single') ? (c.topic_single?[c.topic_single]:[]) : (it.day && c.topics_weekly ? (c.topics_weekly[it.day]?[c.topics_weekly[it.day]]:[]) : Object.values(c.topics_weekly||{}));
                            theirs.forEach(function(t){
                                if (norm(t) === norm(it.topic)) conflicts.push({name:c.name, topic:t, day:it.day});
                            });
                        });
                    });
                    var w = $('col_conflict_warn');
                    if (conflicts.length){
                        w.innerHTML = '⚠️ <strong>Konu çakışması:</strong> ' + conflicts.map(function(x){ return x.name+' ("'+x.topic+'"'+(x.day?', '+x.day:'')+')'; }).join('; ') + '. Yine de kaydedebilirsiniz.';
                        w.style.display='block';
                    } else {
                        w.style.display='none';
                    }
                }
                $('col_topic_single').addEventListener('blur', checkConflicts);
                document.querySelectorAll('.ahb-col-day').forEach(function(i){ i.addEventListener('blur', checkConflicts); });

                // Save
                $('col_btn_save').addEventListener('click', function(){
                    var t = document.querySelector('input[name="col_type"]:checked').value;
                    var name = $('col_name').value.trim();
                    if (!name){ alert('Yazar adı zorunlu.'); return; }
                    if (t === 'wp' && !$('col_wp_user_id').value){ alert('WP kullanıcı seçin.'); return; }
                    if (t === 'ext' && (!$('col_ext_id') || !$('col_ext_id').value)){ alert('Eklenti yazarı seçin.'); return; }

                    var weekly = {};
                    document.querySelectorAll('.ahb-col-day').forEach(function(i){ if(i.value.trim()) weekly[i.dataset.day]=i.value.trim(); });

                    var fd = new FormData();
                    fd.append('action','ahb_columnist_save');
                    fd.append('_wpnonce', nonce);
                    fd.append('id', $('col_id').value);
                    fd.append('type', t);
                    fd.append('wp_user_id', $('col_wp_user_id').value || 0);
                    fd.append('ext_id', ($('col_ext_id') ? $('col_ext_id').value : '') || 0);
                    fd.append('name', name);
                    fd.append('gender', document.querySelector('input[name="col_gender"]:checked').value);
                    fd.append('avatar_id', $('col_avatar_id').value || 0);
                    fd.append('avatar_prompt', $('col_avatar_prompt').value);
                    fd.append('bio', $('col_bio').value);
                    fd.append('tone', $('col_tone').value);
                    fd.append('schedule_mode', document.querySelector('input[name="col_sched"]:checked').value);
                    fd.append('topic_single', $('col_topic_single').value);
                    fd.append('topics_weekly', JSON.stringify(weekly));
                    fd.append('category_id', $('col_category_id').value);
                    fd.append('post_time', $('col_post_time').value);
                    fd.append('word_count', $('col_word_count').value);
                    fd.append('post_status', $('col_post_status').value);
                    fd.append('active', $('col_active').checked ? 1 : 0);

                    var btn = this; btn.disabled = true; btn.textContent = '💾 Kaydediliyor...';
                    fetch(ajaxurl,{method:'POST',body:fd,credentials:'same-origin'})
                        .then(function(r){ return r.json(); })
                        .then(function(res){
                            btn.disabled = false; btn.textContent = '💾 Yazarı Kaydet';
                            if (res && res.success) {
                                setMsg('Kaydedildi. Sayfa yenileniyor...', true);
                                setTimeout(function(){ location.reload(); }, 800);
                            } else {
                                setMsg('Hata: '+(res && res.data ? res.data : 'bilinmiyor'), false);
                            }
                        });
                });

                syncRows(); syncSched();
            })();
            </script>
        </div>
        <?php
    }

    /* ---------- AJAX HANDLERS ---------- */

    public function ajax_columnist_save() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_columnists' );

        $id     = isset( $_POST['id'] ) ? sanitize_text_field( $_POST['id'] ) : '';
        $type_raw = isset( $_POST['type'] ) ? $_POST['type'] : 'ai';
        $type   = in_array( $type_raw, array( 'wp', 'ai', 'ext' ), true ) ? $type_raw : 'ai';
        $name   = isset( $_POST['name'] ) ? sanitize_text_field( $_POST['name'] ) : '';
        if ( ! $name ) wp_send_json_error( 'isim boş' );

        $existing = $id ? AHB_Columnists::get( $id ) : null;
        $ext_id   = isset( $_POST['ext_id'] ) ? (int) $_POST['ext_id'] : 0;
        $bio_in   = isset( $_POST['bio'] ) ? sanitize_textarea_field( $_POST['bio'] ) : '';
        $avatar_in = isset( $_POST['avatar_id'] ) ? (int) $_POST['avatar_id'] : 0;

        if ( $type === 'wp' ) {
            $wp_user_id = isset( $_POST['wp_user_id'] ) ? (int) $_POST['wp_user_id'] : 0;
            if ( ! $wp_user_id || ! get_user_by( 'id', $wp_user_id ) ) wp_send_json_error( 'wp user yok' );

        } elseif ( $type === 'ext' ) {
            // Eklenti yazarı: kendi CPT post'undan veriyi al, stub user oluştur/yeniden kullan
            if ( ! $ext_id || ! ( $ext_post = get_post( $ext_id ) ) ) wp_send_json_error( 'eklenti yazar postu bulunamadı' );

            // İsim boşsa post başlığını al
            if ( empty( $name ) ) $name = $ext_post->post_title;

            // Featured image'ı avatar olarak kullan (kullanıcı manuel set etmediyse)
            if ( ! $avatar_in ) {
                $thumb = (int) get_post_thumbnail_id( $ext_id );
                if ( $thumb ) $avatar_in = $thumb;
            }

            // Biyografi: kullanıcı yazmadıysa eklenti post'unun excerpt veya içeriğinden ilk paragrafı al
            if ( empty( $bio_in ) ) {
                $excerpt = trim( wp_strip_all_tags( $ext_post->post_excerpt ) );
                if ( ! $excerpt ) {
                    $excerpt = trim( wp_strip_all_tags( $ext_post->post_content ) );
                    $excerpt = mb_substr( $excerpt, 0, 250 );
                }
                $bio_in = $excerpt;
            }

            // Stub user oluştur veya mevcut olanı yeniden kullan
            if ( $existing && ! empty( $existing['wp_user_id'] ) && get_user_by( 'id', $existing['wp_user_id'] ) ) {
                $wp_user_id = (int) $existing['wp_user_id'];
                wp_update_user( array(
                    'ID'           => $wp_user_id,
                    'display_name' => $name,
                    'nickname'     => $name,
                    'description'  => $bio_in,
                ) );
            } else {
                $wp_user_id = AHB_Columnists::create_stub_user( $name, $bio_in );
                if ( ! $wp_user_id ) wp_send_json_error( 'eklenti yazarı için kullanıcı oluşturulamadı' );
            }

        } else {
            // AI yazar — daha önce oluşturulmuş bir stub user varsa onu kullan, yoksa yeni oluştur
            if ( $existing && ! empty( $existing['wp_user_id'] ) && get_user_by( 'id', $existing['wp_user_id'] ) ) {
                $wp_user_id = (int) $existing['wp_user_id'];
                wp_update_user( array(
                    'ID'           => $wp_user_id,
                    'display_name' => $name,
                    'nickname'     => $name,
                    'description'  => $bio_in,
                ) );
            } else {
                $wp_user_id = AHB_Columnists::create_stub_user( $name, $bio_in );
                if ( ! $wp_user_id ) wp_send_json_error( 'wp user oluşturulamadı' );
            }
        }

        $weekly_raw = isset( $_POST['topics_weekly'] ) ? wp_unslash( $_POST['topics_weekly'] ) : '{}';
        $weekly = json_decode( $weekly_raw, true );
        if ( ! is_array( $weekly ) ) $weekly = array();
        $weekly_clean = array();
        foreach ( $weekly as $k => $v ) {
            $k = sanitize_key( $k );
            if ( in_array( $k, array( 'mon','tue','wed','thu','fri','sat','sun' ), true ) && trim( $v ) !== '' ) {
                $weekly_clean[ $k ] = sanitize_text_field( $v );
            }
        }

        $col = array(
            'id'             => $id ?: '',
            'type'           => $type,
            'wp_user_id'     => (int) $wp_user_id,
            'ext_id'         => $type === 'ext' ? (int) $ext_id : 0,
            'name'           => $name,
            'gender'         => isset( $_POST['gender'] ) ? sanitize_key( $_POST['gender'] ) : 'other',
            'avatar_id'      => (int) $avatar_in,
            'avatar_prompt'  => isset( $_POST['avatar_prompt'] ) ? sanitize_textarea_field( $_POST['avatar_prompt'] ) : '',
            'bio'            => $bio_in,
            'tone'           => isset( $_POST['tone'] ) ? sanitize_text_field( $_POST['tone'] ) : 'samimi ve özgün',
            'schedule_mode'  => ( isset( $_POST['schedule_mode'] ) && $_POST['schedule_mode'] === 'weekly' ) ? 'weekly' : 'single',
            'topic_single'   => isset( $_POST['topic_single'] ) ? sanitize_text_field( $_POST['topic_single'] ) : '',
            'topics_weekly'  => $weekly_clean,
            'category_id'    => isset( $_POST['category_id'] ) ? (int) $_POST['category_id'] : 0,
            'post_time'      => isset( $_POST['post_time'] ) ? sanitize_text_field( $_POST['post_time'] ) : '09:00',
            'word_count'     => isset( $_POST['word_count'] ) ? max( 200, min( 2000, (int) $_POST['word_count'] ) ) : 600,
            'post_status'    => ( isset( $_POST['post_status'] ) && in_array( $_POST['post_status'], array( 'publish','draft','pending' ), true ) ) ? $_POST['post_status'] : 'publish',
            'active'         => empty( $_POST['active'] ) ? 0 : 1,
        );
        if ( $existing ) {
            $col['last_run_date'] = isset( $existing['last_run_date'] ) ? $existing['last_run_date'] : '';
        }

        $saved_id = AHB_Columnists::save( $col );
        wp_send_json_success( array( 'id' => $saved_id ) );
    }

    public function ajax_columnist_delete() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_columnists' );
        $id = isset( $_POST['id'] ) ? sanitize_text_field( $_POST['id'] ) : '';
        if ( ! $id ) wp_send_json_error( 'id yok' );
        $ok = AHB_Columnists::delete( $id );
        $ok ? wp_send_json_success() : wp_send_json_error( 'bulunamadı' );
    }

    public function ajax_columnist_avatar() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_columnists' );

        $name = isset( $_POST['name'] ) ? sanitize_text_field( $_POST['name'] ) : 'yazar';

        // Yükleme modu
        if ( ! empty( $_POST['upload'] ) && ! empty( $_FILES['file'] ) ) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';
            require_once ABSPATH . 'wp-admin/includes/media.php';
            $att_id = media_handle_upload( 'file', 0 );
            if ( is_wp_error( $att_id ) ) wp_send_json_error( $att_id->get_error_message() );
            wp_send_json_success( array(
                'id'  => (int) $att_id,
                'url' => wp_get_attachment_image_url( (int) $att_id, 'medium' ),
            ) );
        }

        // AI üretim modu
        $api = get_option( 'ahb_openai_api_key', '' );
        if ( ! $api ) wp_send_json_error( 'OpenAI API anahtarı yok (Klasik sekmesinden ekleyin)' );
        $gender = isset( $_POST['gender'] ) ? sanitize_key( $_POST['gender'] ) : 'other';
        $extra  = isset( $_POST['prompt'] ) ? sanitize_textarea_field( $_POST['prompt'] ) : '';
        $g_label = $gender === 'female' ? 'a professional woman' : ( $gender === 'male' ? 'a professional man' : 'a professional person' );
        $prompt = $extra ?: ( 'Photorealistic professional headshot portrait of ' . $g_label . ' Turkish journalist, friendly confident expression, modern office background, soft natural lighting, sharp focus, high quality, no text, no watermark' );

        $openai = new AHB_OpenAI_Client( $api );
        $cols   = new AHB_Columnists( $openai );
        $att_id = $cols->generate_avatar_attachment( $prompt, $name );
        if ( ! $att_id ) wp_send_json_error( 'AI görsel üretemedi (kota/ağ hatası olabilir)' );
        wp_send_json_success( array(
            'id'  => $att_id,
            'url' => wp_get_attachment_image_url( $att_id, 'medium' ),
        ) );
    }

    public function ajax_columnist_bio() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_columnists' );
        $api = get_option( 'ahb_openai_api_key', '' );
        if ( ! $api ) wp_send_json_error( 'API yok' );
        $name      = isset( $_POST['name'] ) ? sanitize_text_field( $_POST['name'] ) : '';
        $gender    = isset( $_POST['gender'] ) ? sanitize_key( $_POST['gender'] ) : '';
        $expertise = isset( $_POST['expertise'] ) ? sanitize_text_field( $_POST['expertise'] ) : '';
        $openai = new AHB_OpenAI_Client( $api );
        $bio = $openai->generate_bio( $name, $gender, $expertise );
        $bio ? wp_send_json_success( $bio ) : wp_send_json_error( 'üretilemedi' );
    }

    public function ajax_columnist_run() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'yetki yok' );
        check_ajax_referer( 'ahb_columnists' );
        $api = get_option( 'ahb_openai_api_key', '' );
        if ( ! $api ) wp_send_json_error( 'OpenAI API anahtarı yok' );

        @set_time_limit( 180 );
        @ini_set( 'memory_limit', '512M' );

        $id    = isset( $_POST['id'] ) ? sanitize_text_field( $_POST['id'] ) : '';
        $topic = isset( $_POST['topic'] ) ? sanitize_text_field( $_POST['topic'] ) : '';

        $openai = new AHB_OpenAI_Client( $api );
        $cols   = new AHB_Columnists( $openai );
        $res    = $cols->generate_for( $id, $topic, true );
        if ( is_wp_error( $res ) ) wp_send_json_error( $res->get_error_message() );

        $post = get_post( $res );
        wp_send_json_success( array(
            'post_id'  => (int) $res,
            'title'    => $post ? $post->post_title : '',
            'edit_url' => get_edit_post_link( $res, 'raw' ),
        ) );
    }

    /**
     * 5. Sekme: RSS Direkt — gömülü Ahenk Haber Botu modülünün özet paneli + yönetim linkleri.
     * AI gerektirmeyen, klasik RSS-direct yayınlama sistemi.
     */
    public function render_rssdirect_tab() {
        if ( ! class_exists( 'AHBRSS_Veritabani' ) ) {
            echo '<div class="ahb-card" data-ahb-tab="rssdirect" style="border-left:4px solid #d63638;"><p>RSS Direkt modülü yüklenemedi.</p></div>';
            return;
        }

        global $wpdb;
        $t_k = AHBRSS_Veritabani::t_kampanya();
        $t_i = AHBRSS_Veritabani::t_islenen();
        $t_l = AHBRSS_Veritabani::t_log();

        $kampanyalar = AHBRSS_Veritabani::kampanya_listesi();
        $aktif_say   = 0;
        $toplam_eklenen = 0;
        foreach ( $kampanyalar as $k ) {
            if ( (int) $k->durum === 1 ) $aktif_say++;
            $toplam_eklenen += (int) $k->toplam_eklenen;
        }
        $islenen_say = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$t_i}" );
        $sonraki     = AHBRSS_Cron::sonraki_calistirma();

        $url_kampanyalar = admin_url( 'admin.php?page=ahbrss-kampanyalar' );
        $url_yeni        = admin_url( 'admin.php?page=ahbrss-kampanya-ekle' );
        $url_loglar      = admin_url( 'admin.php?page=ahbrss-loglar' );
        $url_ayarlar     = admin_url( 'admin.php?page=ahbrss-ayarlar' );
        ?>
        <div class="ahb-card" data-ahb-tab="rssdirect" style="border-left:4px solid #2271b1;">
            <h2>🔗 RSS Direkt Modu (AI Kullanılmaz)</h2>
            <p style="background:#fff8e1;padding:12px;border-left:4px solid #f0b400;">
                <strong>AI krediniz yoksa</strong> bu modu kullanın. RSS/Atom beslemelerini kampanya halinde
                tanımlar, doğrudan WordPress'e haber olarak ekler. <strong>OpenAI API'si gerekmez.</strong>
                Üç kaynak tipini destekler: <strong>RSS / Atom</strong>, <strong>YouTube (kanal/playlist/video)</strong>,
                ve <strong>🌐 HTML Kazıma</strong> (RSS'i olmayan sitelerden, sayfa listesinden makale linklerini otomatik çıkarır).
                Çapraz-kaynak benzer içerik tespiti, başlık ve içerik parmak izi kontrolü dahildir;
                farklı sitelerden gelen aynı haber otomatik atlanır. Yayınlanan her haberin altına
                aynı kategori/etiketten en güncel <strong>5 ilgili haber</strong> bağlantısı otomatik eklenir.
            </p>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0;">
                <div style="background:#f6f7f7;padding:14px;border-radius:6px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#2271b1;"><?php echo (int) count( $kampanyalar ); ?></div>
                    <div>Toplam Kampanya</div>
                </div>
                <div style="background:#f6f7f7;padding:14px;border-radius:6px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#00a32a;"><?php echo (int) $aktif_say; ?></div>
                    <div>Aktif Kampanya</div>
                </div>
                <div style="background:#f6f7f7;padding:14px;border-radius:6px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#8c52ff;"><?php echo (int) $toplam_eklenen; ?></div>
                    <div>Toplam Eklenen Haber</div>
                </div>
                <div style="background:#f6f7f7;padding:14px;border-radius:6px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#d63638;"><?php echo (int) $islenen_say; ?></div>
                    <div>İşlenmiş Link (Tekil)</div>
                </div>
            </div>

            <p><strong>Sonraki Otomatik Çalışma:</strong> <?php echo esc_html( $sonraki ); ?> (her 5 dakikada kontrol)</p>

            <div style="display:flex;gap:10px;flex-wrap:wrap;margin:18px 0;">
                <a href="<?php echo esc_url( $url_kampanyalar ); ?>" class="button button-primary button-hero">📋 Kampanyaları Yönet</a>
                <a href="<?php echo esc_url( $url_yeni ); ?>" class="button button-secondary button-hero">➕ Yeni RSS Kampanyası</a>
                <a href="<?php echo esc_url( $url_loglar ); ?>" class="button button-secondary">📊 İşlem Logları</a>
                <a href="<?php echo esc_url( $url_ayarlar ); ?>" class="button button-secondary">⚙️ Bot Ayarları</a>
            </div>

            <h3 style="margin-top:24px;">Mevcut Kampanyalar</h3>
            <?php if ( empty( $kampanyalar ) ) : ?>
                <p>Henüz kampanya yok. <a href="<?php echo esc_url( $url_yeni ); ?>">Yeni bir kampanya oluşturun</a>.</p>
            <?php else : ?>
                <table class="widefat striped">
                    <thead><tr>
                        <th>Ad</th><th>Durum</th><th>Beslemeler</th><th>Sıklık</th><th>Eklenen</th><th>Son Çalışma</th><th></th>
                    </tr></thead>
                    <tbody>
                    <?php foreach ( $kampanyalar as $k ) :
                        $bes = array_filter( array_map( 'trim', preg_split( '/[\r\n]+/', (string) $k->beslemeler ) ) );
                        $sc  = (int) $k->son_calistirma;
                        $sc_str = $sc ? date( 'd.m.Y H:i', $sc ) : 'Hiç';
                        $edit_url = admin_url( 'admin.php?page=ahbrss-kampanya-duzenle&id=' . (int) $k->id );
                    ?>
                        <tr>
                            <td><strong><?php echo esc_html( $k->ad ); ?></strong></td>
                            <td><?php echo (int) $k->durum === 1
                                ? '<span style="color:#00a32a;font-weight:600;">● Aktif</span>'
                                : '<span style="color:#999;">○ Pasif</span>'; ?></td>
                            <td><?php echo (int) count( $bes ); ?> kaynak</td>
                            <td>Her <?php echo (int) $k->her_kac_dakika; ?> dk</td>
                            <td><?php echo (int) $k->toplam_eklenen; ?></td>
                            <td><?php echo esc_html( $sc_str ); ?></td>
                            <td><a href="<?php echo esc_url( $edit_url ); ?>" class="button button-small">Düzenle</a></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>

            <h3 style="margin-top:24px;">📌 Çalışma Şekli</h3>
            <ul style="line-height:1.8;">
                <li><strong>1.</strong> Kaynak ekleyin: NTV, Hürriyet, Sabah... her biri ayrı kampanya</li>
                <li><strong>2.</strong> Kampanyada bir veya daha fazla RSS adresi tanımlayın</li>
                <li><strong>3.</strong> Hedef post tipi (varsayılan: <code>haber</code>) ve kategori seçin</li>
                <li><strong>4.</strong> Çalışma sıklığını dakika cinsinden belirleyin (15-60 dk önerilir)</li>
                <li><strong>5.</strong> "Aktif" yapın — sistem her 5 dakikada bir kontrol eder, sırası gelen kampanyayı çalıştırır</li>
                <li><strong>6.</strong> Aynı başlık veya benzer içerik farklı kaynaktan da gelse <strong>otomatik atlanır</strong></li>
                <li><strong>7.</strong> Yayınlanan haberin altına aynı kategori/etiketten son 30 günün <strong>5 ilgili haber</strong> bağlantısı eklenir</li>
            </ul>
        </div>
        <?php
    }

    /**
     * 6. Sekme — Video TV (gömülü modül).
     * Tab içinde özet panel + Video TV alt-sayfalarına hızlı erişim.
     */
    public function render_videotv_tab() {
        // "Video TV Sayfası" ayarı kaydı (anasayfa bloklarındaki linklerin gideceği sayfa)
        if ( isset( $_POST['ahb_save_vtv_page'] ) && check_admin_referer( 'ahb_vtv_page' ) ) {
            update_option( 'ahb_vtv_page_id', (int) $_POST['ahb_vtv_page_id'] );
            echo '<div class="notice notice-success is-dismissible"><p><strong>Video TV sayfası kaydedildi.</strong></p></div>';
        }
        $vtv_page_id = (int) get_option( 'ahb_vtv_page_id', 0 );

        $vtv_var       = class_exists( 'VTV_DB' );
        $url_kaynak    = admin_url( 'admin.php?page=video-tv' );
        $url_video     = admin_url( 'admin.php?page=video-tv-videolar' );
        $url_playlist  = admin_url( 'admin.php?page=video-tv-playlistler' );
        $url_kategori  = admin_url( 'admin.php?page=video-tv-kategoriler' );
        $url_ayar      = admin_url( 'admin.php?page=video-tv-ayarlar' );

        $sayi_kaynak = 0; $sayi_video = 0; $sayi_playlist = 0; $sayi_kat = 0;
        if ( $vtv_var ) {
            $kaynaklar     = VTV_DB::get_kaynaklar( array() );
            $sayi_kaynak   = is_array( $kaynaklar ) ? count( $kaynaklar ) : 0;
            $tum_videolar  = VTV_DB::get_videolar( array( 'limit' => 9999 ) );
            $sayi_video    = is_array( $tum_videolar ) ? count( $tum_videolar ) : 0;
            $kategoriler   = VTV_DB::get_kategoriler( false );
            $sayi_kat      = is_array( $kategoriler ) ? count( $kategoriler ) : 0;
        }
        ?>
        <div class="ahb-card" data-ahb-tab="videotv" style="border-left:4px solid #FF0000;">
            <h2>📺 Video TV — YouTube · Dailymotion · Canlı TV</h2>
            <p style="background:#fff5f5;padding:12px;border-left:4px solid #FF0000;">
                <strong>Netflix + YouTube + Dailymotion hibrit video TV platformu.</strong>
                YouTube/Dailymotion <strong>kanallar</strong>, <strong>playlistler</strong>, <strong>tekil videolar</strong>,
                <strong>canlı TV yayınları</strong> ve <strong>shorts</strong> destekler. Frontend'de göstermek için
                <code>[video_tv]</code> kısa kodunu kullanın. Tüm yönetim ekranları soldaki menüde
                <strong>📺 VTV:</strong> öneki ile listelenir.
            </p>

            <?php if ( ! $vtv_var ) : ?>
                <p style="color:#dc2626;font-weight:600;">⚠️ Video TV modülü yüklenemedi.</p>
            <?php else : ?>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0;">
                <div style="background:#f6f7f7;padding:14px;border-radius:6px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#FF0000;"><?php echo (int) $sayi_kaynak; ?></div>
                    <div style="color:#646970;font-size:13px;margin-top:4px;">Kanal / Kaynak</div>
                </div>
                <div style="background:#f6f7f7;padding:14px;border-radius:6px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#1A4A8A;"><?php echo (int) $sayi_video; ?></div>
                    <div style="color:#646970;font-size:13px;margin-top:4px;">Toplam Video</div>
                </div>
                <div style="background:#f6f7f7;padding:14px;border-radius:6px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#8B5CF6;"><?php echo (int) $sayi_kat; ?></div>
                    <div style="color:#646970;font-size:13px;margin-top:4px;">Kategori</div>
                </div>
                <div style="background:#f6f7f7;padding:14px;border-radius:6px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#15803D;">[video_tv]</div>
                    <div style="color:#646970;font-size:13px;margin-top:4px;">Frontend Kısa Kod</div>
                </div>
            </div>

            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
                <a href="<?php echo esc_url( $url_kaynak ); ?>"   class="button button-primary" style="background:#FF0000;border-color:#CC0000;">📡 Kaynaklar (Kanal Ekle)</a>
                <a href="<?php echo esc_url( $url_video ); ?>"    class="button">🎬 Videolar</a>
                <a href="<?php echo esc_url( $url_playlist ); ?>" class="button">📂 Playlistler &amp; Diziler</a>
                <a href="<?php echo esc_url( $url_kategori ); ?>" class="button">🏷️ Kategoriler</a>
                <a href="<?php echo esc_url( $url_ayar ); ?>"     class="button">⚙️ Video TV Ayarları</a>
            </div>

            <h3 style="margin-top:28px;">🏠 Anasayfa Blokları (Yeni!)</h3>
            <p>Video TV'deki videoları anasayfada veya başka sayfalarda göstermek için hazır kısa kodlar:</p>
            <table class="widefat" style="max-width:880px;margin:10px 0;">
                <thead><tr><th>Kısa Kod</th><th>Ne Yapar</th></tr></thead>
                <tbody>
                    <tr><td><code>[ahenk_video_manset]</code></td><td>📰 Manşet slider — büyük video önizleme + yan mini videolar (anasayfa için)</td></tr>
                    <tr><td><code>[ahenk_video_hikayeler]</code></td><td>⭕ Instagram hikaye balonları — yatay kayan video baloncukları</td></tr>
                    <tr><td><code>[ahenk_video_grid sutun="4"]</code></td><td>🎬 Grid — kart düzeninde video listesi (sütun sayısı ayarlanabilir)</td></tr>
                </tbody>
            </table>
            <p style="font-size:13px;color:#666;">
                Parametreler: <code>sayi</code>, <code>kategori_id</code>, <code>kaynak_id</code>, <code>one_cikan="1"</code>, <code>baslik="..."</code>.
                Örnek: <code>[ahenk_video_manset sayi="5" kucuk="4" baslik=""]</code>
            </p>
            <p style="font-size:13px;color:#666;">
                <strong>Tüm video bloklarındaki tıklamalar aşağıda seçeceğiniz "Video TV Sayfası"na yönlendirilir
                ve ilgili video o sayfada otomatik açılır.</strong> Ahenk Bloklar eklentisi kuruluysa stiller otomatik uyum sağlar.
            </p>

            <form method="post" style="background:#f9f9f9;border:1px solid #ddd;border-radius:8px;padding:14px 18px;margin:14px 0;max-width:600px;">
                <?php wp_nonce_field( 'ahb_vtv_page' ); ?>
                <h4 style="margin-top:0;">📍 Video TV Sayfası</h4>
                <p style="margin:0 0 10px;color:#555;">Hangi sayfada <code>[video_tv]</code> kısa kodu var? Bloklardaki video tıklamaları bu sayfaya gidecek.</p>
                <?php
                wp_dropdown_pages( array(
                    'name'              => 'ahb_vtv_page_id',
                    'selected'          => $vtv_page_id,
                    'show_option_none'  => '— Sayfa seçin —',
                    'option_none_value' => 0,
                ) );
                ?>
                <button class="button button-primary" name="ahb_save_vtv_page" value="1" style="margin-left:8px;">Kaydet</button>
                <?php if ( $vtv_page_id ) : ?>
                    <p style="margin:10px 0 0;font-size:12px;"><a href="<?php echo esc_url( get_permalink( $vtv_page_id ) ); ?>" target="_blank">Sayfayı önizle →</a></p>
                <?php endif; ?>
            </form>

            <h3 style="margin-top:28px;">📋 Hızlı Başlangıç</h3>
            <ul style="line-height:1.8;">
                <li><strong>1.</strong> <a href="<?php echo esc_url( $url_kaynak ); ?>">Kaynaklar</a> sayfasından bir YouTube kanalı (@handle, UCxxxx veya URL) veya Dailymotion kullanıcısı ekleyin.</li>
                <li><strong>2.</strong> Tür seçin: <strong>Kanal</strong>, <strong>Playlist</strong>, <strong>Tekil Video</strong> veya <strong>Canlı TV</strong>.</li>
                <li><strong>3.</strong> Kategori atayın ve "Ekle &amp; Çek" deyin — videolar otomatik indirilir.</li>
                <li><strong>4.</strong> Diziler için <a href="<?php echo esc_url( $url_playlist ); ?>">Playlistler</a> sayfasından "Dizi (Sezonlu)" türünde playlist ekleyebilirsiniz.</li>
                <li><strong>5.</strong> Frontend'de göstermek için herhangi bir sayfaya <code>[video_tv]</code> kısa kodunu yapıştırın.</li>
                <li><strong>6.</strong> Tema rengi (<code>ahenk_renk_ana</code>) varsa video oynatıcı otomatik renge bürünür.</li>
            </ul>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * 7. Sekme: Haber Blokları (gömülü Ahenk Blokları modülü)
     * İçeriği bloklar/loader.php içindeki ahb_render_bloklar_tab_content() üretir.
     */
    public function render_bloklar_tab() {
        if ( function_exists( 'ahb_render_bloklar_tab_content' ) ) {
            ahb_render_bloklar_tab_content();
        } else {
            echo '<div class="ahb-card" data-ahb-tab="bloklar"><p>Haber Blokları modülü yüklenemedi.</p></div>';
        }
    }

    /**
     * Gelecek tarihli (post_date > now) haberlerin tarihini şimdiki ana çek.
     * mode=scan → sadece sayım. mode=fix → toplu UPDATE.
     */
    public function ajax_fix_future_dates() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Yetkisiz' );
        check_ajax_referer( 'ahb_disk_bakim' );
        global $wpdb;

        $mode = isset( $_POST['mode'] ) ? sanitize_key( $_POST['mode'] ) : 'scan';

        // Sunucu sistem saati yanlış olabilir (NTP senkronize değil). Tarayıcıdan gelen
        // gerçek anı referans olarak kullanırız.
        $browser_ts = isset( $_POST['now_ts'] ) ? (int) $_POST['now_ts'] : 0;
        if ( $browser_ts < 1000000000 ) {
            $browser_ts = time();
        }
        $tz_offset_min = isset( $_POST['tz_offset_min'] ) ? (int) $_POST['tz_offset_min'] : 0;
        // JS getTimezoneOffset(): UTC - local (ters işaretli). WP/Türkiye için -180.
        $local_ts = $browser_ts - ( $tz_offset_min * 60 );

        $now_local = gmdate( 'Y-m-d H:i:s', $local_ts );
        $now_gmt   = gmdate( 'Y-m-d H:i:s', $browser_ts );

        if ( $mode === 'fix' ) {
            $updated = (int) $wpdb->query( $wpdb->prepare(
                "UPDATE {$wpdb->posts}
                   SET post_date = %s, post_date_gmt = %s, post_modified = %s, post_modified_gmt = %s
                 WHERE post_status IN ('publish','future','draft','pending')
                   AND post_type NOT IN ('revision','attachment','nav_menu_item')
                   AND post_date > %s",
                $now_local, $now_gmt, $now_local, $now_gmt, $now_local
            ) );
            $wpdb->query( "UPDATE {$wpdb->posts} SET post_status='publish' WHERE post_status='future'" );
            wp_send_json_success( array( 'updated' => $updated, 'reference' => $now_local ) );
        }

        $count = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->posts}
              WHERE post_status IN ('publish','future','draft','pending')
                AND post_type NOT IN ('revision','attachment','nav_menu_item')
                AND post_date > %s",
            $now_local
        ) );
        wp_send_json_success( array( 'count' => $count, 'reference' => $now_local ) );
    }

    /**
     * Bir kaynak domainini engelle: o domainden gelen tüm bot haberlerini kalıcı sil
     * + ahb_blocked_domains_list opsiyonuna ekle ki bot bir daha çekmesin.
     */
    public function ajax_block_source() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Yetkisiz' );
        check_ajax_referer( 'ahb_block_source', 'nonce' );

        $domain = isset( $_POST['domain'] ) ? sanitize_text_field( wp_unslash( $_POST['domain'] ) ) : '';
        $domain = strtolower( trim( $domain ) );
        $domain = preg_replace( '#^https?://#', '', $domain );
        $domain = preg_replace( '#^www\.#',     '', $domain );
        $domain = preg_replace( '#/.*$#',       '', $domain );
        if ( $domain === '' || ! preg_match( '/^[a-z0-9.\-]+\.[a-z]{2,}$/', $domain ) ) {
            wp_send_json_error( 'Geçersiz domain' );
        }

        // 1) Listeye ekle
        $list = (array) get_option( 'ahb_blocked_domains_list', array() );
        if ( ! in_array( $domain, $list, true ) ) {
            $list[] = $domain;
            update_option( 'ahb_blocked_domains_list', array_values( array_unique( $list ) ), false );
        }

        // 2) Bu domainden gelen TÜM bot post'larını topla ve sil.
        global $wpdb;
        $like = '%' . $wpdb->esc_like( '://' . $domain ) . '%';
        $like_www = '%' . $wpdb->esc_like( '://www.' . $domain ) . '%';
        $like2 = '%' . $wpdb->esc_like( $domain ) . '%';
        $post_ids = $wpdb->get_col( $wpdb->prepare(
            "SELECT DISTINCT pm.post_id
               FROM {$wpdb->postmeta} pm
              WHERE pm.meta_key IN (
                  '_ahb_kaynak_link','_ahb_kaynak_besleme','_ahb_kaynak_site','_ahb_source_url'
                )
                AND ( pm.meta_value LIKE %s OR pm.meta_value LIKE %s OR pm.meta_value = %s )",
            $like, $like_www, $domain
        ) );
        $deleted = 0;
        foreach ( (array) $post_ids as $pid ) {
            $pid = (int) $pid;
            if ( $pid > 0 && wp_delete_post( $pid, true ) ) $deleted++;
        }

        // 3) RSS Direkt islenen tablosunda da link_url LIKE %domain% olan kayıtları sil
        // (yoksa hash hâlâ tutar ama post yok). Aslında bırakmak güvenli — yine de tertemiz olsun.
        if ( class_exists( 'AHBRSS_Veritabani' ) ) {
            $t = AHBRSS_Veritabani::t_islenen();
            if ( $t ) {
                $wpdb->query( $wpdb->prepare(
                    "DELETE FROM {$t} WHERE link_url LIKE %s OR link_url LIKE %s",
                    $like2, $like_www
                ) );
            }
        }

        wp_send_json_success( array( 'domain' => $domain, 'deleted' => $deleted ) );
    }

    /**
     * Bir başlık girin — aynı veya çok benzer başlıklı TÜM haberleri
     * (publish, draft, trash, future, pending, private) kalıcı sil.
     * Ayrıca normalleştirilmiş başlık hash'ini t_islenen tablosuna yazar
     * ki bot tekrar üretmesin.
     */
    public function ajax_delete_by_title() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Yetkisiz' );
        check_ajax_referer( 'ahb_delete_by_title', 'nonce' );

        $title = isset( $_POST['title'] ) ? sanitize_text_field( wp_unslash( $_POST['title'] ) ) : '';
        $title = trim( $title );
        if ( mb_strlen( $title ) < 8 ) {
            wp_send_json_error( 'En az 8 karakter girin' );
        }

        global $wpdb;

        // Tam eşleşme — TÜM post tiplerinde
        $exact_ids = $wpdb->get_col( $wpdb->prepare(
            "SELECT ID FROM {$wpdb->posts}
              WHERE post_status IN ('publish','draft','pending','future','private','trash','auto-draft','inherit')
                AND post_type NOT IN ('attachment','revision','nav_menu_item')
                AND post_title = %s",
            $title
        ) );

        // Normalize karşılaştırma — son 10000 post'u tara, post tipi/karakter farkı umursanmasın
        $norm_target = '';
        if ( class_exists( 'AHB_Duplicate_Checker' ) ) {
            $norm_target = AHB_Duplicate_Checker::normalize_title( $title );
        }
        $candidate_ids = array();
        if ( $norm_target !== '' ) {
            $rows = $wpdb->get_results(
                "SELECT ID, post_title FROM {$wpdb->posts}
                  WHERE post_status IN ('publish','draft','pending','future','private','trash','auto-draft')
                    AND post_type NOT IN ('attachment','revision','nav_menu_item')
                    AND post_title <> ''
                  ORDER BY ID DESC
                  LIMIT 10000"
            );
            foreach ( (array) $rows as $r ) {
                $db_norm = AHB_Duplicate_Checker::normalize_title( $r->post_title );
                // Tam eşleşme VEYA kullanıcının girdisi DB başlığında bir alt dize olarak geçiyorsa eşleş.
                // Bu sayede "ATEM Başkanı Arpacı'dan..." yazınca "...Küresel Kriz Yatırımcıyı..." uzantılı
                // tüm kopyalar yakalanır.
                if ( $db_norm === $norm_target || mb_strpos( $db_norm, $norm_target ) !== false ) {
                    $candidate_ids[] = (int) $r->ID;
                }
            }
        }

        $all_ids = array_unique( array_map( 'intval', array_merge( (array) $exact_ids, $candidate_ids ) ) );
        $deleted = 0;
        foreach ( $all_ids as $pid ) {
            if ( $pid > 0 && wp_delete_post( $pid, true ) ) $deleted++;
        }

        // 3) t_islenen tablosuna başlık hash'ini yaz — bot bir daha aynı başlığı üretmesin
        if ( class_exists( 'AHBRSS_Veritabani' ) && $norm_target !== '' ) {
            $hash_link = 'ahb-blocked-title:' . md5( $norm_target );
            AHBRSS_Veritabani::link_kaydet( 0, $hash_link, $title, 0, '' );
        }

        wp_send_json_success( array( 'deleted' => $deleted, 'matched' => count( $all_ids ) ) );
    }

    public function ajax_unblock_source() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Yetkisiz' );
        check_ajax_referer( 'ahb_block_source', 'nonce' );
        $domain = isset( $_POST['domain'] ) ? sanitize_text_field( wp_unslash( $_POST['domain'] ) ) : '';
        $domain = strtolower( trim( $domain ) );
        $list = (array) get_option( 'ahb_blocked_domains_list', array() );
        $list = array_values( array_diff( $list, array( $domain ) ) );
        update_option( 'ahb_blocked_domains_list', $list, false );
        wp_send_json_success( array( 'domain' => $domain ) );
    }
}
} // end class_exists guard
