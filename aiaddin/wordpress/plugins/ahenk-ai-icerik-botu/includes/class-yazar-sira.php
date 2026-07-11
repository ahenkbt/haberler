<?php
/**
 * Köşe Yazarları Sırası
 *
 * KY-Yazarlar eklentisinin DB tablosundaki yazarları sürükle-bırak ile
 * sıralamak ve sitede [ahenk_kose_yazarlari] shortcode'u ile bu sırayı
 * yansıtmak için.
 *
 * Tablo yapısı varsayılan: {prefix}ky_yazarlar (kullanıcı taramasıyla 13 satır).
 * Kolon adları otomatik tespit edilir (ad/foto/slug/köşe adı için heuristic).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class Ahenk_Yazar_Sira {

    const NONCE   = 'ahenk_yazar_sira';
    const OPTION  = 'ahenk_yazar_siralama';
    const TBL_OPT = 'ahenk_yazar_tablo'; // override icin

    public static function init() {
        $self = new self();
        add_action( 'admin_menu',                        array( $self, 'menu' ), 30 );
        add_action( 'wp_ajax_ahenk_yazar_sira_save',     array( $self, 'ajax_save' ) );
        add_shortcode( 'ahenk_kose_yazarlari',           array( $self, 'shortcode' ) );
        add_action( 'init',                              array( $self, 'public_widget_endpoint' ), 5 );
    }

    /**
     * Public iframe endpoint: /?ahenk_widget=kose-yazarlari&col=4&limit=0
     * Tema dosyasi degisikligi gerektirmeden, herhangi bir tema icine
     * <iframe> ile gomulebilir.
     */
    public function public_widget_endpoint() {
        if ( ! isset( $_GET['ahenk_widget'] ) || $_GET['ahenk_widget'] !== 'kose-yazarlari' ) return;
        $col   = max( 1, min( 6, (int) ( $_GET['col']   ?? 4 ) ) );
        $limit = max( 0, (int) ( $_GET['limit'] ?? 0 ) );
        $bg    = sanitize_hex_color( '#' . preg_replace( '/[^0-9a-fA-F]/', '', (string) ( $_GET['bg'] ?? '' ) ) );
        $body  = do_shortcode( '[ahenk_kose_yazarlari col="' . $col . '" limit="' . $limit . '"]' );
        if ( ! headers_sent() ) {
            header( 'Content-Type: text/html; charset=utf-8' );
            header( 'X-Frame-Options: SAMEORIGIN' );
            header( 'Cache-Control: public, max-age=300' );
        }
        echo '<!doctype html><html lang="tr"><head><meta charset="utf-8">';
        echo '<meta name="viewport" content="width=device-width,initial-scale=1">';
        echo '<title>Köşe Yazarları</title>';
        echo '<style>html,body{margin:0;padding:0;background:' . esc_attr( $bg ?: 'transparent' ) . ';}';
        echo 'body{padding:14px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}';
        echo 'a{transition:opacity .15s} a:hover{opacity:.75}';
        echo '</style></head><body>' . $body . '</body></html>';
        exit;
    }

    /* ============ TABLO YARDIMCILARI ============ */

    private function table_name() {
        global $wpdb;
        $custom = trim( (string) get_option( self::TBL_OPT, '' ) );
        if ( $custom !== '' ) return $custom;
        return $wpdb->prefix . 'ky_yazarlar';
    }

    private function table_exists() {
        global $wpdb;
        $tbl = $this->table_name();
        return $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $tbl ) ) === $tbl;
    }

    private function get_columns() {
        global $wpdb;
        if ( ! $this->table_exists() ) return array();
        $tbl = $this->table_name();
        return $wpdb->get_results( "SHOW COLUMNS FROM `{$tbl}`" );
    }

    private function find_col( $cols, $candidates, $type_regex = '' ) {
        $names = array();
        foreach ( $cols as $c ) $names[ strtolower( $c->Field ) ] = $c->Field;
        foreach ( $candidates as $cand ) {
            if ( isset( $names[ $cand ] ) ) return $names[ $cand ];
        }
        if ( $type_regex ) {
            foreach ( $cols as $c ) {
                if ( preg_match( $type_regex, $c->Type ) ) return $c->Field;
            }
        }
        return '';
    }

    private function detect_cols( $cols ) {
        $id    = '';
        foreach ( $cols as $c ) if ( $c->Key === 'PRI' ) { $id = $c->Field; break; }
        if ( ! $id ) $id = $this->find_col( $cols, array( 'id', 'yazar_id' ) );
        if ( ! $id && isset( $cols[0] ) ) $id = $cols[0]->Field;

        return array(
            'id'    => $id,
            'name'  => $this->find_col( $cols, array( 'ad_soyad', 'ad', 'isim', 'name', 'baslik', 'title' ), '/(varchar|text)/i' ),
            'slug'  => $this->find_col( $cols, array( 'slug', 'permalink', 'kullanici_adi', 'username' ) ),
            'photo' => $this->find_col( $cols, array( 'foto', 'resim', 'avatar', 'image', 'photo', 'profil_foto' ) ),
            'kose'  => $this->find_col( $cols, array( 'kose_adi', 'kose', 'baslik_kose', 'kose_basligi', 'unvan', 'gorev' ) ),
            'durum' => $this->find_col( $cols, array( 'durum', 'aktif', 'status', 'pasif' ) ),
        );
    }

    private function fetch_rows() {
        global $wpdb;
        if ( ! $this->table_exists() ) return array();
        $tbl = $this->table_name();
        $rows = $wpdb->get_results( "SELECT * FROM `{$tbl}`", ARRAY_A );
        return is_array( $rows ) ? $rows : array();
    }

    private function ordered_rows() {
        $cols = $this->get_columns();
        if ( ! $cols ) return array( 'cols' => array(), 'rows' => array(), 'map' => array() );
        $map  = $this->detect_cols( $cols );
        $rows = $this->fetch_rows();

        // Durum filtresi: pasif yazarlari ele
        if ( $map['durum'] ) {
            $rows = array_values( array_filter( $rows, function ( $r ) use ( $map ) {
                $v = strtolower( (string) ( $r[ $map['durum'] ] ?? '' ) );
                return ! in_array( $v, array( '0', 'pasif', 'inactive', 'no', 'hayir', 'kapali' ), true );
            } ) );
        }

        $order = (array) get_option( self::OPTION, array() );
        if ( ! empty( $order ) && $map['id'] ) {
            $by_id = array();
            foreach ( $rows as $r ) $by_id[ (string) $r[ $map['id'] ] ] = $r;
            $sorted = array();
            foreach ( $order as $id ) {
                $k = (string) $id;
                if ( isset( $by_id[ $k ] ) ) { $sorted[] = $by_id[ $k ]; unset( $by_id[ $k ] ); }
            }
            // sirada olmayan yenileri sona ekle
            foreach ( $by_id as $r ) $sorted[] = $r;
            $rows = $sorted;
        }
        return array( 'cols' => $cols, 'rows' => $rows, 'map' => $map );
    }

    /* ============ ADMIN MENU + SAYFA ============ */

    public function menu() {
        add_submenu_page(
            'ai-haber-botu',
            'Köşe Yazarları Sırası',
            '🔢 Yazar Sırası',
            'manage_options',
            'ahenk-yazar-sira',
            array( $this, 'render' )
        );
    }

    public function render() {
        if ( ! current_user_can( 'manage_options' ) ) return;
        $tbl_name = $this->table_name();
        $exists   = $this->table_exists();
        $data     = $this->ordered_rows();
        $cols     = $data['cols'];
        $rows     = $data['rows'];
        $map      = $data['map'];
        $nonce    = wp_create_nonce( self::NONCE );
        $ajax     = admin_url( 'admin-ajax.php' );
        ?>
        <div class="wrap">
            <h1>🔢 Köşe Yazarları Sırası</h1>

            <?php if ( ! $exists ) : ?>
                <div class="notice notice-error">
                    <p><strong><code><?php echo esc_html( $tbl_name ); ?></code></strong> tablosu bulunamadı. KY-Yazarlar eklentisinin kurulu olduğundan emin olun. Tablonun adı farklıysa aşağıdan elle ayarlayabilirsiniz.</p>
                </div>
                <h3>Tablo adını manuel ayarla</h3>
                <form method="post" action="options.php">
                    <?php settings_fields( 'ahenk_yazar_tablo_grp' ); ?>
                    <input type="text" name="<?php echo esc_attr( self::TBL_OPT ); ?>" value="<?php echo esc_attr( get_option( self::TBL_OPT, '' ) ); ?>" class="regular-text" placeholder="<?php echo esc_attr( $tbl_name ); ?>">
                    <button type="submit" class="button button-primary">Kaydet</button>
                </form>
                <?php return; ?>
            <?php endif; ?>

            <p>Aşağıdaki listede <strong>sürükle-bırak</strong> ile yazarları istediğiniz sıraya getirin, sonra <strong>Sıralamayı Kaydet</strong>'e tıklayın. Bu sıralama sitenizde <code>[ahenk_kose_yazarlari]</code> shortcode'u ya da widget kullanıldığında uygulanır.</p>

            <details style="background:#fff;padding:10px 14px;border:1px solid #ccd0d4;margin:0 0 16px;border-radius:4px;">
                <summary style="cursor:pointer;font-weight:600;">🔍 Tablo Yapısı (otomatik tespit) — <code><?php echo esc_html( $tbl_name ); ?></code></summary>
                <p style="margin:8px 0;">
                    Tespit edilen kolonlar:
                    ID = <code><?php echo esc_html( $map['id'] ?: '?' ); ?></code>,
                    İsim = <code><?php echo esc_html( $map['name'] ?: '?' ); ?></code>,
                    Slug = <code><?php echo esc_html( $map['slug'] ?: '(yok)' ); ?></code>,
                    Foto = <code><?php echo esc_html( $map['photo'] ?: '(yok)' ); ?></code>,
                    Köşe = <code><?php echo esc_html( $map['kose'] ?: '(yok)' ); ?></code>,
                    Durum = <code><?php echo esc_html( $map['durum'] ?: '(yok)' ); ?></code>
                </p>
                <table class="widefat striped" style="margin-top:6px;">
                    <thead><tr><th>Kolon</th><th>Tür</th><th>Anahtar</th></tr></thead>
                    <tbody>
                    <?php foreach ( $cols as $c ) : ?>
                        <tr><td><code><?php echo esc_html( $c->Field ); ?></code></td><td><?php echo esc_html( $c->Type ); ?></td><td><?php echo esc_html( $c->Key ); ?></td></tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
                <p style="margin-top:8px;font-size:12px;color:#666;">Tespit yanlışsa, çıktıyı paylaşın — heuristic'i güncelleyelim.</p>
            </details>

            <?php if ( empty( $rows ) ) : ?>
                <div class="notice notice-warning"><p>Tabloda kayıt bulunamadı.</p></div>
                <?php return; ?>
            <?php endif; ?>

            <ul id="ahenk-yazar-sortable" style="list-style:none;padding:0;margin:0;max-width:680px;">
                <?php foreach ( $rows as $r ) :
                    $rid   = (int) ( $r[ $map['id'] ] ?? 0 );
                    $rname = $r[ $map['name'] ] ?? '(isimsiz)';
                    $rkose = $map['kose']  ? ( $r[ $map['kose'] ]  ?? '' ) : '';
                    $rfoto = $map['photo'] ? ( $r[ $map['photo'] ] ?? '' ) : '';
                ?>
                    <li data-id="<?php echo esc_attr( $rid ); ?>" style="background:#fff;border:1px solid #ccd0d4;border-radius:4px;padding:10px 12px;margin-bottom:6px;cursor:move;display:flex;align-items:center;gap:12px;user-select:none;">
                        <span style="color:#888;font-size:20px;line-height:1;">≡</span>
                        <span style="background:#2271b1;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;min-width:30px;text-align:center;">#<?php echo $rid; ?></span>
                        <?php if ( $rfoto && filter_var( $rfoto, FILTER_VALIDATE_URL ) ) : ?>
                            <img src="<?php echo esc_url( $rfoto ); ?>" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">
                        <?php endif; ?>
                        <div style="flex:1;">
                            <strong style="font-size:14px;"><?php echo esc_html( $rname ); ?></strong>
                            <?php if ( $rkose ) : ?><span style="color:#999;margin-left:6px;font-size:12px;">— <?php echo esc_html( $rkose ); ?></span><?php endif; ?>
                        </div>
                    </li>
                <?php endforeach; ?>
            </ul>

            <p style="margin-top:15px;">
                <button type="button" class="button button-primary button-large" id="ahenk-yazar-save">💾 Sıralamayı Kaydet</button>
                <button type="button" class="button" id="ahenk-yazar-reset" style="margin-left:6px;">↺ Varsayılana Dön (DB sırası)</button>
                <span id="ahenk-yazar-msg" style="margin-left:14px;font-weight:600;"></span>
            </p>

            <hr>

            <h2>🧩 Sitede Kullanım — 3 Entegrasyon Yöntemi</h2>
            <p style="color:#555;">Temanız "Köşe Yazarları" widget'ını eklenti yerine doğrudan tema dosyasından çiziyorsa, aşağıdaki yöntemlerden biriyle bizim bileşenimize geçebilirsiniz. Önce <strong>iframe</strong> deneyin (kod düzenlemesi gerekmez); olmazsa <strong>PHP</strong> yöntemine geçin.</p>

            <?php
                $iframe_url = home_url( '/?ahenk_widget=kose-yazarlari&col=4' );
            ?>

            <div style="background:#fff;border:1px solid #ccd0d4;padding:14px 16px;border-radius:6px;margin-bottom:14px;">
                <h3 style="margin-top:0;">1️⃣ İFRAME (en kolay — tema dosyası düzenlemeden)</h3>
                <p style="color:#555;">Mevcut "Köşe Yazarları" bölümünün olduğu tema dosyasındaki HTML'i bu iframe ile değiştirin. Yükseklik içeriğe göre ayarlayın (~520px varsayılan).</p>
                <textarea readonly style="width:100%;height:90px;font-family:Consolas,Menlo,monospace;font-size:12px;padding:8px;background:#f6f7f7;" onclick="this.select();">&lt;iframe src="<?php echo esc_url( $iframe_url ); ?>" width="100%" height="520" style="border:0;display:block;" loading="lazy" title="Köşe Yazarları"&gt;&lt;/iframe&gt;</textarea>
                <p style="margin:8px 0 0;font-size:12px;color:#666;">İframe URL parametreleri: <code>col</code> (1-6 sütun), <code>limit</code> (azami yazar), <code>bg</code> (arkaplan rengi, # olmadan: <code>fff</code>).</p>
                <p style="margin:6px 0 0;">
                    <a href="<?php echo esc_url( $iframe_url ); ?>" target="_blank" class="button button-small">🔗 İframe URL'sini Önizle</a>
                </p>
            </div>

            <div style="background:#fff;border:1px solid #ccd0d4;padding:14px 16px;border-radius:6px;margin-bottom:14px;">
                <h3 style="margin-top:0;">2️⃣ PHP (tema dosyası içine — en hızlı yükleme)</h3>
                <p style="color:#555;">Tema dosyasındaki mevcut "Köşe Yazarları" bloğunu silin, yerine şu PHP satırını ekleyin:</p>
                <textarea readonly style="width:100%;height:60px;font-family:Consolas,Menlo,monospace;font-size:12px;padding:8px;background:#f6f7f7;" onclick="this.select();">&lt;?php echo do_shortcode('[ahenk_kose_yazarlari col="4"]'); ?&gt;</textarea>
                <p style="margin:8px 0 0;font-size:12px;color:#666;">İframe yükü olmadan doğrudan tema HTML'ine basılır. Tema güncellemesinde silinebileceği için child-theme önerilir.</p>
            </div>

            <div style="background:#fff;border:1px solid #ccd0d4;padding:14px 16px;border-radius:6px;margin-bottom:14px;">
                <h3 style="margin-top:0;">3️⃣ Shortcode (yazı/sayfa/widget alanı için)</h3>
                <p style="color:#555;">WordPress yazı, sayfa veya "Metin/Shortcode" widget alanına yapıştırın:</p>
                <textarea readonly style="width:100%;height:50px;font-family:Consolas,Menlo,monospace;font-size:13px;padding:8px;background:#f6f7f7;" onclick="this.select();">[ahenk_kose_yazarlari col="4" limit="0"]</textarea>
                <p style="margin:8px 0 0;font-size:12px;color:#666;">Parametreler: <code>limit</code> (0 = hepsi), <code>col</code> (sütun sayısı, varsayılan 4).</p>
            </div>

            <h3>🖼️ Canlı Önizleme (sıralamayı kaydedince güncellenir)</h3>
            <div style="background:#fff;border:1px solid #ccd0d4;padding:18px;border-radius:6px;">
                <?php echo $this->shortcode( array() ); ?>
            </div>
        </div>

        <script>
        (function(){
            const list = document.getElementById('ahenk-yazar-sortable');
            if (!list) return;
            let dragEl = null;
            list.querySelectorAll('li').forEach(li => {
                li.draggable = true;
                li.addEventListener('dragstart', () => { dragEl = li; setTimeout(() => li.style.opacity = '0.4', 0); });
                li.addEventListener('dragend',   () => { li.style.opacity = '1'; dragEl = null; });
                li.addEventListener('dragover',  e  => { e.preventDefault(); });
                li.addEventListener('drop', e => {
                    e.preventDefault();
                    if (dragEl && dragEl !== li) {
                        const rect = li.getBoundingClientRect();
                        const before = (e.clientY - rect.top) < (rect.height / 2);
                        list.insertBefore(dragEl, before ? li : li.nextSibling);
                    }
                });
            });
            const NONCE = '<?php echo esc_js( $nonce ); ?>';
            const AJAX  = '<?php echo esc_url_raw( $ajax ); ?>';
            const msg = document.getElementById('ahenk-yazar-msg');
            async function send(order) {
                const fd = new FormData();
                fd.append('action', 'ahenk_yazar_sira_save');
                fd.append('_ajax_nonce', NONCE);
                fd.append('order', order);
                msg.style.color = '#666'; msg.textContent = 'Kaydediliyor...';
                try {
                    const r = await fetch(AJAX, { method: 'POST', body: fd, credentials: 'same-origin' });
                    const j = await r.json();
                    if (j.success) {
                        msg.style.color = '#46b450';
                        msg.textContent = '✅ Kaydedildi (' + j.data.count + ' yazar). Sayfayı yenileyince önizleme güncellenir.';
                    } else {
                        msg.style.color = '#d63638';
                        msg.textContent = '❌ ' + ((j.data && j.data.msg) || 'Hata');
                    }
                } catch (e) { msg.style.color = '#d63638'; msg.textContent = 'Ağ hatası: ' + e.message; }
            }
            document.getElementById('ahenk-yazar-save').addEventListener('click', () => {
                const ids = Array.from(list.children).map(li => li.dataset.id).join(',');
                send(ids);
            });
            document.getElementById('ahenk-yazar-reset').addEventListener('click', () => {
                if (confirm('Özel sıralamayı silmek istediğinize emin misiniz? Liste DB sırasına döner.')) send('');
            });
        })();
        </script>
        <?php
    }

    /* ============ AJAX ============ */

    public function ajax_save() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $raw   = (string) ( $_POST['order'] ?? '' );
        $order = $raw === '' ? array() : array_values( array_filter( array_map( 'intval', explode( ',', $raw ) ) ) );
        update_option( self::OPTION, $order, false );
        wp_send_json_success( array( 'count' => count( $order ) ) );
    }

    /* ============ SHORTCODE ============ */

    public function shortcode( $atts ) {
        $atts = shortcode_atts( array(
            'limit' => 0,
            'col'   => 4,
        ), $atts, 'ahenk_kose_yazarlari' );

        $data = $this->ordered_rows();
        $rows = $data['rows'];
        $map  = $data['map'];
        if ( empty( $rows ) || empty( $map['name'] ) ) {
            return '<p style="color:#999;">Henüz köşe yazarı yok.</p>';
        }
        if ( (int) $atts['limit'] > 0 ) $rows = array_slice( $rows, 0, (int) $atts['limit'] );
        $col = max( 1, min( 6, (int) $atts['col'] ) );

        ob_start(); ?>
        <div class="ahenk-kose-yazarlari" style="display:grid;grid-template-columns:repeat(<?php echo $col; ?>,minmax(0,1fr));gap:14px;">
            <?php foreach ( $rows as $r ) :
                $name  = (string) ( $r[ $map['name'] ] ?? '' );
                $slug  = $map['slug']  ? sanitize_title( (string) ( $r[ $map['slug'] ]  ?? '' ) ) : sanitize_title( $name );
                $foto  = $map['photo'] ? trim( (string) ( $r[ $map['photo'] ] ?? '' ) ) : '';
                $kose  = $map['kose']  ? (string) ( $r[ $map['kose'] ]  ?? '' ) : '';
                $url   = $slug ? home_url( '/yazar/' . $slug . '/' ) : '#';
                $valid_img = $foto && ( filter_var( $foto, FILTER_VALIDATE_URL ) || strpos( $foto, '/' ) === 0 );
            ?>
                <div class="ahenk-yazar-card" style="background:#fff;border:1px solid #eee;border-radius:8px;padding:14px;text-align:center;">
                    <?php if ( $kose ) : ?>
                        <div style="color:#dc3545;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;"><?php echo esc_html( $kose ); ?></div>
                    <?php endif; ?>
                    <?php if ( $valid_img ) : ?>
                        <a href="<?php echo esc_url( $url ); ?>"><img src="<?php echo esc_url( $foto ); ?>" alt="<?php echo esc_attr( $name ); ?>" style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin-bottom:10px;"></a>
                    <?php endif; ?>
                    <a href="<?php echo esc_url( $url ); ?>" style="display:block;font-weight:700;color:#222;text-decoration:none;font-size:14px;line-height:1.3;"><?php echo esc_html( $name ); ?></a>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }
}

Ahenk_Yazar_Sira::init();
