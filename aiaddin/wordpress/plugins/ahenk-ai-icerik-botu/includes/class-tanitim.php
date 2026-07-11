<?php
/**
 * Tanitim Sayfalari Otomatik Uretici.
 * Tek tikla: 1 ana hub sayfasi + 8 alt sayfa (her modul icin).
 * Hardcoded zengin HTML — AI/API gerekmez. WP page olarak olusur, parent zincirleme.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class Ahenk_Tanitim {

    const SLUG  = 'ahenk-tanitim';
    const NONCE = 'ahenk_tanitim';
    const META  = '_ahb_tanitim';

    public static function init() {
        $self = new self();
        add_action( 'admin_menu', array( $self, 'menu' ), 34 );
        add_action( 'wp_ajax_ahenk_tanitim_create', array( $self, 'ajax_create' ) );
        add_action( 'wp_ajax_ahenk_tanitim_delete', array( $self, 'ajax_delete' ) );
    }

    public function menu() {
        // Sadece Ahenk admin/submanager gorsun; WP manage_options yetkisi de gereklidir.
        if ( ! Ahenk_License::is_staff() ) return;
        add_submenu_page( 'ai-haber-botu', 'Tanıtım Sayfaları', '🌟 Tanıtım Sayfaları', 'manage_options', self::SLUG, array( $this, 'render' ) );
    }

    public function render() {
        if ( ! current_user_can( 'manage_options' ) || ! Ahenk_License::is_staff() ) {
            echo '<div class="wrap"><h1>🌟 Tanıtım Sayfaları</h1><div class="notice notice-error"><p>⛔ Bu sayfa yalnızca yöneticiler içindir.</p></div></div>';
            return;
        }
        $nonce = wp_create_nonce( self::NONCE );
        $existing = get_posts( array( 'post_type' => 'page', 'meta_key' => self::META, 'meta_value' => 'hub', 'posts_per_page' => 20 ) );
        ?>
        <div class="wrap">
            <h1>🌟 Eklenti Tanıtım Sayfaları</h1>
            <p style="color:#555;max-width:820px;">Tek tıkla <strong>1 ana tanıtım sayfası + 8 alt modül sayfası</strong> oluşturulur. Her sayfa ayrı bir özelliği anlatır. Müşterilerinize gösterebileceğiniz, satış için kullanabileceğiniz hazır demo sayfalardır.</p>

            <table class="form-table" style="max-width:820px;">
                <tr>
                    <th>Ana sayfa başlığı</th>
                    <td><input type="text" id="tn-title" class="regular-text" value="Ahenk AI İçerik Robotu — Tüm Özellikler" style="width:100%;"></td>
                </tr>
                <tr>
                    <th>URL slug</th>
                    <td><input type="text" id="tn-slug" class="regular-text" value="ahenk-ai-tanitim"></td>
                </tr>
                <tr>
                    <th>Tema rengi</th>
                    <td><select id="tn-theme">
                        <option value="indigo">Indigo (lacivert)</option>
                        <option value="emerald">Emerald (yeşil)</option>
                        <option value="amber">Amber (sarı)</option>
                        <option value="rose">Rose (pembe)</option>
                    </select></td>
                </tr>
                <tr>
                    <th>Yayın</th>
                    <td><select id="tn-status"><option value="draft">📝 Taslak</option><option value="publish" selected>✅ Yayında</option></select></td>
                </tr>
            </table>
            <p><button class="button button-primary button-hero" id="tn-go">🚀 Tanıtım Sayfalarını Oluştur</button> <span id="tn-msg" style="margin-left:14px;color:#555;"></span></p>
            <div id="tn-result" style="display:none;background:#edfaef;border:1px solid #46b450;border-radius:6px;padding:14px;margin:14px 0;max-width:820px;"></div>

            <?php if ( $existing ) : ?>
                <h2 style="margin-top:30px;">📜 Mevcut Tanıtımlar</h2>
                <table class="wp-list-table widefat striped">
                    <thead><tr><th>Başlık</th><th>URL</th><th>Tarih</th><th style="width:240px;">İşlem</th></tr></thead>
                    <tbody>
                    <?php foreach ( $existing as $h ) : ?>
                        <tr>
                            <td><strong><?php echo esc_html( get_the_title( $h ) ); ?></strong></td>
                            <td><a href="<?php echo esc_url( get_permalink( $h ) ); ?>" target="_blank"><?php echo esc_html( get_permalink( $h ) ); ?></a></td>
                            <td><?php echo esc_html( get_the_date( 'd.m.Y H:i', $h ) ); ?></td>
                            <td>
                                <a href="<?php echo esc_url( get_edit_post_link( $h ) ); ?>" class="button button-small">✏️</a>
                                <a href="<?php echo esc_url( get_permalink( $h ) ); ?>" target="_blank" class="button button-small">👁</a>
                                <button class="button button-small tn-del" data-pid="<?php echo (int) $h->ID; ?>" style="color:#d63638;">🗑 Sil (alt sayfalarla)</button>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>

        <script>
        (function(){
            const NONCE = '<?php echo esc_js( $nonce ); ?>';
            const AJAX  = '<?php echo esc_url( admin_url( 'admin-ajax.php' ) ); ?>';
            const $ = id => document.getElementById(id);
            async function ajax(action, data) {
                const fd = new FormData(); fd.append('action', action); fd.append('_ajax_nonce', NONCE);
                Object.keys(data || {}).forEach(k => fd.append(k, data[k]));
                const r = await fetch(AJAX, { method:'POST', body:fd, credentials:'same-origin' }); return r.json();
            }
            $('tn-go').addEventListener('click', async () => {
                $('tn-go').disabled = true; $('tn-msg').textContent = '⏳ Oluşturuluyor (1 ana + 8 alt sayfa)...';
                const j = await ajax('ahenk_tanitim_create', {
                    title: $('tn-title').value, slug: $('tn-slug').value,
                    theme: $('tn-theme').value, status: $('tn-status').value,
                });
                $('tn-go').disabled = false;
                if (j.success) {
                    $('tn-msg').textContent = '✅ ' + j.data.count + ' sayfa oluşturuldu.';
                    $('tn-result').style.display = '';
                    $('tn-result').innerHTML = '<strong>✅ Hazır!</strong><br><a href="' + j.data.view + '" target="_blank" class="button button-primary" style="margin-top:8px;">👁 Tanıtım Sayfasına Git</a> <a href="' + j.data.edit + '" target="_blank" class="button" style="margin-top:8px;">✏️ Düzenle</a><p style="margin:10px 0 0;font-size:12px;color:#666;">Sayfayı yenileyin (liste güncellensin).</p>';
                } else {
                    $('tn-msg').textContent = '❌ ' + (j.data?.msg || 'hata');
                }
            });
            document.querySelectorAll('.tn-del').forEach(b => b.addEventListener('click', async () => {
                if (!confirm('Bu tanıtım hub ve TÜM alt sayfaları çöpe taşınsın mı?')) return;
                const j = await ajax('ahenk_tanitim_delete', { post_id: b.dataset.pid });
                if (j.success) location.reload(); else alert('Hata: ' + (j.data?.msg || ''));
            }));
        })();
        </script>
        <?php
    }

    public function ajax_delete() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) || ! Ahenk_License::is_staff() ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $pid = (int) ( $_POST['post_id'] ?? 0 );
        $children = get_pages( array( 'child_of' => $pid ) );
        foreach ( $children as $c ) wp_trash_post( $c->ID );
        wp_trash_post( $pid );
        wp_send_json_success();
    }

    public function ajax_create() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) || ! Ahenk_License::is_staff() ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $title  = sanitize_text_field( wp_unslash( (string) ( $_POST['title']  ?? 'Ahenk AI İçerik Robotu' ) ) );
        $slug   = sanitize_title( (string) ( $_POST['slug']   ?? 'ahenk-ai-tanitim' ) );
        $theme  = sanitize_key( (string) ( $_POST['theme']    ?? 'indigo' ) );
        $status = in_array( ( $_POST['status'] ?? 'publish' ), array( 'draft', 'publish' ), true ) ? $_POST['status'] : 'publish';

        $palette = $this->palette( $theme );
        $modules = $this->modules();

        // 1) Hub (ana) sayfa — alt sayfa linklerini sonra ekleyeceğiz
        $hub_id = wp_insert_post( array(
            'post_type'    => 'page',
            'post_status'  => $status,
            'post_title'   => $title,
            'post_name'    => $slug,
            'post_content' => '<!-- placeholder -->',
            'meta_input'   => array( self::META => 'hub' ),
        ), true );
        if ( is_wp_error( $hub_id ) ) wp_send_json_error( array( 'msg' => 'Hub oluşturulamadı: ' . $hub_id->get_error_message() ) );

        // 2) Alt sayfaları oluştur
        $resolved = array();
        foreach ( $modules as $i => $m ) {
            $sub_html = $this->build_sub_html( $m, $palette, $title );
            $sub_id = wp_insert_post( array(
                'post_type'    => 'page',
                'post_status'  => $status,
                'post_parent'  => $hub_id,
                'post_title'   => $m['title'],
                'post_name'    => sanitize_title( $m['slug'] ),
                'post_content' => $sub_html,
                'menu_order'   => $i + 1,
                'meta_input'   => array( self::META => 'sub' ),
            ), true );
            if ( is_wp_error( $sub_id ) ) continue;
            $resolved[] = array_merge( $m, array( 'id' => $sub_id, 'view' => get_permalink( $sub_id ) ) );
        }

        // 3) Hub HTML'i alt sayfa linkleriyle finalize et
        $hub_html = $this->build_hub_html( $title, $palette, $resolved );
        wp_update_post( array( 'ID' => $hub_id, 'post_content' => $hub_html ) );

        wp_send_json_success( array(
            'count' => count( $resolved ) + 1,
            'view'  => get_permalink( $hub_id ),
            'edit'  => get_edit_post_link( $hub_id, '' ),
        ) );
    }

    private function palette( $theme ) {
        $p = array(
            'indigo'  => array( 'pri' => '#4f46e5', 'pri2' => '#7c3aed', 'soft' => '#eef2ff', 'text' => '#1e1b4b' ),
            'emerald' => array( 'pri' => '#059669', 'pri2' => '#10b981', 'soft' => '#ecfdf5', 'text' => '#064e3b' ),
            'amber'   => array( 'pri' => '#d97706', 'pri2' => '#f59e0b', 'soft' => '#fffbeb', 'text' => '#78350f' ),
            'rose'    => array( 'pri' => '#e11d48', 'pri2' => '#f43f5e', 'soft' => '#fff1f2', 'text' => '#881337' ),
        );
        return $p[ $theme ] ?? $p['indigo'];
    }

    private function modules() {
        return array(
            array(
                'icon' => '✍️', 'slug' => 'ai-tek-uret', 'title' => 'AI Tek Üret — Premium Şablonlar & Hub Sayfaları',
                'summary' => 'Tek konudan profesyonel ansiklopedik sayfalar üretir. Premium biyografi, kronoloji, hub gibi 8+ şablon, 7 renk teması, tam genişlik mod.',
                'features' => array(
                    'Premium-Hub: ana sayfa + N alt sayfa zincirleme otomatik',
                    'Premium-Biyografi, Kronoloji, Karşılaştırma, FAQ, Liste, Köşe Yazısı şablonları',
                    'Web görselden çoklu seçim (max 12) — AI dağıtsın ya da kullanıcı atasın',
                    'OpenAI gpt-4o veya gpt-4o-mini ile içerik üretimi',
                    '7 renk teması · klasik veya tam genişlik (Elementor canvas) layout',
                ),
            ),
            array(
                'icon' => '🎙', 'slug' => 'podcast-uret', 'title' => 'Podcast Üret — ElevenLabs ile Türkçe Seslendirme',
                'summary' => 'Konudan AI script üretir, ElevenLabs Türkçe seslendirmeyle MP3 üretir, WordPress yazısına gömer.',
                'features' => array(
                    'eleven_multilingual_v2 modeli — doğal Türkçe',
                    '15+ ses arasından seçim, AI script otomatik üretim',
                    'MP3 medya kütüphanesine kaydedilir',
                    '<audio controls> + transkript açılır blok',
                    'Trial planda ayda ~10.000 karakter ücretsiz',
                ),
            ),
            array(
                'icon' => '🎬', 'slug' => 'video-uret', 'title' => 'Video Üret — HeyGen AI Avatar Video',
                'summary' => 'Türkçe konuşan AI avatar videoları. 16:9 / 9:16 / 1:1 boyut, custom arka plan, asenkron render.',
                'features' => array(
                    '4-5 ücretsiz avatar (Mark, Anna, vb.) + custom avatar yükleyebilirsiniz',
                    'TR sesleri otomatik filtrelenir — 15+ Türkçe ses',
                    'YouTube (16:9), TikTok/Reels (9:16), Instagram (1:1) boyutları',
                    'AI script + HeyGen render + MP4 otomatik medyaya kayıt',
                    'Render ilerleme barı ve tahmini süre gösterimi',
                ),
            ),
            array(
                'icon' => '📰', 'slug' => 'haber-botu', 'title' => 'Haber Botu — RSS, Google News, HTML Kazıma',
                'summary' => 'Otomatik haber toplar, AI ile özgünleştirir, sıcak gelişme takibi yapar, ilgili haber bağlantısı kurar.',
                'features' => array(
                    'RSS, Google News (Türkçe), HTML scraper kaynakları',
                    'OpenAI gpt-4o ile özgünleştirme — duplicate kontrol',
                    'Hot update sistemi: aynı konuya yeni haber gelince mevcut yazı güncellenir',
                    'İlgili haber blokları otomatik eklenir',
                    'Cron ile saatte/günde otomatik çalışır',
                ),
            ),
            array(
                'icon' => '🪶', 'slug' => 'kose-yazarlari', 'title' => 'AI Köşe Yazarları — Yapay Zeka Editörler',
                'summary' => 'Farklı kişilik, üslup ve uzmanlık alanlarına sahip AI köşe yazarları. Otomatik veya manuel yazı üretimi.',
                'features' => array(
                    'Sınırsız yazar profili — kişilik, ses tonu, uzmanlık alanı',
                    'Yazar fotoğrafı, biyografi, sosyal medya bağlantıları',
                    'Konu bazlı yazı üretimi — düzenli cron ile otomatik yayın',
                    'Yazar sıralama ve filtreleme widget\'ı',
                ),
            ),
            array(
                'icon' => '⚡', 'slug' => 'rss-direkt', 'title' => 'RSS Direkt — AI\'sız Hızlı İçe Aktarma',
                'summary' => 'OpenAI kotanız bittiğinde veya yedek mod istediğinizde — RSS\'leri olduğu gibi içe aktarır. Hızlı, ücretsiz.',
                'features' => array(
                    'RSS\'lerden direkt yayınlama (içerik değişikliği yok)',
                    'Görsel scraper otomatik featured image ekler',
                    'Kategori, etiket, özet otomatik eşleme',
                    'Saatlik cron — manuel tetikle butonu',
                ),
            ),
            array(
                'icon' => '📺', 'slug' => 'video-tv', 'title' => 'Video TV — YouTube, Dailymotion, Canlı TV',
                'summary' => 'YouTube playlist veya Dailymotion kanallarından videoları otomatik içe aktarır, canlı TV widget\'ları sunar.',
                'features' => array(
                    'YouTube Data API ile playlist/kanal otomatik çekme',
                    'Dailymotion entegrasyonu',
                    'Canlı TV embed (M3U8 stream)',
                    'Video kategorileri ve özel post type',
                ),
            ),
            array(
                'icon' => '🧱', 'slug' => 'haber-bloklari', 'title' => 'Haber Blokları — Manşet, Hikaye, Kategori Tab',
                'summary' => 'Ana sayfanız için hazır haber bloğu bileşenleri — Elementor uyumlu shortcode\'lar.',
                'features' => array(
                    'Manşet bloğu (büyük + küçük gridi)',
                    'Story-style hikaye bloğu',
                    'Kategori sekmeli haber bloğu',
                    'Shortcode ile her sayfaya eklenebilir',
                ),
            ),
        );
    }

    private function build_hub_html( $title, $pal, $resolved ) {
        $cards = '';
        foreach ( $resolved as $r ) {
            $cards .= '<a href="' . esc_url( $r['view'] ) . '" style="display:block;padding:22px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;text-decoration:none;color:' . $pal['text'] . ';transition:transform .15s,box-shadow .15s;box-shadow:0 1px 3px rgba(0,0,0,.04);">'
                    . '<div style="font-size:34px;margin-bottom:8px;">' . esc_html( $r['icon'] ) . '</div>'
                    . '<h3 style="margin:0 0 8px;font-size:18px;color:' . $pal['text'] . ';">' . esc_html( $r['title'] ) . '</h3>'
                    . '<p style="margin:0;color:#555;font-size:13px;line-height:1.55;">' . esc_html( $r['summary'] ) . '</p>'
                    . '<div style="margin-top:14px;color:' . $pal['pri'] . ';font-weight:600;font-size:13px;">Detayları gör →</div>'
                    . '</a>';
        }
        return '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:' . $pal['text'] . ';">'
             . '<div style="background:linear-gradient(135deg,' . $pal['pri'] . ' 0%,' . $pal['pri2'] . ' 100%);color:#fff;padding:64px 32px;border-radius:16px;text-align:center;margin-bottom:36px;">'
             . '<h1 style="font-size:42px;margin:0 0 16px;color:#fff;">' . esc_html( $title ) . '</h1>'
             . '<p style="font-size:18px;opacity:.95;max-width:720px;margin:0 auto;line-height:1.6;">RSS\'ten haber, AI\'dan içerik, ElevenLabs\'tan ses, HeyGen\'den video — tek WordPress eklentisinde 8 modül. Aşağıdaki kartlardan istediğiniz özelliği inceleyin.</p>'
             . '<div style="margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">'
             . '<a href="https://wa.me/' . esc_attr( ltrim( Ahenk_License::SUPPORT_WHATSAPP, '+' ) ) . '" target="_blank" style="background:#fff;color:' . $pal['pri'] . ';padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">📱 WhatsApp Destek</a>'
             . '<a href="' . esc_url( admin_url( 'admin.php?page=ahenk-license' ) ) . '" style="background:rgba(255,255,255,.2);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;border:1px solid rgba(255,255,255,.4);">🔐 Lisans Al</a>'
             . '</div></div>'
             . '<div style="background:' . $pal['soft'] . ';padding:36px;border-radius:14px;margin-bottom:36px;text-align:center;">'
             . '<div style="font-size:14px;color:' . $pal['pri'] . ';font-weight:600;margin-bottom:6px;">⚡ EKLENTİ MODÜLLERİ</div>'
             . '<h2 style="margin:0 0 8px;font-size:30px;color:' . $pal['text'] . ';">8 Güçlü Özellik, 1 Eklenti</h2>'
             . '<p style="margin:0;color:#555;max-width:680px;margin:0 auto;">Aşağıdaki kartlara tıklayarak her özelliğin detaylarına ulaşabilirsiniz.</p></div>'
             . '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;">' . $cards . '</div>'
             . '<div style="margin-top:48px;padding:36px;background:' . $pal['text'] . ';color:#fff;border-radius:14px;text-align:center;">'
             . '<h2 style="color:#fff;margin:0 0 12px;font-size:28px;">Hemen başlayın</h2>'
             . '<p style="opacity:.9;font-size:16px;margin:0 0 20px;">7 gün ücretsiz deneme · Aylık $40\'tan başlayan abonelik · Tek domain lisansı</p>'
             . '<a href="' . esc_url( admin_url( 'admin.php?page=ahenk-license' ) ) . '" style="background:' . $pal['pri'] . ';color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">🚀 Lisans / Deneme Başlat</a>'
             . '</div></div>';
    }

    private function build_sub_html( $m, $pal, $hub_title ) {
        $features = '';
        foreach ( $m['features'] as $f ) {
            $features .= '<li style="margin-bottom:10px;padding-left:30px;position:relative;line-height:1.6;color:#333;">'
                       . '<span style="position:absolute;left:0;top:2px;color:' . $pal['pri'] . ';font-weight:700;font-size:18px;">✓</span>'
                       . esc_html( $f ) . '</li>';
        }
        return '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:' . $pal['text'] . ';">'
             . '<div style="background:linear-gradient(135deg,' . $pal['pri'] . ' 0%,' . $pal['pri2'] . ' 100%);color:#fff;padding:54px 32px;border-radius:14px;margin-bottom:30px;text-align:center;">'
             . '<div style="font-size:60px;margin-bottom:14px;line-height:1;">' . esc_html( $m['icon'] ) . '</div>'
             . '<h1 style="color:#fff;font-size:34px;margin:0 0 14px;">' . esc_html( $m['title'] ) . '</h1>'
             . '<p style="opacity:.95;font-size:17px;max-width:720px;margin:0 auto;line-height:1.6;">' . esc_html( $m['summary'] ) . '</p>'
             . '</div>'
             . '<div style="background:' . $pal['soft'] . ';padding:30px;border-radius:12px;margin-bottom:30px;">'
             . '<h2 style="margin:0 0 18px;color:' . $pal['text'] . ';">⚡ Öne Çıkan Özellikler</h2>'
             . '<ul style="list-style:none;padding:0;margin:0;">' . $features . '</ul></div>'
             . '<div style="background:#fff;border:1px solid #e5e7eb;padding:24px;border-radius:12px;margin-bottom:30px;">'
             . '<h3 style="margin:0 0 12px;color:' . $pal['text'] . ';">💡 Nasıl Çalışır?</h3>'
             . '<p style="color:#555;line-height:1.7;margin:0;">WordPress yönetim panelinde <strong>Ahenk AI</strong> menüsüne gidin, ' . esc_html( $m['title'] ) . ' alt menüsünü açın, formu doldurun ve <strong>Üret</strong> butonuna basın. Birkaç saniye/dakika içinde hazır içerik WordPress yazılarınız arasında belirir — gerekirse düzenleyip yayınlayabilirsiniz.</p>'
             . '</div>'
             . '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:36px 0;">'
             . '<a href="' . esc_url( admin_url( 'admin.php?page=ahenk-license' ) ) . '" style="background:' . $pal['pri'] . ';color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">🔐 Lisans Al / Deneme Başlat</a>'
             . '<a href="https://wa.me/' . esc_attr( ltrim( Ahenk_License::SUPPORT_WHATSAPP, '+' ) ) . '" target="_blank" style="background:#25d366;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">📱 WhatsApp Destek</a>'
             . '</div>'
             . '<p style="text-align:center;font-size:13px;color:#888;">← <a href="javascript:history.back()" style="color:' . $pal['pri'] . ';">' . esc_html( $hub_title ) . '\'na geri dön</a></p>'
             . '</div>';
    }
}

Ahenk_Tanitim::init();
