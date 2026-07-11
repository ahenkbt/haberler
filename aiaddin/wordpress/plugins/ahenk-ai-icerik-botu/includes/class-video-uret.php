<?php
/**
 * Video Üret — HeyGen API ile AI avatar video.
 *
 * Akış:
 *   1) Kullanici konu yazar veya hazir script yapistirir.
 *   2) (Konu girildiyse) OpenAI ile kisa video script'i uretiriz (~150-400 kelime).
 *   3) HeyGen avatar + ses ile POST /v2/video/generate -> video_id.
 *   4) Frontend her 6 sn'de ajax_status cagirir (HeyGen status.get).
 *   5) "completed" gelince MP4 indirip WP medya kutuphanesine kaydederiz.
 *   6) Post olustururuz; icerige <video controls> + transcript ekleriz.
 *
 * HeyGen API key kullanicinin kendi WordPress site'inde saklanir
 * (option: ahenk_heygen_api_key).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class Ahenk_Video_Uret {

    const NONCE      = 'ahenk_video';
    const SLUG       = 'ahenk-video-uret';
    const OPT_KEY    = 'ahenk_heygen_api_key';
    const OPT_AVATAR = 'ahenk_heygen_avatar_id';
    const OPT_VOICE  = 'ahenk_heygen_voice_id';
    const META       = '_ahb_video';

    public static function init() {
        $self = new self();
        add_action( 'admin_menu',                          array( $self, 'menu' ), 33 );
        add_action( 'wp_ajax_ahenk_video_save_settings',   array( $self, 'ajax_save_settings' ) );
        add_action( 'wp_ajax_ahenk_video_list_avatars',    array( $self, 'ajax_list_avatars' ) );
        add_action( 'wp_ajax_ahenk_video_list_voices',     array( $self, 'ajax_list_voices' ) );
        add_action( 'wp_ajax_ahenk_video_create',          array( $self, 'ajax_create' ) );
        add_action( 'wp_ajax_ahenk_video_status',          array( $self, 'ajax_status' ) );
        add_action( 'wp_ajax_ahenk_video_delete',          array( $self, 'ajax_delete' ) );
    }

    public function menu() {
        add_submenu_page(
            'ai-haber-botu',
            'Video Üret',
            '🎬 Video Üret',
            'manage_options',
            self::SLUG,
            array( $this, 'render' )
        );
    }

    public function ajax_delete() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $pid = (int) ( $_POST['post_id'] ?? 0 );
        if ( ! $pid ) wp_send_json_error( array( 'msg' => 'id yok' ) );
        if ( get_post_meta( $pid, self::META, true ) !== '1' ) wp_send_json_error( array( 'msg' => 'Video değil' ) );
        wp_trash_post( $pid );
        wp_send_json_success();
    }

    private function render_history_table() {
        $q = new WP_Query( array(
            'post_type'      => 'any',
            'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'future' ),
            'posts_per_page' => 50,
            'meta_key'       => self::META,
            'orderby'        => 'date',
            'order'          => 'DESC',
            'no_found_rows'  => true,
        ) );
        if ( ! $q->have_posts() ) {
            echo '<p style="color:#888;">Henüz üretilmiş video yok.</p>';
            return;
        }
        ?>
        <table class="wp-list-table widefat striped">
            <thead><tr>
                <th style="width:140px;">Tarih</th>
                <th>Başlık</th>
                <th style="width:120px;">Durum</th>
                <th style="width:240px;">İşlemler</th>
            </tr></thead>
            <tbody>
            <?php while ( $q->have_posts() ) : $q->the_post(); $pid = get_the_ID();
                $vstatus = get_post_meta( $pid, '_ahb_video_status', true ) ?: 'tamamlandı';
                ?>
                <tr>
                    <td><?php echo esc_html( get_the_date( 'd.m.Y H:i' ) ); ?></td>
                    <td><strong><?php the_title(); ?></strong></td>
                    <td><?php echo esc_html( $vstatus ); ?> · <?php echo esc_html( get_post_status() ); ?></td>
                    <td>
                        <a href="<?php echo esc_url( get_edit_post_link( $pid ) ); ?>" class="button button-small" target="_blank">✏️ Düzenle</a>
                        <a href="<?php echo esc_url( get_permalink( $pid ) ); ?>" class="button button-small" target="_blank">👁</a>
                        <button class="button button-small vd-del" data-pid="<?php echo (int) $pid; ?>" style="color:#d63638;">🗑 Sil</button>
                    </td>
                </tr>
            <?php endwhile; wp_reset_postdata(); ?>
            </tbody>
        </table>
        <?php
    }

    /* ============ ADMIN SAYFASI ============ */

    public function render() {
        if ( ! current_user_can( 'manage_options' ) ) return;
        $openai_set = (bool) trim( (string) get_option( 'ahb_openai_api_key', '' ) );
        $hg_key     = (string) get_option( self::OPT_KEY, '' );
        $avatar_id  = (string) get_option( self::OPT_AVATAR, '' );
        $voice_id   = (string) get_option( self::OPT_VOICE, '' );
        $nonce      = wp_create_nonce( self::NONCE );
        ?>
        <div class="wrap">
            <h1>🎬 Video Üret — HeyGen ile AI Avatar Video</h1>
            <p style="color:#555;max-width:820px;">Konu yazın veya hazır script yapıştırın — yapay zekâ video metnini üretsin, HeyGen avatarı Türkçe seslendirsin, MP4 dosyası WordPress'e kaydedilip yazıya gömülsün. Render 1-3 dakika sürer.</p>

            <h2 style="margin-top:24px;">⚙️ HeyGen Ayarları</h2>
            <table class="form-table">
                <tr>
                    <th><label for="hg-key">HeyGen API Key</label></th>
                    <td>
                        <input type="text" id="hg-key" class="regular-text" value="<?php echo esc_attr( $hg_key ); ?>" placeholder="OGNlNW...">
                        <button type="button" class="button" id="hg-save">💾 Kaydet</button>
                        <p class="description"><a href="https://app.heygen.com/settings?nav=API" target="_blank">app.heygen.com → Settings → API</a> sayfasından alın. Trial planda ~10 kredi/ay (yaklaşık 10 dk video) ücretsiz verilir.</p>
                    </td>
                </tr>
                <tr>
                    <th>Avatar</th>
                    <td>
                        <button type="button" class="button" id="hg-load-av">📋 Avatarları Listele</button>
                        <select id="hg-avatar" style="min-width:340px;margin-left:10px;display:none;"></select>
                        <p class="description">Trial planda Mark, Anna gibi 4-5 ücretsiz avatar gelir. Custom avatar yüklediyseniz listede görünür.</p>
                    </td>
                </tr>
                <tr>
                    <th>Ses (Türkçe)</th>
                    <td>
                        <button type="button" class="button" id="hg-load-vc">📋 Türkçe Sesleri Listele</button>
                        <select id="hg-voice" style="min-width:340px;margin-left:10px;display:none;"></select>
                        <p class="description">Sadece Türkçe (tr) sesler gösterilir. HeyGen'de ~15-20 Türkçe ses mevcut.</p>
                    </td>
                </tr>
            </table>

            <hr style="margin:30px 0;">
            <h2>🎬 Video Üret</h2>
            <?php if ( ! $openai_set ) : ?>
                <div class="notice notice-warning"><p>⚠️ OpenAI API key Ayarlar sayfasında girilmemiş. Konudan otomatik script üretilemez (hazır script yapıştırabilirsiniz).</p></div>
            <?php endif; ?>

            <table class="form-table">
                <tr>
                    <th><label for="vd-title">Başlık (zorunlu)</label></th>
                    <td><input type="text" id="vd-title" class="regular-text" style="width:100%;max-width:600px;" placeholder="Örn: Atatürk'ün Hayatından 5 Çarpıcı An"></td>
                </tr>
                <tr>
                    <th><label for="vd-prompt">Konu (AI script için)</label></th>
                    <td>
                        <textarea id="vd-prompt" rows="3" class="large-text" placeholder="Konu yazın — AI script üretsin. Örn: Cumhuriyet'in 100. yılında Atatürk'ün eğitim devrimini 60 saniyede anlat."></textarea>
                        <p class="description">Hazır script kullanacaksanız bu alanı boş bırakıp aşağıya yapıştırın.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="vd-script">Script (opsiyonel)</label></th>
                    <td>
                        <textarea id="vd-script" rows="6" class="large-text" placeholder="Hazır script — boşsa konudan AI üretir (TR, ~150-400 kelime ideal, 30-90 sn video)"></textarea>
                    </td>
                </tr>
                <tr>
                    <th><label for="vd-length">Hedef uzunluk</label></th>
                    <td>
                        <select id="vd-length">
                            <option value="60">~30 sn (60 kelime)</option>
                            <option value="120">~45 sn (120 kelime)</option>
                            <option value="200" selected>~60 sn (200 kelime)</option>
                            <option value="350">~90 sn (350 kelime)</option>
                            <option value="600">~3 dk (600 kelime)</option>
                        </select>
                        <span style="color:#888;font-size:12px;margin-left:10px;">Uzun video → daha çok HeyGen kredisi.</span>
                    </td>
                </tr>
                <tr>
                    <th>Boyut</th>
                    <td>
                        <select id="vd-dim">
                            <option value="1280x720" selected>📺 Yatay 16:9 (1280×720) — YouTube/web</option>
                            <option value="720x1280">📱 Dikey 9:16 (720×1280) — TikTok/Reels/Shorts</option>
                            <option value="1080x1080">⬛ Kare 1:1 (1080×1080) — Instagram</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>Arka plan</th>
                    <td>
                        <input type="color" id="vd-bg" value="#f6f6fc" style="width:60px;height:30px;vertical-align:middle;">
                        <span style="color:#888;font-size:12px;margin-left:10px;">Avatarın arkasındaki düz renk.</span>
                    </td>
                </tr>
                <tr>
                    <th>Yayın durumu</th>
                    <td>
                        <select id="vd-status">
                            <option value="draft" selected>📝 Taslak</option>
                            <option value="publish">✅ Yayında</option>
                        </select>
                    </td>
                </tr>
            </table>

            <p>
                <button type="button" class="button button-primary button-hero" id="vd-go">🎬 Üret ve Bekle</button>
                <span id="vd-status-line" style="margin-left:14px;color:#555;"></span>
            </p>
            <div id="vd-progress" style="display:none;background:#fff;border:1px solid #e2e4e7;padding:14px 18px;border-radius:6px;max-width:820px;margin:14px 0;">
                <div id="vd-step" style="font-weight:600;margin-bottom:8px;"></div>
                <div style="background:#f0f0f1;height:8px;border-radius:4px;overflow:hidden;"><div id="vd-bar" style="background:#2271b1;height:100%;width:0%;transition:width .3s;"></div></div>
                <div id="vd-elapsed" style="margin-top:8px;font-size:12px;color:#666;"></div>
            </div>
            <div id="vd-result" style="display:none;padding:16px;background:#edfaef;border:1px solid #46b450;border-radius:6px;margin:16px 0;max-width:820px;"></div>

            <hr style="margin:36px 0 20px;">
            <h2>📜 Geçmiş Üretimler</h2>
            <?php $this->render_history_table(); ?>
        </div>

        <script>
        (function(){
            const NONCE = '<?php echo esc_js( $nonce ); ?>';
            const AJAX  = '<?php echo esc_url( admin_url( 'admin-ajax.php' ) ); ?>';
            const $ = id => document.getElementById(id);
            const SAVED_AVATAR = <?php echo wp_json_encode( $avatar_id ); ?>;
            const SAVED_VOICE  = <?php echo wp_json_encode( $voice_id ); ?>;

            async function ajax(action, data) {
                const fd = new FormData();
                fd.append('action', action);
                fd.append('_ajax_nonce', NONCE);
                Object.keys(data || {}).forEach(k => fd.append(k, data[k]));
                const r = await fetch(AJAX, { method:'POST', body:fd, credentials:'same-origin' });
                return r.json();
            }

            $('hg-save').addEventListener('click', async () => {
                const j = await ajax('ahenk_video_save_settings', {
                    api_key:   $('hg-key').value.trim(),
                    avatar_id: $('hg-avatar').value || SAVED_AVATAR,
                    voice_id:  $('hg-voice').value  || SAVED_VOICE,
                });
                alert(j.success ? '✅ Kaydedildi.' : '❌ Hata: ' + (j.data?.msg || ''));
            });

            $('hg-load-av').addEventListener('click', async () => {
                const key = $('hg-key').value.trim();
                if (!key) { alert('Önce API key girin.'); return; }
                $('hg-load-av').disabled = true; $('hg-load-av').textContent = '⏳ Yükleniyor...';
                const j = await ajax('ahenk_video_list_avatars', { api_key: key });
                $('hg-load-av').disabled = false; $('hg-load-av').textContent = '📋 Avatarları Listele';
                if (!j.success) { alert('❌ ' + (j.data?.msg || '')); return; }
                const sel = $('hg-avatar'); sel.innerHTML = ''; sel.style.display = '';
                j.data.items.forEach(it => {
                    const o = document.createElement('option');
                    o.value = it.id;
                    o.textContent = it.name + (it.gender ? ' (' + it.gender + ')' : '');
                    if (it.id === SAVED_AVATAR) o.selected = true;
                    sel.appendChild(o);
                });
            });

            $('hg-load-vc').addEventListener('click', async () => {
                const key = $('hg-key').value.trim();
                if (!key) { alert('Önce API key girin.'); return; }
                $('hg-load-vc').disabled = true; $('hg-load-vc').textContent = '⏳ Yükleniyor...';
                const j = await ajax('ahenk_video_list_voices', { api_key: key });
                $('hg-load-vc').disabled = false; $('hg-load-vc').textContent = '📋 Türkçe Sesleri Listele';
                if (!j.success) { alert('❌ ' + (j.data?.msg || '')); return; }
                const sel = $('hg-voice'); sel.innerHTML = ''; sel.style.display = '';
                j.data.items.forEach(it => {
                    const o = document.createElement('option');
                    o.value = it.id;
                    o.textContent = it.name + ' — ' + (it.gender || '?') + (it.preview ? '' : '');
                    if (it.id === SAVED_VOICE) o.selected = true;
                    sel.appendChild(o);
                });
            });

            function step(msg, pct, elapsed) {
                $('vd-progress').style.display = '';
                $('vd-step').textContent = msg;
                $('vd-bar').style.width = pct + '%';
                if (elapsed != null) $('vd-elapsed').textContent = '⏱ Geçen süre: ' + elapsed + ' sn';
            }

            $('vd-go').addEventListener('click', async () => {
                const title = $('vd-title').value.trim();
                if (!title) { alert('Başlık girin.'); return; }
                const prompt = $('vd-prompt').value.trim();
                const script = $('vd-script').value.trim();
                if (!prompt && !script) { alert('Konu veya hazır script girin.'); return; }
                const avatar = $('hg-avatar').value || SAVED_AVATAR;
                const voice  = $('hg-voice').value  || SAVED_VOICE;
                if (!avatar || !voice) { alert('Önce avatar ve ses seçin (yukarıdaki listeleri yükleyip kaydedin).'); return; }

                $('vd-go').disabled = true;
                $('vd-result').style.display = 'none';
                step('1/3 Script hazırlanıyor...', 15, 0);

                const startTs = Date.now();
                const j1 = await ajax('ahenk_video_create', {
                    title: title, prompt: prompt, script: script,
                    length: $('vd-length').value, dim: $('vd-dim').value,
                    bg: $('vd-bg').value, status: $('vd-status').value,
                    avatar_id: avatar, voice_id: voice,
                });
                if (!j1.success) {
                    step('❌ Hata', 0, Math.round((Date.now()-startTs)/1000));
                    $('vd-result').style.display = '';
                    $('vd-result').style.background = '#fcebec';
                    $('vd-result').style.borderColor = '#d63638';
                    $('vd-result').textContent = 'Hata: ' + (j1.data?.msg || '');
                    $('vd-go').disabled = false;
                    return;
                }
                const postId  = j1.data.post_id;
                const videoId = j1.data.video_id;
                step('2/3 HeyGen video render ediyor (1-3 dk)...', 40, Math.round((Date.now()-startTs)/1000));

                let pct = 40;
                const interval = setInterval(async () => {
                    const elapsed = Math.round((Date.now()-startTs)/1000);
                    pct = Math.min(85, pct + 2);
                    const j2 = await ajax('ahenk_video_status', { post_id: postId, video_id: videoId });
                    if (!j2.success) {
                        clearInterval(interval);
                        step('❌ Status hatası', 0, elapsed);
                        $('vd-result').style.display = '';
                        $('vd-result').style.background = '#fcebec';
                        $('vd-result').style.borderColor = '#d63638';
                        $('vd-result').innerHTML = 'Hata: ' + (j2.data?.msg || '');
                        $('vd-go').disabled = false;
                        return;
                    }
                    const st = j2.data.status;
                    if (st === 'completed') {
                        clearInterval(interval);
                        step('3/3 Tamamlandı! Video kaydedildi.', 100, elapsed);
                        $('vd-result').style.display = '';
                        $('vd-result').innerHTML =
                            '<strong>✅ Video hazır!</strong><br>' +
                            '<a href="' + j2.data.edit_link + '" target="_blank" class="button button-primary" style="margin-top:8px;">✏️ Yazıyı düzenle</a> ' +
                            '<a href="' + j2.data.view_link + '" target="_blank" class="button" style="margin-top:8px;">👁 Önizle</a> ' +
                            '<a href="' + j2.data.video_url + '" target="_blank" class="button" style="margin-top:8px;">⬇ MP4</a>' +
                            '<p style="margin:10px 0 0;font-size:12px;color:#666;">Süre: ' + elapsed + ' sn · Sayfayı yenileyin (geçmiş listesi güncellensin).</p>';
                        $('vd-go').disabled = false;
                    } else if (st === 'failed') {
                        clearInterval(interval);
                        step('❌ HeyGen render başarısız', 0, elapsed);
                        $('vd-result').style.display = '';
                        $('vd-result').style.background = '#fcebec';
                        $('vd-result').style.borderColor = '#d63638';
                        $('vd-result').innerHTML = 'HeyGen hatası: ' + (j2.data.error || 'bilinmeyen');
                        $('vd-go').disabled = false;
                    } else {
                        step('2/3 HeyGen render ediyor (' + st + ')...', pct, elapsed);
                    }
                }, 6000);
            });

            // History sil
            document.querySelectorAll('.vd-del').forEach(b => {
                b.addEventListener('click', async () => {
                    if (!confirm('Bu videoyu (post) çöpe taşı?')) return;
                    const pid = b.getAttribute('data-pid');
                    const j = await ajax('ahenk_video_delete', { post_id: pid });
                    if (j.success) b.closest('tr').remove();
                    else alert('Hata: ' + (j.data?.msg || ''));
                });
            });
        })();
        </script>
        <?php
    }

    /* ============ AJAX: SETTINGS ============ */

    public function ajax_save_settings() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        update_option( self::OPT_KEY,    trim( (string) ( $_POST['api_key']   ?? '' ) ) );
        update_option( self::OPT_AVATAR, trim( (string) ( $_POST['avatar_id'] ?? '' ) ) );
        update_option( self::OPT_VOICE,  trim( (string) ( $_POST['voice_id']  ?? '' ) ) );
        wp_send_json_success();
    }

    /* ============ AJAX: AVATAR LIST ============ */

    public function ajax_list_avatars() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $key = trim( (string) ( $_POST['api_key'] ?? '' ) );
        if ( ! $key ) wp_send_json_error( array( 'msg' => 'API key boş' ) );
        $resp = wp_remote_get( 'https://api.heygen.com/v2/avatars', array(
            'timeout' => 30,
            'headers' => array( 'X-Api-Key' => $key, 'Accept' => 'application/json' ),
        ) );
        if ( is_wp_error( $resp ) ) wp_send_json_error( array( 'msg' => $resp->get_error_message() ) );
        $code = wp_remote_retrieve_response_code( $resp );
        $body = wp_remote_retrieve_body( $resp );
        if ( $code !== 200 ) wp_send_json_error( array( 'msg' => 'HeyGen HTTP ' . $code . ' — ' . mb_substr( $body, 0, 200 ) ) );
        $j = json_decode( $body, true );
        $list = $j['data']['avatars'] ?? ( $j['data'] ?? array() );
        $items = array();
        foreach ( $list as $a ) {
            if ( ! is_array( $a ) ) continue;
            $items[] = array(
                'id'     => $a['avatar_id'] ?? ( $a['id'] ?? '' ),
                'name'   => $a['avatar_name'] ?? ( $a['name'] ?? 'Avatar' ),
                'gender' => $a['gender'] ?? '',
            );
        }
        wp_send_json_success( array( 'items' => $items ) );
    }

    /* ============ AJAX: VOICE LIST (TR filter) ============ */

    public function ajax_list_voices() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $key = trim( (string) ( $_POST['api_key'] ?? '' ) );
        if ( ! $key ) wp_send_json_error( array( 'msg' => 'API key boş' ) );
        $resp = wp_remote_get( 'https://api.heygen.com/v2/voices', array(
            'timeout' => 30,
            'headers' => array( 'X-Api-Key' => $key, 'Accept' => 'application/json' ),
        ) );
        if ( is_wp_error( $resp ) ) wp_send_json_error( array( 'msg' => $resp->get_error_message() ) );
        $code = wp_remote_retrieve_response_code( $resp );
        $body = wp_remote_retrieve_body( $resp );
        if ( $code !== 200 ) wp_send_json_error( array( 'msg' => 'HeyGen HTTP ' . $code . ' — ' . mb_substr( $body, 0, 200 ) ) );
        $j = json_decode( $body, true );
        $list = $j['data']['voices'] ?? ( $j['data'] ?? array() );
        $items = array();
        foreach ( $list as $v ) {
            if ( ! is_array( $v ) ) continue;
            $lang = strtolower( (string) ( $v['language'] ?? $v['language_code'] ?? '' ) );
            $code = strtolower( (string) ( $v['language_code'] ?? '' ) );
            // Türkçe filter: 'turkish' veya 'tr' veya 'tr-tr'
            if ( ! ( strpos( $lang, 'turk' ) !== false || $code === 'tr' || strpos( $code, 'tr-' ) === 0 ) ) continue;
            $items[] = array(
                'id'      => $v['voice_id'] ?? ( $v['id'] ?? '' ),
                'name'    => $v['name']     ?? ( $v['display_name'] ?? 'Ses' ),
                'gender'  => $v['gender']   ?? '',
                'preview' => $v['preview_audio'] ?? '',
            );
        }
        // Türkçe ses bulunamadıysa hepsini döndür (kullanıcı seçsin)
        if ( empty( $items ) ) {
            foreach ( $list as $v ) {
                if ( ! is_array( $v ) ) continue;
                $items[] = array(
                    'id'     => $v['voice_id'] ?? ( $v['id'] ?? '' ),
                    'name'   => ( $v['name'] ?? 'Ses' ) . ' [' . ( $v['language'] ?? '?' ) . ']',
                    'gender' => $v['gender'] ?? '',
                );
                if ( count( $items ) >= 60 ) break;
            }
        }
        wp_send_json_success( array( 'items' => $items ) );
    }

    /* ============ AJAX: CREATE (post + HeyGen submit) ============ */

    public function ajax_create() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );

        $hg_key    = trim( (string) get_option( self::OPT_KEY, '' ) );
        if ( ! $hg_key ) wp_send_json_error( array( 'msg' => 'HeyGen API key girilmemiş' ) );

        $title     = sanitize_text_field( wp_unslash( (string) ( $_POST['title']  ?? '' ) ) );
        $prompt    = trim( wp_unslash( (string) ( $_POST['prompt'] ?? '' ) ) );
        $script    = trim( wp_unslash( (string) ( $_POST['script'] ?? '' ) ) );
        $length    = max( 30, min( 1500, (int) ( $_POST['length'] ?? 200 ) ) );
        $dim       = (string) ( $_POST['dim']    ?? '1280x720' );
        $bg        = sanitize_hex_color( (string) ( $_POST['bg'] ?? '#f6f6fc' ) ) ?: '#f6f6fc';
        $status    = in_array( ( $_POST['status'] ?? 'draft' ), array( 'draft', 'publish' ), true ) ? $_POST['status'] : 'draft';
        $avatar_id = sanitize_text_field( (string) ( $_POST['avatar_id'] ?? '' ) );
        $voice_id  = sanitize_text_field( (string) ( $_POST['voice_id']  ?? '' ) );
        if ( ! $title || ! $avatar_id || ! $voice_id ) wp_send_json_error( array( 'msg' => 'başlık/avatar/ses zorunlu' ) );

        // 1) Script
        if ( ! $script ) {
            $openai_key = trim( (string) get_option( 'ahb_openai_api_key', '' ) );
            if ( ! $openai_key ) wp_send_json_error( array( 'msg' => 'OpenAI key yok ve script boş' ) );
            $script = $this->generate_script( $openai_key, $prompt ?: $title, $length );
            if ( ! $script ) wp_send_json_error( array( 'msg' => 'AI script üretemedi' ) );
        }
        // HeyGen text limiti: ~1500 karakter güvenli
        if ( mb_strlen( $script ) > 1500 ) $script = mb_substr( $script, 0, 1500 );

        // 2) Boyut parse
        list( $w, $h ) = array_map( 'intval', explode( 'x', $dim ) + array( 0 => 1280, 1 => 720 ) );
        if ( ! $w || ! $h ) { $w = 1280; $h = 720; }

        // 3) HeyGen submit
        $payload = array(
            'video_inputs' => array( array(
                'character'  => array( 'type' => 'avatar', 'avatar_id' => $avatar_id, 'avatar_style' => 'normal' ),
                'voice'      => array( 'type' => 'text',   'input_text' => $script,    'voice_id'  => $voice_id ),
                'background' => array( 'type' => 'color',  'value'      => $bg ),
            ) ),
            'dimension' => array( 'width' => $w, 'height' => $h ),
        );
        $resp = wp_remote_post( 'https://api.heygen.com/v2/video/generate', array(
            'timeout' => 60,
            'headers' => array( 'X-Api-Key' => $hg_key, 'Content-Type' => 'application/json', 'Accept' => 'application/json' ),
            'body'    => wp_json_encode( $payload ),
        ) );
        if ( is_wp_error( $resp ) ) wp_send_json_error( array( 'msg' => 'HeyGen istek hatası: ' . $resp->get_error_message() ) );
        $code = wp_remote_retrieve_response_code( $resp );
        $body = wp_remote_retrieve_body( $resp );
        $j = json_decode( $body, true );
        if ( $code !== 200 || empty( $j['data']['video_id'] ) ) {
            $err = $j['error']['message'] ?? ( $j['message'] ?? mb_substr( $body, 0, 300 ) );
            wp_send_json_error( array( 'msg' => 'HeyGen reddetti (' . $code . '): ' . $err ) );
        }
        $video_id = (string) $j['data']['video_id'];

        // 4) Taslak post oluştur
        $post_id = wp_insert_post( array(
            'post_type'    => 'post',
            'post_status'  => 'draft', // status'u completed'da set edeceğiz
            'post_title'   => $title,
            'post_content' => '<p style="padding:20px;background:#fffbe5;border:1px solid #ffd966;border-radius:6px;">⏳ HeyGen video render ediyor... (video_id: <code>' . esc_html( $video_id ) . '</code>) Bu yazı tamamlanınca otomatik güncellenecek.</p>',
            'meta_input'   => array(
                self::META               => '1',
                '_ahb_video_id'          => $video_id,
                '_ahb_video_status'      => 'render_ediliyor',
                '_ahb_video_script'      => $script,
                '_ahb_video_target_status' => $status,
                '_ahb_video_avatar'      => $avatar_id,
                '_ahb_video_voice'       => $voice_id,
                '_ahb_video_dim'         => $dim,
                '_ahb_video_at'          => current_time( 'mysql' ),
            ),
        ), true );
        if ( is_wp_error( $post_id ) ) wp_send_json_error( array( 'msg' => 'Post oluşturulamadı: ' . $post_id->get_error_message() ) );

        wp_send_json_success( array( 'video_id' => $video_id, 'post_id' => $post_id ) );
    }

    /* ============ AJAX: STATUS POLL ============ */

    public function ajax_status() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );

        $hg_key   = trim( (string) get_option( self::OPT_KEY, '' ) );
        $post_id  = (int) ( $_POST['post_id']  ?? 0 );
        $video_id = sanitize_text_field( (string) ( $_POST['video_id'] ?? '' ) );
        if ( ! $hg_key || ! $post_id || ! $video_id ) wp_send_json_error( array( 'msg' => 'parametre eksik' ) );

        $url = 'https://api.heygen.com/v1/video_status.get?video_id=' . rawurlencode( $video_id );
        $resp = wp_remote_get( $url, array(
            'timeout' => 25,
            'headers' => array( 'X-Api-Key' => $hg_key, 'Accept' => 'application/json' ),
        ) );
        if ( is_wp_error( $resp ) ) wp_send_json_error( array( 'msg' => $resp->get_error_message() ) );
        $code = wp_remote_retrieve_response_code( $resp );
        $body = wp_remote_retrieve_body( $resp );
        if ( $code !== 200 ) wp_send_json_error( array( 'msg' => 'HeyGen HTTP ' . $code . ' — ' . mb_substr( $body, 0, 200 ) ) );
        $j = json_decode( $body, true );
        $status = (string) ( $j['data']['status'] ?? 'unknown' );

        if ( $status === 'completed' ) {
            $video_url = (string) ( $j['data']['video_url'] ?? '' );
            $duration  = (float)  ( $j['data']['duration']  ?? 0 );
            if ( ! $video_url ) wp_send_json_error( array( 'msg' => 'video_url boş' ) );

            // MP4 indir + medya kaydet
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/media.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';
            $tmp = download_url( $video_url, 300 );
            if ( is_wp_error( $tmp ) ) wp_send_json_error( array( 'msg' => 'MP4 indirilemedi: ' . $tmp->get_error_message() ) );
            $file_array = array(
                'name'     => sanitize_file_name( 'heygen-' . $video_id . '.mp4' ),
                'tmp_name' => $tmp,
            );
            $att_id = media_handle_sideload( $file_array, $post_id, get_the_title( $post_id ) );
            if ( is_wp_error( $att_id ) ) { @unlink( $tmp ); wp_send_json_error( array( 'msg' => 'MP4 kaydedilemedi: ' . $att_id->get_error_message() ) ); }

            $mp4_url    = wp_get_attachment_url( $att_id );
            $script     = (string) get_post_meta( $post_id, '_ahb_video_script', true );
            $target_st  = (string) get_post_meta( $post_id, '_ahb_video_target_status', true ) ?: 'draft';

            $html  = '<figure class="ahb-video" style="margin:0 0 20px;">';
            $html .= '<video controls preload="metadata" style="width:100%;max-width:100%;height:auto;border-radius:8px;background:#000;" src="' . esc_url( $mp4_url ) . '"></video>';
            $html .= '<figcaption style="font-size:12px;color:#666;margin-top:6px;">🎬 Süre: ' . number_format( $duration, 1 ) . ' sn · HeyGen AI avatar</figcaption>';
            $html .= '</figure>';
            if ( $script ) {
                $html .= '<details style="margin:18px 0;padding:14px;background:#f6f7f9;border-radius:6px;border:1px solid #e2e4e7;"><summary style="cursor:pointer;font-weight:600;">📝 Transkript</summary><div style="margin-top:10px;line-height:1.7;color:#333;">' . wp_kses_post( wpautop( $script ) ) . '</div></details>';
            }

            wp_update_post( array(
                'ID'           => $post_id,
                'post_content' => $html,
                'post_status'  => $target_st,
            ) );
            update_post_meta( $post_id, '_ahb_video_status',  'tamamlandı' );
            update_post_meta( $post_id, '_ahb_video_mp4_id',  $att_id );
            update_post_meta( $post_id, '_ahb_video_mp4_url', $mp4_url );
            update_post_meta( $post_id, '_ahb_video_duration', $duration );
            set_post_thumbnail( $post_id, $att_id ); // mp4 thumb gibi (WP video thumb destekler)

            wp_send_json_success( array(
                'status'    => 'completed',
                'video_url' => $mp4_url,
                'edit_link' => get_edit_post_link( $post_id, '' ),
                'view_link' => get_permalink( $post_id ),
                'duration'  => $duration,
            ) );
        }

        if ( $status === 'failed' ) {
            $err = (string) ( $j['data']['error']['detail'] ?? ( $j['data']['error']['message'] ?? 'bilinmeyen' ) );
            update_post_meta( $post_id, '_ahb_video_status', 'başarısız: ' . $err );
            wp_send_json_success( array( 'status' => 'failed', 'error' => $err ) );
        }

        // pending / processing / waiting
        wp_send_json_success( array( 'status' => $status ) );
    }

    /* ============ AI SCRIPT ============ */

    private function generate_script( $api_key, $topic, $length ) {
        $model = get_option( 'ahb_openai_model', 'gpt-4o-mini' );
        $sys = "Sen Türkçe kısa video script'i yazan profesyonel bir editörsün. " .
               "Çıktı SADECE düz metin olsun (HTML, markdown, başlık, parantez içi yönerge YOK). " .
               "Doğal konuşma akışıyla yaz, kısa cümleler kullan, izleyiciye doğrudan hitap et. " .
               "Emoji, ses efekti yönergesi, sahne tarifi ekleme — sadece avatarın okuyacağı metin. " .
               "Hedef: yaklaşık $length kelime.";
        $user = "KONU: $topic\nKısa, net, akıcı bir video script'i yaz. Giriş + 2-3 ana fikir + kısa kapanış.";
        $resp = wp_remote_post( 'https://api.openai.com/v1/chat/completions', array(
            'timeout' => 90,
            'headers' => array( 'Authorization' => 'Bearer ' . $api_key, 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'model'    => $model,
                'messages' => array(
                    array( 'role' => 'system', 'content' => $sys ),
                    array( 'role' => 'user',   'content' => $user ),
                ),
                'temperature' => 0.7,
            ) ),
        ) );
        if ( is_wp_error( $resp ) ) return false;
        if ( wp_remote_retrieve_response_code( $resp ) !== 200 ) return false;
        $j = json_decode( wp_remote_retrieve_body( $resp ), true );
        $txt = trim( (string) ( $j['choices'][0]['message']['content'] ?? '' ) );
        return $txt ?: false;
    }
}

Ahenk_Video_Uret::init();
